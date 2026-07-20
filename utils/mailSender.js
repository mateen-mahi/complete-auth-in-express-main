import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/* ═══════════════════════════════════════════════
   ENV VALIDATION
   ────────────────────────────────────────────── */
const required = ["EMAIL_PROVIDER", "APP_NAME", "FRONTEND_URI", "SMTP_SENDER_EMAIL"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("❌ Missing env vars:", missing.join(", "));
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const PROVIDER = process.env.EMAIL_PROVIDER.toLowerCase(); // "gmail" or "brevo"

/* ═══════════════════════════════════════════════
   TRANSPORTER — Dynamic based on EMAIL_PROVIDER
   ────────────────────────────────────────────── */
let transporter;

if (PROVIDER === "gmail") {
  const gmailRequired = ["GMAIL_USER", "GMAIL_APP_PASS"];
  const gmailMissing = gmailRequired.filter((k) => !process.env[k]);
  if (gmailMissing.length) {
    throw new Error(`Gmail provider selected but missing: ${gmailMissing.join(", ")}`);
  }
  transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASS,
    },
  });
} else if (PROVIDER === "brevo") {
  const brevoRequired = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const brevoMissing = brevoRequired.filter((k) => !process.env[k]);
  if (brevoMissing.length) {
    throw new Error(`Brevo provider selected but missing: ${brevoMissing.join(", ")}`);
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  throw new Error(`Invalid EMAIL_PROVIDER: "${PROVIDER}". Use "gmail" or "brevo".`);
}

/* ═══════════════════════════════════════════════
   TEMPLATE CONFIG — pulled from env
   ────────────────────────────────────────────── */


   const APP_NAME = process.env.APP_NAME;
const SMTP_SENDER_EMAIL = process.env.SMTP_SENDER_EMAIL;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || SMTP_SENDER_EMAIL;
const COMPANY_NAME = process.env.COMPANY_NAME || APP_NAME;
const FOOTER_TAGLINE = process.env.FOOTER_TAGLINE || "Secure. Fast. Reliable.";

/* ═══════════════════════════════════════════════
   BASE LAYOUT — Aurora / Gradient V2
   ────────────────────────────────────────────── */




   const baseLayout = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    /* ── Reset ── */
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }

    /* ── Body ── */
    body {
      margin:0; padding:0;
      background-color: #0a0e1a;
      font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
    }

    /* ── Wrapper ── */
    .wrap {
      width:100%; max-width:600px; margin:0 auto;
      background: #0a0e1a;
      padding: 48px 16px;
    }

    /* ── Container ── */
    .box {
      background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
      border-radius: 20px;
      border: 1px solid rgba(148,163,184,0.08);
      overflow:hidden;
      box-shadow:
        0 0 0 1px rgba(59,130,246,0.05),
        0 25px 50px -12px rgba(0,0,0,0.6);
    }

    /* ── Top glow bar ── */
    .glow-bar {
      height: 3px;
      background: linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6, #ec4899);
      background-size: 200% 100%;
      animation: shimmer 3s ease infinite;
    }
    @keyframes shimmer {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    /* ── Header ── */
    .hdr {
      padding: 36px 36px 16px;
      text-align: center;
    }
    .brand {
      font-size: 26px; font-weight: 800;
      color: #f8fafc; letter-spacing: -0.4px;
      display: inline-flex; align-items: center; gap: 10px;
    }
    .brand-orb {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: conic-gradient(from 180deg, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #06b6d4);
      display: inline-block;
      position: relative;
      box-shadow: 0 0 12px rgba(59,130,246,0.3);
    }
    .brand-orb::after {
      content: "";
      position: absolute;
      inset: 4px;
      border-radius: 50%;
      background: #0f172a;
    }
    .brand span {
      background: linear-gradient(90deg, #38bdf8, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ── Content ── */
    .main { padding: 16px 36px 36px; }

    .h1 {
      font-size: 24px; font-weight: 700;
      color: #f8fafc; margin-bottom: 10px;
      text-align: center; letter-spacing: -0.2px;
    }
    .lead {
      font-size: 14px; color: #94a3b8;
      text-align: center; margin-bottom: 28px;
      line-height: 1.65;
    }

    /* ── Card ── */
    .card {
      background: rgba(15,23,42,0.6);
      border: 1px solid rgba(148,163,184,0.08);
      border-radius: 14px;
      padding: 28px;
      margin-bottom: 24px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent);
    }

    /* ── OTP ── */
    .otp-label {
      font-size: 11px; color: #64748b;
      text-transform: uppercase; letter-spacing: 2.5px;
      margin-bottom: 10px; font-weight: 600;
    }
    .otp-code {
      font-size: 38px; font-weight: 800;
      letter-spacing: 12px; color: #2dd4bf;
      font-family: 'SF Mono', 'Courier New', monospace;
      text-shadow: 0 0 18px rgba(45,212,191,0.2);
      margin: 8px 0;
    }
    .otp-timer {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; color: #f87171; font-weight: 600;
      margin-top: 14px;
      background: rgba(248,113,113,0.06);
      padding: 6px 14px; border-radius: 999px;
      border: 1px solid rgba(248,113,113,0.12);
    }

    /* ── CTA ── */
    .cta {
      display: inline-block;
      padding: 14px 36px;
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      color: #fff !important;
      font-weight: 600; font-size: 15px;
      text-decoration: none; border-radius: 12px;
      box-shadow: 0 8px 24px rgba(14,165,233,0.25);
      transition: transform .2s, box-shadow .2s;
    }
    .cta:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 32px rgba(14,165,233,0.35);
    }

    /* ── Link fallback ── */
    .link-fallback {
      margin-top: 18px; font-size: 11px; color: #475569;
    }
    .link-fallback span {
      color: #94a3b8; word-break: break-all;
      font-family: 'SF Mono', monospace; font-size: 11px;
    }

    /* ── Body text (notification) ── */
    .body-msg {
      font-size: 14.5px; line-height: 1.8;
      color: #cbd5e1; white-space: pre-wrap;
      text-align: left;
    }
    .body-msg strong { color: #f8fafc; }
    .body-msg a { color: #38bdf8; text-decoration: none; border-bottom: 1px solid rgba(56,189,248,0.25); }
    .body-msg ul { padding-left: 20px; margin: 10px 0; }
    .body-msg li { margin-bottom: 6px; }

    /* ── Footer ── */
    .ftr {
      padding: 28px 36px;
      text-align: center;
      background: rgba(0,0,0,0.25);
      border-top: 1px solid rgba(148,163,184,0.06);
    }
    .ftr-tag {
      font-size: 11px; color: #475569;
      letter-spacing: 1.5px; text-transform: uppercase;
      margin-bottom: 10px; font-weight: 600;
    }
    .ftr-text {
      font-size: 11.5px; color: #64748b;
      line-height: 1.7; margin-bottom: 14px;
    }
    .ftr-links a {
      color: #94a3b8; text-decoration: none;
      font-size: 11.5px; font-weight: 500;
      margin: 0 10px; transition: color .2s;
    }
    .ftr-links a:hover { color: #38bdf8; }
    .ftr-social {
      margin-top: 14px;
      display: flex; justify-content: center; gap: 8px;
    }
    .ftr-social a {
      width: 30px; height: 30px; line-height: 30px;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
      color: #94a3b8; text-decoration: none;
      font-size: 12px; text-align: center;
      transition: all .2s;
    }
    .ftr-social a:hover {
      background: rgba(56,189,248,0.1);
      color: #38bdf8;
    }

    /* ── Responsive ── */
    @media screen and (max-width: 600px) {
      .wrap { padding: 24px 10px; }
      .hdr, .main, .ftr { padding-left: 22px; padding-right: 22px; }
      .h1 { font-size: 20px; }
      .otp-code { font-size: 30px; letter-spacing: 8px; }
      .card { padding: 20px; }
      .brand { font-size: 22px; }
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr><td align="center">
      <div class="wrap">
        <div class="box">
          <div class="glow-bar"></div>
          <div class="hdr">
            <div class="brand"><span class="brand-orb"></span>${APP_NAME}</div>
          </div>
          <div class="main">
            ${content}
          </div>
          <div class="ftr">
            <div class="ftr-tag">${FOOTER_TAGLINE}</div>
            <div class="ftr-text">
              This is an automated email from ${COMPANY_NAME}.<br>
              If you did not request this, please secure your account.
            </div>
            <div class="ftr-links">
              <a href="mailto:${SUPPORT_EMAIL}">Contact Support</a>
              <a href="#">Privacy</a>
              <a href="#">Unsubscribe</a>
            </div>
            <div class="ftr-social">
              <a href="#">𝕏</a>
              <a href="#">in</a>
              <a href="#">𝒢</a>
            </div>
          </div>
        </div>
      </div>
    </td></tr>
  </table>
</body>
</html>
`;


/* ═══════════════════════════════════════════════
   1. VERIFY EMAIL — OTP
   ═══════════════════════════════════════════════ */




   export async function verifyMailSender(otp, userEmail) {
  const htmlContent = baseLayout(
    `Verify Your Account — ${APP_NAME}`,
    `
    <div class="h1">Verify Your Email</div>
    <div class="lead">Secure authentication initialized. Use the uniquely generated 6-digit verification key below to finalize your account setup.</div>

    <div class="card">
      <div class="otp-label">Verification Code</div>
      <div class="otp-code">${otp}</div>
      <div class="otp-timer">⏱ Expires in exactly 10 minutes</div>
    </div>

    <div class="lead" style="font-size:12px; margin-bottom:0;">
      🔒 Security reminder: Never expose or share your active authorization tokens with third-party services.
    </div>
    `
  );

  const mailOptions = {
    from: `"${APP_NAME} Team" <${SMTP_SENDER_EMAIL}>`,
    to: userEmail,
    subject: "🛡️ Secure Authentication Token",
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP delivered to ${userEmail} via ${PROVIDER}`);
    return true;
  } catch (error) {
    console.error("❌ OTP send failed:", error.message);
    return false;
  }
}


/* ═══════════════════════════════════════════════
   2. FORGOT PASSWORD — RESET LINK
   ═══════════════════════════════════════════════ */



   export async function forgotPasswordMailSender(generatedToken, userEmail) {
  const resetLink = `${process.env.FRONTEND_URI}/reset-password/${generatedToken}`;

  const htmlContent = baseLayout(
    `Reset Your Password — ${APP_NAME}`,
    `
    <div class="h1">Password Reset Request</div>
    <div class="lead">A network request was recorded to clear and regenerate the access keys associated with this active email workspace node.</div>

    <div class="card" style="padding: 36px 20px;">
      <a href="${resetLink}" class="cta" target="_blank">Reset Security Password</a>
      <div class="link-fallback">
        Or paste this link:<br>
        <span>${resetLink}</span>
      </div>
    </div>

    <div class="lead" style="font-size:12px; margin-bottom:0;">
      If you didn't trigger this access reset, safely ignore this transmission. This link expires in 1 hour.
    </div>
    `
  );

  const mailOptions = {
    from: `"${APP_NAME} Security" <${SMTP_SENDER_EMAIL}>`,
    to: userEmail,
    subject: "🔄 Account Access Key Reset Link",
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Reset link delivered to ${userEmail} via ${PROVIDER}`);
    return true;
  } catch (error) {
    console.error("❌ Reset link send failed:", error.message);
    return false;
  }
}


/* ═══════════════════════════════════════════════
   3. GENERAL NOTIFICATION — UNIVERSAL
   ═══════════════════════════════════════════════ */



   export async function generalNotificationMailSender(userEmail, subject, bodyMessage) {
  const htmlContent = baseLayout(
    `${subject} — ${APP_NAME}`,
    `
    <div class="h1">${subject}</div>

    <div class="card" style="text-align:left; padding: 28px 24px;">
      <div class="body-msg">${bodyMessage}</div>
    </div>

    <div style="text-align:center; margin-top:4px;">
      <a href="mailto:${SUPPORT_EMAIL}" class="cta" style="padding:12px 28px; font-size:13px;">Contact Support</a>
    </div>

    <div class="lead" style="font-size:12px; margin-bottom:0; margin-top:22px;">
      You received this because you're subscribed to ${APP_NAME} notifications.<br>
      <a href="#" style="color:#64748b;">Manage preferences</a> · <a href="#" style="color:#64748b;">Unsubscribe</a>
    </div>
    `
  );

  const mailOptions = {
    from: `"${APP_NAME} Notifications" <${SMTP_SENDER_EMAIL}>`,
    to: userEmail,
    subject: subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Notification delivered to ${userEmail} via ${PROVIDER}`);
    return true;
  } catch (error) {
    console.error("❌ Notification send failed:", error.message);
    return false;
  }
}