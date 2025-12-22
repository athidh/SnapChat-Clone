import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList, Modal, Alert, ActivityIndicator, TextInput } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator'; 
import * as MediaLibrary from 'expo-media-library'; 
import { Video, ResizeMode } from 'expo-av'; 
import { sendSnap, getFriendsData } from '../services/api';

export default function CameraScreen() {
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();

    const cameraRef = useRef(null);
    const [photo, setPhoto] = useState(null);
    const [video, setVideo] = useState(null); 
    const [facing, setFacing] = useState('back'); 
    
    // FEATURES
    const [mirrorMode, setMirrorMode] = useState(false);
    const [cameraTimer, setCameraTimer] = useState(0);
    const [countdown, setCountdown] = useState(0);
    
    // Video Logic
    const [isRecording, setIsRecording] = useState(false);
    const [cameraMode, setCameraMode] = useState('picture'); 

    // UI State
    const [showSendModal, setShowSendModal] = useState(false);
    const [sending, setSending] = useState(false);
    const [friends, setFriends] = useState([]);
    const [filteredFriends, setFilteredFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTimer, setSelectedTimer] = useState(10); 

    useEffect(() => {
        if (showSendModal) {
            loadFriends();
        }
    }, [showSendModal]);

    // Handle "Hold to Record" State Transition
    useEffect(() => {
        let timeout;
        if (isRecording && cameraMode === 'video' && cameraRef.current) {
            timeout = setTimeout(() => {
                startRecordingInternal();
            }, 500);
        }
        return () => clearTimeout(timeout);
    }, [isRecording, cameraMode]);

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

    // --- TOGGLES ---
    const toggleCameraFacing = () => setFacing(c => (c === 'back' ? 'front' : 'back'));
    const toggleMirror = () => setMirrorMode(p => !p);
    const toggleTimer = () => setCameraTimer(p => (p === 0 ? 3 : p === 3 ? 10 : 0));
    
    const toggleCameraMode = () => {
        if (isRecording) return; 
        setCameraMode(p => (p === 'picture' ? 'video' : 'picture'));
    };

    const saveMedia = async () => {
        const asset = photo || video;
        if (!asset) return;
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync(true);
            if (status !== 'granted') {
                Alert.alert("Permission needed", "We need storage access to save the snap.");
                return;
            }
            await MediaLibrary.createAssetAsync(asset);
            Alert.alert("Saved!", `Snap saved to gallery 📸`);
        } catch (e) {
            console.log(e);
            Alert.alert("Error", "Could not save snap.");
        }
    };

    if (!cameraPermission || !micPermission) return <View />;
    if (!cameraPermission.granted || !micPermission.granted) {
        return (
            <View style={styles.center}>
                <Text style={{color:'white'}}>Camera & Mic access needed</Text>
                <TouchableOpacity onPress={() => { requestCameraPermission(); requestMicPermission(); }}>
                    <Text style={styles.link}>Grant Permissions</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // --- RECORDING LOGIC ---
    
    const startRecordingInternal = async () => {
        if (!cameraRef.current) return;
        try {
            console.log("🎥 Starting Recording...");
            const data = await cameraRef.current.recordAsync({
                maxDuration: 60,
                quality: '720p',
                mute: false,
            });
            setIsRecording(false);
            console.log("🎥 Recording Finished", data.uri);
            setVideo(data.uri);
            setPhoto(null);
            setShowSendModal(true);
        } catch (error) {
            console.error("Recording Error:", error);
            setIsRecording(false);
            if (cameraMode === 'video') setCameraMode('picture');
        }
    };

    const stopRecording = () => {
        if (cameraRef.current && isRecording) {
            console.log("🛑 Stopping Recording...");
            cameraRef.current.stopRecording();
        }
    };

    // --- INTERACTION HANDLERS ---

    const handlePress = () => {
        if (cameraMode === 'video') {
            if (isRecording) stopRecording();
            else {
                setIsRecording(true); 
            }
        } else {
            initiateCapture(); 
        }
    };

    const handleLongPress = () => {
        if (cameraMode === 'picture') {
            setCameraMode('video'); 
            setIsRecording(true);   
        }
    };

    const handlePressOut = () => {
        if (isRecording) {
            stopRecording();
             setTimeout(() => setCameraMode('picture'), 1000);
        }
    };

    // --- PHOTO LOGIC ---
    const initiateCapture = () => {
        if (cameraTimer > 0) {
            setCountdown(cameraTimer);
            let counter = cameraTimer;
            const interval = setInterval(() => {
                counter -= 1;
                setCountdown(counter);
                if (counter === 0) {
                    clearInterval(interval);
                    takePicture();
                }
            }, 1000);
        } else {
            takePicture();
        }
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const data = await cameraRef.current.takePictureAsync({ 
                    quality: 0.7, 
                    skipProcessing: true 
                });

                const actions = [{ resize: { width: 1080 } }];
                if (mirrorMode && facing === 'front') {
                    actions.push({ flip: ImageManipulator.FlipType.Horizontal });
                }

                const manipResult = await ImageManipulator.manipulateAsync(
                    data.uri,
                    actions, 
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                console.log("📸 Snap:", manipResult.uri); 
                setPhoto(manipResult.uri);
                setVideo(null);
                setShowSendModal(true);
            } catch (error) {
                Alert.alert("Camera Error", error.message);
            }
        }
    };

    // --- OPTIMISTIC SENDING ---
    const handleSend = (recipientId) => {
        // 1. Capture current file details to pass to async function
        const fileUri = video || photo;
        const type = video ? 'video' : 'image';
        const timer = selectedTimer;

        // 2. CLOSE UI IMMEDIATELY (Instant Feel)
        setPhoto(null);
        setVideo(null);
        setShowSendModal(false);
        setCameraMode('picture');
        
        // 3. Perform Upload in Background
        sendSnap(fileUri, recipientId, timer, type)
            .then(() => {
                console.log("✅ Background Upload Success");
            })
            .catch((err) => {
                console.error("❌ Background Upload Failed", err);
                Alert.alert("Upload Failed", "Your last snap could not be sent. Check connection.");
            });
    };

    const closePreview = () => {
        setPhoto(null);
        setVideo(null);
        setShowSendModal(false);
        setCameraMode('picture');
    };

    const TimerOption = ({ value, label }) => (
        <TouchableOpacity 
            style={[styles.timerBtn, selectedTimer === value && styles.timerBtnActive]} 
            onPress={() => setSelectedTimer(value)}
        >
            <Text style={[styles.timerText, selectedTimer === value && styles.timerTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    // PREVIEW SCREEN
    if (photo || video) {
        return (
            <View style={styles.container}>
                {video ? (
                    <Video
                        source={{ uri: video }}
                        style={styles.preview}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay
                        isLooping
                    />
                ) : (
                    <Image source={{ uri: photo }} style={styles.preview} />
                )}
                
                <View style={styles.controls}>
                    <TouchableOpacity onPress={closePreview} style={styles.circleBtn}>
                        <Text style={styles.btnText}>X</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveMedia} style={styles.circleBtn}>
                        <Text style={styles.btnText}>⬇️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowSendModal(true)} style={[styles.circleBtn, { backgroundColor: '#00bfff' }]}>
                        <Text style={styles.btnText}>{'>'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Send Modal */}
                <Modal visible={showSendModal} transparent animationType="slide" onRequestClose={() => setShowSendModal(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Send {video ? 'Video' : 'Snap'} To...</Text>
                            {!video && (
                                <View style={styles.timerRow}>
                                    <Text style={{marginRight: 10, fontWeight:'bold'}}>Time:</Text>
                                    <TimerOption value={3} label="3s" />
                                    <TimerOption value={10} label="10s" />
                                    <TimerOption value={999} label="∞" />
                                </View>
                            )}
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
                                        <Text style={styles.sendIcon}>➤</Text>
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

    // MAIN CAMERA RENDER
    return (
        <View style={styles.container}>
            <CameraView 
                style={StyleSheet.absoluteFill} 
                facing={facing} 
                ref={cameraRef}
                mode={cameraMode}
            />
            
            <View style={styles.topControls}>
                <TouchableOpacity onPress={toggleCameraFacing} style={styles.iconBtn}>
                    <Text style={styles.btnText}>🔄</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleTimer} style={styles.iconBtn}>
                    <Text style={styles.iconText}>{cameraTimer > 0 ? `${cameraTimer}s` : '⏱️'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={toggleMirror} 
                    style={[styles.iconBtn, mirrorMode && { backgroundColor: '#00bfff' }]}
                >
                    <Text style={styles.iconText}>🪞</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={toggleCameraMode} 
                    style={[styles.iconBtn, cameraMode === 'video' && { backgroundColor: '#FF3B30' }]}
                >
                    <Text style={styles.iconText}>📹</Text>
                </TouchableOpacity>
            </View>

            {countdown > 0 && (
                <View style={styles.countdownOverlay}>
                    <Text style={styles.countdownText}>{countdown}</Text>
                </View>
            )}

            <View style={styles.cameraFooter}>
                <TouchableOpacity 
                    onPress={handlePress}
                    onLongPress={handleLongPress}
                    onPressOut={handlePressOut}
                    delayLongPress={200}
                    style={[
                        styles.captureBtn, 
                        isRecording && styles.captureBtnRecording,
                        cameraMode === 'video' && !isRecording && styles.captureBtnVideoMode
                    ]} 
                >
                    {isRecording && <View style={styles.recordingIndicator} />}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor:'black' },
    preview: { flex: 1, borderRadius: 20 },
    cameraFooter: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
    captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: 'white', justifyContent:'center', alignItems:'center' },
    captureBtnRecording: { borderColor: '#FF3B30', width: 90, height: 90 },
    captureBtnVideoMode: { borderColor: '#FF3B30' },
    recordingIndicator: { width: 30, height: 30, backgroundColor: '#FF3B30', borderRadius: 4 },
    topControls: { position: 'absolute', top: 50, right: 20, alignItems: 'center', flexDirection: 'column' },
    iconBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    btnText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    iconText: { fontSize: 20 },
    countdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    countdownText: { fontSize: 150, fontWeight: 'bold', color: 'white', textShadowColor: 'black', textShadowRadius: 10 },
    controls: { position: 'absolute', bottom: 30, flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 30 },
    circleBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
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
    timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    timerBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: '#ddd', marginHorizontal: 5 },
    timerBtnActive: { backgroundColor: 'black', borderColor: 'black' },
    timerText: { color: '#666', fontWeight: 'bold' },
    timerTextActive: { color: 'white' }
});