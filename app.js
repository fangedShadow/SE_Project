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
const SortedComplaint = require('./models/sortedComplaint');
const pdfkit = require('pdfkit');
const fs = require('fs');

mongoose.connect(DBurl,{
   
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database Connected");
}); 

// const seedDB = async () => {
//     // await Complaint.deleteMany({});
//     const sortedComplaint = new SortedComplaint({
//         title: "leaking shower",
//     image: [
//         {
//             url: 'https://res.cloudinary.com/douqbebwk/image/upload/v1600060601/YelpCamp/ahfnenvca4tha00h2ubt.png',
//             filename: 'YelpCamp/ahfnenvca4tha00h2ubt'
//         },
//         {
//             url: 'https://res.cloudinary.com/douqbebwk/image/upload/v1600060601/YelpCamp/ruyoaxgf72nzpi4y6cdi.png',
//             filename: 'YelpCamp/ruyoaxgf72nzpi4y6cdi'
//         }
//     ],
//     hotel: "we@we",
//     description: "when I entered the bathroom, the shower was leaking",
//     label: "leak"
//     })
//     await sortedComplaint.save();
// }

//seedDB();
const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({extened: true}))

const sessionConfig = {
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};
app.use(session(sessionConfig))
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    if (user.isManager) {
        done(null, { id: user.id, isManager: true });
    } else {
        done(null, { id: user.id, isManager: false });
    }
});

passport.deserializeUser(async (data, done) => {
    try {
        if (data.isManager) {
            const manager = await Manager.findById(data.id);
            done(null, manager);
        } else {
            const user = await User.findById(data.id);
            done(null, user);
        }
    } catch (error) {
        done(error, null);
    }
});

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

passport.use('local-user', new localStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, async (username, password, done) => {
    try {
      const user = await User.findOne({ username });
  
      if (!user) {
        return done(null, false, { message: 'Incorrect username and password.' });
      }
  
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
  
  passport.use('local-manager', new localStrategy({
    usernameField: 'username',
    passwordField: 'password'
}, async (username, password, done) => {
    try {
        const manager = await Manager.findOne({ username });

        if (!manager) {
            return done(null, false, { message: 'Incorrect username and password.' });
        }

        return done(null, manager);
    } catch (err) {
        return done(err);
    }
}));




// const isLoggedIn = (req, res, next) => {
//     if(!req.isAuthenticated()) {
//         req.flash('error', 'you must be signed in first!');
//         return res.redirect('/managLogin');
//     } 
//     next();
// }



const isLoggedInUser = (req, res, next) => {
    if (!req.isAuthenticated() || !req.user.isManager) {
        req.flash('error', 'You must be signed in as a user.');
        return res.redirect('/userLogin');
    }
    next();
};

const isLoggedInManager = (req, res, next) => {
    if (req.isAuthenticated() && req.user && req.user.isManager) {
        return next();
    } else {
        req.flash('error', 'You must be signed in as a manager.');
        return res.redirect('/managLogin');
    }
};
app.get('/', (req, res) => {
    res.render('home')
})

app.get('/userReg', (req, res) => {
    res.render('User/register');
})
app.post('/userReg', catchAsync(async(req,res) => {
    try {
        const {name, email, username, password} = req.body;
        const user = new User({name, email, username});
        const regUser = await User.register(user, password);
        req.login(regUser, err => {
            if (err) return next(err);
            req.flash('success','Welcome to HFP');
            res.redirect('/complaint/new');
        })
        
    } catch(e){
        req.flash('error', e.message);
        res.redirect('/userReg');
    }
}));

app.get('/userLogin', (req,res) => {
    res.render('User/login');
})

app.post('/userLogin', passport.authenticate('local-user', { failureFlash: true, failureRedirect: '/userLogin' }), (req, res) => {
    req.flash('success', 'Welcome back');
    res.redirect('/complaint/new');
  });

app.get('/userLogout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
}); 


app.get('/managReg', (req, res) => {
    res.render('Hotel/register');
})
app.post('/managReg', catchAsync(async(req,res) => {
    try {
        const {name, email, username, hotelName, hotelAddress, password} = req.body;
        let hotel = await Hotel.findOne({name: hotelName})
        if (!hotel) {
            hotel = new Hotel({name: hotelName, address: hotelAddress});
            await hotel.save();
        }
        const manager = new Manager({name, email, hotel: hotel._id, username});
        const regManager = await Manager.register(manager, password);
        req.login(regManager, err => {
            if (err) return next(err);
            req.flash('success','Welcome to HFP');
            res.redirect('/complaint/dashboard');
        })
    } catch(e){
        req.flash('error', e.message);
        res.redirect('/managReg');
    }
}));

app.get('/managLogin', (req,res) => {
    res.render('Hotel/login');
})

app.post('/managLogin', passport.authenticate('local-manager', { failureFlash: true, failureRedirect: '/managLogin' }), (req, res) => {
    
    req.flash('success', 'Welcome');
    res.redirect('/complaint/dashboard');
});

app.get('/managLogout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Goodbye!');
        res.redirect('/');
    });
}); 

// Middleware to be applied after manager login


// Import necessary models
app.get('/complaint', isLoggedInManager, catchAsync(async (req, res) => {
    // Assuming that the manager's hotel information is stored in req.user.hotel
    const managerHotel = req.user.hotel;

    // Fetch the manager's hotel information
    const hotels = await Hotel.findById(managerHotel);
    
    // Check if the hotel is found
    if (!hotels) {
        // Handle the case when the hotel is not found
        return res.status(404).send('Hotel not found');
    }

    console.log('Manager Hotel:', hotels.name);

    // Fetch only the complaints associated with the manager's hotel
    const complaints = await Complaint.find({ hotel: hotels.name });

    res.render('complaint/index', { complaints });
}));

app.get('/complaint/new', catchAsync(async(req,res) => {
    
    const user = await User.find({});
    const complaints = await Complaint.find({});
    const hotels = await Hotel.find({});
    res.render('complaint/new', {complaints, hotels, user});
}))



app.post('/complaint', upload.array('image'), catchAsync(async (req,res,next) => {
    const complaint = new Complaint(req.body.complaint);
    complaint.image = req.files.map(f => ({url: f.path, filename: f.filename}));
    await complaint.save();
    req.flash('success', 'Complaint Submitted');
    res.redirect(`/complaint/new`)    
}))

function generatePdf(startDate, endDate, labelCounts, managerName, hotelname) {
    return new Promise((resolve, reject) => {
        const pdfDoc = new pdfkit();
        const buffers = [];

        pdfDoc.font('Helvetica-Bold').fontSize(28).text('Complaints Report', { align: 'center' });
        pdfDoc.moveDown();
        pdfDoc.font('Helvetica').fontSize(14).text(`Date Range: ${startDate} to ${endDate}`, { align: 'left' });
        pdfDoc.font('Helvetica').fontSize(14).text(`Requested By: ${managerName}`, { align: 'left' });
        pdfDoc.moveDown();
        pdfDoc.font('Helvetica').fontSize(18).text(`${hotelname}`, { align: 'center' });
        
        const hasComplaints = Object.values(labelCounts).some(count => count > 0);

        // Display complaints in a table only if there are any
        if (hasComplaints) {
            pdfDoc.moveDown(); // Move to the next line

            // Set up table headers
            pdfDoc.font('Helvetica-Bold').fontSize(12).text('Complaint Type', { align: 'left', continued: true });
            pdfDoc.font('Helvetica-Bold').fontSize(12).text('Count', { align: 'right' });

            // Iterate through label counts and print only if count is greater than 0
            Object.entries(labelCounts).forEach(([label, count]) => {
                if (count > 0) {
                    pdfDoc.font('Helvetica').fontSize(12).text(label, { align: 'left', continued: true });
                    pdfDoc.font('Helvetica').fontSize(12).text(count.toString(), { align: 'right' });
                }
            });
        }

        // Add manager's name at the end of the report
        // Handle 'data' event to collect buffers
        pdfDoc.on('data', buffer => {
            buffers.push(buffer);
        });

        // Handle 'end' event to resolve with the complete buffer
        pdfDoc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });

        // Handle 'error' event to reject on error
        pdfDoc.on('error', reject);

        // Start generating the PDF
        pdfDoc.end();
    });
}

app.get('/complaint/report', isLoggedInManager, catchAsync(async(req,res) => {
    const sortedcomplaints = await SortedComplaint.find({});
    const managerHotel = req.user.hotel;

    // Fetch the manager's hotel information
    const hotels = await Hotel.findById(managerHotel);
    res.render('complaint/report', {sortedcomplaints, hotels});
}))

app.post('/complaint/generate-report', isLoggedInManager, catchAsync(async(req, res) => {
        const hotels = await Hotel.findOne({ _id: req.user.hotel });
        const hotelName = hotels.name;
        const startDate = req.body.startDate;
        const endDate = req.body.endDate;

        // Initialize counts for each label type
        let generalCount = 0;
        let housekeepingCount = 0;
        let contentCount = 0;
        let bathroomCount = 0;
        let maintenanceCount = 0;
        let serviceCount = 0;
        

        // Fetch counts for each label type based on the checked checkboxes
        if (req.body.complaintType.includes('General')) {
            const generalLabels = ["temperature", "insects", "noise", "rodent", "smells", "mold"];
            generalCount = await SortedComplaint.countDocuments({ hotel: hotelName, date: { $gte: startDate, $lte: endDate }, label: { $in: generalLabels } });
        }

        if (req.body.complaintType.includes('Housekeeping')) {
            const housekeepingLabels = ["cleanliness", "dirty floor", "stains", "wet floor"];
            housekeepingCount = await SortedComplaint.countDocuments({ hotel: hotelName, date: { $gte: startDate, $lte: endDate }, label: { $in: housekeepingLabels } });
           
        }

        if (req.body.complaintType.includes('Content')) {
            const contentLabels = ["content", "bed", "fridge", "towels", "television", "safe"];
            contentCount = await SortedComplaint.countDocuments({ hotel: hotelName, date: { $gte: startDate, $lte: endDate }, label: { $in: contentLabels } });
          
        }

        if (req.body.complaintType.includes('Bathroom')) {
            const bathroomLabels = ["bathroom", "dirty water", "toiletries", "water temperature"];
            bathroomCount = await SortedComplaint.countDocuments({ hotel: hotelName, date: { $gte: startDate, $lte: endDate }, label: { $in: bathroomLabels } });
       
        }

        if (req.body.complaintType.includes('Maintenance')) {
            const maintenanceLabels = ["maintenance", "leak", "lights"];
            maintenanceCount = await SortedComplaint.countDocuments({ hotel: hotelName, date: { $gte: startDate, $lte: endDate }, label: { $in: maintenanceLabels } });
        }

        if (req.body.complaintType.includes('Service')) {
            const serviceLabels = ["charges", "room service", "staff"];
            serviceCount = await SortedComplaint.countDocuments({ hotel: hotelName, date: { $gte: startDate, $lte: endDate }, label: { $in: serviceLabels } });
        }

        // Create an object to store counts for each label type
        const labelCounts = {
            General: generalCount,
            Housekeeping: housekeepingCount,
            Content: contentCount,
            Bathroom: bathroomCount,
            Maintenance: maintenanceCount,
            Service: serviceCount
        };

        // Generate PDF using pdfkit
        const pdfBuffer = await generatePdf(startDate, endDate, labelCounts, req.user.name, hotelName);

        // Send the PDF as a download
        res.setHeader('Content-Disposition', 'attachment; filename=complaints_report.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        res.end(pdfBuffer);
}));



app.get('/complaint/dashboard', isLoggedInManager, catchAsync(async (req, res) => {
    // Assuming that the manager's hotel information is stored in req.user.hotel
    const managerHotel = req.user.hotel;

    // Fetch the manager's hotel information
    const hotels = await Hotel.findById(managerHotel);
    
    // Check if the hotel is found
    if (!hotels) {
        // Handle the case when the hotel is not found
        return res.status(404).send('Hotel not found');
    }



    // Fetch only the complaints associated with the manager's hotel
    const sortedComplaints = await SortedComplaint.find({ hotel: hotels.name });

    res.render('complaint/sortedIndex', { sortedComplaints, hotels });
}));

app.get('/complaint/dashboard/bathIssue', isLoggedInManager, catchAsync(async (req, res) => {
    // Assuming that the manager's hotel information is stored in req.user.hotel
    const managerHotel = req.user.hotel;

    // Fetch the manager's hotel information
    const hotels = await Hotel.findById(managerHotel);
    
    // Check if the hotel is found
    if (!hotels) {
        // Handle the case when the hotel is not found
        return res.status(404).send('Hotel not found');
    }

   

    // Define the labels you want to filter
    const desiredLabels = ["bathroom", "dirty water", "toiletries", "water temperature"];

    // Fetch only the complaints associated with the manager's hotel and the desired labels
    const sortedcomplaints = await SortedComplaint.find({ 
        hotel: hotels.name,
        label: { $in: desiredLabels }  // Use $in operator to match any of the specified labels
    });

    res.render('complaint/indexbath', { sortedcomplaints });
}));

app.get('/complaint/dashboard/contentIssue', isLoggedInManager, catchAsync(async (req, res) => {
    // Assuming that the manager's hotel information is stored in req.user.hotel
    const managerHotel = req.user.hotel;

    // Fetch the manager's hotel information
    const hotels = await Hotel.findById(managerHotel);
    
    // Check if the hotel is found
    if (!hotels) {
        // Handle the case when the hotel is not found
        return res.status(404).send('Hotel not found');
    }

    

    // Define the labels you want to filter
    const desiredLabels = ["content", "bed", "fridge", "towels", "television", "safe"];

    // Fetch only the complaints associated with the manager's hotel and the desired labels
    const sortedcomplaints = await SortedComplaint.find({ 
        hotel: hotels.name,
        label: { $in: desiredLabels }  // Use $in operator to match any of the specified labels
    });

    res.render('complaint/indexcontent', { sortedcomplaints });
}));

app.get('/complaint/dashboard/generalIssue', isLoggedInManager, catchAsync(async (req, res) => {
    // Assuming that the manager's hotel information is stored in req.user.hotel
    const managerHotel = req.user.hotel;

    // Fetch the manager's hotel information
    const hotels = await Hotel.findById(managerHotel);
    
    // Check if the hotel is found
    if (!hotels) {
        // Handle the case when the hotel is not found
        return res.status(404).send('Hotel not found');
    }



    // Define the labels you want to filter
    const desiredLabels = ["temperature", "insects", "noise", "rodent", "smells" , "mold" ];

    // Fetch only the complaints associated with the manager's hotel and the desired labels
    const sortedcomplaints = await SortedComplaint.find({ 
        hotel: hotels.name,
        label: { $in: desiredLabels }  // Use $in operator to match any of the specified labels
    });

    res.render('complaint/indexgeneral', { sortedcomplaints });
}))

app.get('/complaint/dashboard/houseKeepIssue', isLoggedInManager, catchAsync(async (req, res) => {
    // Assuming that the manager's hotel information is stored in req.user.hotel
    const managerHotel = req.user.hotel;

    // Fetch the manager's hotel information
    const hotels = await Hotel.findById(managerHotel);
    
    // Check if the hotel is found
    if (!hotels) {
        // Handle the case when the hotel is not found
        return res.status(404).send('Hotel not found');
    }



    // Define the labels you want to filter
    const desiredLabels = ["cleanliness", "dirty floor", "stains", "wet floor"];

    // Fetch only the complaints associated with the manager's hotel and the desired labels
    const sortedcomplaints = await SortedComplaint.find({ 
        hotel: hotels.name,
        label: { $in: desiredLabels }  // Use $in operator to match any of the specified labels
    });

    res.render('complaint/indexhousek', { sortedcomplaints });
}))

app.get('/complaint/dashboard/maintenIssue', isLoggedInManager, catchAsync(async (req, res) => {
    // Assuming that the manager's hotel information is stored in req.user.hotel
    const managerHotel = req.user.hotel;

    // Fetch the manager's hotel information
    const hotels = await Hotel.findById(managerHotel);
    
    // Check if the hotel is found
    if (!hotels) {
        // Handle the case when the hotel is not found
        return res.status(404).send('Hotel not found');
    }



    // Define the labels you want to filter
    const desiredLabels = ["maintenance", "leak", "lights"];

    // Fetch only the complaints associated with the manager's hotel and the desired labels
    const sortedcomplaints = await SortedComplaint.find({ 
        hotel: hotels.name,
        label: { $in: desiredLabels }  // Use $in operator to match any of the specified labels
    });

    res.render('complaint/indexmainten', { sortedcomplaints });
}))

app.get('/complaint/dashboard/serIssue', isLoggedInManager, catchAsync(async (req, res) => {
     // Assuming that the manager's hotel information is stored in req.user.hotel
     const managerHotel = req.user.hotel;

     // Fetch the manager's hotel information
     const hotels = await Hotel.findById(managerHotel);
     
     // Check if the hotel is found
     if (!hotels) {
         // Handle the case when the hotel is not found
         return res.status(404).send('Hotel not found');
     }
 

 
     // Define the labels you want to filter
     const desiredLabels = ["charges", "room service", "staff"];
 
     // Fetch only the complaints associated with the manager's hotel and the desired labels
     const sortedcomplaints = await SortedComplaint.find({ 
         hotel: hotels.name,
         label: { $in: desiredLabels }  // Use $in operator to match any of the specified labels
     });
 
     res.render('complaint/indexserv', { sortedcomplaints });
}));









app.get('/complaint/:id', isLoggedInManager, catchAsync(async (req, res) => {
    const sortedcomplaint = await SortedComplaint.findById(req.params.id);
    if(!sortedcomplaint) {
        req.flash('error', 'Complaint does not Exist');
        return res.redirect('/complaint');
    }
    res.render('complaint/show', {sortedcomplaint});
}));

app.delete('/complaint/:id', isLoggedInManager, catchAsync(async (req,res) => {
    const { id } = req.params;
    await sortedComplaintComplaint.findByIdAndDelete(id);
    req.flash('success', "Complaint Deleted")
    res.redirect('/complaint');
}));


app.all('*', (req,res,next) => {
    next(new expError('Page not Found', 404))
})

app.use((err, req, res, next) => {
    const {statusCode = 500} = err;
    if (!err.message) err.message = 'oh no, something is not working, try again later'
    res.status(statusCode).render('error', {err});
})

app.listen(3000, () => {
    console.log('Serving on port 3000')
})
