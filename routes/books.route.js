import express from "express";
import { uploadDocument } from "../Middlewares/Multer.configPDF.js";

import {
  addNewBook,
  getAllBooks,
  getBookById,
  getBooksByCourseId,
  updateBook,
  deleteBook,
  searchBooks,
  getBookCount,
} from "../Controllers/books/books.controller.js";

const router = express.Router();



// ─── READ ROUTES ─────────────────────────────────────────
router.get("/",  getAllBooks);
router.get("/search", searchBooks);
router.get("/count", requireRole("admin"), getBookCount);
router.get("/course/:courseId", getBooksByCourseId);
router.get("/:bookId", getBookById);

router.post(
  "/",
  upload.single("document"),
  addNewBook
);

router.put("/:bookId",  updateBook);
router.delete("/:bookId", deleteBook);

export default router;


// ============================================================
// BOOKS API — Reference for frontend integration
// Base URL: /api/v1/books
// ============================================================


// GET /api/v1/books
// Get all books (paginated, optional course filter)
// Auth: required (any logged-in user)
// Query params (optional):
//   - page   (number, default: 1)
//   - limit  (number, default: 10, max: 50)
//   - courseId (ObjectId, filters books by course)
// Body: none
// File: none
// Response 200: { success, data: [...books], total, page, pages }


// GET /api/v1/books/search
// Search books by title/description
// Auth: required (any logged-in user)
// Query params:
//   - q      (string, REQUIRED) — search term
//   - page   (number, optional, default: 1)
//   - limit  (number, optional, default: 10, max: 50)
// Body: none
// File: none
// Response 200: { success, data: [...books], total, page, pages }
// Response 400: if q is missing/empty


// GET /api/v1/books/count
// Get total book count + count grouped by course
// Auth: required, role: admin only
// Query params: none
// Body: none
// File: none
// Response 200: { success, totalBooks, byCourse: [{ _id: courseId, count }] }


// GET /api/v1/books/course/:courseId
// Get all books belonging to a specific course
// Auth: required (any logged-in user)
// URL params:
//   - courseId (ObjectId, REQUIRED)
// Query params (optional, pagination):
//   - page   (number, default: 1)
//   - limit  (number, default: 10, max: 50)
// Body: none
// File: none
// Response 200: { success, data: [...books], total, page, pages }
// Response 400: invalid courseId format


// GET /api/v1/books/:bookId
// Get a single book by ID
// Auth: required (any logged-in user)
// URL params:
//   - bookId (ObjectId, REQUIRED)
// Query params: none
// Body: none
// File: none
// Response 200: { success, data: {...book} }
// Response 400: invalid ID format
// Response 404: book not found


// POST /api/v1/books
// Add a new book (uploads document)
// Auth: required, role: admin or instructor
// Content-Type: multipart/form-data
// Query params: none
// Body (form-data fields):
//   - title       (string, REQUIRED, max 200 chars)
//   - description (string, REQUIRED, max 1000 chars)
//   - courseId    (ObjectId, optional)
// File:
//   - document (REQUIRED) — field name must match multer config
// Response 201: { success, message, book: {...} }
// Response 400: missing title/description/file, or invalid courseId
// Response 403: wrong role


// PUT /api/v1/books/:bookId
// Update a book (partial update — send only fields you want changed)
// Auth: required, role: admin or instructor
// URL params:
//   - bookId (ObjectId, REQUIRED)
// Query params: none
// Body (all optional, but at least ONE required):
//   - title       (string, max 200 chars)
//   - description (string, max 1000 chars)
//   - courseId    (ObjectId or null)
// File: none (does not replace uploaded document)
// Response 200: { success, message, data: {...updatedBook} }
// Response 400: no fields provided, or invalid bookId/courseId
// Response 404: book not found


// DELETE /api/v1/books/:bookId
// Delete a book (also deletes file from Cloudinary)
// Auth: required, role: admin or instructor
// URL params:
//   - bookId (ObjectId, REQUIRED)
// Query params: none
// Body: none
// File: none
// Response 200: { success, message }
// Response 400: invalid ID format
// Response 404: book not found