import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../../models/user.model.js";
import { verifyMailSender } from "../../utils/mailSender.js";

const EMAIL_MAX_LENGTH = 254; 
const PASSWORD_MAX_LENGTH = 72; 
const PASSWORD_MIN_LENGTH = 8;

const SignupController = async (req, res) => {
  try {
    const { username, email, password, gender } = req.body;

    if (!username || !email || !password || !gender) {
      return res.status(400).json("Please fill out all fields");
    }


 if (
  email.length > EMAIL_MAX_LENGTH ||
  password.length > PASSWORD_MAX_LENGTH ||
  password.length < PASSWORD_MIN_LENGTH
) {
  return email.length > EMAIL_MAX_LENGTH
    ? res.status(400).json({
        success: false,
        message: `Email cannot exceed ${EMAIL_MAX_LENGTH} characters.`,
      })
    : password.length > PASSWORD_MAX_LENGTH
    ? res.status(400).json({
        success: false,
        message: `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`,
      })
    : res.status(400).json({
        success: false,
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
      });
}

const existingUser = await userModel.findOne({ email });

if (existingUser) {
  if (!existingUser.isVerified) {
    return res.status(409).json({
      success: false,
      code: "EMAIL_NOT_VERIFIED",
      message: "This email is registered but not verified.",
    });
  }

  return res.status(409).json({
    success: false,
    code: "EMAIL_ALREADY_EXISTS",
    message: "An account with this email already exists.",
  });
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