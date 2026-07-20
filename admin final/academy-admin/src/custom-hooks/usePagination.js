// src/custom-hooks/usePagination.js
//
// Client-side pagination over an already-loaded array. Pass `resetKey`
// (usually your search string, or a filter value) so the page jumps back
// to 1 whenever the person changes what they're filtering by — otherwise
// they could land on "page 4" of a 1-page result set.

import { useState, useMemo, useEffect } from "react";

export function usePagination(items, { pageSize = 10, resetKey } = {}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    // Deliberately only depends on resetKey, not `items` — resetting on
    // every items change would fight the "jump back after delete" UX.
    // eslint-disable-next-line
  }, [resetKey]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { pageItems, page, setPage, totalPages, totalItems, pageSize };
}
