import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username :{
    type: String,
    required: true,
    trim: true,
    unique: true ,
    minlength: 4,
  },
  email : {
    type: String,
    required: true,
    trim: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address.'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 4,
  },
  gender :{
    type: String,
  },
  lastTimeLogin : Date,
forgotPasswordToken:String,
  forgotPasswordTokenExpiry:Date,
  verifyToken:String,
  verifyTokenExpiry:Date,
  isVerified: {
    type: Boolean,
    default: false,
  }

  
} ,{timestamps:true})



export default  mongoose.model("User", userSchema);
