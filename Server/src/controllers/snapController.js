const Snap = require('../models/Snap');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 1. Send Snap
exports.sendSnap = async (req, res) => {
    console.log("📸 HIT: sendSnap Controller");

    if (!req.file) return res.status(400).json({ message: 'No image provided' });

    const { recipientId, timer } = req.body;
    const senderId = req.user.id;
    const absolutePath = path.resolve(req.file.path);

    console.log(`✅ File received. Timer: ${timer}s`);

    // Grab the socket instance attached in app.js
    const socketIO = req.io; 

    // Instant Response to Sender (Fire & Forget)
    // The sender gets a "Success" immediately, while the server works in the background.
    res.status(201).json({ status: 'success', message: 'Processing' });

    // Start Background Upload with SocketIO passed along
    processSnapInBackground(absolutePath, recipientId, senderId, timer, socketIO);
};

// 2. Background Processor (HIGH QUALITY MODE)
const processSnapInBackground = async (filePath, recipientId, senderId, timer, io) => {
    try {
        console.log("🚀 Starting Cloudinary Upload (High Quality)...");
        const startTime = Date.now();

        // --- HIGH QUALITY SETTINGS ---
        const cloudResult = await cloudinary.uploader.upload(filePath, {
            folder: 'snap_private_clone',
            resource_type: 'image',
            
            // 1. "auto:best" = Visually lossless. 
            // It compresses the file size significantly but keeps 100% visual clarity.
            quality: "auto:best", 
            
            // 2. Convert to WebP/AVIF automatically (smaller file, same quality)
            fetch_format: "auto",
            
            // 3. Limit width to 1440px (QHD). 
            // This is sharp enough for the largest phone screens (Samsung Ultra/iPhone Pro Max).
            // Raw 4000px images are overkill for phone screens and cause the 1-minute lag.
            width: 1440, 
            crop: "limit",
            
            timeout: 120000 // Increased timeout to 2 mins just in case
        });

        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ Upload Done in ${duration}s. Size: ${(cloudResult.bytes / 1024).toFixed(2)}KB`);

        // Save to DB
        const newSnap = await Snap.create({
            sender: senderId,
            recipient: recipientId,
            photoUrl: cloudResult.secure_url, 
            cloudinaryId: cloudResult.public_id,
            timer: timer || 10,
            status: 'delivered'
        });

        // --- REAL-TIME TRIGGER ---
        // This is what makes the phone beep INSTANTLY after upload finishes
        if (io) {
            console.log(`📡 Emitting 'new_snap' to user: ${recipientId}`);
            
            // Populate sender info so the notification shows "Username sent a snap"
            const populatedSnap = await Snap.findById(newSnap._id)
                .populate('sender', 'username avatar');
                
            io.to(recipientId).emit('new_snap', populatedSnap);
        } else {
            console.warn("⚠️ Socket.io instance not found. Real-time notification skipped.");
        }
        // -------------------------

    } catch (err) {
        console.error("🔥 Upload Failed:", err);
    } finally {
        // Always delete the local temp file to keep the server clean
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
};

// 3. Get Inbox
exports.getInbox = async (req, res) => {
    try {
        const userId = req.user.id;
        const snaps = await Snap.find({ 
            recipient: userId, 
            status: 'delivered' 
        })
        .populate('sender', 'username avatar')
        .sort('-createdAt');

        res.status(200).json({
            status: 'success',
            results: snaps.length,
            data: { snaps }
        });
    } catch (err) {
        console.log("Inbox Error:", err.message);
        res.status(500).json({ message: err.message });
    }
};

// 4. View Snap
exports.viewSnap = async (req, res) => {
    try {
        const snapId = req.params.id;
        const snap = await Snap.findById(snapId);

        if (!snap) return res.status(404).json({ message: 'Snap expired' });
        if (snap.recipient.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

        snap.status = 'viewed';
        snap.viewedAt = Date.now();
        await snap.save();

        res.status(200).json({
            status: 'success',
            data: {
                url: snap.photoUrl,
                timer: snap.timer,
                sender: snap.sender
            }
        });

        // Delete from cloud immediately (Snapchat style security)
        await cloudinary.uploader.destroy(snap.cloudinaryId);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};