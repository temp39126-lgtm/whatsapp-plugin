import { z } from 'zod';

export const createMessageSchema = z.object({
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'DOCUMENT']),
  content: z.object({
    text: z.string().optional(),
    caption: z.string().optional(),
  }),
  replyToMessageId: z.string().optional(),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export const deleteMessageSchema = z.object({
  scope: z.enum(['me', 'everyone']),
});

export const whatsAppAccountSchema = z.object({
  phoneNumberId: z.string().min(1),
  businessAccountId: z.string().min(1),
  displayPhoneNumber: z.string().min(1),
  accessToken: z.string().min(1),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const startCallSchema = z.object({
  conversationId: z.string().min(1),
});
