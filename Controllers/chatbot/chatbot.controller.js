// controllers/chatbot.controller.js
//
// Lightweight AI chatbot controller.
//
// Uses Node.js native fetch.
// No OpenAI SDK.
// No Gemini SDK.
// No additional npm dependencies.
//
// Supported providers:
// - OpenAI
// - Gemini
//
// Environment variables:
//
// OPENAI_API_KEY=your_openai_key
// OPENAI_MODEL=gpt-4o-mini
//
// GEMINI_API_KEY=your_gemini_key
//
// Gemini model is intentionally fixed to:
// gemini-2.5-flash
//
// The frontend sends:
//
// {
//   provider: "openai" | "gemini",
//   messages: [
//     {
//       role: "user" | "assistant",
//       content: "Hello"
//     }
//   ]
// }
//
// The backend returns a plain text streaming response.


// ============================================================
// CONFIGURATION
// ============================================================

const MAX_MESSAGES = 30;

const MAX_MESSAGE_LENGTH = 8000;

const PROVIDER_TIMEOUT = 60_000;


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
          ?.[
            0
          ]
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

      // Gemini uses:
      //
      // user
      // model
      //
      // instead of:
      //
      // user
      // assistant

      const contents =
        messages.map(
          (message) => ({

            role:
              message.role ===
              "assistant"
                ? "model"
                : "user",

            parts: [

              {
                text:
                  message.content,
              },

            ],

          })
        );


      return {

        // IMPORTANT:
        // Keep this model fixed to a valid
        // current Gemini model.

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
          ?.[
            0
          ]
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

      // Gemini closes the HTTP stream
      // instead of sending [DONE].

      return false;
    },

  },

};


// ============================================================
// MESSAGE VALIDATION
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


  for (const message of messages) {

    if (
      !message ||
      typeof message !==
        "object"
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
          // Ignore cancellation errors.
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


      // SSE events are separated
      // by a blank line.

      const events =
        buffer.split(
          /\r?\n\r?\n/
        );


      // Keep the incomplete
      // event for the next chunk.

      buffer =
        events.pop() || "";


      for (
        const event of events
      ) {

        const lines =
          event.split(
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
          dataLines.length ===
          0
        ) {

          continue;
        }


        const data =
          dataLines.join(
            "\n"
          );


        // ----------------------------------------------------
        // OPENAI END OF STREAM
        // ----------------------------------------------------

        if (
          provider ===
            "openai" &&
          data === "[DONE]"
        ) {

          return;
        }


        // ----------------------------------------------------
        // PARSE JSON
        // ----------------------------------------------------

        try {

          const json =
            JSON.parse(data);


          let text = "";


          // --------------------------------------------------
          // OPENAI
          // --------------------------------------------------

          if (
            provider ===
            "openai"
          ) {

            text =
              json
                ?.choices
                ?.[
                  0
                ]
                ?.delta
                ?.content ||
              "";

          }


          // --------------------------------------------------
          // GEMINI
          // --------------------------------------------------

          if (
            provider ===
            "gemini"
          ) {

            text =
              json
                ?.candidates
                ?.[
                  0
                ]
                ?.content
                ?.parts
                ?.map(
                  (part) =>
                    part?.text ||
                    ""
                )
                ?.join("") ||
              "";

          }


          // --------------------------------------------------
          // SEND CHUNK TO FRONTEND
          // --------------------------------------------------

          if (
            text &&
            !res.destroyed
          ) {

            res.write(text);

          }

        } catch (error) {

          console.warn(
            `[Chatbot] Failed to parse ${provider} SSE chunk:`,
            error.message
          );

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
// Returns only providers that have an API key configured.
//

export const getAvailableProviders = (
  req,
  res
) => {

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
//   provider: "gemini",
//   messages: [
//     {
//       role: "user",
//       content: "Hello"
//     }
//   ]
// }
//
// Response:
//
// Plain text stream
//

export const sendChatMessage =
  async (
    req,
    res
  ) => {

    let timeoutId;

    const abortController =
      new AbortController();


    let clientDisconnected =
      false;


    let disconnectHandler;


    try {

      // ------------------------------------------------------
      // REQUEST DATA
      // ------------------------------------------------------

      const {

        provider,

        messages,

      } =
        req.body || {};


      // ------------------------------------------------------
      // VALIDATE PROVIDER
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // CHECK API KEY
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // VALIDATE MESSAGES
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // BUILD PROVIDER REQUEST
      // ------------------------------------------------------

      const {

        url,

        headers,

        body,

      } =
        config.buildRequest(
          validation.messages
        );


      console.log(
        `[Chatbot] Sending request to ${provider}`
      );


      // ------------------------------------------------------
      // TIMEOUT
      // ------------------------------------------------------

      timeoutId =
        setTimeout(
          () => {

            abortController.abort();

          },
          PROVIDER_TIMEOUT
        );


      // ------------------------------------------------------
      // CLIENT DISCONNECT
      // ------------------------------------------------------

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


      req.on(
        "close",
        disconnectHandler
      );


      // ------------------------------------------------------
      // CALL AI PROVIDER
      // ------------------------------------------------------

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
                "The AI provider took too long to respond.",

            });

        }


        console.error(
          `[Chatbot] ${provider} network error:`,
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

      }


      // ------------------------------------------------------
      // PROVIDER ERROR
      // ------------------------------------------------------

      if (
        !providerResponse.ok
      ) {

        const errorText =
          await providerResponse
            .text()
            .catch(
              () => ""
            );


        console.error(
          "=================================================="
        );


        console.error(
          `[Chatbot] ${provider} request failed`
        );


        console.error(
          `Status: ${providerResponse.status}`
        );


        // This is the MOST IMPORTANT
        // debug information.

        console.error(
          `Response: ${errorText}`
        );


        console.error(
          "=================================================="
        );


        if (
          !res.headersSent
        ) {

          return res
            .status(502)
            .json({

              success: false,

              message:
                `The ${config.label} provider returned an error. Please try again.`,

              providerStatus:
                providerResponse
                  .status,

            });

        }


        return;
      }


      // ------------------------------------------------------
      // CHECK RESPONSE BODY
      // ------------------------------------------------------

      if (
        !providerResponse.body
      ) {

        console.error(
          `[Chatbot] ${provider} returned no response body.`
        );


        return res
          .status(502)
          .json({

            success: false,

            message:
              `${config.label} returned an empty response.`,

          });

      }


      // ------------------------------------------------------
      // START STREAM
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // STREAM RESPONSE
      // ------------------------------------------------------

      await streamProviderResponse({

        provider,

        providerResponse,

        res,

        signal:
          abortController
            .signal,

      });


      // ------------------------------------------------------
      // END RESPONSE
      // ------------------------------------------------------

      if (
        !clientDisconnected &&
        !res.destroyed
      ) {

        res.end();

      }


      // ------------------------------------------------------
      // CLEANUP
      // ------------------------------------------------------

      if (
        disconnectHandler
      ) {

        req.off(
          "close",
          disconnectHandler
        );

      }

    } catch (error) {

      clearTimeout(
        timeoutId
      );


      console.error(
        "[Chatbot] Unexpected controller error:",
        error
      );


      // ------------------------------------------------------
      // ABORT ERROR
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // ERROR BEFORE STREAM
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // ERROR AFTER STREAM STARTED
      // ------------------------------------------------------

      if (
        !res.destroyed
      ) {

        res.end();

      }

    }

  };