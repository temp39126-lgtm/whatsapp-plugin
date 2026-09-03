'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { onSocketEvent } from '@/lib/socket';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';

interface SidebarNotificationsProps {
  collapsed: boolean;
}

export function SidebarNotifications({ collapsed }: SidebarNotificationsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      api.get<{ data: AppNotification[]; unreadCount: number }>('/notifications'),
    refetchInterval: 60_000,
  });

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markRead = useMutation({
    mutationFn: (id: string) =>
      api.patch<{ notification: AppNotification; unreadCount: number }>(
        `/notifications/${id}/read`
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(['notifications'], (current: typeof data) => ({
        data: (current?.data ?? []).map((item) =>
          item._id === result.notification._id ? { ...item, read: true } : item
        ),
        unreadCount: result.unreadCount,
      }));
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post<{ unreadCount: number }>('/notifications/read-all'),
    onSuccess: (result) => {
      queryClient.setQueryData(['notifications'], (current: typeof data) => ({
        data: (current?.data ?? []).map((item) => ({ ...item, read: true })),
        unreadCount: result.unreadCount,
      }));
    },
  });

  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  useEffect(() => {
    const unsubscribers = [
      onSocketEvent('notification.created', invalidateNotifications),
      onSocketEvent('message.created', invalidateNotifications),
      onSocketEvent('conversation.assigned', invalidateNotifications),
    ];
    return () => unsubscribers.forEach((unsub) => unsub());
  }, [invalidateNotifications]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleNotificationClick(notification: AppNotification) {
    if (!notification.read) {
      markRead.mutate(notification._id);
    }
    setOpen(false);
    router.push(notification.href);
  }

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div ref={panelRef} className="relative mb-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className={cn(
          'relative flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:justify-start',
          open && 'bg-white/20 text-white'
        )}
      >
        <Bell className="h-5 w-5 shrink-0" />
        <span className="ml-3 hidden text-sm font-medium lg:block">Notifications</span>
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white',
              collapsed ? 'right-1 top-1' : 'right-2 top-1.5 lg:right-3'
            )}
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-50 w-80 overflow-hidden rounded-xl border bg-card text-foreground shadow-xl',
            collapsed ? 'left-full top-0 ml-2' : 'left-0 top-full mt-2 lg:left-full lg:top-0 lg:ml-2 lg:mt-0'
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs font-medium text-whatsapp-dark hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </p>
            ) : (
              <ul className="divide-y">
                {notifications.map((notification) => (
                  <li key={notification._id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/60',
                        !notification.read && 'bg-whatsapp-light/20'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{notification.title}</p>
                        {!notification.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-whatsapp" />
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t px-4 py-2">
            <Link
              href="/whatsapp/inbox"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-whatsapp-dark hover:underline"
            >
              Open inbox
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
