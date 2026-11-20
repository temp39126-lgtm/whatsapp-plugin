'use client';

import { DashboardRoleGuard } from '@/components/whatsapp/dashboard/DashboardRoleGuard';
import { CreateTeamUserForm } from '@/components/whatsapp/team/CreateTeamUserForm';

export default function NewTeamUserPage() {
  return (
    <DashboardRoleGuard requiredPermission="manage_team">
      <div className="h-full overflow-y-auto bg-muted/20 p-4 sm:p-6 lg:p-8">
        <CreateTeamUserForm layout="page" />
      </div>
    </DashboardRoleGuard>
  );
}