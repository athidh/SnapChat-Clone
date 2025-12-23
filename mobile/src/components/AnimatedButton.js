import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ANIMATION } from '../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AnimatedButton({
  children,
  onPress,
  style,
  disabled = false,
  haptic = true,
  scaleValue = 0.95,
  magical = false,
  ...props
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (magical) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [magical]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      shadowOpacity: magical ? glow.value : 0.3,
    };
  });

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(scaleValue, ANIMATION.SPRING);
    opacity.value = withTiming(0.8, { duration: 100 });
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, ANIMATION.SPRING);
    opacity.value = withTiming(1, { duration: 100 });
  };

  const handlePress = () => {
    if (disabled) return;
    if (magical) {
      scale.value = withSequence(
        withSpring(1.1, ANIMATION.SPRING_BOUNCY),
        withSpring(1, ANIMATION.SPRING)
      );
    }
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
