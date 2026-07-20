import express from "express";
import { getGlobalHistory, getDMHistory, getRecentConversations } from "../Controllers/Message/message.controller.js";

const messageRouter = express.Router();

messageRouter.get("/global", getGlobalHistory);
messageRouter.get("/conversations", getRecentConversations); 
messageRouter.get("/dm/:otherUserId", getDMHistory);

export default messageRouter;