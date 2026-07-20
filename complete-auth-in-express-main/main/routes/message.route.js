import express from "express";
import {
  getGlobalHistory,
  getDMHistory,
  deleteAllGlobalMessages,
  deleteAllMyDMs,
  deleteDMConversation,
} from "../Controllers/Message/message.controller.js";

const messageRouter = express.Router();

messageRouter.get("/global",getGlobalHistory);
messageRouter.delete("/global",  deleteAllGlobalMessages);

messageRouter.get("/dm/:otherUserId",  getDMHistory);
messageRouter.delete("/dm",  deleteAllMyDMs);
messageRouter.delete("/dm/:otherUserId", deleteDMConversation);

export default messageRouter;