import express from "express";
import { getDashboardStats } from "../Controllers/adminStats/adminStats.controller.js";
import {getSystemStats} from "../Controllers/Systeminfo/Systemstats.controller.js"
import {
  getCourseProgress,
  getStudentProgressInCourse,
  getCourseAnalytics,
  getOverallAnalytics,
} from "../Controllers/Progress/adminProgress.controller.js";
import { getAllUsers, updateUserPasswordForAdmin } from "../Controllers/Auth/AllUsers.controller.js";
import { getAllComplaints } from "../Controllers/Complaint/complaint.controller.js";
import { getAllCertificates } from "../Controllers/Certificate/certificate.controller.js";

const adminRoutes = express.Router();

adminRoutes.get("/dashboard-stats", getDashboardStats);
adminRoutes.get("/system-stats", getSystemStats);
adminRoutes.get("/analytics", getOverallAnalytics);
adminRoutes.get("/course/:courseId/analytics", getCourseAnalytics);
adminRoutes.get("/course/:courseId/student/:userId", getStudentProgressInCourse);
adminRoutes.get("/course/:courseId", getCourseProgress);
adminRoutes.get("/users", getAllUsers);
adminRoutes.put("/users/update-password/:id",updateUserPasswordForAdmin);
adminRoutes.get("/complaints", getAllComplaints);
adminRoutes.get("/certificates",  getAllCertificates);

export default adminRoutes;


