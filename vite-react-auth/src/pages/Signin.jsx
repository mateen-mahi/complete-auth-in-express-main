import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/Signin.css";

const Signin = () => {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address.";
    }
    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setApiError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setApiError("");
    setSuccessMsg("");

    try {
<<<<<<< Updated upstream
      const res = await api.post("/signin", {
=======
      const res = await api.post("/users/signin", {
>>>>>>> Stashed changes
        email: formData.email,
        password: formData.password,
      });

      setSuccessMsg(res.data?.message || "Login successful! Redirecting…");

      // This is the actual fix: tell AuthContext to re-check /check-auth
      // RIGHT NOW, using the fresh cookie the backend just set — instead of
      // waiting for some future page load to discover the user is logged in.
      // Without this, ProtectedRoute reads a stale `role: null` and bounces
      // you straight back to /login before the redirect ever gets a chance.
      await refreshAuth();

      setTimeout(() => navigate("/profile"), 1500);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Invalid credentials. Please try again.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-root">
      {/* Background grid */}
      <div className="signin-bg">
        <div className="bg-grid" />
        <div className="bg-glow" />
      </div>

      <div className="signin-wrapper">
        {/* Brand mark */}
        <div className="signin-brand">
          <span className="brand-hex">⬡</span>
          <span className="brand-name">AuthSystem</span>
        </div>

        {/* Card */}
        <div className="signin-card">
          {/* Left accent bar */}
          <div className="card-accent" />

          <div className="card-body">
            <div className="card-header">
              <h2 className="card-title">Welcome back</h2>
              <p className="card-subtitle">
                Sign in to your account to continue
              </p>
            </div>

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

            <form onSubmit={handleSubmit} noValidate className="signin-form">
              {/* Email */}
              <div className={`form-group ${errors.email ? "has-error" : ""}`}>
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <span className="field-error">{errors.email}</span>
                )}
              </div>

              {/* Password */}
              <div className={`form-group ${errors.password ? "has-error" : ""}`}>
                <div className="label-row">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <Link to="/forgot-password" className="forgot-link">
                    Forgot password?
                  </Link>
                </div>
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
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                    autoComplete="current-password"
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
                {errors.password && (
                  <span className="field-error">{errors.password}</span>
                )}
              </div>

              {/* Submit */}
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <span className="btn-loading">
                    <span className="spinner" />
                    Signing in…
                  </span>
                ) : (
                  <span className="btn-content">
                    Sign In
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="divider">
              <span className="divider-line" />
              <span className="divider-text">New here?</span>
              <span className="divider-line" />
            </div>

            {/* Signup CTA */}
            <Link to="/signup" className="signup-cta">
              Create a free account
            </Link>
          </div>
        </div>

        <p className="signin-footer">
          Protected by JWT &amp; secure cookies
        </p>
      </div>
    </div>
  );
};

export default Signin;