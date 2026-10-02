const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم الشركة مطلوب'],
    trim: true,
  },
  region: {
    type: mongoose.Schema.ObjectId,
    ref: 'Region',
    required: [true, 'المنطقة مطلوبة'],
  },
  address: {
    type: String,
    trim: true,
  },
  phones: [{
    number: {
      type: String,
      required: [true, 'رقم الهاتف مطلوب']
    }
  }],
}, { timestamps: true });

// A company name must be unique within the same region
companySchema.index({ name: 1, region: 1 }, { unique: true });

module.exports = mongoose.model('Company', companySchema);
