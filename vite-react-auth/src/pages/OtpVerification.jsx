import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import api from "../services/api";
import "../styles/OtpVerification.css";

const OTP_LENGTH = 6;

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email; 


  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [apiError, setApiError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

      useEffect(() => {
    if (!email) {
      navigate("/signup", { replace: true });
    }
  }, [email, navigate]);





  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, ""); // digits only
    if (!val) return;

    const newOtp = [...otp];

    // Handle paste of full OTP
    if (val.length > 1) {
      const digits = val.slice(0, OTP_LENGTH).split("");
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = val;
    setOtp(newOtp);
    setApiError("");

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      const newOtp = [...otp];
      if (otp[index]) {
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newOtp = [...otp];
    pasted.split("").forEach((d, i) => { newOtp[i] = d; });
    setOtp(newOtp);
    const nextFocus = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextFocus]?.focus();
    setApiError("");
  };

  const handleFocus = (e) => e.target.select();

  const otpValue = otp.join("");
  const isComplete = otpValue.length === OTP_LENGTH;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isComplete) {
      setApiError("Please enter all 6 digits of your OTP.");
      return;
    }

    setLoading(true);
    setApiError("");
    setSuccessMsg("");



    try {
      const res = await api.post("/users/verify-user", { email, otp: otpValue });
      setSuccessMsg(res.data?.message || "Email verified successfully! Redirecting…");
      setVerified(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Invalid or expired OTP. Please try again.";
      setApiError(msg);
      // Shake effect — clear OTP on wrong code
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg("");
    setApiError("");

    try {
      const res = await api.post("/users/send-verify-otp", { email });
      setResendMsg(res.data?.message || "A new OTP has been sent to your email.");
      setCountdown(60);
      setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to resend OTP. Please try again.";
      setApiError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="otp-root">
      {/* Background */}
      <div className="otp-bg">
        <div className="otp-bg-dots" />
        <div className="otp-glow otp-glow-top" />
        <div className="otp-glow otp-glow-bottom" />
      </div>

      <div className="otp-wrapper">
        {/* Brand */}
        <div className="otp-brand">
          <span className="brand-hex">⬡</span>
          <span className="brand-name">AuthSystem</span>
        </div>

        <div className="otp-card">
          {/* Top bar */}
          <div className="otp-card-bar" />

          <div className="otp-card-body">
            {/* Icon */}
            <div className={`otp-icon-wrap ${verified ? "done" : ""}`}>
              {verified ? (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              )}
            </div>

            {/* Header */}
            <div className="otp-header">
              <h2 className="otp-title">
                {verified ? "Verified!" : "Check your email"}
              </h2>
              <p className="otp-subtitle">
                {verified
                  ? "Your account has been verified. Redirecting to login…"
                  : "We sent a 6-digit code to your email address. Enter it below to verify your account."}
              </p>
            </div>

            {/* Alerts */}
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

            {resendMsg && !apiError && (
              <div className="alert alert-info" role="alert">
                <span className="alert-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                {resendMsg}
              </div>
            )}

            {!verified && (
              <form onSubmit={handleSubmit} noValidate className="otp-form">
                {/* OTP Inputs */}
                <div className="otp-inputs-label">Enter 6-digit code</div>
                <div
                  className={`otp-inputs ${apiError ? "shake" : ""}`}
                  onPaste={handlePaste}
                >
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleChange(e, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onFocus={handleFocus}
                      className={`otp-box ${digit ? "filled" : ""}`}
                      aria-label={`OTP digit ${index + 1}`}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>

                {/* Progress dots */}
                <div className="otp-progress">
                  {otp.map((digit, i) => (
                    <div key={i} className={`progress-dot ${digit ? "active" : ""}`} />
                  ))}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading || !isComplete}
                >
                  {loading ? (
                    <span className="btn-loading">
                      <span className="spinner" />
                      Verifying…
                    </span>
                  ) : (
                    <span className="btn-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      Verify Email
                    </span>
                  )}
                </button>

                {/* Resend */}
                <div className="resend-section">
                  {canResend ? (
                    <button
                      type="button"
                      className="resend-btn"
                      onClick={handleResend}
                      disabled={resendLoading}
                    >
                      {resendLoading ? (
                        <span className="btn-loading">
                          <span className="spinner spinner-sm" />
                          Sending…
                        </span>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                          </svg>
                          Resend Code
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="resend-timer">
                      Resend code in{" "}
                      <span className="timer-count">
                        {String(Math.floor(countdown / 60)).padStart(2, "0")}:
                        {String(countdown % 60).padStart(2, "0")}
                      </span>
                    </p>
                  )}
                </div>
              </form>
            )}

            {/* Back link */}
            <div className="otp-back">
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

        <p className="otp-footer">OTP codes expire after 10 minutes</p>
      </div>
    </div>
  );
};

export default OtpVerification;