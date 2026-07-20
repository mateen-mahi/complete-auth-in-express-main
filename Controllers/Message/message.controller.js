// controllers/message.controller.js
import mongoose from "mongoose";
import GlobalMessage from "../../models/globalMessage.model.js";
import DirectMessage from "../../models/directMessage.model.js";

const handleError = (res, error) => {
  console.error("[MessageController]", error);
  return res.status(500).json({ success: false, message: "Failed to fetch message history" });
};

export const getGlobalHistory = async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 30, 50);
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const messages = await GlobalMessage.find({
      timestamp: { $lt: before },
      deletedFor: { $ne: req.user.id },
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    messages.reverse();

    return res.status(200).json({ success: true, messages, hasMore: messages.length === limit });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getDMHistory = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.params;
    const limit  = Math.min(parseInt(req.query.limit) || 30, 50);
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const messages = await DirectMessage.find({
      $or: [
        { senderId: currentUserId, toUserId: otherUserId },
        { senderId: otherUserId,   toUserId: currentUserId },
      ],
      timestamp: { $lt: before },
      deletedFor: { $ne: currentUserId },
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    messages.reverse();

    return res.status(200).json({ success: true, messages, hasMore: messages.length === limit });
  } catch (error) {
    return handleError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/messages/conversations
// Powers the DM sidebar's "recent chats" list. For every person the current
// user has ever exchanged a DM with, returns their CURRENT profile info
// (not stale cached data from old messages) plus a preview of the most
// recent message between the two of them. Excludes anything the current
// user has deleted-for-themselves.
// ─────────────────────────────────────────────────────────────────────────────
export const getRecentConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const conversations = await DirectMessage.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { toUserId: userId }],
          deletedFor: { $ne: userId },
        },
      },
      // "Who's the OTHER person in this message, from my point of view?"
      {
        $addFields: {
          otherUserId: {
            $cond: [{ $eq: ["$senderId", userId] }, "$toUserId", "$senderId"],
          },
        },
      },
      { $sort: { timestamp: -1 } },
      // One row per conversation partner. Because we already sorted
      // newest-first, $first on each field grabs the MOST RECENT message
      // for that partner.
      {
        $group: {
          _id: "$otherUserId",
          lastMessageText: { $first: "$text" },
          lastMessageAt: { $first: "$timestamp" },
          lastMessageSenderId: { $first: "$senderId" },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      { $limit: 30 },
      // Pull the partner's CURRENT username/avatar — not whatever was
      // cached on the message at send time, which could be outdated.
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: 1,
          username: "$userInfo.username",
          imageUrl: "$userInfo.imageUrl",
          role: "$userInfo.role",
          lastMessageText: 1,
          lastMessageAt: 1,
          lastMessageIsOwn: { $eq: ["$lastMessageSenderId", userId] },
        },
      },
    ]);

    return res.status(200).json({ success: true, conversations });
  } catch (error) {
    console.error("Error in getRecentConversations:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching recent conversations" });
  }
};