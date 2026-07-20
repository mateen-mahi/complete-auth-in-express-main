// src/socket/adminSocket.js
import { io } from "socket.io-client";

// Separate connection, pointed at the /admin namespace specifically.
// autoConnect: false — same pattern as the main socket.js — connection is
// driven explicitly once we know the user is an admin (see useAdminSocket.js).
// ⚠️ Update the URL below to match your actual backend host if it differs.
const adminSocket = io("https://complete-auth-in-express-main.onrender.com/admin", {
  withCredentials: true,
  autoConnect: false,
});

export default adminSocket;
