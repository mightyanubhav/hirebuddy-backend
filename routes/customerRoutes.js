const express = require("express");
const User = require("../models/user.model");
const authMiddleware = require("../middlewares/auth");
const Booking = require("../models/booking.model"); 

const router = express.Router();

const Message = require("../models/message.model");

const {customerOnly } = require('../middlewares/roles');

// 1. View All Buddies (Filtered List)
router.get("/buddies", authMiddleware, customerOnly, async (req, res) => {
  const { location, expertise, date } = req.query;

  try {
    const query = {
      role: "buddy",
      "buddyProfile.location": location ? location : { $exists: true },
      "buddyProfile.expertise": expertise ? { $in: [expertise] } : { $exists: true },
      "buddyProfile.availableDates": date ? { $in: [date] } : { $exists: true },
    };

    const buddies = await User.find(query).select("-password");
    res.json({ buddies });
  } catch (err) {
    console.error("Error fetching buddies:", err);
    res.status(500).json({ error: "Failed to fetch buddies" });
  }
});


// 2. View Specific Buddy Profile by ID
router.get("/buddy/:id", authMiddleware, customerOnly, async (req, res) => {
  try {
    const buddy = await User.findOne({ _id: req.params.id, role: "buddy" }).select("-password");
    if (!buddy) return res.status(404).json({ error: "Buddy not found" });

    res.json({ buddy });
  } catch (err) {
    console.error("Error fetching buddy:", err);
    res.status(500).json({ error: "Failed to fetch buddy profile" });
  }
});

// 3.  Booking Request 
router.post("/book", authMiddleware, customerOnly, async (req, res) => {
  const { buddyId, date, location } = req.body;

  try {
    const buddy = await User.findById(buddyId);
    if (!buddy || buddy.role !== "buddy") {
      return res.status(404).json({ error: "Buddy not found" });
    }

    const newBooking = new Booking({
      customer: req.user.id,
      buddy: buddyId,
      date,
      location,
    });

    await newBooking.save();

    res.status(201).json({ message: "Booking request sent", booking: newBooking });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: "Booking failed" });
  }
});

// 4. Get Customer Bookings 

router.get("/bookings", authMiddleware, customerOnly, async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user.id })
      .populate("buddy", "name email phone buddyProfile.location")
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});


// GET /messages?bookingId=123
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


module.exports = router;
