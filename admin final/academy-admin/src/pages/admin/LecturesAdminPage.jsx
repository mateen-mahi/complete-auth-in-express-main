// src/pages/admin/LecturesAdminPage.jsx
//
// Course is picked from a dropdown (by title) and its _id is attached
// automatically — you never type an id by hand in the single-add form.
// A quiz can optionally be linked as a reference too (see adminApi's
// LECTURE_QUIZ_FIELD assumption — your lectureSchema doesn't show this
// field yet, so double check the payload key matches once you add it).
//
// No global "delete all lectures" endpoint exists (only delete-by-course),
// so "Delete all" here fetches every lecture and deletes them one by one.

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  FiVideo, FiPlus, FiUpload, FiTrash2, FiEdit2, FiSearch, FiX, FiHelpCircle, FiDownload, FiFilm,
} from "react-icons/fi";
import { lecturesApi, coursesApi, quizzesApi } from "../../services/adminApi";
import { useSelection } from "../../custom-hooks/useSelection";
import { useToast } from "../../custom-hooks/useToast";
import { usePagination } from "../../custom-hooks/usePagination";
import { formatDate, resolveCourseId, youtubeThumbUrl } from "../../utils/adminFormat";
import { downloadJson } from "../../utils/exportJson";
import Toast from "../../components/admin/Toast";
import ConfirmModal from "../../components/admin/ConfirmModal";
import BulkJsonModal from "../../components/admin/BulkJsonModal";
import Pagination from "../../components/admin/Pagination";
import shared from "../../components/admin/AdminShared.module.css";
import styles from "./LecturesAdminPage.module.css";

const BULK_EXAMPLE = `[
  {
    "title": "Component Lifecycle",
    "description": "useEffect and cleanup functions.",
    "videoId": "dQw4w9WgXcQ",
    "duration": 720,
    "course": "Intro to React",
    "quiz": "<quizId or leave blank>"
  }
]
// "course" can be the course's exact title (matched for you)
// or a raw course _id — either works for bulk import.`;

export default function LecturesAdminPage() {
  const [lectures, setLectures] = useState([]);
  const [courses, setCourses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  const { toast, showToast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [lecRes, courseRes, quizRes] = await Promise.all([
        lecturesApi.getAll(), coursesApi.getAll(), quizzesApi.getAll(),
      ]);
      setLectures(lecRes.data.lectures || lecRes.data.data || lecRes.data || []);
      setCourses(courseRes.data.courses || courseRes.data.data || courseRes.data || []);
      setQuizzes(quizRes.data.quizzes || quizRes.data.data || quizRes.data || []);
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Couldn't load lectures");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const courseNameById = useMemo(() => {
    const map = {};
    courses.forEach((c) => { map[c._id] = c.title; });
    return map;
  }, [courses]);

  const quizTitleById = useMemo(() => {
    const map = {};
    quizzes.forEach((q) => { map[q._id] = q.title; });
    return map;
  }, [quizzes]);

  const filtered = useMemo(() => {
    if (!search.trim()) return lectures;
    const q = search.trim().toLowerCase();
    return lectures.filter((l) => {
      const courseId = l.course?._id || l.course;
      return l.title?.toLowerCase().includes(q) || (courseNameById[courseId] || "").toLowerCase().includes(q);
    });
  }, [lectures, search, courseNameById]);

  const selection = useSelection(filtered, (l) => l._id);
  const pagination = usePagination(filtered, { pageSize: 10, resetKey: search });

  function handleExport() {
    downloadJson(filtered, "lectures.json");
  }

  async function handleSave(formData, mode) {
    setBusy(true);
    try {
      if (mode === "add") {
        await lecturesApi.add(formData);
        showToast("success", `${formData.title} was added`);
        setShowAddModal(false);
      } else {
        await lecturesApi.update(editingLecture._id, formData);
        showToast("success", "Lecture updated");
        setEditingLecture(null);
      }
      fetchAll();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Couldn't save lecture");
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkAdd(records) {
    setBusy(true);
    setBulkProgress(`Adding 0 / ${records.length}…`);
    const resolved = records.map((r) => ({ ...r, course: resolveCourseId(r.course, courses) }));
    const missingCourse = resolved.filter((r) => !r.course);
    if (missingCourse.length > 0) {
      setBusy(false);
      setBulkProgress("");
      showToast("error", `${missingCourse.length} record(s) reference a course that couldn't be matched — check titles/ids`);
      return;
    }
    const { succeeded, failed } = await lecturesApi.addMany(resolved);
    setBusy(false);
    setBulkProgress("");
    setShowBulkModal(false);
    fetchAll();
    showToast(
      failed.length ? "error" : "success",
      failed.length ? `Added ${succeeded.length}, ${failed.length} failed (e.g. "${failed[0].error}")` : `Added ${succeeded.length} lecture${succeeded.length === 1 ? "" : "s"}`
    );
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      if (confirmState.type === "one") {
        await lecturesApi.remove(confirmState.id);
        showToast("success", "Lecture deleted");
      } else if (confirmState.type === "many") {
        const { succeeded, failed } = await lecturesApi.removeMany(Array.from(selection.selectedIds));
        selection.clear();
        showToast(failed.length ? "error" : "success", failed.length ? `Deleted ${succeeded.length}, ${failed.length} failed` : `Deleted ${succeeded.length} lectures`);
      } else if (confirmState.type === "all") {
        const { succeeded, failed } = await lecturesApi.removeMany(lectures.map((l) => l._id));
        selection.clear();
        showToast(failed.length ? "error" : "success", failed.length ? `Deleted ${succeeded.length}, ${failed.length} failed` : `Deleted all ${succeeded.length} lectures`);
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
    one: "This lecture will be permanently deleted. This can't be undone.",
    many: `${selection.selectedCount} selected lecture${selection.selectedCount === 1 ? "" : "s"} will be permanently deleted. This can't be undone.`,
    all: `All ${lectures.length} lectures will be permanently deleted. This can't be undone.`,
  };

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div className={shared.pageTitleRow}>
          <div className={shared.pageIconChip}><FiVideo size={18} /></div>
          <div>
            <h1 className={shared.pageTitle}>Lectures</h1>
            <p className={shared.pageSubtitle}>{lectures.length} total</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={shared.btnGhost} onClick={() => setShowBulkModal(true)}>
            <FiUpload size={14} /> Bulk add (JSON)
          </button>
          <button className={shared.btnPrimary} onClick={() => setShowAddModal(true)} disabled={courses.length === 0}>
            <FiPlus size={15} /> Add lecture
          </button>
        </div>
      </div>

      {courses.length === 0 && !loading && (
        <p className={shared.hint} style={{ marginBottom: 12 }}>You'll need at least one course before adding lectures.</p>
      )}

      <div className={shared.toolbar}>
        <div className={shared.searchBar}>
          <FiSearch size={14} />
          <input placeholder="Search by title or course…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className={shared.toolbarSpacer} />
        {lectures.length > 0 && (
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
        <div className={shared.loadingWrap}><div className={shared.spin} /> Loading lectures…</div>
      ) : filtered.length === 0 ? (
        <div className={shared.emptyState}>
          <FiVideo />
          <p className={shared.emptyTitle}>{search ? "No matching lectures" : "No lectures yet"}</p>
          <p className={shared.emptySubtext}>{search ? "Try a different search term." : "Add your first lecture to get started."}</p>
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
                  <th>Lecture</th>
                  <th>Course</th>
                  <th>Linked quiz</th>
                  <th>Duration</th>
                  <th>Created</th>
                  <th className={shared.textRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((l) => {
                  const courseId = l.course?._id || l.course;
                  const quizId = l.quiz?._id || l.quiz;
                  const thumb = youtubeThumbUrl(l.videoId);
                  return (
                    <tr key={l._id} className={selection.isSelected(l._id) ? shared.rowSelected : ""}>
                      <td className={shared.checkboxCell}>
                        <input type="checkbox" className={shared.checkbox} checked={selection.isSelected(l._id)} onChange={() => selection.toggleOne(l._id)} />
                      </td>
                      <td>
                        <div className={shared.nameCell}>
                          {thumb ? (
                            <img className={styles.videoThumb} src={thumb} alt="" />
                          ) : (
                            <div className={styles.videoThumbPlaceholder}><FiFilm size={13} /></div>
                          )}
                          <span className={shared.cellStrong}>{l.title}</span>
                        </div>
                      </td>
                      <td className={shared.cellMuted}>{courseNameById[courseId] || "—"}</td>
                      <td>
                        {quizId ? (
                          <span className={`${shared.badge} ${shared.badgeInfo}`}><FiHelpCircle size={11} /> {quizTitleById[quizId] || "Linked"}</span>
                        ) : (
                          <span className={shared.cellMuted}>—</span>
                        )}
                      </td>
                      <td className={shared.cellMuted}>{Math.round((l.duration || 0) / 60)} min</td>
                      <td className={shared.cellMuted}>{formatDate(l.createdAt)}</td>
                      <td>
                        <div className={shared.rowActions}>
                          <button className={shared.iconBtn} title="Edit lecture" onClick={() => setEditingLecture(l)}>
                            <FiEdit2 size={14} />
                          </button>
                          <button className={`${shared.iconBtn} ${shared.iconBtnDanger}`} title="Delete lecture"
                            onClick={() => setConfirmState({ type: "one", id: l._id })}>
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {(showAddModal || editingLecture) && (
        <LectureFormModal
          mode={editingLecture ? "edit" : "add"}
          initialData={editingLecture}
          courses={courses}
          quizzes={quizzes}
          loading={busy}
          onCancel={() => (editingLecture ? setEditingLecture(null) : setShowAddModal(false))}
          onSave={(data) => handleSave(data, editingLecture ? "edit" : "add")}
        />
      )}

      <BulkJsonModal
        open={showBulkModal}
        title="Bulk add lectures from JSON"
        exampleText={BULK_EXAMPLE}
        loading={busy}
        progressLabel={bulkProgress}
        onCancel={() => setShowBulkModal(false)}
        onSubmit={handleBulkAdd}
      />

      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.type === "all" ? "Delete all lectures?" : "Delete lecture(s)?"}
        message={confirmState ? confirmCopy[confirmState.type] : ""}
        loading={busy}
        onCancel={() => setConfirmState(null)}
        onConfirm={confirmDelete}
      />

      <Toast toast={toast} />
    </div>
  );
}

function LectureFormModal({ mode, initialData, courses, quizzes, loading, onCancel, onSave }) {
  const initialCourseId = initialData?.course?._id || initialData?.course || "";
  const [form, setForm] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    videoId: initialData?.videoId || "",
    duration: initialData?.duration ?? 0,
    course: initialCourseId,
    quiz: initialData?.quiz?._id || initialData?.quiz || "",
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Only offer quizzes that belong to the selected course, once one's picked
  const quizOptions = form.course
    ? quizzes.filter((q) => (q.courseId?._id || q.courseId) === form.course)
    : quizzes;

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...form, duration: Number(form.duration) });
  }

  return (
    <div className={shared.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={shared.modalWide} role="dialog" aria-modal="true">
        <div className={shared.modalHeader}>
          <h3 className={shared.modalTitle}>{mode === "add" ? "Add lecture" : `Edit ${initialData?.title}`}</h3>
          <button className={shared.modalCloseBtn} onClick={onCancel}><FiX size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={shared.modalBody}>
            <div className={shared.formGroupFull}>
              <label className={shared.label}>Course</label>
              <select className={shared.select} required value={form.course} onChange={(e) => set("course", e.target.value)}>
                <option value="">— Select course —</option>
                {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
              <span className={shared.hint}>The course's ID is attached automatically.</span>
            </div>
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
                <label className={shared.label}>Video ID / URL</label>
                <input className={shared.input} required value={form.videoId} onChange={(e) => set("videoId", e.target.value)} />
                {youtubeThumbUrl(form.videoId) && (
                  <div className={styles.videoPreviewRow}>
                    <img className={styles.videoThumb} src={youtubeThumbUrl(form.videoId)} alt="" />
                    <span className={styles.videoPreviewLabel}>Preview</span>
                  </div>
                )}
              </div>
              <div className={shared.formGroup}>
                <label className={shared.label}>Duration (seconds)</label>
                <input className={shared.input} type="number" min={0} required value={form.duration} onChange={(e) => set("duration", e.target.value)} />
              </div>
              <div className={shared.formGroupFull}>
                <label className={shared.label}>Linked quiz (optional)</label>
                <select className={shared.select} value={form.quiz} onChange={(e) => set("quiz", e.target.value)}>
                  <option value="">— No quiz linked —</option>
                  {quizOptions.map((q) => <option key={q._id} value={q._id}>{q.title}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className={shared.modalFooter}>
            <button type="button" className={shared.btnGhost} onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="submit" className={shared.btnPrimary} disabled={loading}>
              {loading ? "Saving…" : mode === "add" ? "Add lecture" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
