import mongoose from "mongoose";
import Progress from "../../models/progress.model.js";
import { emitToUser } from "../../service/SocketService.js";
import { notifyProgressUpdated, notifyQuizAttempted, notifyCourseCompleted } from "../../service/adminEvents.js";
import { getCourseTotals, recalcOverallProgress, getOrCreateProgress } from "../../utils/Progresscalculator.js";
import { maybeAutoIssueCertificate } from "../../utils/certificateService.js";

/**
 * Shared by both progress endpoints below: after saving, checks whether
 * this student just became eligible for a certificate on this course and,
 * if so, auto-issues it and tells their socket about it live. Never
 * throws — a certificate hiccup should never surface as a progress-save
 * failure to the student.
 */
async function autoIssueCertificateIfEligible(userId, courseId, overallProgress) {
  const { certificate, created } = await maybeAutoIssueCertificate(userId, courseId, overallProgress);
  if (created && certificate) {
    emitToUser(userId, "certificate:issued", {
      courseId,
      certificateId: certificate._id,
      certificateNumber: certificate.certificateNumber,
      documentUrl: certificate.document?.url,
    });
  }
}

// ── Controllers ─────────────────────────────────────────────────────────

// GET /api/v1/progress/:courseId
export const getMyProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course id" });
    }

    const progress = await Progress.findOne({ userId, courseId })
      .populate("lectures.lectureId", "title duration")
      .populate("quizzes.quizId", "title");

    if (!progress) {
      return res.status(200).json({
        success: true,
        progress: {
          userId,
          courseId,
          lectures: [],
          quizzes: [],
          overallProgress: 0,
          completed: false,
        },
      });
    }

    return res.status(200).json({ success: true, progress });
  } catch (error) {
    console.error("Error in getMyProgress:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching progress" });
  }
};

// Whitelisted sortable fields for getMyAllProgress.
const PROGRESS_LIST_SORTABLE_FIELDS = {
  overallProgress: "overallProgress",
  completed: "completed",
  updatedAt: "updatedAt",
};

const buildProgressListSort = (sortBy, order) => {
  const field = PROGRESS_LIST_SORTABLE_FIELDS[sortBy] || "updatedAt";
  const direction = order === "asc" ? 1 : -1;
  return { [field]: direction };
};

// GET /api/v1/progress
export const getMyAllProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    // Pagination is optional here: if the caller doesn't pass page/limit,
    // every course's progress is returned (unchanged default behavior) —
    // a single student rarely has enough courses to need paging, but an
    // opt-in cap keeps this consistent with every other list endpoint.
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;
    const sort = buildProgressListSort(req.query.sortBy, req.query.order);

    const filter = { userId };
    if (req.query.completed === "true") filter.completed = true;
    if (req.query.completed === "false") filter.completed = false;

    let query = Progress.find(filter)
      .populate("courseId", "title thumbnail")
      .sort(sort);

    if (hasPagination) {
      query = query.skip(skip).limit(limit);
    }

    const [progressList, total] = await Promise.all([
      query,
      Progress.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: progressList.length,
      total,
      ...(hasPagination ? { page, pages: Math.ceil(total / limit) } : {}),
      progress: progressList,
    });
  } catch (error) {
    console.error("Error in getMyAllProgress:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching progress list" });
  }
};

// PATCH /api/v1/progress/:courseId/lecture
export const updateLectureProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;
    const { lectureId, watched, lastPosition } = req.body;

    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lectureId)) {
      return res.status(400).json({ success: false, message: "Invalid course or lecture id" });
    }

    const { course, totalLectures, totalQuizzes } = await getCourseTotals(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const belongsToCourse = course.lectures.some((id) => String(id) === String(lectureId));
    if (!belongsToCourse) {
      return res.status(400).json({ success: false, message: "This lecture does not belong to the given course" });
    }

    const progress = await getOrCreateProgress(Progress, userId, courseId);

    const existingLecture = progress.lectures.find((l) => String(l.lectureId) === String(lectureId));

    if (existingLecture) {
      if (typeof watched === "boolean") existingLecture.watched = watched;
      if (typeof lastPosition === "number") existingLecture.lastPosition = lastPosition;
      if (watched === true && !existingLecture.completedAt) existingLecture.completedAt = new Date();
    } else {
      progress.lectures.push({
        lectureId,
        watched: Boolean(watched),
        lastPosition: typeof lastPosition === "number" ? lastPosition : 0,
        completedAt: watched ? new Date() : undefined,
      });
    }

    const justCompleted = recalcOverallProgress(progress, totalLectures, totalQuizzes);
    await progress.save();

    await autoIssueCertificateIfEligible(userId, courseId, progress.overallProgress);

    emitToUser(userId, "progress:lectureUpdated", {
      courseId,
      lectureId,
      overallProgress: progress.overallProgress,
      completed: progress.completed,
    });

    notifyProgressUpdated({
      userId,
      userEmail: req.user.email,
      courseId,
      courseTitle: course.title,
      overallProgress: progress.overallProgress,
      lectureId,
    });

    if (justCompleted) {
      emitToUser(userId, "course:completed", { courseId, courseTitle: course.title });
      notifyCourseCompleted({ userId, userEmail: req.user.email, courseId, courseTitle: course.title });
    }

    return res.status(200).json({ success: true, progress });
  } catch (error) {
    console.error("Error in updateLectureProgress:", error);
    return res.status(500).json({ success: false, message: "Server error while updating lecture progress" });
  }
};

// POST /api/v1/progress/:courseId/quiz
export const submitQuizAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;
    const { quizId, score, totalQuestions, correctAnswers, answers } = req.body;

    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(quizId)) {
      return res.status(400).json({ success: false, message: "Invalid course or quiz id" });
    }

    if (typeof score !== "number" || score < 0) {
      return res.status(400).json({ success: false, message: "A valid non-negative score is required" });
    }

    const { course, totalLectures, totalQuizzes } = await getCourseTotals(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const progress = await getOrCreateProgress(Progress, userId, courseId);

    const attemptData = {
      quizId,
      score,
      totalQuestions,
      correctAnswers,
      answers: Array.isArray(answers) ? answers : [],
      attemptedAt: new Date(),
    };

    const existingIndex = progress.quizzes.findIndex((q) => String(q.quizId) === String(quizId));
    if (existingIndex !== -1) {
      progress.quizzes[existingIndex] = attemptData;
    } else {
      progress.quizzes.push(attemptData);
    }

    const justCompleted = recalcOverallProgress(progress, totalLectures, totalQuizzes);
    await progress.save();

    await autoIssueCertificateIfEligible(userId, courseId, progress.overallProgress);

    emitToUser(userId, "progress:quizAttempted", {
      courseId,
      quizId,
      score,
      totalQuestions,
      correctAnswers,
      overallProgress: progress.overallProgress,
    });

    notifyQuizAttempted({
      userId,
      userEmail: req.user.email,
      courseId,
      quizId,
      score,
      totalQuestions,
      correctAnswers,
    });

    if (justCompleted) {
      emitToUser(userId, "course:completed", { courseId, courseTitle: course.title });
      notifyCourseCompleted({ userId, userEmail: req.user.email, courseId, courseTitle: course.title });
    }

    return res.status(200).json({ success: true, progress });
  } catch (error) {
    console.error("Error in submitQuizAttempt:", error);
    return res.status(500).json({ success: false, message: "Server error while submitting quiz attempt" });
  }
};
