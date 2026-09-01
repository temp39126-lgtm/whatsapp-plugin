import { z } from 'zod';

export const updateWhatsAppAccountSchema = z.object({
  metaAppId: z.string().min(1, 'Meta App ID is required'),
  appSecret: z.string().min(1).optional(),
  businessAccountId: z.string().min(1, 'WhatsApp Business Account ID is required'),
  phoneNumberId: z.string().min(1, 'Phone Number ID is required'),
  displayPhoneNumber: z.string().min(1, 'Display phone number is required'),
  accessToken: z.string().min(1).optional(),
  webhookVerifyToken: z.string().min(1, 'Webhook verify token is required'),
  metaApiVersion: z.string().min(1, 'Meta API version is required').default('v21.0'),
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
