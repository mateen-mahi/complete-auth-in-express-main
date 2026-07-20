import express from "express";
import verifyAuth from "../Middlewares/AuthMiddleware.js";
import {
    getAllCourses ,
    getCourseById,
    getFeaturedCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollStudent,
    unenrollStudent,
    getEnrolledStudentCourses
} from "../Controllers/course/course.controller.js";

const courseRouter = express.Router();

courseRouter.get("/", getAllCourses);
courseRouter.get("/featured", getFeaturedCourses);
courseRouter.get("/:courseId", getCourseById);
courseRouter.post("/",verifyAuth, createCourse);
courseRouter.put("/:courseId",verifyAuth, updateCourse);
courseRouter.delete("/:courseId",verifyAuth, deleteCourse);
courseRouter.post("/:courseId/enroll", verifyAuth, enrollStudent);
courseRouter.post("/:courseId/unenroll", verifyAuth, unenrollStudent);
courseRouter.get("/my-courses/:studentId", verifyAuth, getEnrolledStudentCourses);

export default courseRouter;