import { useCrm } from '@/components/forge/admin/crm-theme';

/**
 * The design's `<input type="date">` (web twin of `DateInput.tsx`). The browser's own picker, themed by
 * `color-scheme` so its calendar matches the CRM's Dark / Light switch. Value is yyyy-mm-dd or ''.
 */
export function DateInput({ value, onChange, accessibilityLabel }: { value: string; onChange: (v: string) => void; accessibilityLabel?: string }) {
  const { c } = useCrm();
  return (
    <input
      type="date"
      value={value}
      aria-label={accessibilityLabel}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 40,
        boxSizing: 'border-box',
        padding: '0 12px',
        borderRadius: 10,
        border: `1px solid ${c.fieldBd}`,
        background: c.field,
        color: c.ink,
        fontSize: 14,
        fontFamily: 'inherit',
        outline: 'none',
        colorScheme: c.scheme,
        width: '100%',
      }}
    />
  );
}
