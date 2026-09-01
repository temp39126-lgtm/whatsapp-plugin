'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Bell, Cloud } from 'lucide-react';
import { QuickAction } from '@/components/whatsapp/dashboard/QuickAction';
import { AdminMetaCloudPanel } from '@/components/whatsapp/admin/AdminMetaCloudPanel';
import { AdminNotificationSettingsPanel } from '@/components/whatsapp/admin/AdminNotificationSettingsPanel';

type AdminSettingsTab = 'meta' | 'notifications';

export function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab =
    tabParam === 'meta' || tabParam === 'notifications' ? tabParam : null;

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
          Manage Meta Cloud API credentials and tenant notification delivery.
        </p>
      </div>

      <div className="space-y-8 p-6">
        <section>
          <h2 className="mb-1 text-lg font-semibold">Configuration</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Tenant-wide Meta Cloud API and email notification settings
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickAction
              href="/whatsapp/admin/settings?tab=meta"
              label="Meta Cloud API"
              description="WhatsApp credentials and webhook"
              icon={Cloud}
            />
            <QuickAction
              href="/whatsapp/admin/settings?tab=notifications"
              label="Notifications"
              description="SMTP and assignment emails"
              icon={Bell}
            />
          </div>
        </section>

        {activeTab === 'notifications' && <AdminNotificationSettingsPanel />}
        {activeTab === 'meta' && <AdminMetaCloudPanel />}
      </div>
    </div>
  );
}
