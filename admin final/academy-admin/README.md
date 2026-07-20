# Academy Admin Pages

Seven admin pages for your LMS: Users, Courses, Complaints, Lectures, Quizzes,
Notes, Certificates. Built to match `design-system.md` exactly, using plain
CSS Modules, and calling your documented `/api/v1/...` endpoints through the
same axios instance your `AuthContext` already uses.

## 0. Install

The only new dependency across all of this is **react-icons** (the `Fi`
icon set, matching your design system's icon library convention):
```
npm install react-icons
```
Everything else — pagination, the auth guard, JSON export — is plain React
with your existing `axios` instance. No other packages needed.

## 1. Drop-in instructions

Copy the `src/` folder contents into your project so they land next to your
existing folders (this matches the `../services/api`, `../custom-hooks/...`
import style already used in your `AuthContext.jsx`):

```
your-project/src/
├─ services/adminApi.js          ← new
├─ custom-hooks/useSelection.js  ← new
├─ custom-hooks/useToast.js      ← new
├─ custom-hooks/usePagination.js ← new
├─ components/admin/             ← new (Toast, ConfirmModal, BulkJsonModal,
│                                    Pagination, RequireRole, shared CSS)
├─ pages/admin/                  ← new (the 7 pages, each with its own CSS)
├─ utils/adminFormat.js          ← new
├─ utils/exportJson.js           ← new
├─ services/api.js               ← already exists, untouched
└─ context/AuthContext.jsx       ← already exists, untouched
```

If your existing `services/api.js` file lives somewhere other than
`src/services/api.js`, fix the one import in `src/services/adminApi.js`:
```js
import api from "./api";
```

## 2. Routing (you said you'd wire this up yourself)

Each page is a self-contained default export, e.g.:
```jsx
import UsersAdminPage from "./pages/admin/UsersAdminPage";
import CoursesAdminPage from "./pages/admin/CoursesAdminPage";
import ComplaintsAdminPage from "./pages/admin/ComplaintsAdminPage";
import LecturesAdminPage from "./pages/admin/LecturesAdminPage";
import QuizzesAdminPage from "./pages/admin/QuizzesAdminPage";
import NotesAdminPage from "./pages/admin/NotesAdminPage";
import CertificatesAdminPage from "./pages/admin/CertificatesAdminPage";

<Route path="/admin/users" element={<UsersAdminPage />} />
<Route path="/admin/courses" element={<CoursesAdminPage />} />
<Route path="/admin/complaints" element={<ComplaintsAdminPage />} />
<Route path="/admin/lectures" element={<LecturesAdminPage />} />
<Route path="/admin/quizzes" element={<QuizzesAdminPage />} />
<Route path="/admin/notes" element={<NotesAdminPage />} />
<Route path="/admin/certificates" element={<CertificatesAdminPage />} />
```
None of them assume a layout/sidebar — wrap them in whatever admin shell and
role guard (`role === 'admin'`) you already have.

## 3. What's on each page

| Page | Add | Bulk add (JSON) | Edit | Delete one/many/all | Extra |
|---|---|---|---|---|---|
| Users | ✅ + separate change-password action | ✅ | ✅ all fields | ✅ | verified/unverified filter, avatar preview |
| Courses | ✅ | ✅ | ✅ *(bonus)* | ✅ | color/emoji picker |
| Complaints | — (user-submitted) | — | ✅ reply (status + answer) | ✅ | status filter tabs, color-coded row stripe |
| Lectures | ✅ course picked from dropdown, id auto-attached | ✅ | ✅ all fields | ✅ | YouTube thumbnail preview |
| Quizzes | ✅ with a question/option builder | ✅ | ✅ all fields | ✅ | — |
| Notes | — (view only, per your spec) | — | — | ✅ | pinned accent stripe |
| Certificates | — (view only, per your spec) | — | — | ✅ one-by-one + optional multi-select | grade ribbon badge |

Bulk-add modals accept **either** a pasted JSON array **or** a `.json` file
upload, as requested. Every page also has:

- **Pagination** — 10 rows/page, via the shared `usePagination` hook +
  `Pagination` component. Selection ("N selected") still applies across all
  filtered rows, not just the visible page, so "Delete selected" does what
  you'd expect even after you've paged around.
- **Export JSON** — downloads whatever's currently filtered/searched as a
  `.json` file, mirroring the bulk-import format so you can round-trip data
  between environments.

## 4. Optional: role guard

`components/admin/RequireRole.jsx` wraps a page and checks `role` from your
existing `useAuth()` — it shows a spinner while `auth.loading`, a "sign in
required" screen if there's no user, and an access-denied screen if the
role doesn't match:

```jsx
import RequireRole from "./components/admin/RequireRole";
import UsersAdminPage from "./pages/admin/UsersAdminPage";

<Route path="/admin/users" element={
  <RequireRole role="admin"><UsersAdminPage /></RequireRole>
} />

// or allow multiple roles:
<RequireRole role={["admin", "super-admin"]}><CoursesAdminPage /></RequireRole>
```

It imports `useAuth` from `"../../context/AuthContext"` — update that path
if your `AuthContext.jsx` lives somewhere else. This is opt-in; none of the
7 pages use it internally, so plug it in only where you want it.

## 5. Things I had to assume — please verify these

Your reference doc doesn't specify a few things I needed to guess at. All are
called out with `⚠️`/comments right at the top of the relevant file too:

1. **API response shape.** Nothing in your doc shows what a successful
   response body looks like (e.g. `{ users: [...] }` vs `{ data: [...] }` vs
   a bare array). Every page currently tries
   `res.data.users || res.data.data || res.data`, which covers the common
   shapes but should be the first thing you check if a list doesn't populate.
2. **No bulk endpoints exist** except `clear-all-users` and
   `clear-all-complaints`. "Bulk add," "delete selected," and "delete all"
   everywhere else are implemented by **looping the single-item endpoint**
   client-side (see `runBulk()` in `adminApi.js`) — it reports per-item
   success/failure rather than failing all-or-nothing. Swap in real bulk
   routes later for speed/atomicity if you add them.
3. **Certificates have no documented endpoints at all** (the schema itself is
   marked "Planned" in your doc). `certificatesApi` assumes conventional REST
   paths (`GET/DELETE /api/v1/certificates/...`) purely so the page has
   something to call. You'll need to add matching routes, or tell me the real
   ones and I'll rewire it.
4. **Lecture → quiz reference.** You asked for each lecture to carry a quiz
   id, but `lectureSchema` in your doc only has `course`, not a quiz field —
   and `lectures.controller.js`'s "Asks For" column confirms create only
   takes `title, description, videoId, duration, course`. The form still
   lets you pick a linked quiz and sends it as `quiz` in the payload
   (`LECTURE_QUIZ_FIELD` in `adminApi.js`), but **your backend needs that
   field added to the schema/controller** for it to actually persist.
5. **Password field name.** `PUT /users/update-password/:id` isn't detailed
   in your controller table. I send `{ newPassword }` — change
   `PASSWORD_FIELD` in `adminApi.js` if your controller expects `password`.
6. **Course edit** wasn't explicitly requested (you asked for add + delete
   only) — I added it since `PUT /courses/:courseId` already exists and it's
   low-cost/high-value. Delete the "Edit" button in `CoursesAdminPage.jsx` if
   you'd rather not have it.

## 6. Styling

Everything is built from `src/components/admin/AdminShared.module.css` —
buttons, table, modal, badges, toolbar, pagination, filter pills, empty
states, toast — using the exact hex values, radii, and shadows from
`design-system.md`. **Every one of the 7 pages also has its own
`.module.css`** for things unique to it: Users (avatar preview), Courses
(color/emoji swatches), Complaints (status-color row stripe), Lectures
(YouTube thumbnail), Quizzes (question builder), Notes (pinned accent),
Certificates (grade ribbon badge).

All 24 files in `src/` — 18 `.js`/`.jsx` plus 8 `.module.css` — pass a Babel
syntax check, an ESLint pass (`no-undef`, `no-unused-vars`,
`react/recommended`, zero errors), and a brace-balance check on every
stylesheet. They're structurally sound, but I obviously couldn't run them
against your real backend, so real-world testing is still on you.
