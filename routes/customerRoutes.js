const express = require("express");
const User = require("../models/user.model");
const authMiddleware = require("../middlewares/auth");
const Booking = require("../models/booking.model");

const router = express.Router();

const Message = require("../models/message.model");

const { customerOnly } = require("../middlewares/roles");

// 1. View All Buddies (Filtered List)
router.get("/buddies", authMiddleware, customerOnly, async (req, res) => {
  const { location, expertise, date } = req.query;

  try {
    const query = { role: "buddy" };

    // Location (case-insensitive partial match)
    if (location) {
      query["buddyProfile.location"] = { $regex: location, $options: "i" };
    }

    // Expertise (support multiple comma-separated values)
    if (expertise) {
      const expertiseArray = expertise.split(","); // e.g. "travel,photography"
      query["buddyProfile.expertise"] = { $in: expertiseArray };
    }

    // Date (check if availableDates contains requested date)
    if (date) {
      query["buddyProfile.availableDates"] = { $in: [date] };
    }

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
    const buddy = await User.findOne({
      _id: req.params.id,
      role: "buddy",
    }).select("-password");
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

    res
      .status(201)
      .json({ message: "Booking request sent", booking: newBooking });
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
  if (!bookingId)
    return res.status(400).json({ error: "bookingId is required" });

  try {
    const messages = await Message.find({ booking: bookingId }).sort({
      createdAt: 1,
    });

    res.json({ messages });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Could not fetch messages" });
  }
});


// POST /messages
router.post("/messages", authMiddleware, async (req, res) => {
  const { bookingId, content } = req.body;

  if (!bookingId || !content) {
    return res.status(400).json({ error: "bookingId and content are required" });
  }

  try {
    // booking must exist
    const booking = await Booking.findById(bookingId)
      .populate("customer")
      .populate("buddy");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // determine sender + receiver
    const sender = req.user.id;
    let receiver;

    if (booking.customer._id.toString() === sender) {
      receiver = booking.buddy._id;
    } else if (booking.buddy._id.toString() === sender) {
      receiver = booking.customer._id;
    } else {
      return res.status(403).json({ error: "You are not part of this booking" });
    }

    // create message
    const message = new Message({
      booking: bookingId,
      sender,
      receiver,
      text: content,
    });

    await message.save();

    res.status(201).json({ message });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Could not send message" });
  }
});


module.exports = router;
