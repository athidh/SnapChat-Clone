import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { searchUsers, sendFriendRequest, acceptFriendRequest, getFriendsData } from '../services/api';
import { useNavigation } from '@react-navigation/native';

export default function FriendsScreen() {
    const navigation = useNavigation();
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    
    const [myFriends, setMyFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getFriendsData();
            setMyFriends(res.data.data.friends);
            setFriendRequests(res.data.data.requests);
        } catch (e) {
            console.log("Error loading friends data");
        }
    };

    const handleSearch = async (text) => {
        setQuery(text);
        if (text.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await searchUsers(text);
            setSearchResults(res.data.data);
        } catch (e) {
            console.log("Search error");
        }
    };

    const handleSendRequest = async (id) => {
        setLoading(true);
        try {
            await sendFriendRequest(id);
            Alert.alert("Success", "Friend Request Sent!");
            setQuery('');
            setSearchResults([]);
        } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Could not send request");
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (id) => {
        try {
            await acceptFriendRequest(id);
            Alert.alert("Success", "You are now friends!");
            loadData(); // Refresh lists
        } catch (e) {
            Alert.alert("Error", "Could not accept request");
        }
    };

    const openChat = (friend) => {
        navigation.navigate('Chat', { 
            friendId: friend._id, 
            friendName: friend.username 
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Social 👥</Text>
            
            {/* SEARCH BAR */}
            <TextInput 
                style={styles.input} 
                placeholder="Search Username or Email..." 
                value={query}
                onChangeText={handleSearch}
            />

            {/* SEARCH RESULTS */}
            {searchResults.length > 0 && (
                <View style={styles.resultsBox}>
                    <Text style={styles.sectionTitle}>Search Results</Text>
                    <FlatList 
                        data={searchResults}
                        keyExtractor={item => item._id}
                        renderItem={({ item }) => (
                            <View style={styles.row}>
                                <Text style={styles.username}>{item.username}</Text>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleSendRequest(item._id)}>
                                    <Text style={styles.btnText}>Request</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                </View>
            )}

            {/* FRIEND REQUESTS */}
            {friendRequests.length > 0 && (
                <View style={{marginBottom: 20}}>
                    <Text style={[styles.sectionTitle, {color: '#F23C57'}]}>Pending Requests ({friendRequests.length})</Text>
                    <FlatList 
                        data={friendRequests}
                        keyExtractor={item => item._id}
                        renderItem={({ item }) => (
                            <View style={styles.friendRow}>
                                <View style={styles.avatar} />
                                <Text style={styles.friendName}>{item.username}</Text>
                                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#00bfff'}]} onPress={() => handleAccept(item._id)}>
                                    <Text style={styles.btnText}>Accept</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                </View>
            )}

            {/* MY FRIENDS */}
            <Text style={styles.sectionTitle}>My Friends</Text>
            <FlatList 
                data={myFriends}
                keyExtractor={item => item._id}
                refreshing={loading}
                onRefresh={loadData}
                ListEmptyComponent={<Text style={{color:'#666', marginTop:10}}>No friends yet.</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.friendRow} onPress={() => openChat(item)}>
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                            <View style={styles.avatar} />
                            <Text style={styles.friendName}>{item.username}</Text>
                        </View>
                        <Text style={{color:'#00bfff', fontWeight:'bold'}}>Chat 💬</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white', paddingTop: 50, paddingHorizontal: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
    input: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10, marginBottom: 10, fontSize: 16 },
    resultsBox: { maxHeight: 150, marginBottom: 20, backgroundColor:'#fafafa', padding:10, borderRadius:10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#888', marginBottom: 10, marginTop: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
    username: { fontSize: 16, fontWeight: '500' },
    actionBtn: { backgroundColor: 'black', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    // Friends List
    friendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFC00', marginRight: 15 },
    friendName: { fontSize: 18, fontWeight: 'bold' }
});