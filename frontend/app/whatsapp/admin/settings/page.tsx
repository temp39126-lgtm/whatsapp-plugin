'use client';

import { Suspense } from 'react';
import { DashboardRoleGuard } from '@/components/whatsapp/dashboard/DashboardRoleGuard';
import { AdminSettingsPage } from '@/components/whatsapp/admin/AdminSettingsPage';

function AdminSettingsFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
    </div>
  );
}

export default function AdminSettingsRoutePage() {
  return (
    <DashboardRoleGuard allowedRole="ADMIN">
      <Suspense fallback={<AdminSettingsFallback />}>
        <AdminSettingsPage />
      </Suspense>
    </DashboardRoleGuard>
  );
}
