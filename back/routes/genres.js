const Joi =require('joi')
const express=require('express');
const mongoose=require('mongoose')
const router=express.Router();
//load schema
require('../models/Genre')
const Genre=mongoose.model('genres')

//add genre
router.post('/',async(req,res)=>{
  const {error}=validationGenre(req.body)
  if(error) return res.status(400).send(error.details[0].message)

  const genre=new Genre({
    title:req.body.title
  })
  await genre.save()
  res.status(200).send('Genre added successfully')

})
//get genres
router.get('/',async(req,res)=>{
  const genres=await Genre.find({}).sort({title:1})
  res.send(genres)
})
//get define genre
router.get('/:_id',async(req,res)=>{
  const genre=await Genre.find({_id:req.params._id})
  if(!genre) return res.status(400).send('Invalid genre Id')
  res.status(200).send(genre)
})
//Update define genre
router.put('/:_id',async(req,res)=>{
  const genre=await Genre.findByIdAndUpdate(req.params._id,{
    title:req.body.title
  },{new:true})
  res.status(200).send('Genre Updated Successfully')
})
//Delete define genre
router.delete('/:_id',async(req,res)=>{
  const genre=await Genre.findByIdAndRemove(req.params._id)
  res.status(200).send('Genre Deleted Successfully')
})


//validation schema
validationGenre=(genre)=>{
  const schema=Joi.object({
    title:Joi.string().required()
  })
  return schema.validate(genre)
}

module.exports=router