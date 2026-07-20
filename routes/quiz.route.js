import express from "express";
import {
    getAllQuizzes,
    getQuizById,
    getQuizForAttempt,
    getQuizzesByCourseId,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    deleteQuizzesByCourseId
} from "../Controllers/Quizz/quiz.controller.js";

const quizRoute = express.Router();

quizRoute.get("/course/:courseId", getQuizzesByCourseId);
quizRoute.get("/attempt/:quizId",  getQuizForAttempt);
quizRoute.get("/", getAllQuizzes);
quizRoute.get("/:quizId", getQuizById);
quizRoute.post("/",  createQuiz);
quizRoute.put("/:quizId",  updateQuiz);
quizRoute.delete("/:quizId",  deleteQuiz);
quizRoute.delete("/course/:courseId",deleteQuizzesByCourseId);

export default quizRoute;