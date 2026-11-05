import { z } from 'zod';

const templateNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, and underscores only');

export const createAdminTemplateSchema = z.object({
  name: templateNameSchema,
  language: z.string().trim().min(2).max(10),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
  bodyText: z.string().trim().min(1).max(1024),
  headerText: z.string().trim().max(60).optional(),
  footerText: z.string().trim().max(60).optional(),
  buttons: z
    .array(
      z.discriminatedUnion('type', [
        z.object({
          type: z.literal('QUICK_REPLY'),
          text: z.string().trim().min(1).max(25),
        }),
        z.object({
          type: z.literal('URL'),
          text: z.string().trim().min(1).max(25),
          url: z.string().trim().url().max(2000),
        }),
      ])
    )
    .max(3)
    .optional(),
});

export const updateAdminTemplateSchema = z.object({
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']).optional(),
  bodyText: z.string().trim().min(1).max(1024),
  headerText: z.string().trim().max(60).optional(),
  footerText: z.string().trim().max(60).optional(),
  buttons: createAdminTemplateSchema.shape.buttons,
});

export const deleteAdminTemplateSchema = z.object({
  name: templateNameSchema,
  language: z.string().trim().min(2).max(10),
});
