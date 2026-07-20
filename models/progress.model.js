import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },


  lectures: [
    {
      lectureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' },
      watched: { type: Boolean, default: false },
      lastPosition: { type: Number, default: 0 }, 
      completedAt: { type: Date },
    },
  ],

  quizzes: [
    {
      quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
      score: { type: Number, required: true }, 
      totalQuestions: { type: Number },
      correctAnswers: { type: Number },
      answers: [Number], 
      attemptedAt: { type: Date, default: Date.now },
    },
  ],

  overallProgress: { type: Number, min: 0, max: 100, default: 0 },
  completed: { type: Boolean, default: false },
}, { timestamps: true });

progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });



const Progress = mongoose.models.Progress || mongoose.model('Progress', progressSchema);

export default Progress;