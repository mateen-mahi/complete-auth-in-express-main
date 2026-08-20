import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    // duration: { type: Number, required: true, min: 0 },
    duration: { type: String, required: true, min: 0 },
    studentsEnrolled: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ],
    level: { 
      type: String, 
      enum: ["Beginner", "Intermediate", "Advanced"], 
      required: true 
    },
    lectures: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lecture" }],
    quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
    featured: { type: Boolean, default: false },
    color: { type: String, required: true },   
    emoji: { type: String, required: true }  
  },
  { timestamps: true }
);

const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);

export default Course;
