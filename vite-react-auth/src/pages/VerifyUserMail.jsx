import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "../styles/VerifyUserMail.css";

const AgainSendOtp = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); 
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Sanitize input data before making the API request
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      await axios.post(
        "/verify-user",
        { email: cleanEmail }, // Send clean payload
        { withCredentials: true }
      );
      
      setStatus("success");
    } catch (err) {
      setStatus("error");
      
      // Safe fallback that reads both Object or Plain String payloads perfectly
      const fallbackMsg = "We couldn't send the code. Check the email and try again.";
      const errorPayload = err?.response?.data;
      
      setErrorMsg(
        typeof errorPayload === "object" && errorPayload?.message
          ? errorPayload.message
          : typeof errorPayload === "string"
          ? errorPayload
          : fallbackMsg
      );
    }
  };

  // Safe navigation side-effect to prevent memory leak updates
  useEffect(() => {
    if (status !== "success") return;

    const timer = setTimeout(() => {
      navigate("/verify-otp", { state: { email: email.trim() } });
      
    }, 1400);

    return () => clearTimeout(timer); // Clean up timeout if component unmounts
  }, [status, navigate, email]);

  return (
    <div className="otp-page">
      <div className="otp-page__brand">
        <span className="otp-page__brand-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://w3.org">
            <path d="M12 2 L20 5.5 V11 C20 16 16.5 19.8 12 21 C7.5 19.8 4 16 4 11 V5.5 L12 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </span>
        AuthSystem
      </div>

      <div className="otp-card">
        <div className="otp-card__topbar" />
        <div className="otp-card__body">
          <div className="otp-card__icon-wrap">
            <span className="otp-card__icon-pulse" />
            <span className="otp-card__icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://w3.org">
                <path d="M12 2 L20 5.5 V11 C20 16 16.5 19.8 12 21 C7.5 19.8 4 16 4 11 V5.5 L12 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M9 12.2 L11.2 14.4 L15.5 9.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>

          <h1 className="otp-card__title">Verify Your Account</h1>
          <p className="otp-card__subtitle">Enter the email on your account and we'll send a fresh verification code to confirm it's really you.</p>

          {status === "success" ? (
            <div className="otp-card__success" role="status">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://w3.org">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 12.5 L10.5 15 L16 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <strong>Code sent.</strong>
                <span>Check {email} — taking you to verification…</span>
              </div>
            </div>
          ) : (
            <form className="otp-form" onSubmit={handleSubmit} noValidate>
              <label className="otp-form__label" htmlFor="email">Email address</label>
              <div className={`otp-form__input-wrap ${status === "error" ? "is-error" : ""}`}>
                <svg className="otp-form__input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://w3.org">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M3.5 6.5 L12 13 L20.5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  autoComplete="email"
                  required
                />
              </div>

              {status === "error" && <p className="otp-form__error" role="alert">{errorMsg}</p>}

              <button type="submit" className="otp-form__submit" disabled={status === "loading"}>
                {status === "loading" ? <><span className="otp-form__spinner" /> Sending code…</> : "Resend Verification Code"}
              </button>
            </form>
          )}

          <Link to="/login" className="otp-card__back">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://w3.org">
              <path d="M15 18 L9 12 L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Sign In
          </Link>
        </div>
      </div>
      <p className="otp-page__footnote">Verification codes expire after 10 minutes.</p>
    </div>
  );
};

export default AgainSendOtp;
