const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const phoneSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    match: [/^[0-9+]{8,15}$/, 'Please add a valid phone number'],
  },
  label: String,
  isPrimary: { type: Boolean, default: false }
}, { _id: false });

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-z0-9._-]+$/, 'Username can only contain lowercase letters, numbers, dot, underscore, and dash'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'],
  },
  phones: {
    type: [phoneSchema],
    validate: {
      validator: function(v) {
        if (this.role === 'engineer' && (!v || v.length === 0)) return false;
        return true;
      },
      message: 'At least one phone number is required for an engineer'
    }
  },
  profileImage: {
    url: String,
    publicId: String
  },
  birthDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true; // not required
        return v < new Date();
      },
      message: 'Birth date must be in the past'
    }
  },
  role: {
    type: String,
    enum: ['admin', 'engineer'],
    required: true
  },
  region: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Region',
    required: [
      function() { return this.role === 'engineer'; },
      'Region is required for engineers'
    ],
    validate: {
      validator: function(v) {
        if (this.role === 'admin' && v) return false;
        return true;
      },
      message: 'Region is forbidden for admins'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false
  },
  tokenVersion: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for age
userSchema.virtual('age').get(function() {
  if (!this.birthDate) return undefined;
  const ageDifMs = Date.now() - this.birthDate.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
});

// Pre-save to handle password hashing and primary phone logic
userSchema.pre('save', async function() {
  // Primary phone logic
  if (this.phones && this.phones.length > 0) {
    const primaryCount = this.phones.filter(p => p.isPrimary).length;
    if (primaryCount === 0) {
      this.phones[0].isPrimary = true;
    } else if (primaryCount > 1) {
      let firstFound = false;
      this.phones.forEach(p => {
        if (p.isPrimary && !firstFound) {
          firstFound = true;
        } else {
          p.isPrimary = false;
        }
      });
    }
  }

  // Password hashing
  if (!this.isModified('password')) {
    return;
  }
  const rounds = process.env.NODE_ENV === 'test' ? 4 : parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  const salt = await bcrypt.genSalt(rounds);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password and __v from toJSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
