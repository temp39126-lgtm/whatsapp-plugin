import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  trend?: string;
  variant?: 'default' | 'whatsapp' | 'warning' | 'muted';
  className?: string;
}

const variants = {
  default: 'border bg-card',
  whatsapp: 'border-whatsapp/20 bg-whatsapp-light',
  warning: 'border-orange-200 bg-orange-50',
  muted: 'border bg-muted/40',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <div className={cn('rounded-xl border p-5 shadow-sm', variants[variant], className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
        </div>
        {Icon && (
          <div className="rounded-lg bg-whatsapp/10 p-2.5">
            <Icon className="h-5 w-5 text-whatsapp-dark" />
          </div>
        )}
      </div>
    </div>
  );
}
