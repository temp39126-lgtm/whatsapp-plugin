'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { AUTH_ROUTES } from '@/lib/auth-routes';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-whatsapp-light/30 via-background to-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href={AUTH_ROUTES.home} className="inline-flex flex-col items-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-md">
              <MessageSquare className="h-7 w-7" />
            </div>
            <span className="text-lg font-semibold text-foreground">WhatsApp CRM</span>
          </Link>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}
        </div>

        {footer}
      </div>
    </div>
  );
}
