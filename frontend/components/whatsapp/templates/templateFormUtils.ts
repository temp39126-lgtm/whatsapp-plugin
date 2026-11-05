import type { AdminWhatsAppTemplate, TemplateFormInput } from '@/hooks/useAdminTemplates';

export function parseTemplateToForm(template: AdminWhatsAppTemplate): TemplateFormInput {
  const header = template.components.find((c) => String(c.type).toUpperCase() === 'HEADER');
  const body = template.components.find((c) => String(c.type).toUpperCase() === 'BODY');
  const footer = template.components.find((c) => String(c.type).toUpperCase() === 'FOOTER');
  const buttonsBlock = template.components.find((c) => String(c.type).toUpperCase() === 'BUTTONS');
  const rawButtons = (buttonsBlock?.buttons as Array<Record<string, unknown>> | undefined) ?? [];

  const buttons = rawButtons
    .map((button) => {
      const type = String(button.type).toUpperCase();
      const text = String(button.text ?? '');
      if (type === 'URL') {
        return { type: 'URL' as const, text, url: String(button.url ?? '') };
      }
      if (type === 'QUICK_REPLY') {
        return { type: 'QUICK_REPLY' as const, text };
      }
      return null;
    })
    .filter(Boolean) as TemplateFormInput['buttons'];

  return {
    name: template.name,
    language: template.language,
    category: (template.category as TemplateFormInput['category']) ?? 'UTILITY',
    bodyText: typeof body?.text === 'string' ? body.text : template.bodyPreview ?? '',
    headerText: typeof header?.text === 'string' ? header.text : '',
    footerText: typeof footer?.text === 'string' ? footer.text : '',
    buttons: buttons?.length ? buttons : undefined,
  };
}

export function statusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === 'APPROVED') return 'bg-green-100 text-green-800';
  if (normalized === 'REJECTED') return 'bg-red-100 text-red-800';
  if (normalized === 'PENDING') return 'bg-amber-100 text-amber-900';
  if (normalized === 'PAUSED') return 'bg-muted text-muted-foreground';
  return 'bg-muted text-muted-foreground';
}
