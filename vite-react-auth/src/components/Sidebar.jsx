import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiMenu,
  FiX,
  FiHome,
  FiBookOpen,
  FiAward,
  FiUser,
  FiSettings,
  FiFileText,
  FiLayers,
  FiLogOut,
  FiAlertCircle,
} from "react-icons/fi";

import "../styles/Sidebar.css";

export default function Sidebar({ isOpen, setIsOpen, isMobile }) {
  const userContext = useAuth();

  const closeSidebar = () => {
    if (isMobile) setIsOpen(false);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        className={`menu-btn ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle sidebar"
      >
        {isOpen ? <FiX /> : <FiMenu />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? "expanded" : "collapsed"}`}>
        {/* Logo */}
        <div className="logo">
          {isOpen && <span className="logo-icon">🎓</span>}
          {isOpen && <h2 className="logo-text">Academy</h2>}
        </div>

        {/* Nav Links */}
        <nav className="nav-links">
          <NavLink to="/dashboard" onClick={closeSidebar} title="Dashboard">
            <FiHome className="nav-icon" />
            {isOpen && <span>Dashboard</span>}
          </NavLink>

          <NavLink to="/lectures" onClick={closeSidebar} title="Lectures">
            <FiBookOpen className="nav-icon" />
            {isOpen && <span>Lectures</span>}
          </NavLink>

          <NavLink to="/grand-quiz" onClick={closeSidebar} title="Grand Quiz">
            <FiAward className="nav-icon" />
            {isOpen && <span>Grand Quiz</span>}
          </NavLink>

          <NavLink
            to="/notes"
            onClick={closeSidebar}
            className="nav-item"
            title="Notes"
          >
            <span className="nav-item-icon">
              <FiFileText />
            </span>
            {isOpen && <span className="nav-item-label">Notes</span>}
          </NavLink>

          <NavLink
            to="/courses"
            onClick={closeSidebar}
            className="nav-item"
            title="Courses"
          >
            <span className="nav-item-icon">
              <FiLayers />
            </span>
            {isOpen && <span className="nav-item-label">Courses</span>}
          </NavLink>
          <NavLink to="/certificate" onClick={closeSidebar} title="Certificate">
            <FiAward className="nav-icon" />
            {isOpen && <span>Certificate</span>}
          </NavLink>
          <NavLink to="/complaints" onClick={closeSidebar} title="Complaints">
            <FiAlertCircle className="nav-icon" />
            {isOpen && <span>Complaints</span>}
          </NavLink>
          <NavLink to="/socket-test" onClick={closeSidebar} title="Settings">
            <FiSettings className="nav-icon" />
            {isOpen && <span>Chat app</span>}
          </NavLink>
          <NavLink to="/settings" onClick={closeSidebar} title="Settings">
            <FiSettings className="nav-icon" />
            {isOpen && <span>Settings</span>}
          </NavLink>
          <NavLink to="/settings" onClick={closeSidebar} title="Settings">
            <FiSettings className="nav-icon" />
            {isOpen && <span>Settings</span>}
          </NavLink>
        </nav>

        {/* User Footer */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {userContext?.user?.username?.charAt(0)?.toUpperCase() || "U"}
          </div>

          {isOpen && (
            <div className="user-info">
              <p className="user-name">{userContext?.user?.username}</p>
              <p className="user-role">{userContext?.user?.role}</p>
            </div>
          )}

          <button
            className="logout-btn"
            onClick={() => console.log(user)}
            title="Log out"
          >
            <FiLogOut />
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && isMobile && (
        <div className="overlay" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
