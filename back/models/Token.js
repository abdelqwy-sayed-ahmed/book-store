const mongoose=require('mongoose');
const userSchema=require('./User');
const tokenSchema=new mongoose.Schema({
  _id:userSchema,
  token:{type:String},
  date:{type:Date , default:Date.now ,expires:43200}
})
mongoose.model('tokens',tokenSchema)

