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
    var valid=require('validator');

    var mail= /^[a-zA-Z0-9_\-]+[@][a-z]+[\.][a-z]{2,3}$/;
    var pass= /^[0-9]{6,}$/;
    var phone=/^[0-9]{10}$/;

   
    app.use(express.static(__dirname));
    console.log("dirname:",__dirname);
    const storage=multer.diskStorage({
        destination:function(req,file,callback){
            callback(null,__dirname+'/users_pictures');
        },
        filename:function(req,file,callback){
            callback(null,file.fieldname+'-'+ Date.now()+ path.extname(file.originalname));
        }
    });
    const profile=multer({storage:storage});

    // sign up API
    app.post('/signup',profile.any(),function(req,res){
        if(mail.test(req.body.email)==false||req.body.email==''||req.body.email==null)
        {
            return res.status(400).json({
                status:400,
                message:"email is not valid"
            });
        }
        else if(pass.test(req.body.password)==false||req.body.password==''||req.body.password==null)
        {
            return res.status(400).json({
                status:400,
                message:"password should be minimum 4 and maximum 10 digit"
            });
        }

        else if(phone.test(req.body.phone_no)==false||req.body.phone_no==''||req.body.phone_no==null)
        {
            return res.status(400).json({
                status:400,
                message:"phone_no should be of 10 digit"
            });
        }
        else
        {

            req.body.password=md(req.body.password);
        req.body.confirm_password=md(req.body.confirm_password);
            if(req.body.password==req.body.confirm_password)
            {
                obj={
                    image:'http://192.168.1.20:5000/users_pictures/'+req.files[0].filename,
                    name:req.body.name,
                    email:req.body.email,
                    password:req.body.password,
                    confirm_password:req.body.confirm_password,
                    phone_no:req.body.phone_no,
                    otp:otpgen.generate(6,{ digits:true, alphabets:false, upperCase: false, specialChars: false }),
                    location:{
                        type:"Point",
                        coordinates:[parseFloat(req.body.long),parseFloat(req.body.lat)]
                    },
                    lat:parseFloat(req.body.lat),
                    long:parseFloat(req.body.long),

                }
               
            console.log('object is',obj);
            cibo.users.create(obj,function(err,result){
                if(err)
                {
                    return res.status(400).json({
                        status:400,
                        message:err.message
                    });
                }  
                else if(result)
                {                    
                    obj1=
                        {
                            _id:result._id,
                            name:result.name,
                            email:result.email
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
                            //console.log("token:",token_result);
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
                            message:"kuch roh glt hai"
                        });
                    }
            });
           
            
            }
            else
            {
                return res.status(400).json({
                    status:400,
                    message:"password is not matching with confirm password"
                });
            }
        }   
    
    });

    // verifying OTP API
    app.post('/verify',function(req,res){
    cibo.users.findOne({otp:req.body.otp},function(err,result){
        if(err)
        {
                return res.status(400).json({
                    status:400,
                    message:err.message
                });
        }
        else if(result)
        {
            if(result.otp==req.body.otp)
            {
                return res.status(200).json({
                    status:200,
                    message:"sign up successful"
                });
            }
        }
        else
        {
                return res.status(400).json({
                    status:400,
                    message:"otp doesn't matched"
                });
        }
    });
    });

    // resend OTP API
    app.get('/resend',function(req,res){

        token=req.headers.authorization.split(' ')[1];
        var vary=jwt.verify(token,'ram');
        console.log('vary',vary);
        cibo.users.findOne({email:vary.email},function(err,success){
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
   
    // login API
    app.post('/login',function(req,res){
        obj=req.body;
        req.body.password=md(req.body.password);
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
                console.log("result:",result.token);
              if(result.token==null)
              {
                jwt.sign(obj,'ram',function(token_error,token_result)
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
                        console.log("token is:",token_result);
                        if(result.password==req.body.password)
                        {
                            // return res.status(200).json({
                            //     status:200,
                            //     message:"login successful"
                            // });
                            cibo.users.updateOne({email:req.body.email},{token:token_result},function(err,result){
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
                                            message:"login successful"
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
              }                            
                else
                {
                    return res.status(200).json({
                        status:200,
                        message:"login successful"
                    });
                }
                
            }
           
        });
    });

    // forget password API
    app.post('/forgetpassword',function(req,res){
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
                  let url = '<a href="http://'+req.headers.host+'/pass'+'">http://'+req.headers.host+'/pass'+'</a>';
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
        });
    });

    // reset password API
    app.post('/resetpassword',function(req,res){
        
        //console.log("req",req.body);
        if(req.body.password==req.body.confirm_password)
        {
            req.body.password=md(req.body.password);
        req.body.confirm_password=md(req.body.confirm_password);
            cibo.users.updateOne({email:req.body.email},{password:req.body.password,confirm_password:req.body.confirm_password},function(err,success){
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
            });
        }
        else
        {
            return res.status(400).json({
                status:400,
                message:"password mismatch"
            });
        }
    });

    //password screen API
    app.get('/pass',function(req,res){
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
    app.get('/logout',function(req,res){
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
        })
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
                    obj={
                        pan_card_image:'http://192.168.1.20:5000/users_pictures/'+req.files[0].filename,
                        adhar_card_image_front:'http://192.168.1.20:5000/users_pictures/'+req.files[0].filename,
                        adhar_card_image_back:'http://192.168.1.20:5000/users_pictures/'+req.files[0].filename,
                        physical_address:{
                            street_name:req.body.street_name,
                            city:req.body.city,
                            state:req.body.state,
                            pin:req.body.pin
                        },
                        bank_details:{
                            account_number:req.body.account_number,
                            account_holder_name:req.body.account_holder_name,
                            ifse_code:req.body.ifse_code,
                            bank_name:req.body.bank_name                        
                        }                                
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

    // items API   
    app.use(express.static(__dirname));
   // console.log("dirname:",__dirname);
    const store=multer.diskStorage({
        destination:function(req,file,callback){
            callback(null,__dirname+'/item_pictures');
        },
        filename:function(req,file,callback){
            callback(null,file.fieldname+'-'+ Date.now()+ path.extname(file.originalname));
        }
    });
    const upload=multer({storage:store});
    app.post('/items',upload.any(),midleware.check,function(req,res){

        
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
                    seller_id:result._id,
                    picture:req.files[0].filename,
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
        })
    });

    // order API
    app.post('/order',function(req,res){
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
                console.log("email:",result._id);
                obj={
                    user_id:result._id,
                    seller_id:req.body.seller_id,
                    item_id:req.body.item_id,
                    quantity:req.body.quantity
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
    app.post('/favourite',function(req,res){
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
                    seller_id:req.body.seller_id,
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
    app.post('/edit',profile.any(),function(req,res){
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
               if(req.body.name==null && req.body.email==null && req.body.phone_no==null)
               {
                   req.body.name=result.name;
                   req.body.email=result.email,
                   req.body.phone_no=result.phone_no
               }
               else if(req.body.email==null && req.body.phone_no==null && req.body.image==null)
               {
                req.body.image=result.image;
                req.body.email=result.email,
                req.body.phone_no=result.phone_no
               }
               else if(req.body.email==null && req.body.phone_no==null)
               {
                req.body.email=result.email,
                req.body.phone_no=result.phone_no
               }
               else if(req.body.name==null && req.body.image==null)
               {
                req.body.image=result.image;
                req.body.name=result.name;
               }
               else if(req.body.name==null && req.body.email==null)
               {
                req.body.name=result.name;
                req.body.email=result.email
               }
               else if(req.body.image==null && req.body.phone_no==null)
               {
                req.body.image=result.image;
                req.body.phone_no=result.phone_no;
               }
               else if(req.body.name==null)
               {
                req.body.name=result.name;
               }
               else if(req.body.image==null)
               {
                req.body.image=result.image;
               }
               else if(req.body.email==null)
               {
                req.body.email=result.email;
               }
               else if(req.body.phone_no==null)
               {
                req.body.phone_no=result.phone_no;
               }
               else
               {
                cibo.users.updateOne({_id:vary._id},{image:'http://192.168.1.20:5000/users_pictures/'+req.files[0].filename,name:req.body.name,email:req.body.email,phone_no:req.body.phone_no},function(err,success){
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
                                message:"your profile updated"
                            });
                        }
                    });
               }            

            cibo.users.updateOne({_id:vary._id},{image:req.body.image,name:req.body.name,email:req.body.email,phone_no:req.body.phone_no},function(err,success){
              
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
                        message:"your profile updated"
                    });
                }
            });
        }
    });
   });

   // schedule API
   app.post('/schedule',function(req,res){
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
   app.post('/blog',upload.any(),function(req,res){
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
                   pictures:req.files[0].filename,
                   user_id:result._id,
                   title:req.body.title,
                   description:req.body.description
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
 

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, function(){
        console.log('Server listening on port 5000');
    });