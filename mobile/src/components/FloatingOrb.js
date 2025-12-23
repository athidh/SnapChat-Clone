import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function FloatingOrb({
  children,
  size = 60,
  style,
  glowColor = '#FF6B35',
  intensity = 30,
  onPress,
}) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.3);

  useEffect(() => {
    // Subtle breathing animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: glow.value,
    };
  });

  const Component = onPress ? AnimatedPressable : Animated.View;
  const pressHandler = onPress ? {
    onPress: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    },
  } : {};

  return (
    <Component
      {...pressHandler}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 15,
          elevation: 8,
        },
        animatedStyle,
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
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
            },
          ]}
        >
          {children}
        </View>
      </BlurView>
    </Component>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  blur: {
    overflow: 'hidden',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});


