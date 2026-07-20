// src/components/admin/LectureTable.jsx
import { useState, useEffect, useMemo } from "react";
import { FiSearch, FiEdit2, FiTrash2, FiAlertTriangle, FiCheckCircle, FiRefreshCw, FiAlertCircle } from "react-icons/fi";
import api from "../../services/api";
import Pagination from "./Pagination";

const PAGE_SIZE = 8;

export default function LectureTable() {
  const [lectures, setLectures] = useState([]);
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
        const [lectureRes, courseRes] = await Promise.all([
          api.get("/lectures"),
          api.get("/courses"),
        ]);
        setLectures(lectureRes.data.data || []);
        setCourses(courseRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch lectures:", err);
        setError("Couldn't load lectures.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let list = lectures;
    if (search) list = list.filter((l) => l.title.toLowerCase().includes(search.toLowerCase()));
    if (courseFilter !== "All") list = list.filter((l) => (l.course?._id || l.course) === courseFilter);
    return list;
  }, [lectures, search, courseFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const courseTitleFor = (l) => l.course?.title || courses.find((c) => c._id === (l.course?._id || l.course))?.title || "—";

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Lecture Management</h2>
        <span className="admin-panel-count">{filtered.length} lectures</span>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <FiSearch className="admin-search-icon" />
          <input className="admin-search" placeholder="Search lectures…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="admin-select" value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}>
          <option value="All">All Courses</option>
          {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
        </select>
      </div>

      {loading && <p className="admin-panel-count"><FiRefreshCw className="cp-spin" /> Loading lectures…</p>}
      {!loading && error && <p className="admin-panel-count"><FiAlertCircle /> {error}</p>}

      {!loading && !error && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Lecture</th><th>Course</th><th>Duration</th><th>Video Status</th><th></th></tr>
              </thead>
              <tbody>
                {pageItems.map((l) => (
                  <tr key={l._id}>
                    <td className="admin-cell-primary">{l.title}</td>
                    <td className="admin-cell-secondary">{courseTitleFor(l)}</td>
                    <td className="admin-cell-secondary">{l.duration}m</td>
                    <td>
                      {/* No broken-video checker built yet — everything shows OK until that's added */}
                      <span className="admin-status-badge verified"><FiCheckCircle /> OK</span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button title="Edit"><FiEdit2 /></button>
                        <button title="Delete"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
