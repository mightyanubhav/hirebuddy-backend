// routes/buddyRoutes.js
const express = require("express");
const User = require("../models/user.model");
const authMiddleware = require("../middlewares/auth");
const { buddyOnly } = require('../middlewares/roles')
const router = express.Router();
const Booking = require("../models/booking.model");
const Message = require("../models/message.model");



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

// Get Buddy Profile (current logged-in buddy)
router.get("/profile", authMiddleware, buddyOnly, async (req, res) => {
  try {
    const buddy = await User.findById(req.user.id).select("-password");

    if (!buddy) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!buddy.buddyProfile || Object.keys(buddy.buddyProfile).length === 0) {
      return res.status(404).json({ error: "Profile not created yet" });
    }

    // Merge user info + profile
    res.json({
      name: buddy.name, // 👈 add this
      email: buddy.email, // optional
      buddyProfile: buddy.buddyProfile,
    });
  } catch (err) {
    console.error("Fetch profile error:", err);
    res.status(500).json({ error: "Could not fetch profile" });
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

// 4.  GET /messages?bookingId=123
router.get("/messages", authMiddleware, async (req, res) => {
  const { bookingId } = req.query;
  if (!bookingId) return res.status(400).json({ error: "bookingId is required" });

  try {
    const messages = await Message.find({ booking: bookingId })
      .sort({ createdAt: 1 });

    res.json({ messages });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Could not fetch messages" });
  }
});

router.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { bookingId, text } = req.body;
    const senderId = req.user.id;

    // Validate input
    if (!bookingId || !text) {
      return res.status(400).json({ error: 'Booking ID and text are required' });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if the user is part of this booking
    if (booking.customer.toString() !== senderId && booking.buddy.toString() !== senderId) {
      return res.status(403).json({ error: 'You are not part of this booking' });
    }

    // Determine receiver
    const receiverId = booking.customer.toString() === senderId 
      ? booking.buddy 
      : booking.customer;

    // Create and save the message
    const message = new Message({
      booking: bookingId,
      sender: senderId,
      receiver: receiverId,
      text: text
    });

    await message.save();

    // Populate sender and receiver details for the response
    await message.populate('sender', 'name');
    await message.populate('receiver', 'name');
    await message.populate('booking');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
