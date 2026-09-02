'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerDetails } from '@/components/whatsapp/CustomerDetails';
import type { ConversationDTO } from '@/types';

interface CustomerDetailsSheetProps {
  open: boolean;
  conversation: ConversationDTO | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function CustomerDetailsSheet({
  open,
  conversation,
  onClose,
  onDeleted,
}: CustomerDetailsSheetProps) {
  if (!open || !conversation) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close contact details"
        className="fixed inset-0 z-40 bg-black/40 xl:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l bg-background shadow-xl xl:hidden">
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Contact details</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CustomerDetails
            conversation={conversation}
            onDeleted={() => {
              onDeleted?.();
              onClose();
            }}
          />
        </div>
      </div>
    </>
  );
}
