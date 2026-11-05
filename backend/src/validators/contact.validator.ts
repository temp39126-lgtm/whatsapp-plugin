import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(8).max(20),
  sendWelcomeWhatsAppTemplate: z.boolean().optional().default(false),
});

export const updateContactSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().min(8).max(20).optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine((data) => data.name !== undefined || data.phone !== undefined || data.tags !== undefined, {
    message: 'Provide at least one field to update',
  });
