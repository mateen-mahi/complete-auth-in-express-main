// src/components/admin/BulkJsonModal.jsx
//
// Bulk-add modal: paste a JSON array OR upload a .json file, preview how
// many records were parsed, then hand the array back to the caller via
// onSubmit(parsedArray). The caller is responsible for actually POSTing
// each item (see adminApi.runBulk) and reporting per-item results.

import { useState, useRef } from "react";
import { FiX, FiUpload, FiClipboard, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import shared from "./AdminShared.module.css";

export default function BulkJsonModal({
  open,
  title = "Bulk add from JSON",
  exampleText,
  loading = false,
  progressLabel,
  onSubmit,
  onCancel,
}) {
  const [mode, setMode] = useState("paste"); // 'paste' | 'upload'
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [parsed, setParsed] = useState(null);
  const fileInputRef = useRef(null);

  if (!open) return null;

  function tryParse(text) {
    setParseError("");
    setParsed(null);
    if (!text.trim()) return;
    try {
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : [data];
      if (arr.length === 0) {
        setParseError("That JSON parsed fine, but the array is empty.");
        return;
      }
      setParsed(arr);
    } catch (err) {
      setParseError(`Couldn't parse JSON: ${err.message}`);
    }
  }

  function handleRawChange(e) {
    const text = e.target.value;
    setRaw(text);
    tryParse(text);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target.result || "");
      setRaw(text);
      tryParse(text);
    };
    reader.onerror = () => setParseError("Couldn't read that file.");
    reader.readAsText(file);
  }

  function handleClose() {
    setRaw("");
    setFileName("");
    setParseError("");
    setParsed(null);
    setMode("paste");
    onCancel();
  }

  function handleSubmit() {
    if (!parsed || parsed.length === 0) return;
    onSubmit(parsed);
  }

  return (
    <div className={shared.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={shared.modalWide} role="dialog" aria-modal="true">
        <div className={shared.modalHeader}>
          <h3 className={shared.modalTitle}>{title}</h3>
          <button className={shared.modalCloseBtn} onClick={handleClose} aria-label="Close">
            <FiX size={16} />
          </button>
        </div>

        <div className={shared.modalBody}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              className={mode === "paste" ? shared.btnPrimary : shared.btnGhost}
              onClick={() => setMode("paste")}
            >
              <FiClipboard size={14} /> Paste JSON
            </button>
            <button
              type="button"
              className={mode === "upload" ? shared.btnPrimary : shared.btnGhost}
              onClick={() => setMode("upload")}
            >
              <FiUpload size={14} /> Upload file
            </button>
          </div>

          {mode === "paste" ? (
            <div className={shared.formGroup}>
              <label className={shared.label}>Paste a JSON array of records</label>
              <textarea
                className={shared.textarea}
                style={{ minHeight: 220, fontFamily: "monospace", fontSize: 12.5 }}
                placeholder={exampleText}
                value={raw}
                onChange={handleRawChange}
                spellCheck={false}
              />
            </div>
          ) : (
            <div className={shared.formGroup}>
              <label className={shared.label}>Upload a .json file</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "1.5px dashed #e2e8f0",
                  borderRadius: 12,
                  padding: "28px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "#f8fafc",
                }}
              >
                <FiUpload size={22} style={{ color: "#94a3b8", marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13, color: "#374151", fontWeight: 600 }}>
                  {fileName || "Click to choose a .json file"}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#94a3b8" }}>
                  Must be a JSON array of records
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFile}
                style={{ display: "none" }}
              />
            </div>
          )}

          {exampleText && mode === "upload" && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 12, color: "#64748b", cursor: "pointer" }}>
                Show expected format
              </summary>
              <pre className={shared.mono} style={{ marginTop: 8, color: "#374151", whiteSpace: "pre-wrap" }}>
                {exampleText}
              </pre>
            </details>
          )}

          {parseError && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, color: "#ef4444", fontSize: 12.5 }}>
              <FiAlertCircle size={15} /> {parseError}
            </div>
          )}
          {parsed && !parseError && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, color: "#16a34a", fontSize: 12.5, fontWeight: 600 }}>
              <FiCheckCircle size={15} /> Parsed {parsed.length} record{parsed.length === 1 ? "" : "s"} — ready to submit
            </div>
          )}
          {loading && progressLabel && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: "#2563eb" }}>{progressLabel}</div>
          )}
        </div>

        <div className={shared.modalFooter}>
          <button className={shared.btnGhost} onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={shared.btnPrimary}
            onClick={handleSubmit}
            disabled={loading || !parsed || parsed.length === 0}
          >
            {loading ? "Adding…" : `Add ${parsed ? parsed.length : ""} record${parsed && parsed.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
