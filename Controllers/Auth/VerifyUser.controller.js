import userModel from "../../models/user.model.js";
import { verifyMailSender } from "../../utils/mailSender.js";

 
export const OtpSenderController = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email",
      });
    }

    // Find user
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate 6-digit OTP
    const verifyToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // OTP expires after 15 minutes
    const verifyTokenExpiry = new Date(
      Date.now() + 15 * 60 * 1000
    );

    // Save OTP
    user.verifyToken = verifyToken;
    user.verifyTokenExpiry = verifyTokenExpiry;

    await user.save();

    // Send OTP email
    await verifyMailSender(verifyToken, email);

    return res.status(200).json({
      success: true,
      message: "Verification OTP sent successfully",
    });
  } catch (error) {
    console.error("Error sending verification OTP:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending the verification OTP",
    });
  }
};


export const VerifyUserController = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Find user
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Check whether OTP exists
    if (!user.verifyToken || !user.verifyTokenExpiry) {
      return res.status(400).json({
        success: false,
        message: "Verification OTP is invalid or has expired",
      });
    }

    // Check OTP
    if (String(user.verifyToken) !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification OTP",
      });
    }

    // Check OTP expiry
    if (new Date() > new Date(user.verifyTokenExpiry)) {
      return res.status(400).json({
        success: false,
        message: "Verification OTP has expired. Please request a new OTP",
      });
    }

    // Mark user as verified
    user.isVerified = true;

    // Remove OTP after successful verification
    user.verifyToken = undefined;
    user.verifyTokenExpiry = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Error verifying user:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while verifying your email",
    });
  }
};