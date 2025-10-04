const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const redisClient = require("../db/redis");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

require("dotenv").config();

const router = express.Router();

// =======================
// Nodemailer Transporter
// =======================
const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, 
  },
});

// =======================
// SIGNUP: collect data & send OTP via Email
// =======================
router.post("/signup", async (req, res) => {
  const { phone, name, email, password, role } = req.body;

  if (!phone || !name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Check if user already exists (by email or phone)
    const existingUser = await User.findOne({email});
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save signup data temporarily in Redis (expires in 10 min)
    await redisClient.setEx(
      `signup:${phone}`,
      600,
      JSON.stringify({
        name,
        email,
        phone,
        role,
        password: hashedPassword,
        otp,
      })
    );

    // Send OTP via Email
    await transporter.sendMail({
      from: `"HireBuddy Auth" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code - HireBuddy",
      text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
      html: `<p>Your OTP code is <b>${otp}</b>. It will expire in <b>10 minutes</b>.</p>`,
    });

    return res.json({ message: "OTP sent successfully to your email" });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Failed to start signup" });
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
    // Retrieve signup data from Redis
    const signupDataStr = await redisClient.get(`signup:${phone}`);
    if (!signupDataStr) {
      return res.status(400).json({ error: "No pending signup data found" });
    }

    const signupData = JSON.parse(signupDataStr);

    // Check OTP
    if (signupData.otp !== otp) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Create user
    const newUser = new User({
      name: signupData.name,
      email: signupData.email,
      phone: signupData.phone,
      role: signupData.role,
      password: signupData.password,
    });

    await newUser.save();

    // Delete temp signup data
    await redisClient.del(`signup:${phone}`);

    return res.json({ message: "Signup successful", user: newUser });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res
      .status(500)
      .json({ error: "OTP verification or user creation failed" });
  }
});

// =======================
// LOGIN (email OR phone)
// =======================
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body; 
  // identifier can be email OR phone

  if (!identifier || !password) {
    return res
      .status(400)
      .json({ error: "Email/Phone and password are required" });
  }

  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid email/phone or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email/phone or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Send as cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      token,
      role: user.role,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

// =======================
// LOGOUT
// =======================
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return res.status(200).json({ message: "Logout successful" });
});

module.exports = router;

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication
    const token = jwt.sign(
      { id: req.user._id, phone: req.user.phone, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });

    res.redirect("/dashboard");
  }
);

// Facebook OAuth
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication
    const token = jwt.sign(
      { id: req.user._id, phone: req.user.phone, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });

    res.redirect("/dashboard");
  }
);

module.exports = router;
