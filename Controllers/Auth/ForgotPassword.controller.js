import crypto from "crypto";
import userModel from "../../models/user.model.js";
import { forgotPasswordMailSender } from "../../utils/mailSender.js";

const forgotPasswordController = async (req, res) => {
  const forgotPasswordToken = crypto.randomBytes(32).toString("hex");
  const forgotPasswordTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const { email } = req.body;

  const user = await userModel.findOne({ email });
  try {
    if (!user) {
      return res.status(404).json("this account is not available");
    }

    user.forgotPasswordToken = forgotPasswordToken;
    user.forgotPasswordTokenExpiry = forgotPasswordTokenExpiry;

    await user.save();
    forgotPasswordMailSender(forgotPasswordToken, email);

    res.status(200).json("Reset Password Link sent to your email");
  } catch (error) {
    console.log("Error in forgot password api ", error);

    res.status(404).json("Invalid email address");
  }
}; 


export default forgotPasswordController;