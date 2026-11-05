import { AuthUser, AppError } from '../../types';
import { WhatsAppAccount } from '../../models/WhatsAppAccount';
import { metaDelete, fetchAllMessageTemplates, metaJsonPost } from '../whatsapp/metaApi';
import { metaFailureToAppError } from '../whatsapp/metaErrors';

export type AdminTemplateDTO = {
  id: string;
  name: string;
  language: string;
  category?: string;
  status: string;
  components: Array<Record<string, unknown>>;
  rejectedReason?: string;
  bodyPreview?: string;
};

type MetaTemplateRecord = {
  id?: string;
  name: string;
  status: string;
  language: string;
  category?: string;
  components?: Array<Record<string, unknown>>;
  rejected_reason?: string;
};

async function getConnectedAccount(tenantId: string) {
  const account = await WhatsAppAccount.findOne({ tenantId });
  if (!account) {
    throw new AppError(400, 'WhatsApp is not configured. Set Meta Cloud API in Settings.');
  }
  if (account.connectionStatus !== 'CONNECTED' || !account.businessAccountId) {
    throw new AppError(400, 'WhatsApp Business Account is not connected.');
  }
  if (
    account.businessAccountId.startsWith('demo-') ||
    account.phoneNumberId.startsWith('demo-')
  ) {
    throw new AppError(
      400,
      'This workspace still uses demo Meta credentials. Open Settings → Meta Cloud API, enter your real Phone Number ID, WhatsApp Business Account ID, and permanent access token, then save and refresh Templates.'
    );
  }
  return account;
}

function bodyPreviewFromComponents(components?: Array<Record<string, unknown>>): string | undefined {
  const body = components?.find((c) => String(c.type).toUpperCase() === 'BODY');
  const text = body?.text;
  return typeof text === 'string' ? text : undefined;
}

function mapTemplate(record: MetaTemplateRecord): AdminTemplateDTO {
  return {
    id: String(record.id ?? ''),
    name: record.name,
    language: record.language,
    category: record.category,
    status: record.status,
    components: record.components ?? [],
    rejectedReason: record.rejected_reason,
    bodyPreview: bodyPreviewFromComponents(record.components),
  };
}

function buildComponents(input: {
  bodyText: string;
  headerText?: string;
  footerText?: string;
  buttons?: Array<
    | { type: 'QUICK_REPLY'; text: string }
    | { type: 'URL'; text: string; url: string }
  >;
}): Array<Record<string, unknown>> {
  const components: Array<Record<string, unknown>> = [];

  if (input.headerText?.trim()) {
    components.push({
      type: 'HEADER',
      format: 'TEXT',
      text: input.headerText.trim(),
    });
  }

  components.push({
    type: 'BODY',
    text: input.bodyText.trim(),
  });

  if (input.footerText?.trim()) {
    components.push({
      type: 'FOOTER',
      text: input.footerText.trim(),
    });
  }

  if (input.buttons && input.buttons.length > 0) {
    components.push({
      type: 'BUTTONS',
      buttons: input.buttons.map((button) =>
        button.type === 'URL'
          ? { type: 'URL', text: button.text, url: button.url }
          : { type: 'QUICK_REPLY', text: button.text }
      ),
    });
  }

  return components;
}

export async function listAdminTemplates(user: AuthUser): Promise<AdminTemplateDTO[]> {
  const account = await getConnectedAccount(user.tenantId);

  try {
    const records = await fetchAllMessageTemplates<MetaTemplateRecord>(
      account.businessAccountId,
      account,
      'id,name,status,language,category,components,rejected_reason'
    );

    return records.map(mapTemplate).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    metaFailureToAppError(error, 'Meta template request failed');
  }
}

export async function createAdminTemplate(
  user: AuthUser,
  input: {
    name: string;
    language: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    bodyText: string;
    headerText?: string;
    footerText?: string;
    buttons?: Array<
      | { type: 'QUICK_REPLY'; text: string }
      | { type: 'URL'; text: string; url: string }
    >;
  }
): Promise<AdminTemplateDTO> {
  const account = await getConnectedAccount(user.tenantId);

  try {
    await metaJsonPost(
      `/${account.businessAccountId}/message_templates`,
      {
        name: input.name,
        language: input.language,
        category: input.category,
        components: buildComponents(input),
      },
      account
    );
  } catch (error) {
    metaFailureToAppError(error, 'Meta template request failed');
  }

  const templates = await listAdminTemplates(user);
  const created = templates.find(
    (item) => item.name === input.name && item.language === input.language
  );
  if (!created) {
    throw new AppError(
      502,
      'Template submitted to Meta. Refresh the list in a moment to see approval status.'
    );
  }
  return created;
}

export async function updateAdminTemplate(
  user: AuthUser,
  templateId: string,
  input: {
    category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    bodyText: string;
    headerText?: string;
    footerText?: string;
    buttons?: Array<
      | { type: 'QUICK_REPLY'; text: string }
      | { type: 'URL'; text: string; url: string }
    >;
  }
): Promise<AdminTemplateDTO> {
  const account = await getConnectedAccount(user.tenantId);

  const payload: Record<string, unknown> = {
    components: buildComponents(input),
  };
  if (input.category) {
    payload.category = input.category;
  }

  try {
    await metaJsonPost(`/${templateId}`, payload, account);
  } catch (error) {
    metaFailureToAppError(error, 'Meta template request failed');
  }

  const templates = await listAdminTemplates(user);
  const updated = templates.find((item) => item.id === templateId);
  if (!updated) {
    throw new AppError(502, 'Template updated on Meta. Refresh the list to see the latest status.');
  }
  return updated;
}

export async function deleteAdminTemplate(
  user: AuthUser,
  input: { name: string; language: string; templateId?: string }
): Promise<void> {
  const account = await getConnectedAccount(user.tenantId);

  const query: Record<string, string> = { name: input.name };
  if (input.templateId) {
    query.hsm_id = input.templateId;
  }

  try {
    await metaDelete(`/${account.businessAccountId}/message_templates`, account, query);
  } catch (error) {
    metaFailureToAppError(error, 'Meta template request failed');
  }
}
