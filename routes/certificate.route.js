// ============================================================
// CERTIFICATES API — Base URL: /api/v1/certificates
// ============================================================

import express from "express";

import {
  issueCertificate,
  getAllCertificates,
  getCertificateById,
  getCertificatesByStudent,
  verifyCertificate,
  revokeCertificate,
  deleteCertificate,
} from "../Controllers/Certificate/certificate.controller.js";

const certificateRouter = express.Router();

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions" });
  }
  next();
};

// GET /api/v1/certificates/verify/:certificateNumber
// Public — no auth. Used for third parties to verify a certificate's authenticity.
// URL params: certificateNumber (string, REQUIRED)
certificateRouter.get("/verify/:certificateNumber", verifyCertificate);

// GET /api/v1/certificates
// Auth: required, role: admin or instructor
// Query params (optional): page, limit, courseId, studentId, status ("active"/"revoked")
certificateRouter.get("/",   getAllCertificates);

// GET /api/v1/certificates/student/:studentId
// Auth: required (student viewing own certs, or admin/instructor viewing any)
// URL params: studentId (ObjectId, REQUIRED)
// Query params (optional): page, limit
certificateRouter.get("/student/:studentId",  getCertificatesByStudent);

// GET /api/v1/certificates/:certificateId
// Auth: required
// URL params: certificateId (ObjectId, REQUIRED)
certificateRouter.get("/:certificateId",  getCertificateById);

// POST /api/v1/certificates
// Auth: required, role: admin or instructor
// Content-Type: multipart/form-data
// Body: studentId (REQUIRED), courseId (REQUIRED), instructorId (optional), grade (optional)
// File: field name must match your multer config (e.g. "certificate")
certificateRouter.post("/",  issueCertificate);

// PATCH /api/v1/certificates/:certificateId/revoke
// Auth: required, role: admin or instructor
// URL params: certificateId (ObjectId, REQUIRED)
certificateRouter.patch("/:certificateId/revoke",   revokeCertificate);

// DELETE /api/v1/certificates/:certificateId
// Auth: required, role: admin only (hard delete — irreversible, use revoke instead when possible)
// URL params: certificateId (ObjectId, REQUIRED)
certificateRouter.delete("/:certificateId", deleteCertificate);

export default certificateRouter;