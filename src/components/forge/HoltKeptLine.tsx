import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { flColor, flRadius } from '@/constants/foundation';
import { keptLine } from '@/domain/coach/holt-memory-screen';

/**
 * "Holt kept 2 things from your last chat · See" (AI Road to 10 Sprint 4b §1.3) — the one line that says the last chat
 * left something in What Holt Remembers. No Confirm card (PO: Holt remembers by default), but never silent: shown once,
 * the next time the sheet opens after a chat kept facts (`useChatRecap().kept`). See → /holt-memory; X → gone.
 *
 * Both themes: role tokens only (`flColor` flips for Alabaster); the icons are the engraved set.
 */
export function HoltKeptLine({ count, onSee, onDismiss }: { count: number; onSee: () => void; onDismiss: () => void }) {
  const line = keptLine(count);
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onSee}
        accessibilityRole="button"
        accessibilityLabel={`${line}. See what Holt remembers.`}
        hitSlop={6}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <EngravedIcon name="book" size={16} />
        <Text style={styles.text} numberOfLines={2}>
          {line} · <Text style={styles.see}>See</Text>
        </Text>
      </Pressable>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
        <EngravedIcon name="close" size={14} color={flColor.gray400} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { flex: 1, fontSize: 13, lineHeight: 18, color: flColor.gray400 },
  see: { fontWeight: '600', color: flColor.bronzeInk },
  pressed: { opacity: 0.6 },
});
