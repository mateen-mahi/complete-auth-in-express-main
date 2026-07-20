import mongoose from "mongoose";

const directMessageSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, sparse: true },

    text:           { type: String, required: true, trim: true,},
    sender:         { type: String, required: true, trim: true },
    senderId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderImageUrl: { type: String, default: null }, // NEW
    toUserId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    toUsername:     { type: String, trim: true },

    timestamp: { type: Date, required: true },
  },
  { timestamps: true }
);

directMessageSchema.index({ senderId: 1, toUserId: 1, timestamp: -1 });
directMessageSchema.index({ toUserId: 1, senderId: 1, timestamp: -1 });

directMessageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

const DirectMessage =
  mongoose.models.DirectMessage ||
  mongoose.model("DirectMessage", directMessageSchema);

export default DirectMessage;