'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Bell, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminMetaCloudPanel } from '@/components/whatsapp/admin/AdminMetaCloudPanel';
import { AdminNotificationSettingsPanel } from '@/components/whatsapp/admin/AdminNotificationSettingsPanel';

type AdminSettingsTab = 'meta' | 'notifications';

const tabs: Array<{ id: AdminSettingsTab; label: string; icon: typeof Cloud }> = [
  { id: 'meta', label: 'Meta Cloud API', icon: Cloud },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as AdminSettingsTab) || 'meta';

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

      <div className="space-y-6 p-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/whatsapp/admin/settings?tab=${tab.id}`}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-whatsapp bg-whatsapp text-white'
                    : 'bg-card text-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>

        {activeTab === 'notifications' ? (
          <AdminNotificationSettingsPanel />
        ) : (
          <AdminMetaCloudPanel />
        )}
      </div>
    </div>
  );
}
