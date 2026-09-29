import { Input } from '@/components/forge/admin/crm-ui';

/**
 * A date field, as yyyy-mm-dd. Native fallback: a plain text field with the format as its placeholder —
 * the web twin (`DateInput.web.tsx`) is the design's real `<input type="date">`. The caller validates.
 */
export function DateInput({ value, onChange, accessibilityLabel }: { value: string; onChange: (v: string) => void; accessibilityLabel?: string }) {
  return (
    <Input
      value={value}
      onChangeText={(t) => onChange(t.trim())}
      placeholder="yyyy-mm-dd"
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="numbers-and-punctuation"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
