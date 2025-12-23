import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, Modal, RefreshControl, Alert, Dimensions, Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { getInbox, viewSnap } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import io from 'socket.io-client';
import { Video, ResizeMode } from 'expo-av';
import * as Haptics from 'expo-haptics';
import FadeInView from '../components/FadeInView';
import GlassCard from '../components/GlassCard';
import AnimatedButton from '../components/AnimatedButton';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING } from '../constants/theme';

const { width } = Dimensions.get('window');

// --- CONFIGURATION ---
// 🏠 LOCAL DEVELOPMENT
const SOCKET_URL = 'http://192.168.20.2:3000'; 

// 🚀 DEPLOYMENT
//const SOCKET_URL = 'https://snapchat-clone-backend.onrender.com';

// --- SUB-COMPONENT: Preserves exact UI but fixes Hook Error ---
const SnapItem = ({ item, index, onOpen }) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationX > 0) {
        translateX.value = e.translationX;
        opacity.value = 1 - Math.abs(e.translationX) / width;
      }
    })
    .onEnd((e) => {
      if (e.translationX > width * 0.3) {
        translateX.value = withSpring(width, { damping: 20, stiffness: 300 }, () => {
          runOnJS(onOpen)(item._id);
        });
        opacity.value = withTiming(0);
      } else {
        translateX.value = withSpring(0);
        opacity.value = withTiming(1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <FadeInView delay={index * 50}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <GlassCard borderRadius={BORDER_RADIUS.MD} style={styles.snapCard}>
            <AnimatedButton
              onPress={() => onOpen(item._id)}
              style={styles.snapCardContent}
            >
              <View style={styles.snapIndicator} />
              <View style={styles.snapInfo}>
                <Text style={styles.sender}>{item.sender?.username || "Unknown"}</Text>
                <Text style={styles.subtext}>
                  New Mello • {item.timer > 100 ? "Loop" : item.timer + "s"}
                </Text>
              </View>
              <Text style={styles.arrowIcon}>→</Text>
            </AnimatedButton>
          </GlassCard>
        </Animated.View>
      </GestureDetector>
    </FadeInView>
  );
};

export default function InboxScreen() {
  const { logout, userInfo } = useContext(AuthContext);
  const [snaps, setSnaps] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewingSnap, setViewingSnap] = useState(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerInterval, setTimerInterval] = useState(null);

  useEffect(() => {
    loadSnaps();
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    
    socket.on('connect', () => {
      if (userInfo?.id) socket.emit('join_room', userInfo.id);
    });

    socket.on('new_snap', () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadSnaps();
    });

    return () => socket.disconnect();
  }, [userInfo]);

  const loadSnaps = async () => {
    setRefreshing(true);
    try {
      const res = await getInbox();
      // Be defensive about backend response shape (local vs Render)
      const newSnaps =
        Array.isArray(res?.data?.data?.snaps)
          ? res.data.data.snaps
          : Array.isArray(res?.data?.snaps)
          ? res.data.snaps
          : [];

      setSnaps(newSnaps);

      if (Array.isArray(newSnaps)) {
        newSnaps.forEach((snap) => {
          if (snap?.photoUrl && !snap.photoUrl.endsWith('.mp4')) {
            RNImage.prefetch(snap.photoUrl).catch(() => {});
          }
        });
      }
    } catch (e) {
      console.log("Error loading inbox", e?.response?.data || e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const openSnap = async (snapId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await viewSnap(snapId);
      const snapData = res?.data?.data || res?.data || {};
      const { url, timer } = snapData;

      if (!url) {
        Alert.alert("Error", "Could not open this mello. Please try again.");
        return;
      }

      setViewingSnap({ url, id: snapId });

      const duration = parseInt(timer, 10);
      if (Number.isFinite(duration) && duration < 100) {
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
      Alert.alert("Error", "Mello expired");
      loadSnaps();
    }
  };

  const closeViewer = () => {
    setViewingSnap(null);
    if (timerInterval) clearInterval(timerInterval);
    loadSnaps();
  };

  const saveSnap = async () => {
    if (!viewingSnap) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;
      const isVideo = viewingSnap.url.endsWith('.mp4');
      const fileUri = FileSystem.documentDirectory + `mello_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
      await FileSystem.downloadAsync(viewingSnap.url, fileUri);
      await MediaLibrary.createAssetAsync(fileUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved!", "📸");
    } catch (e) { Alert.alert("Error", "Save failed"); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        <AnimatedButton onPress={logout}>
          <Text style={styles.logout}>Logout</Text>
        </AnimatedButton>
      </View>

      <FlatList
        data={snaps}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSnaps} tintColor={COLORS.PRIMARY} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <SnapItem item={item} index={index} onOpen={openSnap} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No new mellos!</Text>}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={!!viewingSnap} transparent={false} animationType="fade">
        <SafeAreaView style={styles.viewerContainer} edges={['top', 'bottom']}>
          <AnimatedButton activeOpacity={1} onPress={closeViewer} style={{ flex: 1 }}>
            {viewingSnap?.url?.endsWith('.mp4') ? (
              <Video source={{ uri: viewingSnap.url }} style={styles.fullImage} resizeMode={ResizeMode.CONTAIN} shouldPlay isLooping />
            ) : (
              <Image source={{ uri: viewingSnap?.url }} style={styles.fullImage} contentFit="contain" />
            )}
          </AnimatedButton>
          <GlassCard style={styles.timerBadge}>
            <Text style={styles.timerText}>{timeLeft}</Text>
          </GlassCard>
          <AnimatedButton onPress={saveSnap} style={styles.saveBtn}>
            <Text style={styles.saveText}>⬇ Save</Text>
          </AnimatedButton>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND_DARK },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.LG },
  title: { fontSize: TYPOGRAPHY.SIZES.XXL, fontWeight: TYPOGRAPHY.WEIGHTS.HEAVY, color: COLORS.WHITE, letterSpacing: 2 },
  logout: { color: COLORS.PRIMARY, fontWeight: TYPOGRAPHY.WEIGHTS.BOLD },
  listContent: { paddingHorizontal: SPACING.LG, paddingBottom: 100 },
  snapCard: { marginBottom: SPACING.MD, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: COLORS.GLASS_BORDER },
  snapCardContent: { flexDirection: 'row', alignItems: 'center', padding: SPACING.MD },
  snapIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.ACCENT, marginRight: SPACING.MD },
  snapInfo: { flex: 1 },
  sender: { fontWeight: TYPOGRAPHY.WEIGHTS.BOLD, fontSize: TYPOGRAPHY.SIZES.LG, color: COLORS.WHITE },
  subtext: { color: COLORS.GRAY_MEDIUM, fontSize: TYPOGRAPHY.SIZES.SM },
  arrowIcon: { fontSize: TYPOGRAPHY.SIZES.XL, color: COLORS.PRIMARY },
  empty: { textAlign: 'center', color: COLORS.GRAY_MEDIUM, marginTop: 50 },
  viewerContainer: { flex: 1, backgroundColor: 'black' },
  fullImage: { width: '100%', height: '100%' },
  timerBadge: { position: 'absolute', top: 60, right: 20, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  timerText: { color: COLORS.WHITE, fontWeight: 'bold', fontSize: 20 },
  saveBtn: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.2)', padding: 15, borderRadius: 20 },
  saveText: { color: COLORS.WHITE, fontWeight: 'bold' }
});