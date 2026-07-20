// src/pages/admin/UsersAdminPage.jsx
//
// Requires an admin-authenticated session (relies on the same cookie-based
// auth your AuthContext already sets up). Wrap this route with
// <RequireRole role="admin"><UsersAdminPage /></RequireRole> from
// components/admin/RequireRole.jsx if you want the built-in guard.

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  FiUsers, FiPlus, FiUpload, FiTrash2, FiEdit2, FiKey, FiSearch,
  FiX, FiUserCheck, FiUserX, FiDownload,
} from "react-icons/fi";
import { usersApi } from "../../services/adminApi";
import { useSelection } from "../../custom-hooks/useSelection";
import { useToast } from "../../custom-hooks/useToast";
import { usePagination } from "../../custom-hooks/usePagination";
import { formatDate, initials } from "../../utils/adminFormat";
import { downloadJson } from "../../utils/exportJson";
import Toast from "../../components/admin/Toast";
import ConfirmModal from "../../components/admin/ConfirmModal";
import BulkJsonModal from "../../components/admin/BulkJsonModal";
import Pagination from "../../components/admin/Pagination";
import shared from "../../components/admin/AdminShared.module.css";
import styles from "./UsersAdminPage.module.css";

const VERIFIED_FILTERS = ["all", "verified", "unverified"];

const ROLES = ["user", "student", "instructor", "admin", "super-admin"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

const ROLE_BADGE = {
  "super-admin": shared.badgeDanger,
  admin: shared.badgeWarning,
  instructor: shared.badgeInfo,
  student: shared.badgeNeutral,
  user: shared.badgeNeutral,
};

const BULK_EXAMPLE = `[
  {
    "username": "amina_khan",
    "email": "amina@example.com",
    "password": "TempPass123",
    "gender": "Female",
    "role": "student"
  },
  {
    "username": "hassan_r",
    "email": "hassan@example.com",
    "password": "TempPass123",
    "role": "instructor"
  }
]`;

export default function UsersAdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { type: 'one'|'many'|'all', id? }
  const [busy, setBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  const { toast, showToast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll();
      setUsers(res.data.users || res.data.data || res.data || []);
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Couldn't load users");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    let list = users;
    if (verifiedFilter === "verified") list = list.filter((u) => u.isVerified);
    if (verifiedFilter === "unverified") list = list.filter((u) => !u.isVerified);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, search, verifiedFilter]);

  // Selection tracks every row matching the current filters (not just the
  // visible page) — "Delete selected" acts on all of them, same as most
  // mail-client-style bulk tools.
  const selection = useSelection(filtered, (u) => u._id);
  const pagination = usePagination(filtered, { pageSize: 10, resetKey: `${search}|${verifiedFilter}` });

  function handleExport() {
    downloadJson(filtered, "users.json");
  }

  // ── Add / Edit ──────────────────────────────────────────
  async function handleSaveUser(formData, mode) {
    setBusy(true);
    try {
      if (mode === "add") {
        await usersApi.add(formData);
        showToast("success", `${formData.username} was added`);
        setShowAddModal(false);
      } else {
        await usersApi.update(editingUser._id, formData);
        showToast("success", "User updated");
        setEditingUser(null);
      }
      fetchUsers();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Couldn't save user");
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePassword(newPassword) {
    setBusy(true);
    try {
      await usersApi.updatePassword(passwordUser._id, newPassword);
      showToast("success", `Password updated for ${passwordUser.username}`);
      setPasswordUser(null);
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Couldn't update password");
    } finally {
      setBusy(false);
    }
  }

  // ── Bulk add ─────────────────────────────────────────────
  async function handleBulkAdd(records) {
    setBusy(true);
    setBulkProgress(`Adding 0 / ${records.length}…`);
    const { succeeded, failed } = await usersApi.addMany(records);
    setBusy(false);
    setBulkProgress("");
    setShowBulkModal(false);
    fetchUsers();
    if (failed.length === 0) {
      showToast("success", `Added ${succeeded.length} user${succeeded.length === 1 ? "" : "s"}`);
    } else {
      showToast(
        "error",
        `Added ${succeeded.length}, ${failed.length} failed (e.g. "${failed[0].error}")`
      );
    }
  }

  // ── Delete ───────────────────────────────────────────────
  async function confirmDelete() {
    setBusy(true);
    try {
      if (confirmState.type === "one") {
        await usersApi.remove(confirmState.id);
        showToast("success", "User deleted");
      } else if (confirmState.type === "many") {
        const ids = Array.from(selection.selectedIds);
        const { succeeded, failed } = await usersApi.removeMany(ids);
        selection.clear();
        showToast(
          failed.length ? "error" : "success",
          failed.length ? `Deleted ${succeeded.length}, ${failed.length} failed` : `Deleted ${succeeded.length} users`
        );
      } else if (confirmState.type === "all") {
        await usersApi.clearAll();
        selection.clear();
        showToast("success", "All users deleted");
      }
      fetchUsers();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Delete failed");
    } finally {
      setBusy(false);
      setConfirmState(null);
    }
  }

  const confirmCopy = {
    one: "This user will be permanently deleted. This can't be undone.",
    many: `${selection.selectedCount} selected user${selection.selectedCount === 1 ? "" : "s"} will be permanently deleted. This can't be undone.`,
    all: `All ${users.length} users will be permanently deleted. This can't be undone.`,
  };

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div className={shared.pageTitleRow}>
          <div className={shared.pageIconChip}><FiUsers size={18} /></div>
          <div>
            <h1 className={shared.pageTitle}>Users</h1>
            <p className={shared.pageSubtitle}>{users.length} total</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={shared.btnGhost} onClick={() => setShowBulkModal(true)}>
            <FiUpload size={14} /> Bulk add (JSON)
          </button>
          <button className={shared.btnPrimary} onClick={() => setShowAddModal(true)}>
            <FiPlus size={15} /> Add user
          </button>
        </div>
      </div>

      <div className={shared.toolbar}>
        <div className={shared.searchBar}>
          <FiSearch size={14} />
          <input
            placeholder="Search by name, email, or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={shared.filterPillRow}>
          {VERIFIED_FILTERS.map((f) => (
            <button
              key={f}
              className={verifiedFilter === f ? shared.filterPillActive : shared.filterPill}
              onClick={() => setVerifiedFilter(f)}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
        <div className={shared.toolbarSpacer} />
        {users.length > 0 && (
          <>
            <button className={shared.btnGhost} onClick={handleExport}>
              <FiDownload size={14} /> Export JSON
            </button>
            <button className={shared.btnGhostDanger} onClick={() => setConfirmState({ type: "all" })}>
              <FiTrash2 size={14} /> Delete all
            </button>
          </>
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
        <div className={shared.loadingWrap}><div className={shared.spin} /> Loading users…</div>
      ) : filtered.length === 0 ? (
        <EmptyUsers hasSearch={!!search || verifiedFilter !== "all"} />
      ) : (
        <div className={shared.tableWrap}>
          <div className={shared.tableScroll}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th className={shared.checkboxCell}>
                    <input
                      type="checkbox"
                      className={shared.checkbox}
                      checked={selection.isAllSelected}
                      ref={(el) => el && (el.indeterminate = selection.isSomeSelected)}
                      onChange={selection.toggleAll}
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Gender</th>
                  <th>Joined</th>
                  <th className={shared.textRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((u) => (
                  <tr key={u._id} className={selection.isSelected(u._id) ? shared.rowSelected : ""}>
                    <td className={shared.checkboxCell}>
                      <input
                        type="checkbox"
                        className={shared.checkbox}
                        checked={selection.isSelected(u._id)}
                        onChange={() => selection.toggleOne(u._id)}
                      />
                    </td>
                    <td>
                      <div className={shared.nameCell}>
                        <div className={shared.avatar}>
                          {u.imageUrl ? <img src={u.imageUrl} alt="" /> : initials(u.username)}
                        </div>
                        <span className={shared.cellStrong}>{u.username}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`${shared.badge} ${ROLE_BADGE[u.role] || shared.badgeNeutral}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.isVerified ? (
                        <span className={`${shared.badge} ${shared.badgeSuccess}`}><FiUserCheck size={11} /> Verified</span>
                      ) : (
                        <span className={`${shared.badge} ${shared.badgeDanger}`}><FiUserX size={11} /> Unverified</span>
                      )}
                    </td>
                    <td className={shared.cellMuted}>{u.gender || "—"}</td>
                    <td className={shared.cellMuted}>{formatDate(u.createdAt)}</td>
                    <td>
                      <div className={shared.rowActions}>
                        <button className={shared.iconBtn} title="Edit user" onClick={() => setEditingUser(u)}>
                          <FiEdit2 size={14} />
                        </button>
                        <button className={shared.iconBtn} title="Change password" onClick={() => setPasswordUser(u)}>
                          <FiKey size={14} />
                        </button>
                        <button
                          className={`${shared.iconBtn} ${shared.iconBtnDanger}`}
                          title="Delete user"
                          onClick={() => setConfirmState({ type: "one", id: u._id })}
                        >
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

      {(showAddModal || editingUser) && (
        <UserFormModal
          mode={editingUser ? "edit" : "add"}
          initialData={editingUser}
          loading={busy}
          onCancel={() => (editingUser ? setEditingUser(null) : setShowAddModal(false))}
          onSave={(data) => handleSaveUser(data, editingUser ? "edit" : "add")}
        />
      )}

      {passwordUser && (
        <PasswordModal
          user={passwordUser}
          loading={busy}
          onCancel={() => setPasswordUser(null)}
          onSave={handleSavePassword}
        />
      )}

      <BulkJsonModal
        open={showBulkModal}
        title="Bulk add users from JSON"
        exampleText={BULK_EXAMPLE}
        loading={busy}
        progressLabel={bulkProgress}
        onCancel={() => setShowBulkModal(false)}
        onSubmit={handleBulkAdd}
      />

      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.type === "all" ? "Delete all users?" : "Delete user(s)?"}
        message={confirmState ? confirmCopy[confirmState.type] : ""}
        confirmLabel="Delete"
        loading={busy}
        onCancel={() => setConfirmState(null)}
        onConfirm={confirmDelete}
      />

      <Toast toast={toast} />
    </div>
  );
}

function EmptyUsers({ hasSearch }) {
  return (
    <div className={shared.emptyState}>
      <FiUsers />
      <p className={shared.emptyTitle}>{hasSearch ? "No matching users" : "No users yet"}</p>
      <p className={shared.emptySubtext}>
        {hasSearch ? "Try a different search term." : "Add your first user to get started."}
      </p>
    </div>
  );
}

function UserFormModal({ mode, initialData, loading, onCancel, onSave }) {
  const [form, setForm] = useState({
    username: initialData?.username || "",
    email: initialData?.email || "",
    password: "",
    gender: initialData?.gender || "",
    role: initialData?.role || "user",
    isVerified: initialData?.isVerified || false,
    imageUrl: initialData?.imageUrl || "",
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };
    if (mode === "edit") delete payload.password; // password changed separately
    onSave(payload);
  }

  return (
    <div className={shared.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={shared.modalWide} role="dialog" aria-modal="true">
        <div className={shared.modalHeader}>
          <h3 className={shared.modalTitle}>{mode === "add" ? "Add user" : `Edit ${initialData?.username}`}</h3>
          <button className={shared.modalCloseBtn} onClick={onCancel}><FiX size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={shared.modalBody}>
            <div className={shared.formGrid}>
              <div className={shared.formGroup}>
                <label className={shared.label}>Username</label>
                <input className={shared.input} required value={form.username}
                  onChange={(e) => set("username", e.target.value)} minLength={4} />
              </div>
              <div className={shared.formGroup}>
                <label className={shared.label}>Email</label>
                <input className={shared.input} type="email" required value={form.email}
                  onChange={(e) => set("email", e.target.value)} />
              </div>
              {mode === "add" && (
                <div className={shared.formGroup}>
                  <label className={shared.label}>Password</label>
                  <input className={shared.input} type="password" required minLength={4}
                    value={form.password} onChange={(e) => set("password", e.target.value)} />
                </div>
              )}
              <div className={shared.formGroup}>
                <label className={shared.label}>Gender</label>
                <select className={shared.select} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">— Select —</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className={shared.formGroup}>
                <label className={shared.label}>Role</label>
                <select className={shared.select} value={form.role} onChange={(e) => set("role", e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className={shared.formGroup}>
                <label className={shared.label}>Profile image URL</label>
                <input className={shared.input} value={form.imageUrl}
                  onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" />
                <div className={styles.avatarPreviewRow}>
                  <div className={styles.avatarPreview}>
                    {form.imageUrl ? <img src={form.imageUrl} alt="" /> : initials(form.username)}
                  </div>
                  <span className={styles.avatarPreviewLabel}>Preview</span>
                </div>
              </div>
              <div className={shared.formGroupFull}>
                <label className={shared.checkboxRow}>
                  <input type="checkbox" className={shared.checkbox} checked={form.isVerified}
                    onChange={(e) => set("isVerified", e.target.checked)} />
                  Mark account as verified
                </label>
              </div>
            </div>
          </div>
          <div className={shared.modalFooter}>
            <button type="button" className={shared.btnGhost} onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="submit" className={shared.btnPrimary} disabled={loading}>
              {loading ? "Saving…" : mode === "add" ? "Add user" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordModal({ user, loading, onCancel, onSave }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && pw !== confirm;

  function handleSubmit(e) {
    e.preventDefault();
    if (pw.length < 4 || mismatch) return;
    onSave(pw);
  }

  return (
    <div className={shared.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={shared.modal} role="dialog" aria-modal="true">
        <div className={shared.modalHeader}>
          <h3 className={shared.modalTitle}>Change password — {user.username}</h3>
          <button className={shared.modalCloseBtn} onClick={onCancel}><FiX size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={shared.modalBody}>
            <div className={shared.formGroup}>
              <label className={shared.label}>New password</label>
              <input className={shared.input} type="password" required minLength={4}
                value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
            </div>
            <div className={shared.formGroup}>
              <label className={shared.label}>Confirm password</label>
              <input className={shared.input} type="password" required value={confirm}
                onChange={(e) => setConfirm(e.target.value)} />
              {mismatch && <span className={shared.hint} style={{ color: "#ef4444" }}>Passwords don't match</span>}
            </div>
          </div>
          <div className={shared.modalFooter}>
            <button type="button" className={shared.btnGhost} onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="submit" className={shared.btnPrimary} disabled={loading || mismatch || pw.length < 4}>
              {loading ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
