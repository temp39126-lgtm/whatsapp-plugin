'use client';

import { useParams } from 'next/navigation';
import { DashboardRoleGuard } from '@/components/whatsapp/dashboard/DashboardRoleGuard';
import { TeamUserDetail } from '@/components/whatsapp/team/TeamUserDetail';

export default function TeamUserPage() {
  const params = useParams();
  const userId = params.userId as string;

  return (
    <DashboardRoleGuard allowedRole="ADMIN">
      <TeamUserDetail userId={userId} />
    </DashboardRoleGuard>
  );
}
