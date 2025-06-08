const io = require("socket.io-client");
const readline = require("readline");
const mongoose = require("mongoose");
require("dotenv").config();

const Booking = require("../models/booking.model");

(async () => {

    await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");
  // Fetch the latest/active booking for the customer
  const bookingId = process.argv[2]; // pass booking ID from CLI
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    console.error("❌ No booking found with the provided ID.");
    process.exit(1);
  }

  // Extract customer, buddy, and room ID (booking ID)
  const customerId = booking.customer.toString();
  const buddyId = booking.buddy.toString();
  const roomId = booking._id.toString();

  console.log(`✅ Booking found:
  - Room ID: ${roomId}
  - Customer ID: ${customerId}
  - Buddy ID: ${buddyId}`);

  // Connect to Socket.io server
  const socket = io(`http://localhost:${process.env.PORT}`);

  socket.on("connect", () => {
    console.log("✅ Customer connected to chat server");
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
      senderId: customerId,
      receiverId: buddyId,
      text: input,
    });
  });
})();



// const  receiverId= "684436b2c02685a174b057f6"; // buddyId
// const senderId  = "68443497f1b7051914a7a801"; // customerId
// const roomId = "684441e38be4fc8c36f5c3d0"; /// booking id
