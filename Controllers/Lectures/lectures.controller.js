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

const MAX_LIMIT = 50;

export const getAllLectures = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const { courseId } = req.query;

    const filter = {};
    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ success: false, message: "Invalid courseId format" });
      }
      filter.course = courseId;
    }

    const [lectures, total] = await Promise.all([
      Lecture.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("course", "title category level") // only pull fields you actually need
        .lean(),
      Lecture.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: lectures,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
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
    // Accept either a single lecture object or an array of lecture objects
    const isBulk = Array.isArray(req.body);
    const lecturesInput = isBulk ? req.body : [req.body];

    if (lecturesInput.length === 0) {
      return res.status(400).json({ success: false, message: "At least one lecture is required" });
    }

    // Validate every entry before touching the DB
    for (let i = 0; i < lecturesInput.length; i++) {
      const { title, description, videoId, duration, course } = lecturesInput[i];
      if (!title || !course || !description || !videoId || duration === undefined) {
        return res.status(400).json({
          success: false,
          message: `Entry ${i + 1}: all fields are required`,
        });
      }
      if (!mongoose.Types.ObjectId.isValid(course)) {
        return res.status(400).json({
          success: false,
          message: `Entry ${i + 1}: invalid course ID format`,
        });
      }
    }

    // Confirm every referenced course actually exists — the original code
    // never checked this, so an invalid course ID would crash with a
    // "Cannot read properties of null" error when calling .lectures.push()
    const courseIds = [...new Set(lecturesInput.map((l) => l.course))];
    const existingCourses = await Course.find({ _id: { $in: courseIds } });

    if (existingCourses.length !== courseIds.length) {
      const foundIds = new Set(existingCourses.map((c) => c._id.toString()));
      const missingIds = courseIds.filter((id) => !foundIds.has(id));
      return res.status(404).json({
        success: false,
        message: `Course(s) not found: ${missingIds.join(", ")}`,
      });
    }

    // Create all lecture documents (not yet saved)
    const lectureDocs = lecturesInput.map(
      (l) =>
        new Lecture({
          title: l.title,
          description: l.description,
          videoId: l.videoId,
          duration: l.duration,
          course: l.course,
        })
    );

    // Save all lectures
    const savedLectures = await Promise.all(lectureDocs.map((doc) => doc.save()));

    // Group new lecture IDs by their course, then push each course's batch
    // in one update — avoids repeated find+save round trips per lecture,
    // and avoids the race condition of concurrent requests overwriting
    // each other's array pushes (which .push() + .save() on a fetched
    // document is vulnerable to).
    const lectureIdsByCourse = {};
    savedLectures.forEach((lecture) => {
      const courseId = lecture.course.toString();
      if (!lectureIdsByCourse[courseId]) lectureIdsByCourse[courseId] = [];
      lectureIdsByCourse[courseId].push(lecture._id);
    });

    await Promise.all(
      Object.entries(lectureIdsByCourse).map(([courseId, lectureIds]) =>
        Course.findByIdAndUpdate(courseId, {
          $push: { lectures: { $each: lectureIds } },
        })
      )
    );

    return res.status(201).json({
      success: true,
      message: isBulk
        ? `${savedLectures.length} lecture(s) created successfully`
        : "Lecture created successfully",
      data: isBulk ? savedLectures : savedLectures[0],
    });
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

