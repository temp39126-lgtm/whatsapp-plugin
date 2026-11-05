'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DashboardRoleGuard } from '@/components/whatsapp/dashboard/DashboardRoleGuard';
import { CreateTeamUserForm } from '@/components/whatsapp/team/CreateTeamUserForm';

export default function TeamPage() {
  return (
    <DashboardRoleGuard requiredPermission="manage_team">
      <div className="overflow-y-auto p-4 sm:p-6">
        <div className="mb-6">
          <Link
            href="/whatsapp/settings?panel=team"
            className="mb-3 inline-flex items-center gap-1 text-sm text-whatsapp-dark hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold">Team Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create user accounts in Settings → Create user. View users and assigned conversation
            counts on the{' '}
            <Link href="/whatsapp/admin" className="text-whatsapp-dark hover:underline">
              admin dashboard
            </Link>
            .
          </p>
        </div>

        <div className="max-w-3xl">
          <CreateTeamUserForm />
        </div>
      </div>
    </DashboardRoleGuard>
  );
}
