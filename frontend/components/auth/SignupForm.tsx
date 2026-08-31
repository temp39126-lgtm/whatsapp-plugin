'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AUTH_ROUTES } from '@/lib/auth-routes';

export function SignupForm() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signup(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-name" className="mb-1 block text-sm font-medium">
            Full name
          </label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-whatsapp focus:ring-2"
            required
            autoComplete="name"
            minLength={2}
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-whatsapp focus:ring-2"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-whatsapp focus:ring-2"
            required
            autoComplete="new-password"
            minLength={6}
          />
          <p className="mt-1 text-xs text-muted-foreground">At least 6 characters</p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-medium text-white hover:bg-whatsapp-dark disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={AUTH_ROUTES.login} className="font-medium text-whatsapp-dark hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        New accounts are created with the User role.
      </p>
    </>
  );
}
