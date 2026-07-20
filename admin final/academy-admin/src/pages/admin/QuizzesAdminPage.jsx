// src/pages/admin/QuizzesAdminPage.jsx
//
// Same pattern as Lectures: course picked from a dropdown, questions built
// with a small inline editor (each question needs 2+ options and a marked
// correct answer, matching your quizSchema validation).
//
// No global "delete all quizzes" endpoint exists (only delete-by-course),
// so "Delete all" fetches every quiz and deletes them one by one.

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  FiHelpCircle, FiPlus, FiUpload, FiTrash2, FiEdit2, FiSearch, FiX, FiTrash, FiDownload,
} from "react-icons/fi";
import { quizzesApi, coursesApi } from "../../services/adminApi";
import { useSelection } from "../../custom-hooks/useSelection";
import { useToast } from "../../custom-hooks/useToast";
import { usePagination } from "../../custom-hooks/usePagination";
import { formatDate, resolveCourseId } from "../../utils/adminFormat";
import { downloadJson } from "../../utils/exportJson";
import Toast from "../../components/admin/Toast";
import ConfirmModal from "../../components/admin/ConfirmModal";
import BulkJsonModal from "../../components/admin/BulkJsonModal";
import Pagination from "../../components/admin/Pagination";
import shared from "../../components/admin/AdminShared.module.css";
import styles from "./QuizzesAdminPage.module.css";

const BULK_EXAMPLE = `[
  {
    "title": "React Basics Check",
    "subject": "Web Development",
    "totalTime": 10,
    "courseId": "Intro to React",
    "questions": [
      {
        "question": "What hook manages state?",
        "options": ["useEffect", "useState", "useRef"],
        "correctAnswer": 1
      }
    ]
  }
]
// "courseId" can be the course's exact title (matched for you) or a raw id.`;

const emptyQuestion = () => ({ question: "", options: ["", ""], correctAnswer: 0 });

export default function QuizzesAdminPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  const { toast, showToast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [quizRes, courseRes] = await Promise.all([quizzesApi.getAll(), coursesApi.getAll()]);
      setQuizzes(quizRes.data.quizzes || quizRes.data.data || quizRes.data || []);
      setCourses(courseRes.data.courses || courseRes.data.data || courseRes.data || []);
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Couldn't load quizzes");
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

  const filtered = useMemo(() => {
    if (!search.trim()) return quizzes;
    const q = search.trim().toLowerCase();
    return quizzes.filter((qz) => qz.title?.toLowerCase().includes(q) || qz.subject?.toLowerCase().includes(q));
  }, [quizzes, search]);

  const selection = useSelection(filtered, (q) => q._id);
  const pagination = usePagination(filtered, { pageSize: 10, resetKey: search });

  function handleExport() {
    downloadJson(filtered, "quizzes.json");
  }

  async function handleSave(formData, mode) {
    setBusy(true);
    try {
      if (mode === "add") {
        await quizzesApi.add(formData);
        showToast("success", `${formData.title} was added`);
        setShowAddModal(false);
      } else {
        await quizzesApi.update(editingQuiz._id, formData);
        showToast("success", "Quiz updated");
        setEditingQuiz(null);
      }
      fetchAll();
    } catch (err) {
      showToast("error", err?.response?.data?.message || "Couldn't save quiz");
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkAdd(records) {
    setBusy(true);
    setBulkProgress(`Adding 0 / ${records.length}…`);
    const resolved = records.map((r) => ({ ...r, courseId: resolveCourseId(r.courseId, courses) }));
    const missingCourse = resolved.filter((r) => !r.courseId);
    if (missingCourse.length > 0) {
      setBusy(false);
      setBulkProgress("");
      showToast("error", `${missingCourse.length} record(s) reference a course that couldn't be matched — check titles/ids`);
      return;
    }
    const { succeeded, failed } = await quizzesApi.addMany(resolved);
    setBusy(false);
    setBulkProgress("");
    setShowBulkModal(false);
    fetchAll();
    showToast(
      failed.length ? "error" : "success",
      failed.length ? `Added ${succeeded.length}, ${failed.length} failed (e.g. "${failed[0].error}")` : `Added ${succeeded.length} quiz${succeeded.length === 1 ? "" : "zes"}`
    );
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      if (confirmState.type === "one") {
        await quizzesApi.remove(confirmState.id);
        showToast("success", "Quiz deleted");
      } else if (confirmState.type === "many") {
        const { succeeded, failed } = await quizzesApi.removeMany(Array.from(selection.selectedIds));
        selection.clear();
        showToast(failed.length ? "error" : "success", failed.length ? `Deleted ${succeeded.length}, ${failed.length} failed` : `Deleted ${succeeded.length} quizzes`);
      } else if (confirmState.type === "all") {
        const { succeeded, failed } = await quizzesApi.removeMany(quizzes.map((q) => q._id));
        selection.clear();
        showToast(failed.length ? "error" : "success", failed.length ? `Deleted ${succeeded.length}, ${failed.length} failed` : `Deleted all ${succeeded.length} quizzes`);
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
    one: "This quiz will be permanently deleted. This can't be undone.",
    many: `${selection.selectedCount} selected quiz${selection.selectedCount === 1 ? "" : "zes"} will be permanently deleted. This can't be undone.`,
    all: `All ${quizzes.length} quizzes will be permanently deleted. This can't be undone.`,
  };

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div className={shared.pageTitleRow}>
          <div className={shared.pageIconChip}><FiHelpCircle size={18} /></div>
          <div>
            <h1 className={shared.pageTitle}>Quizzes</h1>
            <p className={shared.pageSubtitle}>{quizzes.length} total</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={shared.btnGhost} onClick={() => setShowBulkModal(true)}>
            <FiUpload size={14} /> Bulk add (JSON)
          </button>
          <button className={shared.btnPrimary} onClick={() => setShowAddModal(true)} disabled={courses.length === 0}>
            <FiPlus size={15} /> Add quiz
          </button>
        </div>
      </div>

      <div className={shared.toolbar}>
        <div className={shared.searchBar}>
          <FiSearch size={14} />
          <input placeholder="Search by title or subject…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className={shared.toolbarSpacer} />
        {quizzes.length > 0 && (
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
        <div className={shared.loadingWrap}><div className={shared.spin} /> Loading quizzes…</div>
      ) : filtered.length === 0 ? (
        <div className={shared.emptyState}>
          <FiHelpCircle />
          <p className={shared.emptyTitle}>{search ? "No matching quizzes" : "No quizzes yet"}</p>
          <p className={shared.emptySubtext}>{search ? "Try a different search term." : "Add your first quiz to get started."}</p>
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
                  <th>Quiz</th>
                  <th>Course</th>
                  <th>Questions</th>
                  <th>Time limit</th>
                  <th>Created</th>
                  <th className={shared.textRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((q) => {
                  const courseId = q.courseId?._id || q.courseId;
                  return (
                    <tr key={q._id} className={selection.isSelected(q._id) ? shared.rowSelected : ""}>
                      <td className={shared.checkboxCell}>
                        <input type="checkbox" className={shared.checkbox} checked={selection.isSelected(q._id)} onChange={() => selection.toggleOne(q._id)} />
                      </td>
                      <td>
                        <div className={shared.cellStrong}>{q.title}</div>
                        <div className={shared.cellMuted} style={{ fontSize: 12 }}>{q.subject}</div>
                      </td>
                      <td className={shared.cellMuted}>{courseNameById[courseId] || "—"}</td>
                      <td><span className={`${shared.badge} ${shared.badgeNeutral}`}>{q.questions?.length ?? 0} questions</span></td>
                      <td className={shared.cellMuted}>{q.totalTime} min</td>
                      <td className={shared.cellMuted}>{formatDate(q.createdAt)}</td>
                      <td>
                        <div className={shared.rowActions}>
                          <button className={shared.iconBtn} title="Edit quiz" onClick={() => setEditingQuiz(q)}>
                            <FiEdit2 size={14} />
                          </button>
                          <button className={`${shared.iconBtn} ${shared.iconBtnDanger}`} title="Delete quiz"
                            onClick={() => setConfirmState({ type: "one", id: q._id })}>
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

      {(showAddModal || editingQuiz) && (
        <QuizFormModal
          mode={editingQuiz ? "edit" : "add"}
          initialData={editingQuiz}
          courses={courses}
          loading={busy}
          onCancel={() => (editingQuiz ? setEditingQuiz(null) : setShowAddModal(false))}
          onSave={(data) => handleSave(data, editingQuiz ? "edit" : "add")}
        />
      )}

      <BulkJsonModal
        open={showBulkModal}
        title="Bulk add quizzes from JSON"
        exampleText={BULK_EXAMPLE}
        loading={busy}
        progressLabel={bulkProgress}
        onCancel={() => setShowBulkModal(false)}
        onSubmit={handleBulkAdd}
      />

      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.type === "all" ? "Delete all quizzes?" : "Delete quiz(zes)?"}
        message={confirmState ? confirmCopy[confirmState.type] : ""}
        loading={busy}
        onCancel={() => setConfirmState(null)}
        onConfirm={confirmDelete}
      />

      <Toast toast={toast} />
    </div>
  );
}

function QuizFormModal({ mode, initialData, courses, loading, onCancel, onSave }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [totalTime, setTotalTime] = useState(initialData?.totalTime ?? 10);
  const [courseId, setCourseId] = useState(initialData?.courseId?._id || initialData?.courseId || "");
  const [questions, setQuestions] = useState(
    initialData?.questions?.length ? initialData.questions.map((q) => ({ ...q })) : [emptyQuestion()]
  );

  function updateQuestion(qIndex, patch) {
    setQuestions((qs) => qs.map((q, i) => (i === qIndex ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex, oIndex, value) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIndex) return q;
        const options = q.options.map((o, j) => (j === oIndex ? value : o));
        return { ...q, options };
      })
    );
  }

  function addOption(qIndex) {
    setQuestions((qs) => qs.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ""] } : q)));
  }

  function removeOption(qIndex, oIndex) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.options.length <= 2) return q; // schema requires >= 2 options
        const options = q.options.filter((_, j) => j !== oIndex);
        const correctAnswer = q.correctAnswer >= options.length ? 0 : q.correctAnswer;
        return { ...q, options, correctAnswer };
      })
    );
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
  }

  function removeQuestion(qIndex) {
    setQuestions((qs) => (qs.length <= 1 ? qs : qs.filter((_, i) => i !== qIndex)));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      title,
      subject,
      totalTime: Number(totalTime),
      courseId,
      questions: questions.map((q) => ({ ...q, correctAnswer: Number(q.correctAnswer) })),
    });
  }

  return (
    <div className={shared.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={shared.modalWide} role="dialog" aria-modal="true">
        <div className={shared.modalHeader}>
          <h3 className={shared.modalTitle}>{mode === "add" ? "Add quiz" : `Edit ${initialData?.title}`}</h3>
          <button className={shared.modalCloseBtn} onClick={onCancel}><FiX size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={shared.modalBody}>
            <div className={shared.formGroupFull}>
              <label className={shared.label}>Course</label>
              <select className={shared.select} required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">— Select course —</option>
                {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
            <div className={shared.formGrid}>
              <div className={shared.formGroup}>
                <label className={shared.label}>Title</label>
                <input className={shared.input} required value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className={shared.formGroup}>
                <label className={shared.label}>Subject</label>
                <input className={shared.input} required value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className={shared.formGroupFull}>
                <label className={shared.label}>Time limit (minutes)</label>
                <input className={shared.input} type="number" min={1} required value={totalTime} onChange={(e) => setTotalTime(e.target.value)} style={{ maxWidth: 140 }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 0 10px" }}>
              <span className={styles.questionCount}><FiHelpCircle size={13} /> {questions.length} question{questions.length === 1 ? "" : "s"}</span>
              <button type="button" className={`${shared.btnGhost} ${shared.btnSm}`} onClick={addQuestion}>
                <FiPlus size={13} /> Add question
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div key={qIndex} className={styles.questionCard}>
                <div className={styles.questionCardHeader}>
                  <span className={styles.questionNumber}>Question {qIndex + 1}</span>
                  {questions.length > 1 && (
                    <button type="button" className={styles.removeOptionBtn} onClick={() => removeQuestion(qIndex)} title="Remove question">
                      <FiTrash size={13} />
                    </button>
                  )}
                </div>
                <input
                  className={shared.input}
                  style={{ marginBottom: 10 }}
                  placeholder="Question text"
                  required
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                />
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className={styles.optionRow}>
                    <input
                      type="radio"
                      className={styles.optionRadio}
                      name={`correct-${qIndex}`}
                      checked={Number(q.correctAnswer) === oIndex}
                      onChange={() => updateQuestion(qIndex, { correctAnswer: oIndex })}
                      title="Mark as correct answer"
                    />
                    <input
                      className={styles.optionInput}
                      placeholder={`Option ${oIndex + 1}`}
                      required
                      value={opt}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    />
                    {q.options.length > 2 && (
                      <button type="button" className={styles.removeOptionBtn} onClick={() => removeOption(qIndex, oIndex)} title="Remove option">
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className={styles.addOptionBtn} onClick={() => addOption(qIndex)}>
                  + Add option
                </button>
              </div>
            ))}
          </div>
          <div className={shared.modalFooter}>
            <button type="button" className={shared.btnGhost} onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="submit" className={shared.btnPrimary} disabled={loading}>
              {loading ? "Saving…" : mode === "add" ? "Add quiz" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
