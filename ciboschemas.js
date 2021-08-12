var data = require('./database');
var mongoose = require('mongoose');
const { Schema } = mongoose;

// user schema
var user_schema = new Schema({
    name: String,
    email:
    {
        type: String,
        unique: true,sparse:true
    },
    phone_no:
    {
        type: Number,
        unique: true,
        sparse:true
    },
    password: String,
    confirm_password: String,
    otp: String,
    bio: String,
    location:
    {
        type: { type: String },
        coordinates: { type: [] }
    },
    lat:
    {
        type: Number,
        default: 0
    },
    long:
    {
        type: Number,
        default: 0
    },
    device_token: String,
    device_type: String,
    token: String,
    image: String,

    // seller details
    pan_card_number: { type: String,  sparse: true },
    adhar_number: { type: String,  sparse: true },
    pan_card_image: {type:String},
    adhar_card_image_front: {type:String },
    adhar_card_image_back:{type:String },
    physical_address: {
        street_name: String,
        city: String,
        state: String,
        pin: String
    },
    bank_details:
    {
        account_number: { type: String,  sparse:true },
        account_holder_name: String,
        ifse_code: { type: String,  sparse:true },
        bank_name: String
    },
    delivery_option:
    {
        type: Array,        
        default:['delivery']
    },
    delivery_address:String,
    schedule:
    {
        date: Date,
        time:
        {
            from: String,
            to: String
        }
    },
    seller: Boolean,
    verified_seller:Boolean,
    type: {type:String,enum:["facebook","google","manual"],default:"manual"},
    google_id: String,
    facebook_id: String
});

// review schema
var review_schema = new Schema({        
    user_id:
    {
        type: mongoose.Types.ObjectId,
        ref: "users"
    },
    rating:String,
    message: String
});

// item schema
var items_schema = new Schema({
    seller_id:
    {
        type: mongoose.Types.ObjectId,
        Ref: 'users'
    },
    picture:
    {
        type: String,
        default: ''
    },
    item_name: String,
    item_category: String,
    price: String,
    description: String,
    special_notes: String,
    active:{type:Boolean, default:true},     
});

var favourite_schema = new Schema({
    item_id: {
        type: mongoose.Types.ObjectId,
        ref: 'items'
    },
    user_id:
    {
        type: mongoose.Types.ObjectId,
        ref: "users"
    },
    seller_id:
    {
        type: mongoose.Types.ObjectId,
        ref: "users"
    },
    status: Boolean
});

// array schema
var arr= new Schema({   
    item_id:{
        type: mongoose.Types.ObjectId,
        ref: "items"
    },      
    total_pay: String,
    special_instruction:String,
    picture:String,
    item_name:String,
    price:String,
    quantity:String
});

// order schema
var order_schema = new Schema({
    seller_id:
    {
        type: mongoose.Types.ObjectId,
        ref: "users"
    },
    user_id:
    {
        type: mongoose.Types.ObjectId,
        ref: 'users'
    },      
    grand_total: String,
    special_instruction:String,
    order_number:String,
    delivery_charge:String,
    delivery_time:
    {
        type:String,
        enum:["priority","standard"]
     },
    service_charge:String,
    promo_discount:String,
    order_status:{
        type: String,
        enum: ['completed', 'cancelled','pending'],
        default:'pending'
    },
    status:{
        type:String,
        enum:["accept","reject","submit_order_delivery","submit_order_pickup","cancel"]
    },
    item:[arr],
    review:[review_schema],
    payment_method:String,
    created_at:Date
});

// add cart schema
var cart_schema = new Schema({   
    user_id:
    {
        type: mongoose.Types.ObjectId,
        ref: 'users'
    },
    item_id:{
        type: mongoose.Types.ObjectId,
        ref: "items"
    },  
    seller_id:
    {
        type: mongoose.Types.ObjectId,
        ref: "users"
    }, 
    total_pay: String,
    special_instruction:String,
    picture:String,
    item_name:String,
    price:String,
    quantity:String
   
});

// blog schema
var blog_schema = new Schema({
    user_id:
    {
        type: mongoose.Types.ObjectId,
        ref: 'users'
    },
    pictures: String,
    title: String,
    description: String,
    created_at:Date
});

// payment schema
var payment_schema = new Schema({
    User_id:
    {
        type: mongoose.Types.ObjectId,
        ref: 'users'
    },
    seller_id:
    {
        type: mongoose.Types.ObjectId,
        ref: 'users'
    },
    item_id:
    {
        type: mongoose.Types.ObjectId,
        ref: "items"
    },
    card_type: String,
    card_number: Number,
    validate_date: Date
});



user_schema.index({ location: '2dsphere' });
var users = mongoose.model('users', user_schema);
module.exports.users = users;

var items = mongoose.model('items', items_schema);
module.exports.items = items;

var favourite = mongoose.model('favourites', favourite_schema);
module.exports.favourite = favourite;

var order = mongoose.model('orders', order_schema);
module.exports.order = order;

var cart = mongoose.model('carts', cart_schema);
module.exports.cart = cart;

var blog = mongoose.model('blogs', blog_schema);
module.exports.blog = blog;

// var bank=mongoose.model('bank_details',bank_detail);
// module.exports.bank=bank;

var payment = mongoose.model('payments', payment_schema);
module.exports.payment = payment;

// var review = mongoose.model('reviews', review_schema);
// module.exports.review = review;

