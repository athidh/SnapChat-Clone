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

exports.sendSnap = async (req, res) => {
    console.log("------------------------------------------------");
    console.log("📸 HIT: sendSnap Controller");

    // 1. Validation
    if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
    }

    const { recipientId, timer } = req.body;
    const senderId = req.user.id;
    const absolutePath = path.resolve(req.file.path);

    console.log("✅ Local File Saved at:", absolutePath);

    // 2. IMMEDIATE RESPONSE (The "Magic" Fix)
    // We tell the phone "Success" right now, so it doesn't time out waiting.
    res.status(201).json({
        status: 'success',
        message: 'Snap received and processing in background'
    });

    // 3. BACKGROUND WORK (The Server keeps working after sending response)
    // We don't await this, so it runs in the background
    processSnapInBackground(absolutePath, recipientId, senderId, timer);
};

// This function runs completely independently of the user's phone connection
const processSnapInBackground = async (filePath, recipientId, senderId, timer) => {
    console.log("⏳ Background Upload Starting...");
    
    try {
        // Upload to Cloudinary (Standard upload is fine now because we have infinite time)
        const cloudResult = await cloudinary.uploader.upload(filePath, {
            folder: 'snap_private_clone',
            resource_type: 'image',
            timeout: 600000, // 10 Minutes timeout (plenty of time!)
            quality: "100"   // Force Cloudinary to keep 100% original quality
        });

        console.log("☁️ Cloudinary Success:", cloudResult.secure_url);

        // Save to DB
        await Snap.create({
            sender: senderId,
            recipient: recipientId,
            photoUrl: cloudResult.secure_url, 
            cloudinaryId: cloudResult.public_id,
            timer: timer || 10,
            status: 'delivered'
        });

        console.log("✅ Database Saved (Background Job Complete)");

    } catch (err) {
        console.error("🔥 BACKGROUND JOB FAILED:", err);
    } finally {
        // Always clean up the local file
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log("🧹 Local file deleted.");
            }
        } catch (e) {
            console.log("⚠️ Cleanup Error:", e.message);
        }
    }
};

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
        res.status(500).json({ message: err.message });
    }
};

exports.viewSnap = async (req, res) => {
    try {
        const snapId = req.params.id;
        const snap = await Snap.findById(snapId);

        if (!snap) {
            return res.status(404).json({ message: 'Snap not found or already expired' });
        }

        if (snap.recipient.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

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

        await cloudinary.uploader.destroy(snap.cloudinaryId);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};