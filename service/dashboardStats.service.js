// service/dashboardStats.service.js
import User from "../models/user.model.js";
import Course from "../models/courses.model.js";
import Lecture from "../models/lectures.model.js";
import Quiz from "../models/quiz.model.js";
import Complaint from "../models/complain.model.js";
import Order from "../models/order.model.js";
import Certificate from "../models/certificate.model.js";
import Book from "../models/books.model.js";
import Note from "../models/notes.model.js";
import Progress from "../models/progress.model.js";

function calculateGrowth(current, previous) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const percent = ((current - previous) / previous) * 100;
  const rounded = Math.round(percent);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

// DAU/WAU/MAU from the loginHistory array embedded on each User document —
// no separate LoginHistory collection needed.
const activeUsersSince = async (since) => {
  const result = await User.aggregate([
    { $unwind: "$loginHistory" },
    { $match: { "loginHistory.loginTime": { $gte: since } } },
    { $group: { _id: "$_id" } },
    { $count: "count" },
  ]);
  return result[0]?.count || 0;
};

/**
 * Computes the full admin dashboard stats snapshot.
 * Called by both the REST controller (on page load) and the socket
 * emitter (on an interval, for live updates) — keep all aggregation
 * logic here so the two never drift apart.
 */
export const getDashboardStatsData = async () => {
  const now = new Date();
  const startOfThisWeek = new Date(now); startOfThisWeek.setDate(now.getDate() - 7);
  const startOfLastWeek = new Date(now); startOfLastWeek.setDate(now.getDate() - 14);
  const oneDayAgo     = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [dau, wau, mau] = await Promise.all([
    activeUsersSince(oneDayAgo),
    activeUsersSince(sevenDaysAgo),
    activeUsersSince(thirtyDaysAgo),
  ]);

  const [
    totalUsers, usersThisWeek, usersLastWeek,
    verifiedUsers, unverifiedUsers,
    usersByRole,
    totalCourses, coursesThisWeek, coursesLastWeek,
    coursesByLevel,
    featuredCourses,
    totalLectures,
    totalQuizzes,
    totalBooks,
    totalNotes,
    complaintsByStatus,
    complaintAvgResolution,
    totalCertificates, certsThisWeek, certsLastWeek,
    progressAgg,
    revenueThisWeekAgg, revenueLastWeekAgg, revenueTotalAgg,
    ordersByStatus,
    revenueByGateway,
    topCourses,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ createdAt: { $gte: startOfThisWeek } }),
    User.countDocuments({ createdAt: { $gte: startOfLastWeek, $lt: startOfThisWeek } }),

    User.countDocuments({ isVerified: true }),
    User.countDocuments({ isVerified: false }),

    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),

    Course.countDocuments({}),
    Course.countDocuments({ createdAt: { $gte: startOfThisWeek } }),
    Course.countDocuments({ createdAt: { $gte: startOfLastWeek, $lt: startOfThisWeek } }),

    Course.aggregate([{ $group: { _id: "$level", count: { $sum: 1 } } }]),

    Course.countDocuments({ featured: true }),

    Lecture.countDocuments({}),
    Quiz.countDocuments({}),
    Book.countDocuments({}),
    Note.countDocuments({}),

    Complaint.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

    // Avg time-to-resolution for resolved complaints (createdAt → updatedAt),
    // in hours — a real support-quality metric, not just a raw count.
    Complaint.aggregate([
      { $match: { status: "resolved" } },
      {
        $project: {
          resolutionHours: {
            $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 1000 * 60 * 60],
          },
        },
      },
      { $group: { _id: null, avgHours: { $avg: "$resolutionHours" } } },
    ]),

    Certificate.countDocuments({ status: "active" }),
    Certificate.countDocuments({ status: "active", issuedAt: { $gte: startOfThisWeek } }),
    Certificate.countDocuments({ status: "active", issuedAt: { $gte: startOfLastWeek, $lt: startOfThisWeek } }),

    Progress.aggregate([
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalCompleted: { $sum: { $cond: ["$completed", 1, 0] } },
          avgProgress: { $avg: "$overallProgress" },
        },
      },
    ]),

    // Real revenue — from actual completed Orders, not price × enrolled-count
    // (that old estimate double-counts free coupons, refunds, and partial
    // payments; this is the number that was actually collected).
    Order.aggregate([
      { $match: { paymentStatus: "completed", createdAt: { $gte: startOfThisWeek } } },
      { $group: { _id: null, total: { $sum: "$amountPaid" }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: "completed", createdAt: { $gte: startOfLastWeek, $lt: startOfThisWeek } } },
      { $group: { _id: null, total: { $sum: "$amountPaid" }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $group: { _id: null, total: { $sum: "$amountPaid" }, count: { $sum: 1 } } },
    ]),

    Order.aggregate([{ $group: { _id: "$paymentStatus", count: { $sum: 1 } } }]),

    Order.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $group: { _id: "$paymentGateway", total: { $sum: "$amountPaid" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),

    Course.aggregate([
      {
        $project: {
          title: 1,
          category: 1,
          price: 1,
          enrolledCount: { $size: { $ifNull: ["$studentsEnrolled", []] } },
        },
      },
      { $addFields: { revenue: { $multiply: ["$price", "$enrolledCount"] } } },
      { $sort: { enrolledCount: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const roleMap        = Object.fromEntries(usersByRole.map((r) => [r._id, r.count]));
  const levelMap        = Object.fromEntries(coursesByLevel.map((l) => [l._id, l.count]));
  const complaintMap    = Object.fromEntries(complaintsByStatus.map((c) => [c._id, c.count]));
  const orderStatusMap  = Object.fromEntries(ordersByStatus.map((o) => [o._id, o.count]));

  const revenueThisWeek      = revenueThisWeekAgg[0]?.total || 0;
  const revenueLastWeek      = revenueLastWeekAgg[0]?.total || 0;
  const revenueTotal         = revenueTotalAgg[0]?.total || 0;
  const totalCompletedOrders = revenueTotalAgg[0]?.count || 0;

  const progressStats = progressAgg[0] || { totalRecords: 0, totalCompleted: 0, avgProgress: 0 };
  const completionRate = progressStats.totalRecords > 0
    ? Math.round((progressStats.totalCompleted / progressStats.totalRecords) * 100)
    : 0;

  return {
    generatedAt: now.toISOString(),

    users: {
      total: totalUsers,
      change: calculateGrowth(usersThisWeek, usersLastWeek),
      verified: verifiedUsers,
      unverified: unverifiedUsers,
      byRole: {
        student: roleMap["student"] || 0,
        instructor: roleMap["instructor"] || 0,
        admin: roleMap["admin"] || 0,
        "super-admin": roleMap["super-admin"] || 0,
        user: roleMap["user"] || 0,
      },
      newThisWeek: usersThisWeek,
      newLastWeek: usersLastWeek,
    },

    courses: {
      total: totalCourses,
      change: calculateGrowth(coursesThisWeek, coursesLastWeek),
      featured: featuredCourses,
      byLevel: {
        Beginner: levelMap["Beginner"] || 0,
        Intermediate: levelMap["Intermediate"] || 0,
        Advanced: levelMap["Advanced"] || 0,
      },
      newThisWeek: coursesThisWeek,
      newLastWeek: coursesLastWeek,
      top: topCourses.map((c) => ({
        id: c._id,
        title: c.title,
        category: c.category,
        enrolledCount: c.enrolledCount,
        revenue: Math.round(c.revenue || 0),
      })),
    },

    content: {
      totalLectures,
      totalQuizzes,
      totalBooks,
      totalNotes,
    },

    engagement: {
      dau, wau, mau,
      progress: {
        totalRecords: progressStats.totalRecords,
        totalCompleted: progressStats.totalCompleted,
        completionRate,
        avgProgress: Math.round(progressStats.avgProgress || 0),
      },
    },

    revenue: {
      total: Math.round(revenueTotal),
      thisWeek: Math.round(revenueThisWeek),
      lastWeek: Math.round(revenueLastWeek),
      change: calculateGrowth(revenueThisWeek, revenueLastWeek),
      totalCompletedOrders,
      ordersByStatus: {
        pending: orderStatusMap["pending"] || 0,
        completed: orderStatusMap["completed"] || 0,
        failed: orderStatusMap["failed"] || 0,
        refunded: orderStatusMap["refunded"] || 0,
      },
      avgOrderValue: totalCompletedOrders > 0 ? Math.round(revenueTotal / totalCompletedOrders) : 0,
      byGateway: revenueByGateway.map((g) => ({
        gateway: g._id,
        total: Math.round(g.total),
        count: g.count,
      })),
    },

    complaints: {
      total: (complaintMap["pending"] || 0) + (complaintMap["in progress"] || 0) + (complaintMap["resolved"] || 0),
      pending: complaintMap["pending"] || 0,
      inProgress: complaintMap["in progress"] || 0,
      resolved: complaintMap["resolved"] || 0,
      avgResolutionHours: Math.round(complaintAvgResolution[0]?.avgHours || 0),
    },

    certificates: {
      total: totalCertificates,
      issuedThisWeek: certsThisWeek,
      issuedLastWeek: certsLastWeek,
      change: calculateGrowth(certsThisWeek, certsLastWeek),
    },
  };
};
