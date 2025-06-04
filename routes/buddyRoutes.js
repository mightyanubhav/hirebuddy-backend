// routes/buddyRoutes.js
const express = require("express");
const User = require("../models/user.model");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

// Only buddies can access these routes
const buddyOnly = (req, res, next) => {
  if (req.user.role !== "buddy") {
    return res.status(403).json({ error: "Access denied. Buddy only." });
  }
  next();
};

// 1. Update Buddy Profile
router.put("/profile", authMiddleware, buddyOnly, async (req, res) => {
  const { baseRate, expertise, location, languages, bio, availableDates } = req.body;

  try {
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      {
        buddyProfile: {
          baseRate,
          expertise,
          location,
          languages,
          bio,
          availableDates,
        },
      },
      { new: true }
    ).select("-password");


    res.json({ message: "Buddy profile updated", buddy: updated });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Could not update profile" });
  }
});


// 2. Get Buddy Bookings (Dummy Data for Now)
router.get("/bookings", authMiddleware, buddyOnly, async (req, res) => {
  // TODO: Replace with real booking model later
  res.json({
    bookings: [
      {
        customerName: "John Doe",
        date: "2025-06-10",
        location: "Delhi",
        status: "Confirmed"
      }
    ]
  });
});

// 3. Get Buddy Earnings (Dummy)
router.get("/earnings", authMiddleware, buddyOnly, async (req, res) => {
  // TODO: Replace with actual payment integration later
  res.json({
    totalEarnings: 8000,
    lastPaymentDate: "2025-05-30",
    transactions: [
      { amount: 2000, date: "2025-05-20" },
      { amount: 3000, date: "2025-05-25" },
      { amount: 3000, date: "2025-05-30" }
    ]
  });
});

// 4. Get Messages (Dummy)
router.get("/messages", authMiddleware, buddyOnly, async (req, res) => {
  // TODO: Connect with message/chat system later
  res.json({
    messages: [
      { from: "Customer A", text: "Are you available on June 15?", date: "2025-06-01" },
      { from: "Customer B", text: "Can you guide me in Jaipur?", date: "2025-06-02" }
    ]
  });
});

// 5. Update Availability
router.put("/availability", authMiddleware, buddyOnly, async (req, res) => {
  const { availableDates } = req.body;
  try {
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { "buddyProfile.availableDates": availableDates },
      { new: true }
    ).select("-password");

    res.json({ message: "Availability updated", buddy: updated });
  } catch (err) {
    res.status(500).json({ error: "Could not update availability" });
  }
});

module.exports = router;
