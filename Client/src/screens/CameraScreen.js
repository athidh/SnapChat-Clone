import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
// Removed 'expo-image-manipulator' import as we want full quality now
import { sendSnap } from '../services/api';

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);
    const [photo, setPhoto] = useState(null);
    
    // Send Modal State
    const [showSendModal, setShowSendModal] = useState(false);
    const [recipientId, setRecipientId] = useState('');
    const [sending, setSending] = useState(false);

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
                // 1. Take Picture with HIGH Quality (0.0 - 1.0)
                // 0.8 is usually indistinguishable from 1.0 but saves some bandwidth. 
                // Using 1.0 for maximum quality as requested.
                const data = await cameraRef.current.takePictureAsync({ quality: 1.0 });
                
                // 2. No Resizing - Use original URI directly
                setPhoto(data.uri);
            } catch (error) {
                Alert.alert("Camera Error", error.message);
            }
        }
    };

    const handleSend = async () => {
        if (!recipientId) return alert("Enter a User ID");
        setSending(true);
        try {
            console.log("Sending full quality photo:", photo);
            await sendSnap(photo, recipientId);
            Alert.alert("Sent!", "Your snap has been delivered.");
            setPhoto(null);
            setShowSendModal(false);
        } catch (error) {
            Alert.alert("Error", "Could not send snap. Check server logs.");
        } finally {
            setSending(false);
        }
    };

    // 1. Preview Mode
    if (photo) {
        return (
            <View style={styles.container}>
                <Image source={{ uri: photo }} style={styles.preview} />
                
                <View style={styles.controls}>
                    <TouchableOpacity onPress={() => setPhoto(null)} style={styles.circleBtn}>
                        <Text style={styles.btnText}>X</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowSendModal(true)} style={[styles.circleBtn, { backgroundColor: '#00bfff' }]}>
                        <Text style={styles.btnText}>{'>'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Send Modal */}
                <Modal visible={showSendModal} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Send To...</Text>
                            <TextInput 
                                placeholder="Recipient User ID" 
                                style={styles.input} 
                                value={recipientId}
                                onChangeText={setRecipientId}
                            />
                            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                                {sending ? <ActivityIndicator color="#fff"/> : <Text style={styles.sendText}>Send Snap</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowSendModal(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    // 2. Camera Mode
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
    modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 20 },
    modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    input: { borderBottomWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 20, fontSize: 16 },
    sendBtn: { backgroundColor: '#00bfff', padding: 15, borderRadius: 10, alignItems: 'center' },
    sendText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    cancelText: { textAlign: 'center', marginTop: 15, color: 'red' }
});