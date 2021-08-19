    var cibo=require('./ciboschemas.js');
    var express=require('express');
    var app=express();
    var md = require('md5');
    var body_parser = require('body-parser');
    app.use(body_parser.json());
    app.use(body_parser.urlencoded({ extended: false }));
    var jwt = require('jsonwebtoken');
    var otpgen= require('otp-generator');
    const multer=require('multer');
    const path=require('path');
    var nodemailer=require('nodemailer');
    var ejs=require('ejs');
    var midleware=require('./tokenverify.js');
    var mail= /^[a-zA-Z0-9_\-\.]+[@][a-z]+[\.][a-z]{2,3}$/;
    var pass= /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
    var phone=/^[89][0-9]{9}$/;
    var mongoose=require('mongoose');
    var cors=require('cors');
    app.use(cors());
    var dotenv=require('dotenv');
    dotenv.config();     
   
    const AWS = require('aws-sdk');
    const multers3 = require('multer-s3');
    const s3 = new AWS.S3({
    accessKeyId:process.env.AWS_ACCESS_KEY,
    secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY
    });
    
    const fileFilter = (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png" || file.mimetype === "image/jpg") {
    cb(null, true);
    } else {
    cb(new Error("Invalid file type, only JPEG and PNG is allowed!"), false);
    }
    };
    const profile = multer({fileFilter,storage: multers3({
    acl: "public-read",
    s3,
    bucket: process.env.AWSBucketName,
    metadata: function (req, file, cb) {
    cb(null, { fieldName: "TESTING_METADATA" });
    },
    contentType: multers3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
    cb(null, Date.now().toString()+path.extname(file.originalname));
    },
    }),
    });
     
    // sign up API
    app.post('/signup',function(req,res){       
        cibo.users.findOne({$or:[
            {email:req.body.email},
            {phone_no:req.body.phone_no}
        ]},function(err,success){
           
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:"error",
                   
                });
            }
            else if(success)
            {               
                return res.status(400).json({
                    status:400,
                    message:"email or phone_no already exist",   
                    error:true                 
                });
            }
            // validations
            else 
            {
                if(req.body.name==null || req.body.email==null || req.body.password==null || req.body.confirm_password==null || req.body.phone_no==null
                    || req.body.name==''||req.body.email==''|| req.body.password==''|| req.body.confirm_password==''||req.body.phone_no=='')
                {
                    return res.status(400).json({
                        status:400,
                        message:"fill all fields",
                        error:true
                    });
                }
                else if(mail.test(req.body.email)==false||req.body.email==''||req.body.email==null)
                    {
                        return res.status(400).json({
                            status:400,
                            message:"enter valid email",
                            error:true 
                        });
                    }
        else if(pass.test(req.body.password)==false||req.body.password==''||req.body.password==null)
        {
            return res.status(400).json({
                status:400,
                message:"password should be minimum of lenght 6 ",
                error:true 
            });
        }

        else if(phone.test(req.body.phone_no)==false||req.body.phone_no==''||req.body.phone_no==null)
        {
            return res.status(400).json({
                status:400,
                message:"phone_no should be of 10 digit and must start with 8 or 9",
                error:true 
            });
        }
        else if(req.body.name==''|| req.body.name==null || req.body.name==' ')
        {
            return res.status(400).json({
                status:400,
                message:"enter valid name",
                error:true 
            });
        }
        else if(req.body.password==' '|| req.body.password==null)
        {
            return res.status(400).json({
                status:400,
                message:"enter valid password",
                error:true 
            });
        }
        else if(req.body.confirm_password==' '|| req.body.confirm_password==null)
        {
            return res.status(400).json({
                status:400,
                message:"enter valid password",
                error:true 
            });
        }
       
        else
        {
            req.body.password=md(req.body.password);
        req.body.confirm_password=md(req.body.confirm_password);
            if(req.body.password==req.body.confirm_password)
            {
                obj={                   
                    name:req.body.name,
                    email:req.body.email,
                    password:req.body.password,
                    confirm_password:req.body.confirm_password,
                    phone_no:req.body.phone_no,                   
                    otp:otpgen.generate(6,{ digits:true, alphabets:false, upperCase: false, specialChars: false }),
                    }               
            console.log('object is',obj);
            cibo.users.create(obj,function(err,result){
                if(err)
                {
                    console.log("error:",err);
                    return res.status(400).json({
                        status:400,
                        message:err
                    });
                }  
                else if(result)
                {                    
                    obj1=
                        {
                            _id:result._id,
                            name:result.name,
                            email:result.email,
                            phone_no:result.phone_no,
                            otp:result.otp
                           
                        }
                    jwt.sign(obj1,'ram',function(token_error,token_result){
                        if(token_error)
                        {
                            return res.status(400).json({
                                status:400,
                                message:"token is not generated"
                            });
                        }
                        else if(token_result)
                        {                            
                           cibo.users.updateOne({_id:result._id},{token:token_result},function(err,success){
                               if(err)
                               {
                                   return res.status(400).json({
                                       status:400,
                                       message:err.message
                                   });
                               }
                               else if(success)
                               {
                                   return res.status(200).json({
                                       status:200,
                                       data:obj1,
                                       message:"user created",
                                       token:token_result
                                   });
                               }
                           });
                                              
                        }
                    });
               }
                    else 
                    {
                        return res.status(400).json({
                            status:400,
                            message:"something wrong",
                            error:true
                        });
                    }
            });          
            
            }
            else
            {
                return res.status(400).json({
                    status:400,
                    message:"password is not matching with confirm password",
                    error:true
                });
            }
        }   
     }
    });
  });       

    // verifying OTP API
    app.post('/verify',function(req,res){
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
    cibo.users.findOne({_id:vary._id},function(err,result){
        if(err)
        {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
        }
        else if(result)
        {
            if(result.otp===req.body.otp)
            {
                return res.status(200).json({
                    status:200,
                    message:"otp matched"
                });
            }
            else
            {
                    return res.status(400).json({
                        status:400,
                        message:"otp doesn't matched"
                    });
            }
        }
        
    });
    });

    // resend OTP API
    app.get('/resend',function(req,res){

        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
        console.log('vary',vary);
        cibo.users.findOne({phone_no:vary.phone_no},function(err,success){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(success)
            {
                otp1=otpgen.generate(6,{ digits:true, alphabets:false, upperCase: false, specialChars: false });
        
                cibo.users.updateOne({otp:success.otp},{otp:otp1},function(err,result){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        }); 
                    }
                    else if(result)
                    {
                        return res.status(200).json({
                            status:200,
                            message:"otp resend"
                        });
                    }
                });
            }
        });   
    });

    // location API
    app.post('/location',function(req,res){       
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
        cibo.users.findOne({_id:vary._id},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {               
              obj={
                location:{
                    type:"Point",
                    coordinates:[parseFloat(req.body.long),parseFloat(req.body.lat)]
                },
                lat:parseFloat(req.body.lat),
                long:parseFloat(req.body.long),
                delivery_address:req.body.delivery_address
              }
              cibo.users.updateOne({_id:vary._id},obj,function(err,result){
                  if(err)
                  {
                    return res.status(400).json({
                        status:400,
                        message:err.message
                    });
                  }
                  else if(result)
                  {
                    return res.status(200).json({
                        status:200,
                        message:"location added"
                    });
                  }
              });
            }
        });
    });
   
    // login API
    app.post('/login',function(req,res){

        if(mail.test(req.body.email)==false || req.body.email==' ' || req.body.email==null)
        {
            return res.status(400).json({
                status:400,
                message:"enter valid email",
                error:true
            });
        }         
        cibo.users.findOne({email:req.body.email},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {   
                var seller;
                seller=result.seller;
                console.log("seller:",seller);
                           
                 if(req.body.type=="facebook" &&  result.facebook_id!=null || req.body.type=="google" && result.google_id!=null)
                {
                    if(result.google_id!=req.body.google_id || result.facebook_id!=req.body.facebook_id)
                    {
                        return res.status(400).json({
                            status:400,
                            message:"id not matched"
                        });
                    }  
                  obj1={
                        _id:result._id,
                        type:req.body.type,
                        google_id:req.body.google_id,
                        facebook_id:req.body.facebook_id,
                        email:req.body.email
                     }
                   jwt.sign(obj1,'ram',function(token_err,token_result){
                       if(token_err)
                       {
                           return res.status(400).json({
                               status:400,
                               message:err
                           });
                       }
                       else if(token_result)
                       {
                           cibo.users.updateOne({_id:result._id},{token:token_result},function(err,result){
                               if(err)
                               {
                                    return res.status(400).json({
                                        status:400,
                                        message:err
                                    });
                               }
                               else if(result)
                               {
                                return res.status(200).json({
                                    status:200,
                                    message:"login successful ",
                                    email:req.body.email,
                                    seller:seller,
                                    token:token_result
                                });
                               }
                           });
                       }
                   });
                }  
                else if(req.body.type==="manual")
                {
                     if(pass.test(req.body.password)==false || req.body.password==' ' || req.body.password==null)
                            {
                                return res.status(400).json({
                                    status:400,
                                    message:"enter valid password",
                                    error:true
                                });
                            } 
                                
                    req.body.password=md(req.body.password);
                    if(req.body.password==result.password)
                    {
                        obj2={
                                _id:result._id,
                                email:req.body.email,
                                phone_no:result.phone_no                                
                             }
                        jwt.sign(obj2,'ram',function(token_error,token_result)
                        {
                            if(token_error)
                            {
                                return res.status(400).json({
                                    status:400,
                                    message:token_error.message
                                });
                            }
                            else if(token_result)
                            {
                                cibo.users.updateOne({email:req.body.email},{token:token_result},function(err,result1){
                                    if(err)
                                    {
                                        return res.status(400).json({
                                            status:400,
                                            message:err
                                        });
                                    }
                                    else if(result1)
                                    {
                                        return res.status(200).json({
                                                status:200,
                                                message:"login successful ",
                                                email:req.body.email,
                                                name:result.name,
                                                seller:seller,
                                                token:token_result
                                            });
                                    }
                                });                      
                            }
                        });
                    }                                                        
                    else
                    {
                        return res.status(400).json({
                            status:400,
                            message:"incorrect password",
                            error:true
                        });
                    }  
                } 
                else 
                {
                    obj={
                        _id:result._id,
                        email:result.email,
                        type:req.body.type,
                        google_id:req.body.google_id,
                        facebook_id:req.body.facebook_id
                    }
                    jwt.sign(obj,'ram',function(token_error,token_result){
                        if(token_error)
                        {
                            return res.status(400).json({
                                status:400,
                                message:token_error.message
                            });
                        }
                        else if(token_result)
                        {
                            cibo.users.updateOne({_id:result._id},{token:token_result,google_id:req.body.google_id,facebook_id:req.body.facebook_id,type:req.body.type},function(err,success){
                                if(err)
                                {
                                    return res.status(400).json({
                                        status:400,
                                        message:err.message
                                    });
                                }
                                else if(success)
                                {
                                    return res.status(200).json({
                                        status:200,
                                        message:"login successful ",
                                        email:req.body.email,
                                        seller:seller,
                                        token:token_result
                                    });
                                }
                            });
                        }
                    });
                }                                                             
            }  
            else
            {                
                if(req.body.type=="google" || req.body.type=="facebook")
                {                  
                    cibo.users.create(req.body,function(err,result){
                        if(err)
                        {
                            return res.status(400).json({
                                status:400,
                                message:err.message
                            });
                        }
                        else if(result)
                        {
                            obj={
                                type:result.type,
                                _id:result._id,
                                email:result.email,
                                google_id:result.google_id,
                                facebook_id:result.facebook_id
                            }
                            jwt.sign(obj,'ram',function(token_error,token_result){
                                if(token_error)
                                {
                                    return res.status(400).json({
                                        status:400,
                                        message:err
                                    });
                                }
                                else if(token_result)
                                {
                                    cibo.users.updateOne({email:req.body.email},{token:token_result},function(err,result){
                                        if(err)
                                        {
                                            return res.status(400).json({
                                                status:400,
                                                message:err
                                            });
                                        }
                                        else if(result)
                                        {
                                            return res.status(200).json({
                                                    status:200,
                                                    message:"login successful ",
                                                    email:req.body.email,
                                                    seller:seller,
                                                    token:token_result
                                                });
                                        }
                                    });  
                                }
                            });
                        }
                    });
                } 
                else
                {
                    return res.status(400).json({
                    status:400,
                    message:"email not found",
                    error:true
                     });
                }
            }         
        });
    });

    // forget password API
    app.post('/forgetpassword',function(req,res){
        
        if(mail.test(req.body.email)==false||req.body.email==''||req.body.email==null)
        {
            return res.status(400).json({
                status:400,
                message:"emial is not valid"
            });
        }
        else 
        {
            cibo.users.findOne({email:req.body.email},function(err,result){
                if(err)
                {
                    return res.status(400).json({
                        status:400,
                        message:err.message
                    });
                }
                else if(result)
                {                             
                    var transport = nodemailer.createTransport({
                        host: "smtp.mailtrap.io",
                        port: 2525,
                        auth: {
                          user: "2e166ed4f7c2ea",
                          pass: "8e629cdfa30baf"
                        }
                      });
                      let url = '<a href="http://'+req.headers.host+'/pass/'+req.body.email+'">http://'+req.headers.host+'/pass'+req.body.email+'</a>';
                      console.log("url",url);
                   
                       transport.sendMail({
                        from: 'ramm00324@gmail.com', // sender address
                        to: req.body.email, // list of receivers                    
                        text: 'Hello world ?', // plaintext body
                        html:'<p>We just acknowledged that you have requested to change your account password. You can change your password by clicking on the link below.</p>'+url+'<p>If you did not make this request. Please ignore this email.</p>'             
                        
                     });
                     return res.status(200).json({
                         status:200,
                         message:"link sent on your email"
                     });                   
                }
                else 
                {
                    return res.status(400).json({
                        status:400,
                        message:"email not found"
                    });
                }
            });
        }       
    });

    // reset password API
    app.post('/resetpassword',function(req,res){
        console.log("email:",req.params.email);
        
        if(pass.test(req.body.password)==false || req.body.password==' '|| req.body.password==null)
        {
            return res.status(400).json({
                status:400,
                message:"invalid password"
            });
        }
        else if(mail.test(req.body.email)==false || req.body.email==' ' || req.body.email==null)
        {
            return res.status(400).json({
                status:400,
                message:"invalid email"
            });
        }
        else
        {
            if(req.body.password==req.body.confirm_password)
            {
                req.body.password=md(req.body.password);
            req.body.confirm_password=md(req.body.confirm_password);
                cibo.users.findOneAndUpdate({email:req.body.email},{password:req.body.password,confirm_password:req.body.confirm_password},function(err,success){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(success)
                    {
                        return res.status(200).json({
                            status:200,
                            message:"password reset"
                        });
                    }
                    else
                    {
                        return res.status(400).json({
                            status:400,
                            message:"email not found"
                        });
                    }
                });
            }
            else
            {
                return res.status(400).json({
                    status:400,
                    message:"password mismatch"
                });
            }
        }
       
    });

    //password screen API
    app.get('/pass/:email',function(req,res){                  
        ejs.renderFile('./password.ejs',{},{},function(err,template){
            if(err)
            {
                throw err;
            }
            else
            {
                res.end(template);
            }
        });
    });

    // logout API
    app.get('/logout',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
        console.log("token is",vary);
        cibo.users.updateOne({_id:vary._id},{token:null},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {
                return res.status(200).json({
                    status:200,
                    message:"you just logout"
                });
            }
        });
    });

    // seller API
    app.post('/becomeseller',profile.any(),midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');       
        cibo.users.findOne({_id:vary._id},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {               
                if(req.body.delivery_option==null)
                {  
                    if(req.body.pan_card_number.length!=10)
                    {
                        return res.status(400).json({
                            status:400,
                            message:"enter correct pan card number"
                        });
                    }
                    else if(req.body.adhar_number.length!=12)
                    {
                        return res.status(400).json({
                            status:400,
                            message:"enter correct adhar card number"
                        });
                    }                 
                    if(req.files.length!=4)
                    {
                        return res.status(400).json({
                            status:400,
                            message:"please add all images"
                        });
                    }
                    var i=0;
                    for(i;i<req.files.length;i++)
                    {                      
                        if(req.files[i].fieldname=="image")
                        {
                            image=req.files[i].location;
                           // console.log("image:",image);
                        }
                        else if(req.files[i].fieldname=="pan_card_image")
                        {
                            pan_card_image=req.files[i].location;
                            //console.log("pan:",pan_card_image);
                        }
                        else if(req.files[i].fieldname=="adhar_card_image_front")
                        {
                            adhar_card_image_front=req.files[i].location;
                           // console.log("adhar front:",adhar_card_image_front);
                        }
                        else if(req.files[i].fieldname=="adhar_card_image_back")
                        {
                            adhar_card_image_back=req.files[i].location;
                           // console.log("adhar back:",adhar_card_image_back);
                        }
                    }
                    obj={
                        image:image,
                        pan_card_number:req.body.pan_card_number,
                        pan_card_image:pan_card_image,
                        adhar_number:req.body.adhar_number,
                        adhar_card_image_front:adhar_card_image_front,
                        adhar_card_image_back:adhar_card_image_back,
                        physical_address:{
                            street_name:req.body.street_name,
                            city:req.body.city,
                            state:req.body.state,
                            pin:req.body.pin
                        } ,
                        seller:true                                                    
                    }
                    cibo.users.updateOne({_id:vary._id},obj,function(err,success){
                        //console.log("object:",obj);
                        if(err)
                        {
                            return res.status(400).json({
                                status:400,
                                message:err.message
                            });
                        }
                        else if(success)
                        {
                            return res.status(200).json({
                                status:200,
                                message:"now you become seller"
                            });                     
                        }
                    });
                }
                else
                {
                    cibo.users.updateOne({_id:vary._id},{delivery_option:req.body.delivery_option},{runValidators:true},function(err,result){
                        if(err)
                        {
                            return res.status(400).json({
                                status:400,
                                message:err.message
                            });
                        }
                        else if(result)
                        {
                            return res.status(200).json({
                                status:200,
                                message:"now you become seller"
                            });
                        }
                    }); 
                }               
            }
        });
    });
    // bank details API
    app.post('/bank_detail',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
        cibo.users.findOne({_id:vary._id},function(err,success){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(success)
            {
               // console.log("detailL:",req.body.bank_details.account_number);
                cibo.users.updateOne({_id:vary._id},{bank_details:req.body.bank_details},function(err,result){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(result)
                    {
                        return res.status(200).json({
                            status:200,
                            message:"bank details updated"
                        });
                    }
                });
            }
        });      
    });

    // items API      
    app.post('/items',profile.any(),midleware.check,function(req,res){        
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
        cibo.users.findOne({_id:vary._id},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {  
                if(req.body.active==false )
                {
                    cibo.items.updateOne({_id:req.body._id},{active:req.body.active},function(err,success){
                        if(err)
                        {
                            return res.status(400).json({
                                status:400,
                                message:err.message
                            });
                        }
                        else if(success)
                        {
                            return res.status(200).json({
                                status:200,
                                message:"item deactivate"
                            });
                        }
                    });
                } 
                else if( req.body.active==true)
                {
                    cibo.items.updateOne({_id:req.body._id},{active:req.body.active},function(err,success){
                        if(err)
                        {
                            return res.status(400).json({
                                status:400,
                                message:err.message
                            });
                        }
                        else if(success)
                        {
                            return res.status(200).json({
                                status:200,
                                message:"item activate"
                            });
                        }
                    });
                }
                else
                {
                    obj=
                    {
                        seller_id:result._id,
                        picture:req.files[0].location,
                        item_name:req.body.item_name,
                        item_category:req.body.item_category,
                        price:req.body.price,
                        description:req.body.description,
                        special_notes:req.body.special_notes                   
                    }                  
                        cibo.items.create(obj,function(err,success){
                            if(err)
                            {
                                return res.status(400).json({
                                    status:400,
                                    message:err.message
                                });
                            }
                            else if(success)
                            {
                                
                                return res.status(200).json({
                                    status:200,
                                    message:"item added successfully"
                                });
                            }
                        });
                }                                      
            }
        });
    });

    // delete item API
    app.delete('/item_delete/:item_id',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
        cibo.items.findOneAndDelete({seller_id:vary._id,_id:req.params.item_id},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:200,
                    message:err.message
                });
            }
            else if(result)
            {            
                    return res.status(200).json({
                    status:200,
                    message:"item deleted"
                });
            }
        });
    })
    // update delivery_type API
    app.post('/delivery_type',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
        cibo.users.findOneAndUpdate({_id:vary._id},{delivery_option:req.body.delivery_option},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {    
                if(req.body.delivery_option=="delivery" || req.body.delivery_option=="pickup" || req.body.delivery_option=="delivery,pickup")
                {
                    return res.status(200).json({
                        status:200,
                        message:"delivery type updated"
                    });
                }
                else
                {
                    return res.status(400).json({
                        status:400,
                        message:"delivery option not valid"
                    });
                }           
               
            }
        });
    });
    // seller home API
    app.get('/seller_home',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
        cibo.users.findOne({_id:vary._id},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {
                if(result.seller==true)
                {
                    return res.status(200).json({
                        status:200,
                        data:result.delivery_option
                    });
                }
            }
        });
    });

    // seller view items API
    app.get('/viewitem',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
        cibo.users.findOne({_id:vary._id},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {               
                if(result.seller==true)
                {
                        cibo.items.find({seller_id:vary._id},function(err,success){
                            if(err)
                            {
                                return res.status(400).json({
                                    status:400,
                                    message:err.message
                                });
                            }
                            else if(success)
                            {
                                return res.status(200).json({
                                    status:200,
                                    message:success
                                });
                            }
                        });
                } 
                // else
                // {
                //     cibo.items.findOne({_id:req.body.item_id},function(err,result){
                //         if(err)
                //         {
                //             return res.status(400).json({
                //                 status:400,
                //                 message:err.message
                //             });
                //         }
                //         else if(result)
                //         {
                //             cibo.items.find({seller_id:result.seller_id},function(err,proceed){
                //                 if(err)
                //                 {
                //                     return res.status(400).json({
                //                         status:400,
                //                         message:err.message
                //                     });
                //                 }
                //                 else if(proceed)
                //                 {
                //                     return res.status(200).json({
                //                         status:200,
                //                         data:proceed
                //                     });
                //                 }
                //             });
                //         }
                //     });
                // }              
            }
        });
    });

    // order API
    app.post('/order',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
        cibo.users.findOne({_id:vary._id},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {                
                obj={
                    user_id:result._id,
                    seller_id:req.body.seller_id, 
                    order_number:otpgen.generate(9,{ digits:true, alphabets:false, upperCase: false, specialChars: false }),                   
                    quantity:req.body.quantity,                    
                    item: req.body.item,
                    grand_total:req.body.grand_total,
                    payment_method:req.body.payment_method,
                    created_at:Date.now()    
                }
                cibo.order.create(obj,function(err,result){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(result)
                    {
                        return res.status(200).json({
                            status:200,
                            message:"order placed"
                        });
                    }
                });
                
            }
        });        
    });

    //favourite Items API
    app.post('/favourite',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
       
        cibo.users.findOne({_id:vary._id},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {
                obj={
                    item_id:req.body.item_id,                   
                    user_id:result._id,
                    status:req.body.status
                }
                cibo.favourite.create(obj,function(err,result){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(result)
                    {
                        return res.status(200).json({
                            status:200,
                            data:result
                        });
                    }
                });
            }
        });
        
    });

    // edit profile API
    app.post('/edit_profile',profile.any(),midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
        cibo.users.findOne({_id:vary._id},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {   
                if(req.files)
                {
                    obj={
                        name:req.body.name,
                        image:req.files[0].location,
                        email:req.body.email,
                        phone_no:req.body.phone_no,
                        bio:req.body.bio
                    }
                    cibo.users.updateOne({_id:result._id},obj,function(err,result){
                        if(err)
                        {
                            return res.status(400).json({
                                status:400,
                                message:err.message
                            });
                        }
                        else if(result)
                        {
                            return res.status(200).json({
                                status:200,
                                message:"profile updated"
                            });
                        }
                    });
                }  
                else
                {
                    obj={
                        name:req.body.name,                       
                        email:req.body.email,
                        phone_no:req.body.phone_no,
                        bio:req.body.bio
                    }
                    cibo.users.updateOne({_id:result._id},obj,function(err,result){
                        if(err)
                        {
                            return res.status(400).json({
                                status:400,
                                message:err.message
                            });
                        }
                        else if(result)
                        {
                            return res.status(200).json({
                                status:200,
                                message:"profile updated"
                            });
                        }
                    });
                }       
         
                   
        }
    });
   });

   // change password API
   app.post('/change_password',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {
               if(pass.test(req.body.old_password)==false ||req.body.old_password==' '|| req.body.old_password==null)
               {
                   return res.status(400).json({
                       status:400,
                       message:"invalid password"
                   });
               }
               else if(pass.test(req.body.new_password)==false || req.body.new_password==' '|| req.body.new_password==null)
               {
                    return res.status(400).json({
                        status:400,
                        message:"invalid password"
                    });
               }

               else
               {
                    console.log("old pass:",req.body.old_password);
                    req.body.old_password=md(req.body.old_password);
    
                    if(req.body.old_password==result.password)
                    {                   
                        if(pass.test(req.body.new_password)==false||req.body.new_password==''||req.body.new_password==null)
                            {
                                return res.status(400).json({
                                    status:400,
                                    message:"password should be minimum 6 digits"
                                });
                            }
                            else
                            {
                                req.body.new_password=md(req.body.new_password);
                                cibo.users.updateOne({_id:vary._id},{password:req.body.new_password,confirm_password:req.body.new_password},function(err,success){
                                    if(err)
                                    {
                                        return res.status(400).json({
                                            status:400,
                                            message:err.message
                                        });
                                    }
                                    else if(success)
                                    {
                                        return res.status(200).json({
                                            status:200,
                                            message:"password updated"
                                        });
                                    }
    
                                })
                            }
                    }
                    else
                    {
                        return res.status(400).json({
                            status:400,
                            message:"old password doesn't match!! please check "
                        });
                    }
               }
           
           }
       });
   });

   // schedule API
   app.post('/schedule',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOneAndUpdate({_id:vary._id},{schedule:req.body.schedule},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {
            return res.status(200).json({
                status:200,
                message:"updated"
            });
           }
       })
   });

   // Blog API
   app.post('/blog',profile.any(),midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {
               obj=
               {
                   pictures:req.files[0].location,
                   user_id:result._id,
                   title:req.body.title,
                   description:req.body.description,
                   created_at:Date.now().toString()
               }
              cibo.blog.create(obj,function(err,success){
                  if(err)
                  {
                    return res.status(400).json({
                        status:400,
                        message:err.message
                    });
                  }
                  else if(success)
                  {
                    return res.status(200).json({
                        status:200,
                        message:"blog added"
                    });
                  }
              });
           }
       });
   });

   // view blog API
   app.get('/view_blog',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.blog.find({user_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {
              cibo.blog.aggregate([
                  {
                      $lookup:
                      {
                          from:'users',
                          let:
                          {
                              userid:"$user_id"
                          },
                          pipeline:
                          [
                              {
                                  $match:
                                  {
                                      $expr:
                                      {
                                          $eq:["$$userid","$_id"]
                                      }
                                  }
                              }
                          ],
                          as:"blogs"
                      }
                  },
                  {
                      $unwind:"$blogs"
                  },
                  {
                      $project:
                      {
                          pictures:1,
                          title:1,
                          description:1,
                          created_at:1,
                          "name":"$blogs.name"
                      }
                  },
                  {
                      $sort:{created_at:-1}
                  }
              ],function(err,success){
                  if(err)
                  {
                      return res.status(400).json({
                          status:400,
                          message:err.message
                      });
                  }
                  else if(success)
                  {
                      return res.status(200).json({
                          status:200,
                          data:success
                      });
                  }
              });
           }
       });
   });

   // get order API
   app.get('/view_order',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');             
       cibo.users.findOne({_id:vary._id},function(err,result){
          
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {              
               if(result.seller==true)
               {
                   console.log("id:",result._id);
                   cibo.order.aggregate([
                       {
                           $lookup:
                           {
                               from:'users',
                               let:
                               {
                                   id:"$seller_id"
                               },
                               pipeline:
                               [
                                   {
                                       $match:
                                       {
                                           $expr:
                                           {
                                            $and:
                                            [                                                                                                
                                                {$eq:["$$id","$_id"]}                                               
                                            ]    
                                           }                                        
                                       }
                                   }
                               ],
                               as:"order"
                           }
                       },
                       {
                           $unwind:"$order"
                       },
                       {
                           $addFields:
                           {
                               deliverytype:"$order.delivery_option",                               
                           }
                       },
                       {
                           $project:
                           {
                               item:1,
                               order_status:1,
                               order_number:1,
                              // total_pay:1,
                              grand_total:1,
                               deliverytype:1,
                               created_at:1
                           }
                       }
                   ],function(err,success){
                       if(err)
                       {
                           return res.status(400).json({
                               status:400,
                               message:err.message
                           });
                       }
                       else if(success)
                       {
                           return res.status(200).json({
                               status:200,
                               data:success
                           });
                       }
                   });
               }
               else
               {                  
                  cibo.order.aggregate([
                        {
                            $lookup:
                            {
                                from:'users',
                                let:
                                {
                                    sellerid:"$seller_id",
                                    orderid:"$order_number",
                                    userid:"$user_id",
                                    orderstatus:"$order_status"
                                },
                                pipeline:
                                [
                                    {
                                        $match:
                                        {
                                            $expr:
                                            {
                                                $and:
                                                [
                                                    {$eq:["$$sellerid","$_id"] },                                                    
                                                    {$eq:["$$userid",mongoose.Types.ObjectId(vary._id)]},
                                                    //{$eq:["$review.user_id",mongoose.Types.ObjectId(vary._id)]}
                                                    // {$ne:["$$orderstatus","pending"]}
                                                ]                                              
                                            }
                                        }
                                    }
                                ],
                                as:"seller"                                
                            }
                        },
                        {
                            $unwind:"$seller"
                        },                     
                        {
                            $addFields:
                            {
                                sellername:"$seller.name",
                                review:"$seller.review"                               
                            }
                        },
                        {
                            $project:
                            {
                                order_status:1,
                                item:1, 
                                review:1,                              
                                order_number:1,
                                grand_total:1,
                                created_at:1,
                                sellername:1,                                
                            }
                        }
                    ],function(err,result1)
                    {
                        if(err)
                        {
                            return res.status(400).json({
                                status:400,
                                message:err.message
                            });
                        }
                        else if(result1)
                        {
                            return res.status(200).json({
                                status:200,
                                data:result1
                            });
                        }
                    }).sort({_id:-1});
               }              
           }
       });
   });

   // accept order API
   app.post('/accept_order',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.order.findOne({seller_id:vary._id,order_number:req.body.order_number},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {
               var order;
               if(req.body.status=="accept")
               {
                   order=req.body.status;
               }
               else if(req.body.status=="reject")
               {
                   order=req.body.status;
               }
               else if(req.body.status=="cancel")
               {
                   order="cancelled";
               }
               else if(req.body.status=="submit_order_delivery" || req.body.status=="submit_order_pickup")
               {
                      order="completed";
               }
               else
               {
                   return res.status(400).json({
                       status:400,
                       message:"status not valid"
                   });
               }
               cibo.order.updateOne({order_number:result.order_number},{order_status:order},function(err,success){
                   if(err)
                   {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                   }
                   else if(success)
                   {
                    return res.status(200).json({
                        status:200,
                        message:"done"
                    });
                   }
               });
           }
           else 
           {
               return res.status(400).json({
                   status:400,
                   message:"seller not found"
               });
           }
       });
   });

   // new item API
   app.get('/user_new_item',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
            {                    
                if(result.delivery_option=="delivery") 
                {
                    cibo.items.aggregate([
                        {
                            $lookup:
                            {
                                from:"users",
                                let:
                                {
                                    sellerid:"$seller_id",
                                    active:"$active"                                   
                                },
                                pipeline:
                                [                                
                                    {
                                        $geoNear:
                                        {
                                            near:result.location,
                                            distanceField:"dist.distance",
                                            maxDistance:150*1000,
                                            spherical: true
                                        }
                                    },
                                    {
                                        $match:
                                        {
                                            $expr:
                                            {
                                                $and:[
                                                    {
                                                        $eq:["$$sellerid","$_id"]
                                                    },{
                                                        $ne:["$$sellerid",mongoose.Types.ObjectId(vary._id)]
                                                    },
                                                    // {
                                                    //     $eq:["$$active",true]
                                                    // }, 
                                                    {
                                                        $ne:["$delivery_option","pickup"]                                                      
                                                        
                                                    }                                                                                       
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as:"seller"                            
                            }
                        },
                        {
                            $unwind:"$seller"
                        },
                        {
                          $addFields:
                          {
                              distance:"$seller.dist.distance"
                          }
                        },
                        {
                            $project:
                            {
                                picture:1,
                                item_name:1,  
                                distance:{ $round: [ "$distance", 1] }                                        
                            }
                        }                    
                       
                    ],function(err,success){
                        if(err)
                        {
                            return res.status(400).json({
                                status:400,
                                message:err.message
                            });
                        }
                        else if(success)
                        {                       
                            return res.status(200).json({
                                status:200,
                                data:success
                            });
                        }
                    }).sort({_id:-1});
                } 
                else
                {
                    cibo.items.aggregate([
                        {
                            $lookup:
                            {
                                from:"users",
                                let:
                                {
                                    sellerid:"$seller_id",
                                    active:"$active"                                   
                                },
                                pipeline:
                                [                                
                                    {
                                        $geoNear:
                                        {
                                            near:result.location,
                                            distanceField:"dist.distance",
                                            maxDistance:150*1000,
                                            spherical: true
                                        }
                                    },
                                    {
                                        $match:
                                        {
                                            $expr:
                                            {
                                                $and:[
                                                    {
                                                        $eq:["$$sellerid","$_id"]
                                                    },{
                                                        $ne:["$$sellerid",mongoose.Types.ObjectId(vary._id)]
                                                    },
                                                    // {
                                                    //     $eq:["$$active",true]
                                                    // }, 
                                                    {
                                                        $ne:["$delivery_option","delivery"]                                                      
                                                        
                                                    }                                                                                       
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as:"seller"                            
                            }
                        },
                        {
                            $unwind:"$seller"
                        },
                        {
                          $addFields:
                          {
                              distance:"$seller.dist.distance"
                          }
                        },
                        {
                            $project:
                            {
                                picture:1,
                                item_name:1,  
                                distance:1                                         
                            }
                        }                    
                       
                    ],function(err,success){
                        if(err)
                        {
                            return res.status(400).json({
                                status:400,
                                message:err.message
                            });
                        }
                        else if(success)
                        {                       
                            return res.status(200).json({
                                status:200,
                                data:success
                            });
                        }
                    }).sort({_id:-1});
                }    
            }
       });
   });  

   // add_to_cart API
   app.post('/add_cart',midleware.check,function(req,res){      
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {               
               cibo.cart.findOne({item_id:req.body.item_id},function(err,success){
                   if(err)
                   {
                       return res.status(400).json({
                           status:400,
                           message:err.message
                       });
                   }
                   else if(success)
                   { 
                        return res.status(400).json({
                            status:400,
                            message:"item already exists"
                        });               
                   }
                   else
                   {
                       cibo.items.findOne({_id:req.body.item_id},function(err,proceed){
                           if(err)
                           {
                                return res.status(400).json({
                                    status:400,
                                    message:err.message
                                });
                           }
                           else if(proceed)
                           {                               
                               if(proceed.seller_id==req.body.seller_id)
                               {
                                   obj={
                                           user_id:result._id,
                                           seller_id:req.body.seller_id,
                                           item_id:req.body.item_id,
                                           item_name:req.body.item_name,
                                           quantity:req.body.quantity,
                                           price:req.body.price,
                                           picture:req.body.picture,
                                           special_instruction:req.body.special_instruction,
                                           total_pay:req.body.price*req.body.quantity
                                       }
                                       cibo.cart.create(obj,function(err,success1){
                                           if(err)
                                           {
                                               return res.status(400).json({
                                                   status:400,
                                                   message:err.message
                                               });
                                           }
                                           else if(success1)
                                           {
                                               return res.status(200).json({
                                                   status:200,
                                                   data:success1,
                                                   message:"item added to cart"
                                               });
                                           }
                                       });
                               }
                               else 
                               {
                                   return res.status(400).json({
                                       status:400,
                                       message:"item id must be of same seller"
                                   })
                               }
                           }
                       })
                       
                   }                 
               });                     
            }
       });
   });

   // view cart API
   app.get('/view_cart',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');  
      
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {
              cibo.cart.aggregate([
                  {
                      $lookup:
                      {
                          from:'users',
                          let:{
                              id:"$user_id"
                          },
                          pipeline:
                          [
                            {
                                $match:
                                {
                                    $expr:
                                    {                                      
                                      $eq:["$$id","$_id"]
                                                                                                                          
                                    }
                                }
                            }
                          ],
                          as:"items"
                      }
                  },
                  {$unwind:"$items"},
                  {
                      $addFields:
                      {
                          lat:"$item.lat",
                         long:"$item.long"
                      }
                  },
                  {
                      $project:
                      {    seller_id:1,                     
                          picture:1,
                          item_name:1,
                          quantity:1,
                          price:1,
                         // total_pay:1,
                         item_id:1                        
                      }
                  }
              ],function(err,result1){
                  if(err)
                  {
                      return res.status(400).json({
                          status:400,
                          message:err.message
                      });
                  }
                  else if(result1)
                  {                     
                      var grand_total=0;
                      for(var i=0;i<result1.length;i++)
                      {
                        grand_total=grand_total+result1[i].price*result1[i].quantity;                         
                      }
                      return res.status(200).json({
                          status:200,
                          grand_total:grand_total,
                          data:result1
                      });
                  }
              });
           }
       });
   });

   // delete from cart API
   app.delete('/delete_cart_item/:item_id',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');      
      cibo.cart.find({user_id:vary._id},function(err,result){
          if(err)
          {
              return res.status(400).json({
                  status:400,
                  message:err.message
              });
          }
          else if(result)
          {             
              cibo.cart.deleteOne({item_id:req.params.item_id},function(err,success){
                  if(err)
                  {
                    return res.status(400).json({
                        status:400,
                        message:err.message
                    });
                  }
                  else if(success)
                  {
                    return res.status(200).json({
                        status:200,
                        message:"item deleted from your cart"
                    });
                  }
              })
          }
      })
   })

   // view only item API
   app.get('/only_item/:item_id',midleware.check,function(req,res){
    token=req.headers.authorization.split(' ')[1];
    var vary=jwt.verify(token,'ram');
    cibo.users.findOne({_id:vary._id},function(err,result){
        if(err)
        {
            return res.status(400).json({
                status:400,
                message:err.message
            });
        }
        else if(result)
         {                
             cibo.items.aggregate([
                 {
                     $lookup:
                     {
                         from:"users",
                         let:
                         {
                             sellerid:"$seller_id",
                             id:"$_id"
                         },
                         pipeline:
                         [                                
                             {
                                 $geoNear:
                                 {
                                     near:result.location,
                                     distanceField:"dist.distance",
                                     maxDistance:150*1000,
                                     spherical: true
                                 }
                             },
                             {
                                 $match:
                                 {
                                     $expr:
                                     {
                                         $and:[
                                             {
                                                 $eq:["$$sellerid","$_id"]
                                             },{
                                                 $eq:["$$id",mongoose.Types.ObjectId(req.params.item_id)]
                                             }                                           
                                         ]
                                     }
                                 }
                             }
                         ],
                         as:"seller"                            
                     }
                 },
                 {
                     $unwind:"$seller"
                 },
                 {
                   $addFields:
                   {
                       seller_id:"$seller._id",
                       distance:"$seller.dist.distance",
                       seller_name:"$seller.name"
                   }
                 },
                 {
                     $project:
                     {
                         picture:1,
                         item_name:1, 
                         price:1, 
                         seller_id:1,
                         seller_name:1,
                         distance:{ $round: [ "$distance", 1] }                                        
                     }
                 }                    
                
             ],function(err,success){
                 if(err)
                 {
                     return res.status(400).json({
                         status:400,
                         message:err.message
                     });
                 }
                 else if(success)
                 {                       
                     return res.status(200).json({
                         status:200,
                         data:success
                     });
                 }
             }).sort({_id:-1});
         }
    });
   });

   // view favourite API
   app.get('/view_favourite',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:"error"+err.message
               });
           }
           else if(result)
           {
               cibo.items.aggregate([
                   {
                       $lookup:
                       {
                           from:"favourites",
                           let:{
                               id:"$_id",
                               userid:mongoose.Types.ObjectId(vary._id)
                           },
                           pipeline:[
                               {
                                   $match:
                                   {
                                       $expr:
                                       {
                                           $and:[
                                               {
                                                $eq:["$$id","$item_id"]  
                                               },
                                               {
                                                   $eq:["$$userid","$user_id"]
                                               }                                        
                                           ]
                                       }
                                   }
                               }
                           ],
                           as:"fav"
                       }
                   },
                   {
                       $unwind:"$fav"
                   },
                   {
                    $lookup:
                    {
                        from:"users",
                        let:
                        {
                            sellerid:"$seller_id"
                        },
                        pipeline:
                        [                                
                            {
                                $geoNear:
                                {
                                    near:result.location,
                                    distanceField:"dist.distance",
                                    maxDistance:150*1000,
                                    spherical: true
                                }
                            },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:[
                                            {
                                                $eq:["$$sellerid","$_id"]
                                            },{
                                                $ne:["$$sellerid",mongoose.Types.ObjectId(vary._id)]
                                            }                                           
                                        ]
                                    }
                                }
                            }
                        ],
                        as:"seller"                            
                    }
                },
                {
                   $unwind:"$seller"
                },
                {
                    $addFields:
                    {
                        seller_name:"$seller.name",
                        distance:"$seller.dist.distance"
                    }

                },
                {
                    $project:
                    {
                        picture:1,
                        item_name:1,
                        price:1,
                        seller_name:1,
                       // "seller.name":1,
                       distance:{ $round: [ "$distance", 1] }
                    }
                }
               ],function(err,success){
                   if(err)
                   {
                       return res.status(400).json({
                           status:400,
                           message:err.message
                       });
                   }
                   else if(success)
                   {
                       return res.status(200).json({
                           status:200,
                           data:success
                       });
                   }
               });
           }
       });
   });

   // view profile API
   app.get('/view_profile',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {
               if(result.seller==true)
               {
                    var sum=0,rating,rating1;         
                    for(var i=0;i<result.review.length;i++)
                    {               
                    sum=sum + result.review[i].rating;
                    }
                    rating=sum/result.review.length;
                    rating1=rating.toFixed(1);
                    // console.log("top:",typeof(rating1));
                    obj={
                        name:result.name,
                        image:result.image,
                        email:result.email,
                        phone_no:result.phone_no,
                        bio:result.bio
                    }
                    return res.status(200).json({
                        status:200,
                        rating:rating1, 
                        reviews:result.review.length,               
                        data:obj
                    });
               } 
               else
               {
                    obj={
                        name:result.name,
                        image:result.image,
                        email:result.email,
                        phone_no:result.phone_no,
                        bio:result.bio
                    }
                    return res.status(200).json({
                        status:200,                                       
                        data:obj
                    });
               }        
           }
       });
   });

   // delete favourite item API
   app.delete('/delete_favourite_item/:item_id',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.favourite.findOneAndDelete({user_id:vary._id,item_id:req.params.item_id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:200,
                   message:err.message
               });
           }
           else if(result)
           {
            //    cibo.favourite.deleteOne({item_id:req.body.item_id},function(err,success){
            //        if(err)
            //        {
            //            return res.status(400).json({
            //                status:400,
            //                message:err.message
            //            });
            //        }
            //        else if(success)
            //        {
            //            return res.status(200).json({
            //                status:200,
            //                message:"item deleted"
            //            });
            //        }
            //    });
                             return res.status(200).json({
                               status:200,
                               message:"item deleted"
                           });
           }
       });
   });

   // edit item API
   app.post('/edit_item',profile.any(),midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {
               if(req.body.picture)
               {
                    obj=
                    {
                        seller_id:result._id,
                        picture:req.files[0].location,
                        item_name:req.body.item_name,
                        item_category:req.body.item_category,
                        price:"Rs "+req.body.price,
                        description:req.body.description,
                        special_notes:req.body.special_notes,
                        active:req.body.active
                    }               
                    cibo.items.updateOne({seller_id:result._id,_id:mongoose.Types.ObjectId(req.body._id)},obj,function(err,result){
                        if(err)
                        {
                            return res.status(400).json({
                                status:400,
                                message:err.message
                            });
                        }
                        else if(result)
                        {
                            return res.status(200).json({
                                status:200,
                                message:"item updated",
                                data:obj
                            });
                        }
                    });
               }
               else
               {
                obj=
                {
                    seller_id:result._id,                   
                    item_name:req.body.item_name,
                    item_category:req.body.item_category,
                    price:"Rs "+req.body.price,
                    description:req.body.description,
                    special_notes:req.body.special_notes,
                    active:req.body.active
                }               
                cibo.items.updateOne({seller_id:result._id,_id:mongoose.Types.ObjectId(req.body._id)},obj,function(err,result){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(result)
                    {
                        return res.status(200).json({
                            status:200,
                            message:"item updated",
                            data:obj
                        });
                    }
                });
               }
         
           }
       });
   });

   // view user by seller API
   app.get('/view_user',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {
               cibo.order.aggregate([
                   {
                       $lookup:
                       {
                           from:'users',
                           let:
                           {
                               userid:"$user_id",
                               sellerid:"$seller_id"
                           },
                           pipeline:
                           [
                               {
                                   $match:
                                   {
                                       $expr:
                                       {
                                           $and:[
                                               {
                                                $eq:["$$userid","$_id"],
                                               },
                                               {
                                                $eq:["$$sellerid",mongoose.Types.ObjectId(vary._id)]
                                               }                                         
                                           ]                                          
                                       }
                                   }
                               }
                           ],
                           as:"viewuser"
                       }
                   },
                   {
                       $unwind:"$viewuser"
                   },
                   {
                       $addFields:
                       {
                           username:"$viewuser.name",
                           deliverytype:"$viewuser.delivery_option"
                       }
                   },
                   {
                       $project:
                       {
                           quantity:1,
                           total_pay:1,
                           item:1,
                           username:1,
                           deliverytype:1                         
                       }
                   }
               ],function(err,success){
                   if(err)
                   {
                       return res.status(400).json({
                           status:400,
                           message:err.message
                       });
                   }
                   else if(success)
                   {
                       return res.status(200).json({
                           status:200,
                           data:success
                       });
                   }
               });
           }
       });
   });

   // review API
   app.post('/review',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {              
              req.body.review.forEach(element => {
                
                cibo.users.updateOne({_id:req.body.seller_id},{ $push:{review:{$each:[{user_id:result._id,order_id:element.order_id,rating:element.rating,message:element.message}]}}},function(err,success){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(success)
                    {
                        return res.status(200).json({
                            status:200,
                            data:"review added"
                        });
                    }
                });
              });               
           }
       });
   });

   // view_review API
   app.get('/view_review',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {              
               return res.status(200).json({
                   status:200,                  
                   data:result.review
               });
           }
       });
   });

   // filter API
   app.post('/filter',midleware.check,function(req,res){
      token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:rr.message
               });
           }
           else if(result)
           {
               if(req.body.price && req.body.range)
               {
                cibo.items.aggregate([
                    {
                        $lookup:
                        {
                            from:'users',
                            let:
                            {
                                sellerid:"$seller_id",
                                prices:"$price"
                            },
                            pipeline:
                            [
                             {
                                 $geoNear:
                                 {
                                     near:result.location,
                                     distanceField:"dist.distance",
                                     maxDistance:req.body.range*1000,
                                     spherical: true
                                 }
                             },
                                {
                                    $match:
                                    {
                                        $expr:
                                        {
                                            $and:[
                                                { $eq:["$$sellerid","$_id"] },
                                                { $lte:["$$prices",req.body.price] }                                            
                                            ]                                         
                                        }
                                    }
                                }
                            ],
                            as:"filter"
                        }
                    },
                    {
                        $unwind:"$filter"
                    },
                    {
                        $addFields:
                        {
                            sellername:"$filter.name",
                            distance:"$filter.dist.distance"
                        }
                    },
                    {
                      $sort:{price:-1}
                    },
                    {
                        $project:
                        {
                            item_name:1,
                            picture:1,
                            price:1,
                           sellername:1,
                           distance:{ $round: [ "$distance", 0] }
                        }
                    }
                ],function(err,success){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(success)
                    {
                        return res.status(200).json({
                            status:200,
                            data:success
                        });
                    }
                });
               }
               else if(req.body.price)
               {
                cibo.items.aggregate([
                    {
                        $lookup:
                        {
                            from:'users',
                            let:
                            {
                                sellerid:"$seller_id",
                                prices:"$price"
                            },
                            pipeline:
                            [                           
                                {
                                    $match:
                                    {
                                        $expr:
                                        {
                                            $and:[
                                                { $eq:["$$sellerid","$_id"] },
                                                { $lte:["$$prices",req.body.price] }                                            
                                            ]                                         
                                        }
                                    }
                                }
                            ],
                            as:"filter"
                        }
                    },
                    {
                        $unwind:"$filter"
                    },
                    {
                        $addFields:
                        {
                            sellername:"$filter.name",
                            distance:"$filter.dist.distance"
                        }
                    },
                    {
                      $sort:{price:-1}
                    },
                    {
                        $project:
                        {
                            item_name:1,
                            picture:1,
                            price:1,
                           sellername:1,
                           distance:{ $round: [ "$distance", 0] }
                        }
                    }
                ],function(err,success){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(success)
                    {
                        return res.status(200).json({
                            status:200,
                            data:success
                        });
                    }
                });
               }
               else if(req.body.range)
               {
                cibo.items.aggregate([
                    {
                        $lookup:
                        {
                            from:'users',
                            let:
                            {
                                sellerid:"$seller_id",
                                prices:"$price"
                            },
                            pipeline:
                            [
                             {
                                 $geoNear:
                                 {
                                     near:result.location,
                                     distanceField:"dist.distance",
                                     maxDistance:req.body.range*1000,
                                     spherical: true
                                 }
                             },
                                {
                                    $match:
                                    {
                                        $expr:
                                        {
                                            $and:[
                                                { $eq:["$$sellerid","$_id"] }
                                                //{ $lte:["$$prices",req.body.price] }                                            
                                            ]                                         
                                        }
                                    }
                                }
                            ],
                            as:"filter"
                        }
                    },
                    {
                        $unwind:"$filter"
                    },
                    {
                        $addFields:
                        {
                            sellername:"$filter.name",
                            distance:"$filter.dist.distance"
                        }
                    },
                    {
                      $sort:{price:-1}
                    },
                    {
                        $project:
                        {
                            item_name:1,
                            picture:1,
                            price:1,
                           sellername:1,
                           distance:{ $round: [ "$distance", 0] }
                        }
                    }
                ],function(err,success){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(success)
                    {
                        return res.status(200).json({
                            status:200,
                            data:success
                        });
                    }
                });
               }
               else if(req.body.price && req.body.range && req.body.sort_by_popularity)
               {

               }
               else if(req.body.price && req.body.range && req.body.sort_by_popularity || req.body.sort_by_rating || req.body.sort_by_high || req.body.sort_by_low)
               {
                cibo.items.aggregate([
                           {
                               $lookup:
                               {
                                   from:'users',
                                   let:
                                   {
                                       sellerid:"$seller_id",
                                       prices:"$price"
                                   },
                                   pipeline:
                                   [
                                    {
                                        $geoNear:
                                        {
                                            near:result.location,
                                            distanceField:"dist.distance",
                                            maxDistance:req.body.range*1000,
                                            spherical: true
                                        }
                                    },
                                       {
                                           $match:
                                           {
                                               $expr:
                                               {
                                                   $and:[
                                                       { $eq:["$$sellerid","$_id"] },
                                                       { $lte:["$$prices",req.body.price] }                                            
                                                   ]                                         
                                               }
                                           }
                                       }
                                   ],
                                   as:"filter"
                               }
                           },
                           {
                               $unwind:"$filter"
                           },
                           {
                               $addFields:
                               {
                                   sellername:"$filter.name",
                                   distance:"$filter.dist.distance"
                               }
                           },
                           {
                             $sort:{price:-1}
                           },
                           {
                               $project:
                               {
                                   item_name:1,
                                   picture:1,
                                   price:1,
                                  sellername:1,
                                  distance:{ $round: [ "$distance", 0] }
                               }
                           }
                       ],function(err,success){
                           if(err)
                           {
                               return res.status(400).json({
                                   status:400,
                                   message:err.message
                               });
                           }
                           else if(success)
                           {
                               return res.status(200).json({
                                   status:200,
                                   data:success
                               });
                           }
                       });
               }
               else if(req.body.price && req.body.range && req.body.sort_by_popularity && req.body.sort_by_rating && req.body.sort_by_high || req.body.sort_by_low)
               {
                cibo.items.aggregate([
                           {
                               $lookup:
                               {
                                   from:'users',
                                   let:
                                   {
                                       sellerid:"$seller_id",
                                       prices:"$price"
                                   },
                                   pipeline:
                                   [
                                    {
                                        $geoNear:
                                        {
                                            near:result.location,
                                            distanceField:"dist.distance",
                                            maxDistance:req.body.range*1000,
                                            spherical: true
                                        }
                                    },
                                       {
                                           $match:
                                           {
                                               $expr:
                                               {
                                                   $and:[
                                                       { $eq:["$$sellerid","$_id"] },
                                                       { $lte:["$$prices",req.body.price] }                                            
                                                   ]                                         
                                               }
                                           }
                                       }
                                   ],
                                   as:"filter"
                               }
                           },
                           {
                               $unwind:"$filter"
                           },
                           {
                               $addFields:
                               {
                                   sellername:"$filter.name",
                                   distance:"$filter.dist.distance"
                               }
                           },
                           {
                             $sort:{price:-1}
                           },
                           {
                               $project:
                               {
                                   item_name:1,
                                   picture:1,
                                   price:1,
                                  sellername:1,
                                  distance:{ $round: [ "$distance", 0] }
                               }
                           }
                       ],function(err,success){
                           if(err)
                           {
                               return res.status(400).json({
                                   status:400,
                                   message:err.message
                               });
                           }
                           else if(success)
                           {
                               return res.status(200).json({
                                   status:200,
                                   data:success
                               });
                           }
                       });

               }
            //    cibo.items.aggregate([
            //        {
            //            $lookup:
            //            {
            //                from:'users',
            //                let:
            //                {
            //                    sellerid:"$seller_id",
            //                    prices:"$price"
            //                },
            //                pipeline:
            //                [
            //                 {
            //                     $geoNear:
            //                     {
            //                         near:result.location,
            //                         distanceField:"dist.distance",
            //                         maxDistance:req.body.range*1000,
            //                         spherical: true
            //                     }
            //                 },
            //                    {
            //                        $match:
            //                        {
            //                            $expr:
            //                            {
            //                                $and:[
            //                                    { $eq:["$$sellerid","$_id"] },
            //                                    { $lte:["$$prices",req.body.price] }                                            
            //                                ]                                         
            //                            }
            //                        }
            //                    }
            //                ],
            //                as:"filter"
            //            }
            //        },
            //        {
            //            $unwind:"$filter"
            //        },
            //        {
            //            $addFields:
            //            {
            //                sellername:"$filter.name",
            //                distance:"$filter.dist.distance"
            //            }
            //        },
            //        {
            //          $sort:{price:-1}
            //        },
            //        {
            //            $project:
            //            {
            //                item_name:1,
            //                picture:1,
            //                price:1,
            //               sellername:1,
            //               distance:{ $round: [ "$distance", 0] }
            //            }
            //        }
            //    ],function(err,success){
            //        if(err)
            //        {
            //            return res.status(400).json({
            //                status:400,
            //                message:err.message
            //            });
            //        }
            //        else if(success)
            //        {
            //            return res.status(200).json({
            //                status:200,
            //                data:success
            //            });
            //        }
            //    });
           }
       });
   });

   // add bio API
   app.post('/add_bio',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOneAndUpdate({_id:vary._id},{bio:req.body.bio},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {
               return res.status(200).json({
                   status:200,
                   message:"bio added"
               });
           }
       });
   });

   // search API
   app.post('/search',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {              
               if(result.delivery_option=="delivery")
               {                
                 cibo.items.aggregate([                
                    {
                        $match:
                        {
                             $or:[
                             {item_name:{$regex:req.body.text,$options:"i"} },
                            {item_category:{$regex:req.body.text,$options:"i"} }
                             ]
                        }             
                     },  
                    {
                        $lookup:
                        {
                            from:"users",
                            let:
                            {
                                sellerid:"$seller_id",
                                active:"$active",
                                itmename:"$item_name"                                   
                            },
                            pipeline:
                            [                            
                                {
                                    $geoNear:
                                    {
                                        near:result.location,
                                        distanceField:"dist.distance",
                                        maxDistance:150*1000,
                                        spherical: true
                                    }
                                },
                                {
                                    $match:
                                    {                                    
                                        $expr:
                                        {
                                            $and:[
                                                {
                                                    $eq:["$$sellerid","$_id"]
                                                },
                                                {
                                                    $ne:["$$sellerid",mongoose.Types.ObjectId(vary._id)]
                                                },
                                                // {
                                                //     $eq:["$$active",true]
                                                // }, 
                                                {
                                                    $ne:["$delivery_option","pickup"]             
                                                }                                                                                                                                                                                                                 
                                            ]
                                        }
                                    }
                                }
                            ],
                            as:"seller"                            
                        }
                    },

                    {
                        $unwind:"$seller"
                    },

                    {
                    $addFields:
                    {
                        distance:"$seller.dist.distance"
                    }
                    },

                    {
                        $project:
                        {
                            picture:1,
                            item_name:1,  
                            distance:{ $round: [ "$distance", 1] }                                        
                        }
                    }                   
                 ],function(err,success){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(success)
                    {                       
                        return res.status(200).json({
                            status:200,
                            data:success
                        });
                    }
                 });
               }
        else
        {
            cibo.items.aggregate([                
                {
                    $match:
                    {
                         $or:[
                         {item_name:{$regex:req.body.text,$options:"i"} },
                        {item_category:{$regex:req.body.text,$options:"i"} }
                         ]
                    }             
                 },  
                {
                    $lookup:
                    {
                        from:"users",
                        let:
                        {
                            sellerid:"$seller_id",
                            active:"$active",
                            itmename:"$item_name"                                   
                        },
                        pipeline:
                        [                            
                            {
                                $geoNear:
                                {
                                    near:result.location,
                                    distanceField:"dist.distance",
                                    maxDistance:150*1000,
                                    spherical: true
                                }
                            },
                            {
                                $match:
                                {                                    
                                    $expr:
                                    {
                                        $and:[
                                            {
                                                $eq:["$$sellerid","$_id"]
                                            },
                                            {
                                                $ne:["$$sellerid",mongoose.Types.ObjectId(vary._id)]
                                            },
                                            // {
                                            //     $eq:["$$active",true]
                                            // }, 
                                            {
                                                $ne:["$delivery_option","delivery"]             
                                            }                                                                                                                                                                                                                 
                                        ]
                                    }
                                }
                            }
                        ],
                        as:"seller"                            
                    }
                },

                {
                    $unwind:"$seller"
                },

                {
                $addFields:
                {
                    distance:"$seller.dist.distance"
                }
                },

                {
                    $project:
                    {
                        picture:1,
                        item_name:1,  
                        distance:{ $round: [ "$distance", 1] }                                        
                    }
                }                   
             ],function(err,success){
                if(err)
                {
                    return res.status(400).json({
                        status:400,
                        message:err.message
                    });
                }
                else if(success)
                {                       
                    return res.status(200).json({
                        status:200,
                        data:success
                    });
                }
            });
        }
            
           }
       })
   }); 

   // trending items API
   app.get('/trending',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1];
       var vary=jwt.verify(token,'ram');
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {
               cibo.items.aggregate([
                   {
                       $lookup:
                       {
                           from:'favourites',
                           let:
                           {
                               itemid:"$_id"
                           },
                           pipeline:
                           [
                               {
                                   $match:
                                   {
                                       $expr:
                                       {
                                           $eq:["$$itemid","$item_id"]
                                       }
                                   }
                               },
                               {
                                   $count:"status"
                               }
                           ],
                           as:"trend"
                       }
                   },                                  
                   {
                       $unwind:"$trend"
                   },
                  
                   {
                       $lookup:
                       {
                           from:'users',
                           let:
                           {
                               sellerid:"$seller_id"
                           },
                           pipeline:
                           [
                                {
                                    $geoNear:
                                    {
                                        near:result.location,
                                        distanceField:"dist.distance",
                                        maxDistance:150*1000,
                                        spherical: true
                                    }
                                },

                               {
                                   $match:
                                   {
                                       $expr:
                                       {
                                           $eq:["$$sellerid","$_id"]
                                       }
                                   }
                               }
                           ],
                           as:"trend1"
                       }
                   },
                   {
                       $unwind:"$trend1"
                   },
                   {
                       $addFields:
                       {
                           distance:"$trend1.dist.distance",
                           count:"$trend.status"
                       }
                   },
                   {
                       $project:
                       {
                           item_name:1,
                           picture:1,
                           distance:{ $round: [ "$distance", 1] } ,
                           count:1
                       }
                   },
                   {
                    $sort:{count:-1}
                    },
                    { 
                        $limit : 5
                    }
               ],function(err,success){
                   if(err)
                   {
                       return res.status(400).json({
                           status:400,
                           message:err.message
                       });
                   }
                   else if(success)
                   {
                       return res.status(200).json({
                           status:200,
                           data:success
                       });
                   }
               });
           }
       });
   });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, function(){
        console.log('Server listening on port 5000');
    });