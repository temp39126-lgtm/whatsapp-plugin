'use client';

import { DashboardRoleGuard } from '@/components/whatsapp/dashboard/DashboardRoleGuard';
import { UserDashboard } from '@/components/whatsapp/dashboard/UserDashboard';

export default function UserDashboardPage() {
  return (
    <DashboardRoleGuard allowedRole="USER">
      <UserDashboard />
    </DashboardRoleGuard>
  );
}
