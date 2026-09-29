import { View } from 'react-native';

import { PChip } from '@/components/forge/admin/phone/kit';

/**
 * The phone's pick-one control. Native fallback: the options as wrapping chips (there is no `<select>` on
 * native). The web twin (`PSelect.web.tsx`) is the design's real dropdown at 16 px, so iOS Safari never zooms.
 */
export function PSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void; accessibilityLabel?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <PChip key={o} label={o} on={o === value} onPress={() => onChange(o)} />
      ))}
    </View>
  );
}
