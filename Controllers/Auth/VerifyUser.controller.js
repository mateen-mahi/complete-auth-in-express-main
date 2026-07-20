import userModel from "../../models/user.model.js";
import { verifyMailSender } from "../../utils/mailSender.js";


const VerifyUserController = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json("Please provide an email");
    }
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json("User not found");
    }
    const verifyToken = Math.floor(100000 + Math.random() * 900000);
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.verifyToken = verifyToken;
    user.verifyTokenExpiry = verifyTokenExpiry;
    await user.save();

    verifyMailSender(verifyToken, email);
    res.status(200).json("Verify Email sent");
  } catch (error) {
    res.status(500).json("Something went wrong");
    console.log("Error sending reset password email");
  }
};


export default VerifyUserController;