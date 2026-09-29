import { useCrm } from '@/components/forge/admin/crm-theme';

export interface SelectOption {
  value: string;
  label: string;
}

/** The design's `<select>` (web twin of `Select.tsx`): 38 px in editors, 32 px (`compact`) in the upload queue. */
export function Select({
  value,
  options,
  onChange,
  compact,
  accessibilityLabel,
}: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  compact?: boolean;
  accessibilityLabel?: string;
}) {
  const { c } = useCrm();
  return (
    <select
      value={value}
      aria-label={accessibilityLabel}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: compact ? 32 : 38,
        padding: compact ? '0 8px' : '0 10px',
        borderRadius: compact ? 8 : 10,
        border: `1px solid ${c.fieldBd}`,
        background: c.field,
        color: c.ink,
        fontSize: compact ? 13 : 14,
        fontFamily: 'inherit',
        colorScheme: c.scheme,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
