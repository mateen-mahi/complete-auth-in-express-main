import Course from "../../models/courses.model.js";
import Lecture from "../../models/lectures.model.js";
import Quiz from "../../models/quiz.model.js";
import User from "../../models/user.model.js"; 
import { notifyCourseCreated, notifyCourseUpdated, notifyEnrollment } from "../../service/adminEvents.js"; // NEW

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

// NEW — adds isEnrolled + studentsEnrolledCount to each course without removing any existing field
const withEnrollmentInfo = (courses, currentUserId) => {
  return courses.map((course) => {
    const courseObj = course.toObject ? course.toObject() : course;
    const studentsEnrolledCount = courseObj.studentsEnrolled?.length || 0;
    const isEnrolled = currentUserId
      ? (courseObj.studentsEnrolled || []).some((id) => id.toString() === currentUserId.toString())
      : false;
    return { ...courseObj, isEnrolled, studentsEnrolledCount };
  });
};

// NEW — adds lessonsCount to each course
const attachLessonCounts = async (courses) => {
  const courseIds = courses.map((c) => c._id);
  const counts = await Lecture.aggregate([
    { $match: { course: { $in: courseIds } } },
    { $group: { _id: "$course", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));
  return courses.map((course) => ({
    ...course,
    lessonsCount: countMap[course._id.toString()] || 0,
  }));
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

    // NEW — studentsEnrolled is still excluded above (unchanged), so isEnrolled isn't available here;
    // lessonsCount doesn't need it, so it's safe to attach without touching the existing query/select.
    const coursesWithLessons = await attachLessonCounts(courses.map((c) => (c.toObject ? c.toObject() : c)));

    res.status(200).json({
      success: true,
      data: coursesWithLessons,
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

    // NEW — isEnrolled, computed before studentsEnrolled is stripped below (unchanged from original)
    const currentUserId = req.user?.id;
    const isEnrolled = currentUserId
      ? (courseData.studentsEnrolled || []).some((id) => id.toString() === currentUserId.toString())
      : false;

    delete courseData.studentsEnrolled; 

    res.status(200).json({
      success: true,
      data: { ...courseData, studentsEnrolledCount, isEnrolled, lectureCount, quizCount },
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

    // NEW — adds isEnrolled/studentsEnrolledCount/lessonsCount without removing any existing field
    const currentUserId = req.user?.id;
    const withEnrollment = withEnrollmentInfo(courses, currentUserId);
    const withLessons = await attachLessonCounts(withEnrollment);

    res.status(200).json({ success: true, data: withLessons });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────
// 4. CREATE COURSE
// ─────────────────────────────────────────────────────────────
export const createCourse = async (req, res) => {
  try {
    // Accept either a single course object or an array of course objects
    const isBulk = Array.isArray(req.body);
    const courses = isBulk ? req.body : [req.body];

    if (courses.length === 0) {
      return res.status(400).json({ success: false, message: "At least one course is required" });
    }

    // Validate every entry before touching the DB
    for (let i = 0; i < courses.length; i++) {
      const { title, description, instructor, category, price, duration, level, color, emoji } = courses[i];
      if (
        !title || !description || !instructor || !category ||
        price === undefined || duration === undefined || !level || !color || !emoji
      ) {
        return res.status(400).json({
          success: false,
          message: `Entry ${i + 1}: all required fields must be provided`,
        });
      }
    }

    const coursesToInsert = courses.map((c) => ({
      title: c.title,
      description: c.description,
      instructor: c.instructor,
      category: c.category,
      price: c.price,
      duration: c.duration,
      level: c.level,
      color: c.color,
      emoji: c.emoji,
      featured: typeof c.featured === "boolean" ? c.featured : false,
    }));

    const savedCourses = await Course.insertMany(coursesToInsert);

    savedCourses.forEach((savedCourse) => notifyCourseCreated(savedCourse));

    return res.status(201).json({
      success: true,
      message: isBulk
        ? `${savedCourses.length} course(s) created successfully`
        : "Course created successfully",
      data: isBulk ? savedCourses : savedCourses[0],
    });
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

    notifyCourseUpdated(updatedCourse); // NEW — pushes to the admin dashboard live

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

    notifyEnrollment({ userId: studentId, courseId, courseTitle: updatedCourse.title }); // NEW — pushes to the admin dashboard live

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
