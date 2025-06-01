const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    minlength: [6, 'Username must be at least 6 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    unique: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    maxlength: [1024, 'Password hash too long'],
    select: false // Don't include password by default in queries
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    minlength: [10, 'Email must be at least 10 characters'],
    maxlength: [50, 'Email cannot exceed 50 characters'],
    unique: true,
    trim: true,
    lowercase: true, // Store emails in lowercase
    index: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'admin'],
      message: '{VALUE} is not a valid role'
    },
    default: 'user',
    index: true
  },
  avatar: {
    type: String,
    default: null,
    trim: true
  },
  gender: {
    type: String,
    enum: {
      values: ['male', 'female', 'other'],
      message: '{VALUE} is not a valid gender'
    },
    default: null
  },
  birthDate: {
    type: Date,
    default: null,
    validate: {
      validator: function(v) {
        return !v || v <= new Date();
      },
      message: 'Birth date cannot be in the future'
    }
  },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{10,11}$/.test(v);
      },
      message: 'Phone number must be 10-11 digits'
    },
    default: null,
    trim: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  address: {
    type: String,
    maxlength: 200,
    default: null,
  },
}, { 
  timestamps: true,
  // Thêm các index cho các trường thường query
  indexes: [
    { username: 1 },
    { email: 1 },
    { isOnline: 1 },
    { lastActive: -1 }
  ],
  // Tối ưu mongoose
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Thêm compound index cho tối ưu tìm kiếm
userSchema.index({ username: 1, email: 1 });

module.exports = mongoose.model('User', userSchema);