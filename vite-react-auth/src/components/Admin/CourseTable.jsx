// src/components/admin/CourseTable.jsx
import { useState, useEffect, useMemo } from "react";
import { FiSearch, FiStar, FiTrash2, FiEdit2, FiAlertTriangle, FiRefreshCw, FiAlertCircle } from "react-icons/fi";
import api from "../../services/api";
import { useAdminSocket } from "../../custom-hooks/useAdminSocket";
import Pagination from "./Pagination";

const PAGE_SIZE = 8;

const isDataFlagged = (c) => {
  const lessons = c.lessonsCount ?? c.lecturesCount ?? 0;
  return lessons < 10 || lessons > 15;
};

export default function CourseTable() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("All Levels");
  const [page, setPage] = useState(1);
  const { subscribe } = useAdminSocket();

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/courses");
        setCourses(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError("Couldn't load courses.");
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    const cleanups = [
      subscribe("course:created", (newCourse) => {
        setCourses((prev) => (prev.some((c) => c._id === newCourse._id) ? prev : [newCourse, ...prev]));
      }),
      subscribe("course:updated", (updatedCourse) => {
        setCourses((prev) => prev.map((c) => (c._id === updatedCourse._id ? { ...c, ...updatedCourse } : c)));
      }),
      subscribe("enrollment:new", ({ courseId }) => {
        setCourses((prev) =>
          prev.map((c) =>
            c._id === courseId
              ? { ...c, studentsEnrolledCount: (c.studentsEnrolledCount || 0) + 1 }
              : c
          )
        );
      }),
    ];
    return () => cleanups.forEach((c) => c());
  }, [subscribe]);

  const categories = useMemo(() => ["All", ...new Set(courses.map((c) => c.category))], [courses]);

  const filtered = useMemo(() => {
    let list = courses;
    if (search) list = list.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
    if (category !== "All") list = list.filter((c) => c.category === category);
    if (level !== "All Levels") list = list.filter((c) => c.level === level);
    return list;
  }, [courses, search, category, level]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleFeatured = async (id, current) => {
    setCourses((prev) => prev.map((c) => (c._id === id ? { ...c, featured: !current } : c))); // optimistic
    try {
      await api.put(`/courses/${id}`, { featured: !current });
    } catch (err) {
      console.error("Failed to toggle featured:", err);
      setCourses((prev) => prev.map((c) => (c._id === id ? { ...c, featured: current } : c))); // revert
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Course Management</h2>
        <span className="admin-panel-count">{filtered.length} courses</span>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <FiSearch className="admin-search-icon" />
          <input className="admin-search" placeholder="Search courses…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="admin-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="admin-select" value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}>
          {["All Levels", "Beginner", "Intermediate", "Advanced"].map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>

      {loading && <p className="admin-panel-count"><FiRefreshCw className="cp-spin" /> Loading courses…</p>}
      {!loading && error && <p className="admin-panel-count"><FiAlertCircle /> {error}</p>}

      {!loading && !error && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Course</th><th>Category / Level</th><th>Students</th><th>Revenue</th><th>Data Quality</th><th>Featured</th><th></th></tr>
              </thead>
              <tbody>
                {pageItems.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar-sm" style={{ background: c.color }}>{c.emoji}</div>
                        <div>
                          <p className="admin-cell-primary">{c.title}</p>
                          <p className="admin-cell-secondary">by {c.instructor?.username || c.instructor}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="admin-cell-primary">{c.category}</p>
                      <p className="admin-cell-secondary">{c.level}</p>
                    </td>
                    <td className="admin-cell-primary">{(c.studentsEnrolledCount || 0).toLocaleString()}</td>
                    <td className="admin-cell-primary">
                      ${((c.price || 0) * (c.studentsEnrolledCount || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td>
                      {isDataFlagged(c)
                        ? <span className="admin-flag-badge"><FiAlertTriangle /> Review</span>
                        : <span className="admin-status-badge verified">OK</span>}
                    </td>
                    <td>
                      <button
                        className={`admin-toggle ${c.featured ? "on" : ""}`}
                        onClick={() => toggleFeatured(c._id, c.featured)}
                        title="Toggle featured"
                      >
                        <FiStar />
                      </button>
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
