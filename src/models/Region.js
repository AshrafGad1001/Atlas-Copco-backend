const mongoose = require('mongoose');

const regionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Region name is required'],
    trim: true,
    unique: true,
  },
}, { timestamps: true });

const Region = mongoose.model('Region', regionSchema);

module.exports = Region;
