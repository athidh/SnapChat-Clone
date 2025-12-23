import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, Modal, Alert, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { sendSnap, getFriendsData } from '../services/api';
import CameraControl from '../components/CameraControl';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';
import GlassCard from '../components/GlassCard';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const navigation = useNavigation();
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
  const [disappearingEnabled, setDisappearingEnabled] = useState(true);

  // Animation values
  const captureScale = useSharedValue(1);
  const recordingPulse = useSharedValue(1);
  const controlsOpacity = useSharedValue(1);

  // Define all hooks BEFORE any conditional returns
  const captureButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: captureScale.value }],
    };
  });

  const recordingButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: recordingPulse.value }],
    };
  });

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

  useEffect(() => {
    if (showSendModal) {
      loadFriends();
    }
  }, [showSendModal]);

  useEffect(() => {
    if (isRecording) {
      recordingPulse.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      recordingPulse.value = 1;
    }
  }, [isRecording]);

  useEffect(() => {
    let timeout;
    if (isRecording && cameraMode === 'video' && cameraRef.current) {
      timeout = setTimeout(() => {
        startRecordingInternal();
      }, 500);
    }
    return () => clearTimeout(timeout);
  }, [isRecording, cameraMode]);

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

  const toggleCameraFacing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing(c => (c === 'back' ? 'front' : 'back'));
  };

  const toggleMirror = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMirrorMode(p => !p);
  };

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCameraTimer(p => (p === 0 ? 3 : p === 3 ? 10 : 0));
  };

  const toggleCameraMode = () => {
    if (isRecording) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCameraMode(p => (p === 'picture' ? 'video' : 'picture'));
  };

  const saveMedia = async () => {
    const asset = photo || video;
    if (!asset) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert("Permission needed", "We need storage access to save the mello.");
        return;
      }
      await MediaLibrary.createAssetAsync(asset);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved!", `Mello saved to gallery 📸`);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Could not save mello.");
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      console.log("🛑 Stopping Recording...");
      cameraRef.current.stopRecording();
    }
  };

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
        captureScale.value = withSequence(
          withSpring(0.85, { damping: 10, stiffness: 300 }),
          withSpring(1, { damping: 10, stiffness: 300 })
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

        console.log("📸 Mello:", manipResult.uri);
        setPhoto(manipResult.uri);
        setVideo(null);
        setShowSendModal(true);
      } catch (error) {
        Alert.alert("Camera Error", error.message);
      }
    }
  };

  const handleSend = (recipientId) => {
    const fileUri = video || photo;
    const type = video ? 'video' : 'image';
    const timer = disappearingEnabled ? selectedTimer : 999; // 999 == "∞" / non-disappearing

    setPhoto(null);
    setVideo(null);
    setShowSendModal(false);
    setCameraMode('picture');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    sendSnap(fileUri, recipientId, timer, type)
      .then(() => {
        console.log("✅ Background Upload Success");
      })
      .catch((err) => {
        console.error("❌ Background Upload Failed", err);
        Alert.alert("Upload Failed", "Your last mello could not be sent. Check connection.");
      });
  };

  const closePreview = () => {
    setPhoto(null);
    setVideo(null);
    setShowSendModal(false);
    setCameraMode('picture');
  };

  // Early returns must come AFTER all hooks
  if (!cameraPermission || !micPermission) return <View />;
  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Camera & Mic access needed</Text>
        <AnimatedButton
          onPress={() => { requestCameraPermission(); requestMicPermission(); }}
          style={styles.permissionButton}
        >
          <Text style={styles.permissionButtonText}>Grant Permissions</Text>
        </AnimatedButton>
      </View>
    );
  }

  const TimerOption = ({ value, label }) => (
    <AnimatedButton
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedTimer(value);
      }}
      style={[
        styles.timerBtn,
        selectedTimer === value && styles.timerBtnActive,
      ]}
    >
      <Text style={[
        styles.timerText,
        selectedTimer === value && styles.timerTextActive,
      ]}>
        {label}
      </Text>
    </AnimatedButton>
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

        <SafeAreaView edges={['bottom']} style={styles.previewControls}>
          <View style={styles.previewActions}>
            <AnimatedButton onPress={closePreview} style={styles.previewButton}>
              <Text style={styles.previewButtonText}>✕</Text>
            </AnimatedButton>
            <AnimatedButton onPress={saveMedia} style={styles.previewButton}>
              <Text style={styles.previewButtonText}>⬇</Text>
            </AnimatedButton>
            <AnimatedButton
              onPress={() => setShowSendModal(true)}
              style={[styles.previewButton, styles.sendButton]}
            >
              <Text style={styles.previewButtonText}>→</Text>
            </AnimatedButton>
          </View>
        </SafeAreaView>

        {/* Send Modal */}
        <Modal
          visible={showSendModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSendModal(false)}
        >
          <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
            <GlassCard borderRadius={BORDER_RADIUS.LG} style={styles.modalContent}>
              <FadeInView>
                <Text style={styles.modalTitle}>
                  Send {video ? 'Video' : 'Mello'} To...
                </Text>

                {!video && (
                  <>
                    <View style={styles.disappearRow}>
                      <Text style={styles.disappearLabel}>Disappearing</Text>
                      <AnimatedButton
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDisappearingEnabled(prev => !prev);
                        }}
                        style={[
                          styles.disappearToggle,
                          !disappearingEnabled && styles.disappearToggleOff,
                        ]}
                      >
                        <Text
                          style={[
                            styles.disappearToggleText,
                            !disappearingEnabled && styles.disappearToggleTextOff,
                          ]}
                        >
                          {disappearingEnabled ? 'On' : 'Off'}
                        </Text>
                      </AnimatedButton>
                    </View>

                    {disappearingEnabled && (
                      <View style={styles.timerRow}>
                        <Text style={styles.timerLabel}>Time:</Text>
                        <TimerOption value={3} label="3s" />
                        <TimerOption value={10} label="10s" />
                        <TimerOption value={999} label="∞" />
                      </View>
                    )}
                  </>
                )}
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search friends..."
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
                <FlatList
                  data={filteredFriends}
                  keyExtractor={item => item._id}
                  style={{ maxHeight: 300 }}
                  renderItem={({ item, index }) => (
                    <FadeInView delay={index * 50}>
                      <AnimatedButton
                        onPress={() => handleSend(item._id)}
                        style={styles.friendRow}
                      >
                        <View style={styles.friendInfo}>
                          <View style={styles.avatar} />
                          <Text style={styles.friendName}>{item.username}</Text>
                        </View>
                        <Text style={styles.sendIcon}>➤</Text>
                      </AnimatedButton>
                    </FadeInView>
                  )}
                />
                <AnimatedButton
                  onPress={() => setShowSendModal(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </AnimatedButton>
              </FadeInView>
            </GlassCard>
          </BlurView>
        </Modal>
      </View>
    );
  }

  // MAIN CAMERA RENDER
  const doubleTapToInbox = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate('Inbox');
    });

  return (
    <GestureDetector gesture={doubleTapToInbox}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          ref={cameraRef}
          mode={cameraMode}
        />

        {/* Top Controls - Magical Camera Controls */}
        <SafeAreaView edges={['top']} style={styles.topControls}>
          <FadeInView delay={100}>
            <View style={styles.topControlsRow}>
              <View style={styles.controlGroup}>
                <CameraControl
                  icon="↺"
                  onPress={toggleCameraFacing}
                  isActive={false}
                  size={56}
                />
                <Text style={styles.controlLabel}>Flip</Text>
              </View>
              <View style={styles.controlGroup}>
                <CameraControl
                  icon={cameraTimer > 0 ? `${cameraTimer}s` : '⏲'}
                  onPress={toggleTimer}
                  isActive={cameraTimer > 0}
                  activeColor={COLORS.PRIMARY}
                  size={56}
                />
                <Text style={styles.controlLabel}>Timer</Text>
              </View>
              <View style={styles.controlGroup}>
                <CameraControl
                  icon="◐"
                  onPress={toggleMirror}
                  isActive={mirrorMode}
                  activeColor={COLORS.PRIMARY}
                  size={56}
                />
                <Text style={styles.controlLabel}>Mirror</Text>
              </View>
              <View style={styles.controlGroup}>
                <CameraControl
                  icon="▶︎"
                  onPress={toggleCameraMode}
                  isActive={cameraMode === 'video'}
                  activeColor="#FF3B30"
                  size={56}
                />
                <Text style={styles.controlLabel}>Video</Text>
              </View>
            </View>
          </FadeInView>
        </SafeAreaView>

        {/* Countdown Overlay */}
        {countdown > 0 && (
          <View style={styles.countdownOverlay}>
            <Animated.Text style={styles.countdownText}>{countdown}</Animated.Text>
          </View>
        )}

        {/* Bottom Controls - Capture Button */}
        <SafeAreaView edges={['bottom']} style={styles.cameraFooter}>
          <FadeInView delay={200}>
            <AnimatedButton
              onPress={handlePress}
              onLongPress={handleLongPress}
              onPressOut={handlePressOut}
              delayLongPress={200}
              style={styles.captureButtonContainer}
            >
              <Animated.View
                style={[
                  styles.captureButton,
                  isRecording && styles.captureButtonRecording,
                  cameraMode === 'video' && !isRecording && styles.captureButtonVideoMode,
                  isRecording ? recordingButtonStyle : captureButtonStyle,
                ]}
              >
                {isRecording && <View style={styles.recordingIndicator} />}
              </Animated.View>
            </AnimatedButton>
          </FadeInView>
        </SafeAreaView>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_DARK,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_DARK,
  },
  permissionText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.SIZES.LG,
    marginBottom: SPACING.LG,
  },
  permissionButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
  },
  permissionButtonText: {
    color: COLORS.BLACK,
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
  },
  preview: {
    flex: 1,
  },
  previewControls: {
    position: 'absolute',
    // Lift the preview buttons above the bottom tab bar / navigation
    // so they don't sit underneath it on real devices.
    bottom: SPACING.XXL,
    left: 0,
    right: 0,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.XL,
    paddingBottom: SPACING.LG,
  },
  previewButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.WHITE,
  },
  sendButton: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  previewButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.SIZES.XL,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    paddingRight: SPACING.MD,
    paddingTop: SPACING.MD,
  },
  topControlsRow: {
    flexDirection: 'column',
    gap: SPACING.MD,
    alignItems: 'flex-end',
  },
  controlGroup: {
    alignItems: 'center',
  },
  controlLabel: {
    marginTop: SPACING.XS,
    fontSize: TYPOGRAPHY.SIZES.XS,
    color: COLORS.GRAY_MEDIUM,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  countdownText: {
    fontSize: 150,
    fontWeight: TYPOGRAPHY.WEIGHTS.HEAVY,
    color: COLORS.WHITE,
    textShadowColor: COLORS.BLACK,
    textShadowRadius: 20,
    textShadowOffset: { width: 0, height: 0 },
  },
  cameraFooter: {
    position: 'absolute',
    bottom: SPACING.XXL, // lift above tab bar
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: SPACING.XL,
  },
  captureButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  captureButtonRecording: {
    borderColor: '#FF3B30',
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  captureButtonVideoMode: {
    borderColor: '#FF3B30',
  },
  recordingIndicator: {
    width: 30,
    height: 30,
    backgroundColor: '#FF3B30',
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.LG,
  },
  modalContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: SPACING.XL,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.SIZES.XL,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    color: COLORS.WHITE,
    marginBottom: SPACING.LG,
    textAlign: 'center',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.LG,
    gap: SPACING.SM,
  },
  disappearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  disappearLabel: {
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.SIZES.MD,
  },
  disappearToggle: {
    paddingVertical: SPACING.XS,
    paddingHorizontal: SPACING.LG,
    borderRadius: BORDER_RADIUS.LG,
    backgroundColor: COLORS.ACCENT,
  },
  disappearToggleOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  disappearToggleText: {
    color: COLORS.BLACK,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
  },
  disappearToggleTextOff: {
    color: COLORS.WHITE,
  },
  timerLabel: {
    marginRight: SPACING.SM,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    color: COLORS.WHITE,
  },
  timerBtn: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 2,
    borderColor: COLORS.GRAY_MEDIUM,
    backgroundColor: 'transparent',
  },
  timerBtnActive: {
    backgroundColor: COLORS.ACCENT,
    borderColor: COLORS.ACCENT,
  },
  timerText: {
    color: COLORS.GRAY_MEDIUM,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    fontSize: TYPOGRAPHY.SIZES.SM,
  },
  timerTextActive: {
    color: COLORS.BLACK,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.LG,
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.GLASS_BORDER,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.SM,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.ACCENT,
    marginRight: SPACING.MD,
  },
  friendName: {
    fontSize: TYPOGRAPHY.SIZES.LG,
    fontWeight: TYPOGRAPHY.WEIGHTS.MEDIUM,
    color: COLORS.WHITE,
  },
  sendIcon: {
    fontSize: TYPOGRAPHY.SIZES.LG,
    color: COLORS.PRIMARY,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
  },
  cancelButton: {
    marginTop: SPACING.LG,
    paddingVertical: SPACING.MD,
  },
  cancelText: {
    textAlign: 'center',
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.SIZES.MD,
    fontWeight: TYPOGRAPHY.WEIGHTS.MEDIUM,
  },
});
