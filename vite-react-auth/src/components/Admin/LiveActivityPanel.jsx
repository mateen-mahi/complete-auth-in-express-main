// src/components/admin/LiveActivityPanel.jsx
import { FiWifi, FiWifiOff, FiActivity, FiUsers } from "react-icons/fi";
import { useAdminSocket } from "../../custom-hooks/useAdminSocket";

// Fully real now — no more piggybacking on the global chat feed. Every item
// here comes from an actual controller emitting via services/adminEvents.js.
export default function LiveActivityPanel() {
  const { isAdminConnected, onlineAdmins, feed } = useAdminSocket();

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Live Activity</h2>
        <span className={`admin-connection-pill ${isAdminConnected ? "online" : "offline"}`}>
          {isAdminConnected ? <FiWifi /> : <FiWifiOff />}
          {isAdminConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="admin-live-grid">
        <div className="admin-live-stat">
          <FiUsers className="admin-live-stat-icon" />
          <div>
            <p className="admin-live-stat-value">{onlineAdmins}</p>
            <p className="admin-live-stat-label">Admins watching this dashboard</p>
          </div>
        </div>
      </div>

      <div className="admin-activity-feed">
        {feed.length === 0 ? (
          <div className="admin-feed-empty">
            <FiActivity />
            <p>Live events will appear here as they happen — new signups, courses, enrollments, and complaints.</p>
          </div>
        ) : (
          feed.map((item) => (
            <div key={item.id} className="admin-feed-item">
              <span className="admin-feed-dot" />
              <p className="admin-feed-text">{item.text}</p>
              <span className="admin-feed-time">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
