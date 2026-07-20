import Complaint from "../../models/complain.model.js";

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

    return res.status(201).json({ success: true, message: "Complaint submitted successfully", complaint: newComplaint });
  } catch (error) {
    console.error("Error in postComplaint:", error);
    return res.status(500).json({ success: false, message: "Server error while submitting complaint" });
  }
};

export const getUserComplaints = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required to fetch history" });
    }

    const complaints = await Complaint.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, complaints });
  } catch (error) {
    console.error("Error in getUserComplaints:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching complaints" });
  }
};

export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().populate("userId", "username email").sort({ createdAt: -1 });

    return res.status(200).json({ success: true, complaints });
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
