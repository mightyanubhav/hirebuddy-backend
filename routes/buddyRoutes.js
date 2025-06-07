// routes/buddyRoutes.js
const express = require("express");
const User = require("../models/user.model");
const authMiddleware = require("../middlewares/auth");
const { buddyOnly } = require('../middlewares/roles')
const router = express.Router();
const Booking = require("../models/booking.model");


// 1. Update Buddy Profile
router.put("/profileEdit", authMiddleware, buddyOnly, async (req, res) => {
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


router.get("/bookings", authMiddleware, buddyOnly, async (req, res) => {
  const { status } = req.query; // Optional query ?status=Pending

  try {
    const filter = { buddy: req.user.id };
    if (status) {
      filter.status = status; // e.g., 'Pending', 'Confirmed', 'Declined'
    }

    const bookings = await Booking.find(filter)
      .populate("customer", "name email phone")
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// 2. Get Buddy Bookings 
router.get("/bookings", authMiddleware, buddyOnly, async (req, res) => {
  try {
    const bookings = await Booking.find({ buddy: req.user.id })
      .populate("customer", "name email phone")
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
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


// Accept or Decline Booking
router.put("/booking/:id/status", authMiddleware, buddyOnly, async (req, res) => {
  const { status } = req.body;
 
  if (!["Confirmed", "Declined"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be 'Confirmed' or 'Declined'." });
  }

  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, buddy: req.user.id }, // Ensure the booking belongs to this buddy
      { status },
      { new: true }
    ).populate("customer", "name email");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found or access denied." });
    }

    res.json({ message: `Booking ${status.toLowerCase()}`, booking });
  } catch (err) {
    console.error("Error updating booking status:", err);
    res.status(500).json({ error: "Could not update booking status" });
  }
});


module.exports = router;
