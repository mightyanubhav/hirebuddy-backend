const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const authMiddleware = require("../middlewares/auth");
const User = require("../models/user.model");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order
router.post("/create-order", authMiddleware, async (req, res) => {
  const { amount } = req.body;

  try {
    const options = {
      amount: amount * 100, // amount in paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id, amount: order.amount });
  } catch (err) {
    console.error("Error creating Razorpay order:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Verify payment
router.post("/verify", authMiddleware, async (req, res) => {
  const { orderId, paymentId, signature } = req.body;

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + "|" + paymentId)
    .digest("hex");

  if (generatedSignature !== signature) {
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  // Payment is valid -> add credits
  await User.findByIdAndUpdate(req.user.id, {
    $inc: { credits: 10 }, // add 10 credits
  });

  res.json({ success: true, message: "Payment verified, credits added" });
});

// Get credits
router.get("/credits", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select("credits");
  res.json({ credits: user.credits || 3 }); // give 3 free trials if no credits
});

module.exports = router;
