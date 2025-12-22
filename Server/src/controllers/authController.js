const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '90d' });
};

// --- AUTHENTICATION ---

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: 'Username or Email already taken' });

    const newUser = await User.create({ username, email, password });
    const token = signToken(newUser._id);

    res.status(201).json({ 
        status: 'success', 
        token, 
        data: { user: { id: newUser._id, username: newUser.username, email: newUser.email } } 
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Please provide email and password' });

    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    const token = signToken(user._id);
    res.status(200).json({ 
        status: 'success', 
        token, 
        data: { user: { id: user._id, username: user.username, avatar: user.avatar } } 
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// --- FRIEND LOGIC ---

// 1. SEARCH USERS
exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(200).json({ data: [] });

        const users = await User.find({ 
            _id: { $ne: req.user.id },
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).select('username avatar _id');

        res.status(200).json({ status: 'success', results: users.length, data: users });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// 2. SEND FRIEND REQUEST
exports.sendRequest = async (req, res) => {
    try {
        const targetId = req.body.friendId;
        const myId = req.user.id;

        if (myId === targetId) return res.status(400).json({ message: "Can't add yourself" });

        const targetUser = await User.findById(targetId);
        const myUser = await User.findById(myId);

        if (!targetUser) return res.status(404).json({ message: "User not found" });

        // Check if already friends or requested
        if (targetUser.friends.includes(myId)) {
            return res.status(400).json({ message: "Already friends" });
        }
        if (targetUser.friendRequests.includes(myId)) {
            return res.status(400).json({ message: "Request already sent" });
        }

        // Update both sides
        targetUser.friendRequests.push(myId);
        myUser.sentRequests.push(targetId);

        await targetUser.save({ validateBeforeSave: false });
        await myUser.save({ validateBeforeSave: false });

        res.status(200).json({ status: 'success', message: "Request Sent" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// 3. ACCEPT FRIEND REQUEST
exports.acceptRequest = async (req, res) => {
    try {
        const requesterId = req.body.friendId;
        const myId = req.user.id;

        const myUser = await User.findById(myId);
        const requesterUser = await User.findById(requesterId);

        if (!myUser.friendRequests.includes(requesterId)) {
            return res.status(400).json({ message: "No request found from this user" });
        }

        // Add to friends list (Mutual)
        myUser.friends.push(requesterId);
        requesterUser.friends.push(myId);

        // Remove from requests lists
        myUser.friendRequests = myUser.friendRequests.filter(id => id.toString() !== requesterId);
        requesterUser.sentRequests = requesterUser.sentRequests.filter(id => id.toString() !== myId);

        await myUser.save({ validateBeforeSave: false });
        await requesterUser.save({ validateBeforeSave: false });

        res.status(200).json({ status: 'success', message: "Friend Accepted" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// 4. GET FRIENDS & REQUESTS
exports.getFriendsData = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('friends', 'username avatar email')
            .populate('friendRequests', 'username avatar email');
            
        res.status(200).json({ 
            status: 'success', 
            data: {
                friends: user.friends || [],
                requests: user.friendRequests || []
            }
        });
    } catch (err) {
        console.log("Error fetching friends:", err);
        res.status(400).json({ message: err.message });
    }
};