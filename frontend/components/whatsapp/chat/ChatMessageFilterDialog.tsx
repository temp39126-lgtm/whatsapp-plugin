'use client';

import { useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatMessageFilterDialogProps {
  open: boolean;
  fromDate: string;
  toDate: string;
  onClose: () => void;
  onApply: (fromDate: string, toDate: string) => void;
  onReset: () => void;
}

export function ChatMessageFilterDialog({
  open,
  fromDate,
  toDate,
  onClose,
  onApply,
  onReset,
}: ChatMessageFilterDialogProps) {
  const [draftFrom, setDraftFrom] = useState(fromDate);
  const [draftTo, setDraftTo] = useState(toDate);

  useEffect(() => {
    if (open) {
      setDraftFrom(fromDate);
      setDraftTo(toDate);
    }
  }, [open, fromDate, toDate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-2xl border bg-background shadow-2xl"
        role="dialog"
        aria-labelledby="filter-messages-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2
            id="filter-messages-title"
            className="flex items-center gap-2 text-lg font-semibold text-whatsapp-dark"
          >
            <Filter className="h-5 w-5" />
            Filter Messages
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="filter-start-date">
              Start Date
            </label>
            <Input
              id="filter-start-date"
              type="date"
              value={draftFrom}
              onChange={(event) => setDraftFrom(event.target.value)}
              className="h-11"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="filter-end-date">
              End Date
            </label>
            <Input
              id="filter-end-date"
              type="date"
              value={draftTo}
              onChange={(event) => setDraftTo(event.target.value)}
              className="h-11"
            />
          </div>
        </div>

        <div className="flex gap-2 border-t p-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => {
              setDraftFrom('');
              setDraftTo('');
              onReset();
              onClose();
            }}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="whatsapp"
            className="flex-[2]"
            onClick={() => {
              onApply(draftFrom, draftTo);
              onClose();
            }}
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}