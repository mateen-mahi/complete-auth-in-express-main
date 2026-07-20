import api from "./api";

const PASSWORD_FIELD = "newPassword";
const LECTURE_QUIZ_FIELD = "quiz";

// ─────────────────────────────────────────────────────────────
// Generic bulk runner — loops single-item calls, never throws;
// returns { succeeded: [...], failed: [{ item, error }] }
// ─────────────────────────────────────────────────────────────
export async function runBulk(items, operation) {
  const succeeded = [];
  const failed = [];
  for (const item of items) {
    try {
      const res = await operation(item);
      succeeded.push({ item, data: res?.data });
    } catch (err) {
      failed.push({
        item,
        error:
          err?.response?.data?.message ||
          err?.message ||
          "Request failed",
      });
    }
  }
  return { succeeded, failed };
}

// ─────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: () => api.get("/users/all-users"),
  getOne: (id) => api.get(`/users/single-user/${id}`),
  add: (payload) => api.post("/users/add-user", payload),
  update: (id, payload) => api.put(`/users/edit-user/${id}`, payload),
  updatePassword: (id, newPassword) =>
    api.put(`/users/update-password/${id}`, { [PASSWORD_FIELD]: newPassword }),
  remove: (id) => api.delete(`/users/delete-user/${id}`),
  clearAll: () => api.delete("/users/clear-all-users"),
  addMany: (usersArray) => runBulk(usersArray, (u) => api.post("/users/add-user", u)),
  removeMany: (ids) => runBulk(ids, (id) => api.delete(`/users/delete-user/${id}`)),
};

// ─────────────────────────────────────────────────────────────
// Courses
// ─────────────────────────────────────────────────────────────
export const coursesApi = {
  getAll: () => api.get("/courses/"),
  getOne: (id) => api.get(`/courses/${id}`),
  add: (payload) => api.post("/courses/", payload),
  update: (id, payload) => api.put(`/courses/${id}`, payload),
  remove: (id) => api.delete(`/courses/${id}`),
  addMany: (coursesArray) => runBulk(coursesArray, (c) => api.post("/courses/", c)),
  removeMany: (ids) => runBulk(ids, (id) => api.delete(`/courses/${id}`)),
  // no clear-all endpoint documented — caller fetches all ids then removeMany()
};

// ─────────────────────────────────────────────────────────────
// Complaints
// ─────────────────────────────────────────────────────────────
export const complaintsApi = {
  getAll: () => api.get("/complaints/all-complaints"),
  getOne: (id) => api.get(`/complaints/complaint/${id}`),
  reply: (id, { status, answer }) =>
    api.put(`/complaints/update-status/${id}`, { status, answer }),
  remove: (id) => api.delete(`/complaints/delete-complaint/${id}`),
  clearAll: () => api.delete("/complaints/clear-all-complaints"),
  removeMany: (ids) => runBulk(ids, (id) => api.delete(`/complaints/delete-complaint/${id}`)),
};

// ─────────────────────────────────────────────────────────────
// Lectures
// ─────────────────────────────────────────────────────────────
export const lecturesApi = {
  getAll: () => api.get("/lectures/"),
  getOne: (id) => api.get(`/lectures/${id}`),
  getByCourse: (courseId) => api.get(`/lectures/course/${courseId}`),
  add: ({ title, description, videoId, duration, course, quiz }) =>
    api.post("/lectures/", {
      title,
      description,
      videoId,
      duration,
      course,
      [LECTURE_QUIZ_FIELD]: quiz,
    }),
  update: (id, payload) => api.put(`/lectures/${id}`, payload),
  remove: (id) => api.delete(`/lectures/${id}`),
  removeByCourse: (courseId) => api.delete(`/lectures/course/${courseId}`),
  addMany: (lecturesArray) =>
    runBulk(lecturesArray, (l) =>
      api.post("/lectures/", { ...l, [LECTURE_QUIZ_FIELD]: l.quiz })
    ),
  removeMany: (ids) => runBulk(ids, (id) => api.delete(`/lectures/${id}`)),
  // no global clear-all — caller fetches all ids then removeMany()
};

// ─────────────────────────────────────────────────────────────
// Quizzes
// ─────────────────────────────────────────────────────────────
export const quizzesApi = {
  getAll: () => api.get("/quizzes/"),
  getOne: (id) => api.get(`/quizzes/${id}`),
  getByCourse: (courseId) => api.get(`/quizzes/course/${courseId}`),
  add: (payload) => api.post("/quizzes/", payload),
  update: (id, payload) => api.put(`/quizzes/${id}`, payload),
  remove: (id) => api.delete(`/quizzes/${id}`),
  removeByCourse: (courseId) => api.delete(`/quizzes/course/${courseId}`),
  addMany: (quizzesArray) => runBulk(quizzesArray, (q) => api.post("/quizzes/", q)),
  removeMany: (ids) => runBulk(ids, (id) => api.delete(`/quizzes/${id}`)),
  // no global clear-all — caller fetches all ids then removeMany()
};

// ─────────────────────────────────────────────────────────────
// Notes (view + delete only — no create/edit per spec)
// ─────────────────────────────────────────────────────────────
export const notesApi = {
  getAll: () => api.get("/notes/"),
  remove: (id) => api.delete(`/notes/${id}`),
  removeMany: (ids) => runBulk(ids, (id) => api.delete(`/notes/${id}`)),
  // no clear-all endpoint documented — caller fetches all ids then removeMany()
};

// ─────────────────────────────────────────────────────────────
// Certificates (view + delete only — NO documented endpoints, see
// assumption #3 above; conventional REST paths assumed)
// ─────────────────────────────────────────────────────────────
export const certificatesApi = {
  getAll: () => api.get("/certificates/"),
  remove: (id) => api.delete(`/certificates/${id}`),
  removeMany: (ids) => runBulk(ids, (id) => api.delete(`/certificates/${id}`)),
};
