const { io } = require("socket.io-client");
const readline = require('readline');

const socket = io("http://localhost:7777");

const senderId = "684436b2c02685a174b057f6"; // buddyId
const receiverId = "68443497f1b7051914a7a801"; // customerId
const roomId = "684441e38be4fc8c36f5c3d0"; /// booking id

socket.on("connect", () => {
  console.log("✅ Buddy connected");
  socket.emit("joinRoom", roomId);
});

socket.on("message", (data) => {
  console.log(`📩 Message from ${data.senderId}: ${data.text}`);
});

// Listen for terminal input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  socket.emit("chatMessage", {
    roomId,
    senderId,
    receiverId,
    text: input
  });
});
