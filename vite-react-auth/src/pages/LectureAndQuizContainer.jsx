
import { useState } from "react";
import GrandQuiz from "./QuizPage";     
import LecturePage from "./LectureWatching"; 
import "../styles/LectureAndQuizContainer.css";

export default function Container() {
  const [activeView, setActiveView] = useState("lecture");

  return (
    <div className="container">
      {/* Navigation Tabs */}
      <nav className="container-nav">   
        <button
          className={activeView === "lecture" ? "active" : ""}
          onClick={() => setActiveView("lecture")}
        >
          📘 Lecture
        </button>
        <button
          className={activeView === "quiz" ? "active" : ""}
          onClick={() => setActiveView("quiz")}
        >
          🧠 Quiz
        </button>
      </nav>

      {/* Content Area */}
      <div className="container-content">
        {activeView === "lecture" ? <LecturePage /> : <GrandQuiz />}
      </div>
    </div>
  );
}