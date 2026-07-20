# Book Controllers API Documentation

This document provides a comprehensive guide to all Book controller endpoints and their usage.

## Table of Contents
1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Endpoints](#endpoints)
5. [Response Format](#response-format)
6. [Error Handling](#error-handling)
7. [Examples](#examples)

---

## Overview

The Book API provides complete CRUD (Create, Read, Update, Delete) operations for managing books in the LMS. All endpoints support pagination, filtering, and searching capabilities.

### Features
- ✅ Upload books with documents (PDF, Word, Excel, PowerPoint, Text)
- ✅ Retrieve all books with pagination
- ✅ Search books by title or description
- ✅ Get books by course ID
- ✅ Update book details (title, description, course association)
- ✅ Delete books with document cleanup
- ✅ Get book statistics

---

## Base URL

```
http://localhost:8080/api/v1/books
```

---

## Authentication

All endpoints require authentication (JWT token). The token should be sent as a cookie or authorization header.

```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. CREATE BOOK

**Endpoint:** `POST /api/v1/books`

**Description:** Create a new book with a document upload.

**Request Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body (form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Book title (max 200 chars) |
| description | string | Yes | Book description (max 1000 chars) |
| courseId | string | No | MongoDB course ID (optional) |
| document | file | Yes | Document file (PDF, Word, Excel, etc.) |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Book uploaded successfully.",
  "book": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "title": "Advanced JavaScript",
    "description": "Learn advanced concepts in JavaScript programming",
    "courseId": "65a1b2c3d4e5f6g7h8i9j0k2",
    "document": {
      "url": "https://res.cloudinary.com/...",
      "publicId": "LMS Documents/...",
      "originalName": "javascript.pdf",
      "mimeType": "application/pdf",
      "size": 2097152
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "message": "Title and description are required."
}
```

---

### 2. GET ALL BOOKS

**Endpoint:** `GET /api/v1/books`

**Description:** Retrieve all books with pagination and optional course filtering.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number for pagination |
| limit | number | 10 | Number of books per page |
| courseId | string | - | Filter by course ID (optional) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Advanced JavaScript",
      "description": "Learn advanced concepts in JavaScript programming",
      "courseId": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
        "title": "JavaScript Mastery"
      },
      "document": {...},
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "pages": 3
}
```

---

### 3. SEARCH BOOKS

**Endpoint:** `GET /api/v1/books/search`

**Description:** Search books by title or description.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Advanced JavaScript",
      "description": "Learn advanced concepts in JavaScript programming",
      "courseId": {...},
      "document": {...},
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "pages": 1
}
```

---

### 4. GET BOOK STATISTICS

**Endpoint:** `GET /api/v1/books/stats`

**Description:** Get book count and statistics grouped by course.

**Response (200 OK):**
```json
{
  "success": true,
  "totalBooks": 45,
  "byCourse": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "count": 12
    },
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "count": 8
    },
    {
      "_id": null,
      "count": 25
    }
  ]
}
```

---

### 5. GET BOOKS BY COURSE ID

**Endpoint:** `GET /api/v1/books/course/:courseId`

**Description:** Get all books for a specific course.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | string | Yes | MongoDB course ID |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Course Introduction",
      "description": "Introduction to the course",
      "courseId": "65a1b2c3d4e5f6g7h8i9j0k2",
      "document": {...},
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 8,
  "page": 1,
  "pages": 1
}
```

---

### 6. GET BOOK BY ID

**Endpoint:** `GET /api/v1/books/:bookId`

**Description:** Retrieve a specific book by its ID.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookId | string | Yes | MongoDB book ID |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "title": "Advanced JavaScript",
    "description": "Learn advanced concepts in JavaScript programming",
    "courseId": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "title": "JavaScript Mastery",
      "description": "Complete JavaScript course"
    },
    "document": {
      "url": "https://res.cloudinary.com/...",
      "publicId": "LMS Documents/...",
      "originalName": "javascript.pdf",
      "mimeType": "application/pdf",
      "size": 2097152
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Book not found."
}
```

---

### 7. UPDATE BOOK (ALL FIELDS)

**Endpoint:** `PUT /api/v1/books/:bookId`

**Description:** Update multiple book fields at once.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookId | string | Yes | MongoDB book ID |

**Request Body (JSON):**
```json
{
  "title": "Updated Book Title",
  "description": "Updated description",
  "courseId": "65a1b2c3d4e5f6g7h8i9j0k2"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Book updated successfully.",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "title": "Updated Book Title",
    "description": "Updated description",
    "courseId": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "title": "JavaScript Mastery",
      "description": "Complete JavaScript course"
    },
    "document": {...},
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T14:45:00.000Z"
  }
}
```

---

### 8. UPDATE BOOK TITLE

**Endpoint:** `PATCH /api/v1/books/:bookId/title`

**Description:** Update only the book title.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookId | string | Yes | MongoDB book ID |

**Request Body (JSON):**
```json
{
  "title": "New Book Title"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Book title updated successfully.",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "title": "New Book Title",
    "description": "Original description",
    "courseId": {...},
    "document": {...},
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T14:45:00.000Z"
  }
}
```

---

### 9. UPDATE BOOK DESCRIPTION

**Endpoint:** `PATCH /api/v1/books/:bookId/description`

**Description:** Update only the book description.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookId | string | Yes | MongoDB book ID |

**Request Body (JSON):**
```json
{
  "description": "New comprehensive description of the book"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Book description updated successfully.",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "title": "Book Title",
    "description": "New comprehensive description of the book",
    "courseId": {...},
    "document": {...},
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T14:45:00.000Z"
  }
}
```

---

### 10. DELETE BOOK

**Endpoint:** `DELETE /api/v1/books/:bookId`

**Description:** Delete a book and its associated document.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bookId | string | Yes | MongoDB book ID |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Book deleted successfully."
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Book not found."
}
```

---

## Response Format

All responses follow a consistent JSON format:

**Success Response:**
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

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Error Handling

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | Bad Request | Invalid input or missing required fields |
| 404 | Not Found | Book or resource not found |
| 500 | Internal Server Error | Server error during processing |

### Error Response Examples

**Missing Required Field (400):**
```json
{
  "success": false,
  "message": "Title and description are required."
}
```

**Invalid ID Format (400):**
```json
{
  "success": false,
  "message": "Invalid ID format"
}
```

**Book Not Found (404):**
```json
{
  "success": false,
  "message": "Book not found."
}
```

---

## Examples

### JavaScript/Axios

**Create a Book:**
```javascript
const formData = new FormData();
formData.append('title', 'JavaScript Advanced');
formData.append('description', 'Learn advanced JavaScript concepts');
formData.append('courseId', '65a1b2c3d4e5f6g7h8i9j0k2');
formData.append('document', fileInput.files[0]);

const response = await axios.post(
  'http://localhost:8080/api/v1/books',
  formData,
  {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }
);
```

**Get All Books:**
```javascript
const response = await axios.get(
  'http://localhost:8080/api/v1/books?page=1&limit=10',
  {
    withCredentials: true,
  }
);
```

**Search Books:**
```javascript
const response = await axios.get(
  'http://localhost:8080/api/v1/books/search?q=JavaScript&page=1',
  {
    withCredentials: true,
  }
);
```

**Update Book Title:**
```javascript
const response = await axios.patch(
  'http://localhost:8080/api/v1/books/65a1b2c3d4e5f6g7h8i9j0k1/title',
  {
    title: 'Updated JavaScript Advanced',
  },
  {
    withCredentials: true,
  }
);
```

**Delete Book:**
```javascript
const response = await axios.delete(
  'http://localhost:8080/api/v1/books/65a1b2c3d4e5f6g7h8i9j0k1',
  {
    withCredentials: true,
  }
);
```

---

## Book Schema

```javascript
{
  title: String (required, max 200 chars),
  description: String (required, max 1000 chars),
  document: {
    url: String (Cloudinary URL),
    publicId: String (Cloudinary public ID),
    originalName: String (Original file name),
    mimeType: String (File MIME type),
    size: Number (File size in bytes)
  },
  courseId: ObjectId (Reference to Course collection),
  createdAt: Date (Auto-generated),
  updatedAt: Date (Auto-generated)
}
```

---

## Notes

- All endpoints require authentication except noted otherwise
- Document file size limit: 20 MB
- Supported document formats: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), Text (.txt)
- Pagination: Page numbers start from 1
- Deletion of books will remove the database record; Cloudinary cleanup can be enabled in the controller
- All datetime fields are in ISO 8601 format

---

## Controller Functions

| Function | Method | Route | Description |
|----------|--------|-------|-------------|
| addNewBook | POST | /api/v1/books | Create new book |
| getAllBooks | GET | /api/v1/books | Retrieve all books |
| searchBooks | GET | /api/v1/books/search | Search books |
| getBookCount | GET | /api/v1/books/stats | Get statistics |
| getBooksByCourseId | GET | /api/v1/books/course/:courseId | Get books by course |
| getBookById | GET | /api/v1/books/:bookId | Get single book |
| updateBook | PUT | /api/v1/books/:bookId | Update all fields |
| updateBookTitle | PATCH | /api/v1/books/:bookId/title | Update title only |
| updateBookDescription | PATCH | /api/v1/books/:bookId/description | Update description only |
| deleteBook | DELETE | /api/v1/books/:bookId | Delete book |

---

Last Updated: 2024
