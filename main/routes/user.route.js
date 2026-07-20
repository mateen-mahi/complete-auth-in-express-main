import express from "express";
import verifyAuth from "../Middlewares/AuthMiddleware.js";
import upload from "../Middlewares/multer.middleware.js"; // was missing — caused a crash on "upload.single"
import SignupController from "../Controllers/Auth/Signup.controller.js";
import SigninController from "../Controllers/Auth/Signin.controller.js";
import SignoutController from "../Controllers/Auth/Signout.controller.js";
import ForgotPasswordController from "../Controllers/Auth/ForgotPassword.controller.js";
import ResetPasswordController from "../Controllers/Auth/ResetPassword.controller.js";
import CheckAuthController from "../Controllers/Auth/CheckAuth.controller.js";
import OtpSenderController from "../Controllers/Auth/SendingOTP.controller.js";
import VerifyUserController from "../Controllers/Auth/verifyUser.controller.js";
import {
  getAllUsers,
  getSingleUser,
  editUser,
  deleteUser,
  deleteAllUsers,
  updateUserPassword,
  addNewUser
} from "../Controllers/Auth/AllUsers.controller.js";

const userRoutes = express.Router();

userRoutes.post("/signup", SignupController);
userRoutes.post("/signin", SigninController);
userRoutes.post("/signout", SignoutController);
userRoutes.post("/forgot-password", ForgotPasswordController);
userRoutes.post("/reset-password", ResetPasswordController);
userRoutes.get("/check-auth", verifyAuth, CheckAuthController);
userRoutes.post("/send-verify-otp", OtpSenderController);
userRoutes.post("/verify-user", VerifyUserController);
userRoutes.post("/add-user", verifyAuth, addNewUser);

userRoutes.get("/all-users", verifyAuth, getAllUsers);
userRoutes.get("/single-user/:id", verifyAuth, getSingleUser);
userRoutes.put("/update-password/:id", verifyAuth, updateUserPassword);
userRoutes.put("/edit-user/:id", verifyAuth, upload.single("avatar"), editUser);
userRoutes.delete("/delete-user/:id", verifyAuth, deleteUser);
userRoutes.delete("/clear-all-users", verifyAuth, deleteAllUsers);

export default userRoutes;