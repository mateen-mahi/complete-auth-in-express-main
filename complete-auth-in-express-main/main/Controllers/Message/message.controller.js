import mongoose from "mongoose";
import GlobalMessage from "../../models/globalMessage.model.js";
import DirectMessage from "../../models/directMessage.model.js";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const handleError = (res, error, statusCode = 500) => {
  console.error("[MessageController]", error);
  return res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong",
  });
};

// Map MongoDB doc to client-friendly format
const formatMessage = (msg) => ({
  id:         msg._id.toString(),
  text:       msg.text,
  sender:     msg.sender,
  senderId:   msg.senderId.toString(),
  toUserId:   msg.toUserId?.toString(),
  toUsername: msg.toUsername,
  timestamp:  msg.createdAt.toISOString(),
});

const parseLimit = (queryLimit) => Math.min(parseInt(queryLimit) || 30, 50);

const parseBefore = (queryBefore) => {
  if (!queryBefore) return new Date(Date.now() + 1000); // slight future buffer
  const d = new Date(queryBefore);
  if (isNaN(d.getTime())) throw new Error("Invalid 'before' date");
  return d;
};

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

// ── GET: Global Chat History ──────────────────────────────────────────────
export const getGlobalHistory = async (req, res) => {
  try {
    const limit  = parseLimit(req.query.limit);
    const before = parseBefore(req.query.before);

    const messages = await GlobalMessage.find({ createdAt: { $lt: before } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    messages.reverse();

    return res.status(200).json({
      success: true,
      messages: messages.map(formatMessage),
      hasMore:  messages.length === limit,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ── DELETE: All Global Messages ───────────────────────────────────────────
export const deleteAllGlobalMessages = async (req, res) => {
  try {
    const result = await GlobalMessage.deleteMany({});

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} global message(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DIRECT MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

// ── GET: DM History ───────────────────────────────────────────────────────
export const getDMHistory = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const limit  = parseLimit(req.query.limit);
    const before = parseBefore(req.query.before);

    const messages = await DirectMessage.find({
      $or: [
        { senderId: currentUserId, toUserId: otherUserId },
        { senderId: otherUserId,   toUserId: currentUserId },
      ],
      createdAt: { $lt: before },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    messages.reverse();

    return res.status(200).json({
      success: true,
      messages: messages.map(formatMessage),
      hasMore:  messages.length === limit,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ── DELETE: All DMs for Current User ────────────────────────────────────
export const deleteAllMyDMs = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const result = await DirectMessage.deleteMany({
      $or: [{ senderId: currentUserId }, { toUserId: currentUserId }],
    });

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} direct message(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ── DELETE: DM Conversation with Specific User ───────────────────────────
export const deleteDMConversation = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const result = await DirectMessage.deleteMany({
      $or: [
        { senderId: currentUserId, toUserId: otherUserId },
        { senderId: otherUserId,   toUserId: currentUserId },
      ],
    });

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} message(s) with this user`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return handleError(res, error);
  }
};