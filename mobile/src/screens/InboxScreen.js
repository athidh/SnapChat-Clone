import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Modal, RefreshControl, Alert, SafeAreaView } from 'react-native';
import { getInbox, viewSnap } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import io from 'socket.io-client';

// --- CONNECTION SETTINGS FOR EXPO GO ---
// Replace '192.168.1.X' with your computer's actual local IP address.
// Do not use 'localhost' if testing on a physical phone.
const SOCKET_URL = 'http://10.228.16.56:3000'; 

export default function InboxScreen() {
    const { logout, userInfo } = useContext(AuthContext);
    const [snaps, setSnaps] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    
    // Viewer State
    const [viewingSnap, setViewingSnap] = useState(null);
    const [timeLeft, setTimeLeft] = useState(10);
    const [timerInterval, setTimerInterval] = useState(null);

    // Socket Reference
    const [socket, setSocket] = useState(null);

    // --- PHASE 2: PREFETCH ENGINE ---
    // This downloads images silently so they open INSTANTLY
    const prefetchImages = (snapsList) => {
        if (!snapsList) return;
        snapsList.forEach((snap) => {
            if (snap.photoUrl) {
                // Image.prefetch downloads the image to the disk cache
                Image.prefetch(snap.photoUrl).catch(err => console.log("Prefetch failed", err));
            }
        });
    };

    const loadSnaps = async () => {
        setRefreshing(true);
        try {
            const res = await getInbox();
            const newSnaps = res.data.data.snaps;
            setSnaps(newSnaps);
            
            // Trigger background download immediately
            prefetchImages(newSnaps);
        } catch (e) {
            console.log("Error loading inbox", e);
        } finally {
            setRefreshing(false);
        }
    };

    // --- PHASE 2: REAL-TIME CONNECTION ---
    useEffect(() => {
        // 1. Initial Load
        loadSnaps();

        // 2. Initialize Socket
        console.log(`Connecting to socket at: ${SOCKET_URL}`);
        const newSocket = io(SOCKET_URL, {
            transports: ['websocket'], // Force websocket for better React Native performance
        });
        setSocket(newSocket);

        // 3. Join User Room
        newSocket.on('connect', () => {
            console.log('✅ Connected to Socket Server');
            if (userInfo?.id) {
                // UPDATED: Changed from 'join_user_room' to 'join_room' to match your backend
                newSocket.emit('join_room', userInfo.id);
            }
        });

        // 4. Listen for New Snaps (Push Notification)
        newSocket.on('new_snap', (data) => {
            console.log("⚡ Instant Snap Received!");
            // Reload immediately to get populated data (username, etc.)
            loadSnaps(); 
        });

        newSocket.on('connect_error', (err) => {
            console.log('❌ Socket Connection Error:', err.message);
        });

        // Cleanup on unmount
        return () => newSocket.disconnect();
    }, [userInfo]);

    const openSnap = async (snapId) => {
        try {
            const res = await viewSnap(snapId);
            const { url, timer } = res.data.data;
            
            // Image should already be cached by prefetchImages()
            setViewingSnap({ url, id: snapId });
            
            // Timer Logic
            const duration = parseInt(timer);
            if (duration < 100) {
                setTimeLeft(duration);
                const interval = setInterval(() => {
                    setTimeLeft((prev) => {
                        if (prev <= 1) {
                            closeViewer();
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
                setTimerInterval(interval);
            } else {
                setTimeLeft("∞");
            }

        } catch (e) {
            Alert.alert("Error", "Snap expired or failed to load");
            loadSnaps();
        }
    };

    const closeViewer = () => {
        setViewingSnap(null);
        if (timerInterval) clearInterval(timerInterval);
        setTimerInterval(null);
        loadSnaps(); // Refresh list to remove the opened snap
    };

    const saveSnap = async () => {
        if (!viewingSnap) return;
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission needed", "We need storage access to save the snap.");
                return;
            }
            const fileUri = FileSystem.documentDirectory + "saved_snap.jpg";
            await FileSystem.downloadAsync(viewingSnap.url, fileUri);
            await MediaLibrary.createAssetAsync(fileUri);
            Alert.alert("Saved!", "Snap saved to gallery 📸");
        } catch (e) {
            Alert.alert("Error", "Could not save snap.");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Inbox</Text>
                <TouchableOpacity onPress={logout}>
                    <Text style={styles.logout}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.userInfo}>
                <Text style={{color: '#666'}}>Logged in as: {userInfo?.username}</Text>
            </View>

            <FlatList 
                data={snaps}
                keyExtractor={(item) => item._id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSnaps} />}
                ListEmptyComponent={<Text style={styles.empty}>No new snaps!</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.snapItem} onPress={() => openSnap(item._id)}>
                        <View style={styles.redBox} />
                        <View>
                            <Text style={styles.sender}>{item.sender?.username || "Unknown"}</Text>
                            <Text style={styles.subtext}>
                                New Snap • {item.timer > 100 ? "Loop" : item.timer + "s"}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            />

            <Modal visible={!!viewingSnap} transparent={false} animationType="fade" onRequestClose={closeViewer}>
                <SafeAreaView style={styles.viewerContainer}>
                    <TouchableOpacity activeOpacity={1} onPress={closeViewer} style={{flex:1}}>
                        {/* This Image will now load INSTANTLY because 
                           prefetchImages() downloaded it when the list loaded.
                        */}
                        <Image source={{ uri: viewingSnap?.url }} style={styles.fullImage} resizeMode="contain" />
                    </TouchableOpacity>

                    <View style={styles.timerBadge}>
                        <Text style={styles.timerText}>{timeLeft}</Text>
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={saveSnap}>
                        <Text style={styles.saveText}>⬇️ Save</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white', paddingTop: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 30, fontWeight: 'bold', color: '#9d00ff' },
    logout: { color: 'red', fontWeight: 'bold' },
    userInfo: { paddingHorizontal: 20, marginBottom: 10 },
    snapItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
    redBox: { width: 20, height: 20, backgroundColor: '#F23C57', borderRadius: 4, marginRight: 15 },
    sender: { fontWeight: 'bold', fontSize: 18 },
    subtext: { color: '#888' },
    empty: { textAlign: 'center', marginTop: 50, color: '#999' },
    
    // Viewer
    viewerContainer: { flex: 1, backgroundColor: 'black' },
    fullImage: { width: '100%', height: '100%' },
    timerBadge: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    timerText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    saveBtn: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});