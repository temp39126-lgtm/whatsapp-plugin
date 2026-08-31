'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Copy, MoreVertical, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpdateConversationStatus } from '@/hooks/useConversations';
import type { ConversationDTO } from '@/types';
import { cn } from '@/lib/utils';

interface ConversationActionsMenuProps {
  conversation: ConversationDTO;
}

const statusActions = [
  { status: 'OPEN', label: 'Mark as Open', icon: Circle },
  { status: 'PENDING', label: 'Mark as Pending', icon: Circle },
  { status: 'RESOLVED', label: 'Mark as Resolved', icon: CheckCircle2 },
  { status: 'CLOSED', label: 'Mark as Closed', icon: XCircle },
] as const;

export function ConversationActionsMenu({ conversation }: ConversationActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const updateStatus = useUpdateConversationStatus();

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
    const timer = window.setTimeout(() => setFeedback(''), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function handleStatusChange(status: string) {
    updateStatus.mutate(
      { id: conversation._id, status },
      {
        onSuccess: () => {
          setFeedback(`Status updated to ${status.toLowerCase()}`);
          setOpen(false);
        },
      }
    );
  }

  async function handleCopyPhone() {
    const phone = conversation.contact?.phone;
    if (!phone) return;

    try {
      await navigator.clipboard.writeText(phone);
      setFeedback('Phone number copied');
      setOpen(false);
    } catch {
      setFeedback('Could not copy phone number');
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Conversation actions"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreVertical className="h-5 w-5" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-lg border bg-background shadow-lg">
          <div className="border-b px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Conversation
            </p>
          </div>

          <div className="py-1">
            {statusActions.map(({ status, label, icon: Icon }) => (
              <button
                key={status}
                type="button"
                disabled={updateStatus.isPending || conversation.status === status}
                onClick={() => handleStatusChange(status)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
                  conversation.status === status && 'bg-whatsapp-light text-whatsapp-dark'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="border-t py-1">
            <button
              type="button"
              onClick={handleCopyPhone}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <Copy className="h-4 w-4" />
              Copy phone number
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div className="absolute right-0 top-full z-10 mt-1 rounded bg-foreground px-2 py-1 text-xs text-background shadow">
          {feedback}
        </div>
      )}
    </div>
  );
}
