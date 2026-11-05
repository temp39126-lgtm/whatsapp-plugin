import { env } from '../../config/env';
import { decrypt } from '../../utils/encryption';
import { IWhatsAppAccount } from '../../models/WhatsAppAccount';

export class MetaApiError extends Error {
  code?: number;
  title?: string;
  details?: string;

  constructor(data: {
    message: string;
    code?: number;
    title?: string;
    details?: string;
  }) {
    super(data.message);
    this.name = 'MetaApiError';
    this.code = data.code;
    this.title = data.title;
    this.details = data.details;
  }
}

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

export async function sendTemplateMessage(
  phoneNumberId: string,
  to: string,
  templateName: string,
  languageCode: string,
  account?: IWhatsAppAccount,
  components: Array<Record<string, unknown>> = []
): Promise<{ messages: Array<{ id: string }> }> {
  return metaJsonPost(
    `/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length > 0 ? { components } : {}),
      },
    },
    account
  );
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
  return metaJsonPost(path, body, account) as Promise<{ messages: Array<{ id: string }> }>;
}

export async function metaDelete<T = Record<string, unknown>>(
  path: string,
  account?: IWhatsAppAccount,
  query?: Record<string, string>
): Promise<T> {
  const token = getAccessToken(account);
  const url = new URL(`${getBaseUrl(account)}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const payload = JSON.parse(errorText) as {
        error?: {
          code?: number;
          message?: string;
          type?: string;
          error_data?: { details?: string };
        };
      };
      if (payload.error) {
        throw new MetaApiError({
          code: payload.error.code,
          title: payload.error.type,
          message: payload.error.message || 'Meta API request failed',
          details: payload.error.error_data?.details,
        });
      }
    } catch (error) {
      if (error instanceof MetaApiError) throw error;
    }
    throw new Error(`Meta API error: ${errorText}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export { metaJsonPost };

export async function metaGet<T = Record<string, unknown>>(
  path: string,
  account?: IWhatsAppAccount,
  query?: Record<string, string>
): Promise<T> {
  const token = getAccessToken(account);
  const url = new URL(`${getBaseUrl(account)}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const payload = JSON.parse(errorText) as {
        error?: {
          code?: number;
          message?: string;
          type?: string;
          error_data?: { details?: string };
        };
      };
      if (payload.error) {
        throw new MetaApiError({
          code: payload.error.code,
          title: payload.error.type,
          message: payload.error.message || 'Meta API request failed',
          details: payload.error.error_data?.details,
        });
      }
    } catch (error) {
      if (error instanceof MetaApiError) throw error;
    }
    throw new Error(`Meta API error: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

type MetaTemplatePage<T> = {
  data?: T[];
  paging?: { cursors?: { after?: string } };
};

/** Fetch all WABA message templates (follows Meta cursor pagination). */
export async function fetchAllMessageTemplates<T extends object>(
  businessAccountId: string,
  account: IWhatsAppAccount | undefined,
  fields: string,
  pageLimit = '100'
): Promise<T[]> {
  const collected: T[] = [];
  let after: string | undefined;

  for (let page = 0; page < 50; page += 1) {
    const query: Record<string, string> = { fields, limit: pageLimit };
    if (after) {
      query.after = after;
    }

    const response = await metaGet<MetaTemplatePage<T>>(
      `/${businessAccountId}/message_templates`,
      account,
      query
    );

    const batch = response.data ?? [];
    collected.push(...batch);

    const next = response.paging?.cursors?.after;
    if (!next || batch.length === 0) {
      break;
    }
    after = next;
  }

  return collected;
}

async function metaJsonPost<T = Record<string, unknown>>(
  path: string,
  body: unknown,
  account?: IWhatsAppAccount
): Promise<T> {
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
    const errorText = await response.text();

    try {
      const payload = JSON.parse(errorText) as {
        error?: {
          code?: number;
          message?: string;
          type?: string;
          error_data?: { details?: string };
        };
      };

      if (payload.error) {
        throw new MetaApiError({
          code: payload.error.code,
          title: payload.error.type,
          message: payload.error.message || 'Meta API request failed',
          details: payload.error.error_data?.details,
        });
      }
    } catch (error) {
      if (error instanceof MetaApiError) throw error;
    }

    throw new Error(`Meta API error: ${errorText}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export async function enableCallingOnPhoneNumber(
  phoneNumberId: string,
  account?: IWhatsAppAccount
): Promise<void> {
  await metaJsonPost(
    `/${phoneNumberId}/settings`,
    {
      calling: {
        status: 'ENABLED',
      },
    },
    account
  );
}

export async function initiateCall(
  phoneNumberId: string,
  to: string,
  account?: IWhatsAppAccount,
  session?: { sdp_type: 'offer'; sdp: string }
): Promise<{ call_id: string }> {
  if (!session?.sdp) {
    throw new Error('CALL_SDP_REQUIRED');
  }

  return metaJsonPost<{ call_id: string }>(
    `/${phoneNumberId}/calls`,
    {
      messaging_product: 'whatsapp',
      to,
      action: 'connect',
      session,
    },
    account
  );
}

export async function acceptMetaCall(
  phoneNumberId: string,
  callId: string,
  account?: IWhatsAppAccount,
  session?: { sdp_type: 'answer'; sdp: string }
): Promise<void> {
  await metaJsonPost(
    `/${phoneNumberId}/calls`,
    {
      messaging_product: 'whatsapp',
      call_id: callId,
      action: 'accept',
      ...(session ? { session } : {}),
    },
    account
  );
}

export async function rejectMetaCall(
  phoneNumberId: string,
  callId: string,
  account?: IWhatsAppAccount
): Promise<void> {
  await metaJsonPost(
    `/${phoneNumberId}/calls`,
    {
      messaging_product: 'whatsapp',
      call_id: callId,
      action: 'reject',
    },
    account
  );
}

export async function terminateMetaCall(
  phoneNumberId: string,
  callId: string,
  account?: IWhatsAppAccount
): Promise<void> {
  await metaJsonPost(
    `/${phoneNumberId}/calls`,
    {
      messaging_product: 'whatsapp',
      call_id: callId,
      action: 'terminate',
    },
    account
  );
}
