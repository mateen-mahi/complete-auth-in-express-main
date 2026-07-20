import mongoose from "mongoose";

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    totalTime: {
      type: Number,
      required: true,
      min: 1,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    questions: {
      type: [
        {
          question: {
            type: String,
            required: true,
            trim: true,
          },
          options: {
            type: [String],
            required: true,
            validate: [
              (val) => val.length >= 2, 
              "A question must have at least 2 options."
            ],
          },
          correctAnswer: {
            type: Number, 
            required: true,
            min: 0,
            validate: {
              validator: function (val) {
                return val < this.options.length;
              },
              message: "Correct answer index out of bounds of options array.",
            },
          },
        },
      ],
      validate: [
        (val) => val.length > 0, 
        "A quiz must contain at least one question."
      ],
    },
  },
  { timestamps: true }
);

const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);

export default Quiz;
