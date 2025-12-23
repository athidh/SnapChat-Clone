import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, ANIMATION } from '../constants/theme';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CustomTabBar({ state, descriptors, navigation }) {
  const tabIcons = {
    Camera: { icon: '📸', label: 'Capture' },
    Inbox: { icon: '✉️', label: 'Inbox' },
    Friends: { icon: '☺️', label: 'Friends' },
  };

  const tabWidth = 100; // Width for each tab
  const indicatorPosition = useSharedValue(0);

  React.useEffect(() => {
    indicatorPosition.value = withSpring(state.index * tabWidth, ANIMATION.SPRING);
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: indicatorPosition.value }],
    };
  });

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.blurContainer}>
        <View style={styles.tabBar}>
          {/* Animated Indicator */}
          <AnimatedView style={[styles.indicator, indicatorStyle]}>
            <LinearGradient
              colors={[COLORS.PRIMARY, COLORS.PRIMARY_LIGHT]}
              style={styles.indicatorGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </AnimatedView>

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const tabInfo = tabIcons[route.name] || { icon: '•', label: route.name };

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TabButton
                key={route.key}
                icon={tabInfo.icon}
                label={tabInfo.label}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                options={options}
              />
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function TabButton({ icon, label, isFocused, onPress, onLongPress, options }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
      ],
    };
  });

  React.useEffect(() => {
    if (isFocused) {
      scale.value = withSpring(1.08, ANIMATION.SPRING);
    } else {
      scale.value = withSpring(1, ANIMATION.SPRING);
    }
  }, [isFocused]);

  const handlePressIn = () => {
    scale.value = withSpring(0.96, ANIMATION.SPRING);
  };

  const handlePressOut = () => {
    scale.value = withSpring(isFocused ? 1.08 : 1, ANIMATION.SPRING);
  };

  return (
    <AnimatedPressable
      style={[styles.tabButton, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options?.tabBarAccessibilityLabel}
      testID={options?.tabBarTestID}
    >
      <View style={styles.tabContent}>
        <Text
          style={[
            styles.tabIcon,
            isFocused && styles.tabIconFocused,
          ]}
        >
          {icon}
        </Text>
        {isFocused && (
          <Text style={styles.tabLabel}>{label}</Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  tabBar: {
    flexDirection: 'row',
    height: 78,
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.SM,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: SPACING.SM,
    left: SPACING.MD,
    width: 100,
    height: 4,
    borderRadius: 2,
    zIndex: 0,
  },
  indicatorGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.SM,
    zIndex: 1,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  tabIcon: {
    fontSize: 32,
    marginBottom: SPACING.XS,
    opacity: 0.5,
  },
  tabIconFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.SIZES.XS,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    color: COLORS.PRIMARY,
    marginTop: -SPACING.XS,
  },
});
