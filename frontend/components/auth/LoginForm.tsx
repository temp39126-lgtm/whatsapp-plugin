'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthField } from '@/components/auth/AuthField';
import { RoleSelector, type AuthRoleChoice } from '@/components/auth/RoleSelector';
import { useAuth } from '@/components/AuthProvider';
import { AUTH_ROUTES } from '@/lib/auth-routes';
import { DEMO_CREDENTIALS } from '@/lib/demo-credentials';

export function LoginForm() {
  const { login, completeLogin } = useAuth();
  const [selectedRole, setSelectedRole] = useState<AuthRoleChoice>('USER');
  const [email, setEmail] = useState(DEMO_CREDENTIALS.USER.email);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.USER.password);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleRoleChange(role: AuthRoleChoice) {
    setSelectedRole(role);
    setEmail(DEMO_CREDENTIALS[role].email);
    setPassword(DEMO_CREDENTIALS[role].password);
    setError('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await login(email, password, { keepSignedIn });
      if (result.user.role !== selectedRole) {
        setError(
          `These credentials belong to a ${result.user.role === 'ADMIN' ? 'Admin' : 'User'} account. Switch workspace or use different credentials.`
        );
        return;
      }
      completeLogin(result.token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
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
          placeholder={DEMO_CREDENTIALS[selectedRole].email}
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
          {submitting ? 'Signing in...' : `Sign in as ${DEMO_CREDENTIALS[selectedRole].label}`}
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
