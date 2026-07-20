// src/custom-hooks/useSocket.js
import { useState, useEffect, useCallback } from "react";
import socket from "../socket/socket.js";

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [socketId,    setSocketId]    = useState(socket.id || null);
  const [connectionError, setConnectionError] = useState(null);

  // Set of userIds currently online. Tracked HERE (not in Chat.jsx) because
  // this hook's listeners register once when the app boots — before that,
  // a "online-users" snapshot fired at connect time would be missed by any
  // page-level component that mounts later.
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id);
      setConnectionError(null);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setSocketId(null);
      setOnlineUserIds(new Set()); // stale presence data is worse than none
    };

    const onConnectError = (err) => {
      setConnectionError(err.message);
      setIsConnected(false);
      console.error("Socket connection error:", err.message);
    };

    // ── Presence events ──────────────────────────────────────────────────
    const onUserOnline = ({ userId }) => {
      setOnlineUserIds((prev) => new Set(prev).add(userId));
    };

    const onUserOffline = ({ userId }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    const onOnlineSnapshot = ({ userIds }) => {
      setOnlineUserIds(new Set(userIds));
    };

    socket.on("connect",       onConnect);
    socket.on("disconnect",    onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("user-online",   onUserOnline);
    socket.on("user-offline",  onUserOffline);
    socket.on("online-users",  onOnlineSnapshot);

    return () => {
      socket.off("connect",       onConnect);
      socket.off("disconnect",    onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("user-online",   onUserOnline);
      socket.off("user-offline",  onUserOffline);
      socket.off("online-users",  onOnlineSnapshot);
      socket.disconnect();
    };
  }, []);

  const connectSocket = useCallback((authData) => {
    if (socket.connected) return;
    socket.auth = authData;
    socket.connect();
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socket.connected) socket.disconnect();
  }, []);

  const emitEvent = useCallback((event, data) => {
    if (!socket.connected) {
      console.warn(`[Socket] Cannot emit "${event}" — not connected.`);
      return;
    }
    socket.emit(event, data);
  }, []);

  const onEvent = useCallback((event, callback) => {
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, []);

  return {
    isConnected,
    socketId,
    connectionError,
    onlineUserIds,
    connectSocket,
    disconnectSocket,
    emitEvent,
    onEvent,
  };
};