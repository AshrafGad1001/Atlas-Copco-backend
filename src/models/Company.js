const mongoose = require('mongoose');

const normalize = (t) => t.trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
const companySchema = new mongoose.Schema({
  normalizedName: { type: String, unique: true },
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
companySchema.index({ name: 'text', normalizedName: 'text' });
companySchema.pre('save', function() { if (this.isModified('name')) { this.normalizedName = normalize(this.name); } });
companySchema.pre(/update/i, function() { const update = this.getUpdate(); if (update.name) { update.normalizedName = normalize(update.name); } });

// A company name must be unique within the same region
companySchema.index({ name: 1, region: 1 }, { unique: true });

module.exports = mongoose.model('Company', companySchema);
