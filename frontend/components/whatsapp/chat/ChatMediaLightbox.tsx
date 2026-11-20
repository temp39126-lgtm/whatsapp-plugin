'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatMediaLightbox({
  open,
  src,
  alt,
  onClose,
}: {
  open: boolean;
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div className="flex shrink-0 items-center justify-end gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label="Close image preview"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <button
        type="button"
        className="flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onClick={onClose}
        aria-label="Close preview"
      >
        <img
          src={src}
          alt={alt}
          className={cn(
            'max-h-[calc(100dvh-5rem)] max-w-[min(100vw-1rem,64rem)] object-contain',
            'pointer-events-none select-none'
          )}
          onClick={(event) => event.stopPropagation()}
        />
      </button>
    </div>,
    document.body
  );
}