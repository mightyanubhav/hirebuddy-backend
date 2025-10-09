require('dotenv').config();

const http = require("http");
const express = require("express");
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");

const chatbotRoute = require("./routes/chatbotRoute");


const connectDB = require('./db/db');
const userRoutes = require('./routes/userRoutes'); 
const buddyRoutes = require('./routes/buddyRoutes');
const customerRoutes = require('./routes/customerRoutes');
const paymentRoutes = require('./routes/payment')
// const adminRoutes = require('./routes/adminRoutes');
const cors = require("cors");

const app = express();
const server = http.createServer(app);


app.use(cors({
  origin: process.env.FRONTEND_URL, 
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Authorization'], 
  credentials: true 
}));



// Middleware
app.use(bodyParser.json());
app.use(cookieParser());



// Routes
app.get("/wakeup", (req, res) => {
  res.status(200).json({ message: "Server is awake 🚀" });
});

app.use("/chatbot", chatbotRoute);





app.use('/user', userRoutes);
app.use('/buddy', buddyRoutes);
app.use('/customer', customerRoutes);
app.use('/payment', paymentRoutes)
// app.use('/admin', adminRoutes);

// Setup socket server
const { setupSocket } = require("./services/socket");
setupSocket(server); // <-- pass the HTTP server


// Connect DB and run server
const PORT = process.env.PORT || 3000;

async function main() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main();

