'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthField } from '@/components/auth/AuthField';
import { AuthOtpStep } from '@/components/auth/AuthOtpStep';
import { RoleSelector } from '@/components/auth/RoleSelector';
import { useAuth } from '@/components/AuthProvider';
import { AUTH_ROUTES } from '@/lib/auth-routes';
import { isOtpChallengeResponse } from '@/lib/auth-otp';
import type { AuthOtpChallengeResponse } from '@/lib/auth-otp';

export function SignupForm() {
  const { signup, completeLogin } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState<AuthOtpChallengeResponse | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await signup(name, email, password);
      if (isOtpChallengeResponse(result)) {
        setOtpChallenge(result);
        return;
      }

      if (result.user) {
        completeLogin(result.user as Parameters<typeof completeLogin>[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
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
        purpose="signup"
        onBack={() => setOtpChallenge(null)}
        onVerified={(result) => {
          if (!result.user) {
            setError('Verification succeeded but sign up could not be completed.');
            return;
          }
          completeLogin(result.user as Parameters<typeof completeLogin>[0]);
        }}
      />
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <RoleSelector value="USER" onChange={() => undefined} disabledRoles={['ADMIN']} />

        <AuthField
          id="signup-name"
          label="Full name"
          type="text"
          value={name}
          onChange={setName}
          placeholder="Enter your name"
          autoComplete="name"
          required
          minLength={2}
        />

        <AuthField
          id="signup-email"
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <AuthField
          id="signup-password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          autoComplete="new-password"
          required
          minLength={6}
        />

        <p className="text-xs text-muted-foreground">
          Admin accounts are managed separately. Sign up creates a User workspace. When SMTP is
          configured, we email a verification code before activating your account.
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-whatsapp px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-whatsapp-dark disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Create User account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={AUTH_ROUTES.login} className="font-medium text-whatsapp-dark hover:underline">
          Sign in
        </Link>
        {' · '}
        <Link href={AUTH_ROUTES.forgotPassword} className="font-medium text-whatsapp-dark hover:underline">
          Forgot password?
        </Link>
      </p>
    </>
  );
}
