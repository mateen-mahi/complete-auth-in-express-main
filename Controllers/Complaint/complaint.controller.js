import Complaint from "../../models/complain.model.js";
import { notifyComplaintNew, notifyComplaintStatusChanged } from "../../service/adminEvents.js"; 

export const postComplaint = async (req, res) => {
  try {
    const { subject, description } = req.body;
    
    const userId = req.user?._id || req.body.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: "Subject and description are required" });
    }

    const newComplaint = new Complaint({
      userId,
      subject,
      description,
    });

    await newComplaint.save();

    notifyComplaintNew(newComplaint); // NEW — pushes to the admin dashboard live

    return res.status(201).json({ success: true, message: "Complaint submitted successfully", complaint: newComplaint });
  } catch (error) {
    console.error("Error in postComplaint:", error);
    return res.status(500).json({ success: false, message: "Server error while submitting complaint" });
  }
};

// Whitelisted sortable fields shared by getAllComplaints and getUserComplaints.
const COMPLAINT_SORTABLE_FIELDS = {
  status: "status",
  subject: "subject",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

const buildComplaintSort = (sortBy, order) => {
  const field = COMPLAINT_SORTABLE_FIELDS[sortBy] || "createdAt";
  const direction = order === "asc" ? 1 : -1;
  return { [field]: direction };
};

const COMPLAINT_FILTERABLE_STATUSES = ["pending", "in progress", "resolved"];
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildComplaintFilter = (query) => {
  const filter = {};
  if (query.status && COMPLAINT_FILTERABLE_STATUSES.includes(query.status)) {
    filter.status = query.status;
  }
  if (query.search && query.search.trim()) {
    filter.subject = { $regex: escapeRegex(query.search.trim()), $options: "i" };
  }
  return filter;
};

export const getUserComplaints = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required to fetch history" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = buildComplaintSort(req.query.sortBy, req.query.order);
    const filter = { userId, ...buildComplaintFilter(req.query) };

    const totalComplaints = await Complaint.countDocuments(filter);

    const complaints = await Complaint.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: complaints.length,
      totalComplaints,
      totalPages: Math.ceil(totalComplaints / limit),
      currentPage: page,
      complaints
    });
  } catch (error) {
    console.error("Error in getUserComplaints:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching complaints" });
  }
};

// Whitelisted sortable fields for getAllComplaints.

export const getAllComplaints = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = buildComplaintSort(req.query.sortBy, req.query.order);
    const filter = buildComplaintFilter(req.query);

    const totalComplaints = await Complaint.countDocuments(filter);

    const complaints = await Complaint.find(filter)
      .populate("userId", "username email")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: complaints.length,
      totalComplaints,
      totalPages: Math.ceil(totalComplaints / limit),
      currentPage: page,
      complaints
    });
  } catch (error) {
    console.error("Error in getAllComplaints:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching all complaints" });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status, answer } = req.body;

    if (status && !["pending", "in progress", "resolved"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (answer !== undefined) updateData.answer = answer;

    const complaint = await Complaint.findByIdAndUpdate(
      complaintId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    notifyComplaintStatusChanged(complaint); // NEW — pushes to the admin dashboard live

    return res.status(200).json({ success: true, message: "Complaint status updated successfully", complaint });
  } catch (error) {
    console.error("Error in updateComplaintStatus:", error);
    return res.status(500).json({ success: false, message: "Server error while updating complaint status" });
  }
};

export const deleteComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const complaint = await Complaint.findByIdAndDelete(complaintId);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    return res.status(200).json({ success: true, message: "Complaint deleted successfully" });
  } catch (error) {
    console.error("Error in deleteComplaint:", error);
    return res.status(500).json({ success: false, message: "Server error while deleting complaint" });
  }
};

export const deleteAllComplaints = async (req, res) => {
  try {
    const result = await Complaint.deleteMany({});
    return res.status(200).json({ success: true, message: `Deleted ${result.deletedCount} complaints successfully` });
  } catch (error) {
    console.error("Error in deleteAllComplaints:", error);
    return res.status(500).json({ success: false, message: "Server error while deleting all complaints" });
  }
};

export const getComplaintById = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const complaint = await Complaint.findById(complaintId).populate("userId", "username email");

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    return res.status(200).json({ success: true, complaint });
  } catch (error) {
    console.error("Error in getComplaintById:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching complaint" });
  }
};
