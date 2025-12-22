import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { getChatHistory, sendMessage } from '../services/api';

export default function ChatScreen({ route, navigation }) {
    const { friendId, friendName } = route.params; 
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef();
    
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const interval = setInterval(loadMessages, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadMessages();
        });
        return unsubscribe;
    }, [navigation]);

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
        setInputText(''); 

        try {
            await sendMessage(friendId, tempText);
            loadMessages(); 
        } catch (e) {
            alert("Failed to send");
            setInputText(tempText); 
        }
    };

    const renderItem = ({ item }) => {
        const isMe = item.sender !== friendId; 
        return (
            <View style={[styles.bubble, isMe ? styles.myBubble : styles.friendBubble]}>
                <Text style={[styles.text, isMe ? styles.myText : styles.friendText]}>
                    {item.text}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>{'< Back'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{friendName}</Text>
            </View>

            {/* FIX: Wrap EVERYTHING (List + Input) in KeyboardAvoidingView */}
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} 
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 15 }}
                    // Auto-scroll to bottom when keyboard opens or messages arrive
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                <View style={[
                    styles.inputContainer, 
                    { paddingBottom: Math.max(insets.bottom, 10) } 
                ]}>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
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
    inputContainer: { 
        flexDirection: 'row', 
        paddingHorizontal: 10, 
        paddingTop: 10, 
        borderTopWidth: 1, 
        borderColor: '#eee', 
        alignItems: 'center',
        backgroundColor: 'white' 
    },
    input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
    sendBtn: { padding: 10 },
    sendText: { color: '#00bfff', fontWeight: 'bold', fontSize: 16 }
});