const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config(); 

// Import Routes
const authRoutes = require('./routes/authRoutes');
const snapRoutes = require('./routes/snapRoutes');

// Import DB Connection
const connectDB = require('./config/db');

// Import Socket Handler
const socketHandler = require('./socket/socketHandler');

// Initialize App & Server
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins (since React Native runs on different IPs)
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

// Health Check
app.get('/', (req, res) => {
    res.send('Snapchat Clone API is Running 👻');
});

// Initialize Real-time Logic
socketHandler(io);

// Start Server
const PORT = process.env.PORT || 3000;

// Test Cloudinary Connection
const cloudinary = require('cloudinary').v2;

// We must explicitly load config here for the test to work
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log("🔍 DEBUG: Config Loaded?");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME); // Should print your cloud name
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "Found (Hidden)" : "MISSING ❌");

cloudinary.api.ping((error, result) => {
    if (error) {
        console.log("☁️ Cloudinary Ping FAILED ❌");
        console.log("ERROR DETAILS:", error.message);
    } else {
        console.log("☁️ Cloudinary Ping SUCCESS ✅");
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;