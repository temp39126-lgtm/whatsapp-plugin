'use client';

import Link from 'next/link';
import { ArrowRight, Inbox, MessageSquare, UserPlus, Users } from 'lucide-react';
import { AUTH_ROUTES } from '@/lib/auth-routes';

export function WelcomeScreen() {
  return (
    <div className="w-full max-w-2xl text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg">
        <MessageSquare className="h-10 w-10" />
      </div>

      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        WhatsApp CRM
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
        Manage customer conversations, calls, and your team from one place.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
          <Inbox className="h-4 w-4 text-whatsapp" />
          Shared inbox
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
          <Users className="h-4 w-4 text-whatsapp" />
          Admin & user roles
        </span>
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={AUTH_ROUTES.login}
          className="inline-flex items-center gap-2 rounded-xl bg-whatsapp px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-whatsapp-dark"
        >
          Sign in
          <ArrowRight className="h-5 w-5" />
        </Link>
        <Link
          href={AUTH_ROUTES.signup}
          className="inline-flex items-center gap-2 rounded-xl border border-whatsapp/30 bg-card px-8 py-3.5 text-base font-semibold text-whatsapp-dark transition hover:bg-whatsapp-light/40"
        >
          <UserPlus className="h-5 w-5" />
          Sign up
        </Link>
      </div>
    </div>
  );
}
