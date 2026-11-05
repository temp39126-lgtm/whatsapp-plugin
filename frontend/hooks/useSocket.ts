'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket, onSocketEvent, resetSocket } from '@/lib/socket';
import type { PaginatedResponse } from '@/types';

export function useSocket() {
  const queryClient = useQueryClient();

  const invalidateConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [queryClient]);

  const invalidateMessages = useCallback(
    (conversationId?: string) => {
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      }
    },
    [queryClient]
  );

  useEffect(() => {
    connectSocket();

    const unsubscribers = [
      onSocketEvent('message.created', (data) => {
        const payload = data as { conversationId?: string };
        invalidateMessages(payload.conversationId);
        invalidateConversations();
      }),
      onSocketEvent('message.status.updated', (data) => {
        const payload = data as { messageId?: string; conversationId?: string };
        invalidateMessages(payload.conversationId);
      }),
      onSocketEvent('message.updated', () => invalidateMessages()),
      onSocketEvent('conversation.updated', invalidateConversations),
      onSocketEvent('conversation.created', invalidateConversations),
      onSocketEvent('conversation.assigned', invalidateConversations),
      onSocketEvent('conversation.unassigned', (data) => {
        const payload = data as { conversationId?: string };
        if (payload.conversationId) {
          queryClient.setQueriesData<PaginatedResponse<{ _id: string }>>(
            { queryKey: ['conversations'] },
            (current) => {
              if (!current?.data) return current;
              return {
                ...current,
                data: current.data.filter((item) => item._id !== payload.conversationId),
              };
            }
          );
          queryClient.removeQueries({ queryKey: ['conversation', payload.conversationId] });
          queryClient.removeQueries({ queryKey: ['messages', payload.conversationId] });
        }
        invalidateConversations();
      }),
      onSocketEvent('contact.deleted', () => {
        invalidateConversations();
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      }),
      onSocketEvent('call.incoming', () => queryClient.invalidateQueries({ queryKey: ['calls'] })),
      onSocketEvent('call.ended', () => queryClient.invalidateQueries({ queryKey: ['calls'] })),
      onSocketEvent('call.sdp-answer', () => queryClient.invalidateQueries({ queryKey: ['calls'] })),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      disconnectSocket();
    };
  }, [invalidateConversations, invalidateMessages, queryClient]);
}
