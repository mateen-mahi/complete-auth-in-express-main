import { MailtrapClient } from "mailtrap";
import dotenv from "dotenv";

dotenv.config();
const TOKEN = process.env.MAIL_TRAP_TOKEN;

export  function verifyMailSender(otp, userEmail) {

  if (!TOKEN) {
    console.log("Mailtrap token is not defined. Please check your .env file.");
    return;
  }

  const client = new MailtrapClient({ token: TOKEN });

  const sender = {
    email: "hello@demomailtrap.com",
    name: "Mateen Mahi",
  };

  const recipient = [
    {
      email: userEmail,
    },
  ];

  client
    .send({
      from: sender,
      to: recipient,
      subject: "Your Verification",
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Verification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #007BFF;
      color: white;
      text-align: center;
      padding: 20px 10px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
      text-align: center;
    }
    .otp {
      font-size: 32px;
      color: #333333;
      font-weight: bold;
      margin: 20px 0;
      letter-spacing: 2px;
    }
    .instructions {
      font-size: 16px;
      color: #666666;
      margin: 10px 0 20px;
    }
    .footer {
      text-align: center;
      padding: 10px 20px;
      background-color: #f4f4f4;
      font-size: 14px;
      color: #888888;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #007BFF;
      color: white;
      text-decoration: none;
      font-size: 16px;
      border-radius: 4px;
      margin-top: 20px;
    }
    .button:hover {
      background-color: #0056b3;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your OTP Verification Code</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>Thank you for signing up. Use the OTP below to complete your verification:</p>
      <div class="otp">${otp}</div>
      <p class="instructions">This code is valid for the next 10 minutes. Please do not share this OTP with anyone.</p>
      <a href="https://your-app-url.com/verify" class="button">Verify Now</a>
    </div>
    <div class="footer">
      If you didn’t request this, you can safely ignore this email.<br />
      <strong>Need help?</strong> Contact us at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>
    </div>
  </div>
</body>
</html>
`,
      // category: "Integration Test",
    })
    .then(() => console.log("OTP sent successfully"))
    .catch((error) => console.error("Error while sending OTP:", error));
}



export  function forgotPasswordMailSender(generatedToken, userEmail) {

  const resetLink = `${process.env.FRONTEND_URI}/reset-password/${generatedToken}`;

  if (!TOKEN) {
    console.log("Mailtrap token is not defined. Please check your .env file.");
    return;
  }

  const client = new MailtrapClient({ token: TOKEN });

  const sender = {
    email: "hello@demomailtrap.com",
    name: "Mateen Mahi",
  };

  const recipient = [
    {
      email: userEmail,
    },
  ];

  client
    .send({
      from: sender,
      to: recipient,
      subject: "Reset Password",
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f8f9fa;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background-color: #007BFF;
      color: white;
      text-align: center;
      padding: 20px 10px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
      text-align: center;
    }
    .message {
      font-size: 16px;
      color: #333333;
      margin: 10px 0 20px;
    }
    .reset-link {
      display: inline-block;
      padding: 10px 20px;
      background-color: #007BFF;
      color: white;
      text-decoration: none;
      font-size: 16px;
      border-radius: 4px;
      margin-top: 20px;
    }
    .reset-link:hover {
      background-color: #0056b3;
    }
    .footer {
      text-align: center;
      padding: 10px 20px;
      background-color: #f8f9fa;
      font-size: 14px;
      color: #888888;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p class="message">
        Hello, <br />
        We received a request to reset your password. Click the button below to reset your password:
      </p>
      <a href="${resetLink}" class="reset-link">Reset Password</a>
      <p class="message">
        If you didn’t request a password reset, please ignore this email or contact support if you have concerns.
      </p>
    </div>
    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a></p>
    </div>
  </div>
</body>
</html>
`,
    })
    .then(() => console.log("forgot password Link sent successfully"))
    .catch((error) => console.error("Error while sending forgot password:", error));
}
