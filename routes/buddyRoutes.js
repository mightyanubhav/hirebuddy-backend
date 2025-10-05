// routes/buddyRoutes.js
const express = require("express");
const User = require("../models/user.model");
const authMiddleware = require("../middlewares/auth");
const { buddyOnly } = require("../middlewares/roles");
const router = express.Router();
const Booking = require("../models/booking.model");
const Message = require("../models/message.model");
const multer = require("multer");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 700 * 1024 }, // 700KB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"));
  },
});

// helper to stream buffer to cloudinary
const streamUpload = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(buffer);
  });
// helper to parse incoming fields (strings or arrays)
const parseToArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v) => v.trim());
  if (typeof val === "string") {
    // if it was sent as multiple form fields with same name, multer may present it as string or array;
    // try splitting by comma if comma present, otherwise return single item array
    return val.includes(",")
      ? val.split(",").map((s) => s.trim())
      : [val.trim()];
  }
  return [];
};
// Route
router.put(
  "/profileEdit",
  authMiddleware,
  buddyOnly,
  upload.single("profileImage"), // name used in FormData
  async (req, res) => {
    try {
      // fields from req.body (all are strings if sent via FormData)
      const {
        baseRate,
        expertise,
        location,
        languages,
        bio,
        availableDates, // may be string or array
      } = req.body;

      const updateFields = {
        buddyProfile: {
          baseRate:
            baseRate !== undefined && baseRate !== ""
              ? Number(baseRate)
              : undefined,
          expertise: parseToArray(expertise),
          location,
          languages: parseToArray(languages),
          bio,
          availableDates: parseToArray(availableDates),
        },
      };

      // find user to get old public_id if present
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // If file uploaded, upload it to Cloudinary
      if (req.file) {
        // set folder and transformation as desired
        const result = await streamUpload(req.file.buffer, {
          folder: "hirebuddy_profiles",
          resource_type: "image",
          transformation: [{ width: 800, height: 800, crop: "limit" }],
        });

        // remove old image from cloud (if exists)
        if (user.profileImage && user.profileImage.public_id) {
          try {
            await cloudinary.uploader.destroy(user.profileImage.public_id, {
              resource_type: "image",
            });
          } catch (err) {
            console.warn("Could not delete old image:", err.message || err);
          }
        }

        // set profileImage object to save in DB
        updateFields.profileImage = {
          url: result.secure_url,
          public_id: result.public_id,
        };
      }

      // Update DB (use $set to avoid overwriting fields that are undefined)
      const updated = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true }
      ).select("-password");

      return res.json({ message: "Buddy profile updated", buddy: updated });
    } catch (err) {
      console.error("Update error:", err);
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Could not update profile" });
    }
  }
);
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

    // ✅ Include profile image (if stored)
    res.json({
      name: buddy.name,
      email: buddy.email,
      profileImage: buddy.profileImage || null, 
      buddyProfile: buddy.buddyProfile,
      createdAt: buddy.createdAt,
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
      { amount: 3000, date: "2025-05-30" },
    ],
  });
});

// 4.  GET /messages?bookingId=123
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

router.post("/messages", authMiddleware, async (req, res) => {
  try {
    const { bookingId, text } = req.body;
    const senderId = req.user.id;

    // Validate input
    if (!bookingId || !text) {
      return res
        .status(400)
        .json({ error: "Booking ID and text are required" });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if the user is part of this booking
    if (
      booking.customer.toString() !== senderId &&
      booking.buddy.toString() !== senderId
    ) {
      return res
        .status(403)
        .json({ error: "You are not part of this booking" });
    }

    // Determine receiver
    const receiverId =
      booking.customer.toString() === senderId
        ? booking.buddy
        : booking.customer;

    // Create and save the message
    const message = new Message({
      booking: bookingId,
      sender: senderId,
      receiver: receiverId,
      text: text,
    });

    await message.save();

    // Populate sender and receiver details for the response
    await message.populate("sender", "name");
    await message.populate("receiver", "name");
    await message.populate("booking");

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal server error" });
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
router.put(
  "/booking/:id/status",
  authMiddleware,
  buddyOnly,
  async (req, res) => {
    const { status } = req.body;

    if (!["Confirmed", "Declined"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status. Must be 'Confirmed' or 'Declined'." });
    }

    try {
      const booking = await Booking.findOneAndUpdate(
        { _id: req.params.id, buddy: req.user.id }, // Ensure the booking belongs to this buddy
        { status },
        { new: true }
      ).populate("customer", "name email");

      if (!booking) {
        return res
          .status(404)
          .json({ error: "Booking not found or access denied." });
      }

      res.json({ message: `Booking ${status.toLowerCase()}`, booking });
    } catch (err) {
      console.error("Error updating booking status:", err);
      res.status(500).json({ error: "Could not update booking status" });
    }
  }
);

module.exports = router;
