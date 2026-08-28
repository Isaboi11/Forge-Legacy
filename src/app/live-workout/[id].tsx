import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { fetchLiveSession, type LiveSessionView } from '@/data/live-session-live';
import { minutesTraining } from '@/data/presence-live';
import { liveProgress, type LiveExercise, type LiveSet } from '@/domain/workout/live-session';
import { CARDIO_ACTIVITIES, distanceUnitFor, fmtDistanceIn, fmtDuration, type CardioActivity } from '@/domain/workout/conditioning';
import { displayWeight } from '@/domain/settings/units';
import { useUnits } from '@/lib/settings';

/**
 * ══ VIEW WORKOUT — what a friend has logged, and what is planned, while they train ══
 *
 * PO (2026-08-27): *"I see a friend working out rn I should be able to see what they've logged and have
 * planned."* This is that screen. It reads `live_session_of` (0181) every few seconds — the same
 * polling the join request uses, because there is no realtime transport in this app — and draws the
 * snapshot the athlete's own phone publishes.
 *
 * THREE HONEST STATES, and the difference between them is the privacy model:
 *   · not sharing — they are training and the viewer may know it, but `live_session` is private (the
 *     default). The screen says so and offers Join, which is what the row used to offer anyway.
 *   · sharing, nothing published — opted in, but the app they are training on predates 0181. Said as
 *     that, not dressed as an empty session.
 *   · sharing — the plan and the log.
 * A `null` read (the viewer may not even know they train) goes straight back, as `athlete/[id]` does.
 *
 * ⚠ NUMBERS ARE ALLOWED HERE ONLY BECAUSE THE ATHLETE OPTED IN. CC-D2 and WSR-D6 forbid live performance
 *   on always-on surfaces; this is not one — it is behind a per-athlete choice that defaults off, the
 *   same door 0117 opens for a posted workout. Do not surface any of this on a row, a card or a badge.
 */

const POLL_MS = 5000;

export default function LiveWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const athleteId = typeof id === 'string' ? id : '';
  const { units } = useUnits();
  const [view, setView] = useState<LiveSessionView | null | undefined>(undefined);
  const [, setTick] = useState(0);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const read = useCallback(async () => {
    if (!athleteId) return;
    const v = await fetchLiveSession(athleteId);
    setView(v);
  }, [athleteId]);

  useEffect(() => {
    let alive = true;
    void read();
    const poll = setInterval(() => {
      if (alive) void read();
    }, POLL_MS);
    // The minute counter moves on its own, between reads.
    const clock = setInterval(() => alive && setTick((t) => t + 1), 30_000);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [read]);

  const askToJoin = () => router.push({ pathname: '/workout-join', params: { athlete: athleteId } });

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} base="#060708" overlay={{ flat: 'rgba(6,7,8,0.4)' }} />
      <AppBar title="Live workout" onBack={close} />

      {view === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : view === null ? (
        /* The viewer may not know whether this athlete is training — the same silence the profile keeps. */
        <View style={styles.center}>
          <Text style={styles.quiet}>Nothing to show here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.who}>
            <Avatar name={view.name} src={view.avatarUrl ?? undefined} size="listRow" presence={view.training} />
            <View style={styles.whoText}>
              <Text style={styles.name} numberOfLines={1}>
                {view.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {view.training
                  ? [view.snapshot?.workoutName ?? view.label, `${minutesTraining(view.startedAt ?? new Date().toISOString())} min`].filter(Boolean).join(' · ')
                  : 'Not training right now'}
              </Text>
            </View>
          </View>

          {!view.training ? (
            <Text style={styles.quiet}>The session has ended. Their workout will show in the feed if they share it.</Text>
          ) : !view.sharing ? (
            <>
              <Text style={styles.quiet}>
                {view.name} isn’t sharing the details of this session. You can still ask to train with them.
              </Text>
              <Button variant="primary" fullWidth onPress={askToJoin}>
                Ask to join
              </Button>
            </>
          ) : !view.snapshot ? (
            <>
              <Text style={styles.quiet}>{view.name} is sharing, but nothing has come through yet — their app may need an update.</Text>
              <Button variant="primary" fullWidth onPress={askToJoin}>
                Ask to join
              </Button>
            </>
          ) : (
            <>
              <Progress snapshot={view.snapshot} />
              {view.snapshot.exercises.map((e, i) => (
                <ExerciseCard key={`${e.name}-${i}`} exercise={e} current={i === view.snapshot!.exerciseIndex} units={units} />
              ))}
              <View style={styles.joinWrap}>
                <Button variant="secondary" fullWidth onPress={askToJoin}>
                  Ask to join
                </Button>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Progress({ snapshot }: { snapshot: Parameters<typeof liveProgress>[0] }) {
  const p = liveProgress(snapshot);
  const pct = p.setsTotal ? p.setsDone / p.setsTotal : 0;
  return (
    <View style={styles.progress}>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {p.exercisesDone} of {p.exercisesTotal} exercises · {p.setsDone} of {p.setsTotal} sets
        </Text>
        <Text style={styles.progressPct}>{Math.round(pct * 100)}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
    </View>
  );
}

function ExerciseCard({ exercise, current, units }: { exercise: LiveExercise; current: boolean; units: ReturnType<typeof useUnits>['units'] }) {
  const done = exercise.sets.filter((s) => s.done).length;
  const finished = exercise.sets.length > 0 && done === exercise.sets.length;
  return (
    <View style={[styles.card, current ? styles.cardCurrent : null, finished ? styles.cardDone : null]}>
      <View style={styles.cardHead}>
        <Text style={[styles.cardName, finished ? styles.cardNameDone : null]} numberOfLines={2}>
          {exercise.name}
        </Text>
        {current && !finished ? <Text style={styles.nowPill}>NOW</Text> : finished ? <CheckGlyph /> : null}
      </View>
      {exercise.kind === 'cardio' ? (
        <Text style={styles.cardioLine}>{cardioLine(exercise, units === 'metric')}</Text>
      ) : (
        <View style={styles.sets}>
          {exercise.sets.map((s, i) => (
            <SetRow key={i} index={i} set={s} units={units} />
          ))}
        </View>
      )}
    </View>
  );
}

function SetRow({ index, set, units }: { index: number; set: LiveSet; units: ReturnType<typeof useUnits>['units'] }) {
  const w = set.weight != null ? displayWeight(set.weight, units) : null;
  const logged = set.done
    ? set.durationSec != null
      ? fmtDuration(set.durationSec)
      : `${w ? `${w.value} ${w.unit} × ` : ''}${set.reps ?? set.targetReps}`
    : null;
  const planned = set.targetSec != null ? fmtDuration(set.targetSec) : set.targetReps ? `× ${set.targetReps}` : 'to failure';
  return (
    <View style={styles.setRow}>
      <Text style={[styles.setNum, set.done ? styles.setNumDone : null]}>{index + 1}</Text>
      <Text style={[styles.setText, set.done ? styles.setTextDone : null]}>{logged ?? planned}</Text>
      {set.done ? <CheckGlyph small /> : null}
    </View>
  );
}

function cardioLine(e: LiveExercise, metric: boolean): string {
  const activity = (e.activity ?? 'run') as CardioActivity;
  const name = CARDIO_ACTIVITIES.find((a) => a.key === activity)?.name ?? 'Cardio';
  const parts: string[] = [name];
  if (e.targetMi != null) {
    const unit = distanceUnitFor(activity, metric);
    parts.push(`${fmtDistanceIn(e.targetMi, unit)} ${unit}`);
  }
  if (e.targetSec != null) parts.push(fmtDuration(e.targetSec));
  const done = e.sets.some((s) => s.done);
  return `${parts.join(' · ')}${done ? ' · done' : ''}`;
}

function CheckGlyph({ small = false }: { small?: boolean }) {
  const s = small ? 13 : 16;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={flColor.greenMuted} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 44, gap: 12 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  whoText: { flex: 1, minWidth: 0 },
  name: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  meta: { fontSize: 12.5, color: flColor.gray400, marginTop: 2 },
  quiet: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center', paddingVertical: 12 },

  progress: { gap: 8, paddingVertical: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  progressPct: { fontSize: 12.5, fontWeight: '700', color: flColor.bronze300, fontVariant: ['tabular-nums'] },
  track: { height: 4, borderRadius: 2, backgroundColor: flColor.charcoal600, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: flColor.bronze400 },

  card: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  cardCurrent: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  cardDone: { opacity: 0.78 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardName: { flex: 1, fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  cardNameDone: { color: flColor.gray400 },
  nowPill: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, color: flColor.bronze300, paddingHorizontal: 8, paddingVertical: 3, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder },
  cardioLine: { fontSize: 13, color: flColor.gray400 },

  sets: { gap: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 26 },
  setNum: { width: 18, fontSize: 12, fontWeight: '700', color: flColor.gray600, fontVariant: ['tabular-nums'] },
  setNumDone: { color: flColor.greenMuted },
  setText: { flex: 1, fontSize: 14, color: flColor.gray600, fontVariant: ['tabular-nums'] },
  setTextDone: { color: flColor.cream100, fontWeight: '600' },
  joinWrap: { paddingTop: 8 },
});

