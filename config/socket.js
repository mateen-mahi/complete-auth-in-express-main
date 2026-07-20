import { Server } from "socket.io";
import { registerSocketHandlers } from "../sockets/handler.js";
import User from "../models/user.model.js";

let io;

export const initSocket = (server, allowedOrigins) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });


  io.use((socket, next) => {
    const userId = socket.handshake.auth?.userId;
    if (!userId) return next(new Error("Authentication required"));
    socket.userId = userId;
    next();
  });



  const adminNamespace = io.of("/admin");

  adminNamespace.use(async (socket, next) => {
    try {
      const userId = socket.handshake.auth?.userId;
      if (!userId) return next(new Error("Authentication required"));

      const user = await User.findById(userId).select("role username");
      if (!user) return next(new Error("User not found"));
      if (user.role !== "admin" && user.role !== "super-admin") {
        return next(new Error("Admin access required"));
      }

      socket.userId = userId;
      socket.username = user.username;
      socket.role = user.role;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  adminNamespace.on("connection", (socket) => {
    console.log(`🛡️  Admin connected: ${socket.username} (${socket.role})`);

    // Live "how many admins are watching the dashboard right now" —
    // distinct from the main app's online-user count.
    const adminCount = adminNamespace.sockets.size;
    adminNamespace.emit("admin:presence", { onlineAdmins: adminCount });

    socket.on("disconnect", () => {
      console.log(`🛡️  Admin disconnected: ${socket.username}`);
      // -1 because this socket is already removed from .sockets by the time
      // this fires, so .size is already correct — no manual subtraction needed
      adminNamespace.emit("admin:presence", { onlineAdmins: adminNamespace.sockets.size });
    });
  });

  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id} (User: ${socket.userId})`);
    socket.join(socket.userId);
    socket.emit("authenticated", { userId: socket.userId, socketId: socket.id, message: "Socket authenticated successfully" });
    registerSocketHandlers(io, socket);
  });


  return io;
};





export const getIO = () => {
  if (!io) throw new Error("[Socket] io not initialized — call initSocket() first");
  return io;
};

