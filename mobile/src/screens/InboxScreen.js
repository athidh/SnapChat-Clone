import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, Modal, RefreshControl, Alert, Dimensions, Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
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
const SOCKET_URL = 'https://snapchat-clone-backend.onrender.com';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function InboxScreen() {
  const { logout, userInfo } = useContext(AuthContext);
  const [snaps, setSnaps] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Viewer State
  const [viewingSnap, setViewingSnap] = useState(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerInterval, setTimerInterval] = useState(null);

  const [socket, setSocket] = useState(null);

  const prefetchImages = (snapsList) => {
    if (!snapsList) return;
    snapsList.forEach((snap) => {
      if (snap.photoUrl && !snap.photoUrl.endsWith('.mp4')) {
        RNImage.prefetch(snap.photoUrl).catch(err => console.log("Prefetch failed", err));
      }
    });
  };

  const loadSnaps = async () => {
    setRefreshing(true);
    try {
      const res = await getInbox();
      const newSnaps = res.data.data.snaps;
      setSnaps(newSnaps);
      prefetchImages(newSnaps);
    } catch (e) {
      console.log("Error loading inbox", e.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSnaps();

    console.log(`Connecting to socket at: ${SOCKET_URL}`);

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket Server');
      if (userInfo?.id) {
        newSocket.emit('join_room', userInfo.id);
      }
    });

    newSocket.on('new_snap', (data) => {
      console.log("⚡ Instant Mello Received!");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadSnaps();
    });

    newSocket.on('connect_error', (err) => {
      console.log('❌ Socket Connection Error:', err.message);
    });

    return () => newSocket.disconnect();
  }, [userInfo]);

  const openSnap = async (snapId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await viewSnap(snapId);
      const { url, timer } = res.data.data;

      setViewingSnap({ url, id: snapId });

      const duration = parseInt(timer);
      if (duration < 100) {
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
      Alert.alert("Error", "Mello expired or failed to load");
      loadSnaps();
    }
  };

  const closeViewer = () => {
    setViewingSnap(null);
    if (timerInterval) clearInterval(timerInterval);
    setTimerInterval(null);
    loadSnaps();
  };

  const saveSnap = async () => {
    if (!viewingSnap) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission needed", "We need storage access to save the mello.");
        return;
      }

      const isVideo = viewingSnap.url.endsWith('.mp4');
      const fileName = `mello_saved.${isVideo ? 'mp4' : 'jpg'}`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.downloadAsync(viewingSnap.url, fileUri);
      await MediaLibrary.createAssetAsync(fileUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved!", "Mello saved to gallery 📸");
    } catch (e) {
      Alert.alert("Error", "Could not save mello.");
    }
  };

  const isVideoSnap = viewingSnap?.url?.endsWith('.mp4');

  const renderSnapItem = ({ item, index }) => {
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(1);

    const panGesture = Gesture.Pan()
      .onUpdate((e) => {
        translateX.value = e.translationX;
        opacity.value = 1 - Math.abs(e.translationX) / width;
      })
      .onEnd((e) => {
        if (Math.abs(e.translationX) > width * 0.3) {
          translateX.value = withSpring(width * Math.sign(e.translationX), {
            damping: 20,
            stiffness: 300,
          }, () => {
            runOnJS(openSnap)(item._id);
          });
          opacity.value = withTiming(0);
        } else {
          translateX.value = withSpring(0);
          opacity.value = withTiming(1);
        }
      });

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: translateX.value }],
        opacity: opacity.value,
      };
    });

    return (
      <FadeInView delay={index * 50}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={animatedStyle}>
            <GlassCard borderRadius={BORDER_RADIUS.MD} style={styles.snapCard}>
              <AnimatedButton
                onPress={() => openSnap(item._id)}
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FadeInView>
        <View style={styles.header}>
          <Text style={styles.title}>Inbox</Text>
          <AnimatedButton onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logout}>Logout</Text>
          </AnimatedButton>
        </View>
      </FadeInView>

      <FadeInView delay={100}>
        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>Logged in as: {userInfo?.username}</Text>
        </View>
      </FadeInView>

      <AnimatedFlatList
        data={snaps}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadSnaps}
            tintColor={COLORS.ACCENT}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>No new mellos!</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        renderItem={renderSnapItem}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={!!viewingSnap}
        transparent={false}
        animationType="fade"
        onRequestClose={closeViewer}
      >
        <SafeAreaView style={styles.viewerContainer} edges={['top', 'bottom']}>
          <AnimatedButton
            activeOpacity={1}
            onPress={closeViewer}
            style={styles.viewerContent}
          >
            {isVideoSnap ? (
              <Video
                source={{ uri: viewingSnap.url }}
                style={styles.fullImage}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isLooping
                useNativeControls={false}
              />
            ) : (
              <Image
                source={{ uri: viewingSnap?.url }}
                style={styles.fullImage}
                contentFit="contain"
              />
            )}
          </AnimatedButton>

          <GlassCard borderRadius={BORDER_RADIUS.MD} style={styles.timerBadge}>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_DARK,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  title: {
    fontSize: TYPOGRAPHY.SIZES.XXL,
    fontWeight: TYPOGRAPHY.WEIGHTS.HEAVY,
    color: COLORS.WHITE,
    letterSpacing: 2,
  },
  logoutButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  logout: {
    color: COLORS.PRIMARY,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    fontSize: TYPOGRAPHY.SIZES.MD,
  },
  userInfo: {
    paddingHorizontal: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  userInfoText: {
    color: COLORS.GRAY_MEDIUM,
    fontSize: TYPOGRAPHY.SIZES.SM,
  },
  listContent: {
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.XL,
  },
  snapCard: {
    marginBottom: SPACING.MD,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: COLORS.GLASS_BORDER,
  },
  snapCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  snapIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: SPACING.MD,
  },
  snapInfo: {
    flex: 1,
  },
  sender: {
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    fontSize: TYPOGRAPHY.SIZES.LG,
    color: COLORS.WHITE,
    marginBottom: SPACING.XS,
  },
  subtext: {
    color: COLORS.GRAY_MEDIUM,
    fontSize: TYPOGRAPHY.SIZES.SM,
  },
  arrowIcon: {
    fontSize: TYPOGRAPHY.SIZES.XL,
    color: COLORS.PRIMARY,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.XXL * 2,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.GRAY_MEDIUM,
    fontSize: TYPOGRAPHY.SIZES.LG,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_DARK,
  },
  viewerContent: {
    flex: 1,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  timerBadge: {
    position: 'absolute',
    top: SPACING.XL + 20,
    right: SPACING.LG,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    color: COLORS.WHITE,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    fontSize: TYPOGRAPHY.SIZES.LG,
  },
  saveBtn: {
    position: 'absolute',
    bottom: SPACING.XL + 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    borderWidth: 1,
    borderColor: COLORS.GLASS_BORDER,
  },
  saveText: {
    color: COLORS.WHITE,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    fontSize: TYPOGRAPHY.SIZES.MD,
  },
});
