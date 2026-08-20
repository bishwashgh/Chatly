import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, ThemeColors } from '../theme';
import { useTheme } from '../store/themeStore';
import { AmbientBackground } from '../components/AmbientBackground';
import { GlassPanel } from '../components/GlassPanel';
import { GlassInput } from '../components/GlassInput';
import { GlassButton } from '../components/GlassButton';
import { OtpInput } from '../components/OtpInput';
import { api } from '../services/api';

type ForgotPasswordScreenProps = {
  initialEmail?: string;
  onBack: () => void;
  onDone: () => void;
};

export function ForgotPasswordScreen({ initialEmail, onBack, onDone }: ForgotPasswordScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const res = await api.sendOtp({ email: trimmed, purpose: 'password_reset' });
      if (res.dev_code) {
        Alert.alert('Development mode', `Your verification code is: ${res.dev_code}`);
      }
      setStep('code');
    } catch (e: any) {
      setError(e.message || 'Could not send the code');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword({
        email: email.trim().toLowerCase(),
        code,
        new_password: newPassword,
      });
      Alert.alert('Password updated', 'You can now sign in with your new password.', [
        { text: 'OK', onPress: onDone },
      ]);
    } catch (e: any) {
      setError(e.message || 'Could not reset the password');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await api.sendOtp({ email: email.trim().toLowerCase(), purpose: 'password_reset' });
      if (res.dev_code) {
        Alert.alert('Development mode', `Your verification code is: ${res.dev_code}`);
      } else {
        Alert.alert('Code sent', `A new code was sent to ${email.trim().toLowerCase()}`);
      }
    } catch (e: any) {
      Alert.alert('Could not send code', e.message || 'Please try again.');
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
        <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="key" size={34} color={colors.primary} />
          </View>
          <Text style={styles.title}>
            {step === 'email' ? 'Reset your password' : 'Enter the code'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'email'
              ? 'We will email you a 6-digit code to reset your password.'
              : `A code was sent to ${email.trim().toLowerCase()}. Enter it along with your new password.`}
          </Text>
        </View>

        <GlassPanel variant="card" rounded="lg" style={styles.card}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {step === 'email' ? (
            <>
              <GlassInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                icon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                onSubmitEditing={handleSendCode}
              />
              <GlassButton
                title={loading ? 'Sending...' : 'Send Code'}
                onPress={handleSendCode}
                style={styles.submitButton}
                disabled={loading}
              />
            </>
          ) : (
            <>
              <OtpInput value={code} onChangeText={setCode} />
              <GlassInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                icon="lock-closed-outline"
                secure
                autoCapitalize="none"
                style={styles.inputSpacing}
              />
              <GlassInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Confirm new password"
                icon="lock-closed-outline"
                secure
                autoCapitalize="none"
                style={styles.inputSpacing}
                onSubmitEditing={handleReset}
              />
              <GlassButton
                title={loading ? 'Resetting...' : 'Reset Password'}
                onPress={handleReset}
                style={styles.submitButton}
                disabled={loading}
              />
            </>
          )}
        </GlassPanel>

        {step === 'code' && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Didn't receive it?</Text>
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendText}>Resend code</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
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
    maxWidth: 300,
  },
  card: {
    padding: 24,
    gap: 14,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
  inputSpacing: {
    marginTop: 2,
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