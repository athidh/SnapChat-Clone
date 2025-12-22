const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. Define the upload directory
// Resolve to absolute path: server/uploads
const uploadDir = path.join(__dirname, '../../uploads');

console.log(`📂 Uploader Config: Target directory is ${uploadDir}`);

// 2. Auto-Create the folder if it doesn't exist (Fixes Render/Git issue)
try {
    if (!fs.existsSync(uploadDir)) {
        console.log(`⚠️ Directory missing. Creating: ${uploadDir}`);
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`✅ Created missing directory successfully.`);
    } else {
        console.log(`✅ Directory already exists.`);
    }
} catch (err) {
    console.error(`❌ CRITICAL ERROR: Could not create upload directory:`, err);
}

// STRATEGY: Save to disk first (Fast), then controller handles Cloudinary
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Pass the absolute path we ensured exists above
        cb(null, uploadDir);
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