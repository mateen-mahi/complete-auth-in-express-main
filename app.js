import express from 'express'
import mongoDBConnection from './DB/connect.db.js';
import userRoutes from './routes/user.route.js';
import cookieParser from 'cookie-parser';
import environment from'dotenv';
import cors from 'cors';

environment.config(); 

const allowedOrigins = [process.env.FRONTEND_URI, "http://localhost:8080"];

const app = express();
app.use(express.json());
app.use(cors({
   origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, 
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);

const port = process.env.Port || 8080




app.use("/api/v1/users" ,userRoutes);


app.listen(port, ()=>{
mongoDBConnection();
  console.log("Server is running on port", port);
});

