const express = require('express');
const router = express.Router();
const snapController = require('../controllers/snapController');
const upload = require('../utils/fileUpload');
const { protect } = require('../middleware/authMiddleware'); // Security

// DEBUG ROUTE for Sending Snaps
router.post('/send', 
    (req, res, next) => {
        console.log("📍 DEBUG: Request reached /api/snaps/send");
        next();
    },
    protect,
    (req, res, next) => {
        console.log("🔐 DEBUG: Auth Passed. Starting File Upload...");
        next();
    },
    // WRAP MULTER IN A FUNCTION TO CATCH ERRORS
    (req, res, next) => {
        upload.single('snap')(req, res, (err) => {
            if (err) {
                console.log("❌ MULTER ERROR:", err); // Print the real error!
                return res.status(500).json({ message: "File Upload Failed", error: err.message });
            }
            console.log("✅ DEBUG: Multer Upload Finished.");
            next();
        });
    },
    snapController.sendSnap
);

// Get my snaps
router.get('/inbox', protect, snapController.getInbox);

// View a specific snap (triggers delete)
router.post('/view/:id', protect, snapController.viewSnap);

module.exports = router;