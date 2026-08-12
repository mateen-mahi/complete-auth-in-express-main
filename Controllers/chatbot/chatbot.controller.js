// controllers/chatbot.controller.js
//
// Lightweight AI chatbot controller.
//
// Providers:
// - OpenAI
// - Gemini
//
// No SDKs are required.
// Uses Node.js native fetch.
//
// Environment variables:
//
// OPENAI_API_KEY=your_openai_api_key
// OPENAI_MODEL=gpt-4o-mini
//
// GEMINI_API_KEY=your_gemini_api_key
//
// Optional:
// CHATBOT_DEBUG=true
//
// CHATBOT_DEBUG=true temporarily exposes the provider's actual
// error message in the API response. Keep it false in production.
//
// ------------------------------------------------------------


// ============================================================
// CONFIGURATION
// ============================================================

const MAX_MESSAGES = 30;

const MAX_MESSAGE_LENGTH = 8000;

const PROVIDER_TIMEOUT = 60_000;

const DEBUG_ERRORS =
  process.env.CHATBOT_DEBUG === "true";


// ============================================================
// PROVIDER REGISTRY
// ============================================================

const PROVIDERS = {

  // ==========================================================
  // OPENAI
  // ==========================================================

  openai: {

    label: "ChatGPT",

    isConfigured() {
      return Boolean(
        process.env.OPENAI_API_KEY
      );
    },

    buildRequest(messages) {

      return {
        url:
          "https://api.openai.com/v1/chat/completions",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${process.env.OPENAI_API_KEY}`,
        },

        body: {
          model:
            process.env.OPENAI_MODEL ||
            "gpt-4o-mini",

          messages,

          stream: true,
        },
      };
    },

    extractText(json) {

      return (
        json
          ?.choices
          ?.[0]
          ?.delta
          ?.content || ""
      );
    },

    isDone(data) {

      return data === "[DONE]";
    },
  },


  // ==========================================================
  // GEMINI
  // ==========================================================

  gemini: {

    label: "Gemini",

    isConfigured() {
      return Boolean(
        process.env.GEMINI_API_KEY
      );
    },

    buildRequest(messages) {

      // OpenAI-style:
      //
      // {
      //   role: "assistant",
      //   content: "Hello"
      // }
      //
      // Gemini-style:
      //
      // {
      //   role: "model",
      //   parts: [
      //     {
      //       text: "Hello"
      //     }
      //   ]
      // }

      const contents =
        messages.map((message) => ({
          role:
            message.role === "assistant"
              ? "model"
              : "user",

          parts: [
            {
              text:
                message.content,
            },
          ],
        }));


      return {

        // Gemini REST streaming endpoint.
        //
        // IMPORTANT:
        // The model name must NOT contain "models/" here.
        //
        // Correct:
        // models/gemini-2.5-flash:streamGenerateContent
        //
        // Incorrect:
        // models/models/gemini-2.5-flash

        url:
          "https://generativelanguage.googleapis.com/" +
          "v1beta/models/gemini-2.5-flash" +
          ":streamGenerateContent?alt=sse",

        headers: {

          "Content-Type":
            "application/json",

          "x-goog-api-key":
            process.env.GEMINI_API_KEY,
        },

        body: {
          contents,
        },
      };
    },


    extractText(json) {

      return (
        json
          ?.candidates
          ?.[0]
          ?.content
          ?.parts
          ?.map(
            (part) =>
              part?.text || ""
          )
          ?.join("") || ""
      );
    },


    isDone() {

      // Gemini ends the HTTP stream.
      // It does not use OpenAI's [DONE]
      // sentinel.

      return false;
    },
  },

};


// ============================================================
// VALIDATE MESSAGES
// ============================================================

function validateMessages(messages) {

  if (!Array.isArray(messages)) {

    return {
      valid: false,
      message:
        "Messages must be an array.",
    };
  }


  if (messages.length === 0) {

    return {
      valid: false,
      message:
        "Messages array cannot be empty.",
    };
  }


  if (
    messages.length >
    MAX_MESSAGES
  ) {

    return {
      valid: false,
      message:
        `Maximum ${MAX_MESSAGES} messages are allowed.`,
    };
  }


  for (
    const message of messages
  ) {

    if (
      !message ||
      typeof message !== "object"
    ) {

      return {
        valid: false,
        message:
          "Invalid message format.",
      };
    }


    if (
      ![
        "user",
        "assistant",
      ].includes(
        message.role
      )
    ) {

      return {
        valid: false,
        message:
          'Message role must be "user" or "assistant".',
      };
    }


    if (
      typeof message.content !==
      "string"
    ) {

      return {
        valid: false,
        message:
          "Message content must be a string.",
      };
    }


    if (
      !message.content.trim()
    ) {

      return {
        valid: false,
        message:
          "Message content cannot be empty.",
      };
    }


    if (
      message.content.length >
      MAX_MESSAGE_LENGTH
    ) {

      return {
        valid: false,
        message:
          `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      };
    }
  }


  return {

    valid: true,

    messages:
      messages.map(
        (message) => ({
          role:
            message.role,

          content:
            message.content.trim(),
        })
      ),
  };
}


// ============================================================
// PARSE PROVIDER ERROR
// ============================================================

async function parseProviderError(
  providerResponse
) {

  const rawText =
    await providerResponse
      .text()
      .catch(() => "");


  let message =
    "Unknown provider error.";


  let parsed = null;


  try {

    parsed =
      JSON.parse(
        rawText
      );

  } catch {
    // Response wasn't JSON.
  }


  if (parsed) {

    message =
      parsed?.error?.message ||
      parsed?.message ||
      message;

  } else if (
    rawText
  ) {

    message =
      rawText;

  }


  return {
    status:
      providerResponse.status,

    statusText:
      providerResponse.statusText,

    message,

    rawText,
  };
}


// ============================================================
// STREAM PROVIDER RESPONSE
// ============================================================

async function streamProviderResponse({

  provider,

  providerResponse,

  res,

  signal,

}) {

  if (
    !providerResponse.body
  ) {

    throw new Error(
      "Provider returned an empty response body."
    );
  }


  const reader =
    providerResponse
      .body
      .getReader();


  const decoder =
    new TextDecoder();


  let buffer = "";


  try {

    while (true) {

      if (
        signal.aborted
      ) {

        try {
          await reader.cancel();
        } catch {
          // Ignore.
        }

        return;
      }


      const {
        done,
        value,
      } =
        await reader.read();


      if (done) {
        break;
      }


      buffer +=
        decoder.decode(
          value,
          {
            stream: true,
          }
        );


      // SSE messages can use:
      //
      // \n\n
      //
      // or:
      //
      // \r\n\r\n

      const events =
        buffer.split(
          /\r?\n\r?\n/
        );


      // Keep incomplete event.

      buffer =
        events.pop() || "";


      for (
        const rawEvent of events
      ) {

        const lines =
          rawEvent.split(
            /\r?\n/
          );


        const dataLines =
          lines
            .filter(
              (line) =>
                line.startsWith(
                  "data:"
                )
            )
            .map(
              (line) =>
                line
                  .slice(5)
                  .trim()
            );


        if (
          dataLines.length === 0
        ) {
          continue;
        }


        const data =
          dataLines.join(
            "\n"
          );


        // ====================================================
        // OPENAI END
        // ====================================================

        if (
          provider === "openai" &&
          data === "[DONE]"
        ) {

          return;
        }


        // ====================================================
        // PARSE JSON
        // ====================================================

        let json;


        try {

          json =
            JSON.parse(data);

        } catch (error) {

          console.warn(
            `[Chatbot] Could not parse ${provider} SSE chunk:`,
            error.message
          );

          continue;
        }


        // ====================================================
        // EXTRACT TEXT
        // ====================================================

        const config =
          PROVIDERS[provider];


        const text =
          config.extractText(
            json
          );


        // ====================================================
        // SEND TO FRONTEND
        // ====================================================

        if (
          text &&
          !res.destroyed
        ) {

          res.write(text);
        }
      }
    }


    // ========================================================
    // PROCESS ANY FINAL BUFFER
    // ========================================================

    if (
      buffer.trim()
    ) {

      const lines =
        buffer.split(
          /\r?\n/
        );


      const dataLines =
        lines
          .filter(
            (line) =>
              line.startsWith(
                "data:"
              )
          )
          .map(
            (line) =>
              line
                .slice(5)
                .trim()
          );


      for (
        const data of dataLines
      ) {

        if (
          provider === "openai" &&
          data === "[DONE]"
        ) {
          continue;
        }


        try {

          const json =
            JSON.parse(data);


          const text =
            PROVIDERS[
              provider
            ].extractText(
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
      // Ignore.
    }
  }
}


// ============================================================
// GET AVAILABLE PROVIDERS
// ============================================================
//
// GET /api/v1/chatbot/providers
//
// Returns configured providers only.
//

export const getAvailableProviders =
  (req, res) => {

    const providers =
      Object.entries(
        PROVIDERS
      )
        .filter(
          ([, config]) =>
            config.isConfigured()
        )
        .map(
          ([id, config]) => ({
            id,
            label:
              config.label,
          })
        );


    return res.status(200).json({

      success: true,

      providers,

    });
  };


// ============================================================
// POST CHAT MESSAGE
// ============================================================
//
// POST /api/v1/chatbot/message
//
// Body:
//
// {
//   "provider": "gemini",
//   "messages": [
//     {
//       "role": "user",
//       "content": "Hello"
//     }
//   ]
// }
//

export const sendChatMessage =
  async (req, res) => {

    let timeoutId = null;

    let clientDisconnected =
      false;


    const abortController =
      new AbortController();


    let disconnectHandler = null;


    try {

      // ======================================================
      // REQUEST BODY
      // ======================================================

      const {
        provider,
        messages,
      } =
        req.body || {};


      // ======================================================
      // PROVIDER VALIDATION
      // ======================================================

      if (
        typeof provider !==
          "string" ||
        !PROVIDERS[provider]
      ) {

        return res.status(400).json({

          success: false,

          message:
            `Invalid provider. Available providers: ` +
            `${Object.keys(
              PROVIDERS
            ).join(", ")}`,

        });
      }


      const config =
        PROVIDERS[provider];


      // ======================================================
      // API KEY VALIDATION
      // ======================================================

      if (
        !config.isConfigured()
      ) {

        console.error(
          `[Chatbot] ${provider} API key is missing.`
        );


        return res.status(500).json({

          success: false,

          message:
            `${config.label} is not configured on the server.`,

        });
      }


      // ======================================================
      // MESSAGE VALIDATION
      // ======================================================

      const validation =
        validateMessages(
          messages
        );


      if (
        !validation.valid
      ) {

        return res.status(400).json({

          success: false,

          message:
            validation.message,

        });
      }


      // ======================================================
      // BUILD REQUEST
      // ======================================================

      const {
        url,
        headers,
        body,
      } =
        config.buildRequest(
          validation.messages
        );


      // IMPORTANT:
      // Never log the URL for Gemini because
      // we don't put the API key in the URL.
      //
      // Also never log headers because they
      // contain authentication credentials.

      console.log(
        `[Chatbot] Requesting ${config.label}...`
      );


      // ======================================================
      // PROVIDER TIMEOUT
      // ======================================================

      timeoutId =
        setTimeout(
          () => {

            abortController.abort();

          },
          PROVIDER_TIMEOUT
        );


      // ======================================================
      // CLIENT DISCONNECT
      // ======================================================

      disconnectHandler =
        () => {

          clientDisconnected =
            true;


          if (
            !abortController
              .signal
              .aborted
          ) {

            abortController.abort();
          }
        };


      req.once(
        "close",
        disconnectHandler
      );


      // ======================================================
      // CALL PROVIDER
      // ======================================================

      let providerResponse;


      try {

        providerResponse =
          await fetch(
            url,
            {

              method:
                "POST",

              headers,

              body:
                JSON.stringify(
                  body
                ),

              signal:
                abortController
                  .signal,

            }
          );

      } catch (error) {

        if (
          error.name ===
          "AbortError"
        ) {

          if (
            clientDisconnected
          ) {

            return;
          }


          return res
            .status(504)
            .json({

              success: false,

              message:
                `The ${config.label} request timed out.`,

            });
        }


        console.error(
          `[Chatbot] ${config.label} connection error:`,
          error
        );


        return res
          .status(502)
          .json({

            success: false,

            message:
              `Unable to connect to ${config.label}.`,

          });

      } finally {

        clearTimeout(
          timeoutId
        );

        timeoutId = null;
      }


      // ======================================================
      // PROVIDER HTTP ERROR
      // ======================================================

      if (
        !providerResponse.ok
      ) {

        const providerError =
          await parseProviderError(
            providerResponse
          );


        // IMPORTANT:
        // This is the information we need
        // to diagnose your current 404.

        console.error(
          "=================================================="
        );

        console.error(
          `[Chatbot] ${config.label} provider error`
        );

        console.error(
          "Status:",
          providerError.status
        );

        console.error(
          "Status text:",
          providerError.statusText
        );

        console.error(
          "Provider message:",
          providerError.message
        );

        console.error(
          "=================================================="
        );


        // ----------------------------------------------------
        // DEVELOPMENT / DEBUG RESPONSE
        // ----------------------------------------------------

        if (
          DEBUG_ERRORS
        ) {

          return res
            .status(502)
            .json({

              success: false,

              message:
                `The ${config.label} provider returned an error.`,

              providerStatus:
                providerError.status,

              providerMessage:
                providerError.message,

            });
        }


        // ----------------------------------------------------
        // PRODUCTION RESPONSE
        // ----------------------------------------------------

        return res
          .status(502)
          .json({

            success: false,

            message:
              `The ${config.label} provider returned an error. Please try again.`,

          });
      }


      // ======================================================
      // CHECK PROVIDER BODY
      // ======================================================

      if (
        !providerResponse.body
      ) {

        console.error(
          `[Chatbot] ${config.label} returned an empty response body.`
        );


        return res
          .status(502)
          .json({

            success: false,

            message:
              `${config.label} returned an empty response.`,

          });
      }


      // ======================================================
      // STREAM RESPONSE HEADERS
      // ======================================================

      res.writeHead(
        200,
        {

          "Content-Type":
            "text/plain; charset=utf-8",

          "Cache-Control":
            "no-cache, no-transform",

          "X-Accel-Buffering":
            "no",

          Connection:
            "keep-alive",

          "Transfer-Encoding":
            "chunked",

        }
      );


      // ======================================================
      // STREAM AI RESPONSE
      // ======================================================

      await streamProviderResponse({

        provider,

        providerResponse,

        res,

        signal:
          abortController.signal,

      });


      // ======================================================
      // FINISH RESPONSE
      // ======================================================

      if (
        !clientDisconnected &&
        !res.destroyed
      ) {

        res.end();
      }


    } catch (error) {

      clearTimeout(
        timeoutId
      );


      console.error(
        "[Chatbot] Unexpected error:",
        error
      );


      // ======================================================
      // ABORT ERROR
      // ======================================================

      if (
        error.name ===
        "AbortError"
      ) {

        if (
          !res.headersSent &&
          !clientDisconnected
        ) {

          return res
            .status(504)
            .json({

              success: false,

              message:
                "The AI provider request timed out.",

            });
        }


        if (
          !res.destroyed
        ) {

          res.end();
        }


        return;
      }


      // ======================================================
      // ERROR BEFORE STREAM
      // ======================================================

      if (
        !res.headersSent
      ) {

        return res
          .status(500)
          .json({

            success: false,

            message:
              "Something went wrong while communicating with the AI provider.",

          });
      }


      // ======================================================
      // ERROR AFTER STREAM STARTED
      // ======================================================

      if (
        !res.destroyed
      ) {

        res.end();
      }

    } finally {

      // ======================================================
      // CLEANUP
      // ======================================================

      if (timeoutId) {

        clearTimeout(
          timeoutId
        );
      }


      if (
        disconnectHandler
      ) {

        req.off(
          "close",
          disconnectHandler
        );
      }
    }
  };