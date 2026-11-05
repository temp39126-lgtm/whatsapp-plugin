'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ContactDTO } from '@/types';

interface ContactEditDialogProps {
  contact: ContactDTO | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; phone: string }) => void;
}

export function ContactEditDialog({
  contact,
  open,
  saving,
  onClose,
  onSave,
}: ContactEditDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!contact || !open) return;
    setName(contact.name);
    setPhone(contact.phone.replace(/^\+/, ''));
  }, [contact, open]);

  if (!open || !contact) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSave({ name: name.trim(), phone: phone.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close edit contact"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-contact-title"
        className="relative z-10 w-full max-w-md rounded-t-xl border bg-background p-5 shadow-lg sm:rounded-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="edit-contact-title" className="text-lg font-semibold">
              Edit contact
            </h2>
            <p className="text-sm text-muted-foreground">Update name and phone number.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="edit-contact-name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <Input
              id="edit-contact-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={1}
              maxLength={120}
            />
          </div>
          <div>
            <label htmlFor="edit-contact-phone" className="mb-1 block text-sm font-medium">
              Phone number
            </label>
            <Input
              id="edit-contact-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="15551234567"
              required
              minLength={8}
              maxLength={20}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Include country code, digits only (no + required).
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="whatsapp" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
