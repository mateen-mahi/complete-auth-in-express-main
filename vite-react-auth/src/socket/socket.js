import { io } from "socket.io-client";

const socket = io("https://complete-auth-in-express-main.onrender.com", {
  withCredentials: true,
  autoConnect: false,
  transports: ["websocket"],
});

export default socket;