# Book Controllers - Quick Reference Guide

## 🎯 Quick Overview

**Base URL:** `http://localhost:8080/api/v1/books`
**Authentication:** Required (JWT via verifyAuth middleware)
**File Upload Formats:** PDF, Word, Excel, PowerPoint, Text
**Max File Size:** 20MB

---

## 📚 All Controller Functions at a Glance

### 1️⃣ CREATE
```javascript
// Add New Book
POST /api/v1/books
Body: FormData {
  title: string,
  description: string,
  courseId?: string,
  document: File
}
Response: 201 { success, message, book }
```

### 2️⃣ READ
```javascript
// Get All Books
GET /api/v1/books?page=1&limit=10&courseId=optional

// Search Books
GET /api/v1/books/search?q=search_term&page=1&limit=10

// Get Statistics
GET /api/v1/books/stats

// Get By Course
GET /api/v1/books/course/:courseId?page=1&limit=10

// Get Single Book
GET /api/v1/books/:bookId
```

### 3️⃣ UPDATE
```javascript
// Update All Fields
PUT /api/v1/books/:bookId
Body: {
  title?: string,
  description?: string,
  courseId?: string
}

// Update Title Only
PATCH /api/v1/books/:bookId/title
Body: { title: string }

// Update Description Only
PATCH /api/v1/books/:bookId/description
Body: { description: string }
```

### 4️⃣ DELETE
```javascript
// Delete Book
DELETE /api/v1/books/:bookId
Response: 200 { success, message }
```

---

## 🚀 Common Use Cases

### Create a Book with Upload
```bash
curl -X POST http://localhost:8080/api/v1/books \
  -H "Content-Type: multipart/form-data" \
  -F "title=My Book" \
  -F "description=Book description" \
  -F "courseId=65a1b2c3d4e5f6g7h8i9j0k2" \
  -F "document=@/path/to/file.pdf" \
  --cookie "auth_token=..."
```

### Search Books
```bash
curl http://localhost:8080/api/v1/books/search?q=JavaScript&page=1
```

### Get Books by Course
```bash
curl http://localhost:8080/api/v1/books/course/65a1b2c3d4e5f6g7h8i9j0k2
```

### Update Book Title
```bash
curl -X PATCH http://localhost:8080/api/v1/books/65a1b2c3d4e5f6g7h8i9j0k1/title \
  -H "Content-Type: application/json" \
  -d '{"title":"New Title"}'
```

### Delete Book
```bash
curl -X DELETE http://localhost:8080/api/v1/books/65a1b2c3d4e5f6g7h8i9j0k1
```

---

## 📊 Response Examples

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "total": 25,
  "page": 1,
  "pages": 3
}
```

### Error
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 🔍 Filtering & Pagination

### Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `courseId`: Filter by course ID
- `q`: Search query

### Examples
```
GET /books?page=2&limit=20
GET /books?courseId=xyz123&page=1
GET /books/search?q=javascript&page=1&limit=15
```

---

## 🛠️ HTTP Status Codes

| Code | Meaning |
|------|---------|
| 201 | Created successfully |
| 200 | Operation successful |
| 400 | Bad request / Validation error |
| 404 | Book not found |
| 500 | Server error |

---

## 📝 Book Schema Fields

```javascript
{
  _id: ObjectId,                    // Auto-generated
  title: String,                    // Required, max 200 chars
  description: String,              // Required, max 1000 chars
  courseId: ObjectId,               // Reference to Course, optional
  document: {
    url: String,                    // Cloudinary URL
    publicId: String,               // Cloudinary ID
    originalName: String,           // Original filename
    mimeType: String,               // File MIME type
    size: Number                    // File size in bytes
  },
  createdAt: Date,                  // Auto-generated
  updatedAt: Date                   // Auto-generated
}
```

---

## ⚠️ Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Title and description are required" | Missing fields | Add title & description |
| "Please upload a document" | No file uploaded | Upload a document |
| "Invalid ID format" | Bad MongoDB ID | Check book ID format |
| "Book not found" | ID doesn't exist | Verify book ID |
| "At least one field must be provided" | Empty update | Provide at least one field |

---

## 🔐 Authentication

All endpoints require authentication. Add token via:

**Cookie (Auto):**
```javascript
axios.get('/api/v1/books', { withCredentials: true })
```

**Header (Manual):**
```javascript
axios.get('/api/v1/books', {
  headers: { Authorization: `Bearer ${token}` }
})
```

---

## 📋 Function Summary

| Function | Method | Route | What It Does |
|----------|--------|-------|-------------|
| addNewBook | POST | / | Upload new book |
| getAllBooks | GET | / | Get all books with pagination |
| searchBooks | GET | /search | Search by title/description |
| getBookCount | GET | /stats | Get statistics |
| getBooksByCourseId | GET | /course/:id | Get books for course |
| getBookById | GET | /:id | Get single book |
| updateBook | PUT | /:id | Update multiple fields |
| updateBookTitle | PATCH | /:id/title | Update title only |
| updateBookDescription | PATCH | /:id/description | Update description only |
| deleteBook | DELETE | /:id | Delete book |

---

## 🎓 Example Workflows

### Upload & Retrieve
```javascript
// 1. Upload
const formData = new FormData();
formData.append('title', 'JavaScript Basics');
formData.append('description', 'Learn JS fundamentals');
formData.append('document', file);

const { data } = await axios.post('/api/v1/books', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// 2. Retrieve
const books = await axios.get('/api/v1/books?page=1');
```

### Search & Update
```javascript
// 1. Search
const { data } = await axios.get('/api/v1/books/search?q=JavaScript');

// 2. Update Title
if (data.data.length > 0) {
  await axios.patch(`/api/v1/books/${data.data[0]._id}/title`, {
    title: 'JavaScript Advanced'
  });
}
```

### Manage by Course
```javascript
// 1. Get all books for course
const { data } = await axios.get('/api/v1/books/course/courseId123');

// 2. Delete if needed
for (const book of data.data) {
  await axios.delete(`/api/v1/books/${book._id}`);
}
```

---

**Need More Details?** Check `BOOK_CONTROLLERS_API.md` for comprehensive documentation.
