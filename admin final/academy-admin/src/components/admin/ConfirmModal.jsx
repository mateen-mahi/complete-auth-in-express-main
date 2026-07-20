// src/components/admin/ConfirmModal.jsx
//
// Generic confirm dialog — used for delete one / delete many / delete all
// across every admin page (and for the complaint "mark resolved" style
// confirmations if you want them later).

import { FiX, FiAlertTriangle } from "react-icons/fi";
import shared from "./AdminShared.module.css";

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className={shared.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={shared.modal} role="dialog" aria-modal="true">
        <div className={shared.modalHeader}>
          <h3 className={shared.modalTitle}>{title}</h3>
          <button className={shared.modalCloseBtn} onClick={onCancel} aria-label="Close">
            <FiX size={16} />
          </button>
        </div>
        <div className={shared.modalBody}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {danger && (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#fff5f5",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FiAlertTriangle size={17} />
              </div>
            )}
            <p style={{ margin: 0, fontSize: 13.5, color: "#374151", lineHeight: 1.5 }}>
              {message}
            </p>
          </div>
        </div>
        <div className={shared.modalFooter}>
          <button className={shared.btnGhost} onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className={danger ? shared.btnDanger : shared.btnPrimary}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
