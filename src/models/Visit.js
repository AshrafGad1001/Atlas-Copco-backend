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
  }
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);
