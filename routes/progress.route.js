import express from "express";

import {
  getMyProgress,
  getMyAllProgress,
  updateLectureProgress,
  submitQuizAttempt,
} from "../Controllers/Progress/progress.controller.js";

const progressRoutes = express.Router();


progressRoutes.get("/", getMyAllProgress);
progressRoutes.get("/:courseId", getMyProgress);
progressRoutes.patch("/:courseId/lecture", updateLectureProgress);
progressRoutes.post("/:courseId/quiz", submitQuizAttempt);

export default progressRoutes;


