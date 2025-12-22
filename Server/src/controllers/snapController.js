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
        const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);

        console.log(`✅ File Received: ${mimeType} | Size: ${fileSizeMB}MB | Timer: ${timer}s`);

        const socketIO = req.io; 

        // Instant Response
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

// 2. Background Processor (Fixed for Video)
const processSnapInBackground = async (filePath, recipientId, senderId, timer, io, isVideo) => {
    try {
        console.log(`🚀 Starting Cloudinary Upload [${isVideo ? 'VIDEO' : 'IMAGE'}]...`);
        const startTime = Date.now();

        // --- FIXED UPLOAD SETTINGS ---
        const uploadOptions = {
            folder: 'snap_private_clone',
            timeout: 120000, // 2 minutes timeout is usually enough
            resource_type: isVideo ? "video" : "image", // <--- FORCE "video" TO FIX TIMEOUT
            chunk_size: 6000000, // 6MB chunk size helps stability
        };

        if (!isVideo) {
            // Only apply these optimizations for images
            uploadOptions.quality = "auto:best"; 
            uploadOptions.fetch_format = "auto";
            uploadOptions.width = 1440; 
            uploadOptions.crop = "limit";
        }

        const cloudResult = await cloudinary.uploader.upload(filePath, uploadOptions);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        if (!cloudResult || !cloudResult.secure_url) {
            throw new Error(`Cloudinary returned undefined result.`);
        }

        console.log(`✅ Upload Success! URL: ${cloudResult.secure_url}`);
        console.log(`⏱️ Time: ${duration}s`);

        // Save to DB
        const newSnap = await Snap.create({
            sender: senderId,
            recipient: recipientId,
            photoUrl: cloudResult.secure_url, 
            cloudinaryId: cloudResult.public_id,
            timer: timer || 10,
            status: 'delivered'
        });

        if (io) {
            console.log(`📡 Emitting 'new_snap' to user: ${recipientId}`);
            const populatedSnap = await Snap.findById(newSnap._id)
                .populate('sender', 'username avatar');
            io.to(recipientId).emit('new_snap', populatedSnap);
        }

    } catch (err) {
        console.error("🔥 Background Upload Failed:", JSON.stringify(err, null, 2));
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

        // Determine type for deletion
        const isVideo = snap.photoUrl.match(/\.(mp4|mov|webm)$/i);
        await cloudinary.uploader.destroy(snap.cloudinaryId, { 
            resource_type: isVideo ? 'video' : 'image' 
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};