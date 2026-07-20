import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../../models/user.model.js";
import { verifyMailSender } from "../../utils/mailSender.js";

const SignupController = async (req, res) => {
  try {
    const { username, email, password, gender } = req.body;

    if (!username || !email || !password || !gender) {
      return res.status(400).json("Please fill out all fields");
    }

      const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json("An account with this email already exists");
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const verifyToken = Math.floor(100000 + Math.random() * 900000);
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const storedUser = await userModel.create({
      username,
      email,
      gender,
      password: hashPassword,
      verifyToken,
      verifyTokenExpiry,
    });

        try {
      await verifyMailSender(verifyToken, storedUser.email);
    } catch (mailError) {
      console.error("Mail delivery failed but user record was created:", mailError);
    }


    console.log("User  created Successfully");

    return res.status(200).json("User created Successfully");
  } catch (error) {
    console.log("Error While Posting user Model , Error: ", error);
    res.status(500).json("Server Error");
  }

};


export default SignupController;