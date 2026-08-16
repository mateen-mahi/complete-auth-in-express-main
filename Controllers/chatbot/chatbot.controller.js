// Proxies chat messages to Gemini and streams the response back as plain
// text chunks. The API key never reaches the client — it's only ever used
// here, server-side.
//
// Uses Google's official @google/genai SDK (npm install @google/genai)
// instead of hand-parsing the raw REST SSE stream — the SDK handles chunk
// boundaries/parsing internally and just hands back chunk.text, which
// removes an entire class of "silently empty" bugs.

import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `You are the support assistant embedded in this online learning platform (an LMS with courses, lectures, quizzes, progress tracking, and certificates).

You ONLY help with:
1. Questions about how to use this platform — enrolling, watching lectures, taking quizzes, tracking progress, generating/verifying certificates, account basics.
2. General education-related questions — explaining academic concepts, study tips, help understanding course subject matter.

You do NOT answer anything outside those two areas — no general trivia, no unrelated coding help, no current events, no personal advice, nothing off-topic. If asked something out of scope, politely decline in one sentence and redirect: "I can only help with questions about this platform or education-related topics — is there something like that I can help with?"

Keep answers concise and friendly (a few sentences unless the question genuinely needs more). If you don't know something specific to this student's account or data (e.g. their exact progress, billing details), say so and suggest they check the relevant page or contact support instead of guessing.`;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Created once per process, not per-request — the client is cheap to hold
// onto and re-creating it on every message is unnecessary overhead.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const sendMessage = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ success: false, message: "A message is required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("[chatbot] GEMINI_API_KEY is not set.");
      return res.status(500).json({ success: false, message: "Chat isn't configured yet." });
    }

    // Cap history so a long-running conversation can't balloon the request
    // (and cost) indefinitely — keep the last 20 turns of context.
    const contents = [
      ...history.slice(-20).map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: String(h.text || "") }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    let stream;
    try {
      stream = await ai.models.generateContentStream({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          maxOutputTokens: 800,
          temperature: 0.4,
        },
      });
    } catch (sdkError) {
      // This is where a bad API key, no access to this model, or a quota
      // problem actually surfaces now — the old raw-fetch version could
      // swallow errors like this into a "successful but empty" stream.
      console.error("[chatbot] Gemini SDK error:", sdkError?.message || sdkError);
      return res.status(502).json({
        success: false,
        message: "Chat service is temporarily unavailable.",
      });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no"); // disable nginx response buffering, if present

    let gotAnyText = false;

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        gotAnyText = true;
        res.write(text);
      }
    }

    // If the stream completed with zero text, log why — almost always a
    // safety block (finishReason SAFETY/RECITATION) rather than a bug.
    if (!gotAnyText) {
      console.warn("[chatbot] Gemini stream finished with no text — likely a safety block or empty reply.");
    }

    res.end();
  } catch (error) {
    console.error("[chatbot] sendMessage error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Something went wrong." });
    } else {
      res.end();
    }
  }
};