import Certificate from "../models/certificate.model.js";
import User from "../models/user.model.js";
import Course from "../models/courses.model.js";
import { uploadDocument } from "./pdfSendToCloudinary.js";
import { buildCertificateHtml } from "./certificateTemplate.js";
import { generateCertificatePdf } from "./generateCertificatePdf.js";

// A student becomes eligible to generate/receive a certificate once
// overallProgress crosses this mark. Intentionally not 100 — a student
// who's functionally done with a course shouldn't be blocked by one
// unwatched bonus lecture or similar. Keep this in sync with whatever the
// frontend uses to decide when to show the "Generate Certificate" button.
export const CERTIFICATE_ELIGIBILITY_THRESHOLD = 90;

/**
 * Core issuance logic. Used by THREE callers:
 *   1. maybeAutoIssueCertificate() below — fires automatically once a
 *      student's progress crosses the threshold.
 *   2. generateMyCertificate controller — student clicks "Generate" as a
 *      manual fallback (e.g. their progress doc predates the auto-issue
 *      hook and never re-triggered it).
 *   3. issueCertificate controller — admin/instructor manual issuance.
 * All three go through this single function so a certificate is always
 * built the same way regardless of who/what triggered it.
 *
 * Idempotent: if a certificate already exists for this student+course, it
 * returns that one instead of generating a duplicate (also backstopped by
 * the unique (studentId, courseId) index on the model, in case two
 * triggers race each other).
 */
export async function issueCertificateForStudentCourse({ studentId, courseId, instructorId = null, grade = null }) {
  const existing = await Certificate.findOne({ studentId, courseId });
  if (existing) return { certificate: existing, created: false };

  const [student, course] = await Promise.all([
    User.findById(studentId).select("username email"),
    Course.findById(courseId).select("title instructor"),
  ]);

  if (!student) throw new Error("Student not found");
  if (!course) throw new Error("Course not found");

  const resolvedInstructorId = instructorId || course.instructor || null;
  const instructor = resolvedInstructorId
    ? await User.findById(resolvedInstructorId).select("username")
    : null;

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
  const uploaded = await uploadDocument(pdfBuffer, { folder: "LMS Certificates" });

  try {
    const created = await Certificate.create({
      studentId,
      courseId,
      instructorId: resolvedInstructorId,
      certificateNumber,
      grade,
      issuedAt,
      document: { url: uploaded.url, publicId: uploaded.publicId },
    });
    return { certificate: created, created: true };
  } catch (err) {
    // Unique (studentId, courseId) index — if two triggers raced (e.g. a
    // lecture-watch and a quiz-submit both crossed the threshold within
    // moments of each other), the loser lands here and just returns
    // whatever the winner already created, instead of erroring out.
    if (err.code === 11000) {
      const winner = await Certificate.findOne({ studentId, courseId });
      return { certificate: winner, created: false };
    }
    throw err;
  }
}

/**
 * Called after every progress recalculation (lecture watched or quiz
 * submitted). If the student is at/above the eligibility threshold for
 * this course and doesn't have a certificate yet, auto-generates one.
 *
 * Never throws — a PDF-generation or upload failure here must not break
 * the lecture/quiz progress update that triggered it. Errors are logged
 * and the student can still fall back to the manual "Generate" button.
 */
export async function maybeAutoIssueCertificate(studentId, courseId, overallProgress) {
  if (overallProgress < CERTIFICATE_ELIGIBILITY_THRESHOLD) {
    return { certificate: null, created: false };
  }

  try {
    const result = await issueCertificateForStudentCourse({ studentId, courseId });
    if (result.created) {
      console.log(
        `[certificate] Auto-issued ${result.certificate.certificateNumber} for student=${studentId} course=${courseId}`
      );
    }
    return result;
  } catch (err) {
    console.error(`[certificate] Auto-issue failed for student=${studentId} course=${courseId}:`, err);
    return { certificate: null, created: false };
  }
}