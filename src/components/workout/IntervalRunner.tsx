import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { Button } from '@/components/forge/composites/Button';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { playRestDing, primeDing } from '@/lib/ding';
import { useHaptics } from '@/lib/settings';
import {
  MAX_ROUNDS,
  aboutMinutes,
  clock,
  defaultRounds,
  intervalPlan,
  planSeconds,
  timedMoves,
  type IntervalStep,
} from '@/domain/workout/interval-plan';
import type { SessionExercise } from '@/domain/workout/types';

/**
 * ══ START TIMER — A TIMED WORKOUT, RUN FOR YOU ══
 *
 * PO 2026-09-27: *"Make it user friendly and easy to use. Simple and straightforward."* One screen, three states:
 *
 *   SET UP   what's in it, how many rounds, about how long — Start.
 *   RUNNING  the move, a big countdown, what's next. It moves itself: work → rest → next move, a buzz at 3-2-1
 *            and a ding at each change, so the athlete never has to touch the phone. Pause, Skip, ✕.
 *   DONE     how many moves were logged — back to the workout.
 *
 * A finished WORK step logs that set on the spot (`onLogSet`), so stopping halfway keeps what was done. The order
 * of play is `domain/workout/interval-plan.ts`; this file only owns the clock. The deadline is an epoch, like the
 * rest timer and `HoldTimer`, so a dropped frame or a locked screen cannot lose count — and the screen is kept
 * awake while it runs.
 */
export function IntervalRunner({
  exercises,
  soundOn,
  onLogSet,
  onPrepareRounds,
  onClose,
}: {
  exercises: readonly SessionExercise[];
  soundOn: boolean;
  /** A work step finished: mark set `si` of exercise `ei` done, held for `sec`. */
  onLogSet: (ei: number, si: number, sec: number) => void;
  /** Before running: make sure every timed move has at least `rounds` sets to log into. */
  onPrepareRounds: (rounds: number) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [rounds, setRounds] = useState(() => defaultRounds(exercises));
  const [steps, setSteps] = useState<IntervalStep[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [logged, setLogged] = useState(0);
  const lastBuzz = useRef<number | null>(null);

  const moves = timedMoves(exercises);
  const preview = intervalPlan(exercises, rounds);
  const first = moves.length ? exercises[moves[0]] : null;
  const workSec = first?.sets[0]?.targetSec ?? 0;
  const restSec = first?.restAfterSec ?? 0;
  const done = steps != null && idx >= steps.length;

  /* The screen stays on for the whole run — a timer you have to keep waking is not a timer. */
  useEffect(() => {
    if (!steps || done) return;
    void activateKeepAwakeAsync('interval-runner').catch(() => undefined);
    return () => void deactivateKeepAwake('interval-runner');
  }, [steps, done]);

  /** Move to step `i` (or finish), starting its clock from `at`. */
  const goTo = useCallback((list: IntervalStep[], i: number, at: number) => {
    setIdx(i);
    lastBuzz.current = null;
    setPausedLeft(null);
    setEndsAt(i < list.length ? at + list[i].sec * 1000 : null);
  }, []);

  /** A step ran its full time: log a work step, ding, and go on. */
  const complete = useCallback(
    (list: IntervalStep[], i: number, at: number) => {
      const s = list[i];
      if (s.kind === 'work') {
        onLogSet(s.ei, s.si, s.sec);
        setLogged((n) => n + 1);
      }
      if (soundOn) playRestDing();
      haptics.medium();
      goTo(list, i + 1, at);
    },
    [goTo, haptics, onLogSet, soundOn],
  );

  useEffect(() => {
    if (!steps || endsAt == null) return;
    const t = setInterval(() => {
      const ms = Date.now();
      if (ms >= endsAt) {
        complete(steps, idx, ms);
        return;
      }
      /* 3-2-1: a light buzz on each of the last three seconds. */
      const left = Math.ceil((endsAt - ms) / 1000);
      if (left <= 3 && left !== lastBuzz.current) {
        lastBuzz.current = left;
        haptics.light();
      }
      setNow(ms);
    }, 200);
    return () => clearInterval(t);
  }, [steps, endsAt, idx, complete, haptics]);

  const start = () => {
    primeDing(); // inside the tap: iOS Safari only lets a sound play later if a gesture unlocked it
    onPrepareRounds(rounds);
    const list = intervalPlan(exercises, rounds);
    setSteps(list);
    setLogged(0);
    goTo(list, 0, Date.now());
  };

  const pauseResume = () => {
    if (endsAt != null) {
      setPausedLeft(Math.max(0, endsAt - Date.now()));
      setEndsAt(null);
    } else if (pausedLeft != null) {
      setEndsAt(Date.now() + pausedLeft);
      setPausedLeft(null);
    }
  };

  /* Skip moves on WITHOUT logging — a skipped move was not done. */
  const skip = () => {
    if (!steps) return;
    goTo(steps, idx + 1, Date.now());
  };

  const step = steps && !done ? steps[idx] : null;
  const leftMs = step ? (endsAt != null ? endsAt - now : (pausedLeft ?? step.sec * 1000)) : 0;
  const progress = step && step.sec > 0 ? 1 - Math.max(0, leftMs) / (step.sec * 1000) : 0;
  const workSteps = steps?.filter((s) => s.kind === 'work').length ?? 0;
  const workDoneBefore = steps ? steps.slice(0, idx).filter((s) => s.kind === 'work').length : 0;
  const isRest = step?.kind === 'rest';

  return (
    <Modal visible transparent={false} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.top}>
          <Text style={styles.eyebrow}>
            {step ? `Round ${step.round} of ${Math.min(MAX_ROUNDS, rounds)} · Move ${Math.min(workSteps, workDoneBefore + (isRest ? 0 : 1))} of ${workSteps}` : 'Timed workout'}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the timer" hitSlop={12} style={styles.close}>
            <EngravedIcon name="close" size={18} color={flColor.gray400} />
          </Pressable>
        </View>

        {!steps ? (
          /* ── SET UP ─────────────────────────────────────────────────────────────────────────────── */
          <View style={styles.body}>
            <Text style={styles.title}>Start timer</Text>
            <Text style={styles.sub}>
              {`${moves.length} moves · ${clock(workSec)} on${restSec > 0 ? ` · ${clock(restSec)} rest` : ''}`}
            </Text>
            <View style={styles.moves}>
              {moves.map((ei) => (
                <Text key={ei} style={styles.moveLine} numberOfLines={1}>
                  {exercises[ei].name}
                </Text>
              ))}
            </View>

            <Text style={styles.label}>Rounds</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setRounds((r) => Math.max(1, r - 1))}
                accessibilityRole="button"
                accessibilityLabel="Fewer rounds"
                hitSlop={8}
                style={styles.stepBtn}
              >
                <EngravedIcon name="minus" size={18} color={flColor.cream100} />
              </Pressable>
              <Text style={styles.stepValue} accessibilityLiveRegion="polite">
                {rounds}
              </Text>
              <Pressable
                onPress={() => setRounds((r) => Math.min(MAX_ROUNDS, r + 1))}
                accessibilityRole="button"
                accessibilityLabel="More rounds"
                hitSlop={8}
                style={styles.stepBtn}
              >
                <EngravedIcon name="plus" size={18} color={flColor.cream100} />
              </Pressable>
            </View>
            <Text style={styles.total}>{aboutMinutes(planSeconds(preview))}</Text>

            <View style={styles.grow} />
            <Button variant="primary" fullWidth disabled={!preview.length} onPress={start}>
              Start
            </Button>
          </View>
        ) : done ? (
          /* ── DONE ───────────────────────────────────────────────────────────────────────────────── */
          <View style={[styles.body, styles.center]}>
            <View style={styles.doneMark}>
              <EngravedIcon name="check" size={34} color={flColor.onBronze} />
            </View>
            <Text style={styles.title}>Done</Text>
            <Text style={styles.sub}>{`${logged} ${logged === 1 ? 'move' : 'moves'} logged`}</Text>
            <View style={styles.grow} />
            <Button variant="primary" fullWidth onPress={onClose}>
              Back to workout
            </Button>
          </View>
        ) : step ? (
          /* ── RUNNING ────────────────────────────────────────────────────────────────────────────── */
          <View style={styles.body}>
            <View style={styles.center}>
              <Text style={[styles.phase, isRest ? styles.phaseRest : null]}>{isRest ? 'REST' : 'WORK'}</Text>
              <Text style={styles.moveName} numberOfLines={2} adjustsFontSizeToFit>
                {step.name}
              </Text>
              <Text style={[styles.count, isRest ? styles.countRest : null]} accessibilityLiveRegion="polite">
                {clock(leftMs / 1000)}
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, isRest ? styles.fillRest : null, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
              <Text style={styles.next}>{step.next ? `Next: ${step.next}` : 'Last one'}</Text>
            </View>

            <View style={styles.grow} />
            <View style={styles.controls}>
              <View style={styles.ctl}>
                <Button variant="secondary" fullWidth onPress={pauseResume}>
                  {endsAt == null ? 'Resume' : 'Pause'}
                </Button>
              </View>
              <View style={styles.ctl}>
                <Button variant="secondary" fullWidth onPress={skip}>
                  Skip
                </Button>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 22, backgroundColor: flColor.base },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.labelInk },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingTop: 18 },
  center: { alignItems: 'center' },
  grow: { flex: 1 },

  title: { fontFamily: flFont.display, fontSize: 32, lineHeight: 38, color: flColor.cream100 },
  sub: { marginTop: 6, fontSize: 15, lineHeight: 21, color: flColor.gray400 },
  moves: { marginTop: 18, gap: 6 },
  moveLine: { fontSize: 15, color: flColor.cream100 },
  label: { marginTop: 30, fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 22,
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 36, textAlign: 'center', fontFamily: flFont.display, fontSize: 28, color: flColor.cream100 },
  total: { marginTop: 12, fontSize: 14, color: flColor.gray400 },

  phase: { marginTop: 24, fontSize: 13, fontWeight: '700', letterSpacing: 3, color: flColor.bronze300 },
  phaseRest: { color: flColor.gray400 },
  moveName: { marginTop: 10, textAlign: 'center', fontFamily: flFont.display, fontSize: 34, lineHeight: 40, color: flColor.cream100 },
  count: { marginTop: 18, fontSize: 96, lineHeight: 104, fontWeight: '700', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  countRest: { color: flColor.gray400 },
  track: { alignSelf: 'stretch', height: 8, marginTop: 18, borderRadius: 4, overflow: 'hidden', backgroundColor: flColor.charcoal700 },
  fill: { height: '100%', borderRadius: 4, backgroundColor: flColor.bronze400 },
  fillRest: { backgroundColor: flColor.gray600 },
  next: { marginTop: 18, fontSize: 16, color: flColor.gray400 },

  controls: { flexDirection: 'row', gap: 10 },
  ctl: { flex: 1 },

  doneMark: {
    width: 72,
    height: 72,
    marginTop: 40,
    marginBottom: 16,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.bronze400,
  },
});
