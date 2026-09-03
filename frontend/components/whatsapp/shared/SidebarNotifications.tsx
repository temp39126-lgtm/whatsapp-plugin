'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

interface PanelPosition {
  top: number;
  left: number;
}

export function SidebarNotifications({ collapsed }: SidebarNotificationsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
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

  const updatePanelPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const panelWidth = 320;
    const gap = 8;
    const viewportPadding = 12;

    let left = collapsed ? rect.right + gap : rect.left;
    let top = collapsed ? rect.top : rect.bottom + gap;

    if (left + panelWidth > window.innerWidth - viewportPadding) {
      left = Math.max(viewportPadding, rect.left - panelWidth - gap);
    }

    const estimatedHeight = 360;
    if (top + estimatedHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, window.innerHeight - estimatedHeight - viewportPadding);
    }

    setPanelPosition({ top, left });
  }, [collapsed]);

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

    updatePanelPosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleReposition() {
      updatePanelPosition();
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, updatePanelPosition]);

  function handleNotificationClick(notification: AppNotification) {
    if (!notification.read) {
      markRead.mutate(notification._id);
    }
    setOpen(false);
    router.push(notification.href);
  }

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  const panel =
    open && panelPosition
      ? createPortal(
          <div
            ref={panelRef}
            style={{ top: panelPosition.top, left: panelPosition.left }}
            className="fixed z-[200] w-80 overflow-hidden rounded-xl border border-border bg-white text-foreground shadow-2xl"
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

            <div className="max-h-80 overflow-y-auto bg-white">
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

            <div className="border-t bg-white px-4 py-2">
              <Link
                href="/whatsapp/inbox"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-whatsapp-dark hover:underline"
              >
                Open inbox
              </Link>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        className={cn(
          'relative mb-2 flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:justify-start',
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
      {panel}
    </>
  );
}
