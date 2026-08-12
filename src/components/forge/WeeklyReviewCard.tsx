import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flColor, flFont, flRadius } from '@/constants/foundation';
import { BUBBLE_SIZE, HoltMark } from '@/components/forge/HoltMark';
import { fmtDuration, fmtVolume } from '@/data/squad-feed-live';
import type { WeeklyReview } from '@/data/weekly-review-live';

/**
 * "YOUR WEEK IS READY" — the card that carries Holt's read of the week that just closed.
 *
 * ══ WHY IT LOOKS LIKE HIM ══
 *
 * The mark is on it because he wrote it, and because the athlete has been taught by every other surface
 * that a bronze medallion means the coach is talking. A weekly summary with no author reads as a
 * generated report; the same words next to his mark read as somebody having looked.
 *
 * ══ ⚠ SKIP IS REAL AND IT IS FOR THIS WEEK ONLY ══
 *
 * PO: *"a card that they can view review or skip."* Skip dismisses THIS week's card and nothing else —
 * it is not a preference, does not disable the feature, and next Monday's review still arrives. A
 * dismissal that quietly turned into an opt-out would be the app deciding something the athlete did
 * not.
 *
 * The dismissal is deliberately in memory rather than stored: the row is snapshotted and permanent, so
 * a skipped review is still findable in full afterwards. Skipping means "not now", and "not now"
 * expiring on the next launch is the honest reading of it.
 */

export interface WeeklyReviewCardProps {
  review: WeeklyReview;
  /** From `useEntitlement('weekly_review')`. False draws the locked face rather than hiding the card. */
  entitled: boolean;
  onView: () => void;
  onSkip: () => void;
}

export function WeeklyReviewCard({ review, entitled, onView, onSkip }: WeeklyReviewCardProps) {
  const d = review.data;
  const sessions = `${d.workouts} ${d.workouts === 1 ? 'session' : 'sessions'}`;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <HoltMark size={BUBBLE_SIZE * 0.72} />
        <View style={styles.headText}>
          <Text style={styles.eyebrow}>Your week</Text>
          <Text style={styles.title}>{entitled ? 'Holt looked at your week' : 'Your week is ready'}</Text>
        </View>
      </View>

      {entitled ? (
        <>
          {/* His line, not the numbers — the numbers are on the screen this opens. A card that showed
              both would be the review, and then there would be nothing to open. */}
          {review.note ? <Text style={styles.note}>{review.note}</Text> : null}
          <View style={styles.stats}>
            <Stat n={sessions} />
            <Stat n={fmtVolume(d.volume_lb)} />
            <Stat n={fmtDuration(d.duration_sec)} />
          </View>
        </>
      ) : (
        /* ⚠ SHOWN AS LOCKED, NEVER HIDDEN. An athlete who cannot see that the feature exists has no
           reason to want it, and hiding it would also make the week look like it did not happen. */
        <Text style={styles.note}>
          {sessions} last week. Holt&apos;s read on it comes with the paid tier.
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable onPress={onView} accessibilityRole="button" accessibilityLabel="View your weekly review" style={styles.primary}>
          <Text style={styles.primaryText}>{entitled ? 'View review' : 'See what you get'}</Text>
        </Pressable>
        <Pressable onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip this week's review" style={styles.skip} hitSlop={8}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ n }: { n: string }) {
  return <Text style={styles.stat}>{n}</Text>;
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 17,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    gap: 12,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headText: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  title: { marginTop: 3, fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },
  note: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  stat: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 },
  primary: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  primaryText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },
  skip: { paddingVertical: 10, paddingHorizontal: 4 },
  skipText: { fontSize: 13, fontWeight: '600', color: flColor.gray600 },
});
