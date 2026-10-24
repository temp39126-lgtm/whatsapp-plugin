'use client';

import { DashboardRoleGuard } from '@/components/whatsapp/dashboard/DashboardRoleGuard';
import { AdminSettingsPage } from '@/components/whatsapp/admin/AdminSettingsPage';

export default function AdminSettingsRoutePage() {
  return (
    <DashboardRoleGuard requiredPermission="manage_settings">
      <AdminSettingsPage />
    </DashboardRoleGuard>
  );
}
