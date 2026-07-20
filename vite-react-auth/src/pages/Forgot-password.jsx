import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import "../styles/Forgot-password.css";

export default function ForgotPassword() {
  const navigate = useNavigate();

  /* ── State ─────────────────────────────────────────── */
  const [email, setEmail]         = useState("");
  const [fieldError, setFieldError] = useState("");
  const [apiError, setApiError]   = useState("");
  const [success, setSuccess]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [sent, setSent]           = useState(false);   // icon transitions to ✓

  /* ── Validation ─────────────────────────────────────── */
  const validateEmail = (val) => {
    if (!val.trim())              return "Email address is required.";
    if (!/\S+@\S+\.\S+/.test(val)) return "Please enter a valid email address.";
    return "";
  };

  /* ── Handlers ───────────────────────────────────────── */
  const handleChange = (e) => {
    setEmail(e.target.value);
    // Clear errors as the user types
    if (fieldError) setFieldError("");
    if (apiError)   setApiError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const err = validateEmail(email);
    if (err) { setFieldError(err); return; }

    setLoading(true);
    setApiError("");
    setSuccess("");

    try {
      await api.post("/users/forgot-password", { email: email.trim().toLowerCase() });

      setSent(true);
      setSuccess("Reset link sent! Check your inbox (Or spam folder).");

      // Redirect to login after 3 s
      setTimeout(() => navigate("/login"), 3000);

    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        "Something went wrong. Please try again.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-root">

      {/* Decorative background — diagonal mesh */}
      <div className="fp-bg" aria-hidden="true">
        <div className="fp-bg__mesh" />
        <div className="fp-bg__glow fp-bg__glow--tl" />
        <div className="fp-bg__glow fp-bg__glow--br" />
      </div>

      {/* Brand mark */}
      <div className="fp-brand">
        <span className="fp-brand__hex" aria-hidden="true">⬡</span>
        <span className="fp-brand__name">AuthSystem</span>
      </div>

      {/* Card */}
      <div className="fp-card">

        {/* Shimmer accent bar */}
        <div className="fp-card__bar" aria-hidden="true" />

        {/* Icon */}
        <div className={`fp-icon${sent ? " fp-icon--success" : ""}`} aria-hidden="true">
          {sent
            ? <CheckIcon />
            : <MailIcon />
          }
          <span className="fp-icon__ring" />
        </div>

        {/* Headings */}
        <h1 className="fp-title">Forgot Password?</h1>
        <p className="fp-subtitle">
          Enter your email and we'll send you a secure link to reset your password.
        </p>

        {/* Alerts */}
        {apiError && (
          <div className="fp-alert fp-alert--error" role="alert">
            <AlertIcon /> {apiError}
          </div>
        )}
        {success && (
          <div className="fp-alert fp-alert--success" role="status">
            <SuccessCheckIcon /> {success}
          </div>
        )}

        {/* Form */}
        <form className="fp-form" onSubmit={handleSubmit} noValidate>

          <div className="fp-field">
            <label htmlFor="fp-email" className="fp-label">Email Address</label>
            <div className={`fp-input-wrapper${fieldError ? " fp-input-wrapper--error" : ""}`}>
              <span className="fp-input-icon" aria-hidden="true">
                <EnvelopeIcon />
              </span>
              <input
                id="fp-email"
                type="email"
                className="fp-input"
                placeholder="you@example.com"
                value={email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading || sent}
                aria-describedby={fieldError ? "fp-email-error" : undefined}
              />
            </div>
            {fieldError && (
              <span id="fp-email-error" className="fp-field-error" role="alert">
                {fieldError}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="fp-btn"
            disabled={loading || sent}
          >
            {loading
              ? <><span className="fp-spinner" aria-hidden="true" /> Sending…</>
              : sent
                ? "Link Sent!"
                : "Send Reset Link"
            }
          </button>

        </form>

        {/* Back link */}
        <Link to="/login" className="fp-back">
          <ArrowLeftIcon />
          Back to Sign In
        </Link>
      </div>

      {/* Footer note */}
      <p className="fp-footer-note">Reset links expire after 15 minutes.</p>
    </div>
  );
}

/* ── Inline SVG helpers (zero external deps) ───────────────── */

function MailIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function SuccessCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         style={{ flexShrink: 0 }}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}