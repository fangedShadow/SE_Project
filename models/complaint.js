const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const complaintSchema = new Schema({
    title: String,
    image: [
        {
            url: String,
            filename: String
        }
    ],
    hotel: String,
    description: String,
    source: String, 
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Complaint', complaintSchema);
