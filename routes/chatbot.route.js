import express from "express";
import { sendMessage } from "../Controllers/chatbot/chatbot.controller.js";

const chatbotRouter = express.Router();

// POST /api/v1/chatbot/message
// Auth: required (matches the rest of your API — attach whatever auth
// middleware the other routers use, if it isn't already applied globally).
// Body: { message: string, history?: [{ role: "user"|"assistant", text: string }] }
// Response: streamed plain text (not JSON) — the reply, token by token.
chatbotRouter.post("/message", sendMessage);

export default chatbotRouter;