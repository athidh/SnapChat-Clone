const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);

// New Routes (Protected)
router.get('/search', protect, authController.searchUsers);
router.post('/add-friend', protect, authController.addFriend);
router.get('/friends', protect, authController.getFriends);

module.exports = router;