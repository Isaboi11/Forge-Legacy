import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { flColor, flFont } from '@/constants/foundation';

/**
 * HOME · WELCOME BACK — the greeting after a break (`domain/home/welcome-back.ts` holds the rules).
 *
 * ⚠ NOT A CARD. It is information, and cards are for things the athlete acts inside of (PO 2026-08-24).
 * So it is type on the ground with one hairline under it, and the action it leads to is the workout hero
 * directly below — no second "Start" button competing with the real one.
 *
 * Layout is shared by both themes; every colour comes from role tokens, so Forge and Alabaster each get
 * their own (labelInk for the eyebrow, cream100/gray400 for type, divider for the rule).
 */
export function WelcomeBackLine({
  eyebrow,
  title,
  body,
  built,
  onClose,
}: {
  eyebrow: string;
  title: string;
  body: string;
  /** "Builder II · 31 workouts · 4 honors" — omitted when empty. */
  built: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.top}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close welcome back"
          style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
        >
          <Svg width={14} height={14} viewBox="0 0 14 14">
            <Path d="M2 2l10 10M12 2L2 12" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {built ? <Text style={styles.built}>{built}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 4,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: flColor.divider,
    gap: 6,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.labelInk },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  pressed: { opacity: 0.6 },
  title: { fontFamily: flFont.display, fontSize: 24, lineHeight: 29, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  body: { fontSize: 15, lineHeight: 21, color: flColor.gray400 },
  built: { marginTop: 4, fontSize: 13, fontWeight: '600', letterSpacing: 0.2, color: flColor.gray400 },
});
