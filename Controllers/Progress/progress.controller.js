import mongoose from "mongoose";
import Progress from "../../models/progress.model.js";
import Course from "../../models/courses.model.js";
import { emitToUser } from "../../service/SocketService.js";
import { notifyProgressUpdated, notifyQuizAttempted, notifyCourseCompleted } from "../../service/adminEvents.js";

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Recalculates overallProgress + completed flag on a progress doc, based on
 * how many lectures are watched vs. total lectures on the course.
 * Mutates the doc in place. Does NOT save — caller is responsible for that.
 * Returns true if this call is what just pushed the course to 100%.
 */
function recalcOverallProgress(progressDoc, course) {
  const totalLectures = course?.lectures?.length || 0;
  const watchedCount = progressDoc.lectures.filter((l) => l.watched).length;

  const wasCompleted = progressDoc.completed;

  progressDoc.overallProgress =
    totalLectures > 0 ? Math.min(100, Math.round((watchedCount / totalLectures) * 100)) : 0;

  progressDoc.completed = totalLectures > 0 && watchedCount >= totalLectures;

  return !wasCompleted && progressDoc.completed;
}

/**
 * Finds a user's progress doc for a course, creating an empty one if it
 * doesn't exist yet. Keeps the unique (userId, courseId) index happy.
 */
async function getOrCreateProgress(userId, courseId) {
  let progress = await Progress.findOne({ userId, courseId });
  if (!progress) {
    progress = await Progress.create({ userId, courseId, lectures: [], quizzes: [] });
  }
  return progress;
}

// ── Controllers ─────────────────────────────────────────────────────────

// GET /api/progress/:courseId
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
      // Not an error — user just hasn't started this course yet.
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

// GET /api/progress
// All of the logged-in user's progress records, across every course.
export const getMyAllProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const progressList = await Progress.find({ userId })
      .populate("courseId", "title thumbnail")
      .sort({ updatedAt: -1 });

    return res.status(200).json({ success: true, count: progressList.length, progress: progressList });
  } catch (error) {
    console.error("Error in getMyAllProgress:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching progress list" });
  }
};

// PATCH /api/progress/:courseId/lecture
// Body: { lectureId, watched, lastPosition }
export const updateLectureProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;
    const { lectureId, watched, lastPosition } = req.body;

    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lectureId)) {
      return res.status(400).json({ success: false, message: "Invalid course or lecture id" });
    }

    const course = await Course.findById(courseId).select("title lectures");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Reject lectures that don't actually belong to this course.
    const belongsToCourse = course.lectures.some((id) => String(id) === String(lectureId));
    if (!belongsToCourse) {
      return res.status(400).json({ success: false, message: "This lecture does not belong to the given course" });
    }

    const progress = await getOrCreateProgress(userId, courseId);

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

    const justCompleted = recalcOverallProgress(progress, course);
    await progress.save();

    // ── Real-time: push the update to the user's own sockets (multi-device
    // sync) and to the admin dashboard (live "who's watching what").
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

// POST /api/progress/:courseId/quiz
// Body: { quizId, score, totalQuestions, correctAnswers, answers }
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

    const course = await Course.findById(courseId).select("title");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const progress = await getOrCreateProgress(userId, courseId);

    const attemptData = {
      quizId,
      score,
      totalQuestions,
      correctAnswers,
      answers: Array.isArray(answers) ? answers : [],
      attemptedAt: new Date(),
    };

    // Upsert: one entry per quiz — a retake overwrites the previous score.
    const existingIndex = progress.quizzes.findIndex((q) => String(q.quizId) === String(quizId));
    if (existingIndex !== -1) {
      progress.quizzes[existingIndex] = attemptData;
    } else {
      progress.quizzes.push(attemptData);
    }

    await progress.save();

    emitToUser(userId, "progress:quizAttempted", {
      courseId,
      quizId,
      score,
      totalQuestions,
      correctAnswers,
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

    return res.status(200).json({ success: true, progress });
  } catch (error) {
    console.error("Error in submitQuizAttempt:", error);
    return res.status(500).json({ success: false, message: "Server error while submitting quiz attempt" });
  }
};