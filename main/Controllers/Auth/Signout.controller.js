
import jwt from "jsonwebtoken";
import userModel from "../../models/user.model.js";

const SignoutController = async (req, res) => {
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

    const isProduction = process.env.NODE_ENV === "production";

res.clearCookie("accessToken", accessToken, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "None" : "Lax",   // no trailing space
  path: "/",
  maxAge: 15 * 60 * 1000,
});

res.clearCookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "None" : "Lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});


    return res.status(200).json({ message: "Successfully signed out" });
  } catch (error) {
    console.error("Signout error:", error);
    return res.status(500).json({ message: "Internal server error during signout" });
  }
};

export default SignoutController;