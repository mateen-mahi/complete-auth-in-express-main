import express from "express";
import verifyAuth from "../Middlewares/AuthMiddleware.js";
import { getDashboardStats } from "../Controllers/Admin/adminStats.controller.js";

const adminRoutes = express.Router();

adminRoutes.get("/dashboard-stats", verifyAuth, getDashboardStats);

export default adminRoutes;
