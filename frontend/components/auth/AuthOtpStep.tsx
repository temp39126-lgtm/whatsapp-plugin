'use client';

import { useState } from 'react';
import { authApi } from '@/lib/api';

type OtpPurpose = 'login' | 'signup' | 'password_reset';

interface AuthOtpStepProps {
  challengeId: string;
  maskedEmail: string;
  message?: string;
  purpose: OtpPurpose;
  onVerified: (result: {
    token?: string;
    user?: unknown;
    resetToken?: string;
    message?: string;
  }) => void;
  onBack?: () => void;
}

export function AuthOtpStep({
  challengeId,
  maskedEmail,
  message,
  purpose,
  onVerified,
  onBack,
}: AuthOtpStepProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(message ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await authApi.post<{
        token?: string;
        user?: unknown;
        resetToken?: string;
        message?: string;
      }>('/verify-otp', {
        challengeId,
        code: code.trim(),
      });
      onVerified(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError('');
    setResending(true);

    try {
      const result = await authApi.post<{ message: string }>('/resend-otp', {
        challengeId,
      });
      setInfo(result.message);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend code');
    } finally {
      setResending(false);
    }
  }

  const title =
    purpose === 'login'
      ? 'Verify your sign in'
      : purpose === 'signup'
        ? 'Verify your email'
        : 'Verify password reset';

  return (
    <form onSubmit={handleVerify} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the 6-digit code sent to <span className="font-medium">{maskedEmail}</span>.
        </p>
      </div>

      <div>
        <label htmlFor="auth-otp-code" className="mb-1.5 block text-sm font-semibold text-foreground">
          Verification code
        </label>
        <input
          id="auth-otp-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          required
          minLength={6}
          maxLength={6}
          className="w-full rounded-xl border border-input bg-muted/40 px-4 py-2.5 text-center text-lg tracking-[0.4em] outline-none transition focus:border-whatsapp focus:bg-background focus:ring-2 focus:ring-whatsapp/20"
        />
      </div>

      {info && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{info}</p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || code.length !== 6}
        className="w-full rounded-xl bg-whatsapp px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-whatsapp-dark disabled:opacity-60"
      >
        {submitting ? 'Verifying...' : 'Verify code'}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="font-medium text-whatsapp-dark hover:underline disabled:opacity-60"
        >
          {resending ? 'Sending...' : 'Resend code'}
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            Back
          </button>
        )}
      </div>
    </form>
  );
}
