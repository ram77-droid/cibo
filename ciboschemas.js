var data=require('./database');
var mongoose=require('mongoose');
const {Schema}=mongoose;

// user schema
var user_schema=new Schema({
    name:String,
    email:
    {
        type:String,
        unique:true
    },
    phone_no:
    {
        type:Number,
        unique:true
    },
    password:String,
    confirm_password:String,
    otp:Number,
    location:
    {
        type:{ type: String },
        coordinates:{ type: [] }
    },
    lat:
    {
        type:Number,
        default:0
    },
    long:
    {
        type:Number,
        default:0
    },
    device_token:String,
    device_type:String,
    token:String,
    image:String,
  
    // seller details
    pan_card_number:Number,
    adhar_number:Number,
    pan_card_image:String,
    adhar_card_image_front:String,
    adhar_card_image_back:String,
    physical_address:{
        street_name:String,
        city:String,
        state:String,
        pin:Number
    },
    bank_details:
    {
        account_number:Number,
        account_holder_name:String,
        ifse_code:Number,
        bank_name:String
    },
    delivery_option:
    {
        type:String,
        enum:['delivery','pick up'],
        default:'delivery'
    }
});

// item schema
var items_schema= new Schema({
    seller_id:
    {
        type:mongoose.Types.ObjectId, 
        Ref:'users'
    },
    picture:
    {
        type:String,
        default:''
    },
    item_name:String,
    item_category:String,
    price:String,
    description:String,
    special_notes:String   
});

var favourite_schema=new Schema({
    item_id:{
        type:mongoose.Types.ObjectId,
        ref:'items'
    },
    user_id:
    {
        type:mongoose.Types.ObjectId,
        ref:"users"
    },
    seller_id:
    {
        type:mongoose.Types.ObjectId,
        ref:"users"
    },
    status:Boolean
});

// order schema
var order_schema= new Schema({
seller_id:
{
    type:mongoose.Types.ObjectId,
    ref:"users"
},
user_id:
{
    type:mongoose.Types.ObjectId,
    ref:'users'
},
item_id:
{
    type:mongoose.Types.ObjectId,
    ref:'items'
},
quantity:Number

});

// blog schema
var blog_schema=new Schema({
    seller_id:
    {
        type:mongoose.Types.ObjectId,
        ref:'users'
    },
    pictures:Array,
    title:String,
    description:String
});

// bank_detail schema

// var bank_detail=new Schema({
//     seller_id:
//     {
//         type:mongoose.Types.ObjectId,
//         ref:'users'
//     },
//     Account_number:Number,
//     account_holder_name:String,
//     ifse_code:String,
//     bank_name:String

// });

// payment schema
var payment_schema=new Schema({
    User_id:
    {
        type:mongoose.Types.ObjectId,
        ref:'users'
    },
    seller_id:
    {
        type:mongoose.Types.ObjectId,
        ref:'users'
    },
    card_type:String,
    card_number:Number,
    validate_date:Date
});

// review schema
var review_schema=new Schema({
    seller_id:
    {
        type:mongoose.Types.ObjectId,
        ref:'users'
    },
    item_id:
    {
        type:mongoose.Types.ObjectId,
        ref:"items"
    },
    User_id:
    {
        type:mongoose.Types.ObjectId,
        ref:"users"
    },
    review:String
});

user_schema.index({location:'2dsphere'});
var users=mongoose.model('users',user_schema);
module.exports.users=users;

var items=mongoose.model('items',items_schema);
module.exports.items=items;

var favourite=mongoose.model('favourites',favourite_schema);
module.exports.favourite=favourite;

var order=mongoose.model('orders',order_schema);
module.exports.order=order;

var blog=mongoose.model('blogs',blog_schema);
module.exports.blog=blog;

// var bank=mongoose.model('bank_details',bank_detail);
// module.exports.bank=bank;

var payment=mongoose.model('payments',payment_schema);
module.exports.payment=payment;

var review=mongoose.model('reviews',review_schema);
module.exports.review=review;

