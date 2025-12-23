import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, ANIMATION } from '../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CameraControl({
  icon,
  label,
  onPress,
  isActive = false,
  activeColor = COLORS.PRIMARY,
  size = 56,
}) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      glow.value = 0.3;
      pulse.value = 1;
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(glow.value, [0, 1], [0.3, 0.8]);
    return {
      transform: [
        { scale: scale.value * pulse.value },
      ],
      shadowOpacity,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.85, ANIMATION.SPRING);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, ANIMATION.SPRING);
  };

  const handlePress = () => {
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: isActive ? activeColor : COLORS.WHITE,
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: isActive ? 16 : 8,
          elevation: isActive ? 10 : 4,
        },
        animatedStyle,
      ]}
    >
      <BlurView
        intensity={isActive ? 45 : 25}
        tint="dark"
        style={[
          styles.blur,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <View
          style={[
            styles.content,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: isActive ? activeColor : 'rgba(255,255,255,0.08)',
            },
          ]}
        >
          <Text style={[styles.icon, isActive && { color: COLORS.BLACK }]}>{icon}</Text>
          {label && <Text style={[styles.label, isActive && { color: COLORS.BLACK }]}>{label}</Text>}
        </View>
      </BlurView>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'hidden',
  },
  blur: {
    overflow: 'hidden',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  icon: {
    fontSize: 30,
    color: COLORS.WHITE,
  },
  label: {
    fontSize: 11,
    color: COLORS.WHITE,
    fontWeight: '600',
    marginTop: 3,
  },
});

