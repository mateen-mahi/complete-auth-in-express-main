import express from 'express';
import {
  getCourseProgress,
  markLectureWatched,
  submitQuizAttempt,
  getQuizAttempt,
  getAllUserProgress,
} from '../Controllers/Progress/progress.controller.js';

const progressRouter = express.Router();

// Get all progress
// GET /api/v1/progress?page=1&limit=20
progressRouter.get('/', getAllUserProgress);
// Get progress for a specific course
// GET /api/v1/progress/course/:courseId
progressRouter.get('/course/:courseId', getCourseProgress);
// PUT /api/v1/progress/lecture
// Body: { lectureId, courseId, lastPosition (optional) }
progressRouter.put('/lecture', markLectureWatched);
// POST /api/v1/progress/quiz
// Body: { quizId, courseId, answers: [...] }
progressRouter.post('/quiz', submitQuizAttempt);
// GET /api/v1/progress/quiz/:quizId?courseId=xxx
progressRouter.get('/quiz/:quizId', getQuizAttempt);

export default progressRouter;


