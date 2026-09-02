import {
  DEFAULT_TENANT_NOTIFICATIONS,
  ITenantSettings,
  TenantSettings,
} from '../../models/TenantSettings';
import { encrypt } from '../../utils/encryption';
import { resolveSmtpFromEmail, resolveSmtpSecure } from '../../utils/smtp';
import type {
  TenantNotificationSettingsDTO,
  UpdateTenantNotificationSettingsInput,
} from '../../types/tenantSettings';

function toDto(settings: ITenantSettings): TenantNotificationSettingsDTO {
  const notifications = settings.notifications ?? DEFAULT_TENANT_NOTIFICATIONS;
  return {
    enabled: notifications.enabled,
    smtpHost: notifications.smtpHost,
    smtpPort: notifications.smtpPort,
    smtpSecure: notifications.smtpSecure,
    smtpUser: notifications.smtpUser,
    smtpPasswordConfigured: Boolean(notifications.encryptedSmtpPassword),
    fromEmail: notifications.fromEmail,
    fromName: notifications.fromName,
    emailOnAssignment: notifications.emailOnAssignment,
    notifyAdminOnUnassigned: notifications.notifyAdminOnUnassigned,
    adminAlertEmail: notifications.adminAlertEmail,
    dailyDigestEnabled: notifications.dailyDigestEnabled,
  };
}

export async function getTenantNotificationSettings(
  tenantId: string
): Promise<TenantNotificationSettingsDTO> {
  const settings = await TenantSettings.findOne({ tenantId });
  if (!settings) {
    return {
      ...DEFAULT_TENANT_NOTIFICATIONS,
      smtpPasswordConfigured: false,
    };
  }
  return toDto(settings);
}

export async function updateTenantNotificationSettings(
  tenantId: string,
  input: UpdateTenantNotificationSettingsInput
): Promise<TenantNotificationSettingsDTO> {
  const existing = await TenantSettings.findOne({ tenantId });
  const current = existing?.notifications ?? DEFAULT_TENANT_NOTIFICATIONS;

  const nextNotifications = {
    ...current,
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.smtpHost !== undefined ? { smtpHost: input.smtpHost } : {}),
    ...(input.smtpPort !== undefined ? { smtpPort: input.smtpPort } : {}),
    ...(input.smtpSecure !== undefined ? { smtpSecure: input.smtpSecure } : {}),
    ...(input.smtpUser !== undefined ? { smtpUser: input.smtpUser } : {}),
    ...(input.fromEmail !== undefined ? { fromEmail: input.fromEmail } : {}),
    ...(input.fromName !== undefined ? { fromName: input.fromName } : {}),
    ...(input.emailOnAssignment !== undefined
      ? { emailOnAssignment: input.emailOnAssignment }
      : {}),
    ...(input.notifyAdminOnUnassigned !== undefined
      ? { notifyAdminOnUnassigned: input.notifyAdminOnUnassigned }
      : {}),
    ...(input.adminAlertEmail !== undefined ? { adminAlertEmail: input.adminAlertEmail } : {}),
    ...(input.dailyDigestEnabled !== undefined
      ? { dailyDigestEnabled: input.dailyDigestEnabled }
      : {}),
  };

  if (input.smtpPassword && input.smtpPassword.trim()) {
    nextNotifications.encryptedSmtpPassword = encrypt(input.smtpPassword.trim());
  }

  if (input.smtpHost !== undefined || input.smtpUser !== undefined) {
    nextNotifications.fromEmail = resolveSmtpFromEmail(
      nextNotifications.smtpUser,
      nextNotifications.smtpHost
    );
  }

  if (input.smtpPort !== undefined) {
    nextNotifications.smtpSecure = resolveSmtpSecure(nextNotifications.smtpPort);
  }

  if (input.enabled === undefined && input.smtpHost && input.smtpUser) {
    const hasPassword = Boolean(
      input.smtpPassword?.trim() || nextNotifications.encryptedSmtpPassword
    );
    if (hasPassword) {
      nextNotifications.enabled = true;
    }
  }

  const settings = await TenantSettings.findOneAndUpdate(
    { tenantId },
    { tenantId, notifications: nextNotifications },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return toDto(settings!);
}

export async function getTenantSettingsDocument(
  tenantId: string
): Promise<ITenantSettings | null> {
  return TenantSettings.findOne({ tenantId });
}
