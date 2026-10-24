'use client';

import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  type Permission,
} from '@shared/constants/permissions';

interface TeamUserPermissionPickerProps {
  value: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
}

export function TeamUserPermissionPicker({
  value,
  onChange,
  disabled,
}: TeamUserPermissionPickerProps) {
  const selected = new Set(value);

  function toggle(permission: Permission) {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(permission)) {
      next.delete(permission);
    } else {
      next.add(permission);
    }
    onChange([...next]);
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">Permissions</p>
        <p className="text-xs text-muted-foreground">
          By default, users see only chats assigned to them or shared with them, and their assigned
          contacts. Tick permissions below for extra access. After saving, the user must sign in
          again for changes to apply.
        </p>
      </div>
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.title}
          </p>
          {group.description ? (
            <p className="mb-2 text-xs text-muted-foreground">{group.description}</p>
          ) : null}
          <ul className="space-y-2">
            {group.permissions.map((permission) => {
              const meta = PERMISSION_LABELS[permission];
              const checked = selected.has(permission);
              return (
                <li key={permission}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(permission)}
                    />
                    <span>
                      <span className="font-medium">{meta.label}</span>
                      <span className="block text-xs text-muted-foreground">{meta.description}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
