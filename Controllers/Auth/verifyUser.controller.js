import userModel from "../../models/user.model.js";



const VerifyUserController = async (req, res) => {
  try {
    const { email, verifyToken } = req.body;
    if (!email || !verifyToken) {
      return res.status(400).json("Please provide both email and verify token");
    }
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json("User not found");
    }
    if (user.verifyToken !== verifyToken) {
      return res.status(400).json("Invalid verify token");
    }
    if (user.verifyTokenExpiry < new Date()) {
      return res.status(400).json("Verify token has expired");
    }
    user.isVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpiry = undefined;
    await user.save();
    res.status(200).json("User verified successfully");
  } catch (error) {
    res.status(500).json("Something went wrong");
    console.log("Error verifying user");
  }
};

export default VerifyUserController;

