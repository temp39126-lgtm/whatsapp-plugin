'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { useMarkAllRead } from '@/hooks/useConversations';
import { NewCommunityModal } from './NewCommunityModal';
import { NewGroupModal } from './NewGroupModal';

type ActiveModal = 'group' | 'community' | null;

const menuItems = [
  { id: 'new-group', label: 'New group' },
  { id: 'new-community', label: 'New community' },
  { id: 'read-all', label: 'Read all' },
  { id: 'settings', label: 'Settings' },
] as const;

export function WhatsAppOverflowMenu() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [feedback, setFeedback] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const markAllRead = useMarkAllRead();

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(''), 3000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const visibleMenuItems = menuItems.filter(
    (item) => item.id !== 'settings' || isAdmin
  );

  function handleMenuAction(actionId: (typeof menuItems)[number]['id']) {
    switch (actionId) {
      case 'new-group':
        setOpen(false);
        setActiveModal('group');
        break;
      case 'new-community':
        setOpen(false);
        setActiveModal('community');
        break;
      case 'read-all':
        markAllRead.mutate(undefined, {
          onSuccess: (result) => {
            setFeedback(
              result.markedCount > 0
                ? `Marked ${result.markedCount} conversation${result.markedCount === 1 ? '' : 's'} as read`
                : 'All conversations are already read'
            );
            setOpen(false);
          },
          onError: (error) => {
            setFeedback(error instanceof Error ? error.message : 'Failed to mark all as read');
          },
        });
        break;
      case 'settings':
        setOpen(false);
        router.push('/whatsapp/settings');
        break;
    }
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <MoreVertical className="h-5 w-5" />
        </Button>

        {open && (
          <div className="absolute right-0 top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-lg border bg-background py-1 shadow-lg">
            {visibleMenuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.id === 'read-all' && markAllRead.isPending}
                onClick={() => handleMenuAction(item.id)}
                className="flex w-full px-4 py-2.5 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {item.id === 'read-all' && markAllRead.isPending ? 'Marking read...' : item.label}
              </button>
            ))}
          </div>
        )}

        {feedback && (
          <div className="absolute right-0 top-full z-20 mt-1 max-w-xs rounded bg-foreground px-3 py-2 text-xs text-background shadow">
            {feedback}
          </div>
        )}
      </div>

      <NewGroupModal
        open={activeModal === 'group'}
        onClose={() => setActiveModal(null)}
        onSuccess={setFeedback}
      />
      <NewCommunityModal
        open={activeModal === 'community'}
        onClose={() => setActiveModal(null)}
        onSuccess={setFeedback}
      />
    </>
  );
}
