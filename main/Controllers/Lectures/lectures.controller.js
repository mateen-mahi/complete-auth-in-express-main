import Lecture from "../../models/lectures.model.js";
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

export const getAllLectures = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const lectures = await Lecture.find()
      .populate("course")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Lecture.countDocuments();

    res.status(200).json({ success: true, data: lectures, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getLectureById = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.lectureId).populate("course");

    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found" });
    }
    res.status(200).json({ success: true, data: lecture });
  } catch (error) {
    return handleControllerError(res, error);
  }
};


export const createLecture = async (req, res) => {
  try {
    const { title, description, videoId, duration, course } = req.body;

    if (!title || !course || !description || !videoId || duration === undefined) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    
    const newLecture = new Lecture({ title, description, videoId, duration, course });
    await newLecture.save();
    res.status(201).json({ success: true, data: newLecture });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const updateLecture = async (req, res) => {
  try {
    const updatedLecture = await Lecture.findByIdAndUpdate(
      req.params.lectureId,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedLecture) {
      return res.status(404).json({ success: false, message: "Lecture not found" });
    }
    res.status(200).json({ success: true, data: updatedLecture });
  } catch (error) {
    return handleControllerError(res, error);
  }
};



export const deleteLecture = async (req, res) => {
  try {
    const deletedLecture = await Lecture.findByIdAndDelete(req.params.lectureId);
    if (!deletedLecture) {
      return res.status(404).json({ success: false, message: "Lecture not found" });
    }
    res.status(200).json({ success: true, message: "Lecture deleted successfully" });
  } catch (error) {
    return handleControllerError(res, error);
  }
};




export const getLecturesByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate({
        path: 'lectures',
        options: { sort: { order: 1 } },
      })
      .lean(); 
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    res.status(200).json({
      success: true,
      data: course.lectures || [],
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};



export const deleteLecturesByCourseId = async (req, res) => {
  try {
    const deletedLectures = await Lecture.deleteMany({ course: req.params.courseId });
    if (deletedLectures.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "No lectures found for the specified course" });
    }
    res.status(200).json({ success: true, message: "Lectures deleted successfully" });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

