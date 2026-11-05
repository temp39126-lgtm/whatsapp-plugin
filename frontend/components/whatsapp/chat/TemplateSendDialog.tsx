'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useWhatsAppTemplates,
  useSendWhatsAppTemplate,
} from '@/hooks/useMessages';

interface Props {
  open: boolean;
  conversationId: string;
  onClose: () => void;
}

export function TemplateSendDialog({
  open,
  conversationId,
  onClose,
}: Props) {
  const templatesQuery = useWhatsAppTemplates(conversationId, open);
  const sendTemplate = useSendWhatsAppTemplate();

  const templates = templatesQuery.data?.data ?? [];

  const [selected, setSelected] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const template = templates.find(
    (item) => `${item.name}::${item.language}` === selected
  );

  const fields = (template?.components ?? []).flatMap((component) => {
    const type = component.type?.toUpperCase();

    if (!['BODY', 'HEADER'].includes(type ?? '') || !component.text) {
      return [];
    }

    return (component.text.match(/\{\{\s*\d+\s*\}\}/g) ?? []).map(
      (_, index) => ({
        type,
        index,
        key: `${type}-${index}`,
      })
    );
  });

  useEffect(() => {
    if (open) {
      setSelected('');
      setValues({});
      setError('');
    }
  }, [open, conversationId]);

  if (!open) return null;

  const handleSend = () => {
    if (!template) return;

    if (fields.some((field) => !values[field.key]?.trim())) {
      setError('Please fill in all template variables.');
      return;
    }

    const components = ['HEADER', 'BODY']
      .filter((type) => fields.some((field) => field.type === type))
      .map((type) => ({
        type: type.toLowerCase(),
        parameters: fields
          .filter((field) => field.type === type)
          .map((field) => ({
            type: 'text',
            text: values[field.key].trim(),
          })),
      }));

    setError('');

    sendTemplate.mutate(
      {
        conversationId,
        templateName: template.name,
        languageCode: template.language,
        components,
      },
      {
        onSuccess: (result) => {
          if (result.status === 'FAILED') {
            setError(
              result.errorMessage ||
              'WhatsApp could not send this template. Please check the template and try again.'
            );
            return;
          }
          onClose();
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'Template send failed.'),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl border bg-background p-5 shadow-xl"
      >
        <h3 className="text-lg font-semibold">Send WhatsApp Template</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Select an approved template from your WhatsApp Business Account.
        </p>

        {templatesQuery.isLoading ? (
          <p className="py-5 text-sm">Loading approved templates...</p>
        ) : templatesQuery.isError ? (
          <p className="py-5 text-sm text-destructive">
            Unable to load approved templates. Check your account connection.
          </p>
        ) : templates.length === 0 ? (
          <p className="py-5 text-sm text-muted-foreground">
            No approved templates found.
          </p>
        ) : (
          <>
            <label className="mt-4 block text-sm font-medium">
              Select template
            </label>
            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selected}
              disabled={sendTemplate.isPending}
              onChange={(event) => {
                setSelected(event.target.value);
                setValues({});
                setError('');
              }}
            >
              <option value="">Choose a template</option>
              {templates.map((item) => (
                <option
                  key={`${item.name}::${item.language}`}
                  value={`${item.name}::${item.language}`}
                >
                  {item.name} — {item.language}
                </option>
              ))}
            </select>

            {template && (
              <div className="mt-4">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    TEMPLATE PREVIEW
                  </p>
                  <p className="mt-2 text-sm">
                    {template.components.find(
                      (item) => item.type?.toUpperCase() === 'BODY'
                    )?.text ?? template.name}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Language: {template.language}
                  </p>
                </div>

                {fields.map((field) => (
                  <label
                    key={field.key}
                    className="mt-3 block text-sm font-medium"
                  >
                    {field.type} variable {field.index + 1}
                    <Input
                      className="mt-1"
                      value={values[field.key] ?? ''}
                      disabled={sendTemplate.isPending}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={sendTemplate.isPending}>
            Cancel
          </Button>
          <Button
            variant="whatsapp"
            onClick={handleSend}
            disabled={!template || sendTemplate.isPending}
          >
            {sendTemplate.isPending ? 'Sending...' : 'Send Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}
