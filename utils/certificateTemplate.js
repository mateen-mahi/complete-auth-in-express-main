export function buildCertificateHtml({
  studentName,
  courseName,
  instructorName,
  certificateNumber,
  issuedAt,
  grade,
  organizationName = "Academy",
}) {
  const formattedDate = new Date(issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Minimal escaping — these values can come from user-entered course
  // titles / usernames, and this HTML gets rendered straight into a PDF.
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const safeStudent = esc(studentName);
  const safeCourse = esc(courseName);
  const safeInstructor = instructorName ? esc(instructorName) : null;
  const safeOrg = esc(organizationName);
  const safeCertNumber = esc(certificateNumber);
  const safeGrade = grade ? esc(grade) : null;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      /* Elegant serif for structure + a script face for the name. These
         load over the network at PDF-render time (Puppeteer/Chromium with
         network access). If the render environment is offline, the
         fallback chain (Georgia / Times New Roman) still produces a
         clean, correct certificate — it just loses the script flourish. */
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Alex+Brush&display=swap');

      :root {
        --parchment: #faf6ec;
        --parchment-2: #f1ead6;
        --ink: #23301f;
        --green: #1f4d36;
        --green-light: #2f6b4a;
        --gold: #b8862c;
        --gold-light: #d4af6a;
        --muted: #7a7161;
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }

      html, body { width: 1123px; height: 794px; }

      body {
        font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
        position: relative;
        overflow: hidden;
        color: var(--ink);
        background:
          radial-gradient(ellipse at center, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 60%),
          repeating-linear-gradient(135deg, rgba(184,134,44,0.035) 0px, rgba(184,134,44,0.035) 1px, transparent 1px, transparent 14px),
          var(--parchment);
      }

      /* Border frame — double rule, plain CSS borders (works in every
         renderer — clip-path and the inset shorthand are NOT reliably
         supported across all HTML-to-PDF engines, so we avoid both here) */
      .border-outer {
        position: absolute;
        top: 34px; left: 34px; right: 34px; bottom: 34px;
        border: 7px solid var(--green);
        border-radius: 4px;
      }

      .border-inner {
        position: absolute;
        top: 44px; left: 44px; right: 44px; bottom: 44px;
        border: 1.5px solid var(--gold);
        border-radius: 2px;
      }

      .border-hairline {
        position: absolute;
        top: 54px; left: 54px; right: 54px; bottom: 54px;
        border: 1px solid var(--gold);
        opacity: 0.55;
      }

      /* ── Corner mounts ── */
      .corner {
        position: absolute;
        width: 26px;
        height: 26px;
      }
      .corner::before, .corner::after {
        content: "";
        position: absolute;
        background: var(--gold);
      }
      .corner::before { width: 100%; height: 1.5px; top: 50%; }
      .corner::after   { width: 1.5px; height: 100%; left: 50%; }
      .corner-dot {
        position: absolute;
        top: 50%; left: 50%;
        width: 7px; height: 7px;
        background: var(--gold);
        transform: translate(-50%, -50%) rotate(45deg);
      }
      .corner.tl { top: 58px; left: 58px; }
      .corner.tr { top: 58px; right: 58px; }
      .corner.bl { bottom: 58px; left: 58px; }
      .corner.br { bottom: 58px; right: 58px; }

      /* ── Content ── */
      .frame {
        position: absolute;
        top: 72px;
        left: 130px;
        right: 130px;
        bottom: 100px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .eyebrow {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 6px;
        text-transform: uppercase;
        color: var(--green);
        margin-top: 6px;
      }

      .org-name {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 2px;
        color: var(--ink);
        margin-top: 10px;
      }

      .rule {
        display: flex;
        align-items: center;
        margin: 16px 0 22px;
        width: 240px;
      }
      .rule .line {
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--gold), transparent);
      }
      .rule .diamond {
        width: 6px; height: 6px;
        margin: 0 10px;
        background: var(--gold);
        transform: rotate(45deg);
        flex-shrink: 0;
      }

      .presented-to {
        font-size: 17px;
        letter-spacing: 1px;
        color: var(--muted);
        margin-bottom: 8px;
      }

      .student-name {
        font-family: 'Alex Brush', 'Playfair Display', Georgia, serif;
        font-size: 68px;
        line-height: 1.1;
        color: var(--ink);
        padding: 0 10px 8px;
        max-width: 800px;
      }

      .name-underline {
        width: 360px;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--gold) 15%, var(--gold) 85%, transparent);
        margin: 4px 0 24px;
      }

      .completed-text {
        font-size: 17px;
        letter-spacing: 1px;
        color: var(--muted);
        margin-bottom: 12px;
      }

      .course-name {
        font-family: 'Playfair Display', Georgia, serif;
        font-weight: 700;
        font-style: italic;
        font-size: 28px;
        color: var(--green);
        max-width: 740px;
        line-height: 1.3;
      }

      .grade-badge {
        margin-top: 18px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 20px;
        border: 1px solid var(--gold);
        border-radius: 999px;
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: var(--gold);
      }

      .spacer { flex: 1; min-height: 20px; }

      /* ── Footer: signatures flank the seal ── */
      .footer-row {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        width: 100%;
      }

      .sig-block { width: 220px; text-align: center; }
      .sig-signature {
        font-family: 'Alex Brush', 'Playfair Display', Georgia, serif;
        font-size: 30px;
        color: var(--ink);
        margin-bottom: 2px;
        line-height: 1;
      }
      .sig-line { height: 1px; background: var(--muted); opacity: 0.5; margin: 4px 0 9px; }
      .sig-role {
        font-size: 11px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: var(--muted);
        margin-top: 2px;
      }

      /* ── Seal ── */
      .seal-wrap {
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .ribbon-tails {
        display: flex;
        margin-top: -14px;
      }
      .ribbon-tail {
        width: 22px;
        height: 46px;
        margin: 0 3px;
        background: linear-gradient(180deg, var(--green) 0%, var(--green-light) 100%);
        clip-path: polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%);
      }
      .ribbon-tail.left  { transform: rotate(-8deg); }
      .ribbon-tail.right { transform: rotate(8deg); }

      .meta-row {
        position: absolute;
        left: 130px;
        right: 130px;
        bottom: 64px;
        display: flex;
        justify-content: space-between;
        font-size: 10.5px;
        letter-spacing: 0.5px;
        color: var(--muted);
        font-family: 'Courier New', monospace;
      }
    </style>
  </head>
  <body>
    <div class="border-outer"></div>
    <div class="border-inner"></div>
    <div class="border-hairline"></div>

    <div class="corner tl"><span class="corner-dot"></span></div>
    <div class="corner tr"><span class="corner-dot"></span></div>
    <div class="corner bl"><span class="corner-dot"></span></div>
    <div class="corner br"><span class="corner-dot"></span></div>

    <div class="frame">
      <div class="eyebrow">Certificate of Achievement</div>
      <div class="org-name">${safeOrg}</div>

      <div class="rule"><div class="line"></div><div class="diamond"></div><div class="line"></div></div>

      <div class="presented-to">This certifies that</div>
      <div class="student-name">${safeStudent}</div>
      <div class="name-underline"></div>

      <div class="completed-text">has successfully completed the course</div>
      <div class="course-name">&ldquo;${safeCourse}&rdquo;</div>

      ${safeGrade ? `<div class="grade-badge">Grade&nbsp;&middot;&nbsp;${safeGrade}</div>` : ""}

      <div class="spacer"></div>

      <div class="footer-row">
        <div class="sig-block">
          <div class="sig-signature">${safeInstructor || "&mdash;"}</div>
          <div class="sig-line"></div>
          <div class="sig-role">Course Instructor</div>
        </div>

        <div class="seal-wrap">
          <svg width="108" height="108" viewBox="0 0 120 120">
            <path d="M 106.00 60.00 Q 114.92 70.93 102.50 77.60 Q 106.56 91.11 92.53 92.53 Q 91.11 106.56 77.60 102.50 Q 70.93 114.92 60.00 106.00 Q 49.07 114.92 42.40 102.50 Q 28.89 106.56 27.47 92.53 Q 13.44 91.11 17.50 77.60 Q 5.08 70.93 14.00 60.00 Q 5.08 49.07 17.50 42.40 Q 13.44 28.89 27.47 27.47 Q 28.89 13.44 42.40 17.50 Q 49.07 5.08 60.00 14.00 Q 70.93 5.08 77.60 17.50 Q 91.11 13.44 92.53 27.47 Q 106.56 28.89 102.50 42.40 Q 114.92 49.07 106.00 60.00 Z"
              fill="#1f4d36" />
            <circle cx="60" cy="60" r="41" fill="none" stroke="#d4af6a" stroke-width="1.5" />
            <path id="sealRing" d="M 60,60 m -33,0 a 33,33 0 1,1 66,0 a 33,33 0 1,1 -66,0" fill="none" />
            <text font-family="Playfair Display, Georgia, serif" font-size="7.2" letter-spacing="2.2" fill="#d4af6a">
              <textPath href="#sealRing" startOffset="2%">CERTIFIED &#9733; OF EXCELLENCE &#9733;</textPath>
            </text>
            <path d="M 60.00 47.00 L 63.06 55.79 L 72.36 55.98 L 64.95 61.61 L 67.64 70.52 L 60.00 65.20 L 52.36 70.52 L 55.05 61.61 L 47.64 55.98 L 56.94 55.79 Z"
              fill="#d4af6a" />
          </svg>
          <div class="ribbon-tails">
            <div class="ribbon-tail left"></div>
            <div class="ribbon-tail right"></div>
          </div>
        </div>

        <div class="sig-block">
          <div class="sig-signature">${safeOrg} Admin</div>
          <div class="sig-line"></div>
          <div class="sig-role">Board of Directors</div>
        </div>
      </div>
    </div>

    <div class="meta-row">
      <span>Issued: ${formattedDate}</span>
      <span>Certificate No: ${safeCertNumber}</span>
    </div>
  </body>
  </html>
  `;
}