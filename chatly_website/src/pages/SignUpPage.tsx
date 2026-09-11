import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { ErrorMessage } from '../components/ErrorMessage';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { RESEND_SIGNUP_CODE, SIGN_UP, VERIFY_SIGNUP } from '../graphql/operations';
import { readableError } from '../lib/format';
import type { AuthPayload, VerificationChallenge } from '../lib/types';

export function SignUpPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [runSignUp, { loading: submitting }] = useMutation<{ signUp: VerificationChallenge }>(
    SIGN_UP,
  );
  const [runVerify, { loading: verifying }] = useMutation<{ verifySignup: AuthPayload }>(
    VERIFY_SIGNUP,
  );
  const [runResend, { loading: resending }] = useMutation<{
    resendSignupCode: VerificationChallenge;
  }>(RESEND_SIGNUP_CODE);

  async function handleCreateAccount(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      const { data } = await runSignUp({
        variables: { input: { name: name.trim(), email: email.trim(), password } },
      });

      const result = data?.signUp;
      if (!result?.challengeId) {
        throw new Error('The server did not start a verification challenge');
      }

      setChallenge(result);
      setStep('verify');
      setNotice(`We sent a 6-digit code to ${result.destination ?? email.trim()}.`);
    } catch (caught) {
      setError(readableError(caught));
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      if (!challenge) throw new Error('The verification challenge expired, please start again');

      const { data } = await runVerify({
        variables: { input: { challengeId: challenge.challengeId, code: code.trim() } },
      });

      const payload = data?.verifySignup;
      if (!payload?.accessToken || !payload.refreshToken) {
        throw new Error('The server did not return a session');
      }

      await signIn(payload);
      navigate('/app', { replace: true });
    } catch (caught) {
      setError(readableError(caught));
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    try {
      if (!challenge) return;
      const { data } = await runResend({
        variables: { challengeId: challenge.challengeId },
      });
      if (data?.resendSignupCode) setChallenge(data.resendSignupCode);
      setNotice('A fresh code is on its way.');
    } catch (caught) {
      setError(readableError(caught));
    }
  }

  if (step === 'verify') {
    return (
      <AuthLayout
        title="Verify your email"
        subtitle="Enter the 6-digit code we emailed you"
        headerExtra={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand dark:bg-brand/20 dark:text-brand-bright">
            <ShieldCheck size={13} /> Secure sign-up
          </span>
        }
        footer={
          <button
            type="button"
            onClick={() => {
              setStep('details');
              setCode('');
              setError(null);
              setNotice(null);
            }}
            className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"
          >
            <ArrowLeft size={14} /> Use a different email
          </button>
        }
      >
        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <ErrorMessage message={error} />

          {notice && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5 text-sm text-brand dark:border-brand/30 dark:bg-brand/10 dark:text-brand-bright">
              {notice}
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Verification code
            </span>
            <div className="relative">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="field pl-9 text-center text-lg font-semibold tracking-[0.4em]"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className="btn-primary mt-1"
          >
            {verifying ? <Spinner size={16} /> : <ShieldCheck size={16} />}
            {verifying ? 'Verifying…' : 'Verify and continue'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="btn-ghost"
          >
            {resending ? <Spinner size={16} /> : null}
            Resend code
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Chatly verifies your email before your first sign-in"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleCreateAccount} className="flex flex-col gap-4">
        <ErrorMessage message={error} />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Name</span>
          <div className="relative">
            <User
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ada Lovelace"
              className="field pl-9"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Email</span>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="field pl-9"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Password</span>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="field pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition hover:bg-black/5 dark:hover:bg-white/10"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <button type="submit" disabled={submitting} className="btn-primary mt-1">
          {submitting ? <Spinner size={16} /> : null}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
