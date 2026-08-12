// controllers/chatbot.controller.js
//
// No SDKs installed — this talks to OpenAI's and Gemini's plain REST APIs
// directly via Node's built-in global `fetch`, matching the "keep it as
// light as possible" decision. Zero new npm dependencies.
//
// Adding a new provider later (e.g. DeepSeek, which speaks the exact same
// request/response shape as OpenAI) is just adding one more entry to
// PROVIDERS below — no new code paths, no new packages.

// ─────────────────────────────────────────────────────────────
// Provider registry — the only place that knows the differences
// between OpenAI's and Gemini's request/response shapes.
// ─────────────────────────────────────────────────────────────
const PROVIDERS = {
  openai: {
    label: "ChatGPT",
    buildRequest: (messages) => ({
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: {
        model: "gpt-4o-mini", // cheap + fast; change freely, it's just a string
        messages, // already in [{role, content}] shape — no transform needed
        stream: true,
      },
    }),
    // Pulls the incremental text out of one parsed SSE "data: {...}" chunk.
    extractText: (json) => json.choices?.[0]?.delta?.content || "",
    isDone: (rawDataStr) => rawDataStr === "[DONE]",
  },

  gemini: {
    label: "Gemini",
    buildRequest: (messages) => {
      // Gemini wants {role: "user"|"model", parts:[{text}]}, not
      // {role: "user"|"assistant", content} — translate here, once,
      // so nothing outside this file needs to know that.
      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`,
        headers: { "Content-Type": "application/json" },
        body: { contents },
      };
    },
    extractText: (json) => json.candidates?.[0]?.content?.parts?.[0]?.text || "",
    isDone: () => false, // Gemini's stream just ends the HTTP response — no explicit sentinel
  },

  // ── Example of how a free/cheap OpenAI-compatible model slots in later ──
  // (left commented out — uncomment + add DEEPSEEK_API_KEY to .env to enable)
  //
  // deepseek: {
  //   label: "DeepSeek",
  //   buildRequest: (messages) => ({
  //     url: "https://api.deepseek.com/chat/completions",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  //     },
  //     body: { model: "deepseek-chat", messages, stream: true },
  //   }),
  //   extractText: (json) => json.choices?.[0]?.delta?.content || "",
  //   isDone: (rawDataStr) => rawDataStr === "[DONE]",
  // },
};

// GET /api/v1/chatbot/providers — lets the frontend build its provider
// picker from the backend's actual registry instead of hardcoding a list
// that could drift out of sync.
export const getAvailableProviders = (req, res) => {
  const providers = Object.entries(PROVIDERS).map(([id, cfg]) => ({ id, label: cfg.label }));
  res.status(200).json({ success: true, providers });
};

// POST /api/v1/chatbot/message
// Body: { provider: "openai" | "gemini", messages: [{ role: "user"|"assistant", content }] }
// Responds with a plain chunked text stream (not JSON) — the frontend reads
// it incrementally via a ReadableStream reader, appending each chunk to the
// message as it arrives.
export const sendChatMessage = async (req, res) => {
  try {
    const { provider, messages } = req.body;

    if (!provider || !PROVIDERS[provider]) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing provider. Available: ${Object.keys(PROVIDERS).join(", ")}`,
      });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "messages array is required" });
    }

    const config = PROVIDERS[provider];
    const { url, headers, body } = config.buildRequest(messages);

    const providerRes = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!providerRes.ok || !providerRes.body) {
      const errText = await providerRes.text().catch(() => "");
      console.error(`[Chatbot] ${provider} request failed (${providerRes.status}):`, errText);
      return res.status(502).json({
        success: false,
        message: "The AI provider returned an error. Check your API key and try again.",
      });
    }

    // Start the chunked response — headers are locked in now, so any error
    // from here on can only be surfaced by writing text into the stream
    // itself, not by changing the HTTP status.
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no", // disables nginx buffering if you're behind one
    });

    const reader = providerRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line ("\n\n"). The last split
      // piece may be an incomplete event still being streamed in, so it's
      // kept in `buffer` for the next read rather than parsed early.
      const events = buffer.split("\n\n");
      buffer = events.pop();

      for (const rawEvent of events) {
        const line = rawEvent.trim();
        if (!line.startsWith("data:")) continue;

        const dataStr = line.slice(5).trim();
        if (config.isDone(dataStr)) continue;

        try {
          const json = JSON.parse(dataStr);
          const text = config.extractText(json);
          if (text) res.write(text);
        } catch {
          // Malformed/partial JSON shouldn't normally happen with proper SSE
          // framing — if it does, skip that fragment rather than crash the stream.
        }
      }
    }

    res.end();
  } catch (error) {
    console.error("[Chatbot] Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Something went wrong talking to the AI provider." });
    } else {
      res.end();
    }
  }
};
