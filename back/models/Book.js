const mongoose=require('mongoose');
const genreSchema=require('./Genre')
const bookSchema=new mongoose.Schema({
  title:{type:String,required:true},
  price:{type:String,required:true},
  genre:{type:genreSchema},
  image:{type:String},
  // numberInStock:{type:Number,required:true},
  // description:{type:String,required:true},
  // publisher:{type:String,required:true},
  // publishDate:{type:Date,required:true},
  // pages:{type:Number,required:true},
  // language:{type:String,required:true},
  // available:{type:Boolean,default:true},
  // author:{type:String,required:true},
  // aboutAuthor:{type:String},
  date:{type:Date,default:Date.now},
  updated:{type:Date,default:Date.now}
})


mongoose.model('books',bookSchema)