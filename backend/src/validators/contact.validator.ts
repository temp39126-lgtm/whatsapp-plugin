import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(8).max(20),
});

export const updateContactSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  tags: z.array(z.string()).optional(),
});
