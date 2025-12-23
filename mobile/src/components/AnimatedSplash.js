import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING } from '../constants/theme';

// Keep the native splash screen visible initially
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function AnimatedSplash({ children, isAppReady }) {
  const [animationComplete, setAnimationComplete] = useState(false);

  // Logo animation values
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoRotation = useSharedValue(-180);
  const logoY = useSharedValue(0);

  // Text animation values
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(30);

  // Magical floating hearts
  const heart1X = useSharedValue(0);
  const heart1Y = useSharedValue(0);
  const heart1Scale = useSharedValue(0);
  const heart2X = useSharedValue(0);
  const heart2Y = useSharedValue(0);
  const heart2Scale = useSharedValue(0);
  const heart3X = useSharedValue(0);
  const heart3Y = useSharedValue(0);
  const heart3Scale = useSharedValue(0);

  // Background fade
  const bgOpacity = useSharedValue(1);

  useEffect(() => {
    if (isAppReady) {
      async function animate() {
        await SplashScreen.hideAsync();

        // Phase 1: Logo builds itself (scale + rotation + bounce)
        logoScale.value = withSequence(
          withTiming(1.3, { duration: 500, easing: Easing.out(Easing.back(2)) }),
          withTiming(0.95, { duration: 200, easing: Easing.in(Easing.ease) }),
          withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) })
        );
        logoOpacity.value = withTiming(1, { duration: 400 });
        logoRotation.value = withTiming(0, {
          duration: 600,
          easing: Easing.out(Easing.back(1.5))
        });
        logoY.value = withSequence(
          withTiming(-20, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
        );

        // Phase 2: Hearts appear magically
        heart1X.value = withDelay(600, withTiming(50, { duration: 800 }));
        heart1Y.value = withDelay(600, withTiming(-30, { duration: 800 }));
        heart1Scale.value = withDelay(600, withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) }));

        heart2X.value = withDelay(800, withTiming(-60, { duration: 800 }));
        heart2Y.value = withDelay(800, withTiming(40, { duration: 800 }));
        heart2Scale.value = withDelay(800, withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) }));

        heart3X.value = withDelay(1000, withTiming(70, { duration: 800 }));
        heart3Y.value = withDelay(1000, withTiming(50, { duration: 800 }));
        heart3Scale.value = withDelay(1000, withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) }));

        // Phase 3: Text fades in
        textOpacity.value = withDelay(
          1000,
          withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
        );
        textTranslateY.value = withDelay(
          1000,
          withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
        );

        // Phase 4: Continuous floating animation
        logoY.value = withDelay(
          1500,
          withRepeat(
            withSequence(
              withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
              withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
          )
        );

        // Phase 5: Pulse effect
        logoScale.value = withDelay(
          1500,
          withRepeat(
            withSequence(
              withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
              withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
          )
        );

        // Phase 6: Fade out everything
        bgOpacity.value = withDelay(
          3000,
          withTiming(0, { duration: 800, easing: Easing.in(Easing.ease) }, () => {
            runOnJS(setAnimationComplete)(true);
          })
        );
        logoOpacity.value = withDelay(3000, withTiming(0, { duration: 800 }));
        textOpacity.value = withDelay(3000, withTiming(0, { duration: 800 }));
        heart1Scale.value = withDelay(3000, withTiming(0, { duration: 600 }));
        heart2Scale.value = withDelay(3000, withTiming(0, { duration: 600 }));
        heart3Scale.value = withDelay(3000, withTiming(0, { duration: 600 }));
      }

      animate();
    }
  }, [isAppReady]);

  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: logoScale.value },
        { rotate: `${logoRotation.value}deg` },
        { translateY: logoY.value },
      ],
      opacity: logoOpacity.value,
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
      transform: [{ translateY: textTranslateY.value }],
    };
  });

  const bgStyle = useAnimatedStyle(() => {
    return {
      opacity: bgOpacity.value,
    };
  });

  const heart1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: heart1X.value },
      { translateY: heart1Y.value },
      { scale: heart1Scale.value },
    ],
    opacity: heart1Scale.value,
  }));

  const heart2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: heart2X.value },
      { translateY: heart2Y.value },
      { scale: heart2Scale.value },
    ],
    opacity: heart2Scale.value,
  }));

  const heart3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: heart3X.value },
      { translateY: heart3Y.value },
      { scale: heart3Scale.value },
    ],
    opacity: heart3Scale.value,
  }));

  if (animationComplete) {
    return children;
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        <LinearGradient
          colors={[COLORS.BACKGROUND, COLORS.WHITE]}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.container}>
            <Animated.View style={[styles.logoContainer, logoStyle]}>
              <LinearGradient
                colors={[COLORS.PRIMARY, COLORS.PRIMARY_DARK]}
                style={styles.logoCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.logoEmoji}>🍡</Text>
                <Animated.View style={[styles.heart, heart1Style]}>
                  <Text style={styles.heartEmoji}>💖</Text>
                </Animated.View>
                <Animated.View style={[styles.heart, styles.heart2, heart2Style]}>
                  <Text style={styles.heartEmoji}>💕</Text>
                </Animated.View>
                <Animated.View style={[styles.heart, styles.heart3, heart3Style]}>
                  <Text style={styles.heartEmoji}>💗</Text>
                </Animated.View>
              </LinearGradient>
            </Animated.View>
            <Animated.View style={[styles.textContainer, textStyle]}>
              <Text style={styles.brandText}>MELLO</Text>
              <Text style={styles.tagline}>Moments that feel good</Text>
            </Animated.View>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 20,
    position: 'relative',
  },
  logoEmoji: {
    fontSize: 70,
  },
  heart: {
    position: 'absolute',
    top: -15,
    right: -15,
  },
  heart2: {
    top: -10,
    left: -10,
  },
  heart3: {
    bottom: -15,
    right: 10,
  },
  heartEmoji: {
    fontSize: 35,
  },
  textContainer: {
    marginTop: SPACING.XL,
    alignItems: 'center',
  },
  brandText: {
    fontSize: TYPOGRAPHY.SIZES.XXL,
    fontWeight: TYPOGRAPHY.WEIGHTS.HEAVY,
    color: COLORS.PRIMARY,
    letterSpacing: 8,
    marginBottom: SPACING.XS,
  },
  tagline: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.GRAY_MEDIUM,
    fontStyle: 'italic',
  },
});
