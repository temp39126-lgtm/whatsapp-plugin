'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthField } from '@/components/auth/AuthField';
import { authApi } from '@/lib/api';
import { AUTH_ROUTES } from '@/lib/auth-routes';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const result = await authApi.post<{
        message: string;
        emailSent?: boolean;
      }>('/forgot-password', {
        email,
      });

      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset instructions');
    } finally {
      setSubmitting(false);
    }
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
          Enter the email for your account. We&apos;ll send a password reset link when SMTP is
          configured in admin settings.
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {message && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-whatsapp px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-whatsapp-dark disabled:opacity-60"
        >
          {submitting ? 'Sending...' : 'Send reset link'}
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
