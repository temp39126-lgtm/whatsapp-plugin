'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EditMessageDialogProps {
  open: boolean;
  initialText: string;
  isPending: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
}

export function EditMessageDialog({
  open,
  initialText,
  isPending,
  onClose,
  onSave,
}: EditMessageDialogProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (open) setText(initialText);
  }, [open, initialText]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
        role="dialog"
        aria-labelledby="edit-message-title"
      >
        <h3 id="edit-message-title" className="text-lg font-semibold">
          Edit message
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Updates this chat in the CRM. WhatsApp Cloud API cannot change the message on the
          customer&apos;s phone after it was sent.
        </p>
        <Input
          className="mt-3"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={isPending}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="whatsapp"
            disabled={isPending || !text.trim()}
            onClick={() => onSave(text.trim())}
          >
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
