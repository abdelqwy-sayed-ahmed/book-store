const express=require('express');
const router=express.Router();
const mongoose=require('mongoose');
const Joi =require('joi')
const multer=require('multer');
const path=require('path');
const Fs=require('fs')
const auth=require('../middleware/auth');
const admin = require('../middleware/admin');
//load schema
require('../models/Book');
const Book=mongoose.model('books')
// require('../models/User');
// const User=mongoose.model('users')
require('../models/Genre');
const Genre=mongoose.model('genres')

//upload image multer
const storage=multer.diskStorage({
  destination:'./public/uploads/books/',
  filename:function(req,file,cb) {
    cb(null,"BC-"+Date.now()+path.extname(file.originalname))
  }
});
const upload=multer({
  storage:storage,
  limits:{fileSize:1024*1024*1024*5}
})
//get books
router.get('/',async(req,res)=>{
  const books=await Book.find({})
  
  res.send(books)
})
//get with genres
router.get('/genre/:sub',async(req,res)=>{
  const books=await Book.find({'genre.title':req.params.sub})
  res.send(books)

})
// get single book
router.get('/:_id',async(req,res)=>{
  const book=await Book.find({_id:req.params._id})
  res.send(book)
})
//Delete single book
router.delete('/:_id',async(req,res)=>{
  const book=await Book.findByIdAndRemove(req.params._id)
  res.status(200).send('Book deleted successfully')
})
//add new book
router.post('/add',[auth,admin],upload.single('image'),async(req,res)=>{
  const {error}=validationBook(req.body)
  if(error)return res.status(400).send(error.details[0].message)
  const genre= await Genre.findById(req.body.genreId)
  if(!genre)return res.status(401).send('Invalid genre Id')
  const book=new Book({
    title:req.body.title,
    price:req.body.price,
    image:req.file.path,
    genre:{
       _id:genre._id,
       title:genre.title
      }
  })
  await book.save()
  res.status(200).send(' New book added successfully')
})
//update book
router.put('/:_id',[auth,admin],async(req,res)=>{
  const {error}=validationEditBook(req.body)
  if(error)return res.status(400).send(error.details[0].message)
  const genre= await Genre.findById(req.body.genreId)
  if(!genre)return res.status(401).send('Invalid genre Id')
  const book=await Book.findByIdAndUpdate(req.params._id,{
   
    title:req.body.title,
    price:req.body.price,
    genre:{
      _id:genre._id,
      title:genre.title
     }

  },{new:true})
  res.status(200).send('Book updated successfully')
})
//update-Book-Image
router.put('/bookImage/:_id',upload.single('image'),async(req,res)=>{
  //delete old image
  let bookImage=await Book.findById(req.params._id)
  let imagePath=bookImage.image
  Fs.unlink(imagePath,err=>{
    console.log(err)
  })
  
  const book=await Book.findByIdAndUpdate(req.params._id,{
    image:req.file.path,
  },{new:true})
    res.status(200).send('Image Updated Successfully')

})

validationBook=(book)=>{
  const schema=Joi.object({
    title:Joi.string().required(),
    price:Joi.string().required(),
    genreId:Joi.string().required(),
    image:Joi.string(),

  })
  return schema.validate(book)
}
validationEditBook=(book)=>{
  const schema=Joi.object({
    title:Joi.string().required(),
    price:Joi.string().required(),
    genreId:Joi.string().required(),
  })
  return schema.validate(book)
}

module.exports=router;
