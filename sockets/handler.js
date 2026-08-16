// socket/handlers.js
import { globalMessageBuffer, directMessageBuffer } from "../service/messageBuffer.js";

// Enumerates unique userIds currently connected — a user can have multiple
// sockets open (multiple tabs/devices), so this dedupes to real "who's online".
function getOnlineUserIds(io) {
  const ids = new Set();
  for (const [, s] of io.sockets.sockets) {
    if (s.userId) ids.add(s.userId);
  }
  return Array.from(ids);
}

export const registerSocketHandlers = (io, socket) => {

  // ── Presence: announce online + send a snapshot to the new connection ──
  // Broadcasting "user-online" here only reaches clients ALREADY connected.
  // A client that connects later needs the "online-users" snapshot below
  // instead — this is why presence tracking lives in useSocket.js on the
  // frontend (registered once at app boot), not inside a specific page.
  io.emit("user-online", { userId: socket.userId });
  socket.emit("online-users", { userIds: getOnlineUserIds(io) });

  // ── Join a course/lecture room ──────────────────────────────────────────
  socket.on("join-room", (roomId) => {
    if (!roomId) return;
    socket.join(roomId);
  });

  socket.on("leave-room", (roomId) => {
    if (!roomId) return;
    socket.leave(roomId);
  });

  // ── Room message (course/lecture chat) ──────────────────────────────────
  socket.on("room-message", ({ roomId, messageData }) => {
    if (!roomId || !messageData) return;
    const enriched = {
      ...messageData,
      id:        messageData.id || `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId:  socket.userId,
      timestamp: new Date().toISOString(),
    };
    io.to(roomId).emit("receive-room-message", enriched);
  });

  // ── Global message ──────────────────────────────────────────────────────
  socket.on("global-message", (messageData) => {
    if (!messageData?.text) return;
    const timestamp = new Date();

    const enriched = {
      ...messageData, // includes senderImageUrl if the client sent it
      id:        messageData.id || `global-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId:  socket.userId,
      timestamp: timestamp.toISOString(),
    };

    io.emit("receive-global-message", enriched);

    globalMessageBuffer.add({
      id:             enriched.id,
      text:           enriched.text,
      sender:         enriched.sender,
      senderId:       socket.userId,
      senderImageUrl: enriched.senderImageUrl || null,
      timestamp,
    });
  });

  // ── Direct message ──────────────────────────────────────────────────────
  socket.on("direct-message", ({ toUserId, messageData }) => {
    if (!toUserId || !messageData?.text) return;
    const timestamp = new Date();

    const enriched = {
      ...messageData,
      id:        messageData.id || `dm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId:  socket.userId,
      toUserId:  String(toUserId),
      timestamp: timestamp.toISOString(),
    };

    io.to(String(toUserId)).emit("receive-direct-message", enriched);
    io.to(String(socket.userId)).emit("receive-direct-message", enriched);

    directMessageBuffer.add({
      id:             enriched.id,
      text:           enriched.text,
      sender:         enriched.sender,
      senderId:       socket.userId,
      senderImageUrl: enriched.senderImageUrl || null,
      toUserId:       String(toUserId),
      toUsername:     enriched.toUsername || "",
      timestamp,
    });
  });

  // ── DM typing indicator ─────────────────────────────────────────────────
  // Client emits: { toUserId, isTyping: true/false }
  socket.on("dm-typing", ({ toUserId, isTyping }) => {
    if (!toUserId) return;
    io.to(String(toUserId)).emit("dm-user-typing", {
      fromUserId: socket.userId,
      isTyping: Boolean(isTyping),
    });
  });

  // ── DM seen receipt ──────────────────────────────────────────────────────
  // Client emits this when it opens/is actively viewing a conversation with
  // toUserId — tells toUserId "everything you sent me has now been seen".
  socket.on("dm-seen", ({ toUserId }) => {
    if (!toUserId) return;
    io.to(String(toUserId)).emit("dm-messages-seen", {
      byUserId: socket.userId,
      seenAt: new Date().toISOString(),
    });
  });

  // ── Room typing (existing course/lecture typing indicator) ─────────────
  socket.on("typing", ({ roomId, isTyping }) => {
    if (!roomId) return;
    socket.to(roomId).emit("user-typing", {
      userId: socket.userId,
      isTyping: Boolean(isTyping),
      timestamp: new Date().toISOString(),
    });
  });

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    console.log(`❌ Socket disconnected: ${socket.id} (User: ${socket.userId}) — ${reason}`);

    // By the time this fires, THIS socket is already removed from
    // io.sockets.sockets — so if the user has no other tabs/devices
    // connected, they'll be absent from getOnlineUserIds() here, and we
    // correctly announce them offline. If another tab is still open,
    // they're still in the list and we correctly stay silent.
    const stillConnected = getOnlineUserIds(io).includes(socket.userId);
    if (!stillConnected) {
      io.emit("user-offline", { userId: socket.userId });
    }
  });

  // ── Delete message ───────────────────────────────────────────────────────
  // Client calls this AFTER the REST delete succeeds, purely to sync live UI.
  // scope "everyone": redaction is visible to everyone who can see the
  // message, so we broadcast. scope "me": only the requester's OWN other
  // devices/tabs need to know — nobody else's view changes.
  socket.on("delete-message", ({ chatType, messageId, scope, toUserId }) => {
    if (!chatType || !messageId || !scope) return;
    const payload = { chatType, messageId, scope };

    if (scope === "everyone") {
      if (chatType === "global") {
        io.emit("message-deleted", payload);
      } else if (chatType === "dm" && toUserId) {
        io.to(String(toUserId)).emit("message-deleted", payload);
        io.to(String(socket.userId)).emit("message-deleted", payload);
      }
    } else {
      io.to(String(socket.userId)).emit("message-deleted", payload);
    }
  });

  // ── Clear a DM conversation (delete chat, for me only) ──────────────────
  socket.on("clear-conversation", ({ otherUserId }) => {
    if (!otherUserId) return;
    io.to(String(socket.userId)).emit("conversation-cleared", {
      chatType: "dm",
      otherUserId: String(otherUserId),
      scope: "me",
    });
  });
};