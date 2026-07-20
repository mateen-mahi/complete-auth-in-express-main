import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true, 
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      default: "",
      trim: true, 
    },
    status: {
      type: String,
      enum: ["pending", "in progress", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Complaint = mongoose.models.Complaint || mongoose.model("Complaint", complaintSchema);

export default Complaint;
