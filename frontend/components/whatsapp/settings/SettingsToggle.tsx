'use client';

interface SettingsToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export function SettingsToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: SettingsToggleProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <span className="relative mt-1 inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-whatsapp peer-disabled:opacity-50" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
