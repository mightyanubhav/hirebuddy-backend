const { Server } = require("socket.io");

let io;

function setupSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // Allow frontend or test client connections
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 New socket connected: ", socket.id);

    socket.on("joinRoom", (roomId) => {
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
      socket.join(roomId);
    });

    socket.on("chatMessage", (data) => {
      const { roomId, senderId, receiverId, text } = data;
      console.log(`💬 Message from ${senderId} to room ${roomId}: ${text}`);

      io.to(roomId).emit("message", { senderId, text });
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocket };
