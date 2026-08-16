import express from "express";
import {
  getGlobalHistory, getDMHistory, getRecentConversations,
  deleteMessage, clearConversation,
} from "../Controllers/Message/message.controller.js";

const messageRouter = express.Router();

messageRouter.get("/global", getGlobalHistory);
messageRouter.get("/conversations", getRecentConversations);
messageRouter.get("/dm/:otherUserId", getDMHistory);

messageRouter.delete("/dm/conversation/:otherUserId", clearConversation);
messageRouter.delete("/:chatType/:messageId", deleteMessage);

export default messageRouter;