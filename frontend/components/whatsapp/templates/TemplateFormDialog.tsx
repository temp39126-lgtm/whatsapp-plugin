'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminWhatsAppTemplate, TemplateFormInput } from '@/hooks/useAdminTemplates';
import { parseTemplateToForm } from './templateFormUtils';

type Mode = 'create' | 'edit';

interface TemplateFormDialogProps {
  open: boolean;
  mode: Mode;
  initial?: AdminWhatsAppTemplate | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: TemplateFormInput) => void;
}

const emptyForm: TemplateFormInput = {
  name: '',
  language: 'en',
  category: 'UTILITY',
  bodyText: '',
  headerText: '',
  footerText: '',
  buttons: [],
};

export function TemplateFormDialog({
  open,
  mode,
  initial,
  saving,
  onClose,
  onSubmit,
}: TemplateFormDialogProps) {
  const [form, setForm] = useState<TemplateFormInput>(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setForm(parseTemplateToForm(initial));
      return;
    }
    setForm(emptyForm);
  }, [open, mode, initial]);

  if (!open) return null;

  function updateButton(index: number, patch: Partial<NonNullable<TemplateFormInput['buttons']>[number]>) {
    setForm((current) => {
      const buttons = [...(current.buttons ?? [])];
      buttons[index] = { ...buttons[index], ...patch } as NonNullable<TemplateFormInput['buttons']>[number];
      return { ...current, buttons };
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({
      ...form,
      name: form.name.trim().toLowerCase(),
      headerText: form.headerText?.trim() || undefined,
      footerText: form.footerText?.trim() || undefined,
      buttons: form.buttons?.filter((b) => b.text.trim()) ?? undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-xl border bg-background p-5 shadow-lg sm:rounded-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {mode === 'create' ? 'Create template' : 'Edit template'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Submitted templates are reviewed by Meta. Only approved templates can be sent in chat.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Template name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="seasonal_promo"
                required
                disabled={mode === 'edit'}
                pattern="[a-z0-9_]+"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Language code</label>
              <Input
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                placeholder="en"
                required
                disabled={mode === 'edit'}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as TemplateFormInput['category'] })
              }
            >
              <option value="UTILITY">Utility</option>
              <option value="MARKETING">Marketing</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Header (optional)</label>
            <Input
              value={form.headerText ?? ''}
              onChange={(e) => setForm({ ...form, headerText: e.target.value })}
              placeholder="Short header text"
              maxLength={60}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Body</label>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.bodyText}
              onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
              placeholder="Hello {{1}}, your order {{2}} is ready."
              required
              maxLength={1024}
            />
            <p className="mt-1 text-xs text-muted-foreground">Use {'{{1}}'}, {'{{2}}'} for variables.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Footer (optional)</label>
            <Input
              value={form.footerText ?? ''}
              onChange={(e) => setForm({ ...form, footerText: e.target.value })}
              maxLength={60}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Buttons (optional, max 3)</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={(form.buttons?.length ?? 0) >= 3}
                onClick={() =>
                  setForm({
                    ...form,
                    buttons: [...(form.buttons ?? []), { type: 'QUICK_REPLY', text: '' }],
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add button
              </Button>
            </div>
            {(form.buttons ?? []).map((button, index) => (
              <div key={index} className="mb-2 grid gap-2 rounded border p-3 sm:grid-cols-[120px_1fr_1fr_auto]">
                <select
                  className="h-10 rounded-md border px-2 text-sm"
                  value={button.type}
                  onChange={(e) =>
                    updateButton(index, {
                      type: e.target.value as 'QUICK_REPLY' | 'URL',
                      ...(e.target.value === 'QUICK_REPLY' ? { url: undefined } : {}),
                    })
                  }
                >
                  <option value="QUICK_REPLY">Quick reply</option>
                  <option value="URL">URL</option>
                </select>
                <Input
                  placeholder="Button label"
                  value={button.text}
                  onChange={(e) => updateButton(index, { text: e.target.value })}
                  maxLength={25}
                />
                {button.type === 'URL' ? (
                  <Input
                    placeholder="https://example.com"
                    value={'url' in button ? button.url : ''}
                    onChange={(e) => updateButton(index, { url: e.target.value })}
                  />
                ) : (
                  <div />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setForm({
                      ...form,
                      buttons: form.buttons?.filter((_, i) => i !== index),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="whatsapp" disabled={saving}>
              {saving ? 'Submitting to Meta…' : mode === 'create' ? 'Create template' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
