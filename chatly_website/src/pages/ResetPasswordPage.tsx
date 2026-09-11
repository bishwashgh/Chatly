import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { ArrowLeft, KeyRound, Lock, Mail, Send } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { ErrorMessage } from '../components/ErrorMessage';
import { Spinner } from '../components/Spinner';
import {
  REQUEST_PASSWORD_RESET,
  RESEND_PASSWORD_RESET_CODE,
  RESET_PASSWORD,
} from '../graphql/operations';
import { readableError } from '../lib/format';
import type { VerificationChallenge } from '../lib/types';

type Step = 'request' | 'verify';

export function ResetPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [runRequest, { loading: requesting }] = useMutation<{
    requestPasswordReset: VerificationChallenge;
  }>(REQUEST_PASSWORD_RESET);
  const [runResend, { loading: resending }] = useMutation(RESEND_PASSWORD_RESET_CODE);
  const [runReset, { loading: resetting }] = useMutation(RESET_PASSWORD);

  async function handleRequest(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      const { data } = await runRequest({ variables: { input: { email: email.trim() } } });
      const result = data?.requestPasswordReset;
      if (!result?.challengeId) {
        throw new Error('The server did not start a reset challenge');
      }
      setChallenge(result);
      setStep('verify');
      setNotice(`We sent a 6-digit code to ${result.destination ?? email.trim()}.`);
    } catch (caught) {
      setError(readableError(caught));
    }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      if (!challenge) throw new Error('The reset challenge expired, please start again');

      await runReset({
        variables: {
          input: {
            email: email.trim(),
            challengeId: challenge.challengeId,
            code: code.trim(),
            password,
          },
        },
      });

      navigate('/login', { replace: true });
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
        variables: { email: email.trim(), challengeId: challenge.challengeId },
      });
      if (data?.resendPasswordResetCode) setChallenge(data.resendPasswordResetCode);
      setNotice('A fresh code is on its way.');
    } catch (caught) {
      setError(readableError(caught));
    }
  }

  if (step === 'verify') {
    return (
      <AuthLayout
        title="Choose a new password"
        subtitle="Enter the code from your email and your new password"
        footer={
          <button
            type="button"
            onClick={() => {
              setStep('request');
              setCode('');
              setPassword('');
              setError(null);
              setNotice(null);
            }}
            className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"
          >
            <ArrowLeft size={14} /> Start over
          </button>
        }
      >
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <ErrorMessage message={error} />

          {notice && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5 text-sm text-brand dark:border-brand/30 dark:bg-brand/10 dark:text-brand-bright">
              {notice}
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Code</span>
            <div className="relative">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="field pl-9 text-center text-lg font-semibold tracking-[0.4em]"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              New password
            </span>
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="field pl-9"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={resetting || code.length !== 6}
            className="btn-primary mt-1"
          >
            {resetting ? <Spinner size={16} /> : null}
            {resetting ? 'Updating…' : 'Update password'}
          </button>

          <button type="button" onClick={handleResend} disabled={resending} className="btn-ghost">
            {resending ? <Spinner size={16} /> : null}
            Resend code
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a 6-digit verification code"
      footer={
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleRequest} className="flex flex-col gap-4">
        <ErrorMessage message={error} />

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

        <button type="submit" disabled={requesting} className="btn-primary mt-1">
          {requesting ? <Spinner size={16} /> : <Send size={16} />}
          {requesting ? 'Sending…' : 'Send reset code'}
        </button>
      </form>
    </AuthLayout>
  );
}
