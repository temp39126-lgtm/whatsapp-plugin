'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthField } from '@/components/auth/AuthField';
import { authApi } from '@/lib/api';
import { AUTH_ROUTES } from '@/lib/auth-routes';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Missing reset token. Request a new password reset link.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const result = await authApi.post<{ message: string }>('/reset-password', {
        token,
        password,
      });
      setMessage(result.message);
      window.setTimeout(() => router.replace(AUTH_ROUTES.login), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-600">This reset link is invalid or incomplete.</p>
        <Link href={AUTH_ROUTES.forgotPassword} className="text-sm font-medium text-whatsapp-dark hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          id="reset-password"
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Enter a new password"
          autoComplete="new-password"
          required
          minLength={6}
        />

        <AuthField
          id="reset-password-confirm"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Confirm your new password"
          autoComplete="new-password"
          required
          minLength={6}
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {message && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>
        )}

        <button
          type="submit"
          disabled={submitting || Boolean(message)}
          className="w-full rounded-xl bg-whatsapp px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-whatsapp-dark disabled:opacity-60"
        >
          {submitting ? 'Updating...' : 'Update password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href={AUTH_ROUTES.login} className="font-medium text-whatsapp-dark hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
