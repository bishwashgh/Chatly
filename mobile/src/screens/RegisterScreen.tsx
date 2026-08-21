import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, ThemeColors } from '../theme';
import { AmbientBackground } from '../components/AmbientBackground';
import { GlassPanel } from '../components/GlassPanel';
import { GlassInput } from '../components/GlassInput';
import { GlassButton } from '../components/GlassButton';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../store/themeStore';
import { AuthScreenName, OtpParams, PendingSignup } from '../navigation/types';

type RegisterScreenProps = {
  onNavigate: (screen: AuthScreenName, params?: OtpParams) => void;
  initialData?: PendingSignup;
};

export function RegisterScreen({ onNavigate, initialData }: RegisterScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState(initialData?.username || '');
  const [displayName, setDisplayName] = useState(initialData?.display_name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Avatar picker error', e);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!username.trim() || !email.trim() || !password.trim() || !displayName.trim()) {
      setError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarUri) {
        const mimeType = avatarUri.includes('.png') ? 'image/png' : 'image/jpeg';
        const upload = await api.uploadMedia(avatarUri, mimeType, 'avatar.jpg');
        avatarUrl = upload.url;
      }
      const res = await api.sendOtp({ email: email.trim().toLowerCase(), purpose: 'signup' });
      if (res.dev_code) {
        Alert.alert('Development mode', `Your verification code is: ${res.dev_code}`);
      }
      const pending: PendingSignup = {
        username: username.trim(),
        display_name: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        avatar_url: avatarUrl,
      };
      onNavigate('otp', {
        email: email.trim().toLowerCase(),
        purpose: 'signup',
        pendingData: pending,
      });
    } catch (e: any) {
      const msg = e?.message || 'Could not send the verification code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AmbientBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandSection}>
            <LinearGradient
              colors={[colors.primary, colors.gradientSecondary]}
              style={styles.logoGlow}
            >
              <View style={styles.logoCircle}>
                <Ionicons name="chatbubble-ellipses" size={36} color={colors.primary} />
              </View>
            </LinearGradient>
            <Text style={styles.brandName}>Create Account</Text>
            <Text style={styles.brandTagline}>Join Chatly</Text>
          </View>

          <GlassPanel variant="card" rounded="lg" style={styles.formCard}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
              <LinearGradient
                colors={[colors.primary, colors.gradientSecondary]}
                style={styles.avatarRing}
              >
                <View style={styles.avatarCircle}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={40} color={colors.primary} />
                  )}
                </View>
              </LinearGradient>
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={16} color={colors.surfaceContainerLowest} />
              </View>
              <Text style={styles.avatarHint}>
                {avatarUri ? 'Change photo' : 'Add a profile photo (optional)'}
              </Text>
            </TouchableOpacity>

            <GlassInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Full name"
              icon="person-outline"
            />
            <GlassInput
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              icon="at-outline"
              autoCapitalize="none"
              style={styles.inputSpacing}
            />
            <GlassInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.inputSpacing}
            />
            <GlassInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone (e.g. 98XXXXXXXX)"
              icon="call-outline"
              keyboardType="phone-pad"
              style={styles.inputSpacing}
            />
            <GlassInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              icon="lock-closed-outline"
              secure
              autoCapitalize="none"
              style={styles.inputSpacing}
              onSubmitEditing={handleRegister}
            />

            <GlassButton
              title={loading ? 'Sending code...' : 'Continue'}
              variant="fluid"
              onPress={handleRegister}
              style={styles.submitButton}
              disabled={loading}
              icon={<Ionicons name="arrow-forward-outline" size={18} color="#fff" />}
            />
          </GlassPanel>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.divider} />
          </View>

          <GoogleSignInButton />

          <TouchableOpacity onPress={() => onNavigate('login')} style={styles.switchLink}>
            <Text style={styles.switchText}>
              Already have an account? <Text style={styles.switchAccent}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AmbientBackground>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.gutter,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.stackMd,
  },
  logoGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  logoCircle: {
    flex: 1,
    borderRadius: 33,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    ...typography.headlineMd,
    color: colors.onBackground,
    marginTop: 10,
  },
  brandTagline: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  formCard: {
    width: '100%',
    padding: 20,
    gap: 12,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  avatarRing: {
    borderRadius: 42,
    padding: 2,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarBadge: {
    position: 'absolute',
    right: 60,
    bottom: 28,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    ...typography.labelSm,
    color: colors.primary,
    fontSize: 11,
  },
  inputSpacing: {
    marginTop: 0,
  },
  submitButton: {
    marginTop: 8,
    minWidth: '100%',
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    marginBottom: 4,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: spacing.stackMd,
    marginBottom: spacing.stackSm,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glassBorder,
  },
  dividerText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  switchLink: {
    marginTop: spacing.stackMd,
    padding: 12,
    alignItems: 'center',
  },
  switchText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  switchAccent: {
    color: colors.primary,
    fontWeight: '700',
  },
});