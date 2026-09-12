import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation } from '@apollo/client';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowRight,
  AtSign,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MailCheck,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import { AuthLayout, authStyles } from '../components/AuthLayout';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../lib/AuthContext';
import {
  REQUEST_PASSWORD_RESET,
  RESET_PASSWORD,
  RESEND_PASSWORD_RESET_CODE,
  RESEND_SIGNUP_CODE,
  SIGN_UP,
} from '../graphql/auth.gql';
import { colors, radii, shadows, spacing } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

type Props = { navigation: any };

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

function OtpBoxes({
  value,
  onChangeText,
  shakeTrigger = 0,
  autoFocus = true,
}: {
  value: string;
  onChangeText: (value: string) => void;
  shakeTrigger?: number;
  autoFocus?: boolean;
}) {
  const { isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (shakeTrigger > 0) {
      shakeX.value = withSequence(
        withTiming(-12, { duration: 60 }),
        withTiming(12, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [shakeTrigger, shakeX]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <Animated.View style={[styles.otpRow, animatedStyle]}>
      <Pressable style={styles.otpRowPressable} onPress={() => inputRef.current?.focus()}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.hiddenOtpInput}
          autoComplete="one-time-code"
          autoFocus={autoFocus}
        />
        {digits.map((digit, index) => {
          const isActive = value.length === index;
          const isFilled = index < value.length;
          return (
            <View
              key={index}
              style={[
                styles.otpBox,
                isDark && styles.otpBoxDark,
                isActive && styles.otpBoxActive,
                isFilled && styles.otpBoxFilled,
              ]}
            >
              <Text style={[styles.otpDigit, isDark && styles.textDark]}>{digit.trim()}</Text>
            </View>
          );
        })}
      </Pressable>
    </Animated.View>
  );
}

// ----------------------------------------------------
// 1. SIGN IN SCREEN
// ----------------------------------------------------
export function SignInScreen({ navigation }: Props) {
  const { loginWithPassword, loginWithGoogle } = useAuth();
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await loginWithPassword(email.trim(), password);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to sign in');
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    Haptics.selectionAsync();
    setGoogleBusy(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to sign in with Google');
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your secure Chatly vault"
      heroIcon={
        <View style={styles.heroBadgeLarge}>
          <View style={styles.heroBadgeGlow} />
          <Lock size={36} color={colors.primary} strokeWidth={2.4} />
        </View>
      }
    >
      <View style={[authStyles.card, isDark && authStyles.cardDark]}>
        {/* Email Field */}
        <Text style={[authStyles.fieldLabel, isDark && authStyles.fieldLabelDark]}>
          Email or Phone Number
        </Text>
        <View style={[authStyles.inputWrap, isDark && authStyles.inputWrapDark]}>
          <AtSign size={18} color="#6D7B6B" style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && authStyles.inputDark]}
            placeholder="name@example.com"
            placeholderTextColor="#6D7B6B"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password Field */}
        <View style={styles.labelWithAction}>
          <Text style={[authStyles.fieldLabel, isDark && authStyles.fieldLabelDark]}>
            Password
          </Text>
          <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={6}>
            <Text style={styles.forgotLink}>Forgot?</Text>
          </Pressable>
        </View>
        <View style={[authStyles.inputWrap, isDark && authStyles.inputWrapDark]}>
          <KeyRound size={18} color="#6D7B6B" style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && authStyles.inputDark]}
            placeholder="••••••••••••"
            placeholderTextColor="#6D7B6B"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            {showPassword ? (
              <EyeOff size={18} color="#6D7B6B" />
            ) : (
              <Eye size={18} color="#6D7B6B" />
            )}
          </Pressable>
        </View>

        {error ? <Text style={authStyles.errorText}>{error}</Text> : null}

        {/* Sign In Button */}
        <PrimaryButton
          label="Sign In"
          onPress={submit}
          loading={busy}
          disabled={busy || googleBusy}
          icon={<ArrowRight size={18} color="#FFFFFF" />}
        />

        {/* Divider */}
        <View style={authStyles.dividerRow}>
          <View style={authStyles.dividerLine} />
          <Text style={authStyles.dividerText}>or connect securely</Text>
          <View style={authStyles.dividerLine} />
        </View>

        {/* Google Continue Button */}
        <Pressable
          style={({ pressed }) => [
            authStyles.googleButton,
            isDark && authStyles.googleButtonDark,
            (busy || googleBusy) && styles.disabledBtn,
            pressed && styles.btnPressed,
          ]}
          onPress={google}
          disabled={busy || googleBusy}
        >
          {googleBusy ? (
            <View style={styles.googleLoadingRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[authStyles.googleButtonText, isDark && styles.textDark]}>
                Connecting to Google...
              </Text>
            </View>
          ) : (
            <View style={styles.googleContentRow}>
              <GoogleIcon size={20} />
              <Text style={[authStyles.googleButtonText, isDark && styles.textDark]}>
                Continue with Google
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Footer Link */}
      <View style={authStyles.footerRow}>
        <Text style={[authStyles.footerText, isDark && styles.textSecondaryDark]}>
          Don't have a Chatly vault?{' '}
        </Text>
        <Pressable onPress={() => navigation.navigate('SignUp')} hitSlop={6}>
          <Text style={authStyles.footerLink}>Create account</Text>
        </Pressable>
      </View>

      {/* End-to-end security badge */}
      <View style={authStyles.securityBadge}>
        <ShieldCheck size={14} color="#6D7B6B" />
        <Text style={authStyles.securityBadgeText}>
          End-to-end encrypted & friend-gated access
        </Text>
      </View>
    </AuthLayout>
  );
}

// ----------------------------------------------------
// 2. SIGN UP SCREEN
// ----------------------------------------------------
export function SignUpScreen({ navigation }: Props) {
  const { loginWithGoogle } = useAuth();
  const { isDark } = useTheme();
  const [signUp] = useMutation(SIGN_UP);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password || !confirm) {
      return setError('Please fill in all fields');
    }
    if (password !== confirm) {
      return setError('Passwords do not match');
    }
    if (!agreed) {
      return setError('Please agree to the Terms of Service & Privacy Policy');
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await signUp({
        variables: { input: { name: name.trim(), email: email.trim(), password } },
      });
      navigation.navigate('Otp', {
        challengeId: data.signUp.challengeId,
        destination: data.signUp.destination,
        mode: 'signup',
      });
    } catch (e: any) {
      setError(e?.message ?? 'Unable to create account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join Chatly securely and connect with your inner circle."
      heroIcon={
        <View style={styles.heroBadgeMedium}>
          <Lock size={28} color={colors.primary} strokeWidth={2.4} />
        </View>
      }
    >
      <View style={[authStyles.card, isDark && authStyles.cardDark]}>
        {/* Full Name */}
        <Text style={[authStyles.fieldLabel, isDark && authStyles.fieldLabelDark]}>
          Full Name
        </Text>
        <View style={[authStyles.inputWrap, isDark && authStyles.inputWrapDark]}>
          <User size={18} color="#6D7B6B" style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && authStyles.inputDark]}
            placeholder="Alex Rivers"
            placeholderTextColor="#6D7B6B"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email or Phone */}
        <Text style={[authStyles.fieldLabel, isDark && authStyles.fieldLabelDark]}>
          Email or Phone Number
        </Text>
        <View style={[authStyles.inputWrap, isDark && authStyles.inputWrapDark]}>
          <AtSign size={18} color="#6D7B6B" style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && authStyles.inputDark]}
            placeholder="alex@example.com"
            placeholderTextColor="#6D7B6B"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}
        <Text style={[authStyles.fieldLabel, isDark && authStyles.fieldLabelDark]}>
          Password
        </Text>
        <View style={[authStyles.inputWrap, isDark && authStyles.inputWrapDark]}>
          <KeyRound size={18} color="#6D7B6B" style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && authStyles.inputDark]}
            placeholder="••••••••••••"
            placeholderTextColor="#6D7B6B"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            {showPassword ? (
              <EyeOff size={18} color="#6D7B6B" />
            ) : (
              <Eye size={18} color="#6D7B6B" />
            )}
          </Pressable>
        </View>

        {/* Confirm Password */}
        <Text style={[authStyles.fieldLabel, isDark && authStyles.fieldLabelDark]}>
          Confirm Password
        </Text>
        <View style={[authStyles.inputWrap, isDark && authStyles.inputWrapDark]}>
          <Shield size={18} color="#6D7B6B" style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && authStyles.inputDark]}
            placeholder="••••••••••••"
            placeholderTextColor="#6D7B6B"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        {/* Terms checkbox */}
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setAgreed(!agreed)}
        >
          <View
            style={[
              styles.checkboxBox,
              agreed && styles.checkboxBoxActive,
              isDark && styles.checkboxBoxDark,
            ]}
          >
            {agreed && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
          </View>
          <Text style={[styles.checkboxLabel, isDark && styles.textSecondaryDark]}>
            I agree to the{' '}
            <Text style={styles.linkText}>Terms of Service</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>
        </Pressable>

        {error ? <Text style={authStyles.errorText}>{error}</Text> : null}

        {/* Create Account Button */}
        <PrimaryButton
          label="Create Secure Account"
          onPress={submit}
          loading={busy}
          disabled={busy || googleBusy}
          icon={<ArrowRight size={18} color="#FFFFFF" />}
          style={styles.primaryCta}
        />

        {/* Divider */}
        <View style={authStyles.dividerRow}>
          <View style={authStyles.dividerLine} />
          <Text style={authStyles.dividerText}>OR</Text>
          <View style={authStyles.dividerLine} />
        </View>

        {/* Google Continue Button */}
        <Pressable
          style={({ pressed }) => [
            authStyles.googleButton,
            isDark && authStyles.googleButtonDark,
            (busy || googleBusy) && styles.disabledBtn,
            pressed && styles.btnPressed,
          ]}
          onPress={async () => {
            Haptics.selectionAsync();
            setGoogleBusy(true);
            try {
              await loginWithGoogle();
            } catch (e: any) {
              setError(e?.message ?? 'Unable to sign in with Google');
            } finally {
              setGoogleBusy(false);
            }
          }}
          disabled={busy || googleBusy}
        >
          {googleBusy ? (
            <View style={styles.googleLoadingRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[authStyles.googleButtonText, isDark && styles.textDark]}>
                Connecting to Google...
              </Text>
            </View>
          ) : (
            <View style={styles.googleContentRow}>
              <GoogleIcon size={20} />
              <Text style={[authStyles.googleButtonText, isDark && styles.textDark]}>
                Continue with Google
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Footer Link */}
      <View style={authStyles.footerRow}>
        <Text style={[authStyles.footerText, isDark && styles.textSecondaryDark]}>
          Already have an account?{' '}
        </Text>
        <Pressable onPress={() => navigation.navigate('SignIn')} hitSlop={6}>
          <Text style={authStyles.footerLink}>Sign In</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

// ----------------------------------------------------
// 3. OTP VERIFICATION SCREEN
// ----------------------------------------------------
export function OtpScreen({ navigation, route }: any) {
  const { verifySignup } = useAuth();
  const { isDark } = useTheme();
  const [resend] = useMutation(RESEND_SIGNUP_CODE);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(30);
  const [challengeId, setChallengeId] = useState(route.params.challengeId);
  const [error, setError] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const destination = route.params.destination || 'your device';

  useEffect(() => {
    const id = setInterval(() => setRemaining((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const submit = async () => {
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await verifySignup(challengeId, code);
    } catch (e: any) {
      setShakeTrigger((prev) => prev + 1);
      setError(e?.message ?? 'Invalid verification code');
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    try {
      const { data } = await resend({ variables: { challengeId } });
      setChallengeId(data.resendSignupCode.challengeId);
      setRemaining(30);
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'Unable to resend code');
    }
  };

  return (
    <AuthLayout
      title="Verify your identity"
      subtitle={`We've sent a 6-digit secure code to\n${destination}. Enter it below to continue.`}
      onBack={() => navigation.goBack()}
      heroIcon={
        <View style={styles.heroBadgeRound}>
          <MailCheck size={30} color={colors.primary} strokeWidth={2.4} />
        </View>
      }
    >
      <View style={[authStyles.card, isDark && authStyles.cardDark]}>
        <OtpBoxes
          value={code}
          onChangeText={setCode}
          shakeTrigger={shakeTrigger}
          autoFocus
        />

        {/* Encrypted badge */}
        <View style={styles.otpEncryptedRow}>
          <Lock size={13} color="#6D7B6B" />
          <Text style={styles.otpEncryptedText}>
            End-to-end encrypted verification
          </Text>
        </View>

        {error ? <Text style={authStyles.errorText}>{error}</Text> : null}

        {/* Verify Button */}
        <PrimaryButton
          label="Verify & Proceed"
          onPress={submit}
          loading={busy}
          disabled={busy || code.length !== 6}
        />

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={[styles.resendText, isDark && styles.textSecondaryDark]}>
            Didn't receive the code?{' '}
          </Text>
          <Pressable disabled={remaining > 0} onPress={resendCode} hitSlop={6}>
            <Text style={[styles.resendLink, remaining > 0 && styles.resendDisabled]}>
              {remaining > 0 ? `Resend (${remaining}s)` : 'Resend Code'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Friend-Gated Protection Card */}
      <View style={[styles.friendGateCard, isDark && styles.friendGateCardDark]}>
        <View style={styles.friendGateIconWrap}>
          <ShieldCheck size={20} color={colors.primary} strokeWidth={2.2} />
        </View>
        <View style={styles.friendGateTextWrap}>
          <Text style={[styles.friendGateTitle, isDark && styles.textDark]}>
            Friend-Gated Protection
          </Text>
          <Text style={[styles.friendGateDesc, isDark && styles.textSecondaryDark]}>
            This extra step ensures that only trusted peers can establish secure connections within your Chatly circle.
          </Text>
        </View>
      </View>
    </AuthLayout>
  );
}

// ----------------------------------------------------
// 4. FORGOT PASSWORD SCREEN
// ----------------------------------------------------
export function ForgotPasswordScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const [request] = useMutation(REQUEST_PASSWORD_RESET);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim()) return setError('Please enter your email address');
    setBusy(true);
    setError('');
    try {
      const { data } = await request({ variables: { input: { email: email.trim() } } });
      navigation.navigate('ResetPassword', {
        email: email.trim(),
        challengeId: data.requestPasswordReset.challengeId,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Unable to send code');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your email and we'll send you a secure verification code"
      onBack={() => navigation.goBack()}
      heroIcon={
        <View style={styles.heroBadgeMedium}>
          <KeyRound size={28} color={colors.primary} strokeWidth={2.4} />
        </View>
      }
    >
      <View style={[authStyles.card, isDark && authStyles.cardDark]}>
        <Text style={[authStyles.fieldLabel, isDark && authStyles.fieldLabelDark]}>
          Email Address
        </Text>
        <View style={[authStyles.inputWrap, isDark && authStyles.inputWrapDark]}>
          <AtSign size={18} color="#6D7B6B" style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && authStyles.inputDark]}
            placeholder="name@example.com"
            placeholderTextColor="#6D7B6B"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {error ? <Text style={authStyles.errorText}>{error}</Text> : null}

        <PrimaryButton
          label="Send Code"
          onPress={submit}
          loading={busy}
          disabled={busy}
        />
      </View>
    </AuthLayout>
  );
}

// ----------------------------------------------------
// 5. RESET PASSWORD SCREEN
// ----------------------------------------------------
export function ResetPasswordScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const [reset] = useMutation(RESET_PASSWORD);
  const [resend] = useMutation(RESEND_PASSWORD_RESET_CODE);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(30);
  const [challengeId, setChallengeId] = useState(route.params.challengeId);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setRemaining((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const submit = async () => {
    if (code.length !== 6) return setError('Enter the 6-digit code');
    if (password !== confirm) return setError('Passwords do not match');
    setBusy(true);
    setError('');
    try {
      await reset({
        variables: { input: { email: route.params.email, challengeId, code, password } },
      });
      setToast('Password updated! Redirecting to Sign In...');
      setTimeout(() => {
        navigation.replace('SignIn');
      }, 1500);
    } catch (e: any) {
      setShakeTrigger((p) => p + 1);
      setError(e?.message ?? 'Unable to reset password');
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    try {
      const { data } = await resend({
        variables: { email: route.params.email, challengeId },
      });
      setChallengeId(data.resendPasswordResetCode.challengeId);
      setRemaining(30);
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'Unable to resend code');
    }
  };

  return (
    <AuthLayout
      title="Create New Password"
      subtitle="Enter the code and choose a strong new password"
      onBack={() => navigation.goBack()}
      heroIcon={
        <View style={styles.heroBadgeMedium}>
          <ShieldCheck size={28} color={colors.primary} strokeWidth={2.4} />
        </View>
      }
    >
      <View style={[authStyles.card, isDark && authStyles.cardDark]}>
        <OtpBoxes
          value={code}
          onChangeText={setCode}
          shakeTrigger={shakeTrigger}
          autoFocus
        />

        <View style={styles.resendRow}>
          <Text style={[styles.resendText, isDark && styles.textSecondaryDark]}>
            Didn't receive code?{' '}
          </Text>
          <Pressable disabled={remaining > 0} onPress={resendCode}>
            <Text style={[styles.resendLink, remaining > 0 && styles.resendDisabled]}>
              {remaining > 0 ? `Resend (${remaining}s)` : 'Resend Code'}
            </Text>
          </Pressable>
        </View>

        <Text style={[authStyles.fieldLabel, isDark && authStyles.fieldLabelDark]}>
          New Password
        </Text>
        <View style={[authStyles.inputWrap, isDark && authStyles.inputWrapDark]}>
          <KeyRound size={18} color="#6D7B6B" style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && authStyles.inputDark]}
            placeholder="••••••••••••"
            placeholderTextColor="#6D7B6B"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            {showPassword ? (
              <EyeOff size={18} color="#6D7B6B" />
            ) : (
              <Eye size={18} color="#6D7B6B" />
            )}
          </Pressable>
        </View>

        <Text style={[authStyles.fieldLabel, isDark && authStyles.fieldLabelDark]}>
          Confirm Password
        </Text>
        <View style={[authStyles.inputWrap, isDark && authStyles.inputWrapDark]}>
          <Shield size={18} color="#6D7B6B" style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && authStyles.inputDark]}
            placeholder="••••••••••••"
            placeholderTextColor="#6D7B6B"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        {error ? <Text style={authStyles.errorText}>{error}</Text> : null}
        {toast ? <Text style={styles.toastText}>{toast}</Text> : null}

        <PrimaryButton
          label="Reset Password"
          onPress={submit}
          loading={busy}
          disabled={busy || code.length !== 6 || !!toast}
        />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  // Extra breathing room around the signup CTA: it sits directly under the
  // terms checkbox and the error text, which made it read as part of the form.
  primaryCta: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  heroBadgeLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 110, 40, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroBadgeMedium: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(114, 254, 136, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeRound: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(114, 254, 136, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 110, 40, 0.05)',
  },
  labelWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forgotLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#BCCBB8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxBoxDark: {
    backgroundColor: '#24252A',
    borderColor: '#4A5568',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: '#3D4A3C',
    lineHeight: 18,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  otpRow: {
    width: '100%',
    marginVertical: spacing.md,
  },
  otpRowPressable: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hiddenOtpInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpBox: {
    width: 44,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#E9E7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  otpBoxDark: {
    backgroundColor: '#24252A',
  },
  otpBoxActive: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.primary,
  },
  otpBoxFilled: {
    backgroundColor: '#FAF9FE',
    borderColor: '#BCCBB8',
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1B1F',
  },
  otpEncryptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  otpEncryptedText: {
    fontSize: 12,
    color: '#6D7B6B',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resendText: {
    fontSize: 13,
    color: '#3D4A3C',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  resendDisabled: {
    opacity: 0.45,
  },
  friendGateCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F4F3F8',
    borderRadius: 16,
    padding: spacing.md,
    gap: 12,
    marginTop: spacing.md,
  },
  friendGateCardDark: {
    backgroundColor: '#1A1B1F',
  },
  friendGateIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(114, 254, 136, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  friendGateTextWrap: {
    flex: 1,
  },
  friendGateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1B1F',
    marginBottom: 3,
  },
  friendGateDesc: {
    fontSize: 13,
    color: '#3D4A3C',
    lineHeight: 18,
  },
  toastText: {
    color: colors.success,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
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
  textDark: {
    color: '#F1F0F5',
  },
  textSecondaryDark: {
    color: '#C2CEC0',
  },
});
