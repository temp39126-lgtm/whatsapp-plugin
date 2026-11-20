'use client';

import Link from 'next/link';
import { ChevronDown, UserPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SidebarStaffSection({
  pathname,
  showLabels,
}: {
  pathname: string;
  showLabels: boolean;
}) {
  const teamBase = pathname.startsWith('/whatsapp/team');
  const listActive =
    teamBase &&
    (pathname === '/whatsapp/team' ||
      (pathname.startsWith('/whatsapp/team/') && pathname !== '/whatsapp/team/new'));
  const addActive = pathname === '/whatsapp/team/new';

  if (!showLabels) {
    return (
      <Link
        href="/whatsapp/team"
        aria-label="Staff & Members"
        className={cn(
          'flex items-center justify-center rounded-lg px-3 py-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white',
          teamBase && 'bg-white/20 text-white'
        )}
      >
        <Users className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white',
          teamBase && 'text-white'
        )}
      >
        <Users className="h-5 w-5 shrink-0 text-whatsapp-light" />
        <span className="flex-1">Staff & Members</span>
        <ChevronDown className={cn('h-4 w-4 text-white/60', teamBase && 'rotate-0')} />
      </div>
      <div className="ml-2 space-y-0.5 border-l border-white/15 pl-2">
        <Link
          href="/whatsapp/team"
          className={cn(
            'block rounded-lg px-3 py-2 text-sm transition-colors',
            listActive
              ? 'bg-whatsapp-dark font-medium text-white'
              : 'text-white/75 hover:bg-white/10 hover:text-white'
          )}
        >
          User List
        </Link>
        <Link
          href="/whatsapp/team/new"
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            addActive
              ? 'bg-whatsapp-dark font-medium text-white'
              : 'text-white/75 hover:bg-white/10 hover:text-white'
          )}
        >
          <UserPlus className="h-4 w-4 shrink-0 opacity-80" />
          Add New User
        </Link>
      </div>
    </div>
  );
}