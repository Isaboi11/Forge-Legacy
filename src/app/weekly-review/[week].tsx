import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SkeletonCard } from '@/components/forge/cards/SkeletonCard';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { BUBBLE_SIZE, HoltMark } from '@/components/forge/HoltMark';
import { fmtDuration } from '@/data/squad-feed-live';
import { formatWeekRange } from '@/domain/coach/rulebook/review';
import { displayWeight } from '@/domain/settings/units';
import { fetchWeeklyReview, type WeeklyReview } from '@/data/weekly-review-live';
import { useEntitlement } from '@/lib/entitlement';
import { useUnits } from '@/lib/settings';
import { SCREEN_GUTTER } from '@/lib/screen-insets';

/**
 * YOUR WEEK — the review the Home card opens.
 *
 * Built to the language `squad-recap/[id]` already established for the squad version of this screen:
 * slate ground, serif app bar, bronze uppercase section labels, a divided list card, a boxed stat strip.
 * The two are the same idea one level apart and should not look like two different products.
 *
 * ══ ⚠ WHAT IS DELIBERATELY ABSENT ══
 *
 * **No comparison to last week.** Migration 0140 stores none, and this is the surface where one would
 * turn a review into the scoreboard `Active-Workout-Flow-Spec-W9-W16` §6.2 and Product DNA §8/§10 both
 * bar. The week is described; it is not marked.
 *
 * **No empty state in practice.** A week with no workouts writes no row, so there is nothing to open —
 * the Home card never appears and this screen is never reached. "You trained 0 times" is the
 * nudge-to-engage that `ensure_weekly_review()` returns null specifically to avoid. The empty state
 * below exists only because a deep link can still land here.
 *
 * ══ ⚠ FOUR STATS OF EQUAL WEIGHT, AND WHY IT MATTERS ══
 *
 * A design round promoted Sessions to a 58pt figure and demoted Days to a caption beneath it. It reads
 * well on a big week and breaks on the common one: **volume is legitimately 0 on a bodyweight or cardio
 * week**, and a promoted figure broadcasts that zero where four equal stats simply carry it. Nothing here
 * ranks the four, and nothing should.
 */
export default function WeeklyReviewScreen() {
  const router = useRouter();
  const { week } = useLocalSearchParams<{ week?: string }>();
  const { units, fmt: inUnits, load } = useUnits();
  const { entitled } = useEntitlement('weekly_review');

  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);

  /* One read. `ensure_weekly_review()` is idempotent and returns the stored row after the first call,
     so opening this screen twice costs a read and never a regeneration. */
  useEffect(() => {
    let alive = true;
    void fetchWeeklyReview().then((r) => {
      if (!alive) return;
      setReview(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [week]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const d = review?.data;
  const volume = d ? displayWeight(d.volume_lb, units) : null;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Your Week" onBack={back} />

      {loading ? (
        /* The frame and the app bar are already true — this screen is reached from a card that has
           already told the athlete the week exists — so only the contents wait. A centred spinner would
           claim the whole screen is uncertain. */
        <View style={styles.loading}>
          <SkeletonCard variant="compact" />
          <SkeletonCard variant="stat" />
          <SkeletonCard variant="compact" />
          <SkeletonCard variant="compact" />
        </View>
      ) : !review || !d || !volume ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nothing to review yet</Text>
          <Text style={styles.emptyBody}>Reviews arrive the week after you train. Log a session and this fills in.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.dateRow}>
            <View style={styles.dateRule} />
            <Text style={styles.dates}>{formatWeekRange(review.weekStart, review.weekEnd)}</Text>
          </View>

          {/* Holt first. The numbers are evidence for what he says, so they read better underneath it —
              the same order the Active Workout puts an instruction above the history it came from.

              ⚠ His sentences are SANS. The display is reserved for hero names and screen titles;
              a paragraph set in it reads as a pull quote, and this is a quiet weekly read. */}
          <View style={styles.holt}>
            <HoltMark size={BUBBLE_SIZE} />
            <View style={styles.holtBody}>
              <Text style={styles.holtByline}>Holt · your coach</Text>
              <Text style={styles.note}>
                {entitled
                  ? review.note
                    ? inUnits(review.note)
                    : ''
                  : 'Holt’s read on your week comes with the paid tier. The week itself is yours either way — it is all below.'}
              </Text>
            </View>
          </View>

          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <Stat value={String(d.workouts)} label={d.workouts === 1 ? 'Session' : 'Sessions'} />
              <Stat value={String(d.days_trained)} label={d.days_trained === 1 ? 'Day' : 'Days'} />
            </View>
            <View style={styles.gridRow}>
              <Stat value={volume.value.toLocaleString('en-US')} unit={volume.unit} label="Volume" />
              <Stat value={fmtDuration(d.duration_sec)} label="Under iron" />
            </View>
          </View>

          {/* ⚠ HEAVIEST IS A ROW, NOT A HERO. It is the fallback fact — the thing Holt names only when
              there is no honor and no PR — so it is on almost every week and is the most ordinary line
              here. Giving it the largest figure on the screen would rank the week's most common event
              above its rarest. */}
          {d.top_lift?.weight != null ? (
            <Section label="Heaviest">
              <Row left={d.top_lift.name} right={load(d.top_lift.weight, d.top_lift.reps)} />
            </Section>
          ) : null}

          {d.prs.length > 0 ? (
            <Section label={d.prs.length === 1 ? 'Personal record' : 'Personal records'}>
              {d.prs.map((pr, i) => (
                <Row key={`${pr.exercise}-${i}`} left={pr.exercise} right={pr.value != null ? load(pr.value) : ''} divider={i > 0} />
              ))}
            </Section>
          ) : null}

          {d.honors.length > 0 ? (
            <Section label={d.honors.length === 1 ? 'Honor' : 'Honors'}>
              {d.honors.map((h, i) => (
                /* The same medal-in-a-box the squad recap gives an honor in a list. ⚠ Not a medallion:
                   0140 stores the display name only, with no glyph to key `HonorMedallion` on — and a
                   large medallion here would echo Holt's mark four inches above it. */
                <Row key={`${h.honor}-${i}`} left={h.honor} right="" divider={i > 0} icon={<MedalGlyph />} />
              ))}
            </Section>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ left, right, divider, icon }: { left: string; right: string; divider?: boolean; icon?: React.ReactNode }) {
  return (
    <View style={[styles.row, divider && styles.rowDiv]}>
      {icon ? <View style={styles.rowIcon}>{icon}</View> : null}
      <Text style={styles.rowLeft} numberOfLines={1}>
        {left}
      </Text>
      {right ? <Text style={styles.rowRight}>{right}</Text> : null}
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

/** The squad recap's honor glyph, so an honor looks the same one level down. */
function MedalGlyph({ size = 16, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8.5 3 L12 9" />
      <Path d="M15.5 3 L12 9" />
      <Circle cx={12} cy={15} r={5.4} />
      <Circle cx={12} cy={15} r={2.1} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 14, gap: 22 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', color: flColor.gray400 },
  body: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 48 },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dateRule: { width: 18, height: 1, backgroundColor: flColor.bronzeBorder },
  dates: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase', color: flColor.bronze400 },

  holt: { flexDirection: 'row', alignItems: 'flex-start', gap: 15, marginTop: 18 },
  holtBody: { flex: 1, minWidth: 0, gap: 8 },
  holtByline: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase', color: flColor.bronze400 },
  note: { fontSize: 14, lineHeight: 21, color: flColor.gray400 },

  /* Two rows of two rather than one row of four: at 390pt a quarter-width column cannot hold "5:38:22"
     at this size without shrinking the figures to the point of being labels themselves. The four stay
     equal, which is the part that matters. The divider is the container through a 1px gap. */
  grid: {
    marginTop: 22,
    gap: 1,
    overflow: 'hidden',
    backgroundColor: flColor.charcoal700,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    borderRadius: flRadius.lg,
    boxShadow: flShadow.card,
  },
  gridRow: { flexDirection: 'row', gap: 1 },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', gap: 8, paddingVertical: 18, paddingHorizontal: 8, backgroundColor: flColor.charcoal800 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { fontFamily: flFont.display, fontSize: 25, fontWeight: '600', lineHeight: 27, color: flColor.cream100 },
  statUnit: { fontSize: 12, fontWeight: '600', color: flColor.gray600 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400 },

  section: { marginTop: 26 },
  sectionLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 8 },
  card: {
    overflow: 'hidden',
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 13 },
  rowDiv: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  rowLeft: { flex: 1, fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  rowRight: { flexShrink: 0, fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.bronze300 },
});
