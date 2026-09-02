import nodemailer from 'nodemailer';
import { decrypt } from '../../utils/encryption';
import { resolveSmtpFromEmail } from '../../utils/smtp';
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
  if (!notifications.smtpHost || !notifications.smtpUser || !notifications.encryptedSmtpPassword) {
    return null;
  }
  return notifications;
}

function getFromAddress(notifications: ITenantSettings['notifications']) {
  const fromEmail =
    notifications.fromEmail.trim() ||
    resolveSmtpFromEmail(notifications.smtpUser, notifications.smtpHost);

  return notifications.fromName
    ? `"${notifications.fromName}" <${fromEmail}>`
    : fromEmail;
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
      from: getFromAddress(notifications),
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

export async function isTenantEmailConfigured(tenantId: string): Promise<boolean> {
  const settings = await getTenantSettingsDocument(tenantId);
  const notifications = settings?.notifications ?? DEFAULT_TENANT_NOTIFICATIONS;
  return Boolean(
    notifications.enabled &&
      notifications.smtpHost &&
      notifications.smtpUser &&
      notifications.encryptedSmtpPassword
  );
}

export async function sendOtpEmail(params: {
  tenantId: string;
  to: string;
  name?: string;
  code: string;
  purposeLabel: string;
  expiresMinutes: number;
}): Promise<boolean> {
  const settings = await getTenantSettingsDocument(params.tenantId);
  const greeting = params.name ? `Hi ${params.name},` : 'Hi,';

  return sendTenantEmail(settings, {
    to: params.to,
    subject: `Your WhatsApp CRM verification code: ${params.code}`,
    text: [
      greeting,
      '',
      `Use this code to ${params.purposeLabel}: ${params.code}`,
      '',
      `This code expires in ${params.expiresMinutes} minutes.`,
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <p>${greeting}</p>
      <p>Use this code to <strong>${params.purposeLabel}</strong>:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${params.code}</p>
      <p>This code expires in ${params.expiresMinutes} minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(params: {
  tenantId: string;
  to: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  const settings = await getTenantSettingsDocument(params.tenantId);
  const subject = 'Reset your WhatsApp CRM password';
  const text = [
    `Hi ${params.name},`,
    '',
    'We received a request to reset your password.',
    `Open this link to choose a new password (expires in 1 hour):`,
    params.resetUrl,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');
  const html = `
    <p>Hi ${params.name},</p>
    <p>We received a request to reset your password.</p>
    <p><a href="${params.resetUrl}">Reset your password</a></p>
    <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
  `;

  return sendTenantEmail(settings, {
    to: params.to,
    subject,
    text,
    html,
  });
}
