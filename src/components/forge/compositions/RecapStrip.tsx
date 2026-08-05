/**
 * RecapStrip — the four numbers a shared workout is: Vol · Time · Lifts · PRs.
 *
 * EXTRACTED, not written. This lived inline in `src/app/squad/[id].tsx` as `RecapStatSmall` plus four
 * style rules, and the Friends feed needed the identical strip once a recap could be shared there
 * (migration 0113). Two feeds rendering the same four numbers from two copies of the same code is how
 * they drift: one gains the PR pluralisation, or the hour-aware clock, and the other quietly stops
 * matching it. One component, both callers.
 *
 * PRs are omitted rather than shown as zero. "0 PRs" reads as a result — a session judged and found
 * wanting — when the honest statement is that this session was not about records. Same reasoning that
 * keeps `weight: 0` (bodyweight, an answer) distinct from `null` (nothing entered) in the logger.
 */

import { StyleSheet, Text, View } from 'react-native';

import { flColor, flFont } from '@/constants/foundation';
import { fmtDuration, fmtVolume, type WorkoutSummary } from '@/data/squad-feed-live';

function RecapStat({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function RecapStrip({ summary }: { summary: WorkoutSummary }) {
  return (
    <View style={styles.strip}>
      <RecapStat n={fmtVolume(summary.volume)} label="Vol" />
      <RecapStat n={fmtDuration(summary.durationSec)} label="Time" />
      <RecapStat n={String(summary.exercises.length)} label="Lifts" />
      {summary.prCount > 0 ? <RecapStat n={String(summary.prCount)} label={summary.prCount === 1 ? 'PR' : 'PRs'} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 8 },
  stat: { gap: 2 },
  statN: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.bronze300 },
  statLabel: { fontSize: 8.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
});
