import userModel from "../../models/user.model.js";
import Course from "../../models/courses.model.js"
import Lecture from "../../models/lectures.model.js";
import Quiz from "../../models/quiz.model.js";
import Complaint from "../../models/complain.model.js";

function calculateGrowth(current, previous) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const percent = ((current - previous) / previous) * 100;
  const rounded = Math.round(percent);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfThisWeek = new Date(now); startOfThisWeek.setDate(now.getDate() - 7);
    const startOfLastWeek = new Date(now); startOfLastWeek.setDate(now.getDate() - 14);
    const oneDayAgo     = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // DAU/WAU/MAU from the loginHistory array already embedded on each User
    // document — no separate LoginHistory collection needed, matching your
    // real schema.
    const activeUsersSince = async (since) => {
      const result = await userModel.aggregate([
        { $unwind: "$loginHistory" },
        { $match: { "loginHistory.loginTime": { $gte: since } } },
        { $group: { _id: "$_id" } },
        { $count: "count" },
      ]);
      return result[0]?.count || 0;
    };

    const [dau, wau, mau] = await Promise.all([
      activeUsersSince(oneDayAgo),
      activeUsersSince(sevenDaysAgo),
      activeUsersSince(thirtyDaysAgo),
    ]);

    const [
      totalUsers, usersThisWeek, usersLastWeek,
      verifiedUsers,
      unverifiedUsers,
      totalCourses, coursesThisWeek, coursesLastWeek,
      totalLectures,
      totalQuizzes,
      pendingComplaints,
      allCourses, // needed for revenue — see note below
    ] = await Promise.all([
      userModel.countDocuments({}),
      userModel.countDocuments({ createdAt: { $gte: startOfThisWeek } }),
      userModel.countDocuments({ createdAt: { $gte: startOfLastWeek, $lt: startOfThisWeek } }),

      userModel.countDocuments({ isVerified: true }),
      userModel.countDocuments({ isVerified: false }),

      Course.countDocuments({}),
      Course.countDocuments({ createdAt: { $gte: startOfThisWeek } }),
      Course.countDocuments({ createdAt: { $gte: startOfLastWeek, $lt: startOfThisWeek } }),

      Lecture.countDocuments({}),
      Quiz.countDocuments({}),

      Complaint.countDocuments({ status: "pending" }),

      // Revenue needs price * enrolled-count per course — cheaper to pull
      // just those two fields for every course than to aggregate in Mongo
      // for a number that's only computed once per dashboard load.
      Course.find({}).select("price studentsEnrolled"),
    ]);

    const revenue = allCourses.reduce(
      (sum, c) => sum + (c.price || 0) * (c.studentsEnrolled?.length || 0),
      0
    );

    const stats = {
      totalUsers:   { value: totalUsers,   change: calculateGrowth(usersThisWeek, usersLastWeek) },
      verifiedUsers: { value: verifiedUsers, change: null },
      unverifiedUsers: { value: unverifiedUsers, change: null },
      totalCourses: { value: totalCourses, change: calculateGrowth(coursesThisWeek, coursesLastWeek) },
      totalLectures: { value: totalLectures, change: null },
      totalQuizzes: { value: totalQuizzes, change: null },
      pendingComplaints: { value: pendingComplaints, change: null },
      revenue: { value: Math.round(revenue), change: null },
      dau: { value: dau, change: null },
      wau: { value: wau, change: null },
      mau: { value: mau, change: null },
    };

    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.log("Error in get dashboard stats api: ", error);
    return res.status(500).json({ success: false, message: "Server error while fetching dashboard stats" });
  }
};
