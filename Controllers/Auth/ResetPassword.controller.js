import bcrypt from "bcryptjs";
import crypto from "crypto";
import userModel from "../../models/user.model.js";

const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.query;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please provide a password.",
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required.",
      });
    }

    // Hash the token received from the URL
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with matching hashed token
    const user = await userModel.findOne({
      forgotPasswordToken: hashedToken,
      forgotPasswordTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token.",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;

    user.forgotPasswordToken = undefined;
    user.forgotPasswordTokenExpiry = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Error in ResetPasswordController:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export default resetPassword;