import { z } from 'zod';

export const updateWhatsAppAccountSchema = z.object({
  phoneNumberId: z.string().min(1),
  businessAccountId: z.string().min(1),
  displayPhoneNumber: z.string().min(1),
  accessToken: z.string().min(1).optional(),
});

export const updateTenantNotificationSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  fromEmail: z.string().email().optional().or(z.literal('')),
  fromName: z.string().max(100).optional(),
  emailOnAssignment: z.boolean().optional(),
  notifyAdminOnUnassigned: z.boolean().optional(),
  adminAlertEmail: z.string().email().optional().or(z.literal('')),
  dailyDigestEnabled: z.boolean().optional(),
});

export const testNotificationEmailSchema = z.object({
  recipientEmail: z.string().email().optional(),
});
