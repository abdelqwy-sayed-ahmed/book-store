const express =require('express');
const app=express();
//use process.env
require('dotenv').config()
const bodyParser=require('body-parser');
const path=require('path');
const fs=require('fs')
require('./startup/cors')(app)
const mongoose=require('mongoose');
// 'mongodb://localhost/bookstore'
mongoose.connect(process.env.MONGO_URI,{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify:false,
  useCreateIndex:true

}).then(()=>console.log(`mongoDb connected`))
  .catch(err=>{
    next(err)
  });
//body-parser
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
//static
app.use('/public/uploads/profile-img',express.static(path.join('public','uploads','profile-img')))
app.use('/public/uploads/books',express.static(path.join('public','uploads','books')))
//load routes
const users=require('./routes/users');
app.use('/users',users)
const books=require('./routes/books');
app.use('/books',books)
const genres=require('./routes/genres');
const { nextTick } = require('process');
app.use('/genres',genres)


app.use((req,res)=>{
  if(req.file){
    fs.unlink(req.file.path)
  }
})



const port=process.env.PORT||5000;
app.listen(port,()=>console.log(`server started at ${port}`))