import userModel from "../../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IPinfoLiteWrapper } from "node-ipinfo";

const ipInfo = new IPinfoLiteWrapper(process.env.Geolocation_API_KEY);


const signinController = async (req, res) => {
 
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json("Please fill out all fields");
    }
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json("User not found");
    }

if (!user.isVerified) {
  const verifyToken = Math.floor(100000 + Math.random() * 900000).toString(); 
  const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  user.verifyToken = verifyToken;
  user.verifyTokenExpiry = verifyTokenExpiry;
  await user.save();

  await verifyMailSender(verifyToken, user.email);

  return res.status(200).json({
    message: "Your account is not verified yet. We have sent a fresh OTP.",
    redirectToVerification: true,
    email: user.email
  })};






    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json("Invalid credentials");
    }

    
    const accessToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET_ACCESS_TOKEN,
      { expiresIn: "15m" },
    );
    
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET_REFRESH_TOKEN,
      { expiresIn: "7d" },
    );
    
    
    let location = "Unknown Location";
    try {
      const ipData = await ipInfo.lookup(req.ip || "");
      if (ipData && ipData.city) {
        location = `${ipData.city}, ${ipData.region || ""}, ${ipData.country || ""}`;
      }
    } catch (ipError) {
      console.error("IP lookup failed:", ipError.message);
    }
    
    user.refreshToken = refreshToken;
    user.loginHistory.push({
      loginTime: new Date(),
      ipAddress: req.ip,
      location: location,
    });
    await user.save();
const isProduction = process.env.NODE_ENV === "production";
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProduction,
      // sameSite: isProduction ? "None " : "Lax", 
      path: "/",
      maxAge: 15 * 60 * 1000, 
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      // sameSite: isProduction ? "None " : "Lax", 
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    return res.status(200).json("Signin successful");
  } catch (error) {
    console.log("Error in signin api ", error);
    res.status(500).json("Server error");
  }

}


export default signinController;