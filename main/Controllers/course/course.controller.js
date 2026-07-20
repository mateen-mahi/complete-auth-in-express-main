import Course from "../../models/courses.model.js";
import Lecture from "../../models/lectures.model.js";
import Quiz from "../../models/quiz.model.js";
import User from "../../models/user.model.js"; 

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


export const getAllCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.level) filter.level = req.query.level;
    if (req.query.featured !== undefined) filter.featured = req.query.featured === "true";
    if (req.query.search) filter.title = { $regex: req.query.search, $options: "i" };

    const courses = await Course.find(filter)
      .select("-studentsEnrolled") 
      .populate("instructor", "username email imageUrl")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: courses,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};


export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate("instructor", "username email imageUrl");

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const [lectureCount, quizCount] = await Promise.all([
      Lecture.countDocuments({ course: course._id }),
      Quiz.countDocuments({ courseId: course._id }),
    ]);

    const courseData = course.toObject();
    const studentsEnrolledCount = courseData.studentsEnrolled?.length || 0;
    delete courseData.studentsEnrolled; 

    res.status(200).json({
      success: true,
      data: { ...courseData, studentsEnrolledCount, lectureCount, quizCount },
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};


export const getFeaturedCourses = async (req, res) => {
  try {
    const courses = await Course.find({ featured: true })
      .populate("instructor", "username imageUrl")
      .limit(10)
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 4. CREATE COURSE
// ─────────────────────────────────────────────────────────────
export const createCourse = async (req, res) => {
  try {
    const { title, description, instructor, category, price, duration, level, color, emoji, featured } = req.body;

    if (
      !title || !description || !instructor || !category ||
      price === undefined || duration === undefined || !level || !color || !emoji
    ) {
      return res.status(400).json({ success: false, message: "All required fields must be provided" });
    }



    const newCourse = new Course({
      title,
      description,
      instructor,
      category,
      price,
      duration,
      level,
      color,
      emoji,
      featured: typeof featured === "boolean" ? featured : false,
    });

    await newCourse.save();

    res.status(201).json({ success: true, data: newCourse });
  } catch (error) {
    return handleControllerError(res, error);
  }
};


export const updateCourse = async (req, res) => {
  try {
    const { studentsEnrolled, ...safeUpdates } = req.body;

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.courseId,
      safeUpdates,
      { new: true, runValidators: true, context: "query" }
    ).select("-studentsEnrolled");

    if (!updatedCourse) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({ success: true, data: updatedCourse });
  } catch (error) {
    return handleControllerError(res, error);
  }
};


export const deleteCourse = async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.courseId);

    if (!deletedCourse) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const [lectureResult, quizResult] = await Promise.all([
      Lecture.deleteMany({ course: deletedCourse._id }),
      Quiz.deleteMany({ courseId: deletedCourse._id }),
    ]);

    res.status(200).json({
      success: true,
      message: `Course deleted, along with ${lectureResult.deletedCount} lecture(s) and ${quizResult.deletedCount} quiz(zes).`,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};



export const enrollStudent = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.body; 

    if (!studentId) {
      return res.status(400).json({ success: false, message: "studentId is required" });
    }

    const studentExists = await User.findById(studentId);
    if (!studentExists) {
      return res.status(404).json({ success: false, message: "Student account not found" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    if (course.studentsEnrolled.includes(studentId)) {
      return res.status(400).json({ success: false, message: "Student is already enrolled in this course" });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { $addToSet: { studentsEnrolled: studentId } },
      { new: true }
    );

    res.status(200).json({ success: true, message: "Student enrolled successfully", data: updatedCourse });
  } catch (error) {
    return handleControllerError(res, error);
  }
};


export const unenrollStudent = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, message: "studentId is required" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    if (!course.studentsEnrolled.includes(studentId)) {
      return res.status(400).json({ success: false, message: "Student is not enrolled in this course" });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { $pull: { studentsEnrolled: studentId } },
      { new: true }
    );

    res.status(200).json({ success: true, message: "Student unenrolled successfully", data: updatedCourse });
  } catch (error) {
    return handleControllerError(res, error);
  }
};



export const getEnrolledStudentCourses = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ success: false, message: "studentId is required" });
    }
    const courses = await Course.find({ 
      studentsEnrolled: studentId 
    });

    return res.status(200).json({ success: true, data: courses });
  } catch (error) {
    return handleControllerError(res, error);
  }
};
