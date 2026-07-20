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
          { $unset: { refreshToken: 1, refreshTokenExpiry: 1 } }
        );
      } catch (tokenErr) {
        // Token invalid/expired — still try to clear from DB by token value
        await userModel.updateOne(
          { refreshToken: refreshToken },
          { $unset: { refreshToken: 1, refreshTokenExpiry: 1 } }
        );
      }
    }

<<<<<<< Updated upstream
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
=======
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
    };

    // Clear both cookies
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
>>>>>>> Stashed changes

    return res.status(200).json({ message: "Successfully signed out" });
  } catch (error) {
    console.error("Signout error:", error);
    return res.status(500).json({ message: "Internal server error during signout" });
  }
};

export default SignoutController;