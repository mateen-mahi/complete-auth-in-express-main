import crypto from "crypto";
import userModel from "../../models/user.model.js";
import { forgotPasswordMailSender } from "../../utils/mailSender.js";

const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "This account does not exist.",
      });
    }

    const forgotPasswordToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(forgotPasswordToken)
      .digest("hex");

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordTokenExpiry = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    await user.save();

    forgotPasswordMailSender(forgotPasswordToken, email);

    return res.status(200).json({
      success: true,
      message: "Reset password link has been sent to your email.",
    });
  } catch (error) {
    console.error("Error in ForgotPasswordController:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export default forgotPasswordController;