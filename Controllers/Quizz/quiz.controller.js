import mongoose from "mongoose";
import Quiz from "../../models/quiz.model.js";
import Course from "../../models/courses.model.js";

const MAX_LIMIT = 50;

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

// Whitelisted sortable fields for getAllQuizzes.
const QUIZ_SORTABLE_FIELDS = {
  title: "title",
  subject: "subject",
  totalTime: "totalTime",
  createdAt: "createdAt",
};

const buildQuizSort = (sortBy, order) => {
  const field = QUIZ_SORTABLE_FIELDS[sortBy] || "createdAt";
  const direction = order === "asc" ? 1 : -1;
  return { [field]: direction };
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildQuizFilter = (query) => {
  const filter = {};
  if (query.courseId) {
    if (!mongoose.Types.ObjectId.isValid(query.courseId)) return { __invalidCourseId: true };
    filter.courseId = query.courseId;
  }
  if (query.subject && query.subject.trim()) {
    filter.subject = { $regex: escapeRegex(query.subject.trim()), $options: "i" };
  }
  if (query.search && query.search.trim()) {
    filter.title = { $regex: escapeRegex(query.search.trim()), $options: "i" };
  }
  return filter;
};

// ─────────────────────────────────────────────────────────────
// 1. GET all quizzes (admin list) – paginated, no questions
// ─────────────────────────────────────────────────────────────
export const getAllQuizzes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sort = buildQuizSort(req.query.sortBy, req.query.order);
    const filter = buildQuizFilter(req.query);

    if (filter.__invalidCourseId) {
      return res.status(400).json({ success: false, message: "Invalid courseId format" });
    }

    const quizzes = await Quiz.find(filter)
      .populate("courseId", "title")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Quiz.countDocuments(filter);

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
// Quizzes within a course have a natural sequence ("order" field) that
// the curriculum UI depends on — this stays the default sort so existing
// frontends keep working unchanged. sortBy lets a caller opt into a
// different view (e.g. an admin screen sorting by title).
const buildCourseQuizSort = (sortBy, order) => {
  if (sortBy && QUIZ_SORTABLE_FIELDS[sortBy]) {
    return { [QUIZ_SORTABLE_FIELDS[sortBy]]: order === "asc" ? 1 : -1 };
  }
  return { order: 1 };
};

export const getQuizzesByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid courseId format" });
    }

    // Pagination is optional here: if the caller doesn't pass page/limit,
    // every quiz in the course is returned (unchanged default behavior).
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || MAX_LIMIT, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;
    const sort = buildCourseQuizSort(req.query.sortBy, req.query.order);

    const populateOptions = { sort };
    if (hasPagination) {
      populateOptions.skip = skip;
      populateOptions.limit = limit;
    }

    const [course, total] = await Promise.all([
      Course.findById(courseId)
        .populate({ path: "quizzes", options: populateOptions })
        .lean(),
      Quiz.countDocuments({ courseId }),
    ]);

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
      total,
      ...(hasPagination ? { page, pages: Math.ceil(total / limit) } : {}),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 9. DELETE all quizzes and remove references from all courses
// ─────────────────────────────────────────────────────────────
export const deleteAllQuizzes = async (req, res) => {
  try {
    const result = await Quiz.deleteMany({});

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No quizzes found to delete",
      });
    }

    await Course.updateMany({}, { $set: { quizzes: [] } });

    res.status(200).json({
      success: true,
      message: `Removed ${result.deletedCount} quiz(zes) and cleared quiz references from all courses.`,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};
