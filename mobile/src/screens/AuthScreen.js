import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, ANIMATION } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const { login, signup, isLoading } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  // Magical floating animation
  const floatY = useSharedValue(0);
  const floatRotation = useSharedValue(0);
  const heartScale = useSharedValue(1);

  React.useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(15, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    floatRotation.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    heartScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { rotate: `${floatRotation.value}deg` },
    ],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleSubmit = () => {
    if (isLogin) {
      login(email, password);
    } else {
      signup(username, email, password);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.BACKGROUND, COLORS.WHITE]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <FadeInView delay={0}>
          <View style={styles.logoContainer}>
            <Animated.View style={[styles.logoCircle, floatStyle]}>
              <LinearGradient
                colors={[COLORS.PRIMARY, COLORS.PRIMARY_DARK]}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.logoEmoji}>🍡</Text>
                <Animated.View style={[styles.heart, heartStyle]}>
                  <Text style={styles.heartEmoji}>💖</Text>
                </Animated.View>
              </LinearGradient>
            </Animated.View>
            <FadeInView delay={300}>
              <Text style={styles.header}>Mello</Text>
              <Text style={styles.tagline}>Moments that feel good</Text>
            </FadeInView>
          </View>
        </FadeInView>

        <FadeInView delay={500}>
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              {isLogin ? 'Welcome Back!' : 'Create Account'}
            </Text>

            {!isLogin && (
              <FadeInView delay={600}>
                <TextInput
                  placeholder="Username"
                  style={styles.input}
                  placeholderTextColor={COLORS.GRAY_MEDIUM}
                  value={username}
                  onChangeText={setUsername}
                />
              </FadeInView>
            )}
            <FadeInView delay={isLogin ? 600 : 700}>
              <TextInput
                placeholder="Email"
                style={styles.input}
                placeholderTextColor={COLORS.GRAY_MEDIUM}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </FadeInView>
            <FadeInView delay={isLogin ? 700 : 800}>
              <TextInput
                placeholder="Password"
                style={styles.input}
                placeholderTextColor={COLORS.GRAY_MEDIUM}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </FadeInView>

            <FadeInView delay={isLogin ? 800 : 900}>
              <AnimatedButton
                onPress={handleSubmit}
                disabled={isLoading}
                style={styles.btn}
                haptic={true}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.WHITE} />
                ) : (
                  <Text style={styles.btnText}>
                    {isLogin ? 'Login' : 'Sign Up'}
                  </Text>
                )}
              </AnimatedButton>
            </FadeInView>

            <FadeInView delay={isLogin ? 900 : 1000}>
              <AnimatedButton
                onPress={() => setIsLogin(!isLogin)}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>
                  {isLogin
                    ? 'New here? Create Account'
                    : 'Already have an account? Login'}
                </Text>
              </AnimatedButton>
            </FadeInView>
          </View>
        </FadeInView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.LG,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 30,
    marginBottom: SPACING.LG,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoEmoji: {
    fontSize: 60,
  },
  heart: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  heartEmoji: {
    fontSize: 30,
  },
  header: {
    fontSize: TYPOGRAPHY.SIZES.HERO,
    fontWeight: TYPOGRAPHY.WEIGHTS.HEAVY,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: TYPOGRAPHY.SIZES.MD,
    color: COLORS.GRAY_MEDIUM,
    fontStyle: 'italic',
  },
  formContainer: {
    width: '100%',
  },
  formTitle: {
    fontSize: TYPOGRAPHY.SIZES.XL,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    color: COLORS.PRIMARY_DARK,
    marginBottom: SPACING.LG,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.WHITE,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.MD,
    fontSize: TYPOGRAPHY.SIZES.MD,
    borderWidth: 2,
    borderColor: COLORS.GRAY_LIGHT,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  btn: {
    backgroundColor: COLORS.PRIMARY,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    alignItems: 'center',
    marginTop: SPACING.MD,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  btnText: {
    color: COLORS.WHITE,
    fontWeight: TYPOGRAPHY.WEIGHTS.BOLD,
    fontSize: TYPOGRAPHY.SIZES.LG,
  },
  linkButton: {
    marginTop: SPACING.LG,
    padding: SPACING.SM,
  },
  linkText: {
    color: COLORS.PRIMARY,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.WEIGHTS.MEDIUM,
    fontSize: TYPOGRAPHY.SIZES.MD,
  },
});
