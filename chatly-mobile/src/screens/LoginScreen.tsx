import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { ArrowRight, Check } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../lib/AuthContext';
import { colors, radii, shadows, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
          fill="#4285F4"
        />
        <Path
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.19 24 12 24z"
          fill="#34A853"
        />
        <Path
          d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.18C.43 8.13 0 9.87 0 12s.43 3.87 1.18 5.4l4.09-3.16z"
          fill="#FBBC05"
        />
        <Path
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.19 0 3.15 2.68 1.18 6.6l4.09 3.16c.95-2.85 3.6-4.96 6.73-4.96z"
          fill="#EA4335"
        />
      </Svg>
    </View>
  );
}

export function LoginScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { loginWithGoogle } = useAuth();
  const { isDark } = useTheme();
  const [signingIn, setSigningIn] = useState(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    opacity.value = withDelay(150, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(150, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleLogin = async () => {
    if (signingIn) return;
    Haptics.selectionAsync();
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
    <View style={[styles.screen, { backgroundColor: isDark ? '#121316' : colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, animatedStyle]}>
          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/chatly_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.brandName, isDark && styles.textDark]}>Chatly</Text>
          </View>

          <View style={[styles.card, isDark && styles.cardDark]}>
            <View style={styles.eyebrow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrowText}>FRIEND-GATED MESSAGING</Text>
            </View>

            <Text style={[styles.title, isDark && styles.textDark]}>Stay close to the people who matter.</Text>
            <Text style={[styles.subtitle, isDark && styles.textMutedDark]}>
              Your conversations, calls, and moments together — encrypted and friend-gated.
            </Text>

            <View style={[styles.perks, isDark && styles.perksDark]}>
              <View style={styles.perk}>
                <Check size={16} color={colors.primary} strokeWidth={3} />
                <Text style={[styles.perkText, isDark && styles.textSecondaryDark]}>Fast, encrypted real-time chat</Text>
              </View>
              <View style={styles.perk}>
                <Check size={16} color={colors.primary} strokeWidth={3} />
                <Text style={[styles.perkText, isDark && styles.textSecondaryDark]}>Secure friend-gated circle access</Text>
              </View>
            </View>

            <View style={styles.buttonWrap}>
              <Pressable
                style={({ pressed }) => [
                  styles.googleBtn,
                  isDark && styles.googleBtnDark,
                  signingIn && styles.disabledBtn,
                  pressed && styles.pressed,
                ]}
                onPress={handleLogin}
                disabled={signingIn}
              >
                {signingIn ? (
                  <View style={styles.googleLoadingRow}>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text style={[styles.googleBtnText, isDark && styles.textDark]}>
                      Connecting to Google...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.googleContentRow}>
                    <GoogleIcon size={20} />
                    <Text style={[styles.googleBtnText, isDark && styles.textDark]}>
                      Continue with Google
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.emailButton,
                pressed && styles.pressed,
              ]}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Text style={styles.emailButtonText}>Sign In with email</Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={styles.signupLink}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={[styles.buttonHintText, isDark && styles.textMutedDark]}>New to Chatly? </Text>
              <Text style={styles.signupText}>Create account</Text>
            </Pressable>

            <Text style={styles.footnote}>By continuing, you agree to Chatly's Terms & Privacy Policy.</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  content: { width: '100%', maxWidth: 420, alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  logoImage: { width: 44, height: 44, borderRadius: 12 },
  brandName: { color: '#1A1B1F', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: 'rgba(26, 27, 31, 0.06)',
    ...shadows.md,
  },
  cardDark: { backgroundColor: '#1A1B1F', borderColor: 'rgba(255, 255, 255, 0.10)' },
  title: { color: '#1A1B1F', fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  subtitle: { color: '#3D4A3C', textAlign: 'center', marginTop: 10, marginBottom: 20, lineHeight: 21, fontSize: 14.5 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  eyebrowText: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  perks: { alignSelf: 'stretch', backgroundColor: '#F4F3F8', borderRadius: radii.md, padding: spacing.md, gap: 10, marginBottom: 22 },
  perksDark: { backgroundColor: '#24252A' },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perkText: { color: '#3D4A3C', fontSize: 13, fontWeight: '600' },
  buttonWrap: { width: '100%', alignItems: 'center', marginBottom: spacing.sm },
  googleBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#DADCE0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleBtnDark: {
    backgroundColor: '#24252A',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowOpacity: 0.15,
  },
  googleBtnText: { color: '#1F1F1F', fontSize: 15.5, fontWeight: '600', letterSpacing: -0.2 },
  googleLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emailButton: {
    width: '100%',
    height: 50,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    ...shadows.sm,
  },
  emailButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  signupLink: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  buttonHintText: { color: '#6D7B6B', fontSize: 13 },
  signupText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  footnote: { color: '#6D7B6B', fontSize: 12, textAlign: 'center', marginTop: 20, maxWidth: 280, lineHeight: 16 },
  textDark: { color: '#F1F0F5' },
  textSecondaryDark: { color: '#C2CEC0' },
  textMutedDark: { color: '#8E9A8C' },
  disabledBtn: { opacity: 0.6 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
