/**
 * "How did you find Forge Legacy?" — the one-tap Home card (PO 2026-11-17, migration 0273).
 * Mockup: claude.ai artifact "How Did You Hear" (PO approved 11-17).
 *
 * Home mounts it only while `found_via_owed()` says so, and that read is part of Home's first-paint gate,
 * so the card is there when the screen appears rather than arriving on top of it.
 *
 * Three moments:
 *   ask    — six answers in two columns, and Skip.
 *   thanks — one quiet line in its place, so the tap visibly landed. It stays until the athlete leaves
 *            Home: collapsing it on a timer would move the hero under a thumb that is already on its way
 *            to Start (the "two taps" defect — a layout shift nobody asked for).
 *   gone   — after Skip, and after the thanks line once Home loses focus.
 *
 * The answer is saved optimistically. If the save fails (offline), the server still says "owed" and the
 * card simply comes back on a later launch — better than a spinner on a one-tap question.
 *
 * Colours by ROLE (Alabaster: bronze is earned): the card edge is `bronzeBorder` (taupe on Alabaster),
 * the eyebrow `labelInk`, a pressed answer `accentBorder`. Layout is shared by both themes.
 */

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { saveFoundVia } from '@/data/found-via-live';
import { FOUND_VIA_COPY, FOUND_VIA_OPTIONS } from '@/domain/home/found-via';
import type { FoundViaAnswer, FoundViaOption, FoundViaPhase } from '@/domain/home/found-via';

export function FoundViaCard() {
  const [phase, setPhase] = useState<FoundViaPhase>('ask');
  const [picked, setPicked] = useState<string>('');

  // Leaving Home after answering retires the thanks line. Only the cleanup sets state, and only once the
  // athlete has answered — an earlier blur (the tour, a tab) must not take the unanswered card away.
  const answered = phase === 'thanks';
  useFocusEffect(
    useCallback(() => {
      if (!answered) return undefined;
      return () => setPhase('gone');
    }, [answered]),
  );

  const answer = useCallback((value: FoundViaAnswer, label: string) => {
    setPicked(label);
    setPhase(value === 'skipped' ? 'gone' : 'thanks');
    saveFoundVia(value).catch(() => {
      // Still owed on the server, so it is asked again another day. Nothing to show the athlete.
    });
  }, []);

  if (phase === 'gone') return null;

  if (phase === 'thanks') {
    return (
      <View style={styles.thanks} accessibilityRole="text" accessibilityLiveRegion="polite">
        <View style={styles.tick}>
          <EngravedIcon name="check" size={16} color={flColor.bronze300} />
        </View>
        <View style={styles.thanksText}>
          <Text style={styles.thanksTitle}>{FOUND_VIA_COPY.thanksTitle}</Text>
          <Text style={styles.thanksBody}>{FOUND_VIA_COPY.thanksBody(picked)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>{FOUND_VIA_COPY.eyebrow}</Text>
        <Pressable
          onPress={() => answer('skipped', '')}
          accessibilityRole="button"
          accessibilityLabel="Skip this question"
          hitSlop={10}
          style={({ pressed }) => [styles.skip, pressed ? styles.skipPressed : null]}
        >
          <Text style={styles.skipText}>{FOUND_VIA_COPY.skip}</Text>
        </Pressable>
      </View>

      <View style={styles.copy}>
        <Text style={styles.title} accessibilityRole="header">
          {FOUND_VIA_COPY.title}
        </Text>
        <Text style={styles.body}>{FOUND_VIA_COPY.body}</Text>
      </View>

      <View style={styles.grid}>
        {FOUND_VIA_OPTIONS.map((o) => (
          <Choice key={o.source} option={o} onPress={() => answer(o.source, o.label)} />
        ))}
      </View>
    </View>
  );
}

function Choice({ option, onPress }: { option: FoundViaOption; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`I found Forge Legacy through ${option.label}`}
      style={({ pressed }) => [styles.choice, pressed ? styles.choicePressed : null]}
    >
      <Text style={styles.choiceText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {option.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 6,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 40 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.labelInk },
  // 44pt target: 40 of row height + the hitSlop.
  skip: { minHeight: 40, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 8 },
  skipPressed: { opacity: 0.6 },
  skipText: { fontSize: 13.5, fontWeight: '500', color: flColor.gray400 },

  copy: { gap: 6 },
  title: { fontFamily: flFont.display, fontSize: 21, fontWeight: '600', lineHeight: 27, color: flColor.cream100 },
  body: { fontSize: 13, lineHeight: 18.5, color: flColor.gray400 },

  // Two equal columns. `flexBasis` under 50% leaves room for the 8pt gap; `flexGrow` fills the rest.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  choice: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 46,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.charcoal800,
  },
  choicePressed: { borderColor: flColor.accentBorder, backgroundColor: flColor.bronzeTint },
  choiceText: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },

  thanks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
  },
  tick: {
    width: 36,
    height: 36,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  thanksText: { flex: 1, minWidth: 0, gap: 3 },
  thanksTitle: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', lineHeight: 22, color: flColor.cream100 },
  thanksBody: { fontSize: 12.5, lineHeight: 17, color: flColor.gray400 },
});
