import express from "express";
import userModel from "../models/user.model.js";
import { verifyMailSender } from "../utils/mailSender.js";
import { forgotPasswordMailSender } from "../utils/mailSender.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IPinfoLiteWrapper } from "node-ipinfo";

const ipinfo = new IPinfoLiteWrapper(process.env.Geolocation_API_KEY);
const userRoutes = express.Router();

userRoutes.post("/signup", async (req, res) => {
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

});




userRoutes.post("/verify-user", async (req, res) => {
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
});



userRoutes.post("/forgot-password", async (req, res) => {
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
});

userRoutes.post("/reset-password", async (req, res) => {
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
});



userRoutes.post("/signin", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET_REFRESH_TOKEN);
        
        await userModel.updateOne(
          { _id: decoded.id },
          { 
            $unset: { refreshToken: 1, refreshTokenExpiry: 1 } 
          }
        );
      } catch (tokenErr) {
        await userModel.updateOne(
          { refreshToken: refreshToken },
          { $unset: { refreshToken: 1, refreshTokenExpiry: 1 } }
        );
      }
    }

    res.clearCookie("accessToken", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({ message: "Successfully logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error during logout" });
  }
});



userRoutes.get("/all-users", async (req, res) => {
  try {
    const users = await userModel.find().select("-password -__v -verifyToken -forgotPasswordToken");
    
    return res.status(200).json(users);
  } catch (error) {
    console.log("Error in get user api ", error);
    return res.status(500).json("Server error");
  }
});

export default userRoutes;
