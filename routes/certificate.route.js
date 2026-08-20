// ============================================================
// CERTIFICATES API — Base URL: /api/v1/certificates
// ============================================================

import express from "express";

import {
  issueCertificate,
  getCertificateById,
  getCertificatesByStudent,
  verifyCertificate,
  revokeCertificate,
  deleteCertificate,
  getMyCourseCertificates,
  generateMyCertificate,
} from "../Controllers/Certificate/certificate.controller.js";

const certificateRouter = express.Router();


// GET /api/v1/certificates/verify/:certificateNumber
// Public — no auth. Used for third parties to verify a certificate's authenticity.
// URL params: certificateNumber (string, REQUIRED)
certificateRouter.get("/verify/:certificateNumber", verifyCertificate);

// GET /api/v1/certificates/my-courses
// Auth: required (any logged-in student). Derives studentId from req.user.id.
// Returns every course this student has progress on, merged with certificate
// status for each (earned / eligible-not-yet-generated / locked).
certificateRouter.get("/my-courses", getMyCourseCertificates);

// POST /api/v1/certificates/generate/:courseId
// Auth: required (any logged-in student). Derives studentId from req.user.id.
// Self-serve manual fallback — student must be at/above the eligibility
// threshold (checked server-side); safe to call even if a certificate was
// already auto-issued (idempotent, just returns the existing one).
// URL params: courseId (ObjectId, REQUIRED)
certificateRouter.post("/generate/:courseId", generateMyCertificate);

// GET /api/v1/certificates
// Auth: required, role: admin or instructor
// Query params (optional): page, limit, courseId, studentId, status ("active"/"revoked")

// GET /api/v1/certificates/student/:studentId
// Auth: required (student viewing own certs, or admin/instructor viewing any)
// URL params: studentId (ObjectId, REQUIRED)
// Query params (optional): page, limit
certificateRouter.get("/student/:studentId", getCertificatesByStudent);

// GET /api/v1/certificates/:certificateId
// Auth: required
// URL params: certificateId (ObjectId, REQUIRED)
certificateRouter.get("/:certificateId", getCertificateById);

// POST /api/v1/certificates
// Auth: required, role: admin or instructor
// Body (JSON): studentId (REQUIRED), courseId (REQUIRED), instructorId (optional), grade (optional)
// Certificate PDF is generated and uploaded server-side — no file upload from the client.
certificateRouter.post("/",  issueCertificate);

// PATCH /api/v1/certificates/:certificateId/revoke
// Auth: required, role: admin or instructor
// URL params: certificateId (ObjectId, REQUIRED)
certificateRouter.patch("/:certificateId/revoke",  revokeCertificate);

// DELETE /api/v1/certificates/:certificateId
// Auth: required, role: admin only (hard delete — irreversible, use revoke instead when possible)
// URL params: certificateId (ObjectId, REQUIRED)
certificateRouter.delete("/:certificateId",  deleteCertificate);

export default certificateRouter;
