'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, MoreVertical, Pin, PinOff } from 'lucide-react';
import { useToggleConversationPin } from '@/hooks/useConversations';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';

interface ChatConversationMenuProps {
  conversationId: string;
  isPinned?: boolean;
  disabled?: boolean;
}

type ExportFormat = 'zip' | 'txt';

export function ChatConversationMenu({
  conversationId,
  isPinned,
  disabled,
}: ChatConversationMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleConversationPin = useToggleConversationPin();

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

  async function handleExport(format: ExportFormat) {
    setExporting(format);
    setOpen(false);
    try {
      const { blob, filename } = await api.download(`/conversations/${conversationId}/export`, {
        format,
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectUrl);
      toastSuccess(
        format === 'zip'
          ? 'Chat exported with messages and media.'
          : 'Chat exported as text file.'
      );
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to export chat');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Chat options"
        aria-expanded={open}
        disabled={disabled || exporting !== null}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreVertical className="h-5 w-5" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[220px] overflow-hidden rounded-lg border bg-background py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-50"
            disabled={toggleConversationPin.isPending}
            onClick={() => {
              setOpen(false);
              toggleConversationPin.mutate(conversationId, {
                onSuccess: (result) => {
                  toastSuccess(
                    result.isPinned
                      ? 'Chat pinned to the top of your inbox.'
                      : 'Chat unpinned.'
                  );
                },
                onError: (error) => {
                  toastError(error instanceof Error ? error.message : 'Failed to pin chat');
                },
              });
            }}
          >
            {isPinned ? (
              <PinOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Pin className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {isPinned ? 'Unpin chat' : 'Pin chat'}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-50"
            disabled={exporting !== null}
            onClick={() => handleExport('zip')}
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            Export chat (with media)
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-50"
            onClick={() => handleExport('txt')}
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            Export chat (text only)
          </button>
        </div>
      )}
    </div>
  );
}
