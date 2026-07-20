// src/pages/admin/ComplaintsAdminPage.jsx
//
// No "add" here — complaints are user-submitted. Admin can reply (set a
// status + answer) and delete one / many / all.

import { useEffect, useMemo, useState, useCallback } from "react";
import { FiMessageSquare, FiTrash2, FiCornerUpLeft, FiX, FiSearch, FiDownload } from "react-icons/fi";
import { complaintsApi } from "../../services/adminApi";
import { useSelection } from "../../custom-hooks/useSelection";
import { useToast } from "../../custom-hooks/useToast";
import { usePagination } from "../../custom-hooks/usePagination";
import { formatDate, truncate } from "../../utils/adminFormat";
import { downloadJson } from "../../utils/exportJson";
import Toast from "../../components/admin/Toast";
import ConfirmModal from "../../components/admin/ConfirmModal";
import Pagination from "../../components/admin/Pagination";
import shared from "../../components/admin/AdminShared.module.css";
import styles from "./ComplaintsAdminPage.module.css";

const STRIPE_CLASS = {
  pending: "stripePending",
  "in progress": "stripeInProgress",
  resolved: "stripeResolved",
};

const STATUSES = ["pending", "in progress", "resolved"];
const STATUS_BADGE = {
  pending: shared.badgeWarning,
  "in progress": shared.badgeInfo,
  resolved: shared.badgeSuccess,
};
const FILTERS = ["all", ...STATUSES];

export default function ComplaintsAdminPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [replyingTo, setReplyingTo] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [busy, setBusy] = useState(false);

  const { toast, showToast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await complaintsApi.getAll();
      setComplaints(res.data.complaints || res.data.data || res.data || []);
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Couldn't load complaints");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => {
    let list = complaints;
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) => c.subject?.toLowerCase().includes(q) || c.userId?.username?.toLowerCase().includes(q) || c.userId?.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [complaints, search, statusFilter]);

  const selection = useSelection(filtered, (c) => c._id);
  const pagination = usePagination(filtered, { pageSize: 10, resetKey: `${search}|${statusFilter}` });

  function handleExport() {
    downloadJson(filtered, "complaints.json");
  }

  async function handleReply(status, answer) {
    setBusy(true);
    try {
      await complaintsApi.reply(replyingTo._id, { status, answer });
      showToast("success", "Reply sent");
      setReplyingTo(null);
      fetchAll();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Couldn't send reply");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      if (confirmState.type === "one") {
        await complaintsApi.remove(confirmState.id);
        showToast("success", "Complaint deleted");
      } else if (confirmState.type === "many") {
        const { succeeded, failed } = await complaintsApi.removeMany(Array.from(selection.selectedIds));
        selection.clear();
        showToast(failed.length ? "error" : "success", failed.length ? `Deleted ${succeeded.length}, ${failed.length} failed` : `Deleted ${succeeded.length} complaints`);
      } else if (confirmState.type === "all") {
        await complaintsApi.clearAll();
        selection.clear();
        showToast("success", "All complaints deleted");
      }
      fetchAll();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Delete failed");
    } finally {
      setBusy(false);
      setConfirmState(null);
    }
  }

  const confirmCopy = {
    one: "This complaint will be permanently deleted. This can't be undone.",
    many: `${selection.selectedCount} selected complaint${selection.selectedCount === 1 ? "" : "s"} will be permanently deleted. This can't be undone.`,
    all: `All ${complaints.length} complaints will be permanently deleted. This can't be undone.`,
  };

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div className={shared.pageTitleRow}>
          <div className={shared.pageIconChip}><FiMessageSquare size={18} /></div>
          <div>
            <h1 className={shared.pageTitle}>Complaints</h1>
            <p className={shared.pageSubtitle}>{complaints.length} total</p>
          </div>
        </div>
        {complaints.length > 0 && (
          <div style={{ display: "flex", gap: 10 }}>
            <button className={shared.btnGhost} onClick={handleExport}>
              <FiDownload size={14} /> Export JSON
            </button>
            <button className={shared.btnGhostDanger} onClick={() => setConfirmState({ type: "all" })}>
              <FiTrash2 size={14} /> Delete all
            </button>
          </div>
        )}
      </div>

      <div className={shared.toolbar}>
        <div className={shared.searchBar}>
          <FiSearch size={14} />
          <input placeholder="Search by subject or user…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className={shared.filterPillRow}>
          {FILTERS.map((f) => (
            <button
              key={f}
              className={statusFilter === f ? shared.filterPillActive : shared.filterPill}
              onClick={() => setStatusFilter(f)}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {selection.selectedCount > 0 && (
        <div className={shared.selectionBar}>
          <span>{selection.selectedCount} selected</span>
          <button className={shared.btnGhost} onClick={selection.clear}>Clear</button>
          <button className={shared.btnDanger} onClick={() => setConfirmState({ type: "many" })}>
            <FiTrash2 size={14} /> Delete selected
          </button>
        </div>
      )}

      {loading ? (
        <div className={shared.loadingWrap}><div className={shared.spin} /> Loading complaints…</div>
      ) : filtered.length === 0 ? (
        <div className={shared.emptyState}>
          <FiMessageSquare />
          <p className={shared.emptyTitle}>No complaints here</p>
          <p className={shared.emptySubtext}>{statusFilter !== "all" ? `Nothing with status "${statusFilter}".` : "Nothing's been submitted yet."}</p>
        </div>
      ) : (
        <div className={shared.tableWrap}>
          <div className={shared.tableScroll}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th className={shared.checkboxCell}>
                    <input type="checkbox" className={shared.checkbox} checked={selection.isAllSelected}
                      ref={(el) => el && (el.indeterminate = selection.isSomeSelected)} onChange={selection.toggleAll} />
                  </th>
                  <th>Submitted by</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th className={shared.textRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((c) => (
                  <tr
                    key={c._id}
                    className={`${selection.isSelected(c._id) ? shared.rowSelected : ""} ${styles[STRIPE_CLASS[c.status]] || ""}`}
                  >
                    <td className={shared.checkboxCell}>
                      <input type="checkbox" className={shared.checkbox} checked={selection.isSelected(c._id)} onChange={() => selection.toggleOne(c._id)} />
                    </td>
                    <td>
                      <div className={shared.cellStrong}>{c.userId?.username || "Unknown user"}</div>
                      <div className={shared.cellMuted} style={{ fontSize: 12 }}>{c.userId?.email}</div>
                    </td>
                    <td>
                      <div className={shared.cellStrong}>{c.subject}</div>
                      <div className={shared.cellMuted} style={{ fontSize: 12 }}>{truncate(c.description, 70)}</div>
                    </td>
                    <td><span className={`${shared.badge} ${STATUS_BADGE[c.status] || shared.badgeNeutral}`}>{c.status}</span></td>
                    <td className={shared.cellMuted}>{formatDate(c.createdAt)}</td>
                    <td>
                      <div className={shared.rowActions}>
                        <button className={shared.iconBtn} title="Reply" onClick={() => setReplyingTo(c)}>
                          <FiCornerUpLeft size={14} />
                        </button>
                        <button className={`${shared.iconBtn} ${shared.iconBtnDanger}`} title="Delete complaint"
                          onClick={() => setConfirmState({ type: "one", id: c._id })}>
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            setPage={pagination.setPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
          />
        </div>
      )}

      {replyingTo && (
        <ReplyModal complaint={replyingTo} loading={busy} onCancel={() => setReplyingTo(null)} onSave={handleReply} />
      )}

      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.type === "all" ? "Delete all complaints?" : "Delete complaint(s)?"}
        message={confirmState ? confirmCopy[confirmState.type] : ""}
        loading={busy}
        onCancel={() => setConfirmState(null)}
        onConfirm={confirmDelete}
      />

      <Toast toast={toast} />
    </div>
  );
}

function ReplyModal({ complaint, loading, onCancel, onSave }) {
  const [status, setStatus] = useState(complaint.status || "pending");
  const [answer, setAnswer] = useState(complaint.answer || "");

  function handleSubmit(e) {
    e.preventDefault();
    onSave(status, answer);
  }

  return (
    <div className={shared.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={shared.modalWide} role="dialog" aria-modal="true">
        <div className={shared.modalHeader}>
          <h3 className={shared.modalTitle}>Reply to {complaint.userId?.username || "user"}</h3>
          <button className={shared.modalCloseBtn} onClick={onCancel}><FiX size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={shared.modalBody}>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div className={shared.cellStrong} style={{ marginBottom: 4 }}>{complaint.subject}</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{complaint.description}</div>
            </div>
            <div className={shared.formGroup}>
              <label className={shared.label}>Status</label>
              <select className={shared.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={shared.formGroup}>
              <label className={shared.label}>Your reply</label>
              <textarea className={shared.textarea} required value={answer} onChange={(e) => setAnswer(e.target.value)}
                placeholder="Let them know how this was resolved…" style={{ minHeight: 120 }} />
            </div>
          </div>
          <div className={shared.modalFooter}>
            <button type="button" className={shared.btnGhost} onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="submit" className={shared.btnPrimary} disabled={loading}>
              {loading ? "Sending…" : "Send reply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
