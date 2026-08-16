import express from 'express'
import http from "http";
import { initSocket } from "./config/socket.js";
import mongoDBConnection from './DB/connect.db.js';
import userRoutes from './routes/user.route.js';
import complaintRoutes from './routes/complaint.route.js';
import lecturesRouter from './routes/lectures.route.js';
import coursesRouter from './routes/course.route.js';
import messageRouter from './routes/message.route.js';
import notesRouter from './routes/notes.route.js';
import progressRouter from './routes/progress.route.js';
import adminRoutes from './routes/admin.route.js';
import quizRoute from './routes/quiz.route.js';
import booksRouter from './routes/books.route.js';
import cookieParser from 'cookie-parser';
import environment from 'dotenv';
import cors from 'cors';
import verifyAuth from './Middlewares/AuthMiddleware.js';
import certificateRouter from './routes/certificate.route.js';
import paymentRoutes from './routes/payment.route.js';
import { stripeWebhook } from './Controllers/Payment/payment.controller.js';
import chatbotRouter from './routes/chatbot.route.js';


environment.config(); 

const allowedOrigins = [
  process.env.FRONTEND_URI, 
  "http://localhost:8080",
  "http://localhost:5173",
  "https://m-mateen.netlify.app",
];

const app = express();
const server = http.createServer(app);


app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);



app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", coursesRouter);
app.use("/api/v1/complaints", verifyAuth, complaintRoutes);
app.use("/api/v1/lectures",verifyAuth, lecturesRouter);
app.use("/api/v1/quizzes",  quizRoute);
app.use("/api/v1/books", verifyAuth, booksRouter);
app.use("/api/v1/notes", verifyAuth, notesRouter);
app.use("/api/v1/progress", verifyAuth, progressRouter);
app.use("/api/v1/messages",verifyAuth, messageRouter)
app.use("/api/v1/admin",verifyAuth,adminRoutes);
app.use("/api/v1/certificates",verifyAuth,certificateRouter)
app.use("/api/v1/payments",verifyAuth,paymentRoutes);
app.use("/api/v1/chatbot",verifyAuth,chatbotRouter);

const PORT = process.env.PORT || 8080;

initSocket(server, allowedOrigins);

const startServer = async () => {
  try {
    await mongoDBConnection();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
};

startServer();




