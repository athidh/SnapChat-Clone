import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList, Modal, Alert, ActivityIndicator, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { sendSnap, getFriendsData } from '../services/api';

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);
    const [photo, setPhoto] = useState(null);
    
    // UI State
    const [showSendModal, setShowSendModal] = useState(false);
    const [sending, setSending] = useState(false);
    const [friends, setFriends] = useState([]);
    const [filteredFriends, setFilteredFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Snap Options
    const [selectedTimer, setSelectedTimer] = useState(10); // Default 10s

    useEffect(() => {
        if (showSendModal) {
            loadFriends();
        }
    }, [showSendModal]);

    const loadFriends = async () => {
        try {
            const res = await getFriendsData();
            const friendsList = res.data.data.friends || [];
            setFriends(friendsList);
            setFilteredFriends(friendsList);
        } catch (e) {
            console.log("Error loading friends in camera", e);
        }
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setFilteredFriends(friends);
        } else {
            const filtered = friends.filter(friend => 
                friend.username.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredFriends(filtered);
        }
    };

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text style={{color:'white'}}>Camera access needed</Text>
                <TouchableOpacity onPress={requestPermission}><Text style={styles.link}>Grant</Text></TouchableOpacity>
            </View>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                // --- THE MAGIC FIX ---
                // Changed quality from 1.0 to 0.4
                // skipProcessing: true speeds up the capture significantly
                const data = await cameraRef.current.takePictureAsync({ 
                    quality: 0.4, 
                    skipProcessing: true 
                });
                setPhoto(data.uri);
                setShowSendModal(true);
            } catch (error) {
                Alert.alert("Camera Error", error.message);
            }
        }
    };

    const handleSend = async (recipientId) => {
        setSending(true);
        try {
            // Pass the selected timer
            await sendSnap(photo, recipientId, selectedTimer);
            Alert.alert("Sent!", "Your snap has been delivered.");
            setPhoto(null);
            setShowSendModal(false);
        } catch (error) {
            Alert.alert("Error", "Could not send snap.");
        } finally {
            setSending(false);
        }
    };

    const closePreview = () => {
        setPhoto(null);
        setShowSendModal(false);
    };

    // Timer Option Component
    const TimerOption = ({ value, label }) => (
        <TouchableOpacity 
            style={[styles.timerBtn, selectedTimer === value && styles.timerBtnActive]} 
            onPress={() => setSelectedTimer(value)}
        >
            <Text style={[styles.timerText, selectedTimer === value && styles.timerTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    // 1. Preview Mode
    if (photo) {
        return (
            <View style={styles.container}>
                <Image source={{ uri: photo }} style={styles.preview} />
                
                <View style={styles.controls}>
                    <TouchableOpacity onPress={closePreview} style={styles.circleBtn}>
                        <Text style={styles.btnText}>X</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowSendModal(true)} style={[styles.circleBtn, { backgroundColor: '#00bfff' }]}>
                        <Text style={styles.btnText}>{'>'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Send Modal */}
                <Modal visible={showSendModal} transparent animationType="slide" onRequestClose={() => setShowSendModal(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Send To...</Text>
                            
                            {/* Timer Options Row */}
                            <View style={styles.timerRow}>
                                <Text style={{marginRight: 10, fontWeight:'bold'}}>Time:</Text>
                                <TimerOption value={3} label="3s" />
                                <TimerOption value={10} label="10s" />
                                <TimerOption value={999} label="∞" />
                            </View>

                            <TextInput 
                                style={styles.searchInput}
                                placeholder="Search friends..."
                                value={searchQuery}
                                onChangeText={handleSearch}
                            />

                            <FlatList 
                                data={filteredFriends}
                                keyExtractor={item => item._id}
                                style={{maxHeight: 300}}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.friendRow} onPress={() => handleSend(item._id)}>
                                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                            <View style={styles.avatar} />
                                            <Text style={styles.friendName}>{item.username}</Text>
                                        </View>
                                        {sending ? <ActivityIndicator size="small" color="black"/> : <Text style={styles.sendIcon}>➤</Text>}
                                    </TouchableOpacity>
                                )}
                            />

                            <TouchableOpacity onPress={() => setShowSendModal(false)} style={{marginTop: 15}}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef}>
                <View style={styles.cameraFooter}>
                    <TouchableOpacity onPress={takePicture} style={styles.captureBtn} />
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor:'black' },
    preview: { flex: 1, borderRadius: 20 },
    cameraFooter: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
    captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: 'white' },
    controls: { position: 'absolute', bottom: 30, flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 30 },
    circleBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
    btnText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    link: { color: 'blue', marginTop: 10 },
    
    modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 20 },
    modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 20, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    searchInput: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 10, marginBottom: 15, fontSize: 16 },
    cancelText: { textAlign: 'center', color: 'red', fontSize: 16, fontWeight: '500' },
    friendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFC00', marginRight: 12 },
    friendName: { fontSize: 18, fontWeight: '500' },
    sendIcon: { fontSize: 20, color: '#00bfff' },

    // Timer Styles
    timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    timerBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: '#ddd', marginHorizontal: 5 },
    timerBtnActive: { backgroundColor: 'black', borderColor: 'black' },
    timerText: { color: '#666', fontWeight: 'bold' },
    timerTextActive: { color: 'white' }
});