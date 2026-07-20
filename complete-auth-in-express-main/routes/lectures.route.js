import express from "express";
import {
    getAllLectures,
    getLectureById,
    getLecturesByCourseId,
    createLecture,
    updateLecture,
    deleteLecture,
    deleteLecturesByCourseId
} from "../Controllers/Lectures/lectures.controller.js";

const lecturesRouter = express.Router();

lecturesRouter.get("/", getAllLectures);
lecturesRouter.get("/:lectureId", getLectureById);
lecturesRouter.get("/course/:courseId", getLecturesByCourseId);
lecturesRouter.post("/", createLecture);
lecturesRouter.put("/:lectureId", updateLecture);
lecturesRouter.delete("/:lectureId", deleteLecture);
lecturesRouter.delete("/course/:courseId", deleteLecturesByCourseId);

export default lecturesRouter;

