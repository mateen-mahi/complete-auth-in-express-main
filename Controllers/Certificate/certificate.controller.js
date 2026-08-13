import mongoose from "mongoose";
import Certificate from "../../models/certificate.model.js";
import Progress from "../../models/progress.model.js";
import { deleteDocument } from "../../utils/pdfSendToCloudinary.js";
import {
  issueCertificateForStudentCourse,
  CERTIFICATE_ELIGIBILITY_THRESHOLD,
} from "../../utils/certificateService.js";

const MAX_LIMIT = 50;

const handleControllerError = (res, error) => {
  console.error(error);

  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Certificate already issued for this student and course.",
    });
  }

  return res.status(500).json({ success: false, message: "Internal server error." });
};

const getPagination = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── ISSUE CERTIFICATE (admin/instructor manual issuance) ────
export const issueCertificate = async (req, res) => {
  try {
    const { studentId, courseId, instructorId, grade } = req.body;

    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: "Valid studentId is required." });
    }
    if (!courseId || !isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "Valid courseId is required." });
    }
    if (instructorId && !isValidObjectId(instructorId)) {
      return res.status(400).json({ success: false, message: "Invalid instructorId format." });
    }

    const { certificate, created } = await issueCertificateForStudentCourse({
      studentId,
      courseId,
      instructorId,
      grade,
    });

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created
        ? "Certificate generated and issued successfully."
        : "Certificate already existed for this student and course.",
      certificate,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── MY COURSES + CERTIFICATE STATUS (student, self) ─────────
// GET /api/v1/certificates/my-courses
// Merges this student's Progress (with populated course title/thumbnail)
// with any Certificate already issued for each course, so the frontend
// can render "earned / eligible / locked" in a single request.
export const getMyCourseCertificates = async (req, res) => {
  try {
    const studentId = req.user.id;

    const progressList = await Progress.find({ userId: studentId })
      .populate("courseId", "title thumbnail")
      .sort({ updatedAt: -1 })
      .lean();

    const courseIds = progressList.map((p) => p.courseId?._id).filter(Boolean);

    const certificates = await Certificate.find({
      studentId,
      courseId: { $in: courseIds },
    }).lean();

    const certByCourseId = new Map(certificates.map((c) => [String(c.courseId), c]));

    const courses = progressList
      .filter((p) => p.courseId) // guard against a Progress doc whose course was deleted
      .map((p) => {
        const cert = certByCourseId.get(String(p.courseId._id)) || null;
        return {
          courseId: p.courseId._id,
          title: p.courseId.title,
          thumbnail: p.courseId.thumbnail,
          overallProgress: p.overallProgress,
          completed: p.completed,
          eligible: p.overallProgress >= CERTIFICATE_ELIGIBILITY_THRESHOLD,
          certificate: cert
            ? {
                id: cert._id,
                certificateNumber: cert.certificateNumber,
                url: cert.document?.url,
                grade: cert.grade,
                status: cert.status,
                issuedAt: cert.issuedAt,
              }
            : null,
        };
      });

    return res.status(200).json({
      success: true,
      eligibilityThreshold: CERTIFICATE_ELIGIBILITY_THRESHOLD,
      courses,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── GENERATE MY CERTIFICATE (student, self-serve) ────────────
// POST /api/v1/certificates/generate/:courseId
// Manual fallback for a student who's eligible but doesn't have a
// certificate yet — e.g. the automatic issuance hook in the progress
// controller never fired for their doc, or simply hasn't caught up yet.
export const generateMyCertificate = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course id" });
    }

    const progress = await Progress.findOne({ userId: studentId, courseId });
    const overallProgress = progress?.overallProgress || 0;

    if (overallProgress < CERTIFICATE_ELIGIBILITY_THRESHOLD) {
      return res.status(400).json({
        success: false,
        message: `You need at least ${CERTIFICATE_ELIGIBILITY_THRESHOLD}% progress to generate a certificate. You're currently at ${overallProgress}%.`,
      });
    }

    const { certificate, created } = await issueCertificateForStudentCourse({ studentId, courseId });

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? "Certificate generated." : "Certificate already existed.",
      certificate,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── GET ALL CERTIFICATES (admin/instructor) ──────────────────
export const getAllCertificates = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { courseId, studentId, status } = req.query;

    const filter = {};
    if (courseId) {
      if (!isValidObjectId(courseId)) {
        return res.status(400).json({ success: false, message: "Invalid courseId format." });
      }
      filter.courseId = courseId;
    }
    if (studentId) {
      if (!isValidObjectId(studentId)) {
        return res.status(400).json({ success: false, message: "Invalid studentId format." });
      }
      filter.studentId = studentId;
    }
    if (status) filter.status = status;

    const [certificates, total] = await Promise.all([
      Certificate.find(filter)
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("studentId", "username email")
        .populate("courseId", "title")
        .populate("instructorId", "username email")
        .lean(),
      Certificate.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: certificates,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── GET CERTIFICATE BY ID ──────────────────────────────────
export const getCertificateById = async (req, res) => {
  try {
    const { certificateId } = req.params;

    if (!isValidObjectId(certificateId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const certificate = await Certificate.findById(certificateId)
      .populate("studentId", "username email")
      .populate("courseId", "title")
      .populate("instructorId", "username email")
      .lean();

    if (!certificate) {
      return res.status(404).json({ success: false, message: "Certificate not found." });
    }

    return res.status(200).json({ success: true, data: certificate });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── GET CERTIFICATES BY STUDENT (admin/instructor viewing any student) ─
export const getCertificatesByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId format" });
    }

    const { page, limit, skip } = getPagination(req.query);

    const [certificates, total] = await Promise.all([
      Certificate.find({ studentId })
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("courseId", "title")
        .populate("instructorId", "username email")
        .lean(),
      Certificate.countDocuments({ studentId }),
    ]);

    return res.status(200).json({
      success: true,
      data: certificates,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── VERIFY CERTIFICATE (public, no auth) ─────────────────────
export const verifyCertificate = async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    if (!certificateNumber) {
      return res.status(400).json({ success: false, message: "Certificate number is required." });
    }

    const certificate = await Certificate.findOne({ certificateNumber })
      .populate("studentId", "username")
      .populate("courseId", "title")
      .populate("instructorId", "username")
      .lean();

    if (!certificate || certificate.status !== "active") {
      return res.status(404).json({ success: false, message: "Certificate not found or invalid." });
    }

    // Public endpoint — return only what's safe to expose, not the full document.
    return res.status(200).json({
      success: true,
      valid: true,
      data: {
        certificateNumber: certificate.certificateNumber,
        student: certificate.studentId,
        course: certificate.courseId,
        instructor: certificate.instructorId,
        issuedAt: certificate.issuedAt,
        grade: certificate.grade,
      },
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── REVOKE CERTIFICATE (admin/instructor) ────────────────────
export const revokeCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    if (!isValidObjectId(certificateId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const certificate = await Certificate.findByIdAndUpdate(
      certificateId,
      { status: "revoked" },
      { new: true }
    );

    if (!certificate) {
      return res.status(404).json({ success: false, message: "Certificate not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Certificate revoked successfully.",
      data: certificate,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── DELETE CERTIFICATE (admin only — hard delete) ────────────
export const deleteCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    if (!isValidObjectId(certificateId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const certificate = await Certificate.findById(certificateId);

    if (!certificate) {
      return res.status(404).json({ success: false, message: "Certificate not found." });
    }

    if (certificate.document?.publicId) {
      try {
        await deleteDocument(certificate.document.publicId);
      } catch (cloudinaryError) {
        console.error("Error deleting certificate file from Cloudinary:", cloudinaryError);
      }
    }

    await Certificate.findByIdAndDelete(certificateId);

    return res.status(200).json({ success: true, message: "Certificate deleted successfully." });
  } catch (error) {
    return handleControllerError(res, error);
  }
};
