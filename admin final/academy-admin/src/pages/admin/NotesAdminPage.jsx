// src/pages/admin/NotesAdminPage.jsx
//
// View + delete only, as requested — no add/edit UI for notes.
// No global "delete all notes" endpoint exists, so "Delete all" fetches
// every note and deletes them one by one.

import { useEffect, useMemo, useState, useCallback } from "react";
import { FiFileText, FiTrash2, FiSearch, FiBookmark, FiDownload } from "react-icons/fi";
import { notesApi } from "../../services/adminApi";
import { useSelection } from "../../custom-hooks/useSelection";
import { useToast } from "../../custom-hooks/useToast";
import { usePagination } from "../../custom-hooks/usePagination";
import { formatDate, truncate } from "../../utils/adminFormat";
import { downloadJson } from "../../utils/exportJson";
import Toast from "../../components/admin/Toast";
import ConfirmModal from "../../components/admin/ConfirmModal";
import Pagination from "../../components/admin/Pagination";
import shared from "../../components/admin/AdminShared.module.css";
import styles from "./NotesAdminPage.module.css";

export default function NotesAdminPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmState, setConfirmState] = useState(null);
  const [busy, setBusy] = useState(false);

  const { toast, showToast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notesApi.getAll();
      setNotes(res.data.notes || res.data.data || res.data || []);
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Couldn't load notes");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.trim().toLowerCase();
    return notes.filter(
      (n) => n.title?.toLowerCase().includes(q) || n.userId?.username?.toLowerCase().includes(q)
    );
  }, [notes, search]);

  const selection = useSelection(filtered, (n) => n._id);
  const pagination = usePagination(filtered, { pageSize: 10, resetKey: search });

  function handleExport() {
    downloadJson(filtered, "notes.json");
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      if (confirmState.type === "one") {
        await notesApi.remove(confirmState.id);
        showToast("success", "Note deleted");
      } else if (confirmState.type === "many") {
        const { succeeded, failed } = await notesApi.removeMany(Array.from(selection.selectedIds));
        selection.clear();
        showToast(failed.length ? "error" : "success", failed.length ? `Deleted ${succeeded.length}, ${failed.length} failed` : `Deleted ${succeeded.length} notes`);
      } else if (confirmState.type === "all") {
        const { succeeded, failed } = await notesApi.removeMany(notes.map((n) => n._id));
        selection.clear();
        showToast(failed.length ? "error" : "success", failed.length ? `Deleted ${succeeded.length}, ${failed.length} failed` : `Deleted all ${succeeded.length} notes`);
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
    one: "This note will be permanently deleted. This can't be undone.",
    many: `${selection.selectedCount} selected note${selection.selectedCount === 1 ? "" : "s"} will be permanently deleted. This can't be undone.`,
    all: `All ${notes.length} notes will be permanently deleted. This can't be undone.`,
  };

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div className={shared.pageTitleRow}>
          <div className={shared.pageIconChip}><FiFileText size={18} /></div>
          <div>
            <h1 className={shared.pageTitle}>Notes</h1>
            <p className={shared.pageSubtitle}>{notes.length} total</p>
          </div>
        </div>
        {notes.length > 0 && (
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
          <input placeholder="Search by title or owner…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
        <div className={shared.loadingWrap}><div className={shared.spin} /> Loading notes…</div>
      ) : filtered.length === 0 ? (
        <div className={shared.emptyState}>
          <FiFileText />
          <p className={shared.emptyTitle}>{search ? "No matching notes" : "No notes yet"}</p>
          <p className={shared.emptySubtext}>{search ? "Try a different search term." : "Notes created by users will show up here."}</p>
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
                  <th>Note</th>
                  <th>Owner</th>
                  <th>Pinned</th>
                  <th>Last updated</th>
                  <th className={shared.textRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((n) => (
                  <tr key={n._id} className={selection.isSelected(n._id) ? shared.rowSelected : ""}>
                    <td className={shared.checkboxCell}>
                      <input type="checkbox" className={shared.checkbox} checked={selection.isSelected(n._id)} onChange={() => selection.toggleOne(n._id)} />
                    </td>
                    <td>
                      <div className={`${styles.noteAccent} ${n.isPinned ? styles.pinnedAccent : ""}`}>
                        <div className={shared.cellStrong}>{n.title}</div>
                        <div className={shared.cellMuted} style={{ fontSize: 12 }}>{truncate(n.content?.replace(/<[^>]*>/g, ""), 80)}</div>
                      </div>
                    </td>
                    <td className={shared.cellMuted}>{n.userId?.username || "—"}</td>
                    <td>
                      {n.isPinned ? (
                        <span className={`${shared.badge} ${shared.badgeInfo}`}><FiBookmark size={11} /> Pinned</span>
                      ) : (
                        <span className={shared.cellMuted}>—</span>
                      )}
                    </td>
                    <td className={shared.cellMuted}>{formatDate(n.updatedAt)}</td>
                    <td>
                      <div className={shared.rowActions}>
                        <button className={`${shared.iconBtn} ${shared.iconBtnDanger}`} title="Delete note"
                          onClick={() => setConfirmState({ type: "one", id: n._id })}>
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
        title={confirmState?.type === "all" ? "Delete all notes?" : "Delete note(s)?"}
        message={confirmState ? confirmCopy[confirmState.type] : ""}
        loading={busy}
        onCancel={() => setConfirmState(null)}
        onConfirm={confirmDelete}
      />

      <Toast toast={toast} />
    </div>
  );
}
