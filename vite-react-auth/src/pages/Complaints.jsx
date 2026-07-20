import "../styles/complaint.css";
import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  FiAlertCircle, FiCheckCircle, FiClock, FiPlus,
  FiX, FiSend, FiMessageSquare, FiSearch,
  FiChevronDown, FiChevronUp, FiInbox, FiTrash2,
  FiRefreshCw,
} from "react-icons/fi";


const STATUS_CONFIG = {
  pending:        { label: "Pending",     color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: FiClock },
  "in progress":  { label: "In Progress", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: FiAlertCircle },
  resolved:       { label: "Resolved",    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: FiCheckCircle },
};
const STATUS_ORDER = { pending: 0, "in progress": 1, resolved: 2 };
const STATUS_FILTERS = ["All", "pending", "in progress", "resolved"];

// ─── Helpers ───────────────────────────────────────────────
const formatRelative = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};


// ─── Toast ─────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  return (
    <div className="cp-toast">
      <FiCheckCircle className="cp-toast-icon" />
      <span>{msg}</span>
      <button className="cp-toast-close" onClick={onClose}><FiX /></button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
export default function Complaint() {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [showForm,   setShowForm]   = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [search,     setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [toast,      setToast]      = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ── Fetch this user's real complaints ────────────────────
  useEffect(() => {
    if (!user?._id) return;

    const fetchComplaints = async () => {
      setLoadingComplaints(true);
      setFetchError(null);
      try {

        const res = await api.get("/complaints/user-complaints", { params: { userId: user._id } });
        setComplaints(res.data.complaints);
      } catch (err) {
        console.log("Failed to fetch complaints:", err);
        setFetchError("Couldn't load your complaints. Please try again.");
      } finally {
        setLoadingComplaints(false);
      }
    };

    fetchComplaints();
  }, [user?._id]);
  const EMPTY_FORM = { subject: "", description: "" };
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [errors,  setErrors]  = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.subject.trim())       e.subject     = "Subject is required.";
    if (!form.description.trim())   e.description = "Please describe your issue.";
    else if (form.description.trim().length < 20) e.description = "Please provide more detail (at least 20 characters).";
    return e;
  };

  // ── Submit — real POST to /submit-complaint ──────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }

    setSubmitting(true);
    try {
      const res = await api.post("/complaints/submit-complaint", {
        subject: form.subject,
        description: form.description,
        userId: user._id, 
      });

      setComplaints((prev) => [res.data.complaint, ...prev]);
      setForm(EMPTY_FORM);
      setErrors({});
      setShowForm(false);
      setToast("Complaint submitted successfully.");
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to submit complaint. Please try again.";
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  };

   const handleDelete = async (complaintId, e) => {
    e.stopPropagation(); 
    if (!window.confirm("Delete this complaint? This can't be undone.")) return;

    setDeletingId(complaintId);
    try {
      await api.delete(`/complaints/delete-complaint/${complaintId}`);
      setComplaints((prev) => prev.filter((c) => c._id !== complaintId));
      if (expandedId === complaintId) setExpandedId(null);
      setToast("Complaint deleted.");
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast(err.response?.data?.message || "Failed to delete complaint.");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = complaints.filter((c) => {
    const matchSearch =
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    total:      complaints.length,
    pending:    complaints.filter((c) => c.status === "pending").length,
    inProgress: complaints.filter((c) => c.status === "in progress").length,
    resolved:   complaints.filter((c) => c.status === "resolved").length,
  };

  return (
    <div className="cp-page">

      {/* Toast */}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* ── Page Header ── */}
      <div className="cp-header">
        <div>
          <h1 className="cp-title">My Complaints</h1>
          <p className="cp-subtitle">Submit an issue and track its resolution status.</p>
        </div>
        <button className="cp-new-btn" onClick={() => { setShowForm(true); setErrors({}); }}>
          <FiPlus /> New Complaint
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="cp-summary">
        {[
          { label: "Total",       value: counts.total,      color: "#2563eb", bg: "#eff6ff" },
          { label: "Pending",     value: counts.pending,    color: "#d97706", bg: "#fffbeb" },
          { label: "In Progress", value: counts.inProgress, color: "#2563eb", bg: "#eff6ff" },
          { label: "Resolved",    value: counts.resolved,   color: "#16a34a", bg: "#f0fdf4" },
        ].map((s) => (
          <div key={s.label} className="cp-summary-card" style={{ "--sc": s.color, "--sb": s.bg }}>
            <span className="cp-summary-value">{s.value}</span>
            <span className="cp-summary-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── New Complaint Form ── */}
      {showForm && (
        <div className="cp-form-card">
          <div className="cp-form-header">
            <h2 className="cp-form-title"><FiMessageSquare /> New Complaint</h2>
            <button className="cp-form-close" onClick={() => setShowForm(false)}><FiX /></button>
          </div>

          <form className="cp-form" onSubmit={handleSubmit} noValidate>

            {errors.submit && (
              <p className="cp-error-msg"><FiAlertCircle /> {errors.submit}</p>
            )}

            {/* Subject */}
            <div className="cp-field">
              <label className="cp-label">Subject <span className="cp-required">*</span></label>
              <input
                className={`cp-input ${errors.subject ? "error" : ""}`}
                placeholder="Briefly describe your issue…"
                value={form.subject}
                onChange={(e) => { setForm((p) => ({ ...p, subject: e.target.value })); setErrors((p) => ({ ...p, subject: "" })); }}
              />
              {errors.subject && <p className="cp-error-msg"><FiAlertCircle /> {errors.subject}</p>}
            </div>

            {/* Description */}
            <div className="cp-field">
              <label className="cp-label">Description <span className="cp-required">*</span></label>
              <textarea
                className={`cp-textarea ${errors.description ? "error" : ""}`}
                placeholder="Explain your issue in detail — include any relevant course name, error message, or date it started…"
                rows={5}
                value={form.description}
                onChange={(e) => { setForm((p) => ({ ...p, description: e.target.value })); setErrors((p) => ({ ...p, description: "" })); }}
              />
              <div className="cp-textarea-footer">
                {errors.description
                  ? <p className="cp-error-msg"><FiAlertCircle /> {errors.description}</p>
                  : <span />}
                <span className={`cp-char-count ${form.description.length > 500 ? "over" : ""}`}>
                  {form.description.length} / 500
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="cp-form-actions">
              <button type="button" className="cp-btn-cancel" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setErrors({}); }}>
                Cancel
              </button>
              <button type="submit" className="cp-btn-submit" disabled={submitting}>
                {submitting
                  ? <><span className="cp-spinner" /> Submitting…</>
                  : <><FiSend /> Submit Complaint</>
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── History ── */}
      <div className="cp-history-section">
        <div className="cp-history-toolbar">
          <h2 className="cp-history-title">Complaint History</h2>
          <div className="cp-history-controls">
            {/* Search */}
            <div className="cp-search-wrap">
              <FiSearch className="cp-search-icon" />
              <input
                className="cp-search"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Status filter */}
            <div className="cp-status-pills">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  className={`cp-status-pill ${filterStatus === s ? "active" : ""}`}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === "All" ? "All" : STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loadingComplaints && (
          <div className="cp-empty">
            <FiRefreshCw className="cp-empty-icon cp-spin" />
            <p className="cp-empty-title">Loading your complaints…</p>
          </div>
        )}

        {/* Fetch error */}
        {!loadingComplaints && fetchError && (
          <div className="cp-empty">
            <FiAlertCircle className="cp-empty-icon" />
            <p className="cp-empty-title">{fetchError}</p>
          </div>
        )}

        {/* Empty state */}
        {!loadingComplaints && !fetchError && filtered.length === 0 && (
          <div className="cp-empty">
            <FiInbox className="cp-empty-icon" />
            <p className="cp-empty-title">No complaints found</p>
            <p className="cp-empty-sub">
              {complaints.length === 0
                ? "You haven't submitted any complaints yet."
                : "No complaints match your current filter."}
            </p>
          </div>
        )}

        {/* Complaint cards */}
        {!loadingComplaints && !fetchError && (
          <div className="cp-list">
            {filtered.map((c) => {
              const status = STATUS_CONFIG[c.status];
              const StatusIcon = status.icon;
              const isExpanded = expandedId === c._id;
              const isDeleting = deletingId === c._id;
              const wasUpdated = new Date(c.updatedAt).getTime() !== new Date(c.createdAt).getTime();

              return (
                <div key={c._id} className={`cp-card ${isExpanded ? "expanded" : ""}`}>

                  {/* Card header — always visible */}
                  <div className="cp-card-header" onClick={() => setExpandedId(isExpanded ? null : c._id)}>
                    <div className="cp-card-icon" style={{ background: "#2563eb14", color: "#2563eb" }}>
                      <FiMessageSquare />
                    </div>

                    <div className="cp-card-meta">
                      <div className="cp-card-title-row">
                        <p className="cp-card-title">{c.subject}</p>
                        <div className="cp-card-badges">
                          <span className="cp-status-badge" style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
                            <StatusIcon /> {status.label}
                          </span>
                        </div>
                      </div>
                      <div className="cp-card-info-row">
                        <span className="cp-date">Submitted {formatRelative(c.createdAt)}</span>
                        {wasUpdated && (
                          <><span className="cp-dot" /><span className="cp-date">Updated {formatRelative(c.updatedAt)}</span></>
                        )}
                      </div>
                    </div>

                    <button
                      className="cp-expand-btn"
                      aria-label="Delete complaint"
                      title="Delete complaint"
                      disabled={isDeleting}
                      onClick={(e) => handleDelete(c._id, e)}
                    >
                      {isDeleting ? <FiRefreshCw className="cp-spin" /> : <FiTrash2 />}
                    </button>

                    <button className="cp-expand-btn" aria-label={isExpanded ? "Collapse" : "Expand"}>
                      {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="cp-card-body">

                      {/* Status timeline */}
                      <div className="cp-timeline">
                        {["pending", "in progress", "resolved"].map((step, i) => {
                          const stepCfg = STATUS_CONFIG[step];
                          const StepIcon = stepCfg.icon;
                          const currentOrder = STATUS_ORDER[c.status];
                          const isDone    = STATUS_ORDER[step] <= currentOrder;
                          const isCurrent = step === c.status;
                          return (
                            <div key={step} className={`cp-step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}>
                              <div className="cp-step-icon" style={isDone ? { background: stepCfg.color, color: "#fff" } : {}}>
                                <StepIcon />
                              </div>
                              <span className="cp-step-label" style={isCurrent ? { color: stepCfg.color, fontWeight: 700 } : {}}>{stepCfg.label}</span>
                              {i < 2 && <div className={`cp-step-line ${STATUS_ORDER[step] < currentOrder ? "done" : ""}`} />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Description */}
                      <div className="cp-detail-block">
                        <p className="cp-detail-label">Your complaint</p>
                        <p className="cp-detail-text">{c.description}</p>
                      </div>

                      {/* Admin reply (schema field is "answer") */}
                      {c.answer && c.answer.trim().length > 0 ? (
                        <div className="cp-reply-block">
                          <div className="cp-reply-header">
                            <FiCheckCircle className="cp-reply-icon" />
                            <p className="cp-reply-label">Admin Response</p>
                          </div>
                          <p className="cp-reply-text">{c.answer}</p>
                        </div>
                      ) : (
                        <div className="cp-no-reply">
                          <FiClock />
                          <span>Awaiting admin response — we typically respond within 24–48 hours.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}