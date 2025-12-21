const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '90d' });
};

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: 'Username or Email already taken' });

    const newUser = await User.create({ username, email, password });
    const token = signToken(newUser._id);

    res.status(201).json({ status: 'success', token, data: { user: { id: newUser._id, username: newUser.username, email: newUser.email } } });
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
    res.status(200).json({ status: 'success', token, data: { user: { id: user._id, username: user.username, avatar: user.avatar } } });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// 1. SEARCH USERS (By partial username)
exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(200).json({ data: [] });

        // Find users matching query, EXCLUDING self
        const users = await User.find({ 
            username: { $regex: query, $options: 'i' },
            _id: { $ne: req.user.id } 
        }).select('username avatar _id');

        res.status(200).json({ status: 'success', results: users.length, data: users });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// 2. ADD FRIEND (Mutual)
exports.addFriend = async (req, res) => {
    try {
        const friendId = req.body.friendId;
        const myId = req.user.id;

        if (myId === friendId) return res.status(400).json({ message: "You can't add yourself" });

        // Add to My List
        await User.findByIdAndUpdate(myId, { $addToSet: { friends: friendId } });
        // Add Me to Their List (Mutual)
        await User.findByIdAndUpdate(friendId, { $addToSet: { friends: myId } });

        res.status(200).json({ status: 'success', message: "Friend Added" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// 3. GET MY FRIENDS
exports.getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('friends', 'username avatar email');
        res.status(200).json({ status: 'success', data: user.friends });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};