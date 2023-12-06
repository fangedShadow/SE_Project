const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const hotelCamplaintSchema = new Schema({
    complaints: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Complaint'
        }
    ],
    hotel: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Hotel'
        }
    ]
});

module.exports = mongoose.model('ComplHotel', hotelCamplaintSchema);