'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthField } from '@/components/auth/AuthField';
import { AuthOtpStep } from '@/components/auth/AuthOtpStep';
import { authApi } from '@/lib/api';
import { AUTH_ROUTES } from '@/lib/auth-routes';
import { isOtpChallengeResponse } from '@/lib/auth-otp';
import type { AuthOtpChallengeResponse } from '@/lib/auth-otp';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState<AuthOtpChallengeResponse | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setResetUrl('');
    setSubmitting(true);

    try {
      const result = await authApi.post<{
        message: string;
        resetUrl?: string;
        requiresOtp?: boolean;
        challengeId?: string;
        maskedEmail?: string;
        devOtpCode?: string;
      }>('/forgot-password', {
        email,
      });

      if (isOtpChallengeResponse(result)) {
        setOtpChallenge(result);
        return;
      }

      setMessage(result.message);
      if (result.resetUrl) {
        setResetUrl(result.resetUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset instructions');
    } finally {
      setSubmitting(false);
    }
  }

  if (otpChallenge) {
    return (
      <AuthOtpStep
        challengeId={otpChallenge.challengeId}
        maskedEmail={otpChallenge.maskedEmail}
        message={otpChallenge.message}
        devOtpCode={otpChallenge.devOtpCode}
        purpose="password_reset"
        onBack={() => setOtpChallenge(null)}
        onVerified={(result) => {
          if (!result.resetToken) {
            setError('Verification succeeded but password reset could not continue.');
            return;
          }
          router.push(
            `${AUTH_ROUTES.resetPassword}?token=${encodeURIComponent(result.resetToken)}`
          );
        }}
      />
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          id="forgot-email"
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <p className="text-sm text-muted-foreground">
          Enter the email for your account. When SMTP is configured, we&apos;ll email a 6-digit
          verification code. Otherwise we&apos;ll provide a one-time reset link here.
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {message && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>
        )}

        {resetUrl && (
          <div className="rounded-lg border border-dashed border-whatsapp/40 bg-whatsapp-light/20 p-3 text-sm">
            <p className="font-medium text-whatsapp-dark">Reset link</p>
            <p className="mt-1 break-all text-muted-foreground">
              Email could not be sent (check SMTP in Settings → Notifications). Use this one-time
              link:
            </p>
            <a href={resetUrl} className="mt-2 block break-all text-whatsapp-dark underline">
              {resetUrl}
            </a>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-whatsapp px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-whatsapp-dark disabled:opacity-60"
        >
          {submitting ? 'Sending...' : 'Continue'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link href={AUTH_ROUTES.login} className="font-medium text-whatsapp-dark hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
