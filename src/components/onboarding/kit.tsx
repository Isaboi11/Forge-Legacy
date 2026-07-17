import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type DimensionValue, type TextInputProps } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Shared forged pieces for the onboarding flow (Gate B) — the progress header, selectable tiles, and a
 * labeled field. Faithful to Forge Onboarding.dc.html's setup screens; built on foundation tokens.
 */

/** Bronze progress bar + n/N counter + back chevron. Shown on the 7 setup steps (Account→Program). */
export function ProgressHeader({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  const pct = `${Math.round((step / total) * 100)}%`;
  return (
    <View style={s.progressRow}>
      {onBack ? (
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} style={s.back}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </Pressable>
      ) : (
        <View style={s.back} />
      )}
      <View style={s.track}>
        <View style={[s.fill, { width: pct as DimensionValue }]} />
      </View>
      <Text style={s.counter}>
        {step}/{total}
      </Text>
    </View>
  );
}

/** A selectable option tile (single- or multi-select). Optional roman `mark`, `desc`, and `right` slot. */
export function SelectTile({
  title,
  desc,
  mark,
  selected,
  onPress,
  right,
  fill,
}: {
  title: string;
  desc?: string;
  mark?: string;
  selected: boolean;
  onPress: () => void;
  right?: ReactNode;
  /** Share row width evenly + center the title (the 2-across Sex/Units choices). */
  fill?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      style={[s.tile, fill && s.tileFill, selected && s.tileOn]}
    >
      {mark ? <Text style={[s.mark, selected && s.markOn]}>{mark}</Text> : null}
      <View style={[s.tileText, fill && s.tileTextFill]}>
        <Text style={[s.tileTitle, selected && s.tileTitleOn]}>{title}</Text>
        {desc ? <Text style={s.tileDesc}>{desc}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

/** A labeled forged text field. */
export function Field({ label, hint, ...input }: { label: string; hint?: string } & TextInputProps) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput style={s.input} placeholderTextColor={flColor.gray600} {...input} />
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Screen heading block — eyebrow + serif title + body. */
export function Heading({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <View style={s.headingWrap}>
      {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
      <Text style={s.title}>{title}</Text>
      {body ? <Text style={s.body}>{body}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 18 },
  back: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2, backgroundColor: flColor.bronze400 },
  counter: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '600', color: flColor.gray400, minWidth: 26, textAlign: 'right' },

  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  tileFill: { flex: 1, justifyContent: 'center', paddingVertical: 18 },
  tileTextFill: { flex: 0, alignItems: 'center' },
  tileOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  mark: { fontFamily: flFont.display, fontSize: 15, color: flColor.gray600, width: 22, textAlign: 'center' },
  markOn: { color: flColor.bronze400 },
  tileText: { flex: 1, minWidth: 0, gap: 2 },
  tileTitle: { fontFamily: flFont.sans, fontSize: 15.5, fontWeight: '600', color: flColor.cream100 },
  tileTitleOn: { color: flColor.cream100 },
  tileDesc: { fontFamily: flFont.sans, fontSize: 12.5, lineHeight: 17, color: flColor.gray400 },

  field: { gap: 7 },
  fieldLabel: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400 },
  input: {
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    borderRadius: flRadius.md,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontFamily: flFont.sans,
    fontSize: 15,
    color: flColor.cream100,
  },
  hint: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600 },

  headingWrap: { gap: 10, paddingBottom: 6 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronze400 },
  title: { fontFamily: flFont.display, fontSize: 30, fontWeight: '600', lineHeight: 31, color: flColor.cream100, letterSpacing: -0.3 },
  body: { fontFamily: flFont.sans, fontSize: 14, lineHeight: 22, color: flColor.gray400 },
});
