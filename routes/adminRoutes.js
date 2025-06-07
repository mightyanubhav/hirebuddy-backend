const express = require("express");
const User = require("../models/user.model");
const Booking = require("../models/booking.model");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

// Only admins can access these routes
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }
  next();
};


// GET /admin/users
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// DELETE /admin/user/:id
router.delete("/user/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User deleted", user });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});


// GET /admin/bookings
router.get("/bookings", authMiddleware, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("customer", "name email")
      .populate("buddy", "name email buddyProfile.location")
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// PUT /admin/booking/:id/status
router.put("/booking/:id/status", authMiddleware, adminOnly, async (req, res) => {
  const { status } = req.body;

  if (!["Pending", "Confirmed", "Declined"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json({ message: "Booking status updated", booking });
  } catch (err) {
    res.status(500).json({ error: "Failed to update booking status" });
  }
});


// GET /admin/stats
router.get("/stats", authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBuddies = await User.countDocuments({ role: "buddy" });
    const totalCustomers = await User.countDocuments({ role: "customer" });
    const totalBookings = await Booking.countDocuments();

    res.json({
      totalUsers,
      totalBuddies,
      totalCustomers,
      totalBookings,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
