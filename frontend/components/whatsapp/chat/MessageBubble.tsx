'use client';

import { format } from 'date-fns';
import { ChevronDown, Pin, Star, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { DeliveryStatus } from './DeliveryStatus';
import { MessageMediaContent } from './MessageMediaContent';
import { Button } from '@/components/ui/button';
import type { MessageDTO } from '@/types';

interface MessageBubbleProps {
  message: MessageDTO;
  onReply?: (message: MessageDTO) => void;
  onEdit?: (message: MessageDTO) => void;
  canEdit?: boolean;
  onPin?: (messageId: string) => void;
  onStar?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
}

const DELETE_FOR_EVERYONE_WINDOW_MS = 48 * 60 * 60 * 1000;
const MENU_MIN_WIDTH = 180;
const VIEWPORT_PADDING = 8;

type MenuPosition = { top: number; left: number };

function computeMenuPosition(
  anchor: DOMRect,
  menuSize: { width: number; height: number },
  alignEnd: boolean
): MenuPosition {
  const { width: menuWidth, height: menuHeight } = menuSize;

  let top = anchor.bottom + VIEWPORT_PADDING;
  if (top + menuHeight > window.innerHeight - VIEWPORT_PADDING) {
    top = anchor.top - menuHeight - VIEWPORT_PADDING;
  }
  top = Math.max(
    VIEWPORT_PADDING,
    Math.min(top, window.innerHeight - menuHeight - VIEWPORT_PADDING)
  );

  let left = alignEnd ? anchor.right - menuWidth : anchor.left;
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - menuWidth - VIEWPORT_PADDING)
  );

  return { top, left };
}

export function MessageBubble({
  message,
  onReply,
  onEdit,
  canEdit = false,
  onPin,
  onStar,
  onDelete,
  onDeleteForEveryone,
  onRetry,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const isCallTimeline = message.type === 'CALL';
  const isOutgoing = message.direction === 'OUTGOING';
  const isDeletedForEveryone = Boolean(message.deletedForEveryone);
  const canDeleteForEveryone =
    isOutgoing &&
    !isDeletedForEveryone &&
    Date.now() - new Date(message.createdAt).getTime() <= DELETE_FOR_EVERYONE_WINDOW_MS;

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuPosition(null);
  }, []);

  const openMenuAtAnchor = useCallback(
    (anchor: DOMRect) => {
      const estimatedHeight = 280;
      setMenuPosition(
        computeMenuPosition(
          anchor,
          { width: MENU_MIN_WIDTH, height: estimatedHeight },
          isOutgoing
        )
      );
      setMenuOpen(true);
    },
    [isOutgoing]
  );

  const openMenuFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      openMenuAtAnchor(new DOMRect(clientX, clientY, 1, 1));
    },
    [openMenuAtAnchor]
  );

  const toggleMenuFromChevron = useCallback(() => {
    if (menuOpen) {
      closeMenu();
      return;
    }
    const bubble = bubbleRef.current;
    if (!bubble) return;
    openMenuAtAnchor(bubble.getBoundingClientRect());
  }, [closeMenu, menuOpen, openMenuAtAnchor]);

  useLayoutEffect(() => {
    if (!menuOpen || !menuPanelRef.current || !bubbleRef.current) return;
    const panel = menuPanelRef.current.getBoundingClientRect();
    const anchor = bubbleRef.current.getBoundingClientRect();
    setMenuPosition(
      computeMenuPosition(anchor, { width: panel.width, height: panel.height }, isOutgoing)
    );
  }, [menuOpen, isOutgoing]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (bubbleRef.current?.contains(target)) return;
      if (menuPanelRef.current?.contains(target)) return;
      closeMenu();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu();
    }

    function handleDismissOnScroll() {
      closeMenu();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleDismissOnScroll, true);
    window.addEventListener('resize', handleDismissOnScroll);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleDismissOnScroll, true);
      window.removeEventListener('resize', handleDismissOnScroll);
    };
  }, [menuOpen, closeMenu]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isDeletedForEveryone) return;
      event.preventDefault();
      openMenuFromPointer(event.clientX, event.clientY);
    },
    [isDeletedForEveryone, openMenuFromPointer]
  );

  if (isCallTimeline) {
    return (
      <div className="flex w-full justify-center py-1">
        <div className="rounded-full border bg-muted/80 px-3 py-1.5 shadow-sm">
          <MessageMediaContent message={message} />
        </div>
      </div>
    );
  }

  const menuContent =
    menuOpen && menuPosition && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuPanelRef}
            role="menu"
            className="fixed z-[200] min-w-[180px] overflow-hidden rounded-lg border bg-background py-1 shadow-lg"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {onReply && (
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-4 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onReply(message);
                  closeMenu();
                }}
              >
                Reply
              </button>
            )}
            {canEdit && onEdit && (
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-4 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onEdit(message);
                  closeMenu();
                }}
              >
                Edit
              </button>
            )}
            {onPin && (
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-4 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onPin(message._id);
                  closeMenu();
                }}
              >
                {message.isPinned ? 'Unpin' : 'Pin'}
              </button>
            )}
            {onStar && (
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-4 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onStar(message._id);
                  closeMenu();
                }}
              >
                {message.isStarred ? 'Unstar' : 'Star'}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-4 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onDelete(message._id);
                  closeMenu();
                }}
              >
                Delete message
              </button>
            )}
            {canDeleteForEveryone && onDeleteForEveryone && (
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  onDeleteForEveryone(message._id);
                  closeMenu();
                }}
              >
                Delete for everyone
              </button>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className={cn('group flex w-full', isOutgoing ? 'justify-end' : 'justify-start')}>
      <div className="relative max-w-[min(75%,32rem)]">
        <div
          ref={bubbleRef}
          onContextMenu={handleContextMenu}
          className={cn(
            'relative rounded-lg px-3 py-2 shadow-sm',
            isOutgoing ? 'bg-chat-outgoing rounded-tr-none' : 'bg-chat-incoming rounded-tl-none',
            isDeletedForEveryone && 'bg-muted/60 italic text-muted-foreground',
            !isDeletedForEveryone && 'cursor-default'
          )}
        >
          {message.isPinned && !isDeletedForEveryone && (
            <Pin className="absolute -top-2 -right-2 h-3 w-3 text-whatsapp" />
          )}

          {isDeletedForEveryone ? (
            <p className="text-sm">This message was deleted</p>
          ) : (
            <MessageMediaContent message={message} />
          )}

          <div className="mt-1 flex items-center justify-end gap-1">
            {message.isStarred && !isDeletedForEveryone && (
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            )}
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(message.createdAt), 'HH:mm')}
              {message.isEdited ? ' · edited' : ''}
            </span>
            {isOutgoing && !isDeletedForEveryone && <DeliveryStatus status={message.status} />}
          </div>

          {message.status === 'FAILED' && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-6 text-xs text-destructive"
              onClick={() => onRetry(message._id)}
            >
              <RotateCcw className="mr-1 h-3 w-3" /> Retry
            </Button>
          )}
        </div>

        {!isDeletedForEveryone && (
          <button
            type="button"
            aria-label="Message actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={(event) => {
              event.stopPropagation();
              toggleMenuFromChevron();
            }}
            className={cn(
              'absolute top-1 rounded-full p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              isOutgoing ? 'left-1 lg:-left-7' : 'right-1 lg:-right-7',
              menuOpen ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}

        {menuContent}
      </div>
    </div>
  );
}
