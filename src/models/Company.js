const mongoose = require('mongoose');
const normalizeName = require('../utils/normalizeName');

const companySchema = new mongoose.Schema({
  nameAr: {
    type: String,
    trim: true,
  },
  nameEn: {
    type: String,
    trim: true,
  },
  nameArNorm: { type: String, index: true },
  nameEnNorm: { type: String, index: true },
  region: {
    type: mongoose.Schema.ObjectId,
    ref: 'Region',
    required: [true, '\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0645\u0637\u0644\u0648\u0628\u0629'],
  },
  address: { type: String, trim: true },
  industry: { type: String, trim: true },
  notes: { type: String, trim: true },
  isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

companySchema.pre('save', function() {
  if (this.isModified('nameAr')) this.nameArNorm = normalizeName(this.nameAr);
  if (this.isModified('nameEn')) this.nameEnNorm = normalizeName(this.nameEn);
});



module.exports = mongoose.model('Company', companySchema);
