import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { AmbientBackground } from '../components/AmbientBackground';
import { GlassPanel } from '../components/GlassPanel';
import { GlassButton } from '../components/GlassButton';
import { OtpInput } from '../components/OtpInput';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { OtpParams } from '../navigation/types';

type OtpScreenProps = {
  params: OtpParams | null;
  onBack: () => void;
};

export function OtpScreen({ params, onBack }: OtpScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const register = useAuthStore((s) => s.register);

  const handleVerify = async () => {
    setError('');
    if (!params) return;
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      if (params.purpose === 'signup' && params.pendingData) {
        await register({ ...params.pendingData, otp_code: code });
        // Success -> App switches to the authenticated UI automatically.
      }
    } catch (e: any) {
      setError(e.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!params) return;
    try {
      await api.sendOtp({ email: params.email, purpose: params.purpose });
      Alert.alert('Code sent', `A new code was sent to ${params.email}`);
    } catch (e: any) {
      Alert.alert('Could not send code', e.message || 'Please try again.');
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
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
          </View>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.email}>{params?.email || 'your email'}</Text>
          </Text>
        </View>

        <GlassPanel variant="card" rounded="lg" style={styles.card}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <OtpInput value={code} onChangeText={setCode} />
          <GlassButton
            title={loading ? 'Verifying...' : 'Verify & Create Account'}
            onPress={handleVerify}
            style={styles.submitButton}
            disabled={loading}
          />
        </GlassPanel>

<View style={styles.footer}>
            <Text style={styles.footerText}>Didn't receive the code?</Text>
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendText}>Resend code</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
    </AmbientBackground>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: spacing.gutter,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: spacing.gutter,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.stackLg,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onBackground,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  email: {
    color: colors.primary,
    fontWeight: '600',
  },
  card: {
    padding: 24,
    gap: 16,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.stackLg,
    gap: 4,
  },
  footerText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  resendText: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: '700',
  },
});