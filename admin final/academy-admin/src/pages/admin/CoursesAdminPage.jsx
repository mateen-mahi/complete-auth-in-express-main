// src/pages/admin/CoursesAdminPage.jsx
//
// Covers what was asked: add one course, add many via JSON, delete one /
// many / all. Edit is included too since PUT /courses/:courseId already
// exists and it's cheap to add — remove the edit action if you don't want it.
//
// Note: there's no dedicated "delete all courses" endpoint in your reference
// doc, so "Delete all" here fetches every course then deletes them one by
// one (see coursesApi.removeMany in adminApi.js). Same for "Delete selected".

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  FiBookOpen, FiPlus, FiUpload, FiTrash2, FiEdit2, FiSearch, FiX, FiStar, FiDownload,
} from "react-icons/fi";
import { coursesApi, usersApi } from "../../services/adminApi";
import { useSelection } from "../../custom-hooks/useSelection";
import { useToast } from "../../custom-hooks/useToast";
import { usePagination } from "../../custom-hooks/usePagination";
import { formatDate } from "../../utils/adminFormat";
import { downloadJson } from "../../utils/exportJson";
import Toast from "../../components/admin/Toast";
import ConfirmModal from "../../components/admin/ConfirmModal";
import BulkJsonModal from "../../components/admin/BulkJsonModal";
import Pagination from "../../components/admin/Pagination";
import shared from "../../components/admin/AdminShared.module.css";
import styles from "./CoursesAdminPage.module.css";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const LEVEL_BADGE = {
  Beginner: shared.badgeSuccess,
  Intermediate: shared.badgeWarning,
  Advanced: shared.badgeDanger,
};
const COURSE_COLORS = ["#2563eb", "#16a34a", "#059669", "#d97706", "#7c3aed", "#0891b2", "#1d4ed8", "#be185d"];
const QUICK_EMOJIS = ["📘", "🎨", "💻", "📊", "🧪", "🎓", "🚀", "🧠"];

const BULK_EXAMPLE = `[
  {
    "title": "Intro to React",
    "description": "Build your first components.",
    "category": "Web Development",
    "price": 49,
    "duration": 6,
    "instructor": "<instructorUserId>",
    "level": "Beginner",
    "color": "#2563eb",
    "emoji": "💻"
  }
]`;

export default function CoursesAdminPage() {
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  const { toast, showToast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [coursesRes, usersRes] = await Promise.all([coursesApi.getAll(), usersApi.getAll()]);
      setCourses(coursesRes.data.courses || coursesRes.data.data || coursesRes.data || []);
      const allUsers = usersRes.data.users || usersRes.data.data || usersRes.data || [];
      setInstructors(allUsers.filter((u) => ["instructor", "admin", "super-admin"].includes(u.role)));
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Couldn't load courses");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.trim().toLowerCase();
    return courses.filter(
      (c) => c.title?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q)
    );
  }, [courses, search]);

  const selection = useSelection(filtered, (c) => c._id);
  const pagination = usePagination(filtered, { pageSize: 10, resetKey: search });

  function handleExport() {
    downloadJson(filtered, "courses.json");
  }

  async function handleSaveCourse(formData, mode) {
    setBusy(true);
    try {
      if (mode === "add") {
        await coursesApi.add(formData);
        showToast("success", `${formData.title} was added`);
        setShowAddModal(false);
      } else {
        await coursesApi.update(editingCourse._id, formData);
        showToast("success", "Course updated");
        setEditingCourse(null);
      }
      fetchAll();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Couldn't save course");
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkAdd(records) {
    setBusy(true);
    setBulkProgress(`Adding 0 / ${records.length}…`);
    const { succeeded, failed } = await coursesApi.addMany(records);
    setBusy(false);
    setBulkProgress("");
    setShowBulkModal(false);
    fetchAll();
    showToast(
      failed.length ? "error" : "success",
      failed.length
        ? `Added ${succeeded.length}, ${failed.length} failed (e.g. "${failed[0].error}")`
        : `Added ${succeeded.length} course${succeeded.length === 1 ? "" : "s"}`
    );
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      if (confirmState.type === "one") {
        await coursesApi.remove(confirmState.id);
        showToast("success", "Course deleted");
      } else if (confirmState.type === "many") {
        const { succeeded, failed } = await coursesApi.removeMany(Array.from(selection.selectedIds));
        selection.clear();
        showToast(failed.length ? "error" : "success", failed.length ? `Deleted ${succeeded.length}, ${failed.length} failed` : `Deleted ${succeeded.length} courses`);
      } else if (confirmState.type === "all") {
        const { succeeded, failed } = await coursesApi.removeMany(courses.map((c) => c._id));
        selection.clear();
        showToast(failed.length ? "error" : "success", failed.length ? `Deleted ${succeeded.length}, ${failed.length} failed` : `Deleted all ${succeeded.length} courses`);
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
    one: "This course will be permanently deleted, along with its association to any lectures/quizzes. This can't be undone.",
    many: `${selection.selectedCount} selected course${selection.selectedCount === 1 ? "" : "s"} will be permanently deleted. This can't be undone.`,
    all: `All ${courses.length} courses will be permanently deleted. This can't be undone.`,
  };

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div className={shared.pageTitleRow}>
          <div className={shared.pageIconChip}><FiBookOpen size={18} /></div>
          <div>
            <h1 className={shared.pageTitle}>Courses</h1>
            <p className={shared.pageSubtitle}>{courses.length} total</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={shared.btnGhost} onClick={() => setShowBulkModal(true)}>
            <FiUpload size={14} /> Bulk add (JSON)
          </button>
          <button className={shared.btnPrimary} onClick={() => setShowAddModal(true)}>
            <FiPlus size={15} /> Add course
          </button>
        </div>
      </div>

      <div className={shared.toolbar}>
        <div className={shared.searchBar}>
          <FiSearch size={14} />
          <input placeholder="Search by title or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className={shared.toolbarSpacer} />
        {courses.length > 0 && (
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
        <div className={shared.loadingWrap}><div className={shared.spin} /> Loading courses…</div>
      ) : filtered.length === 0 ? (
        <div className={shared.emptyState}>
          <FiBookOpen />
          <p className={shared.emptyTitle}>{search ? "No matching courses" : "No courses yet"}</p>
          <p className={shared.emptySubtext}>{search ? "Try a different search term." : "Add your first course to get started."}</p>
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
                  <th>Course</th>
                  <th>Category</th>
                  <th>Level</th>
                  <th>Price</th>
                  <th>Enrolled</th>
                  <th>Created</th>
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
                        <div className={styles.courseChip} style={{ background: `${c.color || "#2563eb"}22` }}>
                          {c.emoji || "📘"}
                        </div>
                        <div>
                          <div className={shared.cellStrong}>{c.title}</div>
                          {c.featured && (
                            <span className={`${shared.badge} ${shared.badgeWarning}`} style={{ marginTop: 4 }}>
                              <FiStar size={10} /> Featured
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={shared.cellMuted}>{c.category}</td>
                    <td><span className={`${shared.badge} ${LEVEL_BADGE[c.level] || shared.badgeNeutral}`}>{c.level}</span></td>
                    <td className={styles.priceCell}>${c.price}</td>
                    <td className={shared.cellMuted}>{c.studentsEnrolled?.length ?? 0}</td>
                    <td className={shared.cellMuted}>{formatDate(c.createdAt)}</td>
                    <td>
                      <div className={shared.rowActions}>
                        <button className={shared.iconBtn} title="Edit course" onClick={() => setEditingCourse(c)}>
                          <FiEdit2 size={14} />
                        </button>
                        <button className={`${shared.iconBtn} ${shared.iconBtnDanger}`} title="Delete course"
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

      {(showAddModal || editingCourse) && (
        <CourseFormModal
          mode={editingCourse ? "edit" : "add"}
          initialData={editingCourse}
          instructors={instructors}
          loading={busy}
          onCancel={() => (editingCourse ? setEditingCourse(null) : setShowAddModal(false))}
          onSave={(data) => handleSaveCourse(data, editingCourse ? "edit" : "add")}
        />
      )}

      <BulkJsonModal
        open={showBulkModal}
        title="Bulk add courses from JSON"
        exampleText={BULK_EXAMPLE}
        loading={busy}
        progressLabel={bulkProgress}
        onCancel={() => setShowBulkModal(false)}
        onSubmit={handleBulkAdd}
      />

      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.type === "all" ? "Delete all courses?" : "Delete course(s)?"}
        message={confirmState ? confirmCopy[confirmState.type] : ""}
        loading={busy}
        onCancel={() => setConfirmState(null)}
        onConfirm={confirmDelete}
      />

      <Toast toast={toast} />
    </div>
  );
}

function CourseFormModal({ mode, initialData, instructors, loading, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    category: initialData?.category || "",
    price: initialData?.price ?? 0,
    duration: initialData?.duration ?? 1,
    instructor: initialData?.instructor?._id || initialData?.instructor || "",
    level: initialData?.level || "Beginner",
    color: initialData?.color || COURSE_COLORS[0],
    emoji: initialData?.emoji || QUICK_EMOJIS[0],
    featured: initialData?.featured || false,
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...form, price: Number(form.price), duration: Number(form.duration) });
  }

  return (
    <div className={shared.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={shared.modalWide} role="dialog" aria-modal="true">
        <div className={shared.modalHeader}>
          <h3 className={shared.modalTitle}>{mode === "add" ? "Add course" : `Edit ${initialData?.title}`}</h3>
          <button className={shared.modalCloseBtn} onClick={onCancel}><FiX size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={shared.modalBody}>
            <div className={shared.formGroupFull}>
              <label className={shared.label}>Title</label>
              <input className={shared.input} required value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className={shared.formGroupFull}>
              <label className={shared.label}>Description</label>
              <textarea className={shared.textarea} required value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className={shared.formGrid}>
              <div className={shared.formGroup}>
                <label className={shared.label}>Category</label>
                <input className={shared.input} required value={form.category} onChange={(e) => set("category", e.target.value)} />
              </div>
              <div className={shared.formGroup}>
                <label className={shared.label}>Level</label>
                <select className={shared.select} value={form.level} onChange={(e) => set("level", e.target.value)}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className={shared.formGroup}>
                <label className={shared.label}>Price ($)</label>
                <input className={shared.input} type="number" min={0} required value={form.price} onChange={(e) => set("price", e.target.value)} />
              </div>
              <div className={shared.formGroup}>
                <label className={shared.label}>Duration (hours)</label>
                <input className={shared.input} type="number" min={0} required value={form.duration} onChange={(e) => set("duration", e.target.value)} />
              </div>
              <div className={shared.formGroupFull}>
                <label className={shared.label}>Instructor</label>
                <select className={shared.select} required value={form.instructor} onChange={(e) => set("instructor", e.target.value)}>
                  <option value="">— Select instructor —</option>
                  {instructors.map((i) => <option key={i._id} value={i._id}>{i.username} ({i.role})</option>)}
                </select>
              </div>
              <div className={shared.formGroup}>
                <label className={shared.label}>Card color</label>
                <div className={styles.swatchRow}>
                  {COURSE_COLORS.map((c) => (
                    <button type="button" key={c}
                      className={`${styles.swatch} ${form.color === c ? styles.swatchActive : ""}`}
                      style={{ background: c }} onClick={() => set("color", c)} aria-label={c} />
                  ))}
                </div>
              </div>
              <div className={shared.formGroup}>
                <label className={shared.label}>Emoji</label>
                <input className={shared.input} value={form.emoji} onChange={(e) => set("emoji", e.target.value)} maxLength={4} />
                <div className={styles.emojiRow}>
                  {QUICK_EMOJIS.map((e) => (
                    <button type="button" key={e} className={styles.emojiOption} onClick={() => set("emoji", e)}>{e}</button>
                  ))}
                </div>
              </div>
              <div className={shared.formGroupFull}>
                <label className={shared.checkboxRow}>
                  <input type="checkbox" className={shared.checkbox} checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
                  Feature this course on the homepage
                </label>
              </div>
            </div>
          </div>
          <div className={shared.modalFooter}>
            <button type="button" className={shared.btnGhost} onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="submit" className={shared.btnPrimary} disabled={loading}>
              {loading ? "Saving…" : mode === "add" ? "Add course" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
