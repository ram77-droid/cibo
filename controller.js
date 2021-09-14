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
    app.use(express.static(__dirname)); 
   
    // const AWS = require('aws-sdk');
    // const multers3 = require('multer-s3');
    // const s3 = new AWS.S3({
    // accessKeyId:process.env.AWS_ACCESS_KEY,
    // secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY
    // });
    
    const fileFilter = (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/JPEG" ||file.mimetype === "image/JPG" || file.mimetype === "image/PNG") {
    cb(null, true);
    } else {
    cb(new Error("Invalid file type, only JPEG and PNG is allowed!"), false);
    }
    };
    const storage=multer.diskStorage({
        destination:function(req,file,callback){
            callback(null,__dirname+'/picture_storage');
        },
        filename:function(req,file,callback){
            callback(null,file.fieldname+'-'+Date.now() + path.extname(file.originalname));
        }
    })
    const profile = multer({fileFilter,storage:storage });

     
    // sign up API
    app.post('/signup',function(req,res){    
        // finding if email or phone no already exists   
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
            else if(success) // if find then show this message
            {               
                return res.status(400).json({
                    status:400,
                    message:"email or phone_no already exist",   
                    error:true                 
                });
            }
            // validations
            else 
            {   // vallidation for all fields are empty
                if(req.body.name==null || req.body.email==null || req.body.password==null || req.body.confirm_password==null || req.body.phone_no==null
                    || req.body.name==''||req.body.email==''|| req.body.password==''|| req.body.confirm_password==''||req.body.phone_no=='')
                {
                    return res.status(400).json({
                        status:400,
                        message:"fill all fields",
                        error:true
                    });
                }
                // for email is valid or not
                else if(mail.test(req.body.email)==false||req.body.email==''||req.body.email==null)
                    {
                        return res.status(400).json({
                            status:400,
                            message:"enter valid email",
                            error:true 
                        });
                    }
                    // for password is valid or not
        else if(pass.test(req.body.password)==false||req.body.password==''||req.body.password==null)
        {
            return res.status(400).json({
                status:400,
                message:"password should be minimum of lenght 6 ",
                error:true 
            });
        }
          // for phone number is valid
        else if(phone.test(req.body.phone_no)==false||req.body.phone_no==''||req.body.phone_no==null)
        {
            return res.status(400).json({
                status:400,
                message:"phone_no should be of 10 digit and must start with 8 or 9",
                error:true 
            });
        }
        // for name is valid as it is not empty or null
        else if(req.body.name==''|| req.body.name==null || req.body.name==' ')
        {
            return res.status(400).json({
                status:400,
                message:"enter valid name",
                error:true 
            });
        }
        // for password if it is empty or null
        else if(req.body.password==' '|| req.body.password==null)
        {
            return res.status(400).json({
                status:400,
                message:"enter valid password",
                error:true 
            });
        }
         // for confirm password if it is empty or null
        else if(req.body.confirm_password==' '|| req.body.confirm_password==null)
        {
            return res.status(400).json({
                status:400,
                message:"enter valid password",
                error:true 
            });
        }
       // if everything is ok then this else will execute
        else
        {
            req.body.password=md(req.body.password); // encrypting password
        req.body.confirm_password=md(req.body.confirm_password);// encrypting confirm password
            if(req.body.password==req.body.confirm_password) // matching encrypted password if same then it will execute next
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
            // creating user
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
                    // now user created                
                    obj1=
                        {
                            _id:result._id,
                            name:result.name,
                            email:result.email,
                            phone_no:result.phone_no,
                            otp_status:result.otp_status                           
                        }
                        // here token is generated for user
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
            else  // if password and confirm password is not matched
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
        token=req.headers.authorization.split(' ')[1]; // split token
        var vary=jwt.verify(token,'ram'); // verify token
    cibo.users.findOne({_id:vary._id},function(err,result){ // finding if user exists that comes in token
        if(err)
        {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
        }
        else if(result)
        {
            // return res.status(200).json({
            //     status:200,
            //     message:"otp verified"
            // });

            // if(result.otp===req.body.otp)
            // {
            //     return res.status(200).json({
            //         status:200,
            //         message:"otp matched"
            //     });
            // }
            // else
            // {
            //         return res.status(400).json({
            //             status:400,
            //             message:"otp doesn't matched"
            //         });
            // }
            cibo.users.updateOne({_id:result._id},{otp_status:true},function(err,success){ // updating the otp status if user verified the otp
                if(err)
                {
                    return res.status(400).json({
                        status:400,
                        message:err.message
                    });
                }
                else if(success) // updation successful
                {
                    return res.status(200).json({
                        status:200,
                        message:"otp verified",
                        otp_status:true
                    });
                }
            });
        }        
    });
    });

    // resend OTP API
    app.get('/resend',function(req,res){

        token=req.headers.authorization.split(' ')[1];// spliting token
        var vary=jwt.verify(token,'ram'); // verifying token
        console.log('vary',vary);
        cibo.users.findOne({phone_no:vary.phone_no},function(err,success){ // finding phone number of the user
            if(err) // if an error occur
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(success) // phone number finded then generating new otp for that number
            {
                otp1=otpgen.generate(6,{ digits:true, alphabets:false, upperCase: false, specialChars: false });// generating new otp
        
                cibo.users.updateOne({otp:success.otp},{otp:otp1},function(err,result){ // updating otp
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        }); 
                    }
                    else if(result)// otp updated
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

    // add location API
    app.post('/location',midleware.check,function(req,res){       
        token=req.headers.authorization.split(' ')[1];// spliting token
        var vary=jwt.verify(token,'ram');// verifying token
        cibo.users.findOne({_id:vary._id},function(err,result){ // finding user id in user collection
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)  // after find updating the location or adding the location of the user
            {               
              obj={
                location:{
                    type:"Point",
                    coordinates:[parseFloat(req.body.long),parseFloat(req.body.lat)] // parse float parses the string and return number as number if character of string  is number
                },
                lat:parseFloat(req.body.lat),
                long:parseFloat(req.body.long),
                delivery_address:req.body.delivery_address
              }
              cibo.users.updateOne({_id:vary._id},obj,function(err,result){ // updating the user
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

    // view location API
    app.get('/view_location',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1]; // spliting token
        var vary=jwt.verify(token,'ram'); // verifying token
        cibo.users.findOne({_id:vary._id},function(err,result){  // finding user
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {
                if(result.delivery_address!=null)// if there is address of user in database
                {
                    return res.status(200).json({
                        status:200,
                        address:result.delivery_address
                    });
                }
                else // if there is no address of user in database
                {
                    return res.status(200).json({
                        status:200,
                        message:null
                    });
                }                
            }
        });
    });
   
    // login API
    app.post('/login',function(req,res){
        // validating email
        if(mail.test(req.body.email)==false || req.body.email==' ' || req.body.email==null)
        {
            return res.status(400).json({
                status:400,
                message:"enter valid email",
                error:true
            });
        }  
        // finding email in user collection      
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
                seller=result.seller; // if user is seller                   
                // if user login with facebook or google         
                 if(req.body.type=="facebook" &&  result.facebook_id!=null || req.body.type=="google" && result.google_id!=null)
                {
                    // if user's google or facebook id is not matching with stored id
                    if(result.google_id!=req.body.google_id || result.facebook_id!=req.body.facebook_id)
                    {
                        return res.status(400).json({
                            status:400,
                            message:"id not matched"
                        });
                    } 
                    // if matched 
                  obj1={
                        _id:result._id,
                        type:req.body.type,
                        google_id:req.body.google_id,
                        facebook_id:req.body.facebook_id,
                        email:req.body.email
                     }
                     // signing new token
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
                           // updating token
                           cibo.users.updateOne({_id:result._id},{token:token_result},function(err,resultt){
                               if(err)
                               {
                                    return res.status(400).json({
                                        status:400,
                                        message:err
                                    });
                               }
                               else if(resultt)
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
                    // if user not verified the otp
                    if(result.otp_status!=true)
                    {
                        if(result.delivery_address!=null)
                        {
                            return res.status(200).json({
                                status:200,
                               otp_status:result.otp_status,
                               address:result.delivery_address,
                               token:result.token
                            });
                        }
                        else
                        {
                            return res.status(200).json({
                                status:200,
                               otp_status:result.otp_status,
                               address:null,
                               token:result.token
                            });
                        }                        
                    }
                    
                    // validating password
                    else if(pass.test(req.body.password)==false || req.body.password==' ' || req.body.password==null)
                            {
                                return res.status(400).json({
                                    status:400,
                                    message:"enter valid password",
                                    error:true
                                });
                            }                        
                            // password get encrypted and matched with before encrypted password
                    req.body.password=md(req.body.password);
                   if(req.body.password==result.password) // if matched
                    {
                        obj2={
                                _id:result._id,
                                email:req.body.email,
                                phone_no:result.phone_no                                
                             }
                             // signing token
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
                                        if(result.delivery_address==null)
                                        {
                                            return res.status(200).json({
                                                status:200,
                                                message:"login successful ",                                            
                                                email:req.body.email,
                                                name:result.name,
                                                seller:seller,
                                                otp_status:result.otp_status,
                                                address:null,
                                                token:token_result
                                            });
                                        }
                                        else
                                        {
                                            return res.status(200).json({
                                                status:200,
                                                message:"login successful ",                                            
                                                email:req.body.email,
                                                name:result.name,
                                                seller:seller,                                              
                                                otp_status:result.otp_status,
                                                address:result.delivery_address,
                                                token:token_result
                                            });
                                        }
                                       
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
                // if user login first with manually and then login with facebook or google
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
            // if email is not present and user login with facebook or google 
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
        // checked if mail is in correct format or not
        if(mail.test(req.body.email)==false||req.body.email==''||req.body.email==null)
        {
            return res.status(400).json({
                status:400,
                message:"emial is not valid"
            });
        }
        else 
        {
            // finding email of user
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
                    // used to sent mail on email                         
                    var transport = nodemailer.createTransport({
                        host: "smtp.mailtrap.io",
                        port: 2525,
                        auth: {
                          user: "2e166ed4f7c2ea",
                          pass: "8e629cdfa30baf"
                        }
                      });
                      // generating the link for the email
                      let url = '<a href="http://'+req.headers.host+'/pass/'+req.body.email+'">http://'+req.headers.host+'/pass'+req.body.email+'</a>';
                      console.log("url",url);
                   
                       transport.sendMail({
                        from: 'ramm00324@gmail.com', // sender address
                        to: req.body.email, // list of receivers                    
                        text: 'Hello world ?', // plaintext body
                        html:'<p>We just acknowledged that you have requested to change your account password. You can change your password by clicking on the link below.</p>'+url+'<p>If you did not make this request. Please ignore this email.</p>'             
                        
                     });
                     return res.status(200).json({ // link sent on the email
                         status:200,
                         message:"link sent on your email"
                     });                   
                }
                else // if email not found
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
        // validate password
        if(pass.test(req.body.password)==false || req.body.password==' '|| req.body.password==null)
        {
            return res.status(400).json({
                status:400,
                message:"invalid password"
            });
        }
        // validate email
        else if(mail.test(req.body.email)==false || req.body.email==' ' || req.body.email==null)
        {
            return res.status(400).json({
                status:400,
                message:"invalid email"
            });
        }
        else
        {
            // match password confirm password 
            if(req.body.password==req.body.confirm_password)
            {
                // encrypt password
                req.body.password=md(req.body.password);
            req.body.confirm_password=md(req.body.confirm_password);
            // updating password for the user
                cibo.users.findOneAndUpdate({email:req.body.email},{password:req.body.password,confirm_password:req.body.confirm_password},function(err,success){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(success) // password updated
                    {
                        return res.status(200).json({
                            status:200,
                            message:"password reset"
                        });
                    }
                    else // if email not found
                    {
                        return res.status(400).json({
                            status:400,
                            message:"email not found"
                        });
                    }
                });
            }
            else // if password doesn't match
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
        // rendering ejs file                
        ejs.renderFile('./password.ejs',{},{},function(err,template){
            if(err)
            {
                throw err;
            }
            else // on success
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

    // become seller API
    app.post('/becomeseller',profile.any(),midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1]; // spliting token
        var vary=jwt.verify(token,'ram');  // verifying token  

        // finding user in user collection   
        cibo.users.findOne({_id:vary._id},function(err,result){
            if(err)// if any error occur
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {    
                // checking whether all inputs are correct or not  
                // validating pan card number         
                if(req.body.pan_card_number.length!=10)
                {
                    return res.status(400).json({
                        status:400,
                        message:"enter correct pan card number"
                    });
                }
                // validating adhar card number
                else if(req.body.adhar_number.length!=12)
                {
                    return res.status(400).json({
                        status:400,
                        message:"enter correct adhar card number"
                    });
                }  
                // files contains all pictues uploaded by user               
                if(req.files.length!=4) // if all pictures are not uploaded by user
                {
                    return res.status(400).json({
                        status:400,
                        message:"please add all images"
                    });
                }
                // else this code will work
                var i=0;
                for(i;i<req.files.length;i++)
                {       
                    // getting image in image field               
                    if(req.files[i].fieldname=="image")
                    {
                        image='http://192.168.1.20:5000/picture_storage/'+req.files[0].filename;
                       // console.log("image:",image);
                    }
                    // getting pan card image in pan card field
                    else if(req.files[i].fieldname=="pan_card_image")
                    {
                        pan_card_image='http://192.168.1.20:5000/picture_storage/'+req.files[0].filename;
                        //console.log("pan:",pan_card_image);
                    }
                    // getting adhar_card_image_front in adhar_card_image_front field
                    else if(req.files[i].fieldname=="adhar_card_image_front")
                    {
                        adhar_card_image_front='http://192.168.1.20:5000/picture_storage/'+req.files[0].filename;
                       // console.log("adhar front:",adhar_card_image_front);
                    }
                    // getting adhar_card_image_back in adhar_card_image_back field
                    else if(req.files[i].fieldname=="adhar_card_image_back")
                    {
                        adhar_card_image_back='http://192.168.1.20:5000/picture_storage/'+req.files[0].filename;
                       // console.log("adhar back:",adhar_card_image_back);
                    }
                }
                // getting all feilds in an object
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
                // updating the user as seller
                cibo.users.updateOne({_id:vary._id},obj,function(err,success){
                    //console.log("object:",obj);
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(success) // now user become seller
                    {
                        return res.status(200).json({
                            status:200,
                            message:"now you become seller"
                        });                     
                    }
                });             
            }
        });
    });
    // bank details API
    app.post('/bank_detail',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1]; // spliting token
        var vary=jwt.verify(token,'ram'); // verifying token
        // finding user
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
               // updating user's bank details
                cibo.users.updateOne({_id:vary._id},{bank_details:req.body.bank_details},function(err,result){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(result) // bank details updated
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

    // add items API      
    app.post('/items',profile.any(),midleware.check,function(req,res){ 
        // using try catch in this for catching front end error   
        try
        {
            console.log(req.files);
            token=req.headers.authorization.split(' ')[1]; // spliting token
        var vary=jwt.verify(token,'ram');  // verifying token
        // finding user
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
                // if item is already there and seller just want to activate or deactivate the item

                // checking if the added item status is active or inactive

                // if seller want to deactivate the item
                if(req.body.active==false )
                {
                    // updating status of item in false
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
                    // updating status of item as true
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
                // here item get added
                else
                {
                    // if seller providing image for the item
                    if(req.files.length!=0)
                    {
                        console.log(req.files);
                        obj=
                        {
                            seller_id:result._id,
                            picture:'http://192.168.1.20:5000/picture_storage/'+req.files[0].filename,
                            item_name:req.body.item_name,
                            item_category:req.body.item_category,
                            price:req.body.price,
                            description:req.body.description,
                            special_notes:req.body.special_notes                   
                        }          
                        // item get added in item collection        
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
                    // if seller add item without picture
                    else
                    {                        
                        obj=
                        {
                            seller_id:result._id,
                            //picture:req.files[0].location,
                            item_name:req.body.item_name,
                            item_category:req.body.item_category,
                            price:req.body.price,
                            description:req.body.description,
                            special_notes:req.body.special_notes                   
                        }  
                        // item added in collection                
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
            }
        });   

        }  catch(err)
        {
            console.log(req.files);
            console.log(err);
        }   
    });   

    // delete item API
    app.delete('/item_delete/:item_id',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1]; // spliting token
        var vary=jwt.verify(token,'ram');  // verifying token

        // find the item id and than delete it
        cibo.items.findOneAndDelete({seller_id:vary._id,_id:req.params.item_id},function(err,result){
            if(err) // if an error occur
            {
                return res.status(400).json({
                    status:200,
                    message:err.message
                });
            }
            else if(result) // item deleted successfully
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
        token=req.headers.authorization.split(' ')[1]; // spliting token
        var vary=jwt.verify(token,'ram'); // verifying token

        // updating the delivery option by seller
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
                // only this type can be stored
                if(req.body.delivery_option=="delivery" || req.body.delivery_option=="pickup" || req.body.delivery_option=="delivery,pickup")
                {
                    return res.status(200).json({
                        status:200,
                        message:"delivery type updated"
                    });
                }
                else // if something else is in req then this error
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
        token=req.headers.authorization.split(' ')[1]; // spliting token
        var vary=jwt.verify(token,'ram');  // verifying token

        // finding user
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
                // if user is seller 
                if(result.seller==true)
                {
                    // showing the current delivery option of seller
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
        token=req.headers.authorization.split(' ')[1]; // spliting token
        var vary=jwt.verify(token,'ram'); // verifying token
        // finding user
        cibo.users.findOne({_id:vary._id},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {           // if seller    
                if(result.seller==true)
                {
                    // seller will see all items that he added
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
            }
        });
    });

    // order API
    app.post('/order',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1]; // spliting token
        var vary=jwt.verify(token,'ram'); // verifying token

        // finding user
        cibo.users.findOne({_id:vary._id},function(err,result){
            if(err)
            {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
            }
            else if(result)
            {     // getting fields in obj and generating order number             
                obj={
                    user_id:result._id,
                    seller_id:req.body.seller_id, 
                    order_number:otpgen.generate(9,{ digits:true, alphabets:false, upperCase: false, specialChars: false }),                   
                    quantity:req.body.quantity,                    
                    item: req.body.item,
                    grand_total:req.body.grand_total,
                    payment_method:req.body.payment_method,
                    delivery_type:req.body.delivery_type,
                    created_at:Date.now()    
                }
                // order created here added by user
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
                        // here items get deleted from cart when order of that items get placed                   
                        cibo.cart.deleteMany({user_id:result.user_id},function(err,success1){
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
                                    message:"order placed"
                                });
                            }
                        })
                    }
                });
                
            }
        });        
    });

    //favourite Items API
    app.post('/favourite',midleware.check,function(req,res){
        token=req.headers.authorization.split(' ')[1]; // spliting token
        var vary=jwt.verify(token,'ram'); // verifying token
       // finding user
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
                // getting status from user
                obj={
                    item_id:req.body.item_id,                   
                    user_id:result._id,
                    status:req.body.status
                }
                // item added as favourite for user
                cibo.favourite.create(obj,function(err,result){
                    if(err)
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(result) // added favourite item
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

        console.log(req.files);
        token=req.headers.authorization.split(' ')[1];  //spliting token
        var vary=jwt.verify(token,'ram');  // verifying token
        // finding user
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
                // if picture is updated
                if(req.files)
                {
                    obj={
                        name:req.body.name,
                        image:'http://192.168.1.20:5000/picture_storage/'+req.files[0].filename,
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
                // if picture is not updated
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
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram');  // verifying token
       // finding user
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {// validate password
               if(pass.test(req.body.old_password)==false ||req.body.old_password==' '|| req.body.old_password==null)
               {
                   return res.status(400).json({
                       status:400,
                       message:"invalid password"
                   });
               }
               // validate new password
               else if(pass.test(req.body.new_password)==false || req.body.new_password==' '|| req.body.new_password==null)
               {
                    return res.status(400).json({
                        status:400,
                        message:"invalid password"
                    });
               }

               else
               {
                   // console.log("old pass:",req.body.old_password);
                   // encrypt old password 
                    req.body.old_password=md(req.body.old_password);
                   
                    // if old password matched
                    if(req.body.old_password==result.password)
                    {      
                        // if new password is null or empty or not valid             
                        if(pass.test(req.body.new_password)==false||req.body.new_password==''||req.body.new_password==null)
                            {
                                return res.status(400).json({
                                    status:400,
                                    message:"password should be minimum 6 digits"
                                });
                            }
                            else
                            {
                                // updating new password
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
                    else // if old password is not matched
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
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding and updating user's schedule
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
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding user
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
               // getting all fields in obj
               obj=
               {
                   pictures:'http://192.168.1.20:5000/picture_storage/'+req.files[0].filename,
                   user_id:result._id,
                   title:req.body.title,
                   description:req.body.description,
                   created_at:Date.now().toString()
               }
               // blogs added here by user 
              cibo.blog.create(obj,function(err,success){
                  if(err)
                  {
                    return res.status(400).json({
                        status:400,
                        message:err.message
                    });
                  }
                  else if(success) // blog added 
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
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding user id in blog collection
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
               // viewing the blogs by user
               // using aggregate for combination of data of two or more collections
              cibo.blog.aggregate([
                  {
                      $lookup:  // as one of the blog field is same as of user..so we use lookup
                               // to get combined with that field
                      {
                          from:'users',
                          let:
                          {
                              userid:"$user_id" // here user_id is value of blog's user_id
                          },
                          pipeline: // pipeline is used for multistaging  so that transform document
                          [         // into aggregated results..here matching the condition and give required result
                              {
                                  $match:
                                  {
                                      $expr:
                                      {
                                          $eq:["$$userid","$_id"] // matching ids from blog and user collection
                                      }
                                  }
                              }
                          ],
                          as:"blogs" // all data of user collection is getting inside the blogs
                      }
                  },
                  {
                      $unwind:"$blogs" // deconstruct an array field
                  },
                  {
                      $project: // project is used for displaying data as required as
                               // what we want to show
                      {
                          pictures:1,
                          title:1,
                          description:1,
                          created_at:1,
                          "name":"$blogs.name"
                      }
                  },
                  {
                      $sort:{created_at:-1} // data get sorted by created_at field
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
   app.get('/view_order/:type',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram');     // verifying token

       // finding user
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
               // if user is seller then this work          
               if(req.params.type=="seller" && result.seller==true)
               {                  
                   cibo.order.aggregate([
                       {
                           $lookup:
                           {
                               from:'users',
                               let:
                               {
                                   id:"$seller_id" // value of seller id in order collection
                               },
                               pipeline: // multi staging
                               [
                                   {
                                       $match: // matching condtions
                                       {
                                           $expr:
                                           {
                                            $and:
                                            [                                                                                                
                                                {$eq:["$$id","$_id"]}   // matching ids from order and user collection                                            
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
                           $addFields: // use addfield for adding new fields
                           {
                               deliverytype:"$order.delivery_option",    //delivery option of user                           
                           }
                       },
                       {
                           $project:
                           {
                               item:1,
                               order_status:1,
                               order_number:1,                             
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
               // if user is not seller
               else
               {                  
                  cibo.order.aggregate([
                    { $addFields: { firstitem: { $first: "$item" } } }, // for matching first item of item array
                    {
                        $lookup:
                        {
                            from:"items", // from item collection
                            let: { itemid:"$firstitem.item_id"}, // first item id 
                            pipeline:[
                            {
                            $match:{
                            $expr:{
                            $and:[
                            {$eq:["$$itemid","$_id"]} // mstching item ids
                            ]
                            }
                            }
                        }],
                        as:"orderitem" // return as orderitem
                     }
                    },
                    {$unwind:"$orderitem"}, // unwinding orderitem
                        {
                            $lookup:  // second lookup with users coillection
                            {
                                from:'users',
                                let:
                                {
                                    sellerid:"$seller_id",                                   
                                    userid:"$user_id",
                                    orderid:"$_id"                                   
                                },
                                pipeline:
                                [
                                    {
                                        $match: // matching conditions
                                        {
                                            $expr:
                                            {
                                                $and:
                                                [
                                                    {$eq:["$$sellerid","$_id"] }, // matchind seller ids                                                   
                                                    {$eq:["$$userid",mongoose.Types.ObjectId(vary._id)]},  // matching user ids                                                                                                    
                                                ]                                              
                                            }
                                        }
                                    }
                                ],
                                as:"seller"  // return as seller                               
                            }
                        },
                        {
                            $unwind:{path:"$seller",preserveNullAndEmptyArrays: true} // unwinding seller
                        },                  // preserve null empty array is true if data is not find as conditions but want to show rest data
                        {
                            $addFields:
                            {
                                sellername:"$seller.name", // adding fields
                                review:"$seller.review"                               
                            }
                        },
                        {
                            $project: // projecting data as we want to show
                            {
                                order_status:1,                                
                                item:1,                                
                                review:{
                                    $filter: { // filtering the review data
                                    input: "$review",
                                    as: "item",
                                    cond: { $eq:["$$item.order_id","$_id"] }   // matching order id                                 
                                     }
                                    },                                                              
                                order_number:1,
                                grand_total:1,
                                created_at:1,
                                sellername:1,
                                payment_method:1
                                                             
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

   //order detail API
   app.get('/order_detail/:order_id',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram');  // verifying token

       // finding user
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err
               });
           }
           else if(result)
           {
               // getting order detail from order_id
               cibo.order.findOne({_id:req.params.order_id},function(err,success){
                   if(err) // if error occur
                   {
                        return res.status(400).json({
                            status:400,
                            message:err
                        });
                   }
                   else if(success) // data found
                   {
                    return res.status(200).json({
                        status:200,
                        data:success
                    });
                   }
               })
           }
       })
   })

   // accept order API
   app.post('/accept_order',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       //  finding order data where seller id and order number matched
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
               // this is used for changing the status of the order
               var order;
               if(req.body.status=="accept")
               {
                   order=req.body.status;// changed to accept
               }
               else if(req.body.status=="reject")
               {
                   order=req.body.status; // changed to reject
               }
               else if(req.body.status=="cancel")
               {
                   order="cancelled"; // changed to cancelled
               }
               else if(req.body.status=="submit_order_delivery" || req.body.status=="submit_order_pickup")
               {
                      order="completed";  // changed to completed
               }
               else
               {
                   // if any other status is coming from req then this will run 
                   return res.status(400).json({
                       status:400,
                       message:"status not valid"
                   });
               }
               // updating the order status
               cibo.order.updateOne({order_number:result.order_number},{order_status:order},function(err,success){
                   if(err) // if error occur
                   {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                   }
                   else if(success)  // data updated
                   {
                    return res.status(200).json({
                        status:200,
                        message:"done"
                    });
                   }
               });
           }
           else // if user is not seller
           {
               return res.status(400).json({
                   status:400,
                   message:"seller not found"
               });
           }
       });
   });

   // new item API
   app.get('/user_new_item/:delivery_type',midleware.check,function(req,res){       

      // if user's delivery option is delivery than he will see all items except pickup                                  
      if(req.params.delivery_type=="delivery") 
      {                                      
          cibo.items.aggregate([
              {
                  $lookup: // combining item and user collection
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
                              $geoNear: // distance from user's location
                              {
                                  near:req.user_loaction,
                                  distanceField:"dist.distance",
                                  maxDistance:150*1000, // range
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
                                              $eq:["$$sellerid","$_id"] // matching seller
                                          },{
                                              $ne:["$$sellerid",mongoose.Types.ObjectId(req.current_user_id)] // not to show item if user is seller
                                          },
                                          // {
                                          //     $eq:["$$active",true]
                                          // }, 
                                          {
                                              $ne:["$delivery_option",["pickup"]]  // here is condition work of not showing pickup                                                    
                                              
                                          }                                                                                       
                                      ]
                                  }
                              }
                          }
                      ],
                      as:"seller" // combined data as seller                           
                  }
              },
              {
                  $unwind:"$seller" // unwinding data
              },
              {
                $addFields:
                {
                    distance:"$seller.dist.distance" // adding distance field
                }
              },
              {
                  $project: // projecting data as required
                  {
                      seller_id:1,
                      item_name:1,
                      picture:1,
                      item_category:1,
                      price:1,
                      description:1,                                 
                      distance:{ $round: [ "$distance", 1] } // for showing distance value and 1 value after dot                                                                                                       
                  }
              },
              {
                  $sort:{_id:-1} // sorting data by id
              },
              {
                  $limit:5 // limit to show is 5
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
       // if user's delivery option is pickup than he will see all items except delivery
      else
      {
          cibo.items.aggregate([
              {
                  $lookup: // combining item and user collection
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
                              $geoNear: // distance according to user's location
                              {
                                  near:req.user_loaction,
                                  distanceField:"dist.distance",
                                  maxDistance:150*1000, // range
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
                                              $eq:["$$sellerid","$_id"] // matching seller
                                          },{
                                              $ne:["$$sellerid",mongoose.Types.ObjectId(req.current_user_id)] // item will not visible if user is seller
                                          },
                                          // {
                                          //     $eq:["$$active",true]
                                          // }, 
                                          {
                                              $ne:["$delivery_option",["delivery"]]   // condition   just not showing delivery item                                                
                                              
                                          }                                                                                       
                                      ]
                                  }
                              }
                          }
                      ],
                      as:"seller"   // data as seller                         
                  }
              },
              {
                  $unwind:"$seller" // unwinding the data
              },
              {
                $addFields:
                {
                    distance:"$seller.dist.distance" // adding distance field
                }
              },
              {
                  $project: // projecting data as required
                  {
                      item_name:1,
                      picture:1,
                      item_category:1,
                      price:1,
                      description:1,
                      "image":"$seller.image",                                
                      "seller_name":"$seller.name",
                      "reviews":"$seller.review",
                      "lat":"$seller.lat",
                      "long":"$seller.long",                                 
                      distance:{ $round: [ "$distance", 1] }                                          
                  }
              }  ,
              {
                  $sort:{_id:1} // sorting by id
              }                  
             
          ],function(err,success){
              if(err) // if error occur
              {
                  return res.status(400).json({
                      status:400,
                      message:err.message
                  });
              }
              else if(success) // showing data
              {                       
                  return res.status(200).json({
                      status:200,
                      data:success
                  });
              }
          });
        }
     });     

   // add_to_cart API
   app.post('/add_cart',midleware.check,function(req,res){      
       token=req.headers.authorization.split(' ')[1];  // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       //finding user
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {     // findind if item id exists or not          
               cibo.cart.findOne({item_id:req.body.item_id},function(err,success){
                   if(err)
                   {
                       return res.status(400).json({
                           status:400,
                           message:err.message
                       });
                   }
                   else if(success) // if item find then this will showed
                   { 
                        return res.status(400).json({
                            status:400,
                            message:"item already exists"
                        });               
                   }
                   else
                   {
                       // find if item id is present in item collection
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
                               // check req.seller and item added by seller is same or not                          
                               if(proceed.seller_id==req.body.seller_id)
                               {
                                   // if quantity is not specified
                                   if(req.body.quantity==null || req.body.quantity==0)
                                   {
                                    return res.status(200).json({
                                        status:200,
                                        message:"enter quantity please"
                                    });
                                   }
                                   // else all requiredfields in obj
                                   obj={
                                           user_id:result._id,
                                           seller_id:req.body.seller_id,
                                           item_id:req.body.item_id,
                                           item_name:req.body.item_name,
                                           quantity:req.body.quantity,
                                           price:req.body.price,
                                           picture:req.body.picture,
                                           special_instruction:req.body.special_instruction,
                                           total_pay:req.body.price*req.body.quantity,
                                           delivery_type:req.body.delivery_type
                                       }
                                       // adding item in cart
                                       cibo.cart.create(obj,function(err,success1){
                                           if(err)
                                           {
                                               return res.status(400).json({
                                                   status:400,
                                                   message:err.message
                                               });
                                           }
                                           else if(success1) // item added in cart
                                           {
                                               return res.status(200).json({
                                                   status:200,
                                                   data:success1,
                                                   message:"item added to cart"
                                               });
                                           }
                                       });
                               }
                               else // if item is not of same seller
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
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram');  // verifying token

      // finding user
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
               // viewing cart items added by user
              cibo.cart.aggregate([
                  {
                      $lookup: // combining cart and user collection
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
                                      $eq:["$$id","$_id"] // matching same user ids of both collection
                                                                                                                          
                                    }
                                }
                            }
                          ],
                          as:"items" // combined data as items
                      }
                  },
                  {$unwind:"$items"}, // unwinding data
                  {
                      $addFields: // adding fields
                      {
                          lat:"$item.lat",
                         long:"$item.long"
                      }
                  },
                  {
                      $project: // projecting data as required
                      {    seller_id:1,                     
                          picture:1,
                          item_name:1,
                          quantity:1,
                          price:1,                        
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
                      for(var i=0;i<result1.length;i++) // adding all price of items in one
                      {
                        grand_total=grand_total+result1[i].price*result1[i].quantity;  // total price of all items                       
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

   // view only item API
   app.get('/only_item/:item_id',midleware.check,function(req,res){
    token=req.headers.authorization.split(' ')[1]; // spliting token
    var vary=jwt.verify(token,'ram');  // verifying token

    // finding user
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
             // showing item after clicking on item           
             cibo.items.aggregate([
                 {
                     $lookup: // combining item and user collection
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
                                 $geoNear:  // distance of sellers from user location
                                 {
                                     near:result.location,
                                     distanceField:"dist.distance",
                                     maxDistance:150*1000, // range
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
                                                 $eq:["$$sellerid","$_id"] // matching seller
                                             },{
                                                 $eq:["$$id",mongoose.Types.ObjectId(req.params.item_id)] // matching id with id comes in params
                                             }                                           
                                         ]
                                     }
                                 }
                             }
                         ],
                         as:"seller"   // data as seller                         
                     }
                 },
                 {
                     $unwind:"$seller" // unwinding data
                 },
                 {
                   $addFields: // adding fields
                   {
                       seller_id:"$seller._id",
                       distance:"$seller.dist.distance",
                       seller_name:"$seller.name"
                   }
                 },
                 {
                     $project: // projecting data as required
                     {
                         picture:1,
                         item_name:1, 
                         price:1, 
                         seller_id:1,
                         seller_name:1,
                         distance:{ $round: [ "$distance", 1] }                                        
                     }
                 },
                 {
                     $sort:{_id:-1} // sorting data in descending
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

   // view favourite API
   app.get('/view_favourite',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding user
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
               // viewing favourite items
               cibo.items.aggregate([
                   {
                       $lookup: // combining item and favourite collection
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
                                                $eq:["$$id","$item_id"]  // matching item id
                                               },
                                               {
                                                   $eq:["$$userid","$user_id"] // matching user id
                                               }                                        
                                           ]
                                       }
                                   }
                               }
                           ],
                           as:"fav" // combined data as fav
                       }
                   },
                   {
                       $unwind:"$fav" // unwinding data
                   },
                   {
                    $lookup: // scombining item with user collection
                    {
                        from:"users",
                        let:
                        {
                            sellerid:"$seller_id"
                        },
                        pipeline:
                        [                                
                            {
                                $geoNear: // distance of seller form user's location
                                {
                                    near:result.location,
                                    distanceField:"dist.distance",
                                    maxDistance:150*1000, // range
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
                                                $eq:["$$sellerid","$_id"]  // matching seller
                                            },{
                                                $ne:["$$sellerid",mongoose.Types.ObjectId(vary._id)] // if user is seller
                                            }                                           
                                        ]
                                    }
                                }
                            }
                        ],
                        as:"seller"    // combined data as seller                        
                    }
                },
                {
                   $unwind:"$seller" // unwinding data
                },
                {
                    $addFields: // adding fields
                    {
                        seller_name:"$seller.name",
                        distance:"$seller.dist.distance"
                    }

                },
                {
                    $project:  // projecting data as required
                    {
                        picture:1,
                        item_name:1,
                        item_category:1,
                        price:1,
                        description:1,
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
               });
           }
       });
   });

   // view profile API
   app.get('/view_profile',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding user
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
               // if user is seller than reviews are also showing
               if(result.seller==true)
               {
                    var sum=0,rating,rating1;         
                    for(var i=0;i<result.review.length;i++) // finding average of all rating
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
               else // if user is not seller
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

   // view seller profile API
   app.get('/seller_profile/:seller_id',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding user
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
               // seeing seller profile       
            cibo.users.findOne({_id:req.params.seller_id},function(err,success){
                if(err)
                {
                    return res.status(400).json({
                        status:400,
                        message:err.message
                    });
                }
                else if(success) // showing data as of query
                {
                    return res.status(200).json({
                        status:200,
                        name:success.name,
                        image:success.image,
                        address:success.delivery_address
                    });
                }
            });
           }
       });
   });

   // delete favourite item API
   app.delete('/delete_favourite_item/:item_id',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding and updating user in facourite collection
       cibo.favourite.findOneAndDelete({user_id:vary._id,item_id:req.params.item_id},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:200,
                   message:err.message
               });
           }
           else if(result) // irem deleted
           {           
                    return res.status(200).json({
                    status:200,
                    message:"item deleted"
                });
           }
       });
   });

   // edit item API
   app.post('/edit_item',profile.any(),midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifyig token

       // finding user
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
               if(req.body.picture) // if picture of item is updating
               {
                    obj= // all fields in obj
                    {
                        seller_id:result._id,
                        picture:'http://192.168.1.20:5000/picture_storage/'+req.files[0].filename,
                        item_name:req.body.item_name,
                        item_category:req.body.item_category,
                        price:"Rs "+req.body.price,
                        description:req.body.description,
                        special_notes:req.body.special_notes,
                        active:req.body.active
                    }   
                    // updating the data            
                    cibo.items.updateOne({seller_id:result._id,_id:mongoose.Types.ObjectId(req.body._id)},obj,function(err,result){
                        if(err) // if error occur
                        {
                            return res.status(400).json({
                                status:400,
                                message:err.message
                            });
                        }
                        else if(result) // data updated
                        {
                            return res.status(200).json({
                                status:200,
                                message:"item updated",
                                data:obj
                            });
                        }
                    });
               }
               else // if picture is not updated
               {
                obj= // all fields ain obj
                {
                    seller_id:result._id,                   
                    item_name:req.body.item_name,
                    item_category:req.body.item_category,
                    price:"Rs "+req.body.price,
                    description:req.body.description,
                    special_notes:req.body.special_notes,
                    active:req.body.active
                }  
                // updating data             
                cibo.items.updateOne({seller_id:result._id,_id:mongoose.Types.ObjectId(req.body._id)},obj,function(err,result){
                    if(err) // if error occur
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(result) // data updated
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
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding user
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err) // if error occur
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
                       $lookup: // combining order and user collection
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
                                   $match: // matching conditions
                                   {
                                       $expr:
                                       {
                                           $and:[
                                               {
                                                $eq:["$$userid","$_id"], // matching user id
                                               },
                                               {
                                                $eq:["$$sellerid",mongoose.Types.ObjectId(vary._id)] // matching seller id
                                               }                                         
                                           ]                                          
                                       }
                                   }
                               }
                           ],
                           as:"viewuser" // combined data as view user
                       }
                   },
                   {
                       $unwind:"$viewuser" // unwinding data
                   },
                   {
                       $addFields: // adding fields
                       {
                           username:"$viewuser.name",
                           deliverytype:"$viewuser.delivery_option"
                       }
                   },
                   {
                       $project: // projecting data as required
                       {
                           quantity:1,
                           total_pay:1,
                           item:1,
                           special_instruction:1,
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
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding user
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err) // if error occur
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {   
               // push every time in review           
              req.body.review.forEach(element => {
                
                // adding reviews in seller's id
                cibo.users.updateOne({_id:req.body.seller_id},{ $push:{review:{$each:[{user_id:result._id,order_id:element.order_id,rating:element.rating,message:element.message}]}}},function(err,success){
                    if(err) //  if error occur
                    {
                        return res.status(400).json({
                            status:400,
                            message:err.message
                        });
                    }
                    else if(success) // data updated
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
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding user
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err) // if error occur
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result) // showing data
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
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding and updating user data
       cibo.users.findOneAndUpdate({_id:vary._id},{bio:req.body.bio},function(err,result){
           if(err)
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result) // bio updated
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
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding user
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err) // if error occur
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result)
           {          
               // if user's options is delivery    
               if(result.delivery_option=="delivery")
               {                
                 cibo.items.aggregate([                
                    {
                        $match: // matching a single letter if present in item name and category
                        {
                             $or:[
                             {item_name:{$regex:req.body.text,$options:"i"} }, // insensitive search at item name
                            {item_category:{$regex:req.body.text,$options:"i"} } // insensitive search at item category
                             ]
                        }             
                     },  
                    {
                        $lookup: // combining item and user collection
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
                                    $geoNear: // distance of seller from user's location
                                    {
                                        near:result.location,
                                        distanceField:"dist.distance",
                                        maxDistance:150*1000, // range
                                        spherical: true
                                    }
                                },
                                {
                                    $match:  // matching conditions
                                    {                                    
                                        $expr:
                                        {
                                            $and:[
                                                {
                                                    $eq:["$$sellerid","$_id"] // matching seller id
                                                },
                                                {
                                                    $ne:["$$sellerid",mongoose.Types.ObjectId(vary._id)] // if user is seller
                                                },
                                                // {
                                                //     $eq:["$$active",true]
                                                // }, 
                                                {
                                                    $ne:["$delivery_option","pickup"] // showing all items except pickup option items            
                                                }                                                                                                                                                                                                                 
                                            ]
                                        }
                                    }
                                }
                            ],
                            as:"seller"  // combined data as seller                          
                        }
                    },

                    {
                        $unwind:"$seller" // unwinding data
                    },

                    {
                    $addFields: // adding field
                    {
                        distance:"$seller.dist.distance"
                    }
                    },

                    {
                        $project: // projecting data as required
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

        else // user option is pickup
        {
            cibo.items.aggregate([                
                {
                    $match: // matching item name or category
                    {
                         $or:[
                         {item_name:{$regex:req.body.text,$options:"i"} }, // insensitive search at item name
                        {item_category:{$regex:req.body.text,$options:"i"} } // insensitive search at item category
                         ]
                    }             
                 },  
                {
                    $lookup: // combining item and user collecion
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
                                $geoNear: // distance of seller from user's location
                                {
                                    near:result.location,
                                    distanceField:"dist.distance",
                                    maxDistance:150*1000, // range
                                    spherical: true
                                }
                            },
                            {
                                $match: // matching conditions
                                {                                    
                                    $expr:
                                    {
                                        $and:[
                                            {
                                                $eq:["$$sellerid","$_id"] // matching seller id
                                            },
                                            {
                                                $ne:["$$sellerid",mongoose.Types.ObjectId(vary._id)] // if user is seller id
                                            },
                                            // {
                                            //     $eq:["$$active",true]
                                            // }, 
                                            {
                                                $ne:["$delivery_option","delivery"]   // showing all items except delivery option items          
                                            }                                                                                                                                                                                                                 
                                        ]
                                    }
                                }
                            }
                        ],
                        as:"seller"     // combined data as seller                       
                    }
                },

                {
                    $unwind:"$seller" // unwinding data
                },

                {
                $addFields: // adding field
                {
                    distance:"$seller.dist.distance"
                }
                },

                {
                    $project: // projecting data as required
                    {
                        picture:1,
                        item_name:1,  
                        distance:{ $round: [ "$distance", 1] }                                        
                    }
                }                   
             ],function(err,success){
                if(err) // if error occur
                {
                    return res.status(400).json({
                        status:400,
                        message:err.message
                    });
                }
                else if(success) // showing data
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
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding user
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err) // if error occur
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
                       $lookup: // combining item and favourite collection
                       {
                           from:'favourites',
                           let:
                           {
                               itemid:"$_id"
                           },
                           pipeline:
                           [
                               {
                                   $match: // matching conditions
                                   {
                                       $expr:
                                       {
                                           $and:[
                                            {$eq:["$$itemid","$item_id"]}, // matching item id
                                            {$eq:["$status",true]} // matching status
                                            //{$eq:["$user_id",mongoose.Types.ObjectId(vary._id)]}
                                           ]                                           
                                       }
                                   }
                               },
                               {
                                   $count:"status" // count like status in favourite
                               }
                           ],
                           as:"trend" // it gives count
                       }
                   },                                  
                   {
                       $unwind:"$trend" // unwinding data
                   },
                  
                   {
                       $lookup: // combining item with user collection 
                       {
                           from:'users',
                           let:
                           {
                               sellerid:"$seller_id"
                           },
                           pipeline:
                           [
                                {
                                    $geoNear: // distance of seller from user's location
                                    {
                                        near:result.location,
                                        distanceField:"dist.distance",
                                        maxDistance:150*1000, // range
                                        spherical: true                                        
                                    }
                                },

                               {
                                   $match: // matching condition
                                   {
                                       $expr:
                                       {
                                           $eq:["$$sellerid","$_id"] // matching seller id
                                       }
                                   }
                               }
                           ],
                           as:"trend1" // combined data 
                       }
                   },
                   {
                       $unwind:"$trend1" // unwinding data
                   },
                   {
                       $lookup: // combining item with favourite collection again to show if user liked on that item
                       {
                           from:'favourites',
                           let:
                           {
                            item:"$_id"
                           },
                           pipeline:
                           [
                               {
                                   $match: // matching connditions 
                                   {
                                       $expr:
                                       {
                                           $and:[
                                               {$eq:["$$item","$item_id"]}, // matching item id
                                               {$eq:["$user_id",mongoose.Types.ObjectId(vary._id)]} // matching user id
                                           ]
                                       }
                                   }
                               }
                           ],
                           as:"favour" // combined data
                       
                       }
                   },
                   {
                       $unwind:{  // unwinding data
                           path:"$favour",
                           preserveNullAndEmptyArrays: true // to show result either condition fulfiled or not
                       }
                   },
                   {
                       $addFields: // adding fields
                       {
                           distance:"$trend1.dist.distance",
                           count:"$trend.status"                           
                       }
                   },
                   {
                       $project: // projecting data as required
                       {
                           seller_id:1,
                           item_name:1,
                           picture:1,
                           item_category:1,
                           price:1,
                           description:1,
                           distance:{ $round: [ "$distance", 1] } ,
                           count:1,
                           "status":"$favour.status"                          
                       }
                   },
                   {
                    $sort:{count:-1} // sorting by count in descending order
                    },
                    { 
                        $limit : 5 // applying limit
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

   // info API
   // for info of user as user or seller
   app.get('/info',midleware.check,function(req,res){
       token=req.headers.authorization.split(' ')[1]; // spliting token
       var vary=jwt.verify(token,'ram'); // verifying token

       // finding user
       cibo.users.findOne({_id:vary._id},function(err,result){
           if(err) // if error occur
           {
               return res.status(400).json({
                   status:400,
                   message:err.message
               });
           }
           else if(result) // showing data
           {
               return res.status(200).json({
                   status:200,
                   data:result
               });
           }
       });
   });
  
  // server listening on port 5000
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, function(){
        console.log('Server listening on port 5000');
    });