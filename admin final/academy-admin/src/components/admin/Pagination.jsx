// src/components/admin/Pagination.jsx
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import shared from "./AdminShared.module.css";

export default function Pagination({ page, setPage, totalPages, totalItems, pageSize }) {
  if (totalItems === 0 || totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  // Compact page-number list: first, last, current ±1, with "…" gaps
  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <div className={shared.pagination}>
      <span className={shared.paginationInfo}>
        Showing {start}–{end} of {totalItems}
      </span>
      <div className={shared.paginationControls}>
        <button
          className={shared.paginationBtn}
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <FiChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} style={{ padding: "0 4px", color: "#94a3b8", fontSize: 12.5 }}>…</span>
          ) : (
            <button
              key={p}
              className={p === page ? shared.paginationBtnActive : shared.paginationBtn}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className={shared.paginationBtn}
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
