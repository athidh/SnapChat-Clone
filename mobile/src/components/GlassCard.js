import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'react-native';

export default function GlassCard({
  children,
  style,
  intensity = 20,
  tint = 'dark',
  borderRadius = 20,
  ...props
}) {
  const colorScheme = useColorScheme();
  const blurTint = tint === 'auto' ? (colorScheme === 'dark' ? 'dark' : 'light') : tint;

  return (
    <BlurView
      intensity={intensity}
      tint={blurTint}
      style={[
        styles.container,
        { borderRadius, overflow: 'hidden' },
        style,
      ]}
      {...props}
    >
      <View style={[styles.content, { borderRadius }]}>
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    overflow: 'hidden',
  },
});


