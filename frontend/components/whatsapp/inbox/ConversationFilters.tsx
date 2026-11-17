'use client';

import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ConversationFilterDialog,
  conversationAdvancedFiltersActive,
} from '@/components/whatsapp/inbox/ConversationFilterDialog';
import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ConversationFiltersProps {
  filters: Record<string, string | boolean | undefined>;
  onChange: (filters: Record<string, string | boolean | undefined>) => void;
}

function isAllFiltersActive(filters: Record<string, string | boolean | undefined>) {
  return (
    !filters.status &&
    !filters.assignedUserId &&
    !filters.unread &&
    !filters.active &&
    !filters.groups &&
    !filters.mine &&
    !filters.unassigned &&
    !filters.assigned &&
    !filters.newToday &&
    !filters.tagId &&
    !filters.fromDate &&
    !filters.toDate &&
    !filters.hasNotes
  );
}

const pillClass = (active: boolean) =>
  cn(
    'shrink-0 touch-pan-x whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
    active
      ? 'bg-whatsapp text-white shadow-sm'
      : 'bg-muted/90 text-foreground/75 hover:bg-muted'
  );

function clearAdvancedFilters(filters: Record<string, string | boolean | undefined>) {
  return {
    ...filters,
    assignedUserId: undefined,
    unassigned: undefined,
    assigned: undefined,
    tagId: undefined,
    fromDate: undefined,
    toDate: undefined,
    hasNotes: undefined,
  };
}

/** Keeps filter pills in one swipeable row (touch + mouse drag). */
function FilterPillScroller({ children }: { children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ pointerId: -1, startX: 0, scrollLeft: 0, suppressClick: false });

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
      suppressClick: false,
    };
    scroller.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    const drag = dragRef.current;
    if (!scroller || drag.pointerId !== event.pointerId) return;
    if (event.pointerType === 'touch') return;

    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) > 4) {
      drag.suppressClick = true;
      scroller.scrollLeft = drag.scrollLeft - deltaX;
    }
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (scroller && dragRef.current.pointerId === event.pointerId) {
      scroller.releasePointerCapture(event.pointerId);
    }
    dragRef.current.pointerId = -1;
  }

  function onClickCapture(event: MouseEvent) {
    if (dragRef.current.suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current.suppressClick = false;
    }
  }

  return (
    <div className="relative w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-muted/25 px-1.5 py-1.5 shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
      <div
        ref={scrollerRef}
        className={cn(
          'flex w-full max-w-full touch-pan-x flex-nowrap gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain',
          'scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden',
          'cursor-grab active:cursor-grabbing'
        )}
        role="tablist"
        aria-label="Conversation filters"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent"
      />
    </div>
  );
}

export function ConversationFilters({ filters, onChange }: ConversationFiltersProps) {
  const { canViewAllConversations } = usePermissions();
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const advancedActive = conversationAdvancedFiltersActive(filters);
  const allActive = isAllFiltersActive(filters);
  const assignedUserId = filters.assignedUserId as string | undefined;

  function showAllConversations() {
    onChange(filters.search ? { search: filters.search } : {});
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 border-b p-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search conversations..."
          value={(filters.search as string) || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="h-9 min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-9 w-9 shrink-0 rounded-md border bg-background',
            advancedActive && 'border-whatsapp/40 bg-whatsapp-light text-whatsapp-dark'
          )}
          aria-label="Filter conversations"
          onClick={() => setFilterDialogOpen(true)}
        >
          <Filter className="h-4 w-4" />
          {advancedActive ? (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-whatsapp" />
          ) : null}
        </Button>
      </div>

      <ConversationFilterDialog
        open={filterDialogOpen}
        active={{
          assignedUserId: filters.assignedUserId as string | undefined,
          unassigned: Boolean(filters.unassigned),
          tagId: filters.tagId as string | undefined,
          fromDate: filters.fromDate as string | undefined,
          toDate: filters.toDate as string | undefined,
          hasNotes: Boolean(filters.hasNotes),
        }}
        onClose={() => setFilterDialogOpen(false)}
        onApply={(draft) =>
          onChange({
            ...clearAdvancedFilters(filters),
            assignedUserId: draft.assignedUserId,
            unassigned: draft.unassigned,
            tagId: draft.tagId,
            fromDate: draft.fromDate,
            toDate: draft.toDate,
            hasNotes: draft.hasNotes,
          })
        }
        onReset={() => onChange(clearAdvancedFilters(filters))}
      />

      <FilterPillScroller>
        <button type="button" onClick={showAllConversations} className={pillClass(allActive)}>
          All
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...(filters.search ? { search: filters.search } : {}),
              ...clearAdvancedFilters(filters),
              unread: filters.unread ? undefined : true,
            })
          }
          className={pillClass(Boolean(filters.unread))}
        >
          Unread
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...(filters.search ? { search: filters.search } : {}),
              ...clearAdvancedFilters(filters),
              active: filters.active ? undefined : true,
            })
          }
          className={pillClass(Boolean(filters.active))}
        >
          Active
        </button>
        {canViewAllConversations ? (
          <>
            <button
              type="button"
              onClick={() => {
                const nextAssigned = filters.assigned ? undefined : true;
                onChange({
                  ...(filters.search ? { search: filters.search } : {}),
                  ...(filters.unread ? { unread: true } : {}),
                  ...(filters.active ? { active: true } : {}),
                  ...clearAdvancedFilters(filters),
                  assigned: nextAssigned,
                  unassigned: undefined,
                  assignedUserId: undefined,
                });
              }}
              className={pillClass(Boolean(filters.assigned || assignedUserId))}
            >
              Assigned
            </button>
            <button
              type="button"
              onClick={() => {
                const nextUnassigned = filters.unassigned ? undefined : true;
                onChange({
                  ...(filters.search ? { search: filters.search } : {}),
                  ...(filters.unread ? { unread: true } : {}),
                  ...(filters.active ? { active: true } : {}),
                  ...clearAdvancedFilters(filters),
                  unassigned: nextUnassigned,
                  assigned: undefined,
                  assignedUserId: undefined,
                });
              }}
              className={pillClass(Boolean(filters.unassigned && !assignedUserId))}
            >
              Unassigned
            </button>
          </>
        ) : null}
      </FilterPillScroller>
    </div>
  );
}
