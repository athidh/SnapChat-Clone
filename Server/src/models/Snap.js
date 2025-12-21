const mongoose = require('mongoose');

const snapSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Snap must have a sender']
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Snap must have a recipient']
    },
    photoUrl: {
        type: String,
        required: [true, 'Snap must have an image URL']
    },
    cloudinaryId: {
        type: String,
        required: true
    },
    timer: {
        type: Number,
        default: 10 // Seconds the snap is viewable
    },
    status: {
        type: String,
        enum: ['delivered', 'viewed', 'screenshot'],
        default: 'delivered'
    },
    viewedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // TTL Index: MongoDB will auto-delete this doc 24 hours after creation
    }
});

// Index for faster queries when fetching inbox
snapSchema.index({ recipient: 1, status: 1 });

module.exports = mongoose.model('Snap', snapSchema);