import mongoose from "mongoose";
import crypto from "crypto";

const certificateSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    // Reference only — instructor's name/details are populated via ref,
    // never duplicated as plain text on this document.
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
    },
    document: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    grade: {
      type: String, // e.g. "A", "Distinction" — optional, adjust/remove if unused
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One certificate per student per course — prevents duplicate issuance.
certificateSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

certificateSchema.statics.generateCertificateNumber = function () {
  return `CERT-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

const Certificate =
  mongoose.models.Certificate || mongoose.model("Certificate", certificateSchema);

export default Certificate;