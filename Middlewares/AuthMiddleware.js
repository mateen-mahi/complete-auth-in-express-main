import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const verifyAuth = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken && !refreshToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (accessToken) {
      try {
        const decoded = jwt.verify(
          accessToken,
          process.env.JWT_SECRET_ACCESS_TOKEN,
        );
        req.user = decoded;
        return next();

      } catch (err) {
        if (err.name !== "TokenExpiredError") {
          return res.status(401).json({ message: "Invalid access token" });
        }
      }
    }

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    let decodedRefresh;
    try {
      decodedRefresh = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET_REFRESH_TOKEN,
      );
    } catch (err) {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(decodedRefresh.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res
        .status(401)
        .json({ message: "Refresh token mismatch — please log in again" });
    }

    const newAccessToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET_ACCESS_TOKEN,
      { expiresIn: "15m" },
    );

    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET_REFRESH_TOKEN,
      { expiresIn: "7d" },
    );

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, 
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    req.user = { id: user._id, email: user.email };
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = verifyAuth;

// const userAuthentication = (req,res,next)=>{
//   const token = req.cookies.JWTToken;
//   if(!token){
//     return res.redirect('/users/login');
//   }else{
//     jwt.verify(token, process.env.JWT_SECRET_ACCESS_TOKEN, (err, decodedToken) => {
//       if(err){
//         res.clearCookie('JWTToken');
//         return res.redirect('/users/login');
//       }
//       // res.redirect("/");
//       req.user = decodedToken;
//       next();
//     });
//   }

// }
