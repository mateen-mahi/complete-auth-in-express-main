import mongoose from 'mongoose';
import Progress from '../../models/progress.model.js';
import Course from '../../models/courses.model.js';
import Lecture from '../../models/lectures.model.js';
import Quiz from '../../models/quiz.model.js';

// ─────────────────────────────────────────────────────────────
// Centralised error handler
// ─────────────────────────────────────────────────────────────
const handleControllerError = (res, error) => {
  console.error(error);

  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: error.message });
  }

  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

// ─────────────────────────────────────────────────────────────
// Helper: Recalculate overallProgress & completed flags
// Returns the updated progress document
// ─────────────────────────────────────────────────────────────
const recalculateProgress = async (userId, courseId) => {
  const progress = await Progress.findOne({ userId, courseId });
  if (!progress) return null;

  const course = await Course.findById(courseId).select('lectures').lean();
  if (!course) return progress; // course deleted? keep old progress

  const totalLectures = course.lectures?.length || 1;
  const watchedCount = progress.lectures.filter(l => l.watched).length;

  // You could also factor in quiz scores – here we use only lectures
  const newProgress = Math.min(Math.round((watchedCount / totalLectures) * 100), 100);

  progress.overallProgress = newProgress;
  progress.completed = newProgress === 100;

  await progress.save();
  return progress; // return updated doc
};

// ─────────────────────────────────────────────────────────────
// 1. GET progress for a specific course (dashboard view)
// ─────────────────────────────────────────────────────────────
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const progress = await Progress.findOne({ userId, courseId })
      .populate('lectures.lectureId', 'title duration')
      .populate('quizzes.quizId', 'title subject')
      .lean(); // plain JS object for performance

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No progress found for this course',
      });
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 2. Mark a lecture as watched (or update watching position)
// ─────────────────────────────────────────────────────────────
export const markLectureWatched = async (req, res) => {
  try {
    const { lectureId, courseId, lastPosition } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!lectureId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'lectureId and courseId are required',
      });
    }

    // Ensure lastPosition is a number (if provided)
    const position = lastPosition !== undefined ? Number(lastPosition) : 0;
    if (isNaN(position)) {
      return res.status(400).json({
        success: false,
        message: 'lastPosition must be a valid number',
      });
    }

    // Check if lecture exists
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found',
      });
    }

    // Find or create progress document
    let progress = await Progress.findOne({ userId, courseId });
    if (!progress) {
      progress = new Progress({ userId, courseId, lectures: [], quizzes: [] });
    }

    // Update or insert lecture entry
    const lectureEntry = progress.lectures.find(
      l => l.lectureId.toString() === lectureId
    );

    if (lectureEntry) {
      // Update existing
      lectureEntry.watched = true;
      lectureEntry.lastPosition = position;
      lectureEntry.completedAt = new Date();
    } else {
      // Add new
      progress.lectures.push({
        lectureId,
        watched: true,
        lastPosition: position,
        completedAt: new Date(),
      });
    }

    // Save and recalculate overall progress
    await progress.save();
    const updatedProgress = await recalculateProgress(userId, courseId);

    res.status(200).json({ success: true, data: updatedProgress });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 3. Submit a quiz attempt and store the result
// ─────────────────────────────────────────────────────────────
export const submitQuizAttempt = async (req, res) => {
  try {
    const { quizId, courseId, answers } = req.body;
    const userId = req.user._id;

    if (!quizId || !courseId || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'quizId, courseId, and answers array are required',
      });
    }

    // Fetch quiz to calculate score
    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    const totalQuestions = quiz.questions.length;
    if (answers.length !== totalQuestions) {
      return res.status(400).json({
        success: false,
        message: `Expected ${totalQuestions} answers, got ${answers.length}`,
      });
    }

    let correctAnswers = 0;
    quiz.questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) correctAnswers++;
    });

    const score = Math.round((correctAnswers / totalQuestions) * 100);

    // Find or create progress
    let progress = await Progress.findOne({ userId, courseId });
    if (!progress) {
      progress = new Progress({ userId, courseId, lectures: [], quizzes: [] });
    }

    // Update or insert quiz attempt
    const existingAttempt = progress.quizzes.find(
      q => q.quizId.toString() === quizId
    );

    if (existingAttempt) {
      // Overwrite with latest attempt (you could keep best score instead)
      existingAttempt.score = score;
      existingAttempt.totalQuestions = totalQuestions;
      existingAttempt.correctAnswers = correctAnswers;
      existingAttempt.answers = answers;
      existingAttempt.attemptedAt = new Date();
    } else {
      progress.quizzes.push({
        quizId,
        score,
        totalQuestions,
        correctAnswers,
        answers,
        attemptedAt: new Date(),
      });
    }

    await progress.save();
    const updatedProgress = await recalculateProgress(userId, courseId);

    // Return the attempt result together with updated progress
    res.status(200).json({
      success: true,
      data: {
        score,
        correctAnswers,
        totalQuestions,
        attemptedAt: new Date(),
        overallProgress: updatedProgress?.overallProgress,
        completed: updatedProgress?.completed,
      },
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 4. Get a specific quiz attempt for review
// ─────────────────────────────────────────────────────────────
export const getQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { courseId } = req.query;
    const userId = req.user._id;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'courseId query parameter is required',
      });
    }

    const progress = await Progress.findOne({ userId, courseId }).lean();
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No progress found for this course',
      });
    }

    const attempt = progress.quizzes.find(q => q.quizId.toString() === quizId);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'No attempt found for this quiz',
      });
    }

    // Populate quiz title/subject (separate query)
    const quiz = await Quiz.findById(quizId).select('title subject').lean();
    const result = {
      ...attempt,
      quizTitle: quiz?.title,
      quizSubject: quiz?.subject,
    };

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 5. Get all progress for a user (paginated)
// ─────────────────────────────────────────────────────────────
export const getAllUserProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const [progress, total] = await Promise.all([
      Progress.find({ userId })
        .populate('courseId', 'title thumbnail')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Progress.countDocuments({ userId }),
    ]);

    res.status(200).json({
      success: true,
      data: progress,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};