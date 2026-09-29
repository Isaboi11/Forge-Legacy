import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import type { LoadContext } from '@/domain/program/percent-max';
import { postedLines, usesMaxes, type PostedRow } from '@/domain/workout/posted-workout-lines';

/**
 * A posted workout, read in full before it is taken (PO 2026-09-27, Squatober): "click on it, look at it, and put
 * it in the queue". The squad post and the author's own "Write it" preview draw the same thing, so what a member
 * reads is what the poster checked.
 *
 * Every figure comes from `postedLines` (tested). This file only lays them out: the numbered lifts a coach's card
 * uses, supersets drawn as one block with the line that says how to run it, the member's own weight beside each
 * percentage — and each lift's name opens its how-to, so "how do I do a DB RDL" is one tap from the workout.
 */
export function PostedWorkoutView({
  rows,
  how,
  after,
  load,
  maxNames,
  onSetMaxes,
}: {
  rows: readonly PostedRow[];
  how?: string | null;
  after?: string | null;
  /** The READER's maxes, in their unit — their own weights. Absent: percentages only. */
  load?: LoadContext;
  maxNames?: Record<string, string>;
  /** Offered when percentages have no max behind them yet. */
  onSetMaxes?: () => void;
}) {
  const router = useRouter();
  const lines = postedLines(rows, load, maxNames);
  const needsMax = usesMaxes(rows) && (!load || Object.keys(load.maxes).length === 0);

  return (
    <View style={styles.wrap}>
      {how ? (
        <View style={styles.block}>
          <Text style={styles.label}>How it works</Text>
          <Text style={styles.prose}>{how}</Text>
        </View>
      ) : null}

      {needsMax ? (
        <Pressable
          onPress={onSetMaxes}
          disabled={!onSetMaxes}
          accessibilityRole="button"
          style={({ pressed }) => [styles.maxAsk, pressed && styles.pressed]}
        >
          <Text style={styles.maxAskText}>This workout goes off your maxes. Add yours to see your weights.</Text>
          {onSetMaxes ? <EngravedIcon name="chevron-right" size={14} color={flColor.gray400} /> : null}
        </Pressable>
      ) : null}

      <View style={styles.list}>
        {lines.map((l, i) => (
          <View key={`${l.label}-${i}`} style={[styles.lift, i > 0 && styles.liftDivider, l.label.endsWith('b') || /[c-e]$/.test(l.label) ? styles.liftInGroup : null]}>
            {l.superset ? <Text style={styles.superset}>{l.superset}</Text> : null}
            <View style={styles.liftHead}>
              <Text style={styles.liftLabel}>{l.label}</Text>
              <Pressable
                onPress={l.catalogKey ? () => router.push({ pathname: '/exercise/[id]', params: { id: l.catalogKey! } }) : undefined}
                disabled={!l.catalogKey}
                accessibilityRole={l.catalogKey ? 'link' : undefined}
                accessibilityHint={l.catalogKey ? 'Opens how to do it' : undefined}
                style={styles.liftNameWrap}
              >
                <Text style={[styles.liftName, l.catalogKey ? styles.liftNameLink : null]} numberOfLines={2}>
                  {l.name}
                </Text>
                {l.catalogKey ? <EngravedIcon name="chevron-right" size={12} color={flColor.gray600} /> : null}
              </Pressable>
            </View>
            <Text style={styles.summary}>{l.summary}</Text>
            {l.sets.length ? (
              <View style={styles.sets}>
                {l.sets.map((s) => (
                  <View key={s.label} style={styles.setRow}>
                    <Text style={styles.setLabel}>{s.label}</Text>
                    <Text style={styles.setText}>{s.text}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {l.note ? <Text style={styles.note}>{l.note}</Text> : null}
            {l.rest ? (
              <View style={styles.restRow}>
                <EngravedIcon name="timer" size={13} color={flColor.gray400} />
                <Text style={styles.rest}>{l.rest}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {after ? (
        <View style={styles.block}>
          <Text style={styles.label}>After</Text>
          <Text style={styles.prose}>{after}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  block: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.labelInk },
  prose: { fontSize: 14.5, lineHeight: 21, color: flColor.cream100 },
  maxAsk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  maxAskText: { flex: 1, fontSize: 13, lineHeight: 18, color: flColor.gray400 },
  pressed: { opacity: 0.8 },
  list: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    backgroundColor: flColor.surfaceRecessed,
    overflow: 'hidden',
  },
  lift: { paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
  liftDivider: { borderTopWidth: 1, borderTopColor: flColor.divider },
  /* A superset's later members sit tucked under the first — one block, the way the card draws it. */
  liftInGroup: { borderTopWidth: 0, paddingTop: 2, marginLeft: 14, borderLeftWidth: 2, borderLeftColor: flColor.charcoal600 },
  superset: { fontSize: 12, fontWeight: '600', color: flColor.gray400, marginBottom: 4 },
  liftHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  liftLabel: { minWidth: 22, fontFamily: flFont.display, fontSize: 15, color: flColor.gray400 },
  liftNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  liftName: { flexShrink: 1, fontSize: 15.5, fontWeight: '600', color: flColor.cream100 },
  liftNameLink: { textDecorationLine: 'none' },
  summary: { marginLeft: 32, fontSize: 13.5, color: flColor.gray400 },
  sets: { marginLeft: 32, marginTop: 4, gap: 2 },
  setRow: { flexDirection: 'row', gap: 10 },
  setLabel: { width: 44, fontSize: 12.5, color: flColor.gray600 },
  setText: { flex: 1, fontSize: 13, color: flColor.cream100 },
  note: { marginLeft: 32, marginTop: 2, fontSize: 13, lineHeight: 18, fontStyle: 'italic', color: flColor.gray400 },
  restRow: { marginLeft: 32, marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 6 },
  rest: { fontSize: 12.5, color: flColor.gray400 },
});
