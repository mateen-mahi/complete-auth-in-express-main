// src/components/admin/RequireRole.jsx
//
// Optional wrapper for these admin pages, built on the useAuth() hook from
// your existing AuthContext.jsx. Usage:
//
//   <RequireRole role="admin">
//     <UsersAdminPage />
//   </RequireRole>
//
//   <RequireRole role={["admin", "super-admin"]}>
//     <CoursesAdminPage />
//   </RequireRole>
//
// If your AuthContext file lives somewhere other than "src/context/
// AuthContext.jsx", fix the import path below — that's the one thing this
// component assumes about your project layout.

import { FiLock, FiShieldOff } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import shared from "./AdminShared.module.css";

export default function RequireRole({ role, children, fallback = null }) {
  const auth = useAuth();
  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!auth || auth.loading) {
    return (
      <div className={shared.guardScreen}>
        <div className={shared.spin} />
      </div>
    );
  }

  if (!auth.user) {
    return fallback || (
      <div className={shared.guardScreen}>
        <div className={shared.guardIconChip} style={{ background: "#eff6ff", color: "#2563eb" }}>
          <FiLock size={20} />
        </div>
        <p className={shared.emptyTitle}>Sign in required</p>
        <p className={shared.emptySubtext}>You need to be signed in to view this page.</p>
      </div>
    );
  }

  if (!allowedRoles.includes(auth.role)) {
    return fallback || (
      <div className={shared.guardScreen}>
        <div className={shared.guardIconChip} style={{ background: "#fff5f5", color: "#ef4444" }}>
          <FiShieldOff size={20} />
        </div>
        <p className={shared.emptyTitle}>You don't have access to this page</p>
        <p className={shared.emptySubtext}>This area is restricted to {allowedRoles.join(" / ")}.</p>
      </div>
    );
  }

  return children;
}
