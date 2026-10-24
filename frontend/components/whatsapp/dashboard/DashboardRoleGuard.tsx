'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { hasPermission } from '@/lib/permissions';
import type { Permission } from '@shared/constants/permissions';

function LoadingSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
    </div>
  );
}

type DashboardRoleGuardProps = {
  children: React.ReactNode;
  allowedRole?: 'ADMIN' | 'USER';
  /** User must have this permission (admins always pass). */
  requiredPermission?: Permission;
  /** When guarding admin workspace, also allow users with this permission. */
  alsoAllowPermission?: Permission;
  redirectTo?: string;
};

export function DashboardRoleGuard({
  allowedRole,
  requiredPermission,
  alsoAllowPermission,
  redirectTo = '/whatsapp/user',
  children,
}: DashboardRoleGuardProps) {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  const allowedByPermission = requiredPermission
    ? hasPermission(user, requiredPermission)
    : false;

  const allowedAdminWorkspace =
    isAdmin || (alsoAllowPermission ? hasPermission(user, alsoAllowPermission) : false);

  const allowedByRole =
    allowedRole === 'ADMIN'
      ? allowedAdminWorkspace
      : allowedRole === 'USER'
        ? !isAdmin
        : true;

  const canAccess = requiredPermission ? allowedByPermission : allowedByRole;

  useEffect(() => {
    if (isLoading || !user) return;
    if (!canAccess) {
      router.replace(redirectTo);
    }
  }, [canAccess, isLoading, redirectTo, router, user]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user || !canAccess) {
    return null;
  }

  return children;
}
