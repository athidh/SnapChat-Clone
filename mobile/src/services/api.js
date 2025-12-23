import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ IMPORTANT: Choose ONE of the following BASE_URL options:

// OPTION 1: Local Development (Simulator/Emulator)
// const BASE_URL = 'http://10.0.2.2:3000/api'; 

// OPTION 2: Local Development (Physical Device via Wi-Fi)
// Replace with your computer's local IP address
// const BASE_URL = 'http://192.168.1.5:3000/api'; 

// OPTION 3: Current Setting (use http:// for local IP addresses)
const BASE_URL = 'https://snapchat-clone-backend.onrender.com/api'; 

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
export const searchUsers = (query) => api.get(`/auth/search?query=${query}`);
export const sendFriendRequest = (friendId) => api.post('/auth/request', { friendId });
export const acceptFriendRequest = (friendId) => api.post('/auth/accept', { friendId });
export const getFriendsData = () => api.get('/auth/friends-data'); 

// --- CHAT ---
export const sendMessage = (recipientId, text) => api.post('/chat/send', { recipientId, text });
export const getChatHistory = (friendId) => api.get(`/chat/history/${friendId}`);

// --- SNAPS ---
export const getInbox = () => api.get('/snaps/inbox');
export const viewSnap = (id) => api.post(`/snaps/view/${id}`);

// UPDATED: Now supports Video
export const sendSnap = async (fileUri, recipientId, timer = 10, type = 'image') => {
    const formData = new FormData();
    
    let validUri = fileUri;
    // React Native often requires 'file://' prefix for local files
    if (!validUri.startsWith('file://')) {
        validUri = 'file://' + validUri;
    }
    
    // Determine file settings based on type
    const isVideo = type === 'video';
    const ext = isVideo ? 'mp4' : 'jpg';
    const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';
    const filename = `snap_${Date.now()}.${ext}`;

    formData.append('snap', {
        uri: validUri,
        name: filename,
        type: mimeType, // Crucial: Backend uses this to know how to handle the file
    });
    formData.append('recipientId', recipientId);
    formData.append('timer', timer.toString());

    return api.post('/snaps/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export default api;