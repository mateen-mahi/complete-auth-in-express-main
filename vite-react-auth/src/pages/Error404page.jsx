import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Error404page.css";

/* Glitch characters pool */
const GLITCH_CHARS = "!@#$%^&*?/\\|<>[]{}~±§";
const randomChar = () => GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];

/* Hook: scrambles text repeatedly, then settles */
function useScramble(target, duration = 1200, delay = 0) {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    let frame;
    let start = null;
    const totalFrames = Math.floor(duration / 40);
    let elapsed = 0;

    const timeout = setTimeout(() => {
      const tick = (timestamp) => {
        if (!start) start = timestamp;
        elapsed = Math.floor((timestamp - start) / 40);
        const progress = Math.min(elapsed / totalFrames, 1);

        setDisplay(
          target
            .split("")
            .map((char, i) => {
              if (char === " ") return " ";
              if (i / target.length < progress) return char;
              return randomChar();
            })
            .join("")
        );

        if (progress < 1) frame = requestAnimationFrame(tick);
        else setDisplay(target);
      };
      frame = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [target, duration, delay]);

  return display;
}

export default function Error404Page() {
  const navigate = useNavigate();
  const [scanLine, setScanLine] = useState(0);

  /* Scan-line ticker */
  useEffect(() => {
    const id = setInterval(() => {
      setScanLine((p) => (p + 1) % 100);
    }, 16);
    return () => clearInterval(id);
  }, []);

  const title404   = useScramble("404", 900, 100);
  const titleText  = useScramble("PAGE NOT FOUND", 1400, 300);
  const subtitleTx = useScramble("The route you requested does not exist.", 1800, 600);

  return (
    <div className="e4-root">

      {/* ── Background: broken grid ── */}
      <div className="e4-bg" aria-hidden="true">
        <div className="e4-bg__grid" />
        <div className="e4-bg__scanline" style={{ "--pos": `${scanLine}%` }} />
        <div className="e4-bg__glow e4-bg__glow--l" />
        <div className="e4-bg__glow e4-bg__glow--r" />
        {/* Broken grid shards */}
        <div className="e4-shard e4-shard--1" />
        <div className="e4-shard e4-shard--2" />
        <div className="e4-shard e4-shard--3" />
      </div>

      {/* ── Brand ── */}
      <div className="e4-brand">
        <span className="e4-brand__hex" aria-hidden="true">⬡</span>
        <span className="e4-brand__name">AuthSystem</span>
      </div>

      {/* ── Card ── */}
      <div className="e4-card">
        <div className="e4-card__bar" aria-hidden="true" />

        {/* Giant glitchy 404 */}
        <div className="e4-hero" aria-label="404">
          <span className="e4-hero__shadow" aria-hidden="true">404</span>
          <span className="e4-hero__front">{title404}</span>
          <span className="e4-hero__glitch" aria-hidden="true">404</span>
        </div>

        {/* Divider line with noise */}
        <div className="e4-divider" aria-hidden="true">
          <span className="e4-divider__line" />
          <span className="e4-divider__icon">✕</span>
          <span className="e4-divider__line" />
        </div>

        {/* Title + subtitle */}
        <h1 className="e4-title">{titleText}</h1>
        <p className="e4-subtitle">{subtitleTx}</p>

        {/* Status pill */}
        <div className="e4-status">
          <span className="e4-status__dot" aria-hidden="true" />
          <span className="e4-status__text">ERROR_CODE: 0x404 · ROUTE_UNRESOLVED</span>
        </div>

        {/* Action buttons */}
        <div className="e4-actions">
          <button className="e4-btn e4-btn--primary" onClick={() => navigate(-1)}>
            <ArrowLeftIcon />
            Go Back
          </button>
          <Link to="/login" className="e4-btn e4-btn--secondary">
            <HomeIcon />
            Home
          </Link>
        </div>

        {/* Corner decorations */}
        <span className="e4-corner e4-corner--tl" aria-hidden="true" />
        <span className="e4-corner e4-corner--tr" aria-hidden="true" />
        <span className="e4-corner e4-corner--bl" aria-hidden="true" />
        <span className="e4-corner e4-corner--br" aria-hidden="true" />
      </div>

      {/* Footer note */}
      <p className="e4-footer">
        If you think this is a mistake, contact your administrator.
      </p>
    </div>
  );
}

/* ── SVG Icons ────────────────────────────────────────────── */
function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}