// src/components/admin/AdminCharts.jsx
import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import { DUMMY_USERS, DUMMY_COURSES, DUMMY_COMPLAINTS } from "../../data/dummyAdminData";

const PALETTE = ["#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#be185d", "#059669", "#1d4ed8"];
const TOOLTIP_STYLE = { borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13 };
const AXIS_TICK = { fontSize: 12, fill: "#64748b" };

const monthKey = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "2-digit" });

// ── Signup trend (line) ──────────────────────────────────────────────────
export function SignupTrendChart() {
  const data = useMemo(() => {
    const counts = {};
    DUMMY_USERS.forEach((u) => {
      const key = monthKey(u.createdAt);
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([month, count]) => ({ month, count }));
  }, []);

  return (
    <div className="admin-chart-card">
      <p className="admin-chart-title">Signups Over Time</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Role distribution (pie) ──────────────────────────────────────────────
export function RoleDistributionChart() {
  const data = useMemo(() => {
    const counts = {};
    DUMMY_USERS.forEach((u) => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  return (
    <div className="admin-chart-card">
      <p className="admin-chart-title">Role Distribution</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
            {data.map((entry, i) => <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Courses by category (horizontal bar) ─────────────────────────────────
export function CategoryDistributionChart() {
  const data = useMemo(() => {
    const counts = {};
    DUMMY_COURSES.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
    return Object.entries(counts).map(([category, count]) => ({ category, count }));
  }, []);

  return (
    <div className="admin-chart-card">
      <p className="admin-chart-title">Courses by Category</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
          <YAxis type="category" dataKey="category" tick={{ ...AXIS_TICK, fontSize: 11.5 }} width={140} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Complaint status (pie) ────────────────────────────────────────────────
export function ComplaintStatusChart() {
  const STATUS_COLORS = { pending: "#d97706", "in progress": "#2563eb", resolved: "#16a34a" };

  const data = useMemo(() => {
    const counts = {};
    DUMMY_COMPLAINTS.forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  return (
    <div className="admin-chart-card">
      <p className="admin-chart-title">Complaint Status</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
            {data.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
