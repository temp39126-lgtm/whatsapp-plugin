'use client';

import { Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AuthRoleChoice = 'USER' | 'ADMIN';

interface RoleSelectorProps {
  value: AuthRoleChoice;
  onChange: (role: AuthRoleChoice) => void;
  disabledRoles?: AuthRoleChoice[];
}

const roles: Array<{
  id: AuthRoleChoice;
  label: string;
  icon: typeof User;
}> = [
  { id: 'USER', label: 'User', icon: User },
  { id: 'ADMIN', label: 'Admin', icon: Shield },
];

export function RoleSelector({ value, onChange, disabledRoles = [] }: RoleSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Choose your workspace</p>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1">
        {roles.map((role) => {
          const Icon = role.icon;
          const isSelected = value === role.id;
          const isDisabled = disabledRoles.includes(role.id);

          return (
            <button
              key={role.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(role.id)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isSelected
                  ? 'bg-card text-whatsapp-dark shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                isDisabled && 'cursor-not-allowed opacity-40'
              )}
            >
              <Icon className="h-4 w-4" />
              {role.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
