import { useState, useEffect } from "react";
import {
  FiUsers, FiCheckCircle, FiBookOpen, FiPlayCircle, FiHelpCircle,
  FiDollarSign, FiAlertCircle, FiActivity, FiWifi, FiRefreshCw,
} from "react-icons/fi";
import api from "../../services/api";
import { useAdminSocket } from "../../custom-hooks/useAdminSocket";

const EMPTY_STATS = {
  totalUsers: 0, verifiedUsers: 0, totalCourses: 0, totalLectures: 0,
  totalQuizzes: 0, pendingComplaints: 0, revenue: 0, dau: 0, wau: 0, mau: 0,
};

export default function KpiCards() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const { onlineAdmins, subscribe } = useAdminSocket();


  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/admin/dashboard-stats");
        const s = res.data.stats;
        setStats({
          totalUsers: s.totalUsers.value,
          verifiedUsers: s.verifiedUsers.value,
          totalCourses: s.totalCourses.value,
          totalLectures: s.totalLectures.value,
          totalQuizzes: s.totalQuizzes.value,
          pendingComplaints: s.pendingComplaints.value,
          revenue: s.revenue.value,
          dau: s.dau.value,
          wau: s.wau.value,
          mau: s.mau.value,
        });
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Live bumps — one subscription per event that should move a specific number
  useEffect(() => {
    const cleanups = [
      subscribe("user:registered", () => {
        setStats((prev) => ({ ...prev, totalUsers: prev.totalUsers + 1 }));
      }),
      subscribe("course:created", () => {
        setStats((prev) => ({ ...prev, totalCourses: prev.totalCourses + 1 }));
      }),
      subscribe("complaint:new", () => {
        setStats((prev) => ({ ...prev, pendingComplaints: prev.pendingComplaints + 1 }));
      }),
      subscribe("complaint:statusChanged", (complaint) => {
        // Only pending complaints count toward the KPI — a status change
        // either adds or removes one from that count depending on direction.
        setStats((prev) => {
          if (complaint.status === "pending") return prev; // no-op, was already counted
          return { ...prev, pendingComplaints: Math.max(0, prev.pendingComplaints - 1) };
        });
      }),
    ];
    return () => cleanups.forEach((c) => c());
  }, [subscribe]);

  if (loading) {
    return (
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card"><FiRefreshCw className="cp-spin" /> Loading stats…</div>
      </div>
    );
  }

  const cards = [
    { label: "Total Users",        value: stats.totalUsers.toLocaleString(),          icon: FiUsers,       color: "#2563eb" },
    { label: "Verified Users",     value: `${stats.verifiedUsers} / ${stats.totalUsers}`, icon: FiCheckCircle, color: "#16a34a" },
    { label: "Total Courses",      value: stats.totalCourses,                          icon: FiBookOpen,    color: "#7c3aed" },
    { label: "Total Lectures",     value: stats.totalLectures,                         icon: FiPlayCircle,  color: "#0891b2" },
    { label: "Total Quizzes",      value: stats.totalQuizzes,                          icon: FiHelpCircle,  color: "#d97706" },
    { label: "Est. Revenue",       value: `$${stats.revenue.toLocaleString()}`,        icon: FiDollarSign,  color: "#059669" },
    { label: "Pending Complaints", value: stats.pendingComplaints,                     icon: FiAlertCircle, color: "#ef4444" },
    { label: "Admins Online",      value: onlineAdmins, icon: FiWifi, color: "#16a34a", live: true },
    { label: "DAU / WAU / MAU",    value: `${stats.dau} / ${stats.wau} / ${stats.mau}`, icon: FiActivity,    color: "#2563eb" },
  ];

  return (
    <div className="admin-kpi-grid">
      {cards.map((c) => (
        <div key={c.label} className="admin-kpi-card">
          <div className="admin-kpi-icon" style={{ background: c.color + "14", color: c.color }}>
            <c.icon />
          </div>
          <div>
            <p className="admin-kpi-value">
              {c.value}
              {c.live && <span className="admin-live-dot" />}
            </p>
            <p className="admin-kpi-label">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
