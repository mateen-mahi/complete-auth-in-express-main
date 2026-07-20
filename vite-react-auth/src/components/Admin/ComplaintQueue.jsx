// src/components/admin/ComplaintQueue.jsx
import { useState, useEffect, useMemo } from "react";
import { FiSearch, FiClock, FiUsers, FiRefreshCw, FiAlertCircle } from "react-icons/fi";
import api from "../../services/api";
import { useAdminSocket } from "../../custom-hooks/useAdminSocket";
import Pagination from "./Pagination";

const PAGE_SIZE = 8;
const STATUS_CLASS = { pending: "unverified", "in progress": "info", resolved: "verified" };
const SLA_DAYS = 3;

const daysAgo = (dateStr) => Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));

export default function ComplaintQueue() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);
  const { subscribe } = useAdminSocket();

  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/complaints/all-complaints");
        setComplaints(res.data.complaints || []);
      } catch (err) {
        console.error("Failed to fetch complaints:", err);
        setError("Couldn't load complaints.");
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  // Live: new complaint anywhere on the platform → prepend
  // Live: status changed (by this admin OR another admin in another tab) → sync in place
  useEffect(() => {
    const cleanups = [
      subscribe("complaint:new", (newComplaint) => {
        setComplaints((prev) => (prev.some((c) => c._id === newComplaint._id) ? prev : [
          { ...newComplaint, username: newComplaint.userId?.username || "User" },
          ...prev,
        ]));
      }),
      subscribe("complaint:statusChanged", (updated) => {
        setComplaints((prev) => prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
      }),
    ];
    return () => cleanups.forEach((c) => c());
  }, [subscribe]);

  const repeatUserIds = useMemo(() => {
    const counts = {};
    complaints.forEach((c) => {
      const uid = c.userId?._id || c.userId;
      counts[uid] = (counts[uid] || 0) + 1;
    });
    return new Set(Object.keys(counts).filter((id) => counts[id] >= 3));
  }, [complaints]);

  const filtered = useMemo(() => {
    let list = complaints;
    if (search) {
      list = list.filter(
        (c) => c.subject.toLowerCase().includes(search.toLowerCase()) ||
               (c.username || c.userId?.username || "").toLowerCase().includes(search.toLowerCase())
      );
    }
    if (status !== "All") list = list.filter((c) => c.status === status);
    return list;
  }, [complaints, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Real API call — this is the actual PUT you built in complaint.controller.js
  const updateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    const previous = complaints.find((c) => c._id === id)?.status;
    setComplaints((prev) => prev.map((c) => (c._id === id ? { ...c, status: newStatus } : c))); // optimistic
    try {
      await api.put(`/complaints/update-status/${id}`, { status: newStatus });
    } catch (err) {
      console.error("Failed to update complaint status:", err);
      setComplaints((prev) => prev.map((c) => (c._id === id ? { ...c, status: previous } : c))); // revert
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Complaints Management</h2>
        <span className="admin-panel-count">{filtered.length} complaints</span>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <FiSearch className="admin-search-icon" />
          <input className="admin-search" placeholder="Search subject or user…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="admin-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {["All", "pending", "in progress", "resolved"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading && <p className="admin-panel-count"><FiRefreshCw className="cp-spin" /> Loading complaints…</p>}
      {!loading && error && <p className="admin-panel-count"><FiAlertCircle /> {error}</p>}

      {!loading && !error && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Subject</th><th>User</th><th>Status</th><th>Age</th><th>Update</th></tr>
              </thead>
              <tbody>
                {pageItems.map((c) => {
                  const age = daysAgo(c.createdAt);
                  const slaBreach = c.status === "pending" && age > SLA_DAYS;
                  const uid = c.userId?._id || c.userId;
                  const uname = c.username || c.userId?.username || "User";
                  return (
                    <tr key={c._id}>
                      <td className="admin-cell-primary">{c.subject}</td>
                      <td>
                        {uname}
                        {repeatUserIds.has(uid) && (
                          <span className="admin-flag-badge" style={{ marginLeft: 8 }}><FiUsers /> Repeat</span>
                        )}
                      </td>
                      <td><span className={`admin-status-badge ${STATUS_CLASS[c.status]}`}>{c.status}</span></td>
                      <td>
                        {age}d
                        {slaBreach && <span className="admin-flag-badge" style={{ marginLeft: 8 }}><FiClock /> SLA</span>}
                      </td>
                      <td>
                        <select
                          className="admin-select-sm"
                          value={c.status}
                          disabled={updatingId === c._id}
                          onChange={(e) => updateStatus(c._id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="in progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
