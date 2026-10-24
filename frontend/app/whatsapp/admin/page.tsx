'use client';

import { AdminDashboard } from '@/components/whatsapp/dashboard/AdminDashboard';
import { DashboardRoleGuard } from '@/components/whatsapp/dashboard/DashboardRoleGuard';

export default function AdminDashboardPage() {
  return (
    <DashboardRoleGuard allowedRole="ADMIN" alsoAllowPermission="manage_team">
      <AdminDashboard />
    </DashboardRoleGuard>
  );
}
