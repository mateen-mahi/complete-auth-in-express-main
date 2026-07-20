import { getIO } from "../config/socket.js";

export const emitToUser = (userId, event, data) => {
  try {
    getIO().to(String(userId)).emit(event, data);
  } catch (err) {
    console.error(`[Socket] emitToUser failed — event: "${event}", user: ${userId}`, err.message);
  }
};

// ── Emit to all sockets in a room (course, lecture, etc.) ──────────────────
// Reaches everyone who called socket.emit("join-room", roomId) on the client.
export const emitToRoom = (roomId, event, data) => {
  try {
    getIO().to(String(roomId)).emit(event, data);
  } catch (err) {
    console.error(`[Socket] emitToRoom failed — event: "${event}", room: ${roomId}`, err.message);
  }
};

// ── Emit to every connected socket (global broadcast) ──────────────────────
// Use sparingly — this hits every authenticated user on the platform.
// Good for: system announcements, maintenance alerts, platform-wide notifications.


export const emitToAll = (event, data) => {
  try {
    getIO().emit(event, data);
  } catch (err) {
    console.error(`[Socket] emitToAll failed — event: "${event}"`, err.message);
  }
};


export const emitToRoomExcludeUser = (roomId, excludeUserId, event, data) => {
  try {
    const io = getIO();
    // Collect sockets in the room that don't belong to the excluded user
    const room = io.sockets.adapter.rooms.get(String(roomId));
    if (!room) return;

    room.forEach((socketId) => {
      const targetSocket = io.sockets.sockets.get(socketId);
      if (targetSocket && targetSocket.userId !== String(excludeUserId)) {
        targetSocket.emit(event, data);
      }
    });
  } catch (err) {
    console.error(`[Socket] emitToRoomExcludeUser failed — event: "${event}", room: ${roomId}`, err.message);
  }
};