const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sortedComplaintSchema = new Schema({
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
    },
    label: String
});

module.exports = mongoose.model('SortedComplaint', sortedComplaintSchema);
