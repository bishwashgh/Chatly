import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, ThemeColors } from '../theme';
import { AmbientBackground } from '../components/AmbientBackground';
import { GlassPanel } from '../components/GlassPanel';
import { GlassInput } from '../components/GlassInput';
import { GlassButton } from '../components/GlassButton';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../store/themeStore';
import { AuthScreenName } from '../navigation/types';

type LoginScreenProps = {
  onNavigate: (screen: AuthScreenName) => void;
};

export function LoginScreen({ onNavigate }: LoginScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AmbientBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              <Ionicons name="chatbubble-ellipses" size={44} color={colors.primary} />
            </View>
          </LinearGradient>
          <Text style={styles.brandName}>Chatly</Text>
          <Text style={styles.brandTagline}>Fast, secure messaging for Nepal</Text>
        </View>

        <GlassPanel variant="card" rounded="lg" style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome back</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            icon="lock-closed-outline"
            secure
            autoCapitalize="none"
            style={styles.inputSpacing}
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity style={styles.forgotLink} onPress={() => onNavigate('forgot')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <GlassButton
            title={loading ? 'Signing in...' : 'Sign In'}
            onPress={handleLogin}
            style={styles.submitButton}
            disabled={loading}
          />
        </GlassPanel>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.divider} />
        </View>

        <GoogleSignInButton />

        <TouchableOpacity onPress={() => onNavigate('register')} style={styles.switchLink}>
          <Text style={styles.switchText}>
            New here? <Text style={styles.switchAccent}>Create account</Text>
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AmbientBackground>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.gutter,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.stackLg,
  },
  logoGlow: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  logoCircle: {
    flex: 1,
    borderRadius: 41,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    ...typography.headlineMd,
    color: colors.onBackground,
    marginTop: 12,
  },
  brandTagline: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  formCard: {
    width: '100%',
    padding: 20,
    gap: 12,
  },
  formTitle: {
    ...typography.headlineMd,
    color: colors.onBackground,
    marginBottom: 8,
  },
  inputSpacing: {
    marginVertical: 2,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  forgotText: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    marginBottom: 4,
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