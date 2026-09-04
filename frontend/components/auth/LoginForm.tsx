'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthField } from '@/components/auth/AuthField';
import { AuthOtpStep } from '@/components/auth/AuthOtpStep';
import { RoleSelector, type AuthRoleChoice } from '@/components/auth/RoleSelector';
import { useAuth } from '@/components/AuthProvider';
import { AUTH_ROUTES } from '@/lib/auth-routes';
import { getDemoCredentials, isDemoAuthEnabled } from '@/lib/demo-credentials';
import { isOtpChallengeResponse, loadOtpChallenge, saveOtpChallenge, clearOtpChallenge } from '@/lib/auth-otp';
import type { AuthOtpChallengeResponse } from '@/lib/auth-otp';

export function LoginForm() {
  const demoCredentials = getDemoCredentials();
  const { login, completeLogin } = useAuth();
  const [selectedRole, setSelectedRole] = useState<AuthRoleChoice>('USER');
  const [email, setEmail] = useState(demoCredentials.USER.email);
  const [password, setPassword] = useState(demoCredentials.USER.password);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState<AuthOtpChallengeResponse | null>(null);

  useEffect(() => {
    const saved = loadOtpChallenge('login');
    if (saved) {
      setOtpChallenge(saved);
    }
  }, []);

  function handleRoleChange(role: AuthRoleChoice) {
    setSelectedRole(role);
    if (isDemoAuthEnabled()) {
      setEmail(demoCredentials[role].email);
      setPassword(demoCredentials[role].password);
    }
    setError('');
    setOtpChallenge(null);
    clearOtpChallenge();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await login(email, password, { keepSignedIn });
      if (isOtpChallengeResponse(result)) {
        setOtpChallenge(result);
        saveOtpChallenge(result, 'login');
        return;
      }

      if (result.user.role !== selectedRole) {
        setError(
          `These credentials belong to a ${result.user.role === 'ADMIN' ? 'Admin' : 'User'} account. Switch workspace or use different credentials.`
        );
        return;
      }
      completeLogin(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
        purpose="login"
        onBack={() => {
          setOtpChallenge(null);
          clearOtpChallenge();
        }}
        onChallengeIdChange={(nextChallengeId) =>
          setOtpChallenge((current) => {
            if (!current) return current;
            const next = { ...current, challengeId: nextChallengeId };
            saveOtpChallenge(next, 'login');
            return next;
          })
        }
        onVerified={(result) => {
          if (!result.user) {
            setError('Verification succeeded but login could not be completed.');
            return;
          }
          const authUser = result.user as Parameters<typeof completeLogin>[0];
          if (authUser.role !== selectedRole) {
            setError(
              `These credentials belong to a ${authUser.role === 'ADMIN' ? 'Admin' : 'User'} account. Switch workspace or use different credentials.`
            );
            return;
          }
          completeLogin(authUser);
          clearOtpChallenge();
        }}
      />
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <RoleSelector value={selectedRole} onChange={handleRoleChange} />

        <AuthField
          id="login-email"
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder={isDemoAuthEnabled() ? demoCredentials[selectedRole].email : 'you@example.com'}
          autoComplete="email"
          required
        />

        <AuthField
          id="login-password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        <div className="flex justify-end">
          <Link
            href={AUTH_ROUTES.forgotPassword}
            className="text-sm font-medium text-whatsapp-dark hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={keepSignedIn}
            onChange={(e) => setKeepSignedIn(e.target.checked)}
            className="h-4 w-4 rounded border-input text-whatsapp focus:ring-whatsapp"
          />
          Keep me signed in
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-whatsapp px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-whatsapp-dark disabled:opacity-60"
        >
          {submitting
            ? 'Signing in...'
            : `Sign in as ${demoCredentials[selectedRole].label}`}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href={AUTH_ROUTES.signup} className="font-medium text-whatsapp-dark hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}
