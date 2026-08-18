import userModel from "../../models/user.model.js";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary.js";
import cloudinary from "../../config/cloudinary.js";
import bcrypt from "bcryptjs";
import { notifyUserRegistered } from "../../service/adminEvents.js";

// Whitelisted roles/genders accepted by the ?role= and ?gender= filters.
// Anything outside these lists is ignored rather than passed straight to
// Mongo, so a bad query param can't silently return an empty/wrong result.
const USER_FILTERABLE_ROLES = ["student", "instructor", "admin", "super-admin"];
const USER_FILTERABLE_GENDERS = ["male", "female", "other"];

const buildUserFilter = (query) => {
  const filter = {};

  if (query.role && USER_FILTERABLE_ROLES.includes(query.role)) {
    filter.role = query.role;
  }

  if (query.gender && USER_FILTERABLE_GENDERS.includes(query.gender)) {
    filter.gender = query.gender;
  }

  if (query.isVerified === "true") filter.isVerified = true;
  if (query.isVerified === "false") filter.isVerified = false;

  // Free-text search across username/email — same "user typed something"
  // input as the search bar, kept separate from the exact-match filters.
  if (query.search && query.search.trim()) {
    const safe = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { username: { $regex: safe, $options: "i" } },
      { email: { $regex: safe, $options: "i" } },
    ];
  }

  return filter;
};

// Whitelisted sortable fields for getAllUsers, mapped to their schema paths.
// Prevents arbitrary/unindexed field sorting via query injection.
const USER_SORTABLE_FIELDS = {
  username: "username",
  email: "email",
  role: "role",
  gender: "gender",
  isVerified: "isVerified",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

const buildUserSort = (sortBy, order) => {
  const field = USER_SORTABLE_FIELDS[sortBy] || "createdAt";
  const direction = order === "asc" ? 1 : -1;
  return { [field]: direction };
};

// ─────────────────────────────────────────────────────────────
// 1. GET ALL USERS 
// ─────────────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = buildUserSort(req.query.sortBy, req.query.order);
    const filter = buildUserFilter(req.query);

    const totalUsers = await userModel.countDocuments(filter);

    const users = await userModel
      .find(filter)
      .select("username email gender role isVerified createdAt updatedAt imageUrl")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const usersWithImage = users.map((user) => {
      const userObj = user.toObject();
      userObj.imageUrl = userObj.imageUrl || null;
      return userObj;
    });

    return res.status(200).json({
      success: true,
      count: usersWithImage.length,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      users: usersWithImage,
    });
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
    // Accept either a single user object or an array of user objects
    const isBulk = Array.isArray(req.body);
    const users = isBulk ? req.body : [req.body];

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: "At least one user is required" });
    }

    // Validate every entry before touching the DB
    for (let i = 0; i < users.length; i++) {
      const { username, email, password, gender, isVerified } = users[i];
      if (!username || !email || !password || !gender || typeof isVerified !== "boolean") {
        return res.status(400).json({
          success: false,
          message: `Entry ${i + 1}: username, email, password, gender, and verification status are required`,
        });
      }
    }

    // Catch duplicate emails within the same request payload itself
    const emailsInPayload = users.map((u) => u.email.toLowerCase());
    const duplicatesInPayload = emailsInPayload.filter(
      (email, idx) => emailsInPayload.indexOf(email) !== idx
    );
    if (duplicatesInPayload.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Duplicate email(s) in request: ${[...new Set(duplicatesInPayload)].join(", ")}`,
      });
    }

    // Catch emails that already exist in the DB
    const existingUsers = await userModel.find({ email: { $in: emailsInPayload } }).select("email");
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Already registered: ${existingUsers.map((u) => u.email).join(", ")}`,
      });
    }

    // Hash all passwords in parallel
    const usersToInsert = await Promise.all(
      users.map(async (u) => ({
        username: u.username,
        email: u.email,
        password: await bcrypt.hash(u.password, 10),
        gender: u.gender,
        isVerified: u.isVerified,
      }))
    );

    const savedUsers = await userModel.insertMany(usersToInsert);

    // Notify for each created user
    savedUsers.forEach((savedUser) => notifyUserRegistered(savedUser));

    return res.status(201).json({
      success: true,
      message: isBulk
        ? `${savedUsers.length} user(s) created successfully`
        : "New user created successfully",
    });
  } catch (error) {
    console.log("Error in add new user api: ", error);
    return res.status(500).json({ success: false, message: "Server error during new user creation" });
  }
};