import { z } from 'zod';

export const assignConversationSchema = z.object({
  assignedUserId: z.union([z.string().min(1), z.null()]),
});

export const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']),
});

export const updatePrioritySchema = z.object({
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
});

export const updateTagsSchema = z.object({
  tagIds: z.array(z.string()),
});

export const createNoteSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const conversationQuerySchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']).optional(),
  assignedUserId: z.string().optional(),
  unassigned: z.coerce.boolean().optional(),
  unread: z.coerce.boolean().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  search: z.string().optional(),
  mine: z.coerce.boolean().optional(),
  groups: z.coerce.boolean().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});
