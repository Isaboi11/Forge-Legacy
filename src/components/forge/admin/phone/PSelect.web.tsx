import { useCrm } from '@/components/forge/admin/crm-theme';

/** The design's `<select>` (web twin of `PSelect.tsx`): 44 px tall, 16 px text so iOS Safari never zooms. */
export function PSelect({ value, options, onChange, accessibilityLabel }: { value: string; options: string[]; onChange: (v: string) => void; accessibilityLabel?: string }) {
  const { c } = useCrm();
  return (
    <select
      value={value}
      aria-label={accessibilityLabel}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 44,
        padding: '0 10px',
        borderRadius: 10,
        border: `1px solid ${c.fieldBd}`,
        background: c.field,
        color: c.ink,
        fontSize: 16,
        fontFamily: 'inherit',
        colorScheme: c.scheme,
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
