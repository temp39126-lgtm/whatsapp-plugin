import { TenantSettings } from '../../models/TenantSettings';
import { buildTemplateVisibilityKey } from '../../utils/templateVisibility';

export async function getHiddenTemplateKeySet(tenantId: string): Promise<Set<string>> {
  const settings = await TenantSettings.findOne({ tenantId }).lean();
  return new Set(settings?.hiddenWhatsAppTemplates ?? []);
}

export async function setTemplateHidden(
  tenantId: string,
  name: string,
  language: string,
  hidden: boolean
): Promise<string[]> {
  const key = buildTemplateVisibilityKey(name, language);

  if (hidden) {
    const doc = await TenantSettings.findOneAndUpdate(
      { tenantId },
      {
        $addToSet: { hiddenWhatsAppTemplates: key },
        $setOnInsert: { tenantId },
      },
      { upsert: true, new: true }
    );
    return doc?.hiddenWhatsAppTemplates ?? [key];
  }

  const doc = await TenantSettings.findOneAndUpdate(
    { tenantId },
    { $pull: { hiddenWhatsAppTemplates: key } },
    { new: true }
  );
  return doc?.hiddenWhatsAppTemplates ?? [];
}

export function isTemplateHidden(hiddenKeys: Set<string>, name: string, language: string): boolean {
  return hiddenKeys.has(buildTemplateVisibilityKey(name, language));
}