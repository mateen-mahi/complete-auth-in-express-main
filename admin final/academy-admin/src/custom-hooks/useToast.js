// src/custom-hooks/useToast.js
//
// Minimal toast state — pair with components/admin/Toast.jsx.
// Usage:
//   const { toast, showToast } = useToast();
//   showToast("success", "User added");
//   showToast("error", "Couldn't delete 2 of 5 users");
//   <Toast toast={toast} />

import { useState, useCallback, useRef } from "react";

export function useToast(autoHideMs = 3500) {
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'info', message }
  const timerRef = useRef(null);

  const showToast = useCallback(
    (type, message) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ type, message });
      timerRef.current = setTimeout(() => setToast(null), autoHideMs);
    },
    [autoHideMs]
  );

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}
