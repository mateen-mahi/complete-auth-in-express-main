// src/components/admin/QuizTable.jsx
import { useState, useEffect, useMemo } from "react";
import { FiSearch, FiRefreshCw, FiAlertCircle } from "react-icons/fi";
import api from "../../services/api";
import Pagination from "./Pagination";

const PAGE_SIZE = 8;

export default function QuizTable() {
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [quizRes, courseRes] = await Promise.all([
          api.get("/quizzes"),
          api.get("/courses"),
        ]);
        setQuizzes(quizRes.data.data || []);
        setCourses(courseRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch quizzes:", err);
        setError("Couldn't load quizzes.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let list = quizzes;
    if (search) list = list.filter((q) => q.title.toLowerCase().includes(search.toLowerCase()));
    if (courseFilter !== "All") list = list.filter((q) => (q.courseId?._id || q.courseId) === courseFilter);
    return list;
  }, [quizzes, search, courseFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const courseTitleFor = (q) => q.courseId?.title || courses.find((c) => c._id === (q.courseId?._id || q.courseId))?.title || "—";

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Quiz Management</h2>
        <span className="admin-panel-count">{filtered.length} quizzes</span>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <FiSearch className="admin-search-icon" />
          <input className="admin-search" placeholder="Search quizzes…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="admin-select" value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}>
          <option value="All">All Courses</option>
          {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
        </select>
      </div>

      {loading && <p className="admin-panel-count"><FiRefreshCw className="cp-spin" /> Loading quizzes…</p>}
      {!loading && error && <p className="admin-panel-count"><FiAlertCircle /> {error}</p>}

      {!loading && !error && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Quiz</th><th>Course</th><th>Questions</th><th>Total Time</th></tr>
              </thead>
              <tbody>
                {pageItems.map((q) => (
                  <tr key={q._id}>
                    <td className="admin-cell-primary">{q.title}</td>
                    <td className="admin-cell-secondary">{courseTitleFor(q)}</td>
                    <td className="admin-cell-secondary">{q.questions?.length ?? q.questionCount ?? "—"}</td>
                    <td className="admin-cell-secondary">{q.totalTime}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Avg score / pass rate / attempt count columns removed — those need a
          QuizAttempt model + submit-endpoint that doesn't exist yet. */}
    </div>
  );
}
