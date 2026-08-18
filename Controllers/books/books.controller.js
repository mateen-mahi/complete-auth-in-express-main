import Book from "../../models/books.model.js";
import mongoose from "mongoose";
import { uploadDocument, deleteDocument } from "../../utils/pdfSendToCloudinary.js";

const MAX_LIMIT = 50; 

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

// Escape regex special characters so user search input can never be
// interpreted as a regex pattern (prevents ReDoS and unintended matches).
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Normalize + cap pagination params so a client can't request
// an unbounded result set.
const getPagination = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Whitelisted sortable fields for getAllBooks.
const BOOK_SORTABLE_FIELDS = {
  title: "title",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

const buildBookSort = (sortBy, order) => {
  const field = BOOK_SORTABLE_FIELDS[sortBy] || "createdAt";
  const direction = order === "asc" ? 1 : -1;
  return { [field]: direction };
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

    if (courseId && !isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid courseId format.",
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
    const { page, limit, skip } = getPagination(req.query);
    const courseId = req.query.courseId;
    const search = req.query.search;

    if (courseId && !isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid courseId format.",
      });
    }

    const filter = courseId ? { courseId } : {};
    if (search && search.trim()) {
      filter.title = { $regex: escapeRegex(search.trim()), $options: "i" };
    }
    const sort = buildBookSort(req.query.sortBy, req.query.order);

    const [books, total] = await Promise.all([
      Book.find(filter)
        .sort(sort)
        .skip(skip)
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

    if (!isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

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

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid courseId format" });
    }

    const { page, limit, skip } = getPagination(req.query);
    const sort = buildBookSort(req.query.sortBy, req.query.order);

    const [books, total] = await Promise.all([
      Book.find({ courseId })
        .sort(sort)
        .skip(skip)
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

    if (!isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const { title, description, courseId } = req.body;

    if (courseId !== undefined && courseId !== null && !isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid courseId format.",
      });
    }

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


// ─── DELETE BOOK ────────────────────────────────────────────
export const deleteBook = async (req, res) => {
  try {
    const { bookId } = req.params;

    if (!isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    if (book.document?.publicId) {
      try {
        // Fixed: deleteDocument was never imported before — this used to
        // throw silently and leave orphaned files in Cloudinary.
        await deleteDocument(book.document.publicId);
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
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
    const { page, limit, skip } = getPagination(req.query);

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const safeQuery = escapeRegex(q.trim());
    const sort = buildBookSort(req.query.sortBy, req.query.order);

    const searchQuery = {
      $or: [
        { title: { $regex: safeQuery, $options: "i" } },
        { description: { $regex: safeQuery, $options: "i" } },
      ],
    };

    const [books, total] = await Promise.all([
      Book.find(searchQuery)
        .sort(sort)
        .skip(skip)
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