import userModel from "../../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IPinfoWrapper } from "node-ipinfo"; 
import { UAParser } from "ua-parser-js";

const ipInfo = new IPinfoWrapper(process.env.Geolocation_API_KEY);


const EMAIL_MAX_LENGTH = 254; 
const PASSWORD_MAX_LENGTH = 72; 
const PASSWORD_MIN_LENGTH = 8;

const signinController = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate request
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill out all fields",
      });
    }

    // Length validation (do this BEFORE any DB lookup or bcrypt call)
    if (typeof email !== "string" || email.length > EMAIL_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Email must be at most ${EMAIL_MAX_LENGTH} characters`,
      });
    }
    if (
      typeof password !== "string" ||
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > PASSWORD_MAX_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
      });
    }

    // Find user
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

if (!user.isVerified) {
  return res.status(403).json({
    success: false,
    message: "Please verify your email before signing in",
    redirectToVerification: true,
    email: user.email,
  });
}

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate Access Token
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET_ACCESS_TOKEN,
      { expiresIn: "15m" }
    );

    // Generate Refresh Token
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET_REFRESH_TOKEN,
      { expiresIn: "7d" }
    );

    // Get client IP
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      req.ip;

    // Get Location (full IPinfo API supports city/region; Lite does not)
    let location = "Unknown Location";
    try {
      const ipData = await ipInfo.lookupIp(clientIp);
      if (ipData && ipData.city) {
        location = `${ipData.city}, ${ipData.region || ""}, ${
          ipData.country || ""
        }`;
      }
    } catch (ipError) {
      console.error("IP lookup failed:", ipError.message);
    }

    // Get Device Info from User-Agent
    const parser = new UAParser(req.headers["user-agent"]);
    const uaResult = parser.getResult();
    const deviceInfo = {
      browser: uaResult.browser.name
        ? `${uaResult.browser.name} ${uaResult.browser.version || ""}`.trim()
        : "Unknown Browser",
      os: uaResult.os.name
        ? `${uaResult.os.name} ${uaResult.os.version || ""}`.trim()
        : "Unknown OS",
      deviceType: uaResult.device.type || "desktop", // mobile, tablet, desktop
      deviceModel: uaResult.device.model || null,
      deviceVendor: uaResult.device.vendor || null,
      raw: req.headers["user-agent"] || "Unknown",
    };

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = hashedRefreshToken;

    // Save login history
    user.loginHistory.push({
      loginTime: new Date(),
      ipAddress: clientIp,
      location,
      device: deviceInfo,
    });

    // Keep only the latest 20 login records
    if (user.loginHistory.length > 20) {
      user.loginHistory = user.loginHistory.slice(-20);
    }

    await user.save();

    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
    };

    res.cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Signin successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        imageUrl: user.imageUrl,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Error in SigninController:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default signinController;