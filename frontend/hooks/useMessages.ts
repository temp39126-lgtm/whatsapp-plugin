'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MessageDTO, PaginatedResponse } from '@/types';

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () =>
      api.get<PaginatedResponse<MessageDTO>>(`/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
    refetchInterval: false,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      text,
      replyToMessageId,
    }: {
      conversationId: string;
      text: string;
      replyToMessageId?: string;
    }) =>
      api.post<MessageDTO>(`/conversations/${conversationId}/messages`, {
        type: 'TEXT',
        content: { text },
        replyToMessageId,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => api.post(`/messages/${messageId}/pin`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });
}

export function useToggleStar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => api.post(`/messages/${messageId}/star`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });
}

export function useAddReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      api.post(`/messages/${messageId}/reactions`, { emoji }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });
}

export function useRetryMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => api.post(`/messages/${messageId}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });
}

export function usePinnedMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['pinned', conversationId],
    queryFn: () => api.get<MessageDTO[]>(`/conversations/${conversationId}/pinned`),
    enabled: !!conversationId,
  });
}

export function useStarredMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['starred', conversationId],
    queryFn: () => api.get<MessageDTO[]>(`/conversations/${conversationId}/starred`),
    enabled: !!conversationId,
  });
}
