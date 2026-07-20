import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
document: {
  url: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  originalName: String,
  mimeType: String,
  size: Number,
},
   courseId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Course",
    default: null 
  },
  
 },
  { timestamps: true }
);

const Book = mongoose.models.Book|| mongoose.model("Book", bookSchema);


export default Book;