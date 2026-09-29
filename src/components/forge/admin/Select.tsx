import { Opt, Row } from '@/components/forge/admin/crm-ui';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Pick one of a few options. Native fallback: the options as a row of `Opt` buttons (there is no native
 * `<select>`). The web twin (`Select.web.tsx`) is the design's real dropdown.
 */
export function Select({ value, options, onChange }: { value: string; options: SelectOption[]; onChange: (v: string) => void; compact?: boolean; accessibilityLabel?: string }) {
  return (
    <Row gap={6}>
      {options.map((o) => (
        <Opt key={o.value} label={o.label} on={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </Row>
  );
}
