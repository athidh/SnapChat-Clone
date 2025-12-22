import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Modal, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getInbox, viewSnap } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import io from 'socket.io-client';
// FIX: Import Video to play video snaps
import { Video, ResizeMode } from 'expo-av'; 

// Use the Render URL since your socket connected successfully there
const SOCKET_URL = 'https://snapchat-clone-backend.onrender.com'; 

export default function InboxScreen() {
    const { logout, userInfo } = useContext(AuthContext);
    const [snaps, setSnaps] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    
    // Viewer State
    const [viewingSnap, setViewingSnap] = useState(null);
    const [timeLeft, setTimeLeft] = useState(10);
    const [timerInterval, setTimerInterval] = useState(null);

    const [socket, setSocket] = useState(null);

    // --- PHASE 2: PREFETCH ENGINE ---
    const prefetchImages = (snapsList) => {
        if (!snapsList) return;
        snapsList.forEach((snap) => {
            // Only prefetch images, skip videos (videos stream)
            if (snap.photoUrl && !snap.photoUrl.endsWith('.mp4')) {
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
            prefetchImages(newSnaps);
        } catch (e) {
            console.log("Error loading inbox", e.message);
        } finally {
            setRefreshing(false);
        }
    };

    // --- PHASE 2: REAL-TIME CONNECTION ---
    useEffect(() => {
        loadSnaps();

        console.log(`Connecting to socket at: ${SOCKET_URL}`);
        
        const newSocket = io(SOCKET_URL, {
            transports: ['websocket'], 
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('✅ Connected to Socket Server');
            if (userInfo?.id) {
                newSocket.emit('join_room', userInfo.id);
            }
        });

        newSocket.on('new_snap', (data) => {
            console.log("⚡ Instant Snap Received!");
            loadSnaps(); 
        });

        newSocket.on('connect_error', (err) => {
            console.log('❌ Socket Connection Error:', err.message);
        });

        return () => newSocket.disconnect();
    }, [userInfo]);

    const openSnap = async (snapId) => {
        try {
            const res = await viewSnap(snapId);
            const { url, timer } = res.data.data;
            
            setViewingSnap({ url, id: snapId });
            
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
        loadSnaps(); 
    };

    const saveSnap = async () => {
        if (!viewingSnap) return;
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission needed", "We need storage access to save the snap.");
                return;
            }
            
            const isVideo = viewingSnap.url.endsWith('.mp4');
            const fileName = `snap_saved.${isVideo ? 'mp4' : 'jpg'}`;
            const fileUri = FileSystem.documentDirectory + fileName;
            
            await FileSystem.downloadAsync(viewingSnap.url, fileUri);
            await MediaLibrary.createAssetAsync(fileUri);
            Alert.alert("Saved!", "Snap saved to gallery 📸");
        } catch (e) {
            Alert.alert("Error", "Could not save snap.");
        }
    };

    // Helper to check media type
    const isVideoSnap = viewingSnap?.url?.endsWith('.mp4');

    return (
        <SafeAreaView style={styles.container}>
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
                        {/* FIX: RENDER VIDEO OR IMAGE BASED ON URL */}
                        {isVideoSnap ? (
                            <Video
                                source={{ uri: viewingSnap.url }}
                                style={styles.fullImage}
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay
                                isLooping
                                useNativeControls={false} // Hide controls for Snapchat feel
                            />
                        ) : (
                            <Image 
                                source={{ uri: viewingSnap?.url }} 
                                style={styles.fullImage} 
                                resizeMode="contain" 
                            />
                        )}
                    </TouchableOpacity>

                    <View style={styles.timerBadge}>
                        <Text style={styles.timerText}>{timeLeft}</Text>
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={saveSnap}>
                        <Text style={styles.saveText}>⬇️ Save</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center', marginBottom: 20, marginTop: 10 },
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