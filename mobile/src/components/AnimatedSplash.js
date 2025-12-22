import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep the native splash screen visible initially
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function AnimatedSplash({ children, isAppReady }) {
  const [animationComplete, setAnimationComplete] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1)); // Start visible (1)
  const [scaleAnim] = useState(new Animated.Value(1)); // Start normal size (1)

  useEffect(() => {
    if (isAppReady) {
      async function animate() {
        // 1. Hide the static native splash immediately
        await SplashScreen.hideAsync();

        // 2. Run our custom JS animation
        Animated.parallel([
          // Fade out
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 800, // 0.8 seconds fade
            useNativeDriver: true,
          }),
          // Slight zoom out effect for "breathing" feel
          Animated.timing(scaleAnim, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setAnimationComplete(true);
        });
      }

      animate();
    }
  }, [isAppReady]);

  if (animationComplete) {
    return children;
  }

  return (
    <View style={{ flex: 1 }}>
      {/* The App is rendered underneath */}
      {children}

      {/* The Splash Screen Overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#ffffff', // Match your app.json background
            opacity: fadeAnim,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999, // Ensure it sits on top of everything
            transform: [{ scale: scaleAnim }] 
          },
        ]}
      >
        <Image
          source={require('../../assets/splash.png')} // Make sure this file exists!
          style={{
            width: '100%',
            height: '100%',
            resizeMode: 'contain',
          }}
        />
      </Animated.View>
    </View>
  );
}