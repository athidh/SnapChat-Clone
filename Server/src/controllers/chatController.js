const Message = require('../models/Message');

// Send Message
exports.sendMessage = async (req, res) => {
    try {
        const { recipientId, text } = req.body;
        const senderId = req.user.id;

        const newMessage = await Message.create({
            sender: senderId,
            recipient: recipientId,
            text
        });

        res.status(201).json({ status: 'success', data: newMessage });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get Chat History with a specific friend
exports.getChatHistory = async (req, res) => {
    try {
        const { friendId } = req.params;
        const myId = req.user.id;

        // Find messages where (Sender=Me & Recipient=Friend) OR (Sender=Friend & Recipient=Me)
        const messages = await Message.find({
            $or: [
                { sender: myId, recipient: friendId },
                { sender: friendId, recipient: myId }
            ]
        }).sort('createdAt'); // Oldest first

        res.status(200).json({ status: 'success', results: messages.length, data: messages });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};