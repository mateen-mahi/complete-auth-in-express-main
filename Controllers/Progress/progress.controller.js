import mongoose from "mongoose";
import Progress from "../../models/progress.model.js";
import Course from "../../models/courses.model.js";
import Quiz from "../../models/quiz.model.js";
import { emitToUser } from "../../service/SocketService.js";
import { notifyProgressUpdated, notifyQuizAttempted, notifyCourseCompleted } from "../../service/adminEvents.js";

// A quiz counts as "passed" toward course progress once scored at/above this.
// Keep in sync with PASS_THRESHOLD in QuizPage.jsx.
const QUIZ_PASS_THRESHOLD = 70;

// Fixed weighting: lecture-watching drives most of the bar, quizzes make up
// the rest — regardless of how many lectures vs. quizzes a course has.
const LECTURE_WEIGHT = 0.6;
const QUIZ_WEIGHT = 0.4;

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Looks up everything needed to compute progress totals for a course:
 * the course doc (for title + lecture count) and how many quizzes exist
 * for it. Single place both handlers pull from, so lecture-watching and
 * quiz-submitting can never drift into different formulas.
 */
async function getCourseTotals(courseId) {
  const [course, totalQuizzes] = await Promise.all([
    Course.findById(courseId).select("title lectures"),
    Quiz.countDocuments({ courseId }),
  ]);
  return { course, totalLectures: course?.lectures?.length || 0, totalQuizzes };
}

/**
 * Recalculates overallProgress + completed using a fixed weighted split:
 *   60% of the bar comes from lecture-watch ratio (watchedLectures/totalLectures)
 *   40% of the bar comes from quiz-pass ratio (passedQuizzes/totalQuizzes)
 * If a course has no lectures, or no quizzes, all weight shifts to whichever
 * dimension actually exists so the bar can still reach 100%.
 * Mutates the doc in place. Does NOT save — caller saves.
 * Returns true if this call is what just pushed the course to 100%.
 */
function recalcOverallProgress(progressDoc, totalLectures, totalQuizzes) {
  const watchedLectures = progressDoc.lectures.filter((l) => l.watched).length;
  const passedQuizzes = progressDoc.quizzes.filter((q) => q.score >= QUIZ_PASS_THRESHOLD).length;

  const lectureRatio = totalLectures > 0 ? watchedLectures / totalLectures : null;
  const quizRatio = totalQuizzes > 0 ? passedQuizzes / totalQuizzes : null;

  let percent;
  if (lectureRatio !== null && quizRatio !== null) {
    percent = lectureRatio * LECTURE_WEIGHT * 100 + quizRatio * QUIZ_WEIGHT * 100;
  } else if (lectureRatio !== null) {
    percent = lectureRatio * 100; // course has no quizzes — lectures are 100% of the bar
  } else if (quizRatio !== null) {
    percent = quizRatio * 100; // course has no lectures — quizzes are 100% of the bar
  } else {
    percent = 0; // course has neither yet
  }

  const wasCompleted = progressDoc.completed;

  progressDoc.overallProgress = Math.min(100, Math.round(percent));

  // "Completed" requires every dimension that actually exists on this
  // course to be fully done — not just the weighted percentage hitting 100
  // (which it can't anyway unless both are done, but this is explicit).
  const lectureDone = lectureRatio === null || lectureRatio >= 1;
  const quizDone = quizRatio === null || quizRatio >= 1;
  progressDoc.completed = (lectureRatio !== null || quizRatio !== null) && lectureDone && quizDone;

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

    const justCompleted = recalcOverallProgress(progress, totalLectures, totalQuizzes);
    await progress.save();

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

    const progress = await getOrCreateProgress(userId, courseId);

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