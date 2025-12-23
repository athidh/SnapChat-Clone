import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

export default function FadeInView({
  children,
  delay = 0,
  duration = 400,
  style,
  fromOpacity = 0,
  fromY = 20,
  ...props
}) {
  const opacity = useSharedValue(fromOpacity);
  const translateY = useSharedValue(fromY);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.out(Easing.cubic),
      })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, {
        duration,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}


