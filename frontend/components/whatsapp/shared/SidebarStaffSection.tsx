'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronDown, UserPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

function isTeamRoute(pathname: string) {
  return pathname.startsWith('/whatsapp/team');
}

export function SidebarStaffSection({
  pathname,
  showLabels,
}: {
  pathname: string;
  showLabels: boolean;
}) {
  const teamBase = isTeamRoute(pathname);
  const [expanded, setExpanded] = useState(teamBase);

  useEffect(() => {
    setExpanded(teamBase);
  }, [teamBase]);

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
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10',
          teamBase && 'text-white'
        )}
      >
        <Users className="h-5 w-5 shrink-0 text-whatsapp-light" />
        <span className="flex-1 text-left">Staff & Members</span>
        <ChevronDown
          className={cn('h-4 w-4 text-white/60 transition-transform', expanded && 'rotate-180')}
        />
      </button>
      {expanded ? (
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
      ) : null}
    </div>
  );
}