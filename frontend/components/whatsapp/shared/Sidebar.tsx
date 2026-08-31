'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Phone,
  Users,
  Tags,
  BarChart3,
  Settings,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

const navItems = [
  { href: '/whatsapp/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
  { href: '/whatsapp/user', label: 'Dashboard', icon: LayoutDashboard, roles: ['AGENT'] },
  { href: '/whatsapp/inbox', label: 'Inbox', icon: MessageSquare, roles: ['ADMIN', 'AGENT'] },
  { href: '/whatsapp/calls', label: 'Calls', icon: Phone, roles: ['ADMIN', 'AGENT'] },
  { href: '/whatsapp/contacts', label: 'Contacts', icon: Users, roles: ['ADMIN', 'AGENT'] },
  { href: '/whatsapp/team', label: 'Team', icon: UserCog, roles: ['ADMIN'] },
  { href: '/whatsapp/tags', label: 'Tags', icon: Tags, roles: ['ADMIN', 'AGENT'] },
  { href: '/whatsapp/analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN'] },
  { href: '/whatsapp/settings', label: 'Settings', icon: Settings, roles: ['ADMIN', 'AGENT'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();

  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <aside className="flex h-full w-16 flex-col items-center border-r bg-whatsapp-dark py-4 lg:w-56 lg:items-stretch lg:px-3">
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
          const Icon = item.icon;
          const isActive =
            item.href === '/whatsapp/admin' || item.href === '/whatsapp/user'
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-center rounded-lg px-3 py-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:justify-start',
                isActive && 'bg-white/20 text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="ml-3 hidden text-sm font-medium lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="mt-auto hidden border-t border-white/10 pt-4 lg:block">
          <div className="px-2">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-white/60">{isAdmin ? 'Admin' : 'User'}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
