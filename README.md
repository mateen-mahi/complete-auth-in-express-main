# Academy — LMS Backend API

A production-style **Learning Management System backend** built with **Node.js, Express, and MongoDB**. What started as a simple authentication API has grown into a full LMS platform: courses, lectures & auto-graded quizzes, progress tracking, PDF certificates, Stripe payments, a real-time Socket.IO chat system, an AI support chatbot, and a full admin dashboard with live analytics and system monitoring.

> This README replaces the original bare-bones auth-only documentation. Everything below reflects the **current** state of the project.

**Frontend companion repo:** [`vite-react-auth`](https://github.com/mateen-mahi/vite-react-auth)

---

## 📌 What's New Since the Original Auth API

The original version of this project only had signup/login/logout/forgot-password. It has since grown into a full platform with the following **new modules**:

| Module | What it adds |
|---|---|
| 🔐 Auth (upgraded) | Refresh tokens, email OTP verification, login-history tracking, role-based access control |
| 📚 Courses | Full course catalog with enroll/unenroll, filtering, search |
| 🎥 Lectures | YouTube-based video lectures with watch-progress tracking |
| 📝 Quizzes | Timed, auto-graded multiple-choice quizzes |
| 📈 Progress | Automatic per-course completion tracking (weighted lecture + quiz formula) |
| 🏆 Certificates | Auto-issued PDF certificates with public verification |
| 💳 Payments | Stripe checkout with webhooks, promo codes, tax calculation |
| 💬 Chat | Real-time global + direct messaging via Socket.IO |
| 🗒️ Notes | Personal note-taking with pin support |
| 📖 Books | PDF resource library with full-text search |
| 📢 Complaints | Support ticket system with live admin notifications |
| 🤖 Chatbot | Gemini-powered, platform-scoped AI assistant |
| 🛠️ Admin | Dashboard KPIs, live system monitoring, bulk management, danger-zone wipes |
| 🔍 Sorting / Pagination / Filtering | Every list-returning endpoint now shares one consistent `page`/`limit`/`sortBy`/`order`/filter query-param contract — see [dedicated section below](#-sorting-pagination--filtering) |

---

## 🧰 Tech Stack

- **Runtime / Framework:** Node.js, Express 5
- **Database:** MongoDB with Mongoose
- **Real-time:** Socket.IO
- **Auth:** JWT (access + refresh tokens), bcryptjs
- **File storage:** Cloudinary (avatars, book PDFs, certificate PDFs)
- **Payments:** Stripe (PaymentIntents + webhooks)
- **Email:** Nodemailer — supports **Gmail** or **Brevo (SMTP)**, switchable via env var
- **PDF generation:** PDFKit + Puppeteer (certificates)
- **AI:** Google Gemini (`@google/genai`) for the support chatbot
- **System monitoring:** `systeminformation`
- **Device/geo intelligence:** `ua-parser-js`, `node-ipinfo`

---

## 📁 Project Structure

```
.
├── app.js                       # Express app entry point, route mounting, CORS, Socket.IO init
├── config/                      # DB & Socket.IO config
├── DB/
│   └── connect.db.js            # MongoDB connection
├── Middlewares/
│   ├── AuthMiddleware.js        # JWT verification (protects routes)
│   ├── multer.middleware.js     # Image upload (avatars)
│   └── Multer.configPDF.js      # PDF upload (books)
├── models/                      # Mongoose schemas (user, course, lecture, quiz, progress,
│                                 #   certificate, order, complaint, notes, books, messages)
├── Controllers/
│   ├── Auth/                    # Signup, Signin, Signout, Verify, Forgot/Reset password, Users
│   ├── course/
│   ├── Lectures/
│   ├── Quizz/
│   ├── Progress/                # Student progress + admin progress analytics
│   ├── Certificate/
│   ├── Payment/
│   ├── Message/                 # Chat REST endpoints (history, conversations, delete)
│   ├── Notes/
│   ├── books/
│   ├── Complaint/
│   ├── chatbot/
│   ├── adminStats/              # Dashboard KPIs (DAU/WAU/MAU, revenue, growth %)
│   └── Systeminfo/               # Live CPU/RAM/disk/network stats
├── routes/                      # One router per module, mounted under /api/v1/*
├── sockets/
│   └── handler.js               # Socket.IO event handlers (chat, presence, admin live feed)
├── service/
│   └── adminEvents.js           # Emits live events to the admin dashboard namespace
├── utils/
│   ├── Progresscalculator.js    # Shared 60/40 lecture+quiz completion formula
│   ├── certificateService.js    # Idempotent certificate issuance (PDF gen + Cloudinary upload)
│   ├── orderPricing.js          # Shared pricing logic (used by both quote & checkout)
│   ├── promoCodes.js
│   └── mailSender.js            # Provider-agnostic mailer (Gmail / Brevo)
└── package.json
```

---

## 🔐 Authentication & Security

- **JWT access + refresh tokens**, both issued as **httpOnly cookies** (not readable by client-side JS).
  - Access token: short-lived (15 min)
  - Refresh token: long-lived (7 days), **bcrypt-hashed before being stored** in the DB — a DB leak alone can't produce a usable session.
- **Email verification via OTP** — new accounts must verify a 6-digit code before signing in. A separate resend endpoint re-issues a fresh OTP.
- **Forgot / reset password** — uses a `crypto`-random token that's **SHA-256 hashed** before it touches the database, with a 24-hour expiry.
- **Login history** — every login records IP, geolocation (city/region/country via IPinfo), and parsed device info (browser/OS/device type via `ua-parser-js`), capped at the last 20 entries per user.
- **Role-based access control** — `user / student / instructor / admin / super-admin`, enforced by `AuthMiddleware.js` and per-route role checks.
- **Signout** invalidates the refresh token server-side (not just a client-side cookie clear).

---

## 📡 API Reference

All routes are mounted under `/api/v1/*`. Routes marked 🔒 require a valid access token (cookie); roles in brackets mean that role (or higher) is required.

### Users & Auth — `/api/v1/users`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/signup` | Register a new account |
| POST | `/signin` | Log in, receive JWT cookies |
| POST | `/signout` | Log out, invalidate refresh token |
| POST | `/forgot-password` | Send password-reset email |
| POST | `/reset-password` | Reset password using emailed token |
| POST | `/send-verify-otp` | (Re)send email verification OTP |
| POST | `/verify-user` | Verify account with OTP |
| GET | `/check-auth` 🔒 | Validate current session, return user info |
| POST | `/add-user` 🔒 | Admin-create a user |
| GET | `/all-users` 🔒 | List/search/paginate users `[admin]` |
| GET | `/single-user/:id` 🔒 | Get one user (with login history) |
| PUT | `/update-password/:id` 🔒 | Admin-triggered password reset |
| PUT | `/edit-user/:id` 🔒 | Edit profile / upload avatar (multipart) |
| DELETE | `/delete-user/:id` 🔒 | Delete a user |
| DELETE | `/clear-all-users` 🔒 | Bulk-wipe all users `[super-admin, danger zone]` |

### Courses — `/api/v1/courses`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List courses (filter by category/level/featured, search, paginate) |
| GET | `/featured` | Featured courses |
| GET | `/:courseId` | Course detail (enriched with `isEnrolled`, enrollment count, lesson count) |
| POST | `/` 🔒 | Create a course |
| PUT | `/:courseId` 🔒 | Update a course |
| DELETE | `/:courseId` 🔒 | Delete a course |
| POST | `/:courseId/enroll` 🔒 | Enroll the current user |
| POST | `/:courseId/unenroll` 🔒 | Unenroll the current user |
| GET | `/my-courses/:studentId` 🔒 | Courses a student is enrolled in |

### Lectures — `/api/v1/lectures` 🔒

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | All lectures |
| GET | `/:lectureId` | Single lecture |
| GET | `/course/:courseId` | Lectures for a course |
| POST | `/` | Create a lecture |
| PUT | `/:lectureId` | Update a lecture |
| DELETE | `/:lectureId` | Delete a lecture |
| DELETE | `/course/:courseId` | Delete all lectures for a course |

### Quizzes — `/api/v1/quizzes`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/course/:courseId` | Quizzes for a course |
| GET | `/attempt/:quizId` | Quiz formatted for attempting (answers stripped) |
| GET | `/` | All quizzes |
| GET | `/:quizId` | Single quiz (with answers — admin view) |
| POST | `/` | Create a quiz |
| PUT | `/:quizId` | Update a quiz |
| DELETE | `/:quizId` | Delete a quiz |
| DELETE | `/course/:courseId` | Delete all quizzes for a course |
| DELETE | `/` | Bulk-delete all quizzes |

### Progress — `/api/v1/progress` 🔒

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | All of the current user's progress records |
| GET | `/:courseId` | Progress for a specific course |
| PATCH | `/:courseId/lecture` | Update lecture watch progress (resumable) |
| POST | `/:courseId/quiz` | Submit a quiz attempt (auto-graded, 70% pass threshold) |

### Certificates — `/api/v1/certificates` 🔒 (except verify)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/verify/:certificateNumber` | **Public** — no auth. Verify authenticity by certificate number |
| GET | `/my-courses` | Current student's certificate status per course (earned / eligible / locked) |
| POST | `/generate/:courseId` | Self-serve generate (idempotent — safe to call twice) |
| GET | `/` | List all certificates `[admin/instructor]` |
| GET | `/student/:studentId` | Certificates for a student |
| GET | `/:certificateId` | Single certificate |
| POST | `/` | Manually issue a certificate `[admin/instructor]` |
| PATCH | `/:certificateId/revoke` | Revoke (soft-delete) `[admin/instructor]` |
| DELETE | `/:certificateId` | Hard-delete `[admin]` |

### Payments — `/api/v1/payments` 🔒

| Method | Endpoint | Description |
|---|---|---|
| POST | `/quote` | Get a price quote (promo code + tax applied) |
| POST | `/create-payment-intent` | Create a Stripe PaymentIntent |
| POST | `/webhook` | **Stripe webhook** — mounted separately in `app.js`, *before* `express.json()`, and not behind auth (Stripe calls it directly, verified via signature) |

### Chat / Messages — `/api/v1/messages` 🔒

| Method | Endpoint | Description |
|---|---|---|
| GET | `/global` | Global chat history |
| GET | `/conversations` | Recent DM conversations list (with live username/avatar) |
| GET | `/dm/:otherUserId` | DM history with a specific user |
| DELETE | `/dm/conversation/:otherUserId` | Clear a conversation (for me only) |
| DELETE | `/:chatType/:messageId` | Delete a message (`chatType`: `global`/`dm`) |

> Real-time chat events (send message, typing, online presence, seen receipts, delete-for-everyone) are handled over **Socket.IO**, not REST — see `sockets/handler.js`.

### Notes — `/api/v1/notes` 🔒

| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Create a note |
| GET | `/` | List notes (paginated) |
| GET | `/user/:userId` | Notes for a specific user |
| GET | `/:noteId` | Single note |
| PUT | `/:noteId` | Update a note |
| DELETE | `/:noteId` | Delete a note |
| PATCH | `/:noteId/pin` | Toggle pin |

### Books — `/api/v1/books` 🔒

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List books (paginated, optional course filter) |
| GET | `/search?q=` | Full-text search by title/description |
| GET | `/count` | Total + per-course counts `[admin]` |
| GET | `/course/:courseId` | Books for a course |
| GET | `/:bookId` | Single book |
| POST | `/` | Upload a new book (multipart, field `document`) `[admin/instructor]` |
| PUT | `/:bookId` | Update metadata `[admin/instructor]` |
| DELETE | `/:bookId` | Delete (also removes file from Cloudinary) `[admin/instructor]` |

### Complaints — `/api/v1/complaints` 🔒

| Method | Endpoint | Description |
|---|---|---|
| POST | `/submit-complaint` | Submit a complaint |
| GET | `/user-complaints` | Current user's complaints |
| GET | `/all-complaints` | All complaints `[admin]` |
| GET | `/complaint/:complaintId` | Single complaint |
| PUT | `/update-status/:complaintId` | Update status (pending/in progress/resolved) `[admin]` |
| DELETE | `/delete-complaint/:complaintId` | Delete one `[admin]` |
| DELETE | `/clear-all-complaints` | Bulk-wipe `[admin]` |

> New complaints and status changes are also pushed live to the admin dashboard over Socket.IO.

### Chatbot — `/api/v1/chatbot` 🔒

| Method | Endpoint | Description |
|---|---|---|
| POST | `/message` | Send a message, get a **streamed** (plain-text, token-by-token) Gemini reply. Body: `{ message, history? }` |

### Admin — `/api/v1/admin` 🔒 `[admin]`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard-stats` | KPI cards: users, DAU/WAU/MAU, revenue, growth % |
| GET | `/system-stats` | CPU/RAM/disk/network snapshot |
| GET | `/analytics` | Platform-wide progress analytics |
| GET | `/course/:courseId/analytics` | Per-course analytics |
| GET | `/course/:courseId/student/:userId` | One student's progress in one course |
| GET | `/course/:courseId` | All students' progress in a course |

---

## 🔍 Sorting, Pagination & Filtering

Every list-returning `GET` endpoint in the API follows the **same query parameter contract**:

```
?page=<number>        (default 1)
&limit=<number>        (default varies per endpoint, most capped at 50)
&sortBy=<field>        (whitelisted per endpoint — see table below)
&order=asc|desc        (default varies per endpoint — see table below)
&<filter params>       (endpoint-specific — see table below)
```

**Rules:**
- `sortBy` only accepts the whitelisted field names below. Anything else **silently falls back** to that endpoint's default sort — no error thrown.
- `order` accepts `asc` or `desc`; anything else is treated as `desc`.
- Exact-match filters (`role`, `status`, `gender`, `isPinned`, `completed`, etc.) only accept the whitelisted values below. An unrecognized value is **silently ignored**, not an error — so a stale/bad dropdown value just returns the unfiltered list instead of breaking the request.
- `search` params always do a case-insensitive partial match (regex), with special regex characters escaped server-side — safe to pass raw user input straight from a search box.
- Multiple filters combine freely (ANDed together), and combine with `sortBy`/`order`/`page`/`limit` in the same request.
- **Two "single-course" nested endpoints treat pagination as opt-in**: `GET /lectures/course/:courseId` and `GET /quizzes/course/:courseId`. If you don't send `page`/`limit` at all, you get the full list, unpaginated, in curriculum order — exactly like before this feature existed. Only send `page`/`limit` there if you actually want to page through a long course.

### Quick reference

| Endpoint | Sortable fields | Filters | Default sort | Paginated |
|---|---|---|---|---|
| `GET /admin/users` | `username`, `email`, `role`, `gender`, `isVerified`, `createdAt`, `updatedAt` | `role`, `gender`, `isVerified`, `search` | `createdAt desc` | always |
| `GET /books` | `title`, `createdAt`, `updatedAt` | `courseId`, `search` | `createdAt desc` | always |
| `GET /books/course/:courseId` | `title`, `createdAt`, `updatedAt` | *(scoped to courseId in URL)* | `createdAt desc` | always |
| `GET /books/search?q=` | `title`, `createdAt`, `updatedAt` | `q` (required search term) | `createdAt desc` | always |
| `GET /courses` | `title`, `price`, `duration`, `level`, `category`, `createdAt` | `category`, `level`, `featured`, `search` | `createdAt desc` | always |
| `GET /courses/featured` | same as above | `category`, `level`, `search` | `createdAt desc` | ✅ always **(NEW)** |
| `GET /courses/student/:studentId` | same as above | `category`, `level`, `search` | `createdAt desc` | ✅ always **(NEW)** |
| `GET /lectures` | `title`, `duration`, `createdAt` | `courseId`, `search` | `createdAt desc` | always |
| `GET /lectures/course/:courseId` | `title`, `duration`, `createdAt`, `order` | *(scoped to courseId in URL)* | `order asc` (curriculum) | opt-in **(NEW)** |
| `GET /notes` | `title`, `createdAt`, `updatedAt` | `isPinned`, `search` | `isPinned desc, updatedAt desc` | always |
| `GET /notes/user/:userId` | `title`, `createdAt`, `updatedAt` | `isPinned`, `search` | `isPinned desc, updatedAt desc` | ✅ always **(NEW)** |
| `GET /quizzes` | `title`, `subject`, `totalTime`, `createdAt` | `courseId`, `subject`, `search` | `createdAt desc` | always |
| `GET /quizzes/course/:courseId` | `title`, `subject`, `totalTime`, `createdAt`, `order` | *(scoped to courseId in URL)* | `order asc` (curriculum) | opt-in **(NEW)** |
| `GET /admin/complaints` | `status`, `subject`, `createdAt`, `updatedAt` | `status`, `search` | `createdAt desc` | always |
| `GET /complaints/mine` | `status`, `subject`, `createdAt`, `updatedAt` | `status`, `search` | `createdAt desc` | ✅ always **(NEW)** |
| `GET /admin/certificates` | `status`, `grade`, `issuedAt`, `certificateNumber` | `courseId`, `studentId`, `status` | `issuedAt desc` | always |
| `GET /certificates/student/:studentId` | same as above | `status`, `courseId` | `issuedAt desc` | ✅ always **(NEW)** |
| `GET /admin/progress/course/:courseId` | `overallProgress`, `completed`, `updatedAt` | `completed` | `overallProgress desc` | always |
| `GET /progress` (own progress) | `overallProgress`, `completed`, `updatedAt` | `completed` | `updatedAt desc` | opt-in **(NEW)** |

`(NEW)` = this endpoint was previously fixed-order and/or unpaginated and now supports the full pattern above. Every list-returning `GET` route in the codebase now follows this pattern in some form.

### Filter value whitelists (exact strings, case-sensitive)

- `role`: `student` \| `instructor` \| `admin` \| `super-admin`
- `gender`: `male` \| `female` \| `other`
- `isVerified` / `isPinned` / `completed` / `featured`: `true` \| `false`
- `status` (complaints): `pending` \| `in progress` \| `resolved` — note the **space** in `in progress`, not `in-progress`/`inProgress`
- `status` (certificates): `active` \| `revoked`

### Response shape

Typical shape: `{ success, data/records/users/etc, total, page, pages/totalPages, ... }` — exact key names vary slightly by endpoint (some use `data`+`pages`, some use `users`/`complaints`/`progress`+`totalPages`), matching each endpoint's pre-existing response shape.

### ⚠️ Breaking-ish changes (response shape only — request params were purely additive everywhere)

1. **`GET /courses/featured`** — now returns `total`/`page`/`pages` alongside `data`. Reading `response.data` directly is unaffected; a strict shape/key-count check is not.
2. **`GET /courses/student/:studentId`** — same as above.
3. **`GET /lectures/course/:courseId`** and **`GET /quizzes/course/:courseId`** — now always return a `total` field, even when you don't paginate. `page`/`pages` only appear once you opt into pagination by sending `page`/`limit`.
4. **`GET /progress`** — now always returns a `total` field, same opt-in `page`/`pages` pattern as #3.

None of these change the actual list content, field names, or default ordering unless you explicitly opt into a new `page`/`limit`/`sortBy`/filter param.

### 🐛 Fixed along the way

`Controllers/Lectures/lectures.controller.js` and `Controllers/Quizz/quiz.controller.js` were both missing `import mongoose from "mongoose";` despite calling `mongoose.Types.ObjectId.isValid(...)` elsewhere (e.g. in `createLecture`/`createQuiz` validation — a pre-existing bug that would have thrown a `ReferenceError` if that code path was ever actually hit). The import was added to both files to support the new `courseId` validation in `getLecturesByCourseId`/`getQuizzesByCourseId`, which fixes the pre-existing bug as a side effect.

---

## 🔌 Real-Time Features (Socket.IO)

Handled in `sockets/handler.js`, initialized in `config/socket.js`:

- **Global chat room** — every connected, authenticated user.
- **Direct messages** — 1-to-1, with server-side authorization per conversation.
- **Presence** — deduplicated per user (not per socket/tab).
- **Typing indicators** for both global and DM chat.
- **Seen/read receipts** for DMs.
- **Delete for me / delete for everyone** — "everyone" is restricted server-side to the sender and redacts rather than hard-deletes.
- **Admin live feed** (`service/adminEvents.js`) — a separate `/admin` namespace that pushes new signups, enrollments, complaints, and progress/quiz events to the admin dashboard in real time.
- **Live system stats** — periodic CPU/RAM/disk/network pushes to the admin dashboard.

---

## 🎓 Progress, Completion & Certificates — How It Fits Together

1. A student watches lectures — progress is saved incrementally (`PATCH /progress/:courseId/lecture`), resumable from last position.
2. A student attempts a quiz — auto-graded server-side against a **70% pass threshold** (`POST /progress/:courseId/quiz`).
3. Both endpoints call the **same shared utility** (`utils/Progresscalculator.js`) to recompute overall course completion using a fixed weighted formula: **60% lecture-watch ratio + 40% quiz-pass ratio** — so the two code paths can never disagree on a student's completion %.
4. Once completion crosses the **90% eligibility threshold**, a certificate is **auto-issued**. Students can also self-serve generate one (`POST /certificates/generate/:courseId`), and admins/instructors can issue manually — all three paths funnel through one **idempotent** function in `utils/certificateService.js`, so issuing twice never creates duplicates.
5. Certificates are rendered to PDF (PDFKit + Puppeteer), uploaded to Cloudinary, and given a unique `CERT-<timestamp>-<random>` number that anyone can verify publicly via `GET /certificates/verify/:certificateNumber` — no login required.

---

## 💳 Payments

- Uses **Stripe PaymentIntents**. The webhook route is registered directly on `app` (not in the router) and mounted with `express.raw()` **before** `express.json()`, since Stripe requires the raw request body to verify the signature.
- Enrollment is only finalized once the webhook confirms a successful charge — never optimistically on the client.
- `utils/orderPricing.js` computes price (base + promo code discount + tax) and is used identically by both `/payments/quote` (what the user sees) and `/payments/create-payment-intent` (what they're actually charged), so the two can't drift apart.
- Orders (`models/order.model.js`) track `status`: `pending / completed / failed / refunded`, and `gateway`, with the schema already shaped to support additional gateways later.

---

## ⚙️ Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/mateen-mahi/complete-auth-in-express-main.git
cd complete-auth-in-express-main
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
# ── Server ──────────────────────────────────────────────
PORT=8080
NODE_ENV=development
FRONTEND_URI=http://localhost:5173

# ── Database ────────────────────────────────────────────
MONGO_URI=your_mongodb_connection_string

# ── JWT ─────────────────────────────────────────────────
JWT_SECRET_ACCESS_TOKEN=your_access_token_secret
JWT_SECRET_REFRESH_TOKEN=your_refresh_token_secret

# ── Email (choose ONE provider) ─────────────────────────
EMAIL_PROVIDER=gmail            # "gmail" or "brevo"
SMTP_SENDER_EMAIL=noreply@yourapp.com
APP_NAME=Academy
COMPANY_NAME=Academy
FOOTER_TAGLINE=Learn something new every day
SUPPORT_EMAIL=support@yourapp.com

# If EMAIL_PROVIDER=gmail
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_APP_PASS=your_gmail_app_password

# If EMAIL_PROVIDER=brevo (or any SMTP relay)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# ── Cloudinary (avatars, book PDFs, certificate PDFs) ───
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ── Stripe ───────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx

# ── Geolocation (login history — IPinfo) ────────────────
Geolocation_API_KEY=your_ipinfo_api_key

# ── AI Chatbot (Google Gemini) ──────────────────────────
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash        # or your preferred Gemini model
```

### 4. Run the server

```bash
npm start
```

The server starts at `http://localhost:8080`, and Socket.IO is initialized on the same HTTP server. Watch the console for `CORS allowed origins` to confirm your frontend URL is permitted.

> **Note:** `FRONTEND_URI` and the hardcoded origins in `app.js` (`localhost:8080`, `localhost:5173`) control CORS — add any additional deployed frontend URL there if you deploy your own copy.

---

## 🛡️ Security Notes

- Refresh tokens are **bcrypt-hashed** at rest — never stored or logged in plaintext.
- Password-reset tokens are **SHA-256 hashed** at rest; the raw token only ever exists in the emailed link, with a 24-hour expiry.
- The Stripe webhook is signature-verified and deliberately excluded from the global `express.json()` + auth pipeline.
- Set `NODE_ENV=production` and ensure cookies are issued with `secure: true` behind HTTPS in production.
- Never commit your `.env` file — use environment variables or a secrets manager in production.
- The `clear-all-users` / bulk-wipe endpoints are gated to `super-admin` and are irreversible — use with care, intended for a "danger zone" admin UI with a type-to-confirm step on the frontend.

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `express` | Web framework |
| `mongoose` | MongoDB ODM |
| `socket.io` | Real-time chat & live admin events |
| `jsonwebtoken` / `bcryptjs` | Auth tokens & hashing |
| `cloudinary` / `multer` | File uploads (avatars, PDFs) |
| `stripe` | Payments |
| `nodemailer` | Transactional email (Gmail/Brevo) |
| `pdfkit` / `puppeteer` | Certificate PDF generation |
| `@google/genai` | Gemini-powered chatbot |
| `systeminformation` | Live server resource monitoring |
| `ua-parser-js` / `node-ipinfo` | Login-history device & geo enrichment |
| `cookie-parser`, `cors`, `dotenv` | Standard Express plumbing |

---

## 🤝 Support

Questions or issues? Open an issue on this repository or reach out directly:
📞 +92 304 1418406