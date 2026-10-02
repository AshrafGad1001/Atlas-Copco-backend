const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  engineer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'المهندس مطلوب']
  },
  company: {
    type: mongoose.Schema.ObjectId,
    ref: 'Company',
    required: [true, 'الشركة مطلوبة']
  },
  visitDate: {
    type: Date,
    default: Date.now,
    required: [true, 'تاريخ الزيارة مطلوب']
  },
  notes: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['planned', 'completed', 'cancelled'],
    default: 'completed'
  },
  attendees: [{
    name: { type: String, required: [true, 'اسم الحاضر مطلوب'], minlength: 2, maxlength: 100, trim: true },
    jobTitle: { type: String, maxlength: 100, trim: true },
    phone: { type: String, match: [/^[0-9+]{8,15}$/, 'رقم الموبايل غير صالح'], trim: true }
  }],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);
