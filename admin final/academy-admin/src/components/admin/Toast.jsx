// src/components/admin/Toast.jsx
import { FiCheckCircle, FiAlertCircle, FiInfo } from "react-icons/fi";
import shared from "./AdminShared.module.css";

const ICONS = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  info: FiInfo,
};

const CLASS_BY_TYPE = {
  success: shared.toastSuccess,
  error: shared.toastError,
  info: shared.toastInfo,
};

export default function Toast({ toast }) {
  if (!toast) return null;
  const Icon = ICONS[toast.type] || FiInfo;
  const cls = CLASS_BY_TYPE[toast.type] || shared.toastInfo;

  return (
    <div className={`${shared.toast} ${cls}`} role="status">
      <Icon size={16} />
      <span>{toast.message}</span>
    </div>
  );
}
