import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { getChatHistory, sendMessage } from '../services/api';

export default function ChatScreen({ route, navigation }) {
    const { friendId, friendName } = route.params; // Passed from FriendsScreen
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef();

    useEffect(() => {
        navigation.setOptions({ title: friendName }); // Set header title
        loadMessages();
        
        // Simple polling for new messages every 3 seconds (Basic Real-time)
        // In Phase 3, we can replace this with Socket.io
        const interval = setInterval(loadMessages, 3000);
        return () => clearInterval(interval);
    }, []);

    const loadMessages = async () => {
        try {
            const res = await getChatHistory(friendId);
            setMessages(res.data.data);
        } catch (e) {
            console.log("Error loading chat");
        }
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        
        const tempText = inputText;
        setInputText(''); // Clear immediately

        try {
            await sendMessage(friendId, tempText);
            loadMessages(); // Refresh immediately
        } catch (e) {
            alert("Failed to send");
            setInputText(tempText); // Restore if failed
        }
    };

    const renderItem = ({ item }) => {
        const isMe = item.sender !== friendId; // If sender is NOT friend, it's me
        return (
            <View style={[styles.bubble, isMe ? styles.myBubble : styles.friendBubble]}>
                <Text style={[styles.text, isMe ? styles.myText : styles.friendText]}>
                    {item.text}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
            keyboardVerticalOffset={90}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>{'< Back'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{friendName}</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 15 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()} // Auto scroll to bottom
            />

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Send a chat..."
                />
                <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
                    <Text style={styles.sendText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white', paddingTop: 40 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
    backBtn: { marginRight: 15 },
    backText: { color: '#00bfff', fontSize: 16, fontWeight: 'bold' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    
    // Chat Bubbles
    bubble: { padding: 12, borderRadius: 20, marginBottom: 8, maxWidth: '80%' },
    myBubble: { backgroundColor: '#00bfff', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
    friendBubble: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
    text: { fontSize: 16 },
    myText: { color: 'white' },
    friendText: { color: 'black' },

    // Input
    inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
    sendBtn: { padding: 10 },
    sendText: { color: '#00bfff', fontWeight: 'bold', fontSize: 16 }
});