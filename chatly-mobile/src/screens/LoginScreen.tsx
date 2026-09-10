import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';
import { ShinyButton } from '../components/ShinyButton';
import { AmbientBackground } from '../components/AmbientBackground';
import { useAuth } from '../lib/AuthContext';
import { colors, gradients, radii, shadows, spacing } from '../lib/theme';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { loginWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    opacity.value = withDelay(150, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(150, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleLogin = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error('Google sign-in failed:', e);
      const detail = e instanceof Error && e.message ? `\n\n${e.message}` : '';
      Alert.alert(
        'Sign in failed',
        `Could not sign in with Google. Please try again.${detail}`,
      );
      setSigningIn(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.card}>
          <View style={styles.eyebrow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrowText}>YOUR CONVERSATIONS, ELEVATED</Text>
          </View>
          <LinearGradient colors={gradients.primary} style={styles.logoBadge}>
            <Sparkles size={32} color="#fff" strokeWidth={2.1} />
          </LinearGradient>

          <Text style={styles.title}>Welcome back to Chatly</Text>
          <Text style={styles.subtitle}>
            A calmer way to stay close — with real-time messages, voice notes, and HD calls.
          </Text>

          <View style={styles.buttonWrap}>
            <ShinyButton
              label={signingIn ? 'Signing in…' : 'Continue with Google'}
              onPress={handleLogin}
              disabled={signingIn}
            />
          </View>

          <Text style={styles.footnote}>By continuing you agree to Chatly's Terms & Privacy Policy</Text>
        </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  content: { width: '100%', maxWidth: 400, alignItems: 'center' },
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: radii.lg + 8,
    paddingHorizontal: 28,
    paddingVertical: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...shadows.lg,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...shadows.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
    lineHeight: 22,
    fontSize: 15,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 18,
  },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryLight },
  eyebrowText: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  buttonWrap: { width: '100%', alignItems: 'center' },
  footnote: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    maxWidth: 260,
    lineHeight: 17,
  },
});