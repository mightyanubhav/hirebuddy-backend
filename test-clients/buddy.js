const io = require("socket.io-client");
const readline = require("readline");
const mongoose = require("mongoose");
require("dotenv").config();

const Booking = require("../models/booking.model");

(async () => {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");

  // Fetch the booking info by booking ID
  const bookingId = process.argv[2]; // pass booking ID from CLI
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    console.error("❌ No booking found with the provided ID.");
    process.exit(1);
  }

  // Extract buddy, customer, and room ID (booking ID)
  const buddyId = booking.buddy.toString();
  const customerId = booking.customer.toString();
  const roomId = booking._id.toString();

  console.log(`✅ Booking found:
  - Room ID: ${roomId}
  - Buddy ID: ${buddyId}
  - Customer ID: ${customerId}`);

  // Connect to Socket.io server
  const socket = io(`http://localhost:${process.env.PORT}`);

  socket.on("connect", () => {
    console.log("✅ Buddy connected to chat server");
    socket.emit("joinRoom", roomId);
  });

  socket.on("message", (data) => {
    console.log(`💬 Message from ${data.senderId}: ${data.text}`);
  });

  // CLI input to send messages
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("line", (input) => {
    socket.emit("chatMessage", {
      roomId,
      senderId: buddyId,
      receiverId: customerId,
      text: input,
    });
  });
})();
