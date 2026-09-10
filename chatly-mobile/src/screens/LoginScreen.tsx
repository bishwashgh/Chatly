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
import { ArrowRight, Check, MessageCircle } from 'lucide-react-native';
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
      Alert.alert('Sign in failed', `Could not sign in with Google. Please try again.${detail}`);
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
          <View style={styles.brandRow}>
            <LinearGradient colors={gradients.primary} style={styles.brandIcon}>
              <MessageCircle size={21} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
            <Text style={styles.brandName}>Chatly</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.eyebrow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrowText}>A BETTER WAY TO CONNECT</Text>
            </View>

            <Text style={styles.title}>Stay close to the people who matter.</Text>
            <Text style={styles.subtitle}>
              Your conversations, calls, and moments together — all in one calm place.
            </Text>

            <View style={styles.perks}>
              <View style={styles.perk}><Check size={16} color={colors.primary} strokeWidth={3} /><Text style={styles.perkText}>Fast, real-time messaging</Text></View>
              <View style={styles.perk}><Check size={16} color={colors.primary} strokeWidth={3} /><Text style={styles.perkText}>Clear voice and video calls</Text></View>
            </View>

            <View style={styles.buttonWrap}>
              <ShinyButton
                label={signingIn ? 'Signing in…' : 'Continue with Google'}
                onPress={handleLogin}
                disabled={signingIn}
              />
            </View>
            {!signingIn && <View style={styles.buttonHint}><Text style={styles.buttonHintText}>Secure sign-in</Text><ArrowRight size={14} color={colors.textMuted} /></View>}

            <Text style={styles.footnote}>By continuing, you agree to Chatly's Terms & Privacy Policy.</Text>
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 20 },
  brandIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  brandName: { color: colors.textPrimary, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.lg + 8,
    paddingHorizontal: 28,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    ...shadows.lg,
  },
  title: { color: colors.textPrimary, fontSize: 30, lineHeight: 35, fontWeight: '800', letterSpacing: -0.7, textAlign: 'center' },
  subtitle: { color: colors.textSecondary, textAlign: 'center', marginTop: 12, marginBottom: 22, lineHeight: 22, fontSize: 15 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 18 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primaryLight },
  eyebrowText: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  perks: { alignSelf: 'stretch', backgroundColor: colors.surfaceAlt, borderRadius: radii.md, padding: spacing.md, gap: 9, marginBottom: 24 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  perkText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  buttonWrap: { width: '100%', alignItems: 'center' },
  buttonHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 11 },
  buttonHintText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  footnote: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 22, maxWidth: 270, lineHeight: 17 },
});
