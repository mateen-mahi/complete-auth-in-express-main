import express from "express";
import { getDashboardStats } from "../Controllers/adminStats/adminStats.controller.js";

const adminRoutes = express.Router();

adminRoutes.get("/dashboard-stats", getDashboardStats);

export default adminRoutes;
