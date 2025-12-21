import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ KEEP YOUR IP ADDRESS HERE
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

// Auth & Friends
export const loginUser = (email, password) => api.post('/auth/login', { email, password });
export const signupUser = (username, email, password) => api.post('/auth/signup', { username, email, password });
export const searchUsers = (query) => api.get(`/auth/search?query=${query}`);
export const addFriend = (friendId) => api.post('/auth/add-friend', { friendId });
export const getFriends = () => api.get('/auth/friends');

// Snaps
export const getInbox = () => api.get('/snaps/inbox');
export const viewSnap = (id) => api.post(`/snaps/view/${id}`);

export const sendSnap = async (imageUri, recipientId) => {
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
    formData.append('timer', '10');

    return api.post('/snaps/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export default api;