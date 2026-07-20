import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Admin.css";

/* ── Mock Data ────────────────────────────────────────────── */
const MOCK_USERS = [
  { id: 1,  name: "Alice Hartman",   email: "alice@example.com",   role: "User",  status: "Active",   joined: "2025-01-14", gender: "Female" },
  { id: 2,  name: "Bob Fenwick",     email: "bob@example.com",     role: "User",  status: "Active",   joined: "2025-02-03", gender: "Male"   },
  { id: 3,  name: "Clara Sun",       email: "clara@example.com",   role: "Admin", status: "Active",   joined: "2024-11-20", gender: "Female" },
  { id: 4,  name: "David Osei",      email: "david@example.com",   role: "User",  status: "Inactive", joined: "2025-03-08", gender: "Male"   },
  { id: 5,  name: "Eva Moreno",      email: "eva@example.com",     role: "User",  status: "Active",   joined: "2025-04-15", gender: "Female" },
  { id: 6,  name: "Finn Larsson",    email: "finn@example.com",    role: "User",  status: "Pending",  joined: "2025-05-01", gender: "Male"   },
  { id: 7,  name: "Grace Kim",       email: "grace@example.com",   role: "User",  status: "Active",   joined: "2025-05-12", gender: "Female" },
  { id: 8,  name: "Hiro Tanaka",     email: "hiro@example.com",    role: "User",  status: "Inactive", joined: "2025-01-29", gender: "Male"   },
];

const STATS = [
  { label: "Total Users",    value: "2,481",  delta: "+12%",  positive: true,  icon: "users"    },
  { label: "Active Today",   value: "318",    delta: "+5%",   positive: true,  icon: "activity" },
  { label: "Pending Verify", value: "43",     delta: "-8%",   positive: true,  icon: "clock"    },
  { label: "New This Month", value: "127",    delta: "+22%",  positive: true,  icon: "trend"    },
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard",  icon: "grid"    },
  { id: "users",     label: "Users",      icon: "users"   },
  { id: "analytics", label: "Analytics",  icon: "bar"     },
  { id: "settings",  label: "Settings",   icon: "cog"     },
];

export default function Admin() {
  const navigate = useNavigate();

  const [activeNav,    setActiveNav]    = useState("dashboard");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [loggingOut,   setLoggingOut]   = useState(false);
  const [logoutError,  setLogoutError]  = useState("");
  const [mounted,      setMounted]      = useState(false);

  useEffect(() => {
    // Trigger staggered entry animations
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  /* ── Filtered users ─────────────────────────────────────── */
  const filteredUsers = MOCK_USERS.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filterStatus === "All" || u.status === filterStatus;
    return matchSearch && matchFilter;
  });

  /* ── Logout ─────────────────────────────────────────────── */
  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await api.get("/users/signout", { withCredentials: true });
      navigate("/login");
    } catch {
      // Even if logout API fails, redirect anyway (cookie already cleared server-side or expired)
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className={`adm-root${mounted ? " adm-root--mounted" : ""}`}>

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div className="adm-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`adm-sidebar${sidebarOpen ? " adm-sidebar--open" : ""}`}>
        {/* Logo */}
        <div className="adm-sidebar__logo">
          <span className="adm-logo__hex" aria-hidden="true">⬡</span>
          <span className="adm-logo__name">AuthSystem</span>
        </div>

        {/* Nav */}
        <nav className="adm-sidebar__nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`adm-nav-item${activeNav === item.id ? " adm-nav-item--active" : ""}`}
              onClick={() => { setActiveNav(item.id); setSidebarOpen(false); }}
            >
              <span className="adm-nav-item__icon" aria-hidden="true">
                <NavIcon type={item.icon} />
              </span>
              <span className="adm-nav-item__label">{item.label}</span>
              {activeNav === item.id && <span className="adm-nav-item__pip" aria-hidden="true" />}
            </button>
          ))}
        </nav>

        {/* Admin profile block */}
        <div className="adm-sidebar__profile">
          <div className="adm-profile__avatar">
            <span>CA</span>
            <span className="adm-profile__online" aria-label="Online" />
          </div>
          <div className="adm-profile__info">
            <span className="adm-profile__name">Clara Admin</span>
            <span className="adm-profile__role">Super Admin</span>
          </div>
        </div>

        {/* Logout */}
        <button
          className="adm-sidebar__logout"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut
            ? <><span className="adm-spinner" /><span>Signing out…</span></>
            : <><LogoutIcon /><span>Sign Out</span></>
          }
        </button>
        {logoutError && <p className="adm-sidebar__err">{logoutError}</p>}
      </aside>

      {/* ── Main ── */}
      <main className="adm-main">

        {/* Topbar */}
        <header className="adm-topbar">
          <button
            className="adm-topbar__burger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <BurgerIcon />
          </button>

          <div className="adm-topbar__title">
            <h1>Dashboard</h1>
            <span className="adm-topbar__breadcrumb">Admin / Overview</span>
          </div>

          <div className="adm-topbar__right">
            <div className="adm-topbar__badge">
              <BellIcon />
              <span className="adm-topbar__notif">3</span>
            </div>
            <div className="adm-topbar__avatar">CA</div>
          </div>
        </header>

        {/* Content */}
        <div className="adm-content">

          {/* Welcome banner */}
          <div className="adm-banner">
            <div className="adm-banner__text">
              <h2 className="adm-banner__title">Good morning, Clara 👋</h2>
              <p className="adm-banner__sub">Here's what's happening with your auth system today.</p>
            </div>
            <div className="adm-banner__decoration" aria-hidden="true">
              <span className="adm-banner__ring adm-banner__ring--1" />
              <span className="adm-banner__ring adm-banner__ring--2" />
              <span className="adm-banner__hex-big">⬡</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="adm-stats">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className="adm-stat-card"
                style={{ animationDelay: `${0.05 + i * 0.07}s` }}
              >
                <div className="adm-stat-card__top">
                  <span className="adm-stat-card__icon" aria-hidden="true">
                    <StatIcon type={stat.icon} />
                  </span>
                  <span className={`adm-stat-card__delta${stat.positive ? " adm-stat-card__delta--up" : " adm-stat-card__delta--down"}`}>
                    {stat.delta}
                  </span>
                </div>
                <div className="adm-stat-card__value">{stat.value}</div>
                <div className="adm-stat-card__label">{stat.label}</div>
                <div className="adm-stat-card__bar">
                  <div className="adm-stat-card__bar-fill" style={{ width: `${55 + i * 10}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Users table section */}
          <div className="adm-section">
            <div className="adm-section__head">
              <div>
                <h3 className="adm-section__title">User Management</h3>
                <p className="adm-section__sub">{filteredUsers.length} of {MOCK_USERS.length} users shown</p>
              </div>
              <div className="adm-section__controls">
                {/* Search */}
                <div className="adm-search">
                  <span className="adm-search__icon" aria-hidden="true"><SearchIcon /></span>
                  <input
                    className="adm-search__input"
                    type="text"
                    placeholder="Search users…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {/* Filter */}
                <div className="adm-filter">
                  {["All", "Active", "Inactive", "Pending"].map((s) => (
                    <button
                      key={s}
                      className={`adm-filter__btn${filterStatus === s ? " adm-filter__btn--active" : ""}`}
                      onClick={() => setFilterStatus(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? filteredUsers.map((user, idx) => (
                    <tr key={user.id} style={{ animationDelay: `${idx * 0.04}s` }}>
                      <td className="adm-table__num">{user.id}</td>
                      <td>
                        <div className="adm-user-cell">
                          <div className="adm-user-cell__avatar">
                            {user.name.split(" ").map(w => w[0]).join("").slice(0,2)}
                          </div>
                          <div>
                            <div className="adm-user-cell__name">{user.name}</div>
                            <div className="adm-user-cell__email">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`adm-badge adm-badge--${user.role.toLowerCase()}`}>{user.role}</span>
                      </td>
                      <td>
                        <span className={`adm-status adm-status--${user.status.toLowerCase()}`}>
                          <span className="adm-status__dot" />
                          {user.status}
                        </span>
                      </td>
                      <td className="adm-table__date">{user.joined}</td>
                      <td>
                        <div className="adm-actions-cell">
                          <button className="adm-action-btn adm-action-btn--view" title="View">
                            <EyeIcon />
                          </button>
                          <button className="adm-action-btn adm-action-btn--edit" title="Edit">
                            <EditIcon />
                          </button>
                          <button className="adm-action-btn adm-action-btn--del" title="Delete">
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="adm-table__empty">
                        <span>No users match your search.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>{/* /adm-section */}
        </div>{/* /adm-content */}
      </main>
    </div>
  );
}

/* ── SVG Icon Components ──────────────────────────────────── */

function NavIcon({ type }) {
  const s = { width:18, height:18, fill:"none", stroke:"currentColor", strokeWidth:1.8, strokeLinecap:"round", strokeLinejoin:"round" };
  if (type === "grid")  return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
  if (type === "users") return <svg viewBox="0 0 24 24" {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (type === "bar")   return <svg viewBox="0 0 24 24" {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
  if (type === "cog")   return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
  return null;
}

function StatIcon({ type }) {
  const s = { width:20, height:20, fill:"none", stroke:"currentColor", strokeWidth:1.8, strokeLinecap:"round", strokeLinejoin:"round" };
  if (type === "users")    return <svg viewBox="0 0 24 24" {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (type === "activity") return <svg viewBox="0 0 24 24" {...s}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
  if (type === "clock")    return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  if (type === "trend")    return <svg viewBox="0 0 24 24" {...s}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
  return null;
}

function LogoutIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
function BurgerIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
}
function BellIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}
function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function EyeIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function EditIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
}