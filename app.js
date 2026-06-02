import express from 'express'
import mongoDBConnection from './DB/connect.db.js';
import userRoutes from './routes/user.route.js';
import cookieParser from 'cookie-parser';
import environment from'dotenv';



const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
environment.config();

const port = process.env.Port || 8080

// const userAuthentication = (req,res,next)=>{
//   const token = req.cookies.JWTToken;
//   if(!token){
//     return res.redirect('/users/login');
//   }else{
//     jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
//       if(err){
//         res.clearCookie('JWTToken');
//         return res.redirect('/users/login');
//       }
//       // res.redirect("/");
//       req.user = decodedToken;
//       next();
//     });
//   }

// }


app.use("/users" ,userRoutes);


app.listen(port, ()=>{
mongoDBConnection();
  console.log("Server is running on port", port);
});

