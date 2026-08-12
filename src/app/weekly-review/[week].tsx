import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { BUBBLE_SIZE, HoltMark } from '@/components/forge/HoltMark';
import { fmtDuration, fmtVolume } from '@/data/squad-feed-live';
import { fetchWeeklyReview, type WeeklyReview } from '@/data/weekly-review-live';
import { useEntitlement } from '@/lib/entitlement';
import { useUnits } from '@/lib/settings';
import { SCREEN_GUTTER } from '@/lib/screen-insets';

/**
 * YOUR WEEK — the review the Home card opens.
 *
 * Built to the language `squad-recap/[id]` already established for the squad version of this screen:
 * slate ground, serif app bar, bronze uppercase section labels, a divided list card, a stat strip. The
 * two are the same idea one level apart and should not look like two different products.
 *
 * ══ ⚠ WHAT IS DELIBERATELY ABSENT ══
 *
 * **No comparison to last week.** Migration 0140 stores none, and this is the surface where one would
 * turn a review into the scoreboard `Active-Workout-Flow-Spec-W9-W16` §6.2 and Product DNA §8/§10 both
 * bar. The week is described; it is not marked.
 *
 * **No empty state.** A week with no workouts writes no row, so there is nothing to open — the Home
 * card never appears and this screen is never reached. "You trained 0 times" is the nudge-to-engage
 * that `ensure_weekly_review()` returns null specifically to avoid.
 */
export default function WeeklyReviewScreen() {
  const router = useRouter();
  const { week } = useLocalSearchParams<{ week?: string }>();
  const { fmt: inUnits } = useUnits();
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

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Your Week" onBack={back} serif />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : !review || !d ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nothing to review yet</Text>
          <Text style={styles.emptyBody}>Reviews arrive the week after you train. Log a session and this fills in.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.dates}>
            {review.weekStart} — {review.weekEnd}
          </Text>

          {/* Holt first. The numbers are evidence for what he says, so they read better underneath it —
              the same order the Active Workout puts an instruction above the history it came from. */}
          {entitled && review.note ? (
            <View style={styles.holt}>
              <HoltMark size={BUBBLE_SIZE * 0.72} />
              <Text style={styles.note}>{inUnits(review.note)}</Text>
            </View>
          ) : null}
          {!entitled ? (
            <View style={styles.holt}>
              <HoltMark size={BUBBLE_SIZE * 0.72} />
              <Text style={styles.note}>Holt&apos;s read on your week comes with the paid tier. The week itself is yours either way — it is all below.</Text>
            </View>
          ) : null}

          <View style={styles.strip}>
            <Stat n={String(d.workouts)} label={d.workouts === 1 ? 'Session' : 'Sessions'} />
            <Stat n={String(d.days_trained)} label={d.days_trained === 1 ? 'Day' : 'Days'} />
            <Stat n={inUnits(fmtVolume(d.volume_lb))} label="Volume" />
            <Stat n={fmtDuration(d.duration_sec)} label="Under iron" />
          </View>

          {d.top_lift?.weight != null ? (
            <Section label="Heaviest">
              <Row
                left={d.top_lift.name}
                right={inUnits(`${d.top_lift.weight} lb${d.top_lift.reps != null ? ` × ${d.top_lift.reps}` : ''}`)}
              />
            </Section>
          ) : null}

          {d.prs.length > 0 ? (
            <Section label={d.prs.length === 1 ? 'Personal record' : 'Personal records'}>
              {d.prs.map((pr, i) => (
                <Row key={`${pr.exercise}-${i}`} left={pr.exercise} right={pr.value != null ? inUnits(`${pr.value} lb`) : ''} divider={i > 0} />
              ))}
            </Section>
          ) : null}

          {d.honors.length > 0 ? (
            <Section label={d.honors.length === 1 ? 'Honor' : 'Honors'}>
              {d.honors.map((h, i) => (
                <Row key={`${h.honor}-${i}`} left={h.honor} right="" divider={i > 0} />
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

function Row({ left, right, divider }: { left: string; right: string; divider?: boolean }) {
  return (
    <View style={[styles.row, divider && styles.rowDiv]}>
      <Text style={styles.rowLeft} numberOfLines={1}>
        {left}
      </Text>
      {right ? <Text style={styles.rowRight}>{right}</Text> : null}
    </View>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', color: flColor.gray400 },
  body: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 6, paddingBottom: 48 },
  dates: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },
  holt: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 16 },
  note: { flex: 1, fontSize: 15, lineHeight: 23, color: flColor.cream100 },
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 22, marginTop: 22 },
  stat: { minWidth: 68 },
  statN: { fontFamily: flFont.display, fontSize: 21, fontWeight: '600', color: flColor.cream100 },
  statLabel: { marginTop: 2, fontSize: 10.5, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.gray600 },
  section: { marginTop: 26 },
  sectionLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 8 },
  card: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal900, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 13 },
  rowDiv: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  rowLeft: { flex: 1, fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  rowRight: { fontSize: 13, color: flColor.gray400 },
});
