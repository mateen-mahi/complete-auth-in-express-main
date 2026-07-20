import bcrypt from "bcryptjs";
import userModel from "../../models/user.model.js";




const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json("Please provide a password");
    }
    const { token } = req.query;

    const user = await userModel.findOne({
      forgotPasswordToken: token,
      forgotPasswordTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(404).json("Invalid or expired token");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;

    user.forgotPasswordToken = "";

    user.forgotPasswordTokenExpiry = "";

    await user.save();

    res
      .status(200)
      .json(
        "Password reset successful Now you can login with your new password",
      );
  } catch (error) {
    console.log("Error in reset password api ", error);
    res.status(500).json("Server error");
  }
};

export default resetPassword;