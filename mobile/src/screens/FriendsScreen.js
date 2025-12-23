import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { searchUsers, sendFriendRequest, acceptFriendRequest, getFriendsData } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FadeInView from '../components/FadeInView';
import GlassCard from '../components/GlassCard';
import AnimatedButton from '../components/AnimatedButton';
import { COLORS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

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
        <SafeAreaView style={styles.container} edges={['top']}>
            <FadeInView>
                <Text style={styles.title}>Friends</Text>
                <Text style={styles.subtitle}>Find, accept, and chat with your mellos</Text>
            </FadeInView>
            
            <FadeInView delay={100}>
                <GlassCard style={styles.card}>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Search username or email..." 
                        placeholderTextColor={COLORS.GRAY_MEDIUM}
                        value={query}
                        onChangeText={handleSearch}
                    />
                </GlassCard>
            </FadeInView>

            {searchResults.length > 0 && (
                <FadeInView delay={150}>
                    <GlassCard style={styles.resultsBox}>
                        <Text style={styles.sectionTitle}>Search Results</Text>
                        <FlatList 
                            data={searchResults}
                            keyExtractor={item => item._id}
                            renderItem={({ item, index }) => (
                                <FadeInView delay={index * 40}>
                                    <View style={styles.row}>
                                        <Text style={styles.username}>{item.username}</Text>
                                        <AnimatedButton style={styles.actionBtn} onPress={() => handleSendRequest(item._id)} magical>
                                            <Text style={styles.btnText}>Request</Text>
                                        </AnimatedButton>
                                    </View>
                                </FadeInView>
                            )}
                        />
                    </GlassCard>
                </FadeInView>
            )}

            {friendRequests.length > 0 && (
                <FadeInView delay={200}>
                    <Text style={[styles.sectionTitle, {color: COLORS.PRIMARY}]}>Pending Requests ({friendRequests.length})</Text>
                    <GlassCard style={styles.resultsBox}>
                        <FlatList 
                            data={friendRequests}
                            keyExtractor={item => item._id}
                            renderItem={({ item, index }) => (
                                <FadeInView delay={index * 40}>
                                    <View style={styles.friendRow}>
                                        <View style={styles.avatar} />
                                        <Text style={styles.friendName}>{item.username}</Text>
                                        <AnimatedButton style={[styles.actionBtn, {backgroundColor: COLORS.PRIMARY}]} onPress={() => handleAccept(item._id)} magical>
                                            <Text style={styles.btnText}>Accept</Text>
                                        </AnimatedButton>
                                    </View>
                                </FadeInView>
                            )}
                        />
                    </GlassCard>
                </FadeInView>
            )}

            <FadeInView delay={250}>
                <Text style={styles.sectionTitle}>My Friends</Text>
            </FadeInView>
            <FadeInView delay={300} style={{flex:1}}>
                <FlatList 
                    data={myFriends}
                    keyExtractor={item => item._id}
                    refreshing={loading}
                    onRefresh={loadData}
                    ListEmptyComponent={<Text style={styles.empty}>No friends yet.</Text>}
                    renderItem={({ item, index }) => (
                        <FadeInView delay={index * 50}>
                            <AnimatedButton style={styles.friendRow} onPress={() => openChat(item)} magical>
                                <View style={{flexDirection:'row', alignItems:'center'}}>
                                    <View style={styles.avatar} />
                                    <Text style={styles.friendName}>{item.username}</Text>
                                </View>
                                <Text style={styles.chatText}>Chat 💬</Text>
                            </AnimatedButton>
                        </FadeInView>
                    )}
                    contentContainerStyle={{paddingBottom: SPACING.XXL}}
                />
            </FadeInView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND_DARK, paddingHorizontal: SPACING.LG },
    title: { fontSize: TYPOGRAPHY.SIZES.XXL, fontWeight: TYPOGRAPHY.WEIGHTS.HEAVY, color: COLORS.WHITE, marginBottom: SPACING.XS, letterSpacing: 1 },
    subtitle: { fontSize: TYPOGRAPHY.SIZES.MD, color: COLORS.GRAY_MEDIUM, marginBottom: SPACING.LG },
    card: { padding: SPACING.MD, marginBottom: SPACING.MD, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BORDER_RADIUS.LG },
    input: { backgroundColor: 'rgba(0,0,0,0.4)', padding: SPACING.MD, borderRadius: BORDER_RADIUS.MD, fontSize: TYPOGRAPHY.SIZES.MD, borderWidth: 1, borderColor: COLORS.GLASS_BORDER, color: COLORS.WHITE },
    resultsBox: { marginBottom: SPACING.LG, backgroundColor:'rgba(0,0,0,0.4)', padding:SPACING.MD, borderRadius:BORDER_RADIUS.MD },
    sectionTitle: { fontSize: TYPOGRAPHY.SIZES.LG, fontWeight: TYPOGRAPHY.WEIGHTS.BOLD, color: COLORS.WHITE, marginBottom: SPACING.SM, marginTop: SPACING.SM },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.SM, borderBottomWidth: 1, borderColor: COLORS.GLASS_BORDER },
    username: { fontSize: TYPOGRAPHY.SIZES.MD, fontWeight: TYPOGRAPHY.WEIGHTS.MEDIUM, color: COLORS.WHITE },
    actionBtn: { backgroundColor: COLORS.PRIMARY_DARK, paddingHorizontal: SPACING.MD, paddingVertical: SPACING.SM, borderRadius: BORDER_RADIUS.LG },
    btnText: { color: COLORS.WHITE, fontWeight: TYPOGRAPHY.WEIGHTS.BOLD, fontSize: TYPOGRAPHY.SIZES.SM },
    friendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.MD, borderBottomWidth: 1, borderColor: COLORS.GLASS_BORDER, paddingHorizontal: SPACING.XS },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.PRIMARY, marginRight: SPACING.MD },
    friendName: { fontSize: TYPOGRAPHY.SIZES.LG, fontWeight: TYPOGRAPHY.WEIGHTS.BOLD, color: COLORS.WHITE },
    chatText: { color: COLORS.PRIMARY, fontWeight: TYPOGRAPHY.WEIGHTS.BOLD, fontSize: TYPOGRAPHY.SIZES.MD },
    empty: { color: COLORS.GRAY_MEDIUM, marginTop: SPACING.SM },
});