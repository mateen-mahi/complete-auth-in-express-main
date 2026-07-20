import { useState, useRef } from "react";
import {
  FiAward, FiDownload, FiEye, FiX,
  FiCalendar, FiBookOpen, FiClock, FiShare2,
  FiCheckCircle, FiLock,
} from "react-icons/fi";
import "../styles/certificate.css";

// ─── Dummy Data ────────────────────────────────────────────
const CERTIFICATES = [
  {
    id: "ACAD-2024-0042",
    course: "Complete React Developer",
    instructor: "Irfan Malik",
    completedAt: "June 14, 2026",
    duration: "24h 30m",
    lessons: 142,
    grade: "A+",
    score: 96,
    emoji: "⚛️",
    color: "#2563eb",
    earned: true,
  },
  {
    id: "ACAD-2024-0038",
    course: "CSS Mastery & Modern Layouts",
    instructor: "Hina Baig",
    completedAt: "May 28, 2026",
    duration: "10h 20m",
    lessons: 62,
    grade: "A",
    score: 91,
    emoji: "🎨",
    color: "#7c3aed",
    earned: true,
  },
  {
    id: "ACAD-2024-0031",
    course: "Git & GitHub for Developers",
    instructor: "Hamza Siddiq",
    completedAt: "April 10, 2026",
    duration: "6h 00m",
    lessons: 38,
    grade: "A+",
    score: 98,
    emoji: "🐙",
    color: "#be185d",
    earned: true,
  },
];

const LOCKED = [
  { course: "Node.js & Express Bootcamp",    progress: 40, emoji: "🟢", color: "#16a34a" },
  { course: "JavaScript Algorithms & DSA",   progress: 55, emoji: "🧠", color: "#d97706" },
  { course: "MongoDB — The Complete Guide",  progress: 20, emoji: "🍃", color: "#059669" },
];

const GRADE_COLOR = {
  "A+": { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  "A":  { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  "B+": { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
};

// ══════════════════════════════════════════════════════════
export default function Certificate() {
  const [viewing, setViewing] = useState(null); // cert being previewed
  const printRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="cert-page">

      {/* ── Header ── */}
      <div className="cert-header">
        <div>
          <h1 className="cert-title">My Certificates</h1>
          <p className="cert-subtitle">
            You've earned <strong>{CERTIFICATES.length}</strong> certificate{CERTIFICATES.length !== 1 ? "s" : ""} — keep completing courses to earn more.
          </p>
        </div>
        <div className="cert-header-badge">
          <FiAward />
          <span>{CERTIFICATES.length} Earned</span>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="cert-stats">
        {[
          { label: "Certificates",  value: CERTIFICATES.length,    color: "#2563eb" },
          { label: "Avg. Score",    value: Math.round(CERTIFICATES.reduce((a, c) => a + c.score, 0) / CERTIFICATES.length) + "%", color: "#16a34a" },
          { label: "In Progress",   value: LOCKED.length,          color: "#d97706" },
          { label: "Total Hours",   value: "40h+",                 color: "#8b5cf6" },
        ].map((s) => (
          <div key={s.label} className="cert-stat" style={{ "--sc": s.color }}>
            <span className="cert-stat-value">{s.value}</span>
            <span className="cert-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Earned Certificates ── */}
      <section className="cert-section">
        <h2 className="cert-section-title"><FiCheckCircle className="cert-section-icon earned" /> Earned</h2>
        <div className="cert-grid">
          {CERTIFICATES.map((cert) => {
            const gc = GRADE_COLOR[cert.grade] || GRADE_COLOR["A"];
            return (
              <div key={cert.id} className="cert-card" style={{ "--cc": cert.color }}>

                {/* Top banner */}
                <div className="cert-card-banner" style={{ background: `linear-gradient(135deg, ${cert.color}22, ${cert.color}40)`, borderBottom: `3px solid ${cert.color}` }}>
                  <span className="cert-card-emoji">{cert.emoji}</span>
                  <span className="cert-card-grade" style={{ background: gc.bg, color: gc.color, border: `1px solid ${gc.border}` }}>
                    {cert.grade}
                  </span>
                </div>

                {/* Body */}
                <div className="cert-card-body">
                  <p className="cert-card-course">{cert.course}</p>
                  <p className="cert-card-instructor">by {cert.instructor}</p>

                  <div className="cert-card-meta">
                    <span><FiCalendar /> {cert.completedAt}</span>
                    <span><FiBookOpen /> {cert.lessons} lessons</span>
                    <span><FiClock /> {cert.duration}</span>
                  </div>

                  {/* Score bar */}
                  <div className="cert-score-row">
                    <span className="cert-score-label">Score</span>
                    <div className="cert-score-track">
                      <div className="cert-score-fill" style={{ width: `${cert.score}%`, background: cert.color }} />
                    </div>
                    <span className="cert-score-val" style={{ color: cert.color }}>{cert.score}%</span>
                  </div>

                  <p className="cert-id">ID: {cert.id}</p>
                </div>

                {/* Footer */}
                <div className="cert-card-footer">
                  <button className="cert-btn-view" onClick={() => setViewing(cert)}>
                    <FiEye /> View
                  </button>
                  <button className="cert-btn-download" style={{ background: cert.color }} onClick={() => setViewing(cert)}>
                    <FiDownload /> Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Locked / In Progress ── */}
      <section className="cert-section">
        <h2 className="cert-section-title"><FiLock className="cert-section-icon locked" /> In Progress</h2>
        <div className="cert-locked-grid">
          {LOCKED.map((c) => (
            <div key={c.course} className="cert-locked-card">
              <div className="cert-locked-emoji" style={{ background: c.color + "18" }}>{c.emoji}</div>
              <div className="cert-locked-info">
                <p className="cert-locked-name">{c.course}</p>
                <div className="cert-locked-bar-row">
                  <div className="cert-locked-track">
                    <div className="cert-locked-fill" style={{ width: `${c.progress}%`, background: c.color }} />
                  </div>
                  <span className="cert-locked-pct" style={{ color: c.color }}>{c.progress}%</span>
                </div>
                <p className="cert-locked-hint">Complete the course to unlock your certificate.</p>
              </div>
              <FiLock className="cert-locked-icon" />
            </div>
          ))}
        </div>
      </section>

      {/* ══ CERTIFICATE PREVIEW MODAL ══ */}
      {viewing && (
        <div className="cert-modal-overlay" onClick={() => setViewing(null)}>
          <div className="cert-modal" onClick={(e) => e.stopPropagation()}>

            {/* Modal toolbar */}
            <div className="cert-modal-toolbar">
              <span className="cert-modal-toolbar-title">Certificate Preview</span>
              <div className="cert-modal-toolbar-actions">
                <button className="cert-toolbar-btn" onClick={handlePrint} title="Download / Print">
                  <FiDownload /> Download
                </button>
                <button className="cert-toolbar-btn share" title="Share">
                  <FiShare2 /> Share
                </button>
                <button className="cert-toolbar-close" onClick={() => setViewing(null)}>
                  <FiX />
                </button>
              </div>
            </div>

            {/* The actual certificate */}
            <div className="cert-modal-scroll">
              <div className="cert-document" ref={printRef} id="certificate-print">

                {/* Corner ornaments */}
                <div className="cert-corner cert-corner-tl" />
                <div className="cert-corner cert-corner-tr" />
                <div className="cert-corner cert-corner-bl" />
                <div className="cert-corner cert-corner-br" />

                {/* Header */}
                <div className="cert-doc-header">
                  <div className="cert-doc-logo">🎓</div>
                  <p className="cert-doc-org">Academy</p>
                  <p className="cert-doc-tagline">Certificate of Completion</p>
                </div>

                {/* Divider */}
                <div className="cert-doc-divider">
                  <div className="cert-doc-line" style={{ background: viewing.color }} />
                  <div className="cert-doc-diamond" style={{ background: viewing.color }} />
                  <div className="cert-doc-line" style={{ background: viewing.color }} />
                </div>

                {/* Body */}
                <div className="cert-doc-body">
                  <p className="cert-doc-presents">This is to certify that</p>
                  <h1 className="cert-doc-name">Muhammad Mateen Usman</h1>
                  <p className="cert-doc-has">has successfully completed the course</p>
                  <h2 className="cert-doc-course" style={{ color: viewing.color }}>{viewing.course}</h2>
                  <p className="cert-doc-instructor">Instructed by <strong>{viewing.instructor}</strong></p>
                </div>

                {/* Stats row */}
                <div className="cert-doc-stats">
                  <div className="cert-doc-stat">
                    <span className="cert-doc-stat-val">{viewing.score}%</span>
                    <span className="cert-doc-stat-label">Final Score</span>
                  </div>
                  <div className="cert-doc-stat-div" />
                  <div className="cert-doc-stat">
                    <span className="cert-doc-stat-val">{viewing.grade}</span>
                    <span className="cert-doc-stat-label">Grade</span>
                  </div>
                  <div className="cert-doc-stat-div" />
                  <div className="cert-doc-stat">
                    <span className="cert-doc-stat-val">{viewing.lessons}</span>
                    <span className="cert-doc-stat-label">Lessons</span>
                  </div>
                  <div className="cert-doc-stat-div" />
                  <div className="cert-doc-stat">
                    <span className="cert-doc-stat-val">{viewing.duration}</span>
                    <span className="cert-doc-stat-label">Duration</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="cert-doc-footer">
                  <div className="cert-doc-sig">
                    <div className="cert-doc-sig-line" style={{ background: viewing.color }} />
                    <p className="cert-doc-sig-name">{viewing.instructor}</p>
                    <p className="cert-doc-sig-role">Course Instructor</p>
                  </div>

                  <div className="cert-doc-seal" style={{ borderColor: viewing.color, color: viewing.color }}>
                    <FiAward className="cert-seal-icon" />
                    <span>Verified</span>
                  </div>

                  <div className="cert-doc-sig">
                    <div className="cert-doc-sig-line" style={{ background: viewing.color }} />
                    <p className="cert-doc-sig-name">Academy Admin</p>
                    <p className="cert-doc-sig-role">Director of Education</p>
                  </div>
                </div>

                {/* Certificate ID + date */}
                <div className="cert-doc-meta">
                  <span>Issued: {viewing.completedAt}</span>
                  <span>Certificate ID: {viewing.id}</span>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}