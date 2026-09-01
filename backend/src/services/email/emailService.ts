import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.EMAIL_FROM);
}

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }

  return transporter;
}

export interface AssignmentEmailParams {
  toEmail: string;
  toName: string;
  assignedByName: string;
  conversationLabel: string;
  conversationId: string;
}

export type EmailSendResult =
  | { sent: true }
  | { sent: false; reason: 'not_configured' | 'send_failed' | 'disabled_by_user' };

export async function sendConversationAssignmentEmail(
  params: AssignmentEmailParams
): Promise<Exclude<EmailSendResult, { reason: 'disabled_by_user' }>> {
  const transport = getTransporter();
  if (!transport) {
    return { sent: false, reason: 'not_configured' };
  }

  const inboxUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/whatsapp/inbox?conversation=${params.conversationId}`;
  const subject = `Chat assigned to you: ${params.conversationLabel}`;

  const text = [
    `Hi ${params.toName},`,
    '',
    `${params.assignedByName} assigned a WhatsApp conversation to you.`,
    '',
    `Conversation: ${params.conversationLabel}`,
    `Open in inbox: ${inboxUrl}`,
    '',
    'You can turn off assignment emails in Settings → Notifications.',
  ].join('\n');

  const html = `
    <p>Hi ${escapeHtml(params.toName)},</p>
    <p><strong>${escapeHtml(params.assignedByName)}</strong> assigned a WhatsApp conversation to you.</p>
    <p><strong>Conversation:</strong> ${escapeHtml(params.conversationLabel)}</p>
    <p><a href="${escapeHtml(inboxUrl)}">Open conversation in inbox</a></p>
    <p style="color:#666;font-size:12px;">You can turn off assignment emails in Settings → Notifications.</p>
  `;

  try {
    await transport.sendMail({
      from: env.EMAIL_FROM,
      to: params.toEmail,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    logger.error({ err: error, to: params.toEmail }, 'Failed to send assignment email');
    return { sent: false, reason: 'send_failed' };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getEmailConfigStatus() {
  return {
    configured: isEmailConfigured(),
    smtpHost: env.SMTP_HOST || null,
    smtpPort: env.SMTP_PORT,
    fromAddress: env.EMAIL_FROM || null,
    frontendUrl: env.FRONTEND_URL,
    authConfigured: Boolean(env.SMTP_USER && env.SMTP_PASS),
  };
}
