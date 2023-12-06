const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const hotelSchema = new Schema({
    name: String,
    address: String,
});

module.exports = mongoose.model('Hotel', hotelSchema);