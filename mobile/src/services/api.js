import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ FIXED: Pointing to your Render Backend
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

    // IMPORTANT: 'snap' must match the name in your backend routes (upload.single('snap'))
    formData.append('snap', {
        uri: validUri,
        name: filename,
        type: mimeType, 
    });
    formData.append('recipientId', recipientId);
    formData.append('timer', timer.toString());

    // FIX: Add transformRequest to ensure FormData is sent correctly on React Native
    return api.post('/snaps/send', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data, headers) => {
            return formData; // Return the raw FormData, don't let Axios stringify it
        },
    });
};

export default api;