import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation } from '@apollo/client';
import { Chrome, ChevronLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { AuthLayout, authStyles } from '../components/AuthLayout';
import { useAuth } from '../lib/AuthContext';
import {
  REQUEST_PASSWORD_RESET,
  RESET_PASSWORD,
  RESEND_PASSWORD_RESET_CODE,
  RESEND_SIGNUP_CODE,
  SIGN_UP,
} from '../graphql/auth.gql';
import { colors, radii, spacing } from '../lib/theme';

type Props = { navigation: any };
const Input = (props: any) => <TextInput {...props} style={[authStyles.field, props.style]} placeholderTextColor={colors.textMuted} />;
const Back = ({ onPress }: { onPress: () => void }) => <Pressable onPress={onPress} style={styles.back}><ChevronLeft size={22} color={colors.textPrimary} /></Pressable>;

function PasswordField({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  const [visible, setVisible] = useState(false);
  return <View style={styles.password}>
    <Input placeholder={placeholder} secureTextEntry={!visible} value={value} onChangeText={onChangeText} />
    <Pressable onPress={() => setVisible((current) => !current)} style={styles.eye} hitSlop={8}>
      {visible ? <EyeOff size={19} color={colors.textMuted} /> : <Eye size={19} color={colors.textMuted} />}
    </Pressable>
  </View>;
}

function OtpBoxes({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');
  return <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
    <TextInput ref={inputRef} value={value} onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} style={styles.hiddenOtpInput} autoComplete="one-time-code" />
    {digits.map((digit, index) => <View key={index} style={[styles.otpBox, value.length === index && styles.otpBoxActive]}><Text style={styles.otpDigit}>{digit.trim()}</Text></View>)}
  </Pressable>;
}

function Countdown({ onResend, remaining }: { onResend: () => void; remaining: number }) {
  return <Pressable disabled={remaining > 0} onPress={onResend}>
    <Text style={[styles.resend, remaining > 0 && styles.disabled]}>{remaining > 0 ? `Resend in 00:${String(remaining).padStart(2, '0')}` : 'Resend OTP'}</Text>
  </Pressable>;
}

export function SignInScreen({ navigation }: Props) {
  const { loginWithPassword, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [googleBusy, setGoogleBusy] = useState(false); const [error, setError] = useState('');
  const submit = async () => { setBusy(true); setError(''); try { await loginWithPassword(email, password); } catch (e: any) { setError(e?.message ?? 'Unable to sign in'); } finally { setBusy(false); } };
  const google = async () => { setGoogleBusy(true); try { await loginWithGoogle(); } catch (e: any) { setError(e?.message ?? 'Unable to sign in with Google'); } finally { setGoogleBusy(false); } };
  return <AuthLayout title="Welcome back" subtitle="Sign in to continue chatting with your friends">
    <Input placeholder="Email or phone" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
    <PasswordField placeholder="Password" value={password} onChangeText={setPassword} />
    {error ? <Text style={authStyles.error}>{error}</Text> : null}
    <Pressable onPress={() => navigation.navigate('ForgotPassword')}><Text style={styles.forgot}>Forgot Password?</Text></Pressable>
    <Pressable style={authStyles.button} onPress={submit} disabled={busy || googleBusy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={authStyles.buttonText}>Sign In</Text>}</Pressable>
    <Text style={styles.or}>or continue with</Text>
    <Pressable style={styles.google} onPress={google} disabled={busy || googleBusy}>{googleBusy ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.googleText}>Continue with Google</Text>}</Pressable>
    <Pressable style={authStyles.row} onPress={() => navigation.navigate('SignUp')}><Text style={styles.muted}>Don't have an account? </Text><Text style={authStyles.secondary}>Sign Up</Text></Pressable>
  </AuthLayout>;
}

export function SignUpScreen({ navigation }: Props) {
  const { loginWithGoogle } = useAuth(); const [signUp] = useMutation(SIGN_UP); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [agreed, setAgreed] = useState(false); const [busy, setBusy] = useState(false); const [googleBusy, setGoogleBusy] = useState(false); const [error, setError] = useState('');
  const strength = password.length >= 12 ? 'Strong' : password.length >= 8 ? 'Medium' : 'Weak';
  const submit = async () => { if (password !== confirm) return setError('Passwords do not match'); if (!agreed) return setError('Please accept the Terms & Privacy Policy'); setBusy(true); setError(''); try { const { data } = await signUp({ variables: { input: { name: name.trim(), email: email.trim(), password } } }); navigation.navigate('Otp', { challengeId: data.signUp.challengeId, destination: data.signUp.destination, mode: 'signup' }); } catch (e: any) { setError(e?.message ?? 'Unable to create account'); } finally { setBusy(false); } };
  return <AuthLayout title="Create your account" subtitle="Join Chatly and start connecting with friends">
    <Input placeholder="Full name" value={name} onChangeText={setName} />
    <Input placeholder="Email or phone" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
    <PasswordField placeholder="Password" value={password} onChangeText={setPassword} />
    <View style={styles.strength}><View style={[styles.strengthBar, { width: strength === 'Strong' ? '100%' : strength === 'Medium' ? '62%' : '30%', backgroundColor: strength === 'Strong' ? colors.success : strength === 'Medium' ? '#FFCC00' : colors.danger }]} /><Text style={styles.muted}>{strength}</Text></View>
    <PasswordField placeholder="Confirm password" value={confirm} onChangeText={setConfirm} />
    <Pressable style={styles.checkRow} onPress={() => setAgreed(!agreed)}><View style={[styles.checkbox, agreed && styles.checkboxOn]}>{agreed && <Text style={styles.check}>✓</Text>}</View><Text style={styles.muted}>I agree to Terms & Privacy Policy</Text></Pressable>
    {error ? <Text style={authStyles.error}>{error}</Text> : null}    <Pressable style={authStyles.button} onPress={submit} disabled={busy || googleBusy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={authStyles.buttonText}>Sign Up</Text>}</Pressable>
    <Text style={styles.or}>or continue with</Text>
    <Pressable style={styles.google} onPress={async () => { setGoogleBusy(true); try { await loginWithGoogle(); } catch (e: any) { setError(e?.message ?? 'Unable to sign in with Google'); } finally { setGoogleBusy(false); } }} disabled={busy || googleBusy}>{googleBusy ? <ActivityIndicator color={colors.primary} /> : <View style={styles.googleContent}><Chrome size={18} color={colors.primary} /><Text style={styles.googleText}>Continue with Google</Text></View>}</Pressable>
    <Pressable style={authStyles.row} onPress={() => navigation.navigate('SignIn')}>
<Text style={styles.muted}>Already have an account? </Text><Text style={authStyles.secondary}>Sign In</Text></Pressable>
  </AuthLayout>;
}

export function OtpScreen({ navigation, route }: any) {
  const { verifySignup } = useAuth(); const [resend] = useMutation(RESEND_SIGNUP_CODE); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [remaining, setRemaining] = useState(30); const [challengeId, setChallengeId] = useState(route.params.challengeId); const [error, setError] = useState('');
  useEffect(() => { const id = setInterval(() => setRemaining((v) => Math.max(0, v - 1)), 1000); return () => clearInterval(id); }, []);
  const submit = async () => { if (code.length !== 6) return; setBusy(true); setError(''); try { await verifySignup(challengeId, code); } catch (e: any) { setError(e?.message ?? 'Invalid code'); } finally { setBusy(false); } };
  const resendCode = async () => { try { const { data } = await resend({ variables: { challengeId } }); setChallengeId(data.resendSignupCode.challengeId); setRemaining(30); setError(''); } catch (e: any) { setError(e?.message ?? 'Unable to resend code'); } };
  return <AuthLayout title="Verify your email" subtitle={`We've sent a 6-digit code to ${route.params.destination}`}><View style={styles.shield}><ShieldCheck size={22} color={colors.primary} /></View><OtpBoxes value={code} onChangeText={setCode} />{error ? <Text style={authStyles.error}>{error}</Text> : null}<Countdown remaining={remaining} onResend={resendCode} /><Pressable style={[authStyles.button, code.length !== 6 && styles.disabledButton]} onPress={submit} disabled={busy || code.length !== 6}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={authStyles.buttonText}>Verify</Text>}</Pressable></AuthLayout>;
}

export function ForgotPasswordScreen({ navigation }: Props) {
  const [request] = useMutation(REQUEST_PASSWORD_RESET); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async () => { setBusy(true); setError(''); try { const { data } = await request({ variables: { input: { email: email.trim() } } }); navigation.navigate('ResetPassword', { email: email.trim(), challengeId: data.requestPasswordReset.challengeId }); } catch (e: any) { setError(e?.message ?? 'Unable to send code'); } finally { setBusy(false); } };
  return <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a verification code"><Back onPress={() => navigation.goBack()} /><Input placeholder="Email or phone" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />{error ? <Text style={authStyles.error}>{error}</Text> : null}<Pressable style={authStyles.button} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={authStyles.buttonText}>Send Code</Text>}</Pressable></AuthLayout>;
}

export function ResetPasswordScreen({ navigation, route }: any) {
  const [reset] = useMutation(RESET_PASSWORD); const [resend] = useMutation(RESEND_PASSWORD_RESET_CODE); const [code, setCode] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [busy, setBusy] = useState(false); const [remaining, setRemaining] = useState(30); const [challengeId, setChallengeId] = useState(route.params.challengeId); const [error, setError] = useState('');
  useEffect(() => { const id = setInterval(() => setRemaining((v) => Math.max(0, v - 1)), 1000); return () => clearInterval(id); }, []);
  const submit = async () => { if (code.length !== 6) return setError('Enter the 6-digit code'); if (password !== confirm) return setError('Passwords do not match'); setBusy(true); setError(''); try { await reset({ variables: { input: { email: route.params.email, challengeId, code, password } } }); navigation.replace('SignIn'); } catch (e: any) { setError(e?.message ?? 'Unable to reset password'); } finally { setBusy(false); } };
  const resendCode = async () => { try { const { data } = await resend({ variables: { email: route.params.email, challengeId } }); setChallengeId(data.resendPasswordResetCode.challengeId); setRemaining(30); } catch (e: any) { setError(e?.message ?? 'Unable to resend code'); } };
  return <AuthLayout title="Create new password" subtitle="Enter the code and choose a strong new password"><OtpBoxes value={code} onChangeText={setCode} /><Countdown remaining={remaining} onResend={resendCode} /><PasswordField placeholder="New password" value={password} onChangeText={setPassword} /><PasswordField placeholder="Confirm password" value={confirm} onChangeText={setConfirm} />{error ? <Text style={authStyles.error}>{error}</Text> : null}<Pressable style={[authStyles.button, code.length !== 6 && styles.disabledButton]} onPress={submit} disabled={busy || code.length !== 6}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={authStyles.buttonText}>Reset Password</Text>}</Pressable></AuthLayout>;
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  password: { width: '100%', position: 'relative' }, eye: { position: 'absolute', right: 15, top: 25 },
  forgot: { color: colors.primary, fontSize: 13, fontWeight: '700', alignSelf: 'flex-end', marginTop: spacing.sm },
  or: { color: colors.textMuted, marginVertical: spacing.lg }, google: { width: '100%', minHeight: 50, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, googleContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, googleText: { color: colors.textPrimary, fontWeight: '700' },
  muted: { color: colors.textSecondary, fontSize: 13 }, strength: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 }, strengthBar: { height: 4, flex: 1, borderRadius: 2 },
  checkRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md }, checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary }, check: { color: '#fff', fontWeight: '800' },
  shield: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.md },
  otpRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.lg }, hiddenOtpInput: { position: 'absolute', width: 1, height: 1, opacity: 0 }, otpBox: { width: 42, height: 50, borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center' }, otpBoxActive: { borderColor: colors.primary, borderWidth: 2 }, otpDigit: { color: colors.textPrimary, fontSize: 21, fontWeight: '700' },
  resend: { color: colors.primary, fontWeight: '700', marginTop: spacing.sm }, disabled: { opacity: 0.45 }, disabledButton: { opacity: 0.5 },
});
