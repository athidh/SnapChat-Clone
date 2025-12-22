const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cloudinary = require('cloudinary').v2; // Moved import up

// Load environment variables
dotenv.config(); 

// Import Routes
const authRoutes = require('./routes/authRoutes');
const snapRoutes = require('./routes/snapRoutes');
const chatRoutes = require('./routes/chatRoutes'); // <--- ADDED THIS

// Import DB Connection
const connectDB = require('./config/db');

// Import Socket Handler
// Assuming path is src/socket/socketHandler.js
const socketHandler = require('./socket/socketHandler'); 

// Initialize App & Server
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins (essential for mobile testing)
        methods: ["GET", "POST"]
    }
});

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json()); // Body parser

// Make 'io' accessible in Controllers (req.io)
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/snaps', snapRoutes);
app.use('/api/chat', chatRoutes); // <--- ADDED THIS

// Health Check
app.get('/', (req, res) => {
    res.send('Snapchat Clone API is Running 👻');
});

// Initialize Real-time Logic
socketHandler(io);

// Cloudinary Configuration & Test
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log(`🔍 Cloudinary Config: ${process.env.CLOUDINARY_CLOUD_NAME}`);
cloudinary.api.ping((error, result) => {
    if (error) {
        console.log("☁️ Cloudinary Ping FAILED ❌", error.message);
    } else {
        console.log("☁️ Cloudinary Ping SUCCESS ✅");
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
// Added '0.0.0.0' to ensure it's accessible via LAN IP
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;