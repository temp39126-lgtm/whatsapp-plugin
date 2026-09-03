'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserProfile } from '@/hooks/useProfile';
import { onSocketEvent } from '@/lib/socket';
import {
  getMessagePreview,
  notifyConversationAssigned,
  notifyIncomingMessage,
} from '@/lib/notifications';
import { DEFAULT_USER_PREFERENCES } from '@shared/types/preferences';

type SocketMessage = {
  direction?: 'INCOMING' | 'OUTGOING';
  type?: string;
  content?: unknown;
};

export function useNotificationAlerts() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();

  useEffect(() => {
    if (!user) return;

    const preferences =
      profile?.preferences.notifications ?? DEFAULT_USER_PREFERENCES.notifications;

    const unsubscribeMessage = onSocketEvent('message.created', (data) => {
      const payload = data as {
        conversationId?: string;
        message?: SocketMessage;
      };

      if (!payload.conversationId || payload.message?.direction !== 'INCOMING') {
        return;
      }

      notifyIncomingMessage(preferences, {
        conversationId: payload.conversationId,
        preview: getMessagePreview(payload.message.content, payload.message.type),
      });
    });

    const unsubscribeAssigned = onSocketEvent('conversation.assigned', (data) => {
      const payload = data as {
        assignedUserId?: string;
        conversationLabel?: string;
      };

      if (payload.assignedUserId !== user.userId) return;

      notifyConversationAssigned(preferences, {
        conversationLabel: payload.conversationLabel,
      });
    });

    return () => {
      unsubscribeMessage();
      unsubscribeAssigned();
    };
  }, [profile?.preferences.notifications, user]);
}
