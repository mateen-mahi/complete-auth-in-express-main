import userModel from "../../models/user.model.js";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary.js";
import cloudinary from "../../config/cloudinary.js";
import bcrypt from "bcryptjs";
import { notifyUserRegistered } from "../../service/adminEvents.js";

// ─────────────────────────────────────────────────────────────
// 1. GET ALL USERS 
// ─────────────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const users = await userModel
      .find()
      .select("username email gender role isVerified createdAt updatedAt imageUrl");

    const usersWithImage = users.map((user) => {
      const userObj = user.toObject();
      userObj.imageUrl = userObj.imageUrl || null;
      return userObj;
    });

    return res.status(200).json({ success: true, count: usersWithImage.length, users: usersWithImage });
  } catch (error) {
    console.log("Error in get all users api: ", error);
    return res.status(500).json({ success: false, message: "Server error while fetching users" });
  }
};

// ─────────────────────────────────────────────────────────────
// 2. GET SINGLE USER
// ─────────────────────────────────────────────────────────────
export const getSingleUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel
      .findById(id)
      .select("username email gender role isVerified createdAt updatedAt imageUrl loginHistory");

    if (!user) {
      return res.status(404).json({ success: false, message: "User profile context not found" });
    }

    const userData = user.toObject();
    userData.imageUrl = userData.imageUrl || null;

    return res.status(200).json({ success: true, user: userData });
  } catch (error) {
    console.log("Error in get single user api: ", error);
    return res.status(500).json({ success: false, message: "Server error while fetching single user node" });
  }
};

// ─────────────────────────────────────────────────────────────
// 3. DELETE SPECIFIC USER
// ─────────────────────────────────────────────────────────────
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await userModel.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ success: false, message: "Target user not found to delete" });
    }

    if (deletedUser.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(deletedUser.imagePublicId);
      } catch (cleanupError) {
        console.log("Failed to delete user's image from Cloudinary:", cleanupError);
      }
    }

    return res.status(200).json({ success: true, message: "User node deleted from configuration successfully" });
  } catch (error) {
    console.log("Error in delete user api: ", error);
    return res.status(500).json({ success: false, message: "Server error while removing user node" });
  }
};

// ─────────────────────────────────────────────────────────────
// 4. DELETE ALL USERS (Super Admin Tool)
// ─────────────────────────────────────────────────────────────
export const deleteAllUsers = async (req, res) => {
  try {
    const users = await userModel.find({ role: { $ne: "super-admin" } });

    for (const user of users) {
      if (user.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(user.imagePublicId);
        } catch (cleanupError) {
          console.log("Failed to delete image during bulk wipe:", cleanupError);
        }
      }
    }


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
// 5. EDIT/UPDATE USER
// ─────────────────────────────────────────────────────────────
export const editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, gender, role, isVerified } = req.body;

    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User context not found to edit" });
    }

    if (email && email !== user.email) {
      const emailExists = await userModel.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: "This email address is already registered by another node" });
      }
      user.email = email;
    }

    const file = req.file;
    if (file) {
      if (user.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(user.imagePublicId);
        } catch (cleanupError) {
          console.log("Failed to delete old image from Cloudinary:", cleanupError);
        }
      }

      const { buffer } = file;
      const uploadResult = await uploadToCloudinary(buffer, { folder: "user_profiles" });
      user.imageUrl = uploadResult.url;
      user.imagePublicId = uploadResult.publicId;
    }

    if (username) user.username = username.trim();
    if (gender) user.gender = gender;
    if (role) user.role = role;
    if (typeof isVerified === "boolean") user.isVerified = isVerified;

    const updatedUser = await user.save();

    const safeUserData = {
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      gender: updatedUser.gender,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
      imageUrl: updatedUser.imageUrl || null,
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

// ─────────────────────────────────────────────────────────────
// 6. UPDATE PASSWORD
// ─────────────────────────────────────────────────────────────
export const updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are both required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

   
    const user = await userModel.findById(id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User context not found to update password" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: "New password must be different from the current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.log("Error in update user password api: ", error);
    return res.status(500).json({ success: false, message: "Server error during password update" });
  }
};

// ─────────────────────────────────────────────────────────────
// 7. ADD NEW USER
// ─────────────────────────────────────────────────────────────
export const addNewUser = async (req, res) => {
  try {
    const { username, email, password, gender, isVerified } = req.body;

    if (!username || !email || !password || !gender || typeof isVerified !== "boolean") {
      return res.status(400).json({ success: false, message: "Username, email, password, gender, and verification status are required" });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "This email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new userModel({
      username,
      email,
      password: hashedPassword,
      gender,
      isVerified
    });

    const savedUser = await newUser.save(); // NEW — was `await newUser.save();`, captured so it can be passed to the notifier below

    notifyUserRegistered(savedUser); // NEW — pushes to the admin dashboard live

    return res.status(201).json({ success: true, message: "New user created successfully" });
  } catch (error) {
    console.log("Error in add new user api: ", error);
    return res.status(500).json({ success: false, message: "Server error during new user creation" });
  }
};