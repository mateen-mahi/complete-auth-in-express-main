import express from "express";
import {
postComplaint,
getUserComplaints,
getAllComplaints,
updateComplaintStatus,
deleteComplaint,
deleteAllComplaints,
getComplaintById 
} from "../Controllers/Complaint/complaint.controller.js"


const complaintRoutes = express.Router();

complaintRoutes.post("/submit-complaint", postComplaint);
complaintRoutes.get("/user-complaints", getUserComplaints);
complaintRoutes.get("/all-complaints", getAllComplaints);
complaintRoutes.get("/complaint/:complaintId", getComplaintById);
complaintRoutes.put("/update-status/:complaintId", updateComplaintStatus);
complaintRoutes.delete("/delete-complaint/:complaintId", deleteComplaint);
complaintRoutes.delete("/clear-all-complaints", deleteAllComplaints);

export default complaintRoutes;