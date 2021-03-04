const mongoose=require('mongoose');
const bookSchema=require('./Book')
const genreSchema=new mongoose.Schema({
  title:{type:String,required:true},
  date:{type:Date,default:Date.now}
})
mongoose.model('genres',genreSchema)