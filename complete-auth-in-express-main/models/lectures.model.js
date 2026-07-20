import mongoose from "mongoose";

const LectureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    videoId: {
      type: String, 
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
  },
  { timestamps: true }
);

const Lecture = mongoose.models.Lecture || mongoose.model("Lecture", LectureSchema);

export default Lecture;
