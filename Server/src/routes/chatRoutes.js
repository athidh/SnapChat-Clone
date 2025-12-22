const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/send', chatController.sendMessage);
router.get('/history/:friendId', chatController.getChatHistory);

module.exports = router;