import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeliveryStatusProps {
  status: string;
  className?: string;
}

export function DeliveryStatus({ status, className }: DeliveryStatusProps) {
  const icons: Record<string, React.ReactNode> = {
    SENDING: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
    SENT: <Check className="h-3.5 w-3.5 text-muted-foreground" />,
    DELIVERED: <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />,
    READ: <CheckCheck className="h-3.5 w-3.5 text-blue-500" />,
    FAILED: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
  };

  return (
    <span className={cn('inline-flex items-center', className)} title={status}>
      {icons[status] ?? null}
    </span>
  );
}
