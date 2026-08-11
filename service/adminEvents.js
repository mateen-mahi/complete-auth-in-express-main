import { getIO } from "../config/socket.js";

function emitAdminEvent(event, payload) {
  try {
    getIO().of("/admin").emit(event, payload);
  } catch (err) {
    // Never let a notification failure break the actual request that
    // triggered it — this is best-effort, not critical path.
    console.error(`[AdminEvents] Failed to emit "${event}":`, err.message);
  }
}

// ── Users ────────────────────────────────────────────────────────────────
export const notifyUserRegistered = (user) =>
  emitAdminEvent("user:registered", {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  });

// ── Courses ──────────────────────────────────────────────────────────────
export const notifyCourseCreated = (course) =>
  emitAdminEvent("course:created", course);

export const notifyCourseUpdated = (course) =>
  emitAdminEvent("course:updated", course);

export const notifyEnrollment = ({ userId, courseId, courseTitle }) =>
  emitAdminEvent("enrollment:new", { userId, courseId, courseTitle, at: new Date().toISOString() });

// ── Complaints ───────────────────────────────────────────────────────────
export const notifyComplaintNew = (complaint) =>
  emitAdminEvent("complaint:new", complaint);

export const notifyComplaintStatusChanged = (complaint) =>
  emitAdminEvent("complaint:statusChanged", complaint);

// ── Auth (wire these into SignupController.js / SigninController.js
// yourself — see the snippets given alongside this file) ──────────────────
export const notifyLoginSuccess = ({ userId, username }) =>
  emitAdminEvent("login:new", { userId, username, at: new Date().toISOString() });

export const notifyLoginFailed = ({ email }) =>
  emitAdminEvent("login:failed", { email, at: new Date().toISOString() });


export const notifySystemStats = (stats) =>
  emitAdminEvent("system:stats", stats);






// ── Progress ─────────────────────────────────────────────────────────────
export const notifyProgressUpdated = ({ userId, userEmail, courseId, courseTitle, overallProgress, lectureId }) =>
  emitAdminEvent("progress:updated", {
    userId,
    userEmail,
    courseId,
    courseTitle,
    overallProgress,
    lectureId,
    at: new Date().toISOString(),
  });

export const notifyQuizAttempted = ({ userId, userEmail, courseId, quizId, score, totalQuestions, correctAnswers }) =>
  emitAdminEvent("progress:quizAttempted", {
    userId,
    userEmail,
    courseId,
    quizId,
    score,
    totalQuestions,
    correctAnswers,
    at: new Date().toISOString(),
  });

export const notifyCourseCompleted = ({ userId, userEmail, courseId, courseTitle }) =>
  emitAdminEvent("progress:courseCompleted", {
    userId,
    userEmail,
    courseId,
    courseTitle,
    at: new Date().toISOString(),
  });