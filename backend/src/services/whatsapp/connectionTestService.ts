import { env } from '../../config/env';
import { encrypt } from '../../utils/encryption';
import { IWhatsAppAccount } from '../../models/WhatsAppAccount';
import { metaGet } from './metaApi';

export type ConnectionCheckStatus = 'pass' | 'fail' | 'warn';

export interface ConnectionCheck {
  id: string;
  label: string;
  status: ConnectionCheckStatus;
  message: string;
}

export interface ConnectionTestResult {
  success: boolean;
  checkedAt: string;
  checks: ConnectionCheck[];
}

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function parseMetaErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string; code?: number; type?: string };
    };
    const message = parsed.error?.message;
    if (message) {
      return message;
    }
  } catch {
    // use raw text
  }
  return raw.length > 240 ? `${raw.slice(0, 240)}…` : raw;
}

function buildEphemeralAccount(
  saved: IWhatsAppAccount,
  overrides: TestConnectionOverrides
): IWhatsAppAccount {
  const base = typeof saved.toObject === 'function' ? saved.toObject() : { ...saved };
  return {
    ...base,
    phoneNumberId: overrides.phoneNumberId?.trim() || saved.phoneNumberId,
    businessAccountId: overrides.businessAccountId?.trim() || saved.businessAccountId,
    displayPhoneNumber: overrides.displayPhoneNumber?.trim() || saved.displayPhoneNumber,
    metaApiVersion: overrides.metaApiVersion?.trim() || saved.metaApiVersion,
    webhookVerifyToken: overrides.webhookVerifyToken?.trim() || saved.webhookVerifyToken,
    ...(overrides.accessToken?.trim()
      ? { encryptedAccessToken: encrypt(overrides.accessToken.trim()) }
      : {}),
  } as IWhatsAppAccount;
}

export interface TestConnectionOverrides {
  phoneNumberId?: string;
  businessAccountId?: string;
  displayPhoneNumber?: string;
  accessToken?: string;
  metaApiVersion?: string;
  webhookVerifyToken?: string;
}

export async function testWhatsAppConnection(
  account: IWhatsAppAccount,
  overrides: TestConnectionOverrides = {},
  webhookUrl?: string
): Promise<ConnectionTestResult> {
  const checks: ConnectionCheck[] = [];
  const effective = buildEphemeralAccount(account, overrides);
  const phoneNumberId = effective.phoneNumberId;
  const businessAccountId = effective.businessAccountId;
  const displayPhoneNumber = effective.displayPhoneNumber;
  const verifyToken = effective.webhookVerifyToken.trim();

  if (!account.encryptedAccessToken && !overrides.accessToken?.trim()) {
    checks.push({
      id: 'access_token',
      label: 'Access token',
      status: 'fail',
      message: 'No access token saved. Paste a permanent token and save, or enter one before testing.',
    });
    return { success: false, checkedAt: new Date().toISOString(), checks };
  }

  if (!account.encryptedAppSecret) {
    checks.push({
      id: 'app_secret',
      label: 'App secret',
      status: 'fail',
      message: 'Meta App Secret is not saved. Incoming webhooks will be rejected until you save it.',
    });
  } else {
    checks.push({
      id: 'app_secret',
      label: 'App secret',
      status: 'pass',
      message: 'App secret is stored (required for webhook signature verification).',
    });
  }

  if (!verifyToken) {
    checks.push({
      id: 'webhook_verify_token',
      label: 'Webhook verify token',
      status: 'fail',
      message: 'Webhook verify token is empty in CRM settings.',
    });
  } else if (env.META_VERIFY_TOKEN && verifyToken !== env.META_VERIFY_TOKEN) {
    checks.push({
      id: 'webhook_verify_token',
      label: 'Webhook verify token',
      status: 'warn',
      message:
        'CRM verify token differs from server META_VERIFY_TOKEN. Meta can still verify if you used the CRM value in Meta.',
    });
  } else {
    checks.push({
      id: 'webhook_verify_token',
      label: 'Webhook verify token',
      status: 'pass',
      message:
        env.META_VERIFY_TOKEN && verifyToken === env.META_VERIFY_TOKEN
          ? 'Verify token matches server configuration.'
          : 'Verify token is set.',
    });
  }

  if (webhookUrl) {
    try {
      const url = new URL(webhookUrl);
      url.searchParams.set('hub.mode', 'subscribe');
      url.searchParams.set('hub.verify_token', verifyToken);
      url.searchParams.set('hub.challenge', 'connection-test-challenge');
      const response = await fetch(url.toString(), { method: 'GET' });
      const body = await response.text();
      if (response.status === 200 && body === 'connection-test-challenge') {
        checks.push({
          id: 'webhook_endpoint',
          label: 'Webhook URL (live check)',
          status: 'pass',
          message: 'Callback URL responded to Meta-style verification.',
        });
      } else {
        checks.push({
          id: 'webhook_endpoint',
          label: 'Webhook URL (live check)',
          status: 'fail',
          message: `Webhook returned HTTP ${response.status}. Expected 200 with challenge echo. Check URL and verify token on the server.`,
        });
      }
    } catch (error) {
      checks.push({
        id: 'webhook_endpoint',
        label: 'Webhook URL (live check)',
        status: 'fail',
        message:
          error instanceof Error
            ? `Could not reach webhook URL: ${error.message}`
            : 'Could not reach webhook URL.',
      });
    }
  }

  type PhoneNumberMeta = {
    id?: string;
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
  };

  let phoneMeta: PhoneNumberMeta | null = null;
  try {
    phoneMeta = await metaGet<PhoneNumberMeta>(`/${phoneNumberId}`, effective, {
      fields: 'id,display_phone_number,verified_name,quality_rating',
    });
    checks.push({
      id: 'access_token',
      label: 'Access token & Phone Number ID',
      status: 'pass',
      message: phoneMeta.verified_name
        ? `Meta returned number "${phoneMeta.display_phone_number ?? phoneNumberId}" (${phoneMeta.verified_name}).`
        : `Meta accepted Phone Number ID ${phoneNumberId}.`,
    });
  } catch (error) {
    const detail = parseMetaErrorMessage(error instanceof Error ? error.message : String(error));
    const hint =
      detail.includes('Object with ID') || detail.includes('does not exist')
        ? ' Phone Number ID may be wrong (check every digit in Meta → Production setup).'
        : detail.includes('Invalid OAuth') || detail.includes('expired')
          ? ' Generate a new permanent access token in Meta.'
          : '';
    checks.push({
      id: 'access_token',
      label: 'Access token & Phone Number ID',
      status: 'fail',
      message: `${detail}${hint}`,
    });
  }

  if (phoneMeta?.display_phone_number && displayPhoneNumber) {
    const metaDigits = normalizePhoneDigits(phoneMeta.display_phone_number);
    const crmDigits = normalizePhoneDigits(displayPhoneNumber);
    if (metaDigits && crmDigits && metaDigits !== crmDigits) {
      checks.push({
        id: 'display_phone',
        label: 'Display phone number',
        status: 'warn',
        message: `CRM has ${displayPhoneNumber} but Meta reports ${phoneMeta.display_phone_number}.`,
      });
    } else {
      checks.push({
        id: 'display_phone',
        label: 'Display phone number',
        status: 'pass',
        message: `Matches Meta: ${phoneMeta.display_phone_number}.`,
      });
    }
  }

  if (phoneMeta && phoneMeta.id && phoneMeta.id !== phoneNumberId) {
    checks.push({
      id: 'phone_id_match',
      label: 'Phone Number ID match',
      status: 'fail',
      message: `Meta returned a different id (${phoneMeta.id}). Update CRM to match Meta exactly.`,
    });
  }

  type WabaPhones = { data?: Array<{ id: string; display_phone_number?: string }> };
  try {
    const wabaPhones = await metaGet<WabaPhones>(`/${businessAccountId}/phone_numbers`, effective, {
      fields: 'id,display_phone_number',
    });
    const ids = (wabaPhones.data ?? []).map((entry) => entry.id);
    if (ids.includes(phoneNumberId)) {
      checks.push({
        id: 'waba',
        label: 'WhatsApp Business Account',
        status: 'pass',
        message: `Phone Number ID is linked to WABA ${businessAccountId}.`,
      });
    } else if (ids.length === 0) {
      checks.push({
        id: 'waba',
        label: 'WhatsApp Business Account',
        status: 'warn',
        message: `Token can read WABA ${businessAccountId} but no phone numbers were returned.`,
      });
    } else {
      checks.push({
        id: 'waba',
        label: 'WhatsApp Business Account',
        status: 'fail',
        message: `Phone Number ID ${phoneNumberId} is not under WABA ${businessAccountId}. Numbers on this WABA: ${ids.join(', ')}. Use the WABA ID shown in Meta Production setup.`,
      });
    }
  } catch (error) {
    const detail = parseMetaErrorMessage(error instanceof Error ? error.message : String(error));
    checks.push({
      id: 'waba',
      label: 'WhatsApp Business Account',
      status: 'fail',
      message: detail,
    });
  }

  const success = checks.every((check) => check.status !== 'fail');
  return { success, checkedAt: new Date().toISOString(), checks };
}
