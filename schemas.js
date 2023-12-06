const Joi = require('joi');

const complaintSchema = Joi.object({
    complaint: Joi.object({
        title: Joi.string().required(),
        hotel: Joi.string().required(),
        description: Joi.string().required(),
    }).required
});

module.exports.HFPschema;