import Quiz from "../../models/quiz.model.js";
import Course from "../../models/courses.model.js";

const handleControllerError = (res, error) => {
  console.error(error);

  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: error.message });
  }

  return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
};

// ─────────────────────────────────────────────────────────────
// 1. GET all quizzes (admin list) – paginated, no questions
// ─────────────────────────────────────────────────────────────
export const getAllQuizzes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const quizzes = await Quiz.find()
      .populate("courseId", "title")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Quiz.countDocuments();

    const quizzesSummary = quizzes.map((quiz) => {
      const { questions, ...rest } = quiz;
      return { ...rest, questionCount: questions.length };
    });

    res.status(200).json({
      success: true,
      data: quizzesSummary,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 2. GET a single quiz by ID (for review / preview) – strips correct answers
// ─────────────────────────────────────────────────────────────
export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId)
      .populate("courseId", "title")
      .lean();

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    const sanitizedQuestions = quiz.questions.map(({ correctAnswer, ...q }) => q);
    const sanitizedQuiz = { ...quiz, questions: sanitizedQuestions };

    res.status(200).json({ success: true, data: sanitizedQuiz });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 3. GET quiz for attempt (same as getQuizById but explicitly for taking)
// ─────────────────────────────────────────────────────────────
export const getQuizForAttempt = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId)
      .populate("courseId", "title")
      .lean();

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    // Strip correctAnswer from each question
    const sanitizedQuestions = quiz.questions.map(({ correctAnswer, ...q }) => q);
    const sanitizedQuiz = { ...quiz, questions: sanitizedQuestions };

    res.status(200).json({ success: true, data: sanitizedQuiz });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 4. CREATE a new quiz – also adds reference to Course
// ─────────────────────────────────────────────────────────────
export const createQuiz = async (req, res) => {
  try {
    const bulk = Array.isArray(req.body);
    const quizzesInput = bulk ? req.body : [req.body];

    if (quizzesInput.length === 0) {
      return res.status(400).json({ success: false, message: "At least one quiz is required" });
    }

    for (let i = 0; i < quizzesInput.length; i++) {
      const { title, subject, totalTime, courseId, questions } = quizzesInput[i];
      if (!title || !subject || !totalTime || !courseId || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Entry ${i + 1}: title, subject, totalTime, courseId, and at least one question are required`,
        });
      }
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({
          success: false,
          message: `Entry ${i + 1}: invalid courseId format`,
        });
      }
    }

    const courseIds = [...new Set(quizzesInput.map((q) => q.courseId))];
    const existingCourses = await Course.find({ _id: { $in: courseIds } }).select("_id");

    if (existingCourses.length !== courseIds.length) {
      const foundIds = new Set(existingCourses.map((c) => c._id.toString()));
      const missingIds = courseIds.filter((id) => !foundIds.has(id));
      return res.status(404).json({
        success: false,
        message: `Course(s) not found: ${missingIds.join(", ")}`,
      });
    }

    const quizDocs = quizzesInput.map(
      (q) =>
        new Quiz({
          title: q.title,
          subject: q.subject,
          totalTime: q.totalTime,
          courseId: q.courseId,
          questions: q.questions,
        })
    );

    const savedQuizzes = await Promise.all(quizDocs.map((doc) => doc.save()));

    const quizIdsByCourse = {};
    savedQuizzes.forEach((quiz) => {
      const courseId = quiz.courseId.toString();
      if (!quizIdsByCourse[courseId]) quizIdsByCourse[courseId] = [];
      quizIdsByCourse[courseId].push(quiz._id);
    });

    await Promise.all(
      Object.entries(quizIdsByCourse).map(([courseId, quizIds]) =>
        Course.findByIdAndUpdate(courseId, {
          $push: { quizzes: { $each: quizIds } },
        })
      )
    );

    return res.status(201).json({
      success: true,
      message: bulk
        ? `${savedQuizzes.length} quiz(zes) created successfully`
        : "Quiz created successfully",
      data: bulk ? savedQuizzes : savedQuizzes[0],
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 5. UPDATE a quiz
// ─────────────────────────────────────────────────────────────
export const updateQuiz = async (req, res) => {
  try {
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.quizId,
      req.body,
      { new: true, runValidators: true, context: "query" }
    ).lean();

    if (!updatedQuiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    res.status(200).json({ success: true, data: updatedQuiz });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 6. DELETE a single quiz – also removes reference from Course
// ─────────────────────────────────────────────────────────────
export const deleteQuiz = async (req, res) => {
  try {
    const deletedQuiz = await Quiz.findByIdAndDelete(req.params.quizId);

    if (!deletedQuiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    await Course.findByIdAndUpdate(
      deletedQuiz.courseId,
      { $pull: { quizzes: deletedQuiz._id } }
    );

    res.status(200).json({ success: true, message: "Quiz deleted successfully" });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 7. DELETE all quizzes for a course
// ─────────────────────────────────────────────────────────────
export const deleteQuizzesByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;

    const quizzesToDelete = await Quiz.find({ courseId }).select('_id').lean();
    const quizIds = quizzesToDelete.map(q => q._id);

    const result = await Quiz.deleteMany({ courseId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No quizzes found for this course",
      });
    }

    await Course.findByIdAndUpdate(
      courseId,
      { $pullAll: { quizzes: quizIds } }
    );

    res.status(200).json({
      success: true,
      message: `Removed ${result.deletedCount} quiz(zes) for this course.`,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 8. GET all quizzes for a specific course (public view)
// ─────────────────────────────────────────────────────────────
export const getQuizzesByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId)
      .populate({
        path: 'quizzes',
        options: { sort: { order: 1 } },
      })
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const quizzes = (course.quizzes || []).map(quiz => {
      const sanitizedQuestions = quiz.questions.map(({ correctAnswer, ...q }) => q);
      return { ...quiz, questions: sanitizedQuestions };
    });

    res.status(200).json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};