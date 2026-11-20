'use client';

import { DashboardRoleGuard } from '@/components/whatsapp/dashboard/DashboardRoleGuard';
import { TeamUserList } from '@/components/whatsapp/team/TeamUserList';

export default function TeamPage() {
  return (
    <DashboardRoleGuard requiredPermission="manage_team">
      <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
        <TeamUserList />
      </div>
    </DashboardRoleGuard>
  );
}