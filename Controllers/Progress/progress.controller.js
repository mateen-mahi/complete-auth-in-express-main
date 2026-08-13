import mongoose from "mongoose";
import Progress from "../../models/progress.model.js";
import { emitToUser } from "../../service/SocketService.js";
import { notifyProgressUpdated, notifyQuizAttempted, notifyCourseCompleted } from "../../service/adminEvents.js";
import { getCourseTotals, recalcOverallProgress, getOrCreateProgress } from "../../utils/Progresscalculator.js";

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

// GET /api/v1/progress
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