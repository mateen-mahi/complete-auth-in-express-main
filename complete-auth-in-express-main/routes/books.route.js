import express from "express";
import {
  addNewBook,
  getAllBooks,
  getBookById,
  getBooksByCourseId,
  updateBook,
  updateBookTitle,
  updateBookDescription,
  deleteBook,
  searchBooks,
  getBookCount,
} from "../Controllers/books/books.controller.js";
import { uploadDocument } from "../Middlewares/Multer.configPDF.js";

const router = express.Router();

// ─── CREATE ROUTES ─────────────────────────────────────────
// POST /api/v1/books - Add a new book (requires file upload)
router.post("/", uploadDocument.single("document"), addNewBook);

// ─── READ ROUTES ───────────────────────────────────────────
// GET /api/v1/books - Get all books with pagination
router.get("/", getAllBooks);

// GET /api/v1/books/search?q=query - Search books by title or description
router.get("/search", searchBooks);

// GET /api/v1/books/stats - Get book statistics
router.get("/stats", getBookCount);

// GET /api/v1/books/course/:courseId - Get books by course ID
router.get("/course/:courseId", getBooksByCourseId);

// GET /api/v1/books/:bookId - Get a specific book by ID
router.get("/:bookId", getBookById);

// ─── UPDATE ROUTES ─────────────────────────────────────────
// PUT /api/v1/books/:bookId - Update all fields
router.put("/:bookId", updateBook);

// PATCH /api/v1/books/:bookId/title - Update only title
router.patch("/:bookId/title", updateBookTitle);

// PATCH /api/v1/books/:bookId/description - Update only description
router.patch("/:bookId/description", updateBookDescription);

// ─── DELETE ROUTES ─────────────────────────────────────────
// DELETE /api/v1/books/:bookId - Delete a book
router.delete("/:bookId", deleteBook);

export default router;
