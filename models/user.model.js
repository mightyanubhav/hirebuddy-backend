const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  phone: {
    type: String,
    required: true,
    match: /^\+[1-9]\d{1,14}$/,
  },

  role: {
    type: String,
    enum: ['buddy', 'admin', 'customer'],
    required: true,
    default: 'customer'
  },

  password: {
    type: String,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
