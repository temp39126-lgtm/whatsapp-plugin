import { env } from '../../config/env';
import { decrypt } from '../../utils/encryption';
import { IWhatsAppAccount } from '../../models/WhatsAppAccount';

function getBaseUrl(account?: IWhatsAppAccount): string {
  const version = account?.metaApiVersion || env.META_API_VERSION;
  return `https://graph.facebook.com/${version}`;
}

function getAccessToken(account?: IWhatsAppAccount): string {
  if (account?.encryptedAccessToken) {
    return decrypt(account.encryptedAccessToken);
  }
  return env.WHATSAPP_ACCESS_TOKEN;
}

export async function sendTextMessage(
  phoneNumberId: string,
  to: string,
  text: string,
  replyToMessageId?: string,
  account?: IWhatsAppAccount
): Promise<{ messages: Array<{ id: string }> }> {
  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text },
  };

  if (replyToMessageId) {
    body.context = { message_id: replyToMessageId };
  }

  return metaPost(`/${phoneNumberId}/messages`, body, account);
}

export async function sendMediaMessage(
  phoneNumberId: string,
  to: string,
  type: string,
  mediaId: string,
  caption?: string,
  account?: IWhatsAppAccount
): Promise<{ messages: Array<{ id: string }> }> {
  const mediaPayload: Record<string, unknown> = { id: mediaId };
  if (caption) mediaPayload.caption = caption;

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type,
    [type]: mediaPayload,
  };

  return metaPost(`/${phoneNumberId}/messages`, body, account);
}

export async function uploadMediaToMeta(
  phoneNumberId: string,
  buffer: Buffer,
  mimeType: string,
  account?: IWhatsAppAccount
): Promise<{ id: string }> {
  const token = getAccessToken(account);
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  formData.append('file', new Blob([buffer], { type: mimeType }), 'file');
  formData.append('type', mimeType);

  const response = await fetch(`${getBaseUrl(account)}/${phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meta media upload failed: ${error}`);
  }

  return response.json() as Promise<{ id: string }>;
}

export async function downloadMetaMedia(
  mediaId: string,
  account?: IWhatsAppAccount
): Promise<{ url: string; mimeType: string }> {
  const token = getAccessToken(account);
  const metaResponse = await fetch(`${getBaseUrl(account)}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaResponse.ok) throw new Error('Failed to get media URL from Meta');
  const { url, mime_type } = (await metaResponse.json()) as { url: string; mime_type: string };
  return { url, mimeType: mime_type };
}

export async function markMessageAsRead(
  phoneNumberId: string,
  messageId: string,
  account?: IWhatsAppAccount
): Promise<void> {
  await metaPost(
    `/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    },
    account
  );
}

async function metaPost(
  path: string,
  body: unknown,
  account?: IWhatsAppAccount
): Promise<{ messages: Array<{ id: string }> }> {
  const token = getAccessToken(account);
  const response = await fetch(`${getBaseUrl(account)}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meta API error: ${error}`);
  }

  return response.json() as Promise<{ messages: Array<{ id: string }> }>;
}

export async function initiateCall(
  _phoneNumberId: string,
  _to: string,
  _account?: IWhatsAppAccount
): Promise<{ call_id: string }> {
  throw new Error('CALLING_NOT_ENABLED');
}
