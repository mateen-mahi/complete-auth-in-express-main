import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  FiSend, FiSearch, FiGlobe, FiMessageCircle, FiPlus,
  FiX, FiAlertCircle, FiRefreshCw, FiChevronsUp, FiCheckCircle,
} from "react-icons/fi";
import { formatTime, formatDay, groupByDay, getLastMessagePreview, sortContactsByRecency, DELETED_TEXT } from "../utils/chatHelpers";
import { Avatar, AvatarWithPresence } from "../components/chat/ChatAvatar";
import NewConversationModal from "../components/chat/NewConversationModal";
import "../styles/chat.css";

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function MessageBubble({ message, currentUserId, showName = true, showSeen = false }) {
  const isOwn = message.senderId === currentUserId;

  return (
    <div className={`chat-message ${isOwn ? "own" : "other"}`}>
      {!isOwn && <Avatar src={message.senderImageUrl} name={message.sender} className="chat-msg-avatar" />}
      <div className="chat-bubble-wrap">
        {!isOwn && showName && <p className="chat-sender-name">{message.sender}</p>}
        <div className={`chat-bubble ${isOwn ? "own" : "other"}`}>{message.text}</div>
        <p className={`chat-timestamp ${isOwn ? "own" : ""}`}>{formatTime(message.timestamp)}</p>
        {showSeen && <p className="chat-seen-label"><FiCheckCircle /> Seen</p>}
      </div>
    </div>
  );
}

function DaySeparator({ label }) {
  return <div className="chat-day-sep"><span>{label}</span></div>;
}

function InputBar({ value, onChange, onSend, placeholder, disabled }) {
  return (
    <div className="chat-input-bar">
      <input
        className="chat-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !disabled && onSend()}
        disabled={disabled}
      />
      <button className="chat-send-btn" onClick={onSend} disabled={disabled || !value.trim()} title="Send">
        <FiSend />
      </button>
    </div>
  );
}

function LoadingState({ text = "Loading…" }) {
  return (
    <div className="chat-empty-state">
      <FiRefreshCw className="chat-empty-icon cp-spin" />
      <p className="chat-empty-sub">{text}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL CHAT (unchanged from before)
// ═══════════════════════════════════════════════════════════════════════════

function GlobalChat({ user, emitEvent, onEvent, isConnected }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const oldestTimestamp = useRef(null);
  const processedIds = useRef(new Set());
  const messageCounter = useRef(0);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const previousMessageCount = useRef(0);

  const loadHistory = useCallback(async (before = null) => {
    try {
      const params = { limit: 30 };
      if (before) params.before = before;
      const response = await api.get("/messages/global", { params });
      const fetchedMessages = response.data.messages || [];
      fetchedMessages.forEach((msg) => processedIds.current.add(msg.id));

      if (before) {
        const container = messagesContainerRef.current;
        const previousScrollHeight = container?.scrollHeight || 0;
        setMessages((prev) => [...fetchedMessages, ...prev]);
        requestAnimationFrame(() => {
          if (container) container.scrollTop = container.scrollHeight - previousScrollHeight;
        });
      } else {
        setMessages(fetchedMessages);
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView());
      }

      setHasMoreHistory(response.data.hasMore);
      if (fetchedMessages.length > 0) oldestTimestamp.current = fetchedMessages[0].timestamp;
    } catch (error) {
      console.error("Failed to load global history:", error);
    }
  }, []);

  useEffect(() => {
    setIsLoadingHistory(true);
    loadHistory().finally(() => setIsLoadingHistory(false));
  }, [loadHistory]);

  useEffect(() => {
    if (messages.length > previousMessageCount.current) {
      const addedCount = messages.length - previousMessageCount.current;
      const container = messagesContainerRef.current;
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < 120 || addedCount === 1) {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
    previousMessageCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    const cleanup = onEvent("receive-global-message", (msg) => {
      if (processedIds.current.has(msg.id)) return;
      processedIds.current.add(msg.id);
      setMessages((prev) => [...prev, msg]);
    });
    return cleanup;
  }, [onEvent]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !isConnected) return;
    const id = `global-${Date.now()}-${messageCounter.current++}`;
    const message = {
      id,
      text: input.trim(),
      sender: user.username,
      senderId: user._id,
      senderImageUrl: user.imageUrl || null,
      timestamp: new Date().toISOString(),
    };
    processedIds.current.add(id);
    emitEvent("global-message", message);
    setMessages((prev) => [...prev, message]);
    setInput("");
  }, [input, isConnected, user, emitEvent]);

  const handleLoadMore = async () => {
    if (!oldestTimestamp.current || isLoadingMore) return;
    setIsLoadingMore(true);
    await loadHistory(oldestTimestamp.current);
    setIsLoadingMore(false);
  };

  const groupedMessages = groupByDay(messages);

  return (
    <div className="chat-window">
      <div className="chat-messages" ref={messagesContainerRef}>
        {hasMoreHistory && (
          <button className="chat-load-more" onClick={handleLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? <><FiRefreshCw className="cp-spin" /> Loading…</> : <><FiChevronsUp /> Load earlier messages</>}
          </button>
        )}

        {isLoadingHistory ? (
          <LoadingState text="Loading messages…" />
        ) : messages.length === 0 ? (
          <div className="chat-empty-state">
            <FiGlobe className="chat-empty-icon" />
            <p className="chat-empty-title">Global Chat</p>
            <p className="chat-empty-sub">Messages here are broadcast to every connected user.</p>
          </div>
        ) : (
          groupedMessages.map((item) =>
            item.type === "separator" ? (
              <DaySeparator key={item.key} label={item.label} />
            ) : (
              <MessageBubble key={item.key} message={item.data} currentUserId={user._id} showName />
            )
          )
        )}
        <div ref={bottomRef} />
      </div>

      <InputBar
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        placeholder={isConnected ? "Broadcast a message to everyone…" : "Connecting…"}
        disabled={!isConnected}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DIRECT MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

function DirectChat({ user, emitEvent, onEvent, isConnected, onlineUserIds, isActive }) {
  const [contacts, setContacts] = useState({});
  const [conversations, setConversations] = useState({});
  const [selectedContactId, setSelectedContactId] = useState(null);

  // Sidebar search now just FILTERS existing recent chats — no API call
  const [sidebarFilter, setSidebarFilter] = useState("");
  const [showNewConvModal, setShowNewConvModal] = useState(false);

  const [loadingConversations, setLoadingConversations] = useState(true);

  const [input, setInput] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingContactId, setTypingContactId] = useState(null);
  const [seenUpTo, setSeenUpTo] = useState({});

  const [conversationMeta, setConversationMeta] = useState({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const historyLoadedFor = useRef(new Set());
  const processedIds = useRef(new Set());
  const messageCounter = useRef(0);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingEmitTimeoutRef = useRef(null);
  const typingClearTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const selectedContactIdRef = useRef(selectedContactId);
  useEffect(() => { selectedContactIdRef.current = selectedContactId; }, [selectedContactId]);

  const isActiveRef = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // ── NEW: load recent conversations on mount — this is what fixes
  // "messages I got while offline don't show up" ──
  useEffect(() => {
    const fetchRecentConversations = async () => {
      setLoadingConversations(true);
      try {
        const res = await api.get("/messages/conversations");
        const list = res.data.conversations || [];
        const contactMap = {};
        list.forEach((c) => { contactMap[c._id] = c; });
        setContacts(contactMap);
      } catch (err) {
        console.error("Failed to load recent conversations:", err);
      } finally {
        setLoadingConversations(false);
      }
    };
    fetchRecentConversations();
  }, []);

  const loadDMHistory = useCallback(async (contactId, before = null) => {
    try {
      const params = { limit: 30 };
      if (before) params.before = before;
      const response = await api.get(`/messages/dm/${contactId}`, { params });
      const fetchedMessages = response.data.messages || [];
      fetchedMessages.forEach((msg) => processedIds.current.add(msg.id));

      if (before) {
        const container = messagesContainerRef.current;
        const previousScrollHeight = container?.scrollHeight || 0;
        setConversations((prev) => ({ ...prev, [contactId]: [...fetchedMessages, ...(prev[contactId] || [])] }));
        requestAnimationFrame(() => {
          if (container) container.scrollTop = container.scrollHeight - previousScrollHeight;
        });
      } else {
        setConversations((prev) => ({ ...prev, [contactId]: fetchedMessages }));
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView());
      }

      setConversationMeta((prev) => ({
        ...prev,
        [contactId]: {
          hasMore: response.data.hasMore,
          oldestTimestamp: fetchedMessages.length > 0 ? fetchedMessages[0].timestamp : prev[contactId]?.oldestTimestamp || null,
        },
      }));
    } catch (error) {
      console.error("Failed to load DM history:", error);
    }
  }, []);

  useEffect(() => {
    if (!selectedContactId || historyLoadedFor.current.has(selectedContactId)) return;
    historyLoadedFor.current.add(selectedContactId);
    setIsLoadingHistory(true);
    loadDMHistory(selectedContactId).finally(() => setIsLoadingHistory(false));
  }, [selectedContactId, loadDMHistory]);

  useEffect(() => {
    if (!selectedContactId) return;
    const messages = conversations[selectedContactId];
    if (!messages?.length) return;
    const container = messagesContainerRef.current;
    if (container) {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom < 120) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations, selectedContactId]);

  useEffect(() => {
    const cleanup = onEvent("receive-direct-message", (msg) => {
      if (processedIds.current.has(msg.id)) return;
      processedIds.current.add(msg.id);

      const isOwn = msg.senderId === user._id;
      const conversationKey = isOwn ? msg.toUserId : msg.senderId;
      const newContactInfo = isOwn
        ? { _id: msg.toUserId, username: msg.toUsername || "User", role: "", imageUrl: null }
        : { _id: msg.senderId, username: msg.sender || "User", role: "", imageUrl: msg.senderImageUrl || null };

      setContacts((prev) => ({
        ...prev,
        [conversationKey]: {
          ...(prev[conversationKey] || newContactInfo),
          imageUrl: newContactInfo.imageUrl ?? prev[conversationKey]?.imageUrl ?? null,
          // Keep the sidebar preview fresh even for a conversation that
          // hasn't been opened yet (so conversations[] isn't populated)
          lastMessageText: msg.text,
          lastMessageAt: msg.timestamp,
          lastMessageIsOwn: isOwn,
        },
      }));

      setConversations((prev) => ({ ...prev, [conversationKey]: [...(prev[conversationKey] || []), msg] }));

      if (!isOwn) {
        const isCurrentlyViewing = isActiveRef.current && selectedContactIdRef.current === conversationKey;
        if (isCurrentlyViewing) {
          emitEvent("dm-seen", { toUserId: conversationKey });
        } else {
          setUnreadCounts((prev) => ({ ...prev, [conversationKey]: (prev[conversationKey] || 0) + 1 }));
        }
      }
    });
    return cleanup;
  }, [onEvent, user._id, emitEvent]);

  useEffect(() => {
    const cleanup = onEvent("dm-user-typing", ({ fromUserId, isTyping }) => {
      if (fromUserId !== selectedContactIdRef.current) return;
      setTypingContactId(isTyping ? fromUserId : null);
      clearTimeout(typingClearTimeoutRef.current);
      if (isTyping) typingClearTimeoutRef.current = setTimeout(() => setTypingContactId(null), 4000);
    });
    return cleanup;
  }, [onEvent]);

  useEffect(() => { setTypingContactId(null); }, [selectedContactId]);

  useEffect(() => {
    const cleanup = onEvent("dm-messages-seen", ({ byUserId, seenAt }) => {
      setSeenUpTo((prev) => ({ ...prev, [byUserId]: seenAt }));
    });
    return cleanup;
  }, [onEvent]);

  useEffect(() => {
    if (isActive && selectedContactId) {
      setUnreadCounts((prev) => ({ ...prev, [selectedContactId]: 0 }));
      emitEvent("dm-seen", { toUserId: selectedContactId });
    }
  }, [isActive, selectedContactId, emitEvent]);

  useEffect(() => {
    const cleanup = onEvent("message-deleted", ({ chatType, messageId, scope }) => {
      if (chatType !== "dm") return;
      setConversations((prev) => {
        let changed = false;
        const next = {};
        for (const [key, msgs] of Object.entries(prev)) {
          const idx = msgs.findIndex((m) => m.id === messageId);
          if (idx === -1) { next[key] = msgs; continue; }
          changed = true;
          next[key] = scope === "me"
            ? msgs.filter((m) => m.id !== messageId)
            : msgs.map((m) => (m.id === messageId ? { ...m, deletedForEveryone: true, text: DELETED_TEXT } : m));
        }
        return changed ? next : prev;
      });
    });
    return cleanup;
  }, [onEvent]);

  useEffect(() => {
    const cleanup = onEvent("conversation-cleared", ({ chatType, otherUserId, scope }) => {
      if (chatType !== "dm") return;
      setConversations((prev) => {
        if (!prev[otherUserId]) return prev;
        return {
          ...prev,
          [otherUserId]: scope === "me" ? [] : prev[otherUserId].map((m) => ({ ...m, deletedForEveryone: true, text: DELETED_TEXT })),
        };
      });
    });
    return cleanup;
  }, [onEvent]);

  // ── NEW: sidebar search is now a pure local filter, no API call ──
  const filteredContacts = sortContactsByRecency(contacts, conversations, user._id).filter(
    (c) => !sidebarFilter.trim() || c.username.toLowerCase().includes(sidebarFilter.toLowerCase())
  );

  const selectContact = (contact) => {
    setContacts((prev) => ({ ...prev, [contact._id]: { ...(prev[contact._id] || {}), ...contact } }));
    if (!conversations[contact._id]) setConversations((prev) => ({ ...prev, [contact._id]: [] }));
    setSelectedContactId(contact._id);
    setShowNewConvModal(false);
  };

  const handleInputChange = (val) => {
    setInput(val);
    if (!selectedContactId || !isConnected) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitEvent("dm-typing", { toUserId: selectedContactId, isTyping: true });
    }
    clearTimeout(typingEmitTimeoutRef.current);
    typingEmitTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitEvent("dm-typing", { toUserId: selectedContactId, isTyping: false });
    }, 2000);
  };

  const sendDirectMessage = useCallback(() => {
    if (!input.trim() || !selectedContactId || !isConnected) return;
    clearTimeout(typingEmitTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitEvent("dm-typing", { toUserId: selectedContactId, isTyping: false });
    }

    const id = `dm-${Date.now()}-${messageCounter.current++}`;
    const message = {
      id,
      text: input.trim(),
      sender: user.username,
      senderId: user._id,
      senderImageUrl: user.imageUrl || null,
      toUserId: selectedContactId,
      toUsername: contacts[selectedContactId]?.username || "",
      timestamp: new Date().toISOString(),
    };

    processedIds.current.add(id);
    emitEvent("direct-message", { toUserId: selectedContactId, messageData: message });
    setConversations((prev) => ({ ...prev, [selectedContactId]: [...(prev[selectedContactId] || []), message] }));
    setContacts((prev) => ({
      ...prev,
      [selectedContactId]: { ...prev[selectedContactId], lastMessageText: message.text, lastMessageAt: message.timestamp, lastMessageIsOwn: true },
    }));
    setInput("");
  }, [input, selectedContactId, isConnected, user, contacts, emitEvent]);

  const handleLoadMore = async () => {
    const meta = conversationMeta[selectedContactId];
    if (!meta?.oldestTimestamp || isLoadingMore) return;
    setIsLoadingMore(true);
    await loadDMHistory(selectedContactId, meta.oldestTimestamp);
    setIsLoadingMore(false);
  };

  const selectedContact = selectedContactId ? contacts[selectedContactId] : null;
  const currentMessages = selectedContactId ? conversations[selectedContactId] || [] : [];
  const currentMeta = selectedContactId ? conversationMeta[selectedContactId] : null;
  const groupedMessages = groupByDay(currentMessages);
  const isContactTyping = typingContactId === selectedContactId;

  const lastMessage = currentMessages[currentMessages.length - 1];
  const lastMessageIsSeen =
    lastMessage &&
    lastMessage.senderId === user._id &&
    selectedContactId &&
    seenUpTo[selectedContactId] &&
    new Date(lastMessage.timestamp) <= new Date(seenUpTo[selectedContactId]);

  return (
    <div className="dm-layout">
      <div className="dm-sidebar">
        <div className="dm-sidebar-toolbar">
          <div className="dm-search-wrap dm-sidebar-search">
            <FiSearch className="dm-search-icon" />
            <input
              className="dm-search"
              placeholder="Search recent chats…"
              value={sidebarFilter}
              onChange={(e) => setSidebarFilter(e.target.value)}
            />
            {sidebarFilter && (
              <button className="dm-clear-btn" onClick={() => setSidebarFilter("")}><FiX /></button>
            )}
          </div>
          <button className="dm-new-conv-btn" title="New conversation" onClick={() => setShowNewConvModal(true)}>
            <FiPlus />
          </button>
        </div>

        <div className="dm-conv-list">
          {loadingConversations ? (
            <div className="dm-searching"><FiRefreshCw className="cp-spin" /> Loading recent chats…</div>
          ) : filteredContacts.length === 0 ? (
            <p className="dm-conv-empty">
              {sidebarFilter
                ? "No matching conversations."
                : <>No conversations yet. Tap <FiPlus style={{ verticalAlign: "middle" }} /> to message someone.</>}
            </p>
          ) : (
            filteredContacts.map((contact) => {
              const preview = getLastMessagePreview(contact, conversations, user._id);
              const isActiveItem = selectedContactId === contact._id;
              const unread = unreadCounts[contact._id] || 0;
              return (
                <button
                  key={contact._id}
                  className={`dm-conv-item ${isActiveItem ? "active" : ""}`}
                  onClick={() => selectContact(contact)}
                >
                  <AvatarWithPresence
                    src={contact.imageUrl}
                    name={contact.username}
                    className="dm-conv-avatar"
                    online={onlineUserIds.has(contact._id)}
                  />
                  <div className="dm-conv-info">
                    <div className="dm-conv-row">
                      <p className={`dm-conv-name ${unread > 0 ? "unread" : ""}`}>{contact.username}</p>
                      {preview && <span className="dm-conv-time">{formatTime(preview.timestamp)}</span>}
                    </div>
                    {preview && (
                      <p className={`dm-conv-preview ${unread > 0 ? "unread" : ""}`}>
                        {preview.isOwn ? "You: " : ""}{preview.text}
                      </p>
                    )}
                  </div>
                  {unread > 0 && <span className="dm-unread-badge">{unread > 9 ? "9+" : unread}</span>}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="dm-chat-panel">
        {!selectedContact ? (
          <div className="chat-empty-state">
            <FiMessageCircle className="chat-empty-icon" />
            <p className="chat-empty-title">Direct Messages</p>
            <p className="chat-empty-sub">Select a conversation, or tap + to find someone new.</p>
          </div>
        ) : (
          <>
            <div className="dm-chat-header">
              <AvatarWithPresence
                src={selectedContact.imageUrl}
                name={selectedContact.username}
                className="dm-chat-avatar"
                online={onlineUserIds.has(selectedContact._id)}
              />
              <div>
                <p className="dm-chat-name">{selectedContact.username}</p>
                {isContactTyping ? (
                  <p className="dm-typing-indicator">typing…</p>
                ) : (
                  <p className="dm-chat-role">{onlineUserIds.has(selectedContact._id) ? "Online" : "Offline"}</p>
                )}
              </div>
            </div>

            <div className="chat-messages" ref={messagesContainerRef}>
              {currentMeta?.hasMore && (
                <button className="chat-load-more" onClick={handleLoadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? <><FiRefreshCw className="cp-spin" /> Loading…</> : <><FiChevronsUp /> Load earlier messages</>}
                </button>
              )}

              {isLoadingHistory ? (
                <LoadingState text="Loading conversation…" />
              ) : currentMessages.length === 0 ? (
                <div className="chat-empty-state">
                  <FiMessageCircle className="chat-empty-icon small" />
                  <p className="chat-empty-sub">No messages yet — say hi to {selectedContact.username}!</p>
                </div>
              ) : (
                groupedMessages.map((item) =>
                  item.type === "separator" ? (
                    <DaySeparator key={item.key} label={item.label} />
                  ) : (
                    <MessageBubble
                      key={item.key}
                      message={item.data}
                      currentUserId={user._id}
                      showName={false}
                      showSeen={lastMessageIsSeen && item.data.id === lastMessage?.id}
                    />
                  )
                )
              )}
              <div ref={bottomRef} />
            </div>

            <InputBar
              value={input}
              onChange={handleInputChange}
              onSend={sendDirectMessage}
              placeholder={`Message ${selectedContact.username}…`}
              disabled={!isConnected}
            />
          </>
        )}
      </div>

      {showNewConvModal && (
        <NewConversationModal
          currentUserId={user._id}
          onlineUserIds={onlineUserIds}
          onSelect={selectContact}
          onClose={() => setShowNewConvModal(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CHAT PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function Chat() {
  const { user, loading, isConnected, socketId, connectionError, emitEvent, onEvent, onlineUserIds } = useAuth();
  const [activeTab, setActiveTab] = useState("global");

  if (loading) {
    return (
      <div className="chat-page">
        <div className="chat-empty-state">
          <FiRefreshCw className="chat-empty-icon cp-spin" />
          <p className="chat-empty-sub">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="chat-page">
        <div className="chat-empty-state">
          <FiAlertCircle className="chat-empty-icon" />
          <p className="chat-empty-title">Not authenticated</p>
          <p className="chat-empty-sub">Please log in to use the chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <div>
          <h1 className="chat-page-title">Chat</h1>
          <p className="chat-page-sub">{isConnected ? `Connected · ${socketId?.slice(0, 10)}…` : "Connecting to server…"}</p>
        </div>
        <span className={`chat-connection-badge ${isConnected ? "online" : "offline"}`}>
          <span className="chat-badge-dot" />
          {isConnected ? "Online" : "Offline"}
        </span>
      </div>

      {connectionError && <div className="chat-error-bar"><FiAlertCircle /> {connectionError}</div>}

      <div className="chat-tabs">
        <button className={`chat-tab ${activeTab === "global" ? "active" : ""}`} onClick={() => setActiveTab("global")}>
          <FiGlobe /> Global Chat
        </button>
        <button className={`chat-tab ${activeTab === "dm" ? "active" : ""}`} onClick={() => setActiveTab("dm")}>
          <FiMessageCircle /> Direct Messages
        </button>
      </div>

      <div className="chat-content">
        {activeTab === "global" ? (
          <GlobalChat user={user} emitEvent={emitEvent} onEvent={onEvent} isConnected={isConnected} />
        ) : (
          <DirectChat
            user={user}
            emitEvent={emitEvent}
            onEvent={onEvent}
            isConnected={isConnected}
            onlineUserIds={onlineUserIds}
            isActive={activeTab === "dm"}
          />
        )}
      </div>
    </div>
  );
}