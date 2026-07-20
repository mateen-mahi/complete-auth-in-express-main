// src/components/admin/Pagination.jsx
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const maxButtons = 5;
  let start = Math.max(1, page - Math.floor(maxButtons / 2));
  let end   = Math.min(totalPages, start + maxButtons - 1);
  start     = Math.max(1, end - maxButtons + 1);

  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="admin-pagination">
      <button className="admin-page-btn" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        <FiChevronLeft />
      </button>

      {start > 1 && <span className="admin-page-ellipsis">…</span>}

      {pages.map((p) => (
        <button
          key={p}
          className={`admin-page-btn ${p === page ? "active" : ""}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}

      {end < totalPages && <span className="admin-page-ellipsis">…</span>}

      <button className="admin-page-btn" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
        <FiChevronRight />
      </button>
    </div>
  );
}
