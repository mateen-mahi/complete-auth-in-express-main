// controllers/chatbot.controller.js
//
// Lightweight AI chatbot controller.
// Uses Node.js native fetch — no provider SDKs required.
//
// Supported providers:
//   - OpenAI
//   - Gemini
//
// The provider registry keeps provider-specific request/response
// differences isolated so additional OpenAI-compatible providers
// can be added without changing the controller flow.

// ============================================================
// Configuration
// ============================================================

const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 8000;
const PROVIDER_TIMEOUT_MS = 60_000;

// ============================================================
// Provider Registry
// ============================================================

const PROVIDERS = {
  openai: {
    label: "ChatGPT",

    isConfigured: () =>
      Boolean(process.env.OPENAI_API_KEY),

    buildRequest: (messages) => ({
      url: "https://api.openai.com/v1/chat/completions",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },

      body: {
        model:
          process.env.OPENAI_MODEL ||
          "gpt-4o-mini",

        messages,

        stream: true,
      },
    }),

    extractText: (json) =>
      json.choices?.[0]?.delta?.content || "",

    isDone: (data) =>
      data === "[DONE]",
  },

  gemini: {
    label: "Gemini",

    isConfigured: () =>
      Boolean(process.env.GEMINI_API_KEY),

    buildRequest: (messages) => {
      const contents = messages.map(
        (message) => ({
          role:
            message.role === "assistant"
              ? "model"
              : "user",

          parts: [
            {
              text: message.content,
            },
          ],
        })
      );

      const model =
        process.env.GEMINI_MODEL ||
        "gemini-2.5-flash";

      return {
        url:
          `https://generativelanguage.googleapis.com/v1beta/models/` +
          `${model}:streamGenerateContent?alt=sse`,

        headers: {
          "Content-Type": "application/json",

          "x-goog-api-key":
            process.env.GEMINI_API_KEY,
        },

        body: {
          contents,
        },
      };
    },

    extractText: (json) =>
      json.candidates?.[0]?.content?.parts?.[0]
        ?.text || "",

    // Gemini streaming ends with the HTTP response.
    isDone: () => false,
  },
};

// ============================================================
// Helpers
// ============================================================

/**
 * Validate and normalize incoming messages.
 */
const validateMessages = (messages) => {
  if (!Array.isArray(messages)) {
    return {
      valid: false,
      message: "messages must be an array.",
    };
  }

  if (messages.length === 0) {
    return {
      valid: false,
      message: "messages array cannot be empty.",
    };
  }

  if (messages.length > MAX_MESSAGES) {
    return {
      valid: false,
      message: `Maximum ${MAX_MESSAGES} messages are allowed.`,
    };
  }

  for (const message of messages) {
    if (!message || typeof message !== "object") {
      return {
        valid: false,
        message: "Invalid message format.",
      };
    }

    if (
      !["user", "assistant"].includes(
        message.role
      )
    ) {
      return {
        valid: false,
        message:
          'Message role must be either "user" or "assistant".',
      };
    }

    if (
      typeof message.content !== "string"
    ) {
      return {
        valid: false,
        message:
          "Message content must be a string.",
      };
    }

    const content =
      message.content.trim();

    if (!content) {
      return {
        valid: false,
        message:
          "Message content cannot be empty.",
      };
    }

    if (
      content.length >
      MAX_MESSAGE_LENGTH
    ) {
      return {
        valid: false,
        message: `Each message must be ${MAX_MESSAGE_LENGTH} characters or less.`,
      };
    }
  }

  return {
    valid: true,

    messages: messages.map(
      (message) => ({
        role: message.role,
        content: message.content.trim(),
      })
    ),
  };
};

/**
 * Read a provider's SSE stream and forward extracted
 * text chunks to the client.
 */
const streamProviderResponse = async ({
  providerResponse,
  config,
  res,
  requestSignal,
}) => {
  if (!providerResponse.body) {
    throw new Error(
      "Provider returned an empty response body."
    );
  }

  const reader =
    providerResponse.body.getReader();

  const decoder = new TextDecoder();

  let buffer = "";

  try {
    while (true) {
      if (requestSignal?.aborted) {
        try {
          await reader.cancel();
        } catch {
          // Ignore cancellation errors.
        }

        return;
      }

      const { done, value } =
        await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(
        value,
        { stream: true }
      );

      // SSE events are separated by a blank line.
      const events = buffer.split(
        /\r?\n\r?\n/
      );

      buffer =
        events.pop() || "";

      for (const rawEvent of events) {
        const lines =
          rawEvent.split(
            /\r?\n/
          );

        const dataLines = lines
          .filter((line) =>
            line.startsWith("data:")
          )
          .map((line) =>
            line
              .slice(5)
              .trim()
          );

        if (!dataLines.length) {
          continue;
        }

        const dataString =
          dataLines.join("\n");

        if (
          config.isDone(
            dataString
          )
        ) {
          return;
        }

        try {
          const json =
            JSON.parse(
              dataString
            );

          const text =
            config.extractText(
              json
            );

          if (
            text &&
            !res.destroyed
          ) {
            res.write(text);
          }
        } catch (error) {
          // Ignore malformed SSE fragments.
          // Streaming providers occasionally return
          // metadata events that don't contain text.
          console.warn(
            "[Chatbot] Ignoring invalid SSE event:",
            error.message
          );
        }
      }
    }

    // Process any remaining complete data
    // that was left in the buffer.
    const finalLines =
      buffer.split(/\r?\n/);

    const finalDataLines =
      finalLines
        .filter((line) =>
          line.startsWith("data:")
        )
        .map((line) =>
          line
            .slice(5)
            .trim()
        );

    if (finalDataLines.length) {
      const finalData =
        finalDataLines.join("\n");

      if (
        !config.isDone(finalData)
      ) {
        try {
          const json =
            JSON.parse(
              finalData
            );

          const text =
            config.extractText(
              json
            );

          if (
            text &&
            !res.destroyed
          ) {
            res.write(text);
          }
        } catch {
          // Ignore incomplete final data.
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Ignore release errors.
    }
  }
};

// ============================================================
// GET /api/v1/chatbot/providers
// ============================================================
//
// Returns providers available to the frontend.
// API keys are NEVER returned.
//
// Example response:
//
// {
//   success: true,
//   providers: [
//     { id: "openai", label: "ChatGPT" },
//     { id: "gemini", label: "Gemini" }
//   ]
// }

// ============================================================

export const getAvailableProviders = (
  req,
  res
) => {
  const providers = Object.entries(
    PROVIDERS
  )
    .filter(([, config]) =>
      config.isConfigured()
    )
    .map(([id, config]) => ({
      id,
      label: config.label,
    }));

  return res.status(200).json({
    success: true,
    providers,
  });
};

// ============================================================
// POST /api/v1/chatbot/message
// ============================================================
//
// Body:
//
// {
//   provider: "openai",
//   messages: [
//     {
//       role: "user",
//       content: "Hello"
//     }
//   ]
// }
//
// Response:
// Plain text stream.
// The frontend reads the response incrementally.

// ============================================================

export const sendChatMessage = async (
  req,
  res
) => {
  let providerResponse = null;

  try {
    const {
      provider,
      messages,
    } = req.body || {};

    // --------------------------------------------------------
    // Validate provider
    // --------------------------------------------------------

    if (
      !provider ||
      typeof provider !==
        "string" ||
      !PROVIDERS[provider]
    ) {
      return res.status(400).json({
        success: false,

        message:
          `Invalid or missing provider. ` +
          `Available providers: ${Object.keys(
            PROVIDERS
          ).join(", ")}`,
      });
    }

    const config =
      PROVIDERS[provider];

    // --------------------------------------------------------
    // Validate provider configuration
    // --------------------------------------------------------

    if (!config.isConfigured()) {
      console.error(
        `[Chatbot] ${provider} API key is not configured.`
      );

      return res.status(500).json({
        success: false,

        message:
          `${config.label} is not configured on the server.`,
      });
    }

    // --------------------------------------------------------
    // Validate messages
    // --------------------------------------------------------

    const validation =
      validateMessages(
        messages
      );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message:
          validation.message,
      });
    }

    const validMessages =
      validation.messages;

    // --------------------------------------------------------
    // Build provider request
    // --------------------------------------------------------

    const {
      url,
      headers,
      body,
    } =
      config.buildRequest(
        validMessages
      );

    // --------------------------------------------------------
    // Provider timeout
    // --------------------------------------------------------

    const controller =
      new AbortController();

    const timeoutId =
      setTimeout(() => {
        controller.abort();
      }, PROVIDER_TIMEOUT_MS);

    // --------------------------------------------------------
    // Request provider
    // --------------------------------------------------------

    providerResponse =
      await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(
          body
        ),
        signal:
          controller.signal,
      });

    clearTimeout(timeoutId);

    // --------------------------------------------------------
    // Provider returned an error
    // --------------------------------------------------------

    if (
      !providerResponse.ok
    ) {
      const errorText =
        await providerResponse
          .text()
          .catch(() => "");

      console.error(
        `[Chatbot] ${provider} request failed ` +
          `(${providerResponse.status}):`,
        errorText
      );

      return res.status(502).json({
        success: false,

        message:
          `The ${config.label} provider returned an error. ` +
          `Please try again.`,
      });
    }

    // --------------------------------------------------------
    // Provider did not return a stream
    // --------------------------------------------------------

    if (
      !providerResponse.body
    ) {
      console.error(
        `[Chatbot] ${provider} returned no response body.`
      );

      return res.status(502).json({
        success: false,

        message:
          "The AI provider returned an empty response.",
      });
    }

    // --------------------------------------------------------
    // Client may disconnect while streaming
    // --------------------------------------------------------

    let clientDisconnected =
      false;

    const handleDisconnect =
      () => {
        clientDisconnected =
          true;

        if (!controller.signal.aborted) {
          controller.abort();
        }
      };

    req.on(
      "close",
      handleDisconnect
    );

    // --------------------------------------------------------
    // Start streaming response
    // --------------------------------------------------------

    res.writeHead(200, {
      "Content-Type":
        "text/plain; charset=utf-8",

      "Transfer-Encoding":
        "chunked",

      "Cache-Control":
        "no-cache, no-transform",

      "X-Accel-Buffering":
        "no",

      Connection: "keep-alive",
    });

    // --------------------------------------------------------
    // Stream provider response
    // --------------------------------------------------------

    await streamProviderResponse({
      providerResponse,
      config,
      res,
      requestSignal:
        controller.signal,
    });

    // Remove disconnect listener
    req.off(
      "close",
      handleDisconnect
    );

    // --------------------------------------------------------
    // Finish response
    // --------------------------------------------------------

    if (
      !clientDisconnected &&
      !res.destroyed
    ) {
      res.end();
    }
  } catch (error) {
    console.error(
      "[Chatbot] Controller error:",
      error
    );

    // --------------------------------------------------------
    // Abort / timeout
    // --------------------------------------------------------

    if (
      error?.name ===
        "AbortError"
    ) {
      if (
        !res.headersSent &&
        !res.destroyed
      ) {
        return res.status(504).json({
          success: false,

          message:
            "The AI provider took too long to respond.",
        });
      }

      if (
        !res.destroyed
      ) {
        res.end();
      }

      return;
    }

    // --------------------------------------------------------
    // Error before streaming
    // --------------------------------------------------------

    if (
      !res.headersSent
    ) {
      return res.status(500).json({
        success: false,

        message:
          "Something went wrong while communicating with the AI provider.",
      });
    }

    // --------------------------------------------------------
    // Error after streaming started
    // --------------------------------------------------------

    if (
      !res.destroyed
    ) {
      res.end();
    }
  }
};