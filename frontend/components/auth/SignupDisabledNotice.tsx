'use client';

import Link from 'next/link';
import { AUTH_ROUTES } from '@/lib/auth-routes';

export function SignupDisabledNotice() {
  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        New accounts are created by your workspace administrator. Contact them if you need access.
      </p>
      <Link
        href={AUTH_ROUTES.login}
        className="inline-flex w-full items-center justify-center rounded-xl bg-whatsapp px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-whatsapp-dark"
      >
        Back to sign in
      </Link>
    </div>
  );
}
