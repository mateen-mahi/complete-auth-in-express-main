import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { FiBell, FiUser, FiLock, FiClock, FiLogOut } from "react-icons/fi";
import "../styles/Navbar.css";

export default function Navbar({ isOpen, isMobile }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, refreshAuth } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Avatar image / letter fallback ──────────────────────────
  const [avatarImgError, setAvatarImgError] = useState(false);

  // Reset the error flag if the user's imageUrl ever changes (e.g. they
  // just uploaded a new picture on the Profile page) — otherwise a stale
  // error from a previous broken URL would keep hiding a valid new one.
  useEffect(() => {
    setAvatarImgError(false);
  }, [user?.imageUrl]);

  const showAvatarImage = Boolean(user?.imageUrl) && !avatarImgError;

  const handleLogout = async () => {
    try {
      setDropdownOpen(false);

      await api.post("/users/signout", {}, { withCredentials: true });
      await refreshAuth();

      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      navigate("/login");
    }
  };

  const handleNavigate = (path) => {
    setDropdownOpen(false);
    navigate(path);
  };

  const avatarLetter = user?.username?.charAt(0)?.toUpperCase() || "U";
  const sidebarExpanded = isOpen && !isMobile;

  return (
    <header
      className={`navbar ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}
    >
      <div className="navbar-logo">
        <span className="navbar-logo-icon">🎓</span>
        <span className="navbar-logo-text">Academy</span>
      </div>

      <div className="navbar-actions">
        <button
          className="navbar-icon-btn"
          title="Notifications"
          aria-label="Notifications"
        >
          <FiBell />
          <span className="navbar-badge">3</span>
        </button>

        <div className="navbar-avatar-wrapper" ref={dropdownRef}>
          <button
            className="navbar-avatar"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-label="User menu"
            aria-expanded={dropdownOpen}
          >
            {showAvatarImage ? (
              <img
                src={user.imageUrl}
                alt={user.username}
                className="navbar-avatar-img"
                onError={() => setAvatarImgError(true)}
              />
            ) : (
              avatarLetter
            )}
          </button>

          {dropdownOpen && (
            <div className="navbar-dropdown">
              <div className="dropdown-user-info">
                <div className="dropdown-avatar">
                  {showAvatarImage ? (
                    <img
                      src={user.imageUrl}
                      alt={user.username}
                      className="navbar-avatar-img"
                      onError={() => setAvatarImgError(true)}
                    />
                  ) : (
                    avatarLetter
                  )}
                </div>
                <div>
                  <p className="dropdown-username">
                    {user?.username || "User"}
                  </p>
                  <p className="dropdown-role">{user?.role || "student"}</p>
                </div>
              </div>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => handleNavigate("/profile")}
              >
                <FiUser className="dropdown-item-icon" /> My Profile
              </button>
              <button
                className="dropdown-item"
                onClick={() => handleNavigate("/profile")}
              >
                <FiLock className="dropdown-item-icon" /> Change Password
              </button>
              <button
                className="dropdown-item"
                onClick={() => handleNavigate("/profile")}
              >
                <FiClock className="dropdown-item-icon" /> Login History
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item dropdown-logout"
                onClick={handleLogout}
              >
                <FiLogOut className="dropdown-item-icon" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}