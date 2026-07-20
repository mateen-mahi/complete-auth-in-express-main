import { NavLink, Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import "./DashboardLayout.css";

// Icons (using simple SVG inline — swap with your icon lib if needed)
const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  lectures: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  quiz: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  payment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

// Role label shown in sidebar footer
const roleLabel = {
  "end-user": "Student",
  admin: "Admin",
  "super-admin": "Super Admin",
};

const DashboardLayout = ({ role }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post("/api/v1/users/logout", {}, { withCredentials: true });
    } catch (_) {}
    navigate("/login", { replace: true });
  };

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">●</span>
          <span className="sidebar__name">AppName</span>
        </div>

        <nav className="sidebar__nav">
          {/* Section: Main */}
          <p className="sidebar__section-label">Main</p>

          <NavLink to="/dashboard" className="sidebar__link">
            <span className="sidebar__icon">{icons.dashboard}</span>
            Dashboard
          </NavLink>

          <NavLink to="/lectures" className="sidebar__link">
            <span className="sidebar__icon">{icons.lectures}</span>
            Lecture Watching
          </NavLink>

          <NavLink to="/grand-quiz" className="sidebar__link">
            <span className="sidebar__icon">{icons.quiz}</span>
            Grand Quiz
          </NavLink>

          {/* Section: Management — admin + super-admin only */}
          {["admin", "super-admin"].includes(role) && (
            <>
              <p className="sidebar__section-label">Management</p>

              <NavLink to="/user-management" className="sidebar__link">
                <span className="sidebar__icon">{icons.users}</span>
                User Management
              </NavLink>
            </>
          )}

          {/* Super Admin only */}
          {role === "super-admin" && (
            <NavLink to="/payment-gateway" className="sidebar__link">
              <span className="sidebar__icon">{icons.payment}</span>
              Payment Gateway
            </NavLink>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <span className="sidebar__role-badge">{roleLabel[role] || role}</span>
          <button className="sidebar__logout" onClick={handleLogout}>
            <span className="sidebar__icon">{icons.logout}</span>
            Log Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
