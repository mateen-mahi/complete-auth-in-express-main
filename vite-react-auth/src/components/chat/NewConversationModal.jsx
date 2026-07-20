// src/components/chat/NewConversationModal.jsx
import { useState, useEffect, useRef } from "react";
import { FiX, FiSearch, FiRefreshCw } from "react-icons/fi";
import api from "../../services/api";
import { AvatarWithPresence } from "./ChatAvatar";

/**
 * Full platform-wide user search — this is what /users/all-users search
 * used to power directly inside the sidebar. Moved here so the sidebar's
 * own search bar can be simplified to a local filter over existing chats.
 */
export default function NewConversationModal({ currentUserId, onlineUserIds, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get("/users/all-users");
        const allUsers = res.data.users || [];
        const matches = allUsers.filter(
          (u) => u._id !== currentUserId && u.username.toLowerCase().includes(query.toLowerCase())
        );
        setResults(matches.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, currentUserId]);

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-header">
          <h3>New conversation</h3>
          <button className="chat-modal-close" onClick={onClose}><FiX /></button>
        </div>

        <div className="dm-search-wrap chat-modal-search-wrap">
          <FiSearch className="dm-search-icon" />
          <input
            className="dm-search"
            placeholder="Search by username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="chat-modal-results">
          {searching && (
            <div className="dm-searching"><FiRefreshCw className="cp-spin" /> Searching…</div>
          )}
          {!searching && query && results.length === 0 && (
            <p className="dm-no-results">No users found.</p>
          )}
          {!searching && !query && (
            <p className="dm-no-results">Start typing a username to find someone.</p>
          )}
          {results.map((u) => (
            <button key={u._id} className="dm-result-item" onClick={() => onSelect(u)}>
              <AvatarWithPresence
                src={u.imageUrl}
                name={u.username}
                className="dm-result-avatar"
                online={onlineUserIds.has(u._id)}
              />
              <div className="dm-result-info">
                <p className="dm-result-name">{u.username}</p>
                <p className="dm-result-role">{u.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
