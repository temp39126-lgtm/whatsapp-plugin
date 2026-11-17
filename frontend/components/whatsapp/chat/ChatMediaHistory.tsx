'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  MapPin,
  Mic,
  PlayCircle,
} from 'lucide-react';
import { resolveMediaUrl } from '@/lib/api';
import {
  useConversationMediaList,
  useConversationMediaSummary,
  type MediaCategory,
  type ConversationMediaItem,
} from '@/hooks/useConversationMedia';

interface ChatMediaHistoryProps {
  conversationId: string;
  onJumpToMessage?: (messageId: string) => void;
}

const CATEGORIES: Array<{
  id: MediaCategory;
  label: string;
  icon: typeof ImageIcon;
}> = [
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'audio', label: 'Audio', icon: Mic },
  { id: 'videos', label: 'Videos', icon: PlayCircle },
];

function itemCountLabel(count: number) {
  return count === 1 ? '1 item' : `${count} items`;
}

function MediaThumb({
  item,
  onSelect,
}: {
  item: ConversationMediaItem;
  onSelect: () => void;
}) {
  const url = item.media?.url ? resolveMediaUrl(item.media.url) : undefined;
  const isImage = item.type === 'IMAGE' || item.type === 'STICKER';

  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative aspect-square overflow-hidden rounded-md border bg-muted/40 hover:ring-2 hover:ring-whatsapp"
      title={format(new Date(item.createdAt), 'MMM d, yyyy HH:mm')}
    >
      {isImage && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : item.type === 'VIDEO' && url ? (
        <video src={url} className="h-full w-full object-cover" muted />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <FileText className="h-8 w-8 opacity-60" />
        </div>
      )}
    </button>
  );
}

function MediaListRow({
  item,
  onSelect,
}: {
  item: ConversationMediaItem;
  onSelect: () => void;
}) {
  const fileName =
    item.media?.fileName ??
    (item.content as { fileName?: string } | undefined)?.fileName ??
    item.type.toLowerCase();

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-sm hover:bg-muted/60"
    >
      <span className="min-w-0 flex-1 truncate">{fileName}</span>
      <span className="shrink-0 text-[10px] text-muted-foreground">
        {format(new Date(item.createdAt), 'MMM d')}
      </span>
    </button>
  );
}

function CategoryPanel({
  conversationId,
  category,
  total,
  expanded,
  onToggle,
  onJumpToMessage,
}: {
  conversationId: string;
  category: (typeof CATEGORIES)[number];
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onJumpToMessage?: (messageId: string) => void;
}) {
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    if (!expanded) setLimit(12);
  }, [expanded]);

  const { data, isLoading } = useConversationMediaList(
    expanded ? conversationId : null,
    expanded ? category.id : null,
    limit
  );
  const items = data?.data ?? [];
  const Icon = category.icon;
  const gridCategory = category.id === 'images' || category.id === 'videos';
  const hasMore = Boolean(data && data.pagination.total > items.length);

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{category.label}</span>
          <span className="text-xs text-muted-foreground">{itemCountLabel(total)}</span>
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded ? (
        <div className="border-t px-3 pb-3 pt-2">
          {isLoading && items.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">Loading…</p>
          ) : total === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">No items yet</p>
          ) : gridCategory ? (
            <div className="grid grid-cols-3 gap-1.5">
              {items.map((item) => (
                <MediaThumb
                  key={item._id}
                  item={item}
                  onSelect={() => onJumpToMessage?.(item._id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <MediaListRow
                  key={item._id}
                  item={item}
                  onSelect={() => onJumpToMessage?.(item._id)}
                />
              ))}
            </div>
          )}

          {hasMore ? (
            <button
              type="button"
              className="mt-2 w-full text-center text-xs font-medium text-whatsapp hover:underline"
              onClick={() => setLimit((l) => l + 12)}
            >
              Load more
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ChatMediaHistory({ conversationId, onJumpToMessage }: ChatMediaHistoryProps) {
  const { data: summary, isLoading } = useConversationMediaSummary(conversationId);
  const [expandedCategory, setExpandedCategory] = useState<MediaCategory | null>(null);

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-whatsapp" aria-hidden />
        <h4 className="text-sm font-semibold">Media</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Browse shared files in this chat. Tap an item to jump to the message.
      </p>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading media…</p>
      ) : (
        <div className="space-y-2">
          {CATEGORIES.map((category) => (
            <CategoryPanel
              key={category.id}
              conversationId={conversationId}
              category={category}
              total={summary?.[category.id] ?? 0}
              expanded={expandedCategory === category.id}
              onToggle={() =>
                setExpandedCategory((current) =>
                  current === category.id ? null : category.id
                )
              }
              onJumpToMessage={onJumpToMessage}
            />
          ))}
        </div>
      )}
    </section>
  );
}