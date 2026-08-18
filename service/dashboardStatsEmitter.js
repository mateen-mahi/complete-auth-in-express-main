// service/dashboardStatsEmitter.js
import { getDashboardStatsData } from "./dashboardStats.service.js";
import { notifyDashboardStats } from "./adminEvents.js";

let interval = null;

async function collectAndEmit() {
  try {
    const stats = await getDashboardStatsData();
    notifyDashboardStats(stats);
  } catch (err) {
    console.error("[DashboardStats] Failed to collect/emit:", err.message);
  }
}

// Revenue, DAU/WAU/MAU, completion rate, and resolution-time averages can't
// be cheaply kept in sync with simple client-side counter bumps the way
// totalUsers/totalCourses are in KpiCards.jsx — they need a real recompute.
// This runs that recompute on an interval and only while at least one admin
// is watching (started/stopped from the same admin-presence hook that
// drives systemStatsEmitter, in config/socket.js).
export const startDashboardStatsEmitter = (intervalMs = 30000) => {
  if (interval) return;
  interval = setInterval(collectAndEmit, intervalMs);
  collectAndEmit(); // emit immediately on first admin connect, don't wait a full interval
};

export const stopDashboardStatsEmitter = () => {
  clearInterval(interval);
  interval = null;
};
