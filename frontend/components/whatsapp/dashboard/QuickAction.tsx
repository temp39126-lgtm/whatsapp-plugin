import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface QuickActionProps {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}

export function QuickAction({ href, label, description, icon: Icon, className }: QuickActionProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-whatsapp/40 hover:bg-whatsapp-light/50 hover:shadow-md',
        className
      )}
    >
      <div className="rounded-lg bg-whatsapp p-3 text-white transition-transform group-hover:scale-105">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
