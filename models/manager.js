const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const Schema = mongoose.Schema;

const managerSchema = new Schema({
    name: String,
    email: {
        type: String,
        requried: true,
        unique: true
    },
    hotel: String,
    isManager: {
        type: Boolean,
        default: true  // Set the default value to true
    }
});
managerSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model('Manager', managerSchema);