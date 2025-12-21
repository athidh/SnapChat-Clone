import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Modal, RefreshControl } from 'react-native';
import { getInbox, viewSnap } from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function InboxScreen() {
    const { logout, userInfo } = useContext(AuthContext);
    const [snaps, setSnaps] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    
    // View Snap State
    const [viewingSnap, setViewingSnap] = useState(null); // The URL of image
    const [timeLeft, setTimeLeft] = useState(10);

    const loadSnaps = async () => {
        setRefreshing(true);
        try {
            const res = await getInbox();
            setSnaps(res.data.data.snaps);
        } catch (e) {
            console.log("Error loading inbox");
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadSnaps();
    }, []);

    const openSnap = async (snapId) => {
        try {
            // 1. Fetch the image URL from server (Server deletes it from Redis/Cloud now)
            const res = await viewSnap(snapId);
            const { url, timer } = res.data.data;
            
            // 2. Show Image
            setViewingSnap(url);
            setTimeLeft(timer);

            // 3. Start Countdown
            const interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setViewingSnap(null); // Close modal
                        loadSnaps(); // Refresh inbox (snap is gone)
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

        } catch (e) {
            alert("This snap has expired or was already viewed.");
            loadSnaps();
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
                ListEmptyComponent={<Text style={styles.empty}>No new snaps! Pull to refresh.</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.snapItem} onPress={() => openSnap(item._id)}>
                        <View style={styles.redBox} />
                        <View>
                            <Text style={styles.sender}>{item.sender.username}</Text>
                            <Text style={styles.subtext}>New Snap • {item.timer}s</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />

            {/* FULL SCREEN SNAP VIEWER */}
            <Modal visible={!!viewingSnap} transparent={false} animationType="fade">
                <View style={styles.viewerContainer}>
                    <Image source={{ uri: viewingSnap }} style={styles.fullImage} resizeMode="contain" />
                    <View style={styles.timerBadge}>
                        <Text style={styles.timerText}>{timeLeft}</Text>
                    </View>
                </View>
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
    viewerContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
    fullImage: { width: '100%', height: '100%' },
    timerBadge: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    timerText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});