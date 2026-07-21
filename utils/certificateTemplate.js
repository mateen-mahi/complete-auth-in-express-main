export function buildCertificateHtml({
  studentName,
  courseName,
  instructorName,
  certificateNumber,
  issuedAt,
  grade,
}) {
  const formattedDate = new Date(issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        width: 1123px;
        height: 794px; /* A4 landscape @ 96dpi-ish */
        background: #fdfcf7;
        position: relative;
      }
      .border {
        position: absolute;
        top: 24px; left: 24px; right: 24px; bottom: 24px;
        border: 3px solid #b8860b;
        outline: 1px solid #b8860b;
        outline-offset: 8px;
      }
      .content {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 80px 100px;
      }
      .heading {
        font-size: 14px;
        letter-spacing: 6px;
        color: #b8860b;
        text-transform: uppercase;
        margin-bottom: 20px;
      }
      .title {
        font-size: 42px;
        font-weight: bold;
        color: #1a1a1a;
        margin-bottom: 30px;
      }
      .subtext {
        font-size: 16px;
        color: #555;
        margin-bottom: 10px;
      }
      .student-name {
        font-size: 36px;
        font-weight: bold;
        color: #1a1a1a;
        margin: 15px 0;
        border-bottom: 2px solid #b8860b;
        padding-bottom: 10px;
        display: inline-block;
      }
      .course-name {
        font-size: 22px;
        color: #333;
        margin: 20px 0 40px;
        font-style: italic;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        width: 100%;
        margin-top: 40px;
        padding: 0 60px;
      }
      .footer-block {
        text-align: center;
      }
      .footer-line {
        border-top: 1px solid #999;
        padding-top: 6px;
        font-size: 13px;
        color: #444;
      }
      .cert-number {
        position: absolute;
        bottom: 40px;
        right: 60px;
        font-size: 11px;
        color: #999;
      }
      .grade {
        font-size: 15px;
        color: #b8860b;
        font-weight: bold;
        margin-top: 10px;
      }
    </style>
  </head>
  <body>
    <div class="border"></div>
    <div class="content">
      <div class="heading">Certificate of Completion</div>
      <div class="title">Achievement Award</div>
      <div class="subtext">This certificate is proudly presented to</div>
      <div class="student-name">${studentName}</div>
      <div class="subtext">for successfully completing the course</div>
      <div class="course-name">"${courseName}"</div>
      ${grade ? `<div class="grade">Grade: ${grade}</div>` : ""}

      <div class="footer">
        <div class="footer-block">
          <div class="footer-line">${formattedDate}</div>
          <div>Date Issued</div>
        </div>
        <div class="footer-block">
          <div class="footer-line">${instructorName || "—"}</div>
          <div>Instructor</div>
        </div>
      </div>
    </div>
    <div class="cert-number">Certificate No: ${certificateNumber}</div>
  </body>
  </html>
  `;
}