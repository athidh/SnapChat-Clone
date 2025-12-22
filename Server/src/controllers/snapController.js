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
    try {
        console.log("📸 HIT: sendSnap Controller");

        if (!req.file) {
            console.error("❌ sendSnap: No file received.");
            return res.status(400).json({ message: 'No file provided' });
        }

        const { recipientId, timer } = req.body;
        const senderId = req.user.id;
        const absolutePath = path.resolve(req.file.path);
        
        // Detect File Type
        const mimeType = req.file.mimetype;
        const isVideo = mimeType.startsWith('video');

        console.log(`✅ File received (${mimeType}). Timer: ${timer}s`);

        // Grab the socket instance
        const socketIO = req.io; 

        // Instant Response to Sender (Fire & Forget)
        res.status(201).json({ status: 'success', message: 'Processing' });

        // Start Background Upload
        setImmediate(() => {
            processSnapInBackground(absolutePath, recipientId, senderId, timer, socketIO, isVideo);
        });

    } catch (err) {
        console.error("🔥 Error in sendSnap:", err);
        if (!res.headersSent) res.status(500).json({ message: 'Server Error' });
    }
};

// 2. Background Processor (Updated for Video)
const processSnapInBackground = async (filePath, recipientId, senderId, timer, io, isVideo) => {
    try {
        console.log(`🚀 Starting Cloudinary Upload (${isVideo ? 'VIDEO' : 'IMAGE'})...`);
        const startTime = Date.now();

        // --- DYNAMIC UPLOAD SETTINGS ---
        const uploadOptions = {
            folder: 'snap_private_clone',
            resource_type: "auto", // Allows both Image and Video
            timeout: 600000 // 10 min timeout for slow networks
        };

        if (isVideo) {
            // VIDEO SETTINGS
            uploadOptions.quality = "auto"; // Optimized for streaming
            // We generally don't resize videos here to avoid long processing times on free tier
        } else {
            // IMAGE SETTINGS (Your High Quality Config)
            uploadOptions.quality = "auto:best"; // Visually lossless
            uploadOptions.fetch_format = "auto";
            uploadOptions.width = 1440; // High Res
            uploadOptions.crop = "limit";
        }

        const cloudResult = await cloudinary.uploader.upload(filePath, uploadOptions);

        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ Upload Done in ${duration}s. Size: ${(cloudResult.bytes / 1024).toFixed(2)}KB`);

        // Save to DB
        // We store the 'resource_type' so the frontend knows whether to render <Image> or <Video>
        // Note: You might need to add 'mediaType' to your Mongoose Schema if you want to be strict,
        // otherwise Mongoose might ignore it. For now, we rely on the extension in photoUrl or a loose schema.
        const newSnap = await Snap.create({
            sender: senderId,
            recipient: recipientId,
            photoUrl: cloudResult.secure_url, 
            cloudinaryId: cloudResult.public_id,
            timer: timer || 10,
            status: 'delivered'
            // mediaType: isVideo ? 'video' : 'image' // Optional: Add to Schema for robust handling
        });

        // --- REAL-TIME TRIGGER ---
        if (io) {
            console.log(`📡 Emitting 'new_snap' to user: ${recipientId}`);
            
            const populatedSnap = await Snap.findById(newSnap._id)
                .populate('sender', 'username avatar');
                
            io.to(recipientId).emit('new_snap', populatedSnap);
        } else {
            console.warn("⚠️ Socket.io instance not found.");
        }
        // -------------------------

    } catch (err) {
        console.error("🔥 Upload Failed:", err);
    } finally {
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

        // Delete from cloud
        await cloudinary.uploader.destroy(snap.cloudinaryId, { 
            resource_type: snap.photoUrl.endsWith('.mp4') ? 'video' : 'image' 
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};