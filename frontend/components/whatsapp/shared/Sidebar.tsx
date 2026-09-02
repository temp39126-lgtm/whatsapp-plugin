'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Phone,
  Users,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { href: '/whatsapp/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
  { href: '/whatsapp/user', label: 'Dashboard', icon: LayoutDashboard, roles: ['USER'] },
  { href: '/whatsapp/inbox', label: 'Inbox', icon: MessageSquare, roles: ['ADMIN', 'USER'] },
  { href: '/whatsapp/calls', label: 'Calls', icon: Phone, roles: ['ADMIN', 'USER'] },
  { href: '/whatsapp/contacts', label: 'Contacts', icon: Users, roles: ['ADMIN', 'USER'] },
  { href: '/whatsapp/analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN'] },
  { href: '/whatsapp/settings', label: 'Settings', icon: Settings, roles: ['ADMIN', 'USER'] },
];

function useCollapsedSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const update = () => setCollapsed(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return collapsed;
}

function SidebarNavLink({
  href,
  label,
  icon: Icon,
  isActive,
  showTooltip,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  isActive: boolean;
  showTooltip: boolean;
}) {
  const link = (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        'flex items-center justify-center rounded-lg px-3 py-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:justify-start',
        isActive && 'bg-white/20 text-white'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="ml-3 hidden text-sm font-medium lg:block">{label}</span>
    </Link>
  );

  if (!showTooltip) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const showTooltips = useCollapsedSidebar();

  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const logoutButton = (
    <button
      type="button"
      onClick={logout}
      aria-label="Sign out"
      className="flex w-full items-center justify-center rounded-lg py-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
    >
      <LogOut className="h-5 w-5" />
    </button>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="flex h-full w-16 shrink-0 flex-col items-center border-r bg-whatsapp-dark py-4 lg:w-56 lg:items-stretch lg:px-3">
        <div className="mb-6 flex items-center justify-center lg:justify-start lg:px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <span className="ml-3 hidden text-lg font-semibold text-white lg:block">
            WhatsApp CRM
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {filteredItems.map((item) => {
            const isActive =
              item.href === '/whatsapp/admin' || item.href === '/whatsapp/user'
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <SidebarNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={isActive}
                showTooltip={showTooltips}
              />
            );
          })}
        </nav>

        {user && (
          <div className="mt-auto border-t border-white/10 pt-4">
            <div className="hidden px-2 lg:block">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-white/60">{isAdmin ? 'Admin' : 'User'}</p>
              <button
                type="button"
                onClick={logout}
                className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
            {showTooltips ? (
              <Tooltip>
                <TooltipTrigger asChild>{logoutButton}</TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            ) : (
              logoutButton
            )}
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
