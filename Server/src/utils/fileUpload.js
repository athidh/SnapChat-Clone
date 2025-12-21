const multer = require('multer');
const path = require('path');

// STRATEGY: Save to disk first (Fast), then controller handles Cloudinary
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Make sure this folder exists!
    },
    filename: function (req, file, cb) {
        // Create unique filename: snap-123456789.jpg
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'snap-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

module.exports = upload;