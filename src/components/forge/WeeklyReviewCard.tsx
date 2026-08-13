import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { BUBBLE_SIZE, HoltMark } from '@/components/forge/HoltMark';
import { fmtDuration } from '@/data/squad-feed-live';
import { formatWeekRange } from '@/domain/coach/rulebook/review';
import { displayWeight } from '@/domain/settings/units';
import { useUnits } from '@/lib/settings';
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
 * ⚠ THE MARK IS `HoltMark` AND NOTHING ELSE. It draws its own ring and its own crop. An earlier design
 * round rendered him with the generic *honor* insignia, which on the screen this opens put the coach and
 * an award on screen as the same object. He is not an award.
 *
 * ══ ⚠ SKIP IS REAL AND IT IS FOR THIS WEEK ONLY ══
 *
 * PO: *"a card that they can view review or skip."* Skip dismisses THIS week's card and nothing else —
 * it is not a preference, does not disable the feature, and next Monday's review still arrives. A
 * dismissal that quietly turned into an opt-out would be the app deciding something the athlete did
 * not.
 *
 * ⚠ AND IT STICKS ACROSS LAUNCHES (Amendment 001). It shipped held in memory, on the reading that "not
 * now" should expire on the next launch — which on the web preview meant it expired on the next page
 * refresh, and on the phone on the next cold start. With 0152 unapplied the card had no other way to
 * stand down either, so it came back for seven days. `weekly-review-seen.ts` retires it per `weekStart`:
 * still this week only, still nothing about the feature, but the dismissal now outlives the screen.
 *
 * ⚠ BOTH ACTIONS RETIRE IT. `onView` is not a navigation-only callback — reading the review is the
 * strongest signal the card is spent, and leaving it up afterwards asked the athlete to dismiss
 * something they had already acted on. Neither action deletes anything: the row is snapshotted and
 * permanent, so a retired review is still findable in full at `/weekly-review/[week]`.
 *
 * ⚠ AND SKIP STAYS BESIDE THE PRIMARY, NOT UNDER IT. Two stacked full-width buttons read as two equal
 * choices; a bare text action beside a pill reads as the way out of one. It is respected, not promoted.
 */

export interface WeeklyReviewCardProps {
  review: WeeklyReview;
  /** From `useEntitlement('weekly_review')`. False draws the locked face rather than hiding the card. */
  entitled: boolean;
  /** Open the full week. ⚠ The caller must ALSO retire the card — see the header. */
  onView: () => void;
  onSkip: () => void;
}

export function WeeklyReviewCard({ review, entitled, onView, onSkip }: WeeklyReviewCardProps) {
  const { units, fmt: inUnits } = useUnits();
  const d = review.data;
  const sessions = `${d.workouts} ${d.workouts === 1 ? 'session' : 'sessions'}`;

  /* ⚠ VOLUME CONVERTS LIKE EVERY OTHER LOAD IN THE APP. It shipped as a bare comma-grouped number with
     no unit on it at all, which meant the units formatter had nothing to recognise and a metric athlete
     read pounds without being told. `displayWeight` is the same one conversion the rest of the app uses. */
  const volume = displayWeight(d.volume_lb, units);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <HoltMark size={BUBBLE_SIZE} />
        <View style={styles.headText}>
          {/* Which week, before what he made of it. The card is about last week by definition, so the
              year would be noise here — the screen it opens carries it. */}
          <Text style={styles.eyebrow}>{formatWeekRange(review.weekStart, review.weekEnd, { year: false })}</Text>
          <Text style={styles.title}>{entitled ? 'Holt looked at your week' : 'Your week is ready'}</Text>
        </View>
      </View>

      {/* ⚠ SET IN SANS, NOT THE DISPLAY SERIF. `foundation.css` reserves the serif for hero names, screen
          titles and the legacy statement; a three-sentence paragraph in it reads as a pull quote, and a
          weekly review is a quiet read rather than an announcement.

          The locked line takes the SAME treatment for the opposite reason: it is a product statement, not
          the coach speaking, and it must never be dressed as coaching. */}
      {entitled ? (
        <Text style={styles.note}>{review.note ? inUnits(review.note) : ''}</Text>
      ) : (
        /* ⚠ SHOWN AS LOCKED, NEVER HIDDEN. An athlete who cannot see that the feature exists has no
           reason to want it, and hiding it would also make the week look like it did not happen. */
        <Text style={styles.note}>{sessions} last week. Holt&apos;s read on it comes with the paid tier.</Text>
      )}

      {/* His line is the card; these three are a teaser for the screen it opens. Labelled, because
          "24,180" on its own is a number the athlete has to guess the meaning of. */}
      <View style={styles.strip}>
        <Stat value={String(d.workouts)} label={d.workouts === 1 ? 'Session' : 'Sessions'} />
        <Stat value={volume.value.toLocaleString('en-US')} unit={volume.unit} label="Volume" />
        <Stat value={fmtDuration(d.duration_sec)} label="Under iron" />
      </View>

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

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    /* The bronze heat-glow card treatment — a lit top edge and a faint warm bloom. One step below the
       Mission Card, which is the hero this must never outrank. */
    boxShadow: flShadow.trainTogetherCard,
    gap: 18,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headText: { flex: 1, minWidth: 0, gap: 6 },
  eyebrow: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronze400 },
  title: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', lineHeight: 22, color: flColor.cream100 },
  note: { fontSize: 14, lineHeight: 21, color: flColor.gray400 },

  /* The divider is the container showing through a 1px gap — one rule for three cells, and no stray
     trailing border on the last one. */
  strip: {
    flexDirection: 'row',
    gap: 1,
    overflow: 'hidden',
    backgroundColor: flColor.charcoal700,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.md,
    boxShadow: flShadow.borderInset,
  },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 6, backgroundColor: flColor.surfaceRecessed },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statValue: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', lineHeight: 20, color: flColor.cream100 },
  statUnit: { fontSize: 11, fontWeight: '600', color: flColor.gray600 },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  primary: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  primaryText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },
  skip: { paddingVertical: 11, paddingHorizontal: 4 },
  skipText: { fontSize: 13, fontWeight: '600', color: flColor.gray600 },
});
