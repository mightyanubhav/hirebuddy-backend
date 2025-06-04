const express = require("express");
const twilio = require("twilio");
const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const redisClient = require("../db/redis");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middlewares/auth");

require("dotenv").config();

const router = express.Router();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// =======================
// SIGNUP: collect data & send OTP
// =======================
router.post("/signup", async (req, res) => {
  const { phone, name, email, password, role } = req.body;

  if (!phone || !name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User already exists with this phone" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save data temporarily in Redis (set expiry e.g., 10 minutes)
    await redisClient.setEx(
      `signup:${phone}`,
      600, // TTL in seconds
      JSON.stringify({
        name,
        email,
        phone,
        role,
        password: hashedPassword,
      })
    );

    // Send OTP
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });

    return res.json({
      message: "OTP sent successfully",
      status: verification.status,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
});

// =======================
// VERIFY OTP & CREATE USER
// =======================
router.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone number and OTP are required" });
  }

  try {
    // Verify OTP
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code: otp });

    if (verificationCheck.status !== "approved") {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Retrieve signup data from Redis
    const signupDataStr = await redisClient.get(`signup:${phone}`);
    if (!signupDataStr) {
      return res.status(400).json({ error: "No pending signup data found" });
    }

    const signupData = JSON.parse(signupDataStr);

    // Create user
    const newUser = new User({
      name: signupData.name,
      email: signupData.email,
      phone: signupData.phone,
      role: signupData.role,
      password: signupData.password,
    });

    await newUser.save();

    // Delete data from Redis
    await redisClient.del(`signup:${phone}`);

    return res.json({ message: "Signup successful", user: newUser });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "OTP verification or user creation failed" });
  }
});

// =======================
// LOGIN
// =======================
router.post("/login", async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: "Phone and password are required" });
  }

  try {
    // Find user by phone
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ error: "Invalid phone or password" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid phone or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // optional: set token expiry
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // set true in prod
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(200).json({ message: "Login successful" , token});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Login failed" });
  }
});

// router.get("/profile", authMiddleware, async (req, res) => {
//   // req.user is available from decoded token
//   try {
//     const user = await User.findById(req.user.id).select("-password");
//     res.json({ user });
//   } catch (err) {
//     res.status(500).json({ error: "Failed to fetch user profile" });
//   }
// });

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return res.status(200).json({ message: 'Logout successful' });
});

module.exports = router;
