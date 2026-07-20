import Book from "../../models/books.model.js";
import { uploadDocument } from "../../utils/uploadDocument.js";

const handleControllerError = (res, error) => {
  console.error(error);

  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: error.message });
  }

  return res
    .status(500)
    .json({ success: false, message: "Internal server error." });
};

// ─── ADD NEW BOOK ───────────────────────────────────────────
export const addNewBook = async (req, res) => {
  try {
    const { title, description, courseId } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a document.",
      });
    }

    const uploaded = await uploadDocument(req.file.buffer, {
      folder: "LMS Documents",
    });

    const newBook = await Book.create({
      title: title.trim(),
      description: description.trim(),
      courseId: courseId || null,
      document: {
        url: uploaded.url,
        publicId: uploaded.publicId,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Book uploaded successfully.",
      book: newBook,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── GET ALL BOOKS ──────────────────────────────────────────
export const getAllBooks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const courseId = req.query.courseId;

    const filter = courseId ? { courseId } : {};

    const [books, total] = await Promise.all([
      Book.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("courseId", "title")
        .lean(),
      Book.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: books,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── GET BOOK BY ID ─────────────────────────────────────────
export const getBookById = async (req, res) => {
  try {
    const { bookId } = req.params;

    const book = await Book.findById(bookId)
      .populate("courseId", "title description")
      .lean();

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── GET BOOKS BY COURSE ID ─────────────────────────────────
export const getBooksByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const [books, total] = await Promise.all([
      Book.find({ courseId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Book.countDocuments({ courseId }),
    ]);

    return res.status(200).json({
      success: true,
      data: books,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── UPDATE BOOK (ALL FIELDS) ──────────────────────────────
export const updateBook = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title, description, courseId } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title.trim();
    if (description !== undefined) updateFields.description = description.trim();
    if (courseId !== undefined) updateFields.courseId = courseId;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field (title, description, courseId) must be provided.",
      });
    }

    const updatedBook = await Book.findByIdAndUpdate(bookId, updateFields, {
      new: true,
      runValidators: true,
    }).populate("courseId", "title description");

    if (!updatedBook) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Book updated successfully.",
      data: updatedBook,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── UPDATE TITLE ONLY ─────────────────────────────────────
export const updateBookTitle = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }

    const updatedBook = await Book.findByIdAndUpdate(
      bookId,
      { title: title.trim() },
      { new: true, runValidators: true }
    ).populate("courseId", "title description");

    if (!updatedBook) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Book title updated successfully.",
      data: updatedBook,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── UPDATE DESCRIPTION ONLY ──────────────────────────────
export const updateBookDescription = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { description } = req.body;

    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Description is required.",
      });
    }

    const updatedBook = await Book.findByIdAndUpdate(
      bookId,
      { description: description.trim() },
      { new: true, runValidators: true }
    ).populate("courseId", "title description");

    if (!updatedBook) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Book description updated successfully.",
      data: updatedBook,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── DELETE BOOK ────────────────────────────────────────────
export const deleteBook = async (req, res) => {
  try {
    const { bookId } = req.params;

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    // Optional: Delete document from Cloudinary if needed
    if (book.document?.publicId) {
      try {
        // Uncomment if you want to delete from Cloudinary
        // await deleteDocument(book.document.publicId);
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    await Book.findByIdAndDelete(bookId);

    return res.status(200).json({
      success: true,
      message: "Book deleted successfully.",
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── SEARCH BOOKS ──────────────────────────────────────────
export const searchBooks = async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const searchQuery = {
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    };

    const [books, total] = await Promise.all([
      Book.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("courseId", "title")
        .lean(),
      Book.countDocuments(searchQuery),
    ]);

    return res.status(200).json({
      success: true,
      data: books,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// ─── GET BOOK COUNT ────────────────────────────────────────
export const getBookCount = async (req, res) => {
  try {
    const total = await Book.countDocuments();
    const byCourse = await Book.aggregate([
      {
        $group: {
          _id: "$courseId",
          count: { $sum: 1 },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      totalBooks: total,
      byCourse,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};


