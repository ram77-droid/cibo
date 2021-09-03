var cibo= require('./ciboschemas.js');
var express = require('express');   
var app = express();
var body_parser = require('body-parser');
app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: false }));
var jwt = require('jsonwebtoken');
module.exports.check= function check(req,res,next)
{
   
        if(req.headers.authorization)
    {
        token=req.headers.authorization.split(' ')[1];
       
        var vary=jwt.verify(token,'ram');
      
        cibo.users.findOne({_id:vary._id},function(err,result){
           
            if(err)
            {
                return res.json({
                    message:err.message
                });
            }
            else if(result)
            {                
                 req.current_user_id=result._id,
                 req.user_loaction=result.location    
            next();                   
            }
            else
            {
                return res.json({
                    message:"token not found!!"
                })
            }
        });
    }
    else
    {
        return res.json({
            message:"not authorized!!"
        });
    }

};