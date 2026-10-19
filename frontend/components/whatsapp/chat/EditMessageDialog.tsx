'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EditMessageDialogProps {
  open: boolean;
  initialText: string;
  isPending: boolean;
  allowSendCorrection?: boolean;
  onClose: () => void;
  onSave: (text: string, sendCorrectionToWhatsApp: boolean) => void;
}

export function EditMessageDialog({
  open,
  initialText,
  isPending,
  allowSendCorrection = false,
  onClose,
  onSave,
}: EditMessageDialogProps) {
  const [text, setText] = useState(initialText);
  const [sendCorrection, setSendCorrection] = useState(false);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setSendCorrection(false);
    }
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
        {allowSendCorrection && (
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
              checked={sendCorrection}
              onChange={(event) => setSendCorrection(event.target.checked)}
              disabled={isPending}
            />
            <span>
              Send correction on WhatsApp
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Sends a new message with this text to the customer (separate bubble on their phone).
              </span>
            </span>
          </label>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="whatsapp"
            disabled={isPending || !text.trim()}
            onClick={() => onSave(text.trim(), sendCorrection)}
          >
            {isPending ? 'Saving…' : sendCorrection ? 'Save & send correction' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
