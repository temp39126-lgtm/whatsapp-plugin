'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminEmailSettingsPanel } from '@/components/whatsapp/admin/AdminEmailSettingsPanel';

export function AdminSettingsPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-whatsapp-light/30 via-background to-background">
      <div className="border-b bg-background/80 px-6 py-6 backdrop-blur-sm">
        <Link
          href="/whatsapp/admin"
          className="mb-3 inline-flex items-center gap-1 text-sm text-whatsapp-dark hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <p className="text-sm font-medium text-whatsapp-dark">Admin Configuration</p>
        <h1 className="mt-1 text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tenant notification and SMTP settings. Meta Cloud API is under{' '}
          <Link href="/whatsapp/settings" className="text-whatsapp-dark hover:underline">
            Settings → Meta Cloud API
          </Link>
          .
        </p>
      </div>

      <div className="space-y-8 p-6">
        <section id="notifications">
          <h2 className="mb-4 text-lg font-semibold">Notifications</h2>
          <AdminEmailSettingsPanel />
        </section>
      </div>
    </div>
  );
}
