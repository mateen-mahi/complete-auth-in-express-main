import { useState } from "react";
import {
  FiUsers, FiUserCheck, FiUserX, FiActivity,
  FiBookOpen, FiAward, FiTrendingUp, FiClock,
  FiEdit2, FiTrash2, FiX, FiSave, FiSearch,
  FiCheckCircle, FiAlertCircle, FiBarChart2,
  FiFileText, FiCalendar, FiZap, FiShield,
  FiEye, FiMoreVertical,
} from "react-icons/fi";
import "../styles/dashboard.css";

// ─── Dummy role — flip to "user" to see student view ──────
const CURRENT_ROLE = "super-admin"; // "super-admin" | "admin" | "user"

// ─── Admin dummy data ──────────────────────────────────────
const STATS = [
  { label: "Total Users",      value: "1,284", delta: "+12%",  icon: FiUsers,     color: "#2563eb" },
  { label: "Verified",         value: "1,047", delta: "+8%",   icon: FiUserCheck, color: "#16a34a" },
  { label: "Unverified",       value: "237",   delta: "-3%",   icon: FiUserX,     color: "#f59e0b" },
  { label: "Active Today",     value: "348",   delta: "+21%",  icon: FiActivity,  color: "#8b5cf6" },
  { label: "Total Courses",    value: "24",    delta: "+2",    icon: FiBookOpen,  color: "#0891b2" },
  { label: "Quizzes Taken",    value: "8,410", delta: "+340",  icon: FiAward,     color: "#db2777" },
];

const INITIAL_USERS = [
  { id: 1,  name: "Mateen Mahi",    email: "mateen@academy.com",   role: "super-admin", gender: "Male",   verified: true,  joined: "Mar 15, 2024", status: "active"   },
  { id: 2,  name: "Sara Ahmed",     email: "sara@academy.com",     role: "admin",       gender: "Female", verified: true,  joined: "Apr 02, 2024", status: "active"   },
  { id: 3,  name: "Ali Raza",       email: "ali@academy.com",      role: "user",        gender: "Male",   verified: true,  joined: "Apr 18, 2024", status: "active"   },
  { id: 4,  name: "Hina Baig",      email: "hina@academy.com",     role: "user",        gender: "Female", verified: false, joined: "May 01, 2024", status: "inactive" },
  { id: 5,  name: "Usman Tariq",    email: "usman@academy.com",    role: "user",        gender: "Male",   verified: true,  joined: "May 10, 2024", status: "active"   },
  { id: 6,  name: "Zara Khan",      email: "zara@academy.com",     role: "user",        gender: "Female", verified: false, joined: "May 22, 2024", status: "inactive" },
  { id: 7,  name: "Bilal Hassan",   email: "bilal@academy.com",    role: "user",        gender: "Male",   verified: true,  joined: "Jun 03, 2024", status: "active"   },
  { id: 8,  name: "Fatima Noor",    email: "fatima@academy.com",   role: "user",        gender: "Female", verified: false, joined: "Jun 14, 2024", status: "inactive" },
];

const ACTIVITY = [
  { id: 1, icon: FiUserCheck, color: "#16a34a", text: "Ali Raza verified their email",           time: "2 min ago"  },
  { id: 2, icon: FiAward,     color: "#2563eb", text: "Hina Baig completed React Quiz",          time: "18 min ago" },
  { id: 3, icon: FiUsers,     color: "#8b5cf6", text: "Fatima Noor registered a new account",    time: "45 min ago" },
  { id: 4, icon: FiBookOpen,  color: "#0891b2", text: "Usman Tariq enrolled in Node.js course",  time: "1h ago"     },
  { id: 5, icon: FiTrash2,    color: "#ef4444", text: "Admin removed inactive account",          time: "2h ago"     },
  { id: 6, icon: FiEdit2,     color: "#f59e0b", text: "Sara Ahmed updated course content",       time: "3h ago"     },
];

// ─── Student dummy data ────────────────────────────────────
const STUDENT_COURSES = [
  { id: 1, title: "Complete React Developer",    progress: 68, total: 142, done: 97,  color: "#2563eb", emoji: "⚛️"  },
  { id: 2, title: "Node.js & Express Bootcamp",  progress: 40, total: 98,  done: 39,  color: "#16a34a", emoji: "🟢" },
  { id: 3, title: "JavaScript Algorithms & DSA", progress: 55, total: 180, done: 99,  color: "#d97706", emoji: "🧠" },
  { id: 4, title: "CSS Mastery",                 progress: 90, total: 62,  done: 56,  color: "#7c3aed", emoji: "🎨" },
];

const UPCOMING = [
  { id: 1, title: "React Final Quiz",          date: "Jul 05, 2026", course: "React",    icon: FiAward    },
  { id: 2, title: "Node.js Mid-term",          date: "Jul 12, 2026", course: "Node.js",  icon: FiAward    },
  { id: 3, title: "Live Session: DSA Trees",   date: "Jul 08, 2026", course: "DSA",      icon: FiCalendar },
];

const STUDENT_STATS = [
  { label: "Courses Enrolled", value: "8",    icon: FiBookOpen,   color: "#2563eb" },
  { label: "Completed",        value: "2",    icon: FiCheckCircle,color: "#16a34a" },
  { label: "Quizzes Passed",   value: "14",   icon: FiAward,      color: "#8b5cf6" },
  { label: "Study Streak",     value: "7d",   icon: FiZap,        color: "#f59e0b" },
];

const ROLES  = ["user", "admin", "super-admin"];

// ─── Helpers ───────────────────────────────────────────────
const isAdmin = (role) => role === "admin" || role === "super-admin";
const isSuperAdmin = (role) => role === "super-admin";

const getInitial = (name) => name?.charAt(0)?.toUpperCase() || "U";

const ROLE_STYLE = {
  "super-admin": { bg: "#fdf4ff", color: "#9333ea", border: "#e9d5ff" },
  admin:         { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  user:          { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
};

const AVATAR_COLORS = [
  "#2563eb","#16a34a","#d97706","#8b5cf6","#0891b2","#db2777","#059669","#dc2626"
];

// ══════════════════════════════════════════════════════════
export default function Dashboard() {
  const role = CURRENT_ROLE;

  return isAdmin(role)
    ? <AdminDashboard role={role} />
    : <StudentDashboard />;
}

// ══════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════
function AdminDashboard({ role }) {
  const [users,       setUsers]       = useState(INITIAL_USERS);
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("all");
  const [editUser,    setEditUser]    = useState(null);  // user being edited
  const [deleteId,    setDeleteId]    = useState(null);  // confirm delete
  const [editForm,    setEditForm]    = useState({});

  // ── Filtered users ────────────────────────────────────
  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all"        ? true :
      filter === "verified"   ? u.verified :
      filter === "unverified" ? !u.verified :
      filter === "admin"      ? isAdmin(u.role) : true;
    return matchSearch && matchFilter;
  });

  // ── Edit ─────────────────────────────────────────────
  const openEdit = (u) => { setEditUser(u); setEditForm({ ...u }); };
  const closeEdit = () => { setEditUser(null); setEditForm({}); };

  const saveEdit = () => {
    setUsers((prev) => prev.map((u) => u.id === editForm.id ? { ...editForm } : u));
    closeEdit();
  };

  // ── Delete ────────────────────────────────────────────
  const confirmDelete = (id) => setDeleteId(id);
  const cancelDelete  = ()  => setDeleteId(null);
  const doDelete      = ()  => {
    setUsers((prev) => prev.filter((u) => u.id !== deleteId));
    setDeleteId(null);
  };

  // ── Toggle verified ───────────────────────────────────
  const toggleVerified = (id) =>
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, verified: !u.verified } : u));

  return (
    <div className="db-page">

      {/* ── Welcome ── */}
      <div className="db-welcome">
        <div>
          <h1 className="db-welcome-title">Good morning, Admin 👋</h1>
          <p className="db-welcome-sub">Here's what's happening on Academy today.</p>
        </div>
        <div className="db-welcome-badge">
          <FiShield />
          <span>{role === "super-admin" ? "Super Admin" : "Admin"}</span>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="db-stats-grid">
        {STATS.map((s) => (
          <div key={s.label} className="db-stat-card">
            <div className="db-stat-icon" style={{ background: s.color + "18", color: s.color }}>
              <s.icon />
            </div>
            <div className="db-stat-body">
              <p className="db-stat-value">{s.value}</p>
              <p className="db-stat-label">{s.label}</p>
            </div>
            <span className={`db-stat-delta ${s.delta.startsWith("+") ? "up" : "down"}`}>
              {s.delta}
            </span>
          </div>
        ))}
      </div>

      {/* ── Main content: User table + Activity ── */}
      <div className="db-main-grid">

        {/* User Management Table */}
        <div className="db-section db-table-section">
          <div className="db-section-header">
            <div>
              <h2 className="db-section-title"><FiUsers /> User Management</h2>
              <p className="db-section-sub">{users.length} total users</p>
            </div>
            <button className="db-add-btn">
              <FiUsers /> Add User
            </button>
          </div>

          {/* Search + Filter */}
          <div className="db-table-controls">
            <div className="db-search-wrap">
              <FiSearch className="db-search-icon" />
              <input
                className="db-search"
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="db-filter-pills">
              {["all","verified","unverified","admin"].map((f) => (
                <button
                  key={f}
                  className={`db-filter-pill ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="db-table-empty">No users found.</td></tr>
                )}
                {filtered.map((u, i) => {
                  const avatarColor = AVATAR_COLORS[u.id % AVATAR_COLORS.length];
                  const rs = ROLE_STYLE[u.role];
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="db-user-cell">
                          <div className="db-user-avatar" style={{ background: avatarColor }}>
                            {getInitial(u.name)}
                          </div>
                          <div>
                            <p className="db-user-name">{u.name}</p>
                            <p className="db-user-email">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="db-role-badge" style={{ background: rs.bg, color: rs.color, border: `1px solid ${rs.border}` }}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`db-status-badge ${u.verified ? "verified" : "unverified"}`}
                          onClick={() => toggleVerified(u.id)}
                          title="Click to toggle"
                        >
                          {u.verified ? <><FiCheckCircle /> Verified</> : <><FiAlertCircle /> Unverified</>}
                        </button>
                      </td>
                      <td className="db-joined">{u.joined}</td>
                      <td>
                        <div className="db-actions">
                          <button className="db-action-btn edit"   onClick={() => openEdit(u)}      title="Edit"><FiEdit2 /></button>
                          <button className="db-action-btn view"   title="View"><FiEye /></button>
                          {isSuperAdmin(role) && (
                            <button className="db-action-btn delete" onClick={() => confirmDelete(u.id)} title="Delete"><FiTrash2 /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="db-right-col">

          {/* Recent Activity */}
          <div className="db-section">
            <div className="db-section-header">
              <h2 className="db-section-title"><FiActivity /> Recent Activity</h2>
            </div>
            <div className="db-activity-list">
              {ACTIVITY.map((a) => (
                <div key={a.id} className="db-activity-item">
                  <div className="db-activity-icon" style={{ background: a.color + "18", color: a.color }}>
                    <a.icon />
                  </div>
                  <div className="db-activity-body">
                    <p className="db-activity-text">{a.text}</p>
                    <p className="db-activity-time">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="db-section">
            <div className="db-section-header">
              <h2 className="db-section-title"><FiZap /> Quick Actions</h2>
            </div>
            <div className="db-quick-actions">
              {[
                { icon: FiUsers,    label: "Add New User",    color: "#2563eb" },
                { icon: FiBookOpen, label: "Create Course",   color: "#16a34a" },
                { icon: FiAward,    label: "Create Quiz",     color: "#8b5cf6" },
                { icon: FiBarChart2,label: "View Reports",    color: "#0891b2" },
                { icon: FiFileText, label: "Manage Notes",    color: "#d97706" },
                { icon: FiShield,   label: "Roles & Perms",   color: "#db2777" },
              ].map(({ icon: Icon, label, color }) => (
                <button key={label} className="db-quick-btn" style={{ "--qc": color }}>
                  <div className="db-quick-icon" style={{ background: color + "18", color }}>
                    <Icon />
                  </div>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ══ EDIT MODAL ══ */}
      {editUser && (
        <div className="db-modal-overlay" onClick={closeEdit}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-header">
              <h3 className="db-modal-title">Edit User</h3>
              <button className="db-modal-close" onClick={closeEdit}><FiX /></button>
            </div>

            <div className="db-modal-avatar-row">
              <div className="db-modal-avatar" style={{ background: AVATAR_COLORS[editUser.id % AVATAR_COLORS.length] }}>
                {getInitial(editUser.name)}
              </div>
              <div>
                <p className="db-modal-avatar-name">{editUser.name}</p>
                <p className="db-modal-avatar-email">{editUser.email}</p>
              </div>
            </div>

            <div className="db-modal-body">
              <div className="db-modal-row">
                <div className="db-modal-field">
                  <label>Username</label>
                  <input value={editForm.name || ""} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="db-modal-field">
                  <label>Email</label>
                  <input value={editForm.email || ""} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="db-modal-row">
                <div className="db-modal-field">
                  <label>Role</label>
                  <select value={editForm.role || "user"} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="db-modal-field">
                  <label>Gender</label>
                  <select value={editForm.gender || ""} onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))}>
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="db-modal-row">
                <div className="db-modal-field">
                  <label>Status</label>
                  <select value={editForm.status || "active"} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="db-modal-field db-modal-toggle-field">
                  <label>Email Verified</label>
                  <button
                    className={`db-modal-toggle ${editForm.verified ? "on" : ""}`}
                    onClick={() => setEditForm((p) => ({ ...p, verified: !p.verified }))}
                  >
                    <span className="db-modal-toggle-knob" />
                  </button>
                </div>
              </div>
            </div>

            <div className="db-modal-footer">
              <button className="db-modal-cancel" onClick={closeEdit}>Cancel</button>
              <button className="db-modal-save"   onClick={saveEdit}><FiSave /> Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM ══ */}
      {deleteId && (
        <div className="db-modal-overlay" onClick={cancelDelete}>
          <div className="db-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="db-confirm-icon"><FiTrash2 /></div>
            <h3>Delete user?</h3>
            <p>This action cannot be undone. The user and all their data will be permanently removed.</p>
            <div className="db-confirm-actions">
              <button className="db-modal-cancel" onClick={cancelDelete}>Cancel</button>
              <button className="db-confirm-delete" onClick={doDelete}><FiTrash2 /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// STUDENT DASHBOARD
// ══════════════════════════════════════════════════════════
function StudentDashboard() {
  return (
    <div className="db-page">

      {/* ── Welcome ── */}
      <div className="db-welcome">
        <div>
          <h1 className="db-welcome-title">Welcome back, Mateen 👋</h1>
          <p className="db-welcome-sub">You're on a 7-day streak — keep it up!</p>
        </div>
        <div className="db-streak-badge">
          <FiZap /> 7 Day Streak 🔥
        </div>
      </div>

      {/* ── Student Stats ── */}
      <div className="db-stats-grid">
        {STUDENT_STATS.map((s) => (
          <div key={s.label} className="db-stat-card">
            <div className="db-stat-icon" style={{ background: s.color + "18", color: s.color }}>
              <s.icon />
            </div>
            <div className="db-stat-body">
              <p className="db-stat-value">{s.value}</p>
              <p className="db-stat-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="db-student-grid">

        {/* Course Progress */}
        <div className="db-section">
          <div className="db-section-header">
            <h2 className="db-section-title"><FiBookOpen /> Course Progress</h2>
            <a className="db-see-all" href="/courses">See all</a>
          </div>
          <div className="db-course-list">
            {STUDENT_COURSES.map((c) => (
              <div key={c.id} className="db-course-row">
                <div className="db-course-emoji" style={{ background: c.color + "18" }}>{c.emoji}</div>
                <div className="db-course-info">
                  <p className="db-course-name">{c.title}</p>
                  <div className="db-course-prog-row">
                    <div className="db-course-track">
                      <div className="db-course-fill" style={{ width: `${c.progress}%`, background: c.color }} />
                    </div>
                    <span className="db-course-pct" style={{ color: c.color }}>{c.progress}%</span>
                  </div>
                  <p className="db-course-lessons">{c.done} / {c.total} lessons</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right col */}
        <div className="db-right-col">

          {/* Upcoming */}
          <div className="db-section">
            <div className="db-section-header">
              <h2 className="db-section-title"><FiCalendar /> Upcoming</h2>
            </div>
            <div className="db-upcoming-list">
              {UPCOMING.map((u) => (
                <div key={u.id} className="db-upcoming-item">
                  <div className="db-upcoming-icon"><u.icon /></div>
                  <div className="db-upcoming-body">
                    <p className="db-upcoming-title">{u.title}</p>
                    <p className="db-upcoming-meta">{u.course} · {u.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="db-section">
            <div className="db-section-header">
              <h2 className="db-section-title"><FiZap /> Quick Access</h2>
            </div>
            <div className="db-quick-actions">
              {[
                { icon: FiBookOpen,  label: "My Courses",  color: "#2563eb" },
                { icon: FiAward,     label: "Grand Quiz",  color: "#8b5cf6" },
                { icon: FiFileText,  label: "My Notes",    color: "#d97706" },
                { icon: FiBarChart2, label: "Progress",    color: "#16a34a" },
              ].map(({ icon: Icon, label, color }) => (
                <button key={label} className="db-quick-btn" style={{ "--qc": color }}>
                  <div className="db-quick-icon" style={{ background: color + "18", color }}>
                    <Icon />
                  </div>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}