'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface LoginFormProps {
  onBack?: () => void;
  compact?: boolean;
}

export function LoginForm({ onBack, compact = false }: LoginFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`w-full rounded-2xl border bg-card shadow-lg ${
        compact ? 'p-6' : 'max-w-md p-8'
      }`}
    >
      <div className={`flex flex-col items-center text-center ${compact ? 'mb-6' : 'mb-8'}`}>
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white">
          <MessageSquare className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your account details to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-whatsapp focus:ring-2"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-whatsapp focus:ring-2"
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-medium text-white hover:bg-whatsapp-dark disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
      )}

      <div className="mt-6 rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Demo accounts</p>
        <p className="mt-2">Admin: admin@example.com / admin123</p>
        <p>User: user@example.com / user123</p>
      </div>
    </div>
  );
}
