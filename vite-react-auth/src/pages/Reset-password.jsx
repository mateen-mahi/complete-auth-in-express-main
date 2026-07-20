import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../services/api";
import "../styles/Reset-password.css";

const ResetPassword = () => {
  const navigate = useNavigate();
  const {token} = useParams();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.password) {
      newErrors.password = "New password is required.";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password.";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setApiError("");
  };

  const getPasswordStrength = (password) => {
    if (!password) return null;
    if (password.length < 6) return { label: "Weak", level: 1 };
    if (password.length < 10) return { label: "Fair", level: 2 };
    if (
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^a-zA-Z0-9]/.test(password)
    )
      return { label: "Strong", level: 4 };
    return { label: "Good", level: 3 };
  };

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!token) {
      setApiError("Reset token is missing or invalid. Please request a new reset link.");
      return;
    }

    setLoading(true);
    setApiError("");
    setSuccessMsg("");

    try {
      const res = await api.post(`/users/reset-password?token=${token}`, {
        password: formData.password,
      });

      setSuccessMsg(
        res.data?.message || "Password reset successfully! Redirecting to login…"
      );
      setResetDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Something went wrong. Your reset link may have expired.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rp-root">
      {/* Background */}
      <div className="rp-bg">
        <div className="rp-bg-rings">
          <div className="ring r1" />
          <div className="ring r2" />
          <div className="ring r3" />
        </div>
        <div className="rp-bg-glow" />
      </div>

      <div className="rp-wrapper">
        {/* Brand */}
        <div className="rp-brand">
          <span className="brand-hex">⬡</span>
          <span className="brand-name">AuthSystem</span>
        </div>

        <div className="rp-card">
          {/* Top gradient bar */}
          <div className="rp-card-bar" />

          <div className="rp-card-body">
            {/* Icon */}
            <div className={`rp-icon-wrap ${resetDone ? "done" : ""}`}>
              {resetDone ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
            </div>

            <div className="rp-header">
              <h2 className="rp-title">
                {resetDone ? "All done!" : "Set new password"}
              </h2>
              <p className="rp-subtitle">
                {resetDone
                  ? "Your password has been reset. Redirecting you to login…"
                  : "Choose a strong password you haven't used before."}
              </p>
            </div>

            {/* No token warning */}
            {!token && !resetDone && (
              <div className="alert alert-warning" role="alert">
                <span className="alert-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </span>
                No reset token found. Please use the link sent to your email.
              </div>
            )}

            {apiError && (
              <div className="alert alert-error" role="alert">
                <span className="alert-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                {apiError}
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success" role="alert">
                <span className="alert-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {successMsg}
              </div>
            )}

            {!resetDone && (
              <form onSubmit={handleSubmit} noValidate className="rp-form">
                {/* New Password */}
                <div className={`form-group ${errors.password ? "has-error" : ""}`}>
                  <label htmlFor="password" className="form-label">
                    New Password
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Min. 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                      className="form-input"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {strength && (
                    <div className="strength-row">
                      <div className="strength-bars">
                        {[1, 2, 3, 4].map((lvl) => (
                          <div
                            key={lvl}
                            className={`strength-bar ${lvl <= strength.level ? `level-${strength.level}` : ""}`}
                          />
                        ))}
                      </div>
                      <span className={`strength-label level-${strength.level}`}>
                        {strength.label}
                      </span>
                    </div>
                  )}

                  {errors.password && (
                    <span className="field-error">{errors.password}</span>
                  )}
                </div>

                {/* Confirm Password */}
                <div className={`form-group ${errors.confirmPassword ? "has-error" : ""}`}>
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm New Password
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    </span>
                    <input
                      type={showConfirm ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder="Re-enter your new password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="form-input"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirm((p) => !p)}
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirm ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Match indicator */}
                  {formData.confirmPassword && (
                    <div className={`match-indicator ${formData.password === formData.confirmPassword ? "match" : "no-match"}`}>
                      <span className="match-dot" />
                      {formData.password === formData.confirmPassword
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </div>
                  )}

                  {errors.confirmPassword && (
                    <span className="field-error">{errors.confirmPassword}</span>
                  )}
                </div>

                {/* Password rules hint */}
                <div className="password-rules">
                  <p className="rules-title">Password must have:</p>
                  <ul className="rules-list">
                    {[
                      { rule: "At least 6 characters", met: formData.password.length >= 6 },
                      { rule: "One uppercase letter", met: /[A-Z]/.test(formData.password) },
                      { rule: "One number", met: /[0-9]/.test(formData.password) },
                      { rule: "One special character", met: /[^a-zA-Z0-9]/.test(formData.password) },
                    ].map(({ rule, met }) => (
                      <li key={rule} className={`rule-item ${formData.password ? (met ? "met" : "unmet") : ""}`}>
                        <span className="rule-dot" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading || !token}
                >
                  {loading ? (
                    <span className="btn-loading">
                      <span className="spinner" />
                      Resetting Password…
                    </span>
                  ) : (
                    <span className="btn-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Reset Password
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* Back to login */}
            <div className="rp-back">
              <Link to="/login" className="back-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>

        <p className="rp-footer">Reset links expire after 15 minutes</p>
      </div>
    </div>
  );
};

export default ResetPassword;