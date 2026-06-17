import userModel from "../../models/user.model.js";



 const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find().select("-password -__v -verifyToken -forgotPasswordToken");
    
    return res.status(200).json(users);
  } catch (error) {
    console.log("Error in get user api ", error);
    return res.status(500).json("Server error");
  }
};

export default getAllUsers;