// src/pages/admin/CertificatesAdminPage.jsx
//
// ⚠️ Your Method_Endpoint_Description reference has NO certificate routes —
// the schema is marked "Planned". This page calls conventional REST paths
// (GET /api/v1/certificates/, DELETE /api/v1/certificates/:id) as a
// placeholder — see certificatesApi in adminApi.js. Add the matching routes
// server-side, or tell me the real paths and I'll wire this up to them.
//
// Per your spec this is view + delete-one-by-one; multi-select delete is
// included too since it's the same pattern as every other page here, but
// feel free to strip the selection bar if you'd rather keep this one simple.

import { useEffect, useMemo, useState, useCallback } from "react";
import { FiAward, FiTrash2, FiSearch, FiExternalLink, FiAlertTriangle, FiDownload } from "react-icons/fi";
import { certificatesApi } from "../../services/adminApi";
import { useSelection } from "../../custom-hooks/useSelection";
import { useToast } from "../../custom-hooks/useToast";
import { usePagination } from "../../custom-hooks/usePagination";
import { formatDate } from "../../utils/adminFormat";
import { downloadJson } from "../../utils/exportJson";
import Toast from "../../components/admin/Toast";
import ConfirmModal from "../../components/admin/ConfirmModal";
import Pagination from "../../components/admin/Pagination";
import shared from "../../components/admin/AdminShared.module.css";
import styles from "./CertificatesAdminPage.module.css";

const STATUS_BADGE = {
  issued: shared.badgeSuccess,
  draft: shared.badgeNeutral,
  suspended: shared.badgeWarning,
  revoked: shared.badgeDanger,
  expired: shared.badgeDanger,
};

export default function CertificatesAdminPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmState, setConfirmState] = useState(null);
  const [busy, setBusy] = useState(false);

  const { toast, showToast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await certificatesApi.getAll();
      setCertificates(res.data.certificates || res.data.data || res.data || []);
    } catch (err) {
      setLoadError(true);
      showToast("error", "Couldn't load certificates — this endpoint may not exist on your backend yet");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => {
    if (!search.trim()) return certificates;
    const q = search.trim().toLowerCase();
    return certificates.filter(
      (c) => c.studentName?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q) || c.certificateId?.toLowerCase().includes(q)
    );
  }, [certificates, search]);

  const selection = useSelection(filtered, (c) => c._id);
  const pagination = usePagination(filtered, { pageSize: 10, resetKey: search });

  function handleExport() {
    downloadJson(filtered, "certificates.json");
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      if (confirmState.type === "one") {
        await certificatesApi.remove(confirmState.id);
        showToast("success", "Certificate deleted");
      } else {
        const { succeeded, failed } = await certificatesApi.removeMany(Array.from(selection.selectedIds));
        selection.clear();
        showToast(failed.length ? "error" : "success", failed.length ? `Deleted ${succeeded.length}, ${failed.length} failed` : `Deleted ${succeeded.length} certificates`);
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
    one: "This certificate will be permanently deleted. This can't be undone.",
    many: `${selection.selectedCount} selected certificate${selection.selectedCount === 1 ? "" : "s"} will be permanently deleted. This can't be undone.`,
  };

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div className={shared.pageTitleRow}>
          <div className={shared.pageIconChip}><FiAward size={18} /></div>
          <div>
            <h1 className={shared.pageTitle}>Certificates</h1>
            <p className={shared.pageSubtitle}>{certificates.length} total</p>
          </div>
        </div>
      </div>

      {loadError && (
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-start", background: "#fffbeb",
          border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 16,
        }}>
          <FiAlertTriangle size={16} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 12.5, color: "#92400e", lineHeight: 1.5 }}>
            No response from <code className={shared.mono}>/api/v1/certificates/</code>. This route isn't in your
            documented endpoints yet — add it server-side to power this page.
          </p>
        </div>
      )}

      <div className={shared.toolbar}>
        <div className={shared.searchBar}>
          <FiSearch size={14} />
          <input placeholder="Search by student, title, or certificate ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className={shared.toolbarSpacer} />
        {certificates.length > 0 && (
          <button className={shared.btnGhost} onClick={handleExport}>
            <FiDownload size={14} /> Export JSON
          </button>
        )}
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
        <div className={shared.loadingWrap}><div className={shared.spin} /> Loading certificates…</div>
      ) : filtered.length === 0 ? (
        <div className={shared.emptyState}>
          <FiAward />
          <p className={shared.emptyTitle}>{search ? "No matching certificates" : "No certificates yet"}</p>
          <p className={shared.emptySubtext}>{search ? "Try a different search term." : "Issued certificates will show up here."}</p>
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
                  <th>Student</th>
                  <th>Certificate</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th className={shared.textRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((c) => (
                  <tr key={c._id} className={selection.isSelected(c._id) ? shared.rowSelected : ""}>
                    <td className={shared.checkboxCell}>
                      <input type="checkbox" className={shared.checkbox} checked={selection.isSelected(c._id)} onChange={() => selection.toggleOne(c._id)} />
                    </td>
                    <td>
                      <div className={shared.nameCell}>
                        <div className={shared.avatar}>{(c.studentName || "?").slice(0, 2).toUpperCase()}</div>
                        <span className={shared.cellStrong}>{c.studentName}</span>
                      </div>
                    </td>
                    <td>
                      <div className={shared.cellStrong}>{c.title}</div>
                      <div className={styles.certIdChip}>{c.certificateId}</div>
                    </td>
                    <td className={shared.cellMuted}>{c.percentage != null ? `${c.percentage}%` : "—"}</td>
                    <td>
                      {c.grade ? (
                        <span className={styles.gradeBadge}>{c.grade}</span>
                      ) : (
                        <span className={styles.gradeBadgeNeutral}>—</span>
                      )}
                    </td>
                    <td><span className={`${shared.badge} ${STATUS_BADGE[c.status] || shared.badgeNeutral}`}>{c.status}</span></td>
                    <td className={shared.cellMuted}>{formatDate(c.issueDate)}</td>
                    <td>
                      <div className={shared.rowActions}>
                        {c.pdfUrl && (
                          <a className={shared.iconBtn} href={c.pdfUrl} target="_blank" rel="noreferrer" title="Open PDF">
                            <FiExternalLink size={14} />
                          </a>
                        )}
                        <button className={`${shared.iconBtn} ${shared.iconBtnDanger}`} title="Delete certificate"
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

      <ConfirmModal
        open={!!confirmState}
        title="Delete certificate(s)?"
        message={confirmState ? confirmCopy[confirmState.type] : ""}
        loading={busy}
        onCancel={() => setConfirmState(null)}
        onConfirm={confirmDelete}
      />

      <Toast toast={toast} />
    </div>
  );
}
