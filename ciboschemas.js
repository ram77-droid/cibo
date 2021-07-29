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
    otp:String,
    bio:String,
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
    pan_card_number:{type:String, unique:true},
    adhar_number:{type:String, unique:true},
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
        account_number:{type:Number, unique:true},
        account_holder_name:String,
        ifse_code:{type:String, unique:true},
        bank_name:String
    },
    delivery_option:
    {
        type:String,
        enum:['delivery','pick up']       
    },
    schedule:
    {
        date:Date,
        time:
        {
            from:String,
            to:String
        }
    },
    seller:Boolean,
    google_id:String,
    facebook_id:String
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
quantity:Number,
price:String,
total_pay:Number
});

// add cart schema
var cart_schema= new Schema({
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
    item_name:String,
    picture:String,
    seller_name:String,
    quantity:String,
    price:String,
   total_pay:String
    
    });

// blog schema
var blog_schema=new Schema({
    user_id:
    {
        type:mongoose.Types.ObjectId,
        ref:'users'
    },
    pictures:String,
    title:String,
    description:String
});

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

var cart=mongoose.model('carts',cart_schema);
module.exports.cart=cart;

var blog=mongoose.model('blogs',blog_schema);
module.exports.blog=blog;

// var bank=mongoose.model('bank_details',bank_detail);
// module.exports.bank=bank;

var payment=mongoose.model('payments',payment_schema);
module.exports.payment=payment;

var review=mongoose.model('reviews',review_schema);
module.exports.review=review;

