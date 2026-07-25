import express from "express";
import { getDashboardStats } from "../Controllers/adminStats/adminStats.controller.js";
import {getSystemStats} from "../Controllers/Systeminfo/Systemstats.controller.js"

const adminRoutes = express.Router();

adminRoutes.get("/dashboard-stats", getDashboardStats);
adminRoutes.get("/admin/system-stats", getSystemStats);

export default adminRoutes;
