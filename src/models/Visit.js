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
  type: { type: String, trim: true },
  nextStep: { type: String, trim: true },
  followUp: {
    dueDate: { type: Date },
    note: { type: String, maxlength: 200 },
    done: { type: Boolean, default: false },
    doneAt: { type: Date }
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
  attendees: {
    type: [{
    name: { type: String, required: [true, 'الاسم مطلوب'], minlength: 2, maxlength: 100, trim: true },
    jobTitle: { type: String, maxlength: 100, trim: true },
    phone: { type: String, match: [/^[0-9+]{8,15}$/, 'رقم الموبايل غير صالح'], trim: true }
  }],
    validate: [v => v.length <= 10, "الحد الأقصى 10 مرافقين"]
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.ObjectId, ref: "User" },
  editHistory: [{
    _id: false,
    editedBy: { type: mongoose.Schema.ObjectId, ref: "User" },
    editedAt: { type: Date, default: Date.now },
    changes: [{
      _id: false,
      field: String,
      from: String,
      to: String
    }]
  }]
}, { timestamps: true });

visitSchema.index({ engineer: 1, visitDate: -1 });
visitSchema.index({ "followUp.dueDate": 1 });

module.exports = mongoose.model('Visit', visitSchema);
