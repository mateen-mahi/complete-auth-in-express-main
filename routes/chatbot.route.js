// routes/chatbot.route.js
import express from "express";
import { sendChatMessage, getAvailableProviders } from "../Controllers/chatbot/chatbot.controller.js";

const chatbotRouter = express.Router();

// GET /api/v1/chatbot/providers — which models are available right now
chatbotRouter.get("/providers", getAvailableProviders);

// POST /api/v1/chatbot/message — streams back a plain-text response
chatbotRouter.post("/message", sendChatMessage);

export default chatbotRouter;
