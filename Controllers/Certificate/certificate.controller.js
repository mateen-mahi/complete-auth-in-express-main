import mongoose from "mongoose";
import Certificate from "../../models/certificate.model.js";
import { uploadDocument, deleteDocument } from "../../utils/pdfSendToCloudinary.js";
import User from "../../models/user.model.js"; 
import Course from "../../models/courses.model.js"; 
import { buildCertificateHtml } from "../../utils/certificateTemplate.js";
import { generateCertificatePdf } from "../../utils/generateCertificatePdf.js";




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

// ─── ISSUE CERTIFICATE ──────────────────────────────────────

// ... (keep handleControllerError, getPagination, isValidObjectId as before)

// ─── ISSUE CERTIFICATE (auto-generated, no file upload) ──────
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

    // Fetch real data to embed in the certificate — never trust client-sent names
    const [student, course, instructor] = await Promise.all([
      User.findById(studentId).select("username email"),
      Course.findById(courseId).select("title"),
      instructorId ? User.findById(instructorId).select("username") : null,
    ]);

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const certificateNumber = Certificate.generateCertificateNumber();
    const issuedAt = new Date();

    const html = buildCertificateHtml({
      studentName: student.username,
      courseName: course.title,
      instructorName: instructor?.username,
      certificateNumber,
      issuedAt,
      grade,
    });

    const pdfBuffer = await generateCertificatePdf(html);

    const uploaded = await uploadDocument(pdfBuffer, {
      folder: "LMS Certificates",
    });

    const newCertificate = await Certificate.create({
      studentId,
      courseId,
      instructorId: instructorId || null,
      certificateNumber,
      grade: grade || null,
      issuedAt,
      document: {
        url: uploaded.url,
        publicId: uploaded.publicId,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Certificate generated and issued successfully.",
      certificate: newCertificate,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── GET ALL CERTIFICATES ───────────────────────────────────
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

// ─── GET CERTIFICATES BY STUDENT ─────────────────────────────
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

// ─── VERIFY CERTIFICATE (public) ─────────────────────────────
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

// ─── REVOKE CERTIFICATE ──────────────────────────────────────
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

// ─── DELETE CERTIFICATE ──────────────────────────────────────
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