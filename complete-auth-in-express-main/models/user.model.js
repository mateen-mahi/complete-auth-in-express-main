import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username :{
    type: String,
    required: true,
    trim: true,
    unique: true ,
    minlength: 4,
  },
  imageUrl : {
    type: String,
  },
  imagePublicId:{
    type: String,
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
    },
  maxlength: [254, "Email is too long"]
  },
  password: {
    type: String,
    required: true,
    minlength: 4,
  },
  gender :{
    type: String,
  },
  role : {
    type: String,
    enum: ["student", "instructor", "admin","super-admin", "user"], 
    default: "user",
  },
  loginHistory: [
    {
      loginTime: Date,
      ipAddress: String,
      location: String,
    },
    
  ],
  coursesProgress: [
    {
      courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
      completedLectures: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lecture" }],
      completedQuizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
      percentage: { type: Number, default: 0 }
    }
  ],
  forgotPasswordToken:String,
  forgotPasswordTokenExpiry:Date,
  verifyToken:String,
  verifyTokenExpiry:Date,
  refreshToken:String,
  refreshTokenExpiry:Date,
  isVerified: {
    type: Boolean,
    default: false,
  }
} ,{timestamps:true})

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
