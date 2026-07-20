// src/data/dummyAdminData.js
//
// Single source of dummy data for the entire admin dashboard.
// When you're ready to go live: replace each of these exports with a
// useState + useEffect fetch in the component that uses it. Nothing else
// needs to change — every table/chart already reads from these exports.
//
// Data is generated deterministically (index-based, not Math.random()) so
// it's stable across re-renders and hot reloads.

const FIRST_NAMES = ["Ayesha","Bilal","Sara","Usman","Hina","Ali","Zara","Hamza","Mariam","Faisal","Noor","Adeel","Sana","Kamran","Rabia","Tariq","Amna","Waqas","Iqra","Salman"];
const LAST_NAMES  = ["Khan","Malik","Ahmed","Raza","Siddiq","Baig","Iqbal","Farooq","Hassan","Sheikh"];
const ROLES       = ["end-user", "end-user", "end-user", "end-user", "admin", "super-admin"]; // weighted toward end-user
const GENDERS     = ["male", "female"];
const CATEGORIES  = ["Frontend","Backend","Database","Core CS","Tools","Data Science & Analytics","Mobile Development","DevOps"];
const LEVELS      = ["Beginner","Intermediate","Advanced"];
const COLORS      = ["#2563eb","#16a34a","#059669","#d97706","#7c3aed","#0891b2","#1d4ed8","#be185d"];
const EMOJIS      = ["⚛️","🟢","🍃","🧠","🎨","🏗️","🔷","🐙","📊","📱","☁️","🔐","🐍","🕸️"];

function seededDate(daysAgoMax, index) {
  const daysAgo = (index * 37) % daysAgoMax; // deterministic spread, not random
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const makeId = (prefix, i) => `${prefix}${String(i).padStart(6, "0")}`;

// ── Users ────────────────────────────────────────────────────────────────
export const DUMMY_USERS = Array.from({ length: 52 }, (_, i) => {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const last  = LAST_NAMES[(i * 3) % LAST_NAMES.length];
  return {
    _id: makeId("u", i),
    username: `${first}${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@academy.com`,
    role: ROLES[i % ROLES.length],
    gender: GENDERS[i % 2],
    isVerified: i % 4 !== 0, // ~75% verified
    imageUrl: null,
    createdAt: seededDate(180, i),
    lastSeen: seededDate(14, i + 5),
    status: i % 11 === 0 ? "banned" : "active",
  };
});

const staffUsers = DUMMY_USERS.filter((u) => u.role !== "end-user");

// ── Courses ──────────────────────────────────────────────────────────────
const COURSE_TITLES = [
  "Complete React Developer", "Node.js & Express Bootcamp", "MongoDB — The Complete Guide",
  "JavaScript Algorithms & DSA", "CSS Mastery & Modern Layouts", "System Design for Developers",
  "TypeScript from Zero to Hero", "Git & GitHub for Developers", "Data Science & Analytics Fundamentals",
  "React Native Mobile Apps", "AWS Cloud Practitioner", "Docker & Kubernetes Essentials",
  "Python for Data Analysis", "GraphQL API Design",
];

export const DUMMY_COURSES = COURSE_TITLES.map((title, i) => {
  const instructor = staffUsers[i % staffUsers.length];
  return {
    _id: makeId("c", i),
    title,
    instructor: instructor.username,
    instructorId: instructor._id,
    category: CATEGORIES[i % CATEGORIES.length],
    level: LEVELS[i % LEVELS.length],
    price: [0, 19.99, 24.75, 29.99, 34.5, 49][i % 6],
    studentsEnrolledCount: 40 + ((i * 173) % 900),
    lecturesCount: 8 + (i % 14), // deliberately spans under/over a 10–15 "healthy" range
    quizzesCount: i % 5 === 0 ? 0 : (i % 7 === 0 ? 3 : (i % 2) + 1), // spans a 1–2 "healthy" range
    featured: i === 0 || i === 8,
    color: COLORS[i % COLORS.length],
    emoji: EMOJIS[i % EMOJIS.length],
    createdAt: seededDate(300, i),
  };
});

// ── Lectures ─────────────────────────────────────────────────────────────
const LECTURE_TITLES = ["Introduction", "Deep Dive", "Building the Project", "Advanced Patterns", "Wrap-up"];

export const DUMMY_LECTURES = Array.from({ length: 60 }, (_, i) => {
  const course = DUMMY_COURSES[i % DUMMY_COURSES.length];
  return {
    _id: makeId("l", i),
    title: `Lecture ${(i % 12) + 1}: ${LECTURE_TITLES[i % LECTURE_TITLES.length]}`,
    courseId: course._id,
    courseTitle: course.title,
    duration: 8 + (i % 25), // minutes
    videoId: "dQw4w9WgXcQ",
    videoStatus: i % 23 === 0 ? "broken" : "ok",
    createdAt: seededDate(250, i),
  };
});

// ── Quizzes ──────────────────────────────────────────────────────────────
export const DUMMY_QUIZZES = Array.from({ length: 20 }, (_, i) => {
  const course = DUMMY_COURSES[i % DUMMY_COURSES.length];
  const avgScore = 45 + ((i * 13) % 50);
  return {
    _id: makeId("q", i),
    title: `${course.title} — Quiz ${(i % 3) + 1}`,
    courseId: course._id,
    courseTitle: course.title,
    questionCount: 5 + (i % 10),
    totalTime: 10 + (i % 20),
    avgScore,
    avgTimeTaken: 8 + (i % 18),
    passRate: Math.min(95, avgScore + (i % 15)),
    attemptCount: 20 + ((i * 41) % 400),
    createdAt: seededDate(200, i),
  };
});

// ── Complaints ───────────────────────────────────────────────────────────
const COMPLAINT_SUBJECTS = [
  "Video not loading", "Certificate not received", "Double charge on subscription",
  "Quiz score not updating", "Login keeps failing", "Course content outdated",
  "Instructor not responding", "Refund request", "Broken lecture link", "Account locked",
];

export const DUMMY_COMPLAINTS = Array.from({ length: 26 }, (_, i) => {
  const user      = DUMMY_USERS[i % DUMMY_USERS.length];
  const statuses  = ["pending", "in progress", "resolved"];
  const status    = statuses[i % 3];
  const createdAt = seededDate(45, i);
  return {
    _id: makeId("cm", i),
    subject: COMPLAINT_SUBJECTS[i % COMPLAINT_SUBJECTS.length],
    description: "Detailed description of the issue, explaining exactly what went wrong and when.",
    userId: user._id,
    username: user.username,
    status,
    answer: status === "resolved" ? "This has been resolved — thank you for your patience." : "",
    createdAt,
    updatedAt: status === "resolved" ? seededDate(5, i) : createdAt,
  };
});

// ── Login history (DAU/WAU/MAU + trend data) ────────────────────────────
export const DUMMY_LOGIN_HISTORY = Array.from({ length: 400 }, (_, i) => {
  const user = DUMMY_USERS[i % DUMMY_USERS.length];
  return {
    _id: makeId("lh", i),
    userId: user._id,
    loginAt: seededDate(90, i),
    success: i % 17 !== 0,
  };
});
