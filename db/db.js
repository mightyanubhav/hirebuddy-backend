require('dotenv').config();
const mongoose = require('mongoose');

const DB_URL = process.env.MONGO_URL;

async function connectDB(){
    try{
        await mongoose.connect(DB_URL)
        console.log('DB connected successfully')
    }catch(err){
        console.error('❌ MongoDB connection error:', err)
    }

}

module.exports = connectDB