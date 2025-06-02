const express = require('express');
const twilio = require('twilio');
require('dotenv').config();
const bcrypt = require('bcrypt');
const User = require('../models/user.model');

const router = express.Router();

// Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// =======================
// SEND OTP (SIGNUP STEP 1)
// =======================
router.post('/signup', async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    // Send OTP via Twilio Verify
    const verification = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({ to: phone, channel: 'sms' });

    return res.json({ message: 'OTP sent successfully', status: verification.status });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ===========================
// VERIFY OTP & CREATE ACCOUNT
// ===========================
router.post('/verify-otp', async (req, res) => {
  const { name, email, phone, role, password, otp } = req.body;

  if (!phone || !otp || !name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Verify OTP
    const verificationCheck = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({ to: phone, code: otp });

    if (verificationCheck.status !== 'approved') {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Check for existing user
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this phone' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      phone,
      role,
      password: hashedPassword,
    });

    await newUser.save();

    return res.json({ message: 'Signup successful', user: newUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'OTP verification or user creation failed' });
  }
});

module.exports = router;
