const mongoose=require('mongoose');
const jwt=require('jsonwebtoken');
const config=require('config')
const userSchema=new mongoose.Schema({
  name:{type:String,required:true},
  email:{type:String,required:true},
  password:{type:String,required:true},
  isAdmin:{type:Boolean,default:false},
  isConfirm:{type:Boolean,default:false},
  imageOut:{type:Boolean,default:false},
  image:{type:String ,default:'https://raw.githubusercontent.com/Ashwinvalento/cartoon-avatar/master/lib/images/male/45.png'}
})
userSchema.methods.generateAuthToken=function(){
  const token=jwt.sign({_id:this._id,email:this.email,name:this.name,isAdmin:this.isAdmin,image:this.image,imageOut:this.imageOut},config.get('jwtPrivateKey'))
  return token
}

mongoose.model('users',userSchema)