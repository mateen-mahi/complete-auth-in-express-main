// src/custom-hooks/useSelection.js
//
// Generic row-selection state for admin tables. Works with any list of
// items as long as you tell it how to read an id off each item.

import { useState, useMemo, useCallback } from "react";

export function useSelection(items, getId = (item) => item._id) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const allIds = useMemo(() => items.map(getId), [items, getId]);

  const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

  const toggleOne = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = allIds.length > 0 && allIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(allIds);
    });
  }, [allIds]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected,
    toggleOne,
    toggleAll,
    clear,
    isAllSelected,
    isSomeSelected,
  };
}
