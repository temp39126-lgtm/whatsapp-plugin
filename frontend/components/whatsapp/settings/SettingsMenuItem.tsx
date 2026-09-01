'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsMenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  onClick: () => void;
  iconClassName?: string;
}

export function SettingsMenuItem({
  icon: Icon,
  title,
  subtitle,
  onClick,
  iconClassName,
}: SettingsMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/50"
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-whatsapp/10 text-whatsapp',
          iconClassName
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
