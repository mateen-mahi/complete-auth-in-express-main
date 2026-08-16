import mongoose from "mongoose";

const globalMessageSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, sparse: true },

    text:           { type: String, required: true, trim: true },
    sender:         { type: String, required: true, trim: true }, // username
    senderId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderImageUrl: { type: String, default: null }, 
    deletedFor:         { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
deletedForEveryone:  { type: Boolean, default: false },

    timestamp: { type: Date, required: true },
  },
  { timestamps: true }
);

globalMessageSchema.index({ timestamp: -1 });

globalMessageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

const GlobalMessage =
  mongoose.models.GlobalMessage ||
  mongoose.model("GlobalMessage", globalMessageSchema);

export default GlobalMessage;