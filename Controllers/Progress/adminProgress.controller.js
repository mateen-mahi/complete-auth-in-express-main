import mongoose from "mongoose";
import Progress from "../../models/progress.model.js";
import Course from "../../models/courses.model.js";

// GET /api/admin/progress/course/:courseId
// All students' progress for one course. Supports ?page=&limit=&completed=true/false
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 20, completed } = req.query;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course id" });
    }

    const course = await Course.findById(courseId).select("title lectures");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const filter = { courseId };
    if (completed === "true") filter.completed = true;
    if (completed === "false") filter.completed = false;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);

    const [records, total] = await Promise.all([
      Progress.find(filter)
        .populate("userId", "username email")
        .select("userId overallProgress completed lectures quizzes updatedAt")
        .sort({ overallProgress: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Progress.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      course: { _id: course._id, title: course.title, totalLectures: course.lectures.length },
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      records,
    });
  } catch (error) {
    console.error("Error in getCourseProgress:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching course progress" });
  }
};

// GET /api/admin/progress/course/:courseId/student/:userId
// A single student's full progress detail in one course.
export const getStudentProgressInCourse = async (req, res) => {
  try {
    const { courseId, userId } = req.params;

    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid course or user id" });
    }

    const progress = await Progress.findOne({ courseId, userId })
      .populate("userId", "username email")
      .populate("courseId", "title lectures")
      .populate("lectures.lectureId", "title duration")
      .populate("quizzes.quizId", "title");

    if (!progress) {
      return res.status(404).json({ success: false, message: "No progress record for this student in this course" });
    }

    return res.status(200).json({ success: true, progress });
  } catch (error) {
    console.error("Error in getStudentProgressInCourse:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching student progress" });
  }
};

// GET /api/admin/progress/course/:courseId/analytics
// Aggregate stats for one course: avg progress, completion rate, avg quiz scores.
export const getCourseAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course id" });
    }

    const course = await Course.findById(courseId).select("title lectures");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    const [summary] = await Progress.aggregate([
      { $match: { courseId: courseObjectId } },
      {
        $group: {
          _id: null,
          totalEnrolled: { $sum: 1 },
          totalCompleted: { $sum: { $cond: ["$completed", 1, 0] } },
          avgProgress: { $avg: "$overallProgress" },
        },
      },
    ]);

    // Per-quiz average score across all students who attempted it.
    const quizStats = await Progress.aggregate([
      { $match: { courseId: courseObjectId } },
      { $unwind: "$quizzes" },
      {
        $group: {
          _id: "$quizzes.quizId",
          attempts: { $sum: 1 },
          avgScore: { $avg: "$quizzes.score" },
        },
      },
    ]);

    // Per-lecture watch count — surfaces which lectures students drop off at.
    const lectureStats = await Progress.aggregate([
      { $match: { courseId: courseObjectId } },
      { $unwind: "$lectures" },
      { $match: { "lectures.watched": true } },
      {
        $group: {
          _id: "$lectures.lectureId",
          watchedCount: { $sum: 1 },
        },
      },
    ]);

    const totalEnrolled = summary?.totalEnrolled || 0;
    const totalCompleted = summary?.totalCompleted || 0;

    return res.status(200).json({
      success: true,
      analytics: {
        course: { _id: course._id, title: course.title, totalLectures: course.lectures.length },
        totalEnrolled,
        totalCompleted,
        completionRate: totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0,
        avgProgress: summary ? Math.round(summary.avgProgress) : 0,
        quizStats,
        lectureStats,
      },
    });
  } catch (error) {
    console.error("Error in getCourseAnalytics:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching course analytics" });
  }
};

// GET /api/admin/progress/analytics
// Platform-wide progress analytics across every course.
export const getOverallAnalytics = async (req, res) => {
  try {
    const [summary] = await Progress.aggregate([
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalCompleted: { $sum: { $cond: ["$completed", 1, 0] } },
          avgProgress: { $avg: "$overallProgress" },
        },
      },
    ]);

    // Per-course breakdown: enrolled count, avg progress, completion rate.
    const perCourse = await Progress.aggregate([
      {
        $group: {
          _id: "$courseId",
          totalEnrolled: { $sum: 1 },
          totalCompleted: { $sum: { $cond: ["$completed", 1, 0] } },
          avgProgress: { $avg: "$overallProgress" },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          courseId: "$_id",
          courseTitle: "$course.title",
          totalEnrolled: 1,
          totalCompleted: 1,
          avgProgress: { $round: ["$avgProgress", 0] },
          completionRate: {
            $cond: [
              { $eq: ["$totalEnrolled", 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ["$totalCompleted", "$totalEnrolled"] }, 100] }, 0] },
            ],
          },
        },
      },
      { $sort: { totalEnrolled: -1 } },
    ]);

    const totalRecords = summary?.totalRecords || 0;
    const totalCompleted = summary?.totalCompleted || 0;

    return res.status(200).json({
      success: true,
      analytics: {
        totalRecords,
        totalCompleted,
        completionRate: totalRecords > 0 ? Math.round((totalCompleted / totalRecords) * 100) : 0,
        avgProgress: summary ? Math.round(summary.avgProgress) : 0,
        perCourse,
      },
    });
  } catch (error) {
    console.error("Error in getOverallAnalytics:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching overall analytics" });
  }
};