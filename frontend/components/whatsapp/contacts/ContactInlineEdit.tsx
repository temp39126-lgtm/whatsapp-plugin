'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ContactDTO } from '@/types';

interface ContactInlineEditProps {
  contact: ContactDTO;
  saving: boolean;
  onCancel: () => void;
  onSave: (payload: { name: string; phone: string }) => void;
}

export function ContactInlineEdit({ contact, saving, onCancel, onSave }: ContactInlineEditProps) {
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone.replace(/^\+/, ''));

  useEffect(() => {
    setName(contact.name);
    setPhone(contact.phone.replace(/^\+/, ''));
  }, [contact._id, contact.name, contact.phone]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSave({ name: name.trim(), phone: phone.trim() });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-whatsapp/40 bg-whatsapp-light/20 p-3"
      onClick={(event) => event.stopPropagation()}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-whatsapp-dark">Edit contact</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:min-w-[8rem]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor={`edit-name-${contact._id}`}>
            Name
          </label>
          <Input
            id={`edit-name-${contact._id}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={1}
            maxLength={120}
            className="h-9"
          />
        </div>
        <div className="min-w-0 flex-1 sm:min-w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor={`edit-phone-${contact._id}`}>
            Phone
          </label>
          <Input
            id={`edit-phone-${contact._id}`}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="15551234567"
            required
            minLength={8}
            maxLength={20}
            className="h-9"
          />
        </div>
        <div className="flex shrink-0 gap-2 pb-0 sm:pb-0">
          <Button type="submit" variant="whatsapp" size="sm" disabled={saving} className="h-9">
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={saving} className="h-9" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}