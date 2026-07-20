import mongoose from'mongoose';


const dbConnection = ()=>{
  mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('Connected to MongoDB');

  }).catch((err)=>{
console.log('Error connecting to MongoDB , error: ' + err)
  })
}


export default dbConnection