import User from "../../models/user.model.js";

const CheckAuthController = async (req, res) => {

  
  try {

    if (!req.user || !req.user.id) {
      return res.status(401).json({ isAuthenticated: false, message: "Unauthorized" });
    }


   const user = await User.findById(req.user.id).select(
  "username email gender role isVerified createdAt",
);

    if (!user) {
      return res.status(404).json({ isAuthenticated: false, message: "User no longer exists" });
    }

    return res.status(200).json({
      isAuthenticated: true,
      user
    });

  } catch (error) {
    console.error("Error in CheckAuth controller:", error);
    return res.status(500).json({ isAuthenticated: false, message: "Internal server error" });
  }

}

export default CheckAuthController;

