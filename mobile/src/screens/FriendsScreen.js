import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { searchUsers, addFriend, getFriends } from '../services/api';

export default function FriendsScreen() {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [myFriends, setMyFriends] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load friends on open
    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            const res = await getFriends();
            setMyFriends(res.data.data);
        } catch (e) {
            console.log("Error loading friends");
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

    const handleAdd = async (id) => {
        setLoading(true);
        try {
            await addFriend(id);
            alert("Friend Added!");
            setQuery('');
            setSearchResults([]);
            loadFriends(); // Refresh list
        } catch (e) {
            alert("Could not add friend");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Find Friends 🔍</Text>
            
            <TextInput 
                style={styles.input} 
                placeholder="Search Username..." 
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
                                <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item._id)}>
                                    <Text style={{color:'white', fontWeight:'bold'}}>ADD</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                </View>
            )}

            {/* MY FRIENDS */}
            <Text style={[styles.sectionTitle, {marginTop: 20}]}>My Friends ({myFriends.length})</Text>
            <FlatList 
                data={myFriends}
                keyExtractor={item => item._id}
                ListEmptyComponent={<Text style={{color:'#666', marginTop:10}}>No friends yet. Search above!</Text>}
                renderItem={({ item }) => (
                    <View style={styles.friendRow}>
                        <View style={styles.avatar} />
                        <Text style={styles.friendName}>{item.username}</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white', paddingTop: 50, paddingHorizontal: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
    input: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10, marginBottom: 10, fontSize: 16 },
    resultsBox: { maxHeight: 200, marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#888', marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
    username: { fontSize: 16, fontWeight: '500' },
    addBtn: { backgroundColor: 'black', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    // Friends List
    friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFC00', marginRight: 15 },
    friendName: { fontSize: 18, fontWeight: 'bold' }
});