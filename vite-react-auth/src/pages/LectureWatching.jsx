<<<<<<< Updated upstream
const LectureWatching = () => (
  <div>
    <h1>Lecture Watching</h1>
    <p>Your lecture content goes here.</p>
  </div>
);
export default LectureWatching;
=======
// Lectures.jsx
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom"; 
import api from "../services/api";
import { FiCheckCircle, FiCircle, FiClock, FiPlayCircle } from "react-icons/fi";
import "../styles/lectures.css";

const WATCH_THRESHOLD = 0.3;
const STORAGE_KEY = "academy_watched_lectures";

const loadWatched = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

const saveWatched = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

let ytApiLoaded = false;
const loadYTApi = () => {
  if (ytApiLoaded || window.YT) return;
  ytApiLoaded = true;
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
};

const formatDuration = (minutes) => {
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export default function Lectures() {
  const { courseId } = useParams();

  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLecture, setActiveLecture] = useState(null);
  const [watched, setWatched] = useState(loadWatched);
  const [progress, setProgress] = useState(0);

  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const markedRef = useRef({});

  // ── Fetch lectures ──────────────────────────────────────
  useEffect(() => {
    const fetchLectures = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/lectures/course/${courseId}`);
        const data = res.data;
        const lecturesData = data.data || [];
        const mapped = lecturesData.map((lec) => ({
          id: lec.id,
          title: lec.title,
          description: lec.description,
          duration: formatDuration(lec.duration),
          videoId: lec.videoId,
        }));"inWWhr5tnEA"
        setLectures(mapped);
        if (mapped.length > 0) setActiveLecture(mapped[0]);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) fetchLectures();
  }, [courseId]);

  // ── YouTube API ──────────────────────────────────────────
  useEffect(() => {
    loadYTApi();
    // If YT API is already loaded, ensure onYouTubeIframeAPIReady is set
    if (window.YT && window.YT.Player && !playerRef.current) {
      // Trigger player creation if activeLecture exists
      if (activeLecture) {
        // The other useEffect will handle this
      }
    }
  }, []);

  // ── Player (FIXED: autoplay + playVideo) ──────────────
  useEffect(() => {
    if (!activeLecture) return;

    clearInterval(intervalRef.current);
    setProgress(0);

    const createPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player("yt-player", {
        videoId: activeLecture.videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
          autoplay: 0,          
          controls: 1,
          mute: 0,              
        },
        events: {
          onReady: () => {
            startPolling();
            // Explicitly try to play (browser may still block, but we try)
            playerRef.current?.playVideo();
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) startPolling();
            if (
              e.data === window.YT.PlayerState.PAUSED ||
              e.data === window.YT.PlayerState.ENDED
            ) {
              clearInterval(intervalRef.current);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLecture?.id]);

  // ── Polling ──────────────────────────────────────────────
  const startPolling = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== "function") return;

      const current = player.getCurrentTime();
      const total = player.getDuration();
      if (!total || total === 0) return;

      const ratio = current / total;
      setProgress(Math.min(ratio * 100, 100));

      if (ratio >= WATCH_THRESHOLD && !markedRef.current[activeLecture.id]) {
        markedRef.current[activeLecture.id] = true;
        setWatched((prev) => {
          const updated = { ...prev, [activeLecture.id]: true };
          saveWatched(updated);
          return updated;
        });
      }
    }, 1000);
  };

  const handleSelect = (lecture) => {
    if (lecture.id === activeLecture?.id) return;
    setActiveLecture(lecture);
  };

  // ── Loading / Error ──────────────────────────────────────
  if (loading) {
    return <div className="lectures-page"><p>Loading lectures…</p></div>;
  }

  if (error) {
    return <div className="lectures-page"><p>Error: {error}</p></div>;
  }

  if (!lectures.length) {
    return <div className="lectures-page"><p>No lectures found for this course.</p></div>;
  }

  const watchedCount = Object.keys(watched).filter(id => watched[id]).length;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="lectures-page">
      <div className="lp-header">
        <div>
          <h1 className="lp-title">Lectures</h1>
          <p className="lp-subtitle">Watch at least 30% of a lecture to mark it complete.</p>
        </div>
        <div className="lp-progress-badge">
          <span className="lp-badge-count">{watchedCount}</span>
          <span className="lp-badge-label">/ {lectures.length} completed</span>
        </div>
      </div>

      <div className="lp-player-wrapper">
        <div className="lp-player-box">
          <div id="yt-player">
            {/* Fallback iframe while YT API loads or if it fails */}
            {activeLecture?.videoId && (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${activeLecture.videoId}?rel=0&modestbranding=1&autoplay=0&mute=0`}
                title={activeLecture.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
              />
            )}
          </div>
        </div>
        <div className="lp-bar-track">
          <div
            className={`lp-bar-fill ${watched[activeLecture.id] ? "watched" : ""}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="lp-player-meta">
          <div>
            <h2 className="lp-active-title">{activeLecture.title}</h2>
            <p className="lp-active-desc">{activeLecture.description}</p>
          </div>
          {watched[activeLecture.id] ? (
            <span className="lp-status-badge watched">
              <FiCheckCircle /> Watched
            </span>
          ) : (
            <span className="lp-status-badge pending">
              <FiPlayCircle /> In Progress
            </span>
          )}
        </div>
      </div>

      <div className="lp-list">
        <h3 className="lp-list-heading">All Lectures</h3>
        {lectures.map((lec, index) => {
          const isActive = lec.id === activeLecture.id;
          const isWatched = !!watched[lec.id];
          return (
            <button
              key={lec.id}
              className={`lp-card ${isActive ? "active" : ""} ${isWatched ? "done" : ""}`}
              onClick={() => handleSelect(lec)}
            >
              <div className="lp-card-num">{index + 1}</div>
              <div className="lp-card-body">
                <p className="lp-card-title">{lec.title}</p>
                <p className="lp-card-desc">{lec.description}</p>
              </div>
              <div className="lp-card-right">
                <span className="lp-card-duration">
                  <FiClock /> {lec.duration}
                </span>
                {isWatched ? (
                  <FiCheckCircle className="lp-check watched" />
                ) : (
                  <FiCircle className="lp-check pending" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
>>>>>>> Stashed changes
