import express from "express";
import verifyAuth from "../Middlewares/AuthMiddleware.js";
import SignupController from "../Controllers/Auth/Signup.controller.js";
import SigninController from "../Controllers/Auth/Signin.controller.js";
import SignoutController from "../Controllers/Auth/Signout.controller.js";
import ForgotPasswordController from "../Controllers/Auth/ForgotPassword.controller.js";
import ResetPasswordController from "../Controllers/Auth/ResetPassword.controller.js";
import CheckAuthController from "../Controllers/Auth/CheckAuth.controller.js";
import  verifyUser  from "../Controllers/Auth/VerifyUser.controller.js";
import { 
  getAllUsers, 
  getSingleUser, 
  editUser,  
  deleteUser, 
  deleteAllUsers 
} from "../Controllers/Auth/AllUsers.controller.js"; 





const userRoutes = express.Router();

userRoutes.post("/signup", SignupController);
userRoutes.post("/signin", SigninController);
userRoutes.post("/signout", SignoutController);
userRoutes.post("/forgot-password", ForgotPasswordController);
userRoutes.post("/reset-password", ResetPasswordController);
userRoutes.get("/check-auth",verifyAuth, CheckAuthController);
userRoutes.post("/verify-user",verifyUser);


// userRoutes.get("/all-users", verifyAuth, getAllUsers);
// userRoutes.get("/single-user/:id", verifyAuth, getSingleUser);
// userRoutes.put("/edit-user/:id", verifyAuth, editUser);
// userRoutes.patch("/update-role/:id", verifyAuth, updateUserRole);
// userRoutes.delete("/delete-user/:id", verifyAuth, deleteUser);
// userRoutes.delete("/clear-all-users", verifyAuth, deleteAllUsers);


userRoutes.get("/all-users", verifyAuth, getAllUsers);
userRoutes.get("/single-user/:id", verifyAuth, getSingleUser);
userRoutes.put("/edit-user/:id", verifyAuth, editUser);
// userRoutes.patch("/update-role/:id", verifyAuth, updateUserRole);
userRoutes.delete("/delete-user/:id", verifyAuth, deleteUser);
userRoutes.delete("/clear-all-users", verifyAuth, deleteAllUsers);




export default userRoutes;
