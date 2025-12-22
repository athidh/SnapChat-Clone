import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ IMPORTANT: Choose ONE of the following BASE_URL options:

// OPTION 1: Local Development (Simulator/Emulator)
 const BASE_URL = 'http://10.228.16.56:3000/api'; 

// OPTION 2: Local Development (Physical Device via Wi-Fi)
// Replace with your computer's local IP address (e.g., from ipconfig/ifconfig)
//const BASE_URL = 'http://192.168.1.5:3000/api'; // <--- UPDATE THIS IP

// OPTION 3: Production (Render/Cloud)
// const BASE_URL = 'https://snap-clone-backend.onrender.com/api'; 

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- AUTH & FRIENDS ---
export const loginUser = (email, password) => api.post('/auth/login', { email, password });
export const signupUser = (username, email, password) => api.post('/auth/signup', { username, email, password });

// Friend Management
// Ensure these routes match your backend authRoutes.js
export const searchUsers = (query) => api.get(`/auth/search?query=${query}`);
export const sendFriendRequest = (friendId) => api.post('/auth/request', { friendId });
export const acceptFriendRequest = (friendId) => api.post('/auth/accept', { friendId });
export const getFriendsData = () => api.get('/auth/friends-data'); // Fetches friends AND requests

// --- CHAT ---
export const sendMessage = (recipientId, text) => api.post('/chat/send', { recipientId, text });
export const getChatHistory = (friendId) => api.get(`/chat/history/${friendId}`);

// --- SNAPS ---
export const getInbox = () => api.get('/snaps/inbox');
export const viewSnap = (id) => api.post(`/snaps/view/${id}`);

export const sendSnap = async (imageUri, recipientId, timer = 10) => {
    const formData = new FormData();
    
    let validUri = imageUri;
    if (!validUri.startsWith('file://')) {
        validUri = 'file://' + validUri;
    }
    const filename = validUri.split('/').pop();

    formData.append('snap', {
        uri: validUri,
        name: filename,
        type: 'image/jpeg',
    });
    formData.append('recipientId', recipientId);
    formData.append('timer', timer.toString());

    return api.post('/snaps/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export default api;