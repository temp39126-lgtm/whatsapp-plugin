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

const statusFilters = [
  { key: 'OPEN', label: 'Open' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
];

function isAllFiltersActive(filters: Record<string, string | boolean | undefined>) {
  return (
    !filters.status &&
    !filters.assignedUserId &&
    !filters.unread &&
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
    <div className="relative w-full min-w-0 max-w-full overflow-hidden">
      <div
        ref={scrollerRef}
        className={cn(
          'flex w-full max-w-full touch-pan-x flex-nowrap gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1',
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
              groups: filters.groups ? undefined : true,
            })
          }
          className={pillClass(Boolean(filters.groups))}
        >
          Groups
        </button>
        {canViewAllConversations ? (
          <>
            <button
              type="button"
              onClick={() => {
                const nextAssigned = filters.assigned ? undefined : true;
                onChange({
                  ...(filters.search ? { search: filters.search } : {}),
                  ...(filters.status ? { status: filters.status as string } : {}),
                  ...(filters.unread ? { unread: true } : {}),
                  ...(filters.groups ? { groups: true } : {}),
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
                  ...(filters.status ? { status: filters.status as string } : {}),
                  ...(filters.unread ? { unread: true } : {}),
                  ...(filters.groups ? { groups: true } : {}),
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
        {statusFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() =>
              onChange({
                ...(filters.search ? { search: filters.search } : {}),
                ...(filters.unread ? { unread: true } : {}),
                ...(filters.groups ? { groups: true } : {}),
                ...(filters.assigned ? { assigned: true } : {}),
                ...(filters.unassigned ? { unassigned: true } : {}),
                ...(filters.assignedUserId
                  ? { assignedUserId: filters.assignedUserId as string }
                  : {}),
                status: filters.status === f.key ? undefined : f.key,
              })
            }
            className={pillClass(filters.status === f.key)}
          >
            {f.label}
          </button>
        ))}
      </FilterPillScroller>
    </div>
  );
}
