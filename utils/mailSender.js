import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();


const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

const baseLayout = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 40px 10px; color: #f3f4f6; }
    .wrapper { max-width: 540px; margin: 0 auto; background: linear-gradient(145deg, #111827, #1f2937); border-radius: 20px; padding: 40px 30px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); border: 1px solid #374151; text-align: center; }
    .logo { font-size: 32px; font-weight: 800; color: #3b82f6; margin-bottom: 25px; letter-spacing: -1px; }
    .logo span { color: #10b981; }
    .title { font-size: 24px; font-weight: 700; margin-bottom: 15px; color: #ffffff; letter-spacing: -0.5px; }
    .text { font-size: 15px; line-height: 1.6; color: #9ca3af; margin-bottom: 30px; }
    .card-box { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 25px; margin-bottom: 30px; backdrop-filter: blur(10px); }
    .badge-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #10b981; margin: 10px 0; font-family: 'Courier New', monospace; text-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
    .action-btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff !important; font-weight: 600; font-size: 16px; text-decoration: none; border-radius: 12px; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3); transition: all 0.3s ease; }
    .timer-alert { font-size: 13px; color: #ef4444; font-weight: 500; margin-top: 15px; background: rgba(239, 68, 68, 0.1); display: inline-block; padding: 6px 14px; border-radius: 20px; }
    .footer { font-size: 12px; color: #4b5563; margin-top: 40px; line-height: 1.5; border-top: 1px solid #374151; padding-top: 20px; }
    .footer a { color: #6b7280; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">⬡ Auth<span>System</span></div>
    ${content}
    <div class="footer">
      This is an automated operational email message.<br>
      If you did not request this configuration, please secure your account keys.<br>
      <a href="mailto:support@yourdomain.com">Contact Support Core</a>
    </div>
  </div>
</body>
</html>
`;



export async function verifyMailSender(otp, userEmail) {
  const htmlContent = baseLayout(
    "Verify Account",
    `
    <div class="title">Verify Your Email</div>
    <p class="text">Secure authentication initialized. Use the uniquely generated 6-digit verification security key below to finalize your account setup.</p>
    
    <div class="card-box">
      <div class="badge-code">${otp}</div>
      <div class="timer-alert">⏱ Expiring in exactly 10 minutes</div>
    </div>
    
    <p class="text" style="font-size: 13px;">Security reminder: Never expose or share your active authorization nodes with third-party handles.</p>
    `
  );

  const mailOptions = {
    from: `"AuthSystem Team" <${process.env.GMAIL_USER}>`,
    to: userEmail,
    subject: "🛡️ Secure Authentication Token",
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Premium OTP Template delivered cleanly to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Nodemailer OTP sending node crashed:", error);
    return false;
  }
}



export async function forgotPasswordMailSender(generatedToken, userEmail) {
  const resetLink = `${process.env.FRONTEND_URI}/reset-password/${generatedToken}`;

  const htmlContent = baseLayout(
    "Reset System Password",
    `
    <div class="title">Password Reset Request</div>
    <p class="text">A network request was recorded to clear and regenerate the access keys associated with this active email workspace node.</p>
    
    <div class="card-box" style="padding: 35px 20px;">
      <a href="${resetLink}" class="action-btn" target="_blank">Reset Security Password</a>
    </div>
    
    <p class="text" style="font-size: 13px; margin-bottom: 5px;">If you didn't trigger this access reset, safely ignore this transmission.</p>
    `
  );

  const mailOptions = {
    from: `"AuthSystem Security" <${process.env.GMAIL_USER}>`,
    to: userEmail,
    subject: "🔄 Account Access Key Reset Link",
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Premium Reset Link Template delivered cleanly to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Nodemailer Reset sending node crashed:", error);
    return false;
  }
}
