import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  contactIds: z.array(z.string().min(1)).min(1),
});

export const createCommunitySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  groupIds: z.array(z.string().min(1)).optional(),
});
