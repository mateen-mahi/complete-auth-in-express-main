import Course from "../models/courses.model.js";
import Quiz from "../models/quiz.model.js";

// A quiz counts as "passed" toward course progress once scored at/above this.
// Keep in sync with PASS_THRESHOLD in QuizPage.jsx.
export const QUIZ_PASS_THRESHOLD = 70;

// Fixed weighting: lectures are always 60% of the bar, the quiz is always
// 40% — regardless of how many lectures exist, and regardless of how many
// quiz documents exist for the course. Every course in this system is
// expected to have exactly ONE grand quiz.
export const LECTURE_WEIGHT = 0.6;
export const QUIZ_WEIGHT = 0.4;

/**
 * Looks up everything needed to compute progress totals for a course:
 * the course doc (for title + lecture count) and how many quiz documents
 * exist for it. Both the lecture-watching and quiz-submitting controllers
 * call this same function, so they can never drift into different totals.
 *
 * IMPORTANT: this system is designed around exactly one quiz per course.
 * If Quiz.countDocuments({ courseId }) ever returns something other than
 * 0 or 1, that's a data problem (duplicate/orphaned quiz doc) — passing
 * "the" quiz would then only earn a fraction of the 40% quiz weight
 * instead of the full 40%. We log a warning so it's caught instead of
 * silently producing a wrong percentage.
 */
export async function getCourseTotals(courseId) {
  const [course, totalQuizzes] = await Promise.all([
    Course.findById(courseId).select("title lectures"),
    Quiz.countDocuments({ courseId }),
  ]);

  const totalLectures = course?.lectures?.length || 0;

  if (totalQuizzes > 1) {
    console.warn(
      `[progress] Course ${courseId} has ${totalQuizzes} Quiz documents — ` +
        `expected exactly 1 grand quiz. Passing one quiz will only earn ` +
        `1/${totalQuizzes} of the 40% quiz weight, not the full 40%. ` +
        `Check for duplicate/leftover Quiz docs for this course.`
    );
  }

  return { course, totalLectures, totalQuizzes };
}

/**
 * Recalculates overallProgress + completed using a fixed weighted split:
 *   60% of the bar = lecture-watch ratio (watchedLectures / totalLectures)
 *   40% of the bar = quiz-pass ratio    (passedQuizzes  / totalQuizzes)
 *
 * With exactly one quiz per course (the expected setup), quizRatio is
 * binary: 0 until the quiz is passed, then exactly 1 — so passing it
 * always contributes the full 40%, never a partial amount.
 *
 * If a course has no lectures, or no quizzes, all weight shifts to
 * whichever dimension actually exists so the bar can still reach 100%.
 *
 * Mutates progressDoc in place. Does NOT save — caller saves.
 * Returns true if this call is what just pushed the course to 100%.
 */
export function recalcOverallProgress(progressDoc, totalLectures, totalQuizzes) {
  const watchedLectures = progressDoc.lectures.filter((l) => l.watched).length;
  const passedQuizzes = progressDoc.quizzes.filter((q) => q.score >= QUIZ_PASS_THRESHOLD).length;

  // Clamp defensively — a ratio should never exceed 1 (e.g. if a lecture
  // somehow got recorded twice, or totalLectures shrank after the doc was
  // last touched), but if it ever did, we don't want the bar to overshoot
  // or the math below to produce something > 100 before the final clamp.
  const lectureRatio = totalLectures > 0 ? Math.min(1, watchedLectures / totalLectures) : null;
  const quizRatio = totalQuizzes > 0 ? Math.min(1, passedQuizzes / totalQuizzes) : null;

  let percent;
  if (lectureRatio !== null && quizRatio !== null) {
    percent = lectureRatio * LECTURE_WEIGHT * 100 + quizRatio * QUIZ_WEIGHT * 100;
  } else if (lectureRatio !== null) {
    percent = lectureRatio * 100; // course has no quizzes — lectures are 100% of the bar
  } else if (quizRatio !== null) {
    percent = quizRatio * 100; // course has no lectures — quiz is 100% of the bar
  } else {
    percent = 0; // course has neither yet
  }

  const wasCompleted = progressDoc.completed;

  progressDoc.overallProgress = Math.min(100, Math.max(0, Math.round(percent)));

  // "Completed" requires every dimension that actually exists on this
  // course to be fully done — not just the weighted percentage hitting
  // 100 (which it can't anyway unless both are done, but this is explicit).
  const lectureDone = lectureRatio === null || lectureRatio >= 1;
  const quizDone = quizRatio === null || quizRatio >= 1;
  progressDoc.completed = (lectureRatio !== null || quizRatio !== null) && lectureDone && quizDone;

  return !wasCompleted && progressDoc.completed;
}

/**
 * Finds a user's progress doc for a course, creating an empty one if it
 * doesn't exist yet. Keeps the unique (userId, courseId) index happy.
 */
export async function getOrCreateProgress(Progress, userId, courseId) {
  let progress = await Progress.findOne({ userId, courseId });
  if (!progress) {
    progress = await Progress.create({ userId, courseId, lectures: [], quizzes: [] });
  }
  return progress;
}