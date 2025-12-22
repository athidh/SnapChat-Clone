const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Protected Routes
router.get('/search', protect, authController.searchUsers);

// Friend Management
router.post('/request', protect, authController.sendRequest); // Send Request
router.post('/accept', protect, authController.acceptRequest); // Accept Request
router.get('/friends-data', protect, authController.getFriendsData); // Get Lists

module.exports = router;