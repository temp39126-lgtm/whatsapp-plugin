'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket, onSocketEvent } from '@/lib/socket';

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
