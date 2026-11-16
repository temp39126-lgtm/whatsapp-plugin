import { describe, it, expect } from 'vitest';
import { getCopyableMessageText } from './message-copy';
import type { MessageDTO } from '@/types';

function baseMessage(overrides: Partial<MessageDTO>): MessageDTO {
  return {
    _id: 'm1',
    tenantId: 't1',
    conversationId: 'c1',
    contactId: 'ct1',
    direction: 'INCOMING',
    type: 'TEXT',
    content: { text: 'hi' },
    status: 'DELIVERED',
    isPinned: false,
    isStarred: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('getCopyableMessageText', () => {
  it('copies plain text', () => {
    expect(getCopyableMessageText(baseMessage({ content: { text: 'Hey' } }))).toBe('Hey');
  });

  it('does not expose media API URLs as copy text', () => {
    expect(
      getCopyableMessageText(
        baseMessage({
          type: 'IMAGE',
          content: {},
          media: {
            _id: 'media1',
            mediaType: 'IMAGE',
            mimeType: 'image/webp',
            url: '/api/whatsapp/messages/abc123/media',
          },
        })
      )
    ).toBeNull();
  });

  it('copies template preview', () => {
    expect(
      getCopyableMessageText(
        baseMessage({
          type: 'TEMPLATE',
          content: { preview: 'Template: hello_world', templateName: 'hello_world' },
        })
      )
    ).toBe('Template: hello_world');
  });
});