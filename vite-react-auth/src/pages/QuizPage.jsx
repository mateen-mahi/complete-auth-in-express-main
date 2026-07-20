import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import {
  FiClock,
  FiAward,
  FiChevronRight,
  FiChevronLeft,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";
import "../styles/QuizPage.css";

// ─── Dynamic Quiz Data ────────────────────────────────────

// ─── Helpers ───────────────────────────────────────────────
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const getScoreLabel = (percent) => {
  if (percent >= 90) return { label: "Excellent!", color: "score-excellent" };
  if (percent >= 70) return { label: "Good Job!", color: "score-good" };
  if (percent >= 50) return { label: "Keep Practicing", color: "score-average" };
  return { label: "Needs Improvement", color: "score-poor" };
};

// ─── Screens ───────────────────────────────────────────────
const SCREEN = { INTRO: "intro", QUIZ: "quiz", RESULT: "result" };

export default function GrandQuiz() {
  const { courseId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [screen, setScreen] = useState(SCREEN.INTRO);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: chosenIndex }
  const [selected, setSelected] = useState(null); // current question selection
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef(null);

  // ── Fetch quiz from backend ──────────────────────────────
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!courseId) {
        setFetchError("No course ID provided.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.get(`/quizzes/course/${courseId}`);
        const quizData = res.data?.data;
        if (Array.isArray(quizData) && quizData.length > 0) {
          // Use the first quiz for this course
          const q = quizData[0];
          // Map backend format to frontend format
          const mappedQuiz = {
            _id: q._id,
            title: q.title || "Untitled Quiz",
            subject: q.subject || "General",
            totalTime: (q.totalTime || 10) * 60, // minutes to seconds
            questions: (q.questions || []).map((question, idx) => ({
              id: idx + 1,
              question: question.question,
              options: question.options || [],
              correct: question.correct ?? 0,
            })),
          };
          setQuiz(mappedQuiz);
          setTimeLeft(mappedQuiz.totalTime);
        } else {
          setFetchError("No quizzes found for this course.");
        }
      } catch (err) {
        console.error("Fetch quiz error:", err.response?.data || err.message);
        setFetchError("Failed to load quiz. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [courseId]);

  const total = (quiz?.questions || []).length;
  const question = (quiz?.questions || [])[current];

  // ── Timer ────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== SCREEN.QUIZ) return;
    if (!question) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ── Restore saved answer when navigating ─────────────────
  useEffect(() => {
    setSelected(answers[question?.id] ?? null);
  }, [current, answers, question?.id]);

  const handleSelect = (idx) => {
    if (submitted) return;
    if (!question) return;
    setSelected(idx);
    setAnswers((prev) => ({ ...prev, [question?.id]: idx }));
  };

  const handleNext = () => {
    if (current < total - 1) setCurrent((c) => c + 1);
  };

  const handlePrev = () => {
    if (current > 0) setCurrent((c) => c - 1);
  };

  const handleSubmit = (auto = false) => {
    clearInterval(timerRef.current);
    setSubmitted(true);
    setScreen(SCREEN.RESULT);
  };

  const handleRestart = () => {
    setScreen(SCREEN.INTRO);
    setCurrent(0);
    setAnswers({});
    setSelected(null);
    setTimeLeft(quiz?.totalTime || 0);
    setSubmitted(false);
  };

  // ── Score calc ───────────────────────────────────────────
  const score = (quiz?.questions || []).reduce((acc, q) => {
    return answers[q?.id] === q?.correct ? acc + 1 : acc;
  }, 0);

  const percent = Math.round((score / total) * 100);
  const scoreInfo = getScoreLabel(percent);
  const answered = Object.keys(answers).length;
  const progress = ((current + 1) / total) * 100;
  const isLowTime = timeLeft <= 60;

  // ════════════════════════════════════════════════════════
  // LOADING / ERROR
  // ════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="gq-page">
        <div className="gq-intro-card">
          <div className="gq-intro-icon">
            <FiAward />
          </div>
          <p className="gq-intro-subtitle">Loading quiz…</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="gq-page">
        <div className="gq-intro-card">
          <div className="gq-intro-icon" style={{ color: "#ef4444" }}>
            <FiAlertCircle />
          </div>
          <p className="gq-intro-subtitle" style={{ color: "#ef4444" }}>{fetchError}</p>
        </div>
      </div>
    );
  }

  if (!quiz || total === 0) {
    return (
      <div className="gq-page">
        <div className="gq-intro-card">
          <div className="gq-intro-icon">
            <FiAward />
          </div>
          <p className="gq-intro-subtitle">No quiz available for this course.</p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // INTRO SCREEN
  // ════════════════════════════════════════════════════════
  if (screen === SCREEN.INTRO) {
    return (
      <div className="gq-page">
        <div className="gq-intro-card">
          <div className="gq-intro-icon">
            <FiAward />
          </div>
          <p className="gq-intro-subject">{quiz?.subject || ""}</p>
          <h1 className="gq-intro-title">{quiz?.title || "Quiz"}</h1>
          <p className="gq-intro-subtitle">Grand Quiz</p>

          <div className="gq-intro-stats">
            <div className="gq-stat">
              <span className="gq-stat-value">{total}</span>
              <span className="gq-stat-label">Questions</span>
            </div>
            <div className="gq-stat-divider" />
            <div className="gq-stat">
              <span className="gq-stat-value">{Math.floor((quiz?.totalTime || 0) / 60)}</span>
              <span className="gq-stat-label">Minutes</span>
            </div>
            <div className="gq-stat-divider" />
            <div className="gq-stat">
              <span className="gq-stat-value">1</span>
              <span className="gq-stat-label">Point each</span>
            </div>
          </div>

          <ul className="gq-rules">
            <li><FiCheckCircle className="gq-rule-icon" /> Each question has one correct answer.</li>
            <li><FiCheckCircle className="gq-rule-icon" /> You can navigate back and change answers.</li>
            <li><FiAlertCircle className="gq-rule-icon warn" /> Quiz auto-submits when time runs out.</li>
          </ul>

          <button className="gq-btn-start" onClick={() => setScreen(SCREEN.QUIZ)}>
            Start Quiz <FiChevronRight />
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // RESULT SCREEN
  // ════════════════════════════════════════════════════════
  if (screen === SCREEN.RESULT) {
    return (
      <div className="gq-page">
        <div className="gq-result-card">
          <div className={`gq-result-score ${scoreInfo.color}`}>
            <span className="gq-result-percent">{percent}%</span>
            <span className="gq-result-label">{scoreInfo.label}</span>
          </div>

          <div className="gq-result-stats">
            <div className="gq-rstat correct">
              <FiCheckCircle />
              <span>{score} Correct</span>
            </div>
            <div className="gq-rstat wrong">
              <FiXCircle />
              <span>{total - score} Wrong</span>
            </div>
          </div>

          <p className="gq-result-summary">
            You answered {score} out of {total} questions correctly.
          </p>

          {/* Answer Review */}
          <div className="gq-review">
            <h3 className="gq-review-heading">Review Answers</h3>
            {(quiz?.questions || []).map((q, i) => {
              const chosen = answers[q?.id];
              const isCorrect = chosen === q?.correct;
              const isSkipped = chosen === undefined;
              return (
                <div
                  key={q?.id || i}
                  className={`gq-review-item ${isCorrect ? "correct" : isSkipped ? "skipped" : "wrong"}`}
                >
                  <div className="gq-review-top">
                    <span className="gq-review-num">Q{i + 1}</span>
                    <p className="gq-review-q">{q.question}</p>
                    {isCorrect ? (
                      <FiCheckCircle className="gq-review-icon correct" />
                    ) : isSkipped ? (
                      <FiAlertCircle className="gq-review-icon skipped" />
                    ) : (
                      <FiXCircle className="gq-review-icon wrong" />
                    )}
                  </div>
                  {!isCorrect && (
                    <p className="gq-review-correct">
                      ✓ {q.options[q?.correct]}
                    </p>
                  )}
                  {!isCorrect && !isSkipped && (
                    <p className="gq-review-chosen">
                      ✗ {q?.options?.[chosen]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button className="gq-btn-restart" onClick={handleRestart}>
            <FiRefreshCw /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // QUIZ SCREEN
  // ════════════════════════════════════════════════════════
  return (
    <div className="gq-page">
      <div className="gq-quiz-card">

        {/* ── Top Bar ── */}
        <div className="gq-topbar">
          <div className="gq-topbar-left">
            <span className="gq-q-counter">
              Question <strong>{current + 1}</strong> / {total}
            </span>
            <span className="gq-answered-count">
              {answered} answered
            </span>
          </div>
          <div className={`gq-timer ${isLowTime ? "low" : ""}`}>
            <FiClock />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* ── Progress Bar ── */}
        <div className="gq-progress-track">
          <div className="gq-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* ── Question ── */}
        <div className="gq-question-area">
          {!question ? (
            <p className="gq-question-text">Loading question…</p>
          ) : (
            <>
          <p className="gq-question-text">{question?.question}</p>

          <div className="gq-options">
            {question?.options?.map((opt, idx) => (
              <button
                key={idx}
                className={`gq-option ${selected === idx ? "selected" : ""}`}
                onClick={() => handleSelect(idx)}
              >
                <span className="gq-option-letter">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="gq-option-text">{opt}</span>
                {selected === idx && (
                  <FiCheckCircle className="gq-option-check" />
                )}
              </button>
            ))}
          </div>
            </>
          )}
        </div>

        {/* ── Question Dots ── */}
        <div className="gq-dots">
          {(quiz?.questions || []).map((q, i) => (
            q ? (
            <button
              key={q?.id || i}
              className={`gq-dot ${i === current ? "active" : ""} ${answers[q?.id] !== undefined ? "done" : ""}`}
              onClick={() => setCurrent(i)}
              title={`Question ${i + 1}`}
            />
            ) : null
          ))}
        </div>

        {/* ── Navigation ── */}
        <div className="gq-nav">
          <button
            className="gq-btn-nav"
            onClick={handlePrev}
            disabled={current === 0}
          >
            <FiChevronLeft /> Previous
          </button>

          {current < total - 1 ? (
            <button className="gq-btn-nav primary" onClick={handleNext}>
              Next <FiChevronRight />
            </button>
          ) : (
            <button
              className="gq-btn-submit"
              onClick={() => handleSubmit(false)}
            >
              Submit Quiz <FiAward />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}