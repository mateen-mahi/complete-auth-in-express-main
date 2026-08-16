// controllers/message.controller.js
import mongoose from "mongoose";
import GlobalMessage from "../../models/globalMessage.model.js";
import DirectMessage from "../../models/directMessage.model.js";

import { globalMessageBuffer, directMessageBuffer } from "../../service/messageBuffer.js";

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

export const deleteMessage = async (req, res) => {
  try {
    const { chatType, messageId } = req.params;
    const { scope } = req.body; // 'me' | 'everyone'
    const userId = req.user.id;

    if (!["global", "dm"].includes(chatType) || !["me", "everyone"].includes(scope)) {
      return res.status(400).json({ success: false, message: "Invalid delete request" });
    }

    const Model  = chatType === "global" ? GlobalMessage : DirectMessage;
    const buffer = chatType === "global" ? globalMessageBuffer : directMessageBuffer;

    const message = await Model.findOne({ id: messageId });

    if (scope === "everyone") {
      if (message) {
        if (String(message.senderId) !== String(userId)) {
          return res.status(403).json({ success: false, message: "You can only delete your own messages for everyone" });
        }
        message.deletedForEveryone = true;
        message.text = "This message was deleted";
        await message.save();
      } else {
        const buffered = buffer.buffer.find((m) => m.id === messageId);
        if (!buffered) return res.status(404).json({ success: false, message: "Message not found" });
        if (String(buffered.senderId) !== String(userId)) {
          return res.status(403).json({ success: false, message: "You can only delete your own messages for everyone" });
        }
        buffer.patchById(messageId, (m) => {
          m.deletedForEveryone = true;
          m.text = "This message was deleted";
        });
      }
      return res.status(200).json({ success: true, deletedForEveryone: true });
    }

    // scope === "me"
    if (message) {
      await Model.updateOne({ id: messageId }, { $addToSet: { deletedFor: userId } });
    } else {
      const patched = buffer.patchById(messageId, (m) => {
        m.deletedFor = m.deletedFor || [];
        if (!m.deletedFor.includes(userId)) m.deletedFor.push(userId);
      });
      if (!patched) return res.status(404).json({ success: false, message: "Message not found" });
    }
    return res.status(200).json({ success: true, deletedForMe: true });
  } catch (error) {
    return handleError(res, error);
  }
};

// DELETE /api/v1/messages/dm/conversation/:otherUserId
// "Delete chat" — removes every message in the conversation from the
// requesting user's view only. The other participant's copy is untouched.
export const clearConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    await DirectMessage.updateMany(
      {
        $or: [
          { senderId: userId, toUserId: otherUserId },
          { senderId: otherUserId, toUserId: userId },
        ],
      },
      { $addToSet: { deletedFor: userId } }
    );

    directMessageBuffer.patchMany(
      (m) =>
        (String(m.senderId) === String(userId) && String(m.toUserId) === String(otherUserId)) ||
        (String(m.senderId) === String(otherUserId) && String(m.toUserId) === String(userId)),
      (m) => {
        m.deletedFor = m.deletedFor || [];
        if (!m.deletedFor.includes(userId)) m.deletedFor.push(userId);
      }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return handleError(res, error);
  }
};