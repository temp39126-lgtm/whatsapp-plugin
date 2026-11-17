'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types';

export type MediaCategory = 'images' | 'videos' | 'audio' | 'files' | 'location';

export type ConversationMediaSummary = Record<MediaCategory, number>;

export type ConversationMediaItem = {
  _id: string;
  type: string;
  direction: string;
  createdAt: string;
  content: unknown;
  media?: {
    fileName?: string;
    mimeType?: string;
    mediaType?: string;
    url?: string;
  };
};

export function useConversationMediaSummary(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation-media-summary', conversationId],
    queryFn: () =>
      api.get<ConversationMediaSummary>(`/conversations/${conversationId!}/media/summary`),
    enabled: Boolean(conversationId),
  });
}

export function useConversationMediaList(
  conversationId: string | null,
  category: MediaCategory | null,
  limit: number
) {
  return useQuery({
    queryKey: ['conversation-media', conversationId, category, limit],
    queryFn: () =>
      api.get<PaginatedResponse<ConversationMediaItem>>(
        `/conversations/${conversationId!}/media`,
        { category: category!, page: 1, limit }
      ),
    enabled: Boolean(conversationId && category),
  });
}