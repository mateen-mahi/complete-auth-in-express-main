import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import userModel from "../models/user.model.js";

const verifyAuth = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken && !refreshToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_ACCESS_TOKEN);
        req.user = decoded;
        return next();
      } catch (err) {
        if (err.name !== "TokenExpiredError") {
          return res.status(401).json({ message: "Invalid access token" });
        };
      }
    }

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    let decodedRefresh;
    try {
      decodedRefresh = jwt.verify(refreshToken, process.env.JWT_SECRET_REFRESH_TOKEN);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const user = await userModel.findById(decodedRefresh.id);

    if (!user || !user.refreshToken) {
      return res.status(401).json({ message: "User not found" });
    }

    // refreshToken in DB is a bcrypt hash — compare, don't equality-check
    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) {
      return res.status(401).json({ message: "Refresh token mismatch — please log in again" });
    }

    const newAccessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET_ACCESS_TOKEN,
      { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET_REFRESH_TOKEN,
      { expiresIn: "7d" }
    );

    // Hash before storing — never persist a raw refresh token
    user.refreshToken = await bcrypt.hash(newRefreshToken, 10);
    await user.save();

    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
    };

    res.cookie("accessToken", newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    req.user = { id: user._id, email: user.email, role: user.role };
    return next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default verifyAuth;