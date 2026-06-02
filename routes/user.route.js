import express from 'express'
import userModel from'../models/user.model.js';
 import {verifyMailSender} from '../utils/mailSender.js';
 import { forgotPasswordMailSender } from '../utils/mailSender.js';
 import crypto from 'crypto';
import bcrypt from'bcryptjs';
import jwt from 'jsonwebtoken';

const userRoutes = express.Router();



  userRoutes.post("/signin", async(req, res)=>{
    try {
    const {username,email,password , gender} = req.body;

if (!username || !email || !password || !gender) {
  return res.status(400).json("Please fill out all fields");
}

const hashPassword =await bcrypt.hash(password, 10);

const verifyToken = Math.floor(100000 + Math.random() * 900000)
const verifyTokenExpiry =  new Date(Date.now() + 24 * 60 * 60 * 1000);
 const storedUser = await userModel.create({username,email,gender,password:hashPassword,verifyToken ,verifyTokenExpiry});

 verifyMailSender(verifyToken ,storedUser.email );
console.log("User  created Successfully");

return res.status(200).json("User created Successfully");


  
} catch (error) {
  res.status(500).json("Server Error");
  console.log("Error While Posting user Model , Error: ", error);
}

    res.json("Form submitted");

  })

  userRoutes.post("/verifyuser", async (req, res) => {
    try {
      const { verifyToken } = req.body; // Extract the verifyToken from the request body
  
      if (!verifyToken) {
        return res.status(400).json("Verification token is required.");
      }
  
      // Find user with the given verifyToken and check if tokenExpiry is greater than or equal to now
      const user = await userModel.findOne({
        verifyToken,
        verifyTokenExpiry: { $gte: new Date() } // Token must not have expired
      });
  
      if (!user) {
        return res.status(400).json("Invalid or expired token");
      }
  
      // Mark the user as verified
      user.isVerified = true;
      user.verifyTokenExpiry = '';
      user.verifyToken = '';
      await user.save();
  
      return res.status(200).json("User has been verified");
    } catch (error) {
      console.error("Error while verifying user:", error);
      return res.status(500).json("Server error");
    }
  });
  

userRoutes.post("/login" , async(req,res)=>{
  try {
    const {email , password} = req.body;
    if (!email ||!password) {
      return res.status(404).json("Please fill out all fields");
    }
    const user = await userModel.findOne({email});

    if (!user) return res.status(404).json("Email or Password is incorrect");

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) return res.status(404).json("Email or Password is incorrect");

  const token = jwt.sign({id : user._id} , process.env.JWT_SECRET , {expiresIn : "5d"});

  res.cookie("JWTToken", token, {httpOnly: true , secure : process.env.NODE_ENV === "production" , path : "/"});
  user.lastTimeLogin = new Date();
  await user.save();

res.status(200).json("access Granted!!!!!");
  } catch (error) {
    res.status(500).json("something went wrong");
    console.log("login error ", error);
    
  }

})



userRoutes.post('/sendverifyotp', async (req, res) => {
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
  user.resetToken = verifyToken;
  user.resetTokenExpiry = verifyTokenExpiry;
  await user.save();

    verifyMailSender(verifyToken, email);
    res.status(200).json("Reset Password Email sent");
    } catch (error) {
      res.status(500).json("Something went wrong");
      console.log("Error sending reset password email");
    
}});

userRoutes.post('/forgotpassword', async (req, res) => {

   const forgotPasswordToken =  crypto.randomBytes(32).toString('hex');
   const forgotPasswordTokenExpiry = new Date( Date.now() + 24 * 60 * 60 * 1000 );
   const { email } = req.body;

const user = await userModel.findOne({email});
try {
  
if (!user) {
  return res.status(404).json("this account is not available");
}

user.forgotPasswordToken = forgotPasswordToken;
user.forgotPasswordTokenExpiry = forgotPasswordTokenExpiry;

await user.save();
forgotPasswordMailSender(forgotPasswordToken, email)

res.status(200).json("Reset Password Link sent to your email");
  
} catch (error) {
  console.log("Error in forgot password api ",error);
  
  res.status(404).json('Invalid email address')
}
  

})

userRoutes.post('/resetpassword', async (req, res) => {
try{
  const {password} = req.body
  if (!password) {
    return res.status(400).json("Please provide a password");
  }
  const {token} = req.query;

const user = await userModel.findOne({ forgotPasswordToken: token, forgotPasswordTokenExpiry: { $gt: new Date() } });

if (!user) {
  return res.status(404).json("Invalid or expired token");
}

const hashedPassword = await bcrypt.hash(password, 10);

user.password = hashedPassword;

user.forgotPasswordToken = '';

user.forgotPasswordTokenExpiry = '';

await user.save();

res.status(200).json("Password reset successful Now you can login with your new password");
 } catch (error) {
  console.log("Error in reset password api ",error);
  res.status(500).json("Server error");
 }

})


userRoutes.get("/logout", (req, res) => {
  // Check if the cookie exists
  if (!req.cookies.JWTToken) {
    return res.status(400).json({ message: "No active session to log out" });
  }

  // Clear the cookie
  res.clearCookie("JWTToken", { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  
  // Send success response
  res.status(200).json({ message: "Successfully logged out" });
});



userRoutes.get("/getusers", async (req, res) => {
try{

  const token = req.cookies.JWTToken;

  if (!token) {
    return res.status(401).json("Unauthorized: No token provided");
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      res.clearCookie('JWTToken');
      return res.status(401).json("Unauthorized: Invalid token");
    }});
    
  const users = await userModel.find().select("-password -__v");
  res.status(200).json(users);


}catch(error){
  console.log("Error in get user api ",error);
  res.status(500).json("Server error");
}
});





export default userRoutes;
