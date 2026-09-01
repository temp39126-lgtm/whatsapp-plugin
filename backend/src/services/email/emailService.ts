import nodemailer from 'nodemailer';
import { decrypt } from '../../utils/encryption';
import { logger } from '../../config/logger';
import { User } from '../../models/User';
import { DEFAULT_TENANT_NOTIFICATIONS, ITenantSettings } from '../../models/TenantSettings';
import { getTenantSettingsDocument } from '../settings/tenantSettingsService';

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function getNotificationConfig(settings: ITenantSettings | null) {
  const notifications = settings?.notifications ?? DEFAULT_TENANT_NOTIFICATIONS;
  if (!notifications.enabled) return null;
  if (!notifications.smtpHost || !notifications.fromEmail || !notifications.encryptedSmtpPassword) {
    return null;
  }
  return notifications;
}

async function sendTenantEmail(
  settings: ITenantSettings | null,
  options: SendEmailOptions
): Promise<boolean> {
  const notifications = getNotificationConfig(settings);
  if (!notifications) return false;

  try {
    const transporter = nodemailer.createTransport({
      host: notifications.smtpHost,
      port: notifications.smtpPort,
      secure: notifications.smtpSecure,
      auth: {
        user: notifications.smtpUser,
        pass: decrypt(notifications.encryptedSmtpPassword!),
      },
    });

    await transporter.sendMail({
      from: notifications.fromName
        ? `"${notifications.fromName}" <${notifications.fromEmail}>`
        : notifications.fromEmail,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to send tenant email');
    return false;
  }
}

export async function sendTestNotificationEmail(
  tenantId: string,
  recipientEmail: string
): Promise<void> {
  const settings = await getTenantSettingsDocument(tenantId);
  const sent = await sendTenantEmail(settings, {
    to: recipientEmail,
    subject: 'WhatsApp CRM test notification',
    text: 'This is a test email from your WhatsApp CRM notification settings.',
    html: '<p>This is a test email from your WhatsApp CRM notification settings.</p>',
  });

  if (!sent) {
    throw new Error('Unable to send test email. Check SMTP settings and enable notifications.');
  }
}

export async function sendAssignmentNotificationEmail(params: {
  tenantId: string;
  assigneeUserId: string;
  conversationLabel: string;
  assignedByName: string;
}): Promise<void> {
  const settings = await getTenantSettingsDocument(params.tenantId);
  const notifications = settings?.notifications ?? DEFAULT_TENANT_NOTIFICATIONS;

  if (!notifications.enabled || !notifications.emailOnAssignment) return;

  const assignee = await User.findOne({
    _id: params.assigneeUserId,
    tenantId: params.tenantId,
    isActive: true,
  });

  if (!assignee) return;

  const agentPref = assignee.preferences?.notifications?.emailOnAssignment;
  if (agentPref === false) return;

  await sendTenantEmail(settings, {
    to: assignee.email,
    subject: `New conversation assigned: ${params.conversationLabel}`,
    text: `${params.assignedByName} assigned you a conversation: ${params.conversationLabel}. Open the inbox to respond.`,
    html: `<p><strong>${params.assignedByName}</strong> assigned you a conversation: <strong>${params.conversationLabel}</strong>.</p><p>Open the inbox to respond.</p>`,
  });
}

export async function sendUnassignedAlertEmail(params: {
  tenantId: string;
  conversationLabel: string;
}): Promise<void> {
  const settings = await getTenantSettingsDocument(params.tenantId);
  const notifications = settings?.notifications ?? DEFAULT_TENANT_NOTIFICATIONS;

  if (!notifications.enabled || !notifications.notifyAdminOnUnassigned) return;
  if (!notifications.adminAlertEmail) return;

  await sendTenantEmail(settings, {
    to: notifications.adminAlertEmail,
    subject: `Unassigned conversation: ${params.conversationLabel}`,
    text: `A new unassigned conversation needs attention: ${params.conversationLabel}.`,
    html: `<p>A new unassigned conversation needs attention: <strong>${params.conversationLabel}</strong>.</p>`,
  });
}
