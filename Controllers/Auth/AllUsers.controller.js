import userModel from "../../models/user.model.js";

// ─────────────────────────────────────────────────────────────
// 1. GET ALL USERS (Sare Users Ko Fetch Karne Ke Liye)
// ─────────────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find().select("-password -__v -verifyToken -forgotPasswordToken");
    return res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    console.log("Error in get all users api: ", error);
    return res.status(500).json({ success: false, message: "Server error while fetching users" });
  }
};

// ─────────────────────────────────────────────────────────────
// 2. GET SINGLE USER (Ek Specific User Ki Detail ID Se Nikalne Ke Liye)
// ─────────────────────────────────────────────────────────────
export const getSingleUser = async (req, res) => {
  try {
    const { id } = req.params; // URL parameters se id nikali (/api/users/single/:id)
    const user = await userModel.findById(id).select("-password -__v -verifyToken -forgotPasswordToken");

    if (!user) {
      return res.status(404).json({ success: false, message: "User profile context not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.log("Error in get single user api: ", error);
    return res.status(500).json({ success: false, message: "Server error while fetching single user node" });
  }
};

// ─────────────────────────────────────────────────────────────
// 3. DELETE SPECIFIC USER (Kisi Ek User Ko System Se Delete Karne Ke Liye)
// ─────────────────────────────────────────────────────────────
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await userModel.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ success: false, message: "Target user not found to delete" });
    }

    return res.status(200).json({ success: true, message: "User node deleted from configuration successfully" });
  } catch (error) {
    console.log("Error in delete user api: ", error);
    return res.status(500).json({ success: false, message: "Server error while removing user node" });
  }
};

// ─────────────────────────────────────────────────────────────
// 4. DELETE ALL USERS (Saare Users Ek Sath Khali Karne Ke Liye - Super Admin Tool)
// ─────────────────────────────────────────────────────────────
export const deleteAllUsers = async (req, res) => {
  try {
    // ⚠️ Safety Layer: Yeh saare non-admin users ko saaf karega taaki aapka main admin account delete na ho
    const result = await userModel.deleteMany({ role: { $ne: "super-admin" } }); 

    return res.status(200).json({ 
      success: true, 
      message: `System cleared. Removed ${result.deletedCount} user nodes safely. (Protected Super Admins)` 
    });
  } catch (error) {
    console.log("Error in delete all users api: ", error);
    return res.status(500).json({ success: false, message: "Server error while executing cluster-wide wipe" });
  }
};

// ─────────────────────────────────────────────────────────────
// 5. UPDATE USER ROLE (Admin Se Role Modifying Handle Ke Liye)
// ─────────────────────────────────────────────────────────────
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // expected: "end-user" | "admin" | "super-admin"

    if (!role) {
      return res.status(400).json({ success: false, message: "Target role permission payload is missing" });
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select("-password -__v");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User context not found to upgrade permissions" });
    }

    return res.status(200).json({ success: true, message: "Role privileges updated successfully", user: updatedUser });
  } catch (error) {
    console.log("Error in update role api: ", error);
    return res.status(500).json({ success: false, message: "Server error during cluster role modification" });
  }
};

// ─────────────────────────────────────────────────────────────
// 6. EDIT/UPDATE USER (User Profile Data Edit/Modify Karne Ke Liye)
// ─────────────────────────────────────────────────────────────
export const editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, gender } = req.body;

    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User context not found to edit" });
    }

    // Agar email change ho raha hai, to check karein naya email unique hai ya nahi
    if (email && email !== user.email) {
      const emailExists = await userModel.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: "This email address is already registered by another node" });
      }
      user.email = email;
    }

    if (username) user.username = username.trim();
    if (gender) user.gender = gender;

    const updatedUser = await user.save();

    const safeUserData = {
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      gender: updatedUser.gender,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified
    };

    return res.status(200).json({ 
      success: true, 
      message: "User context configuration updated successfully", 
      user: safeUserData 
    });

  } catch (error) {
    console.log("Error in edit user api: ", error);
    return res.status(500).json({ success: false, message: "Server error during profile structure modification" });
  }
};
