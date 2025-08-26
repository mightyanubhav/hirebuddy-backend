const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },

  phone: {
    type: String,
    required: true,
    match: /^\+[1-9]\d{1,14}$/, // E.164 format
    // unique: true,
  },

  role: {
    type: String,
    enum: ["buddy", "admin", "customer"],
    required: true,
    default: "customer",
  },

  password: {
    type: String,
    required: true,
  },

  credits: {
    type: Number,
    default: 3, // give 3 free trial credits initially
    min: 0,
  },
  // Optional: Buddy-specific profile fields
  buddyProfile: {
    baseRate: Number,
    expertise: [String], // ✅ this line must be an array of strings
    location: String,
    languages: [String],
    bio: String,
    availableDates: [String], // or [Date] if you want to store actual date types
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
