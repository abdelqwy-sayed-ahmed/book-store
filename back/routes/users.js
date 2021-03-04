const express=require('express');
const router=express.Router();
const Joi =require('joi');
const bcrypt=require('bcrypt');
const mongoose=require('mongoose');
const multer=require('multer');
const path=require('path');
const Fs=require('fs')
const auth=require('../middleware/auth');

const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client(process.env.CLIENT_ID_GOOGLE_LOGIN);
const nodemailer=require('nodemailer');
const {google}=require('googleapis');
const OAuth2=google.auth.OAuth2;
require('dotenv').config()
//load schema
require('../models/User');
const User=mongoose.model('users')
require('../models/Token');
const Token=mongoose.model('tokens')

//multer
const storage=multer.diskStorage({
  destination:'./public/uploads/profile-img/',
  filename:function(req,file,cb) {
    cb(null,"PI-"+Date.now()+path.extname(file.originalname))
  }
});
const upload=multer({
  storage:storage,
  limits:{fileSize:1024*1024*5}
})
//update profile image
router.put('/profile/image/:_id',upload.single('image'),async(req,res)=>{
  //delete old image
  let profileImage=await User.findById(req.params._id)
  let imagePath=profileImage.image
  Fs.unlink(imagePath,err=>{
    console.log(err)
  })
  
  const user=await User.findByIdAndUpdate(req.params._id,{
    image:req.file.path,
    imageOut:false

  },{new:true})
  
    res.status(200).send('Image Updated Successfully')

})
//get profile data
router.get('/profile/:_id',async(req,res)=>{
  const user=await User.findById(req.params._id)
  res.send(user)
})

//google
router.post('/google',async(req,res)=>{
  const { tokenId }  = req.body
  const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.CLIENT_ID_GOOGLE_LOGIN
  });
  const payload=ticket.getPayload()
  
  let user=await User.findOne({email:payload.email})
  if(user){
    const token=await user.generateAuthToken()
    res
  .header('x-auth-token',token)
  .header('access-control-expose-headers','x-auth-token')
  .send(token)

  }else{  
    user=new User({
     name:payload.name,
     email:payload.email,
     isConfirm:payload.email_verified,
     imageOut:true,
     password:payload.email,
     image:payload.picture.substring(0, payload.picture.length -5).concat("s200-c")
   })


   user.save()
   const token=await user.generateAuthToken()
   res
   .header('x-auth-token',token)
   .header('access-control-expose-headers','x-auth-token')
   .send(token)
  }
  
})
//facebook
router.post('/facebook', async(req,res)=>{
  let user=await User.findOne({email:req.body.email})
  if(user){
    const token=user.generateAuthToken()
    res.send(token)
  }else{
    user= new User({
      name:req.body.name,
      email:req.body.email,
      password:req.body.email,
      isConfirm:true,
      imageOut:true,
      image:req.body.picture.data.url
      
    })
    user.save()
    const token=user.generateAuthToken()
    res.send(token)
  }


})

//register user with email and pass.
router.post('/register',async(req,res)=>{
  //joi errors
  const {error}=validateRegister(req.body)
  if(error)return res.status(400).send(error.details[0].message)
  //check user
  let user=await User.findOne({email:req.body.email})
  if(user) return res.status(400).send('Email already found,choose another one')

   user=new User({
    name:req.body.name,
    email:req.body.email,
    password:req.body.password,
    imageOut:true

  })
  //hash pass
  const salt=await bcrypt.genSalt(10);
  user.password=await bcrypt.hash(user.password,salt)
  let token=new Token({
    _id:user._id,
    token:user.generateAuthToken()
  })
  await token.save();
  await user.save();
  res
  .header('x-auth-token',token.token)
  .header('access-control-expose-headers','x-auth-token')
  
    //email verification
    const oauth2Client=new OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URL,
      );
      oauth2Client.setCredentials({
        refresh_token:process.env.REFRESH_TOKEN
      });
      const accessToken=oauth2Client.getAccessToken()
      const smtpTransport=nodemailer.createTransport({
        service:"gmail",
        auth:{
          type:"OAuth2",
          user:process.env.EMAIL_SENDER,
          clientId:process.env.CLIENT_ID,
          clientSecret:process.env.CLIENT_SECRET,
          refreshToken:process.env.REFRESH_TOKEN,
          accessToken:accessToken
        }
      })
      //add email content
 
     const mailOptions = {
       from:process.env.EMAIL_SENDER,
       to: user.email,
       subject: "Email verification",
       generateTextFromHTML: true,
       html: `<h2> please click the following link to complete your registration : </h2> <a href='${process.env.CLIENT_URL}/users/confirm/${token.token}'>${token.token}</a>`  
     };
     smtpTransport.sendMail(mailOptions, (err) => {
       err ? res.status(500).send(err.message) : res.status(200).send('Email verification has been send ,please check you mail inbox')
       smtpTransport.close();
     });


})
//confirm
router.get('/confirm/:token',async(req,res)=>{
  const token=await Token.findOne({token:req.params.token});
  if(!token)return res.status(401).send('invalid token,this token may be expired , you will redirect automattically to get anew valid token');
  //match user token
  const user=await User.findOne({
    _id:token._id
  })
  if(!user)return res.status(400).send('no user matches with this token')
  //check email verified
  if(user.isConfirm)return res.status(400).send('this email already verified ,please login directly')
  //verify email
  user.isConfirm=true
  await user.save(err=>{
    err?res.status(500).send(err.message):res.status(200).send('the account has been verified ,please login ')
  })

})

//login
router.post('/login',async(req,res)=>{
  //validate
  const {error}=validateLogin(req.body)
  if(error) return res.status(400).send(error.details[0].message)
  //check email
  const user=await User.findOne({email:req.body.email})
  if(!user) res.status(400).send('incorrect email or password')
  //check verification first
  if(user.isConfirm===false)return res.status(400).send('you cannot login before confirm email registration ,please check your mail inbox then try to login again')
  //check password
  const validatePassword=await bcrypt.compare(req.body.password,user.password)
  if(!validatePassword) return res.status(400).send('incorrect email or password')
  //return token
  const token=user.generateAuthToken()
  res
  .header('x-auth-token',token)
  .header('access-control-expose-headers','x-auth-token')
  .send(token)
 })

 //forget Password  with check mail with new token
  router.post('/forget',async(req,res)=>{
    const {error}=validateEmail(req.body);
    if(error)return res.status(400).send(error.details[0].message);
    //check email
    const user=await User.findOne({email:req.body.email})
    if(!user) return res.status(400).send('Unable to find user with this email please enter a correct email ')
    //check verified option
    if(user.isConfirm===false) return res.status(400).send('this email is not verified ,please check your inbox to confirm your account');
    //prevent dublicate token 
      let token=await Token.findOne({_id:user._id})
    if(token)return res.status(400).send('email with reset password already send to this email')
    token =new Token({
      _id:user._id,
      token:user.generateAuthToken()
     })
     
     await token.save();
     res.header("x-auth-token",token.token)
     //email verification
     const oauth2Client=new OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URL,
      );
      oauth2Client.setCredentials({
        refresh_token:process.env.REFRESH_TOKEN
      });
      const accessToken=oauth2Client.getAccessToken()
      const smtpTransport=nodemailer.createTransport({
        service:"gmail",
        auth:{
          type:"OAuth2",
          user:process.env.EMAIL_SENDER,
          clientId:process.env.CLIENT_ID,
          clientSecret:process.env.CLIENT_SECRET,
          refreshToken:process.env.REFRESH_TOKEN,
          accessToken:accessToken
        }
      })
      //add email content
  
     const mailOptions = {
       from:process.env.EMAIL_SENDER,
       to: user.email,
       subject: "Forget Password",
       generateTextFromHTML: true,
       html: `<h2> please click the following link to reset your password : </h2> <a href='${process.env.CLIENT_URL}/users/forget/${token.token}'>${token.token}</a>`  
     };
     smtpTransport.sendMail(mailOptions, (err) => {
       err ? res.status(500).send(err.message) : res.status(200).send('New Email With reset password has been send ,please check you mail inbox')
       smtpTransport.close();
     });
  
  
  })
  //confirm forget password
 router.get('/forget/:token',async(req,res)=>{
  const token=await Token.findOne({token:req.params.token});
  if(!token)return res.status(400).send('invalid token,this token may be expired , you will redirect automattically to get anew valid token');
  //match user token
  const user=await User.findOne({
    _id:token._id
  })
  if(!user)return res.status(400).send('no user matches with this token')
  if(user) return res.status(200).send('Password Reset Successfully ,you will redirect automatically to assign new password')

})

//re-assign new password
router.post('/assign',async(req,res)=>{
  const {error}=validatePassword(req.body)
  if(error) return res.status(400).send(error.details[0].message)
  let user=await User.findOne({email:req.body.email})
  if(!user)return res.status(400).send('This email not found be sure about it ')
  if(req.body.password!==req.body.password2)return res.status(400).send('Two passwords are not match')
   user=await User.findOneAndUpdate({email:req.body.email},{
     password:req.body.password
     
   },{new:true})
   const salt=await bcrypt.genSalt(10);
 user.password=await bcrypt.hash(user.password,salt)
 await user.save()
 res.status(200).send('password updated succ.,you will redirect to login ')

})

 //send new token if expired
 router.post('/token',async(req,res)=>{
  const {error}=validateEmail(req.body);
  if(error)return res.status(400).send(error.details[0].message);
  //check email
  const user=await User.findOne({email:req.body.email})
  if(!user) return res.status(400).send('Unable to find user with this email please enter correct email ')
  //check verified option
  if(user.isConfirm) return res.status(400).send('this email already verified ,please login');
  //prevent dublicate token 
  let token=await Token.findOne({_id:user._id})
  if(token)return res.status(400).send('email with reset password already send to this email')
  
  token =new Token({
    _id:user._id,
    token:user.generateAuthToken()
   })
  
   await token.save();
   res.header("x-auth-token",token.token)
   //email verification
   const oauth2Client=new OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL,
    );
    oauth2Client.setCredentials({
      refresh_token:process.env.REFRESH_TOKEN
    });
    const accessToken=oauth2Client.getAccessToken()
    const smtpTransport=nodemailer.createTransport({
      service:"gmail",
      auth:{
        type:"OAuth2",
        user:process.env.EMAIL_SENDER,
        clientId:process.env.CLIENT_ID,
        clientSecret:process.env.CLIENT_SECRET,
        refreshToken:process.env.REFRESH_TOKEN,
        accessToken:accessToken
      }
    })
    //add email content

   const mailOptions = {
     from:process.env.EMAIL_SENDER,
     to: user.email,
     subject: "Email verification",
     generateTextFromHTML: true,
     html: `<h2> please click the following link to complete your registration : </h2> <a href='${process.env.CLIENT_URL}/users/confirm/${token.token}'>${token.token}</a>`  
   };
   smtpTransport.sendMail(mailOptions, (err) => {
     err ? res.status(500).send(err.message) : res.status(200).send('New Email Verification has been send ,please check you mail inbox')
     smtpTransport.close();
   });


})

validateRegister=(user)=>{
  const schema=Joi.object({
    name:Joi.string().required(),
    email:Joi.string().required().email(),
    password:Joi.string().required().min(6),
  })
  return schema.validate(user)
}
validateLogin=(user)=>{
  const schema=Joi.object({
    email:Joi.string().required().email(),
    password:Joi.string().required(),
  })
  return schema.validate(user)
}

validateEmail=(user)=>{
  const schema=Joi.object({
    email:Joi.string().required().email(),
  })
  return schema.validate(user)
}
validatePassword=(user)=>{
  const schema=Joi.object({
    email:Joi.string().required().email(),
    password:Joi.string().required().min(6),
    password2:Joi.string().required().min(6),
  })
  return schema.validate(user)
}
 
module.exports=router;