if(process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const Joi = require('joi');
const {complaintSchema} = require('./schemas.js');
const catchAsync = require('./utils/catchAsync');
const expError = require('./utils/expError');
const Complaint = require('./models/complaint');
const Hotel = require('./models/hotel');
const passport = require('passport');
const localStrategy = require('passport-local');
const User = require('./models/user');
const Manager = require('./models/manager');
const multer = require('multer');
const {storage} = require('./cloudinary');
const { name } = require('ejs');
const upload = multer({storage});
const DBurl = process.env.DB_url;
const SortedComplaint = require('./models/sortedComplaint')

mongoose.connect('DBurl',{
   
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database Connected");
}); 


const seedDB = async () => {
    // await Complaint.deleteMany({});
    const sortedComplaint = new SortedComplaint({
        title: "leaking shower",
    image: [
        {
            url: 'https://res.cloudinary.com/douqbebwk/image/upload/v1600060601/YelpCamp/ahfnenvca4tha00h2ubt.png',
            filename: 'YelpCamp/ahfnenvca4tha00h2ubt'
        },
        {
            url: 'https://res.cloudinary.com/douqbebwk/image/upload/v1600060601/YelpCamp/ruyoaxgf72nzpi4y6cdi.png',
            filename: 'YelpCamp/ruyoaxgf72nzpi4y6cdi'
        }
    ],
    hotel: "we@we",
    description: "when I entered the bathroom, the shower was leaking",
    label: "leak"
    })
    await hotel.save();
}

seedDB();