import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { fetchTodaysChapterPhotos } from '@/data/photos-live';
import { fetchTrainingPartners } from '@/data/train-together-live';
import { fetchTemplates } from '@/data/templates-live';
import { Avatar } from '@/components/forge/composites/Avatar';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { Card } from '@/components/forge/composites/Surface';
import { Pill } from '@/components/forge/composites/Pill';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourAnchor, useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useUnits } from '@/lib/settings';
import { CardioBlockCard } from '@/components/workout/CardioBlockCard';
import {
  EMPTY_RESULT,
  activityFromKey,
  cardioKey,
  deriveName,
  isCardioKey,
  newCardioBlock,
  type CardioActivity,
} from '@/domain/workout/conditioning';
import { buildSessionFromProgram } from '@/domain/workout/build-session';
import { fetchProgram, fetchProgramCompletedCount } from '@/data/programs-live';
import { nextSession } from '@/domain/program/progress-core';
import { clearWorkoutLaunch, readWorkoutLaunch } from '@/lib/workout-launch';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { clearSession, hasLoggedWork, loadSession, persistSession } from '@/domain/workout/autosave';
import { doneSetCount, hasLoggedSet, PR_MAX_REPS } from '@/domain/workout/metrics';
import { fetchPriorRecords, saveWorkout } from '@/domain/workout/save';
import { equipmentForCatalogKey } from '@/domain/home-artwork/catalog';
import { getRestTimerEnabled, setRestTimerEnabled } from '@/lib/rest-timer-pref';
import { clearExerciseInbox, readExerciseInbox, type PickedExercise } from '@/lib/exercise-inbox';
import type { ActiveSession, SessionExercise, SessionSet } from '@/domain/workout/types';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

type Phase = 'loading' | 'resume' | 'active' | 'saving';
type Picker = { exIdx: number; setIdx: number; field: 'weight' | 'reps' };

const WEIGHT_OPTS = Array.from({ length: 101 }, (_, i) => i * 5); // 0–500 lb by 5 (free weights / machines)
const WEIGHT_OPTS_CABLE = Array.from({ length: 201 }, (_, i) => i * 2.5); // 0–500 lb by 2.5 (cable stacks)
const REPS_OPTS = Array.from({ length: 31 }, (_, i) => i); // 0–30
const DUR_MIN_OPTS = Array.from({ length: 11 }, (_, i) => i); // 0–10 min
const DUR_SEC_OPTS = Array.from({ length: 12 }, (_, i) => i * 5); // 0–55 by 5

/**
 * The partner tagger reads REAL people (0092) — accepted friends and squad-mates.
 *
 * It used to read a hardcoded roster of six invented athletes, which meant `workouts.partners` could only
 * ever be filled with names of people who do not exist. That column has been there since 0016, Activity
 * History renders it as "Trained With", and 0079's twenty-four partnership honors count it — so the only
 * way to earn one was to tag a fiction.
 */
const WHEEL_ITEM = 44;
const WHEEL_PAD = 98; // (240 − 44) / 2 — centers the selected row under the band

function nearestIdx(opts: number[], v: number): number {
  let best = 0;
  let bd = Infinity;
  opts.forEach((o, i) => {
    const d = Math.abs(o - v);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

function fmtMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
/** Thousands separators without leaning on Intl (Hermes-safe). */
function fmtNum(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * W-9..W-16 Active Workout — built to `Forge Active Workout.dc.html` (Design b029488a, the north star).
 * Local-first: the session lives in AsyncStorage (autosave every change, resume after a crash); nothing
 * reaches the cloud until Finish runs the atomic `save_workout` commit.
 *
 * PASS 1 (this file) — the full core to the .dc: the header, the progress band + idle rest chip, the hero
 * exercise card (media slot · name · How To · Last/Goal/Best insight · Memories strip) with collapse, the
 * rich set-logging table (done/current/pending states, editable weight/reps, add/remove), the exercise-nav
 * dot strip, and the End · Next/Finish bottom bar.
 *
 * Deltas vs `.dc`, each its own follow-up pass (tracked): the ACTIVE rest-timer overlay + auto-start
 * (Pass 2), the weight/reps WHEEL picker — a numeric field stands in (Pass 2), the exercise-complete seal
 * + in-flow PR celebration (Pass 3), the workout OVERVIEW/agenda + options menu + add/substitute Exercise
 * Picker (Pass 4), the completion ceremony + partner sheet (Pass 5). Cross-system-blocked (faithful slot,
 * wiring pending): exercise animation media (Phase-4 assets), Memories capture (photo system), Last/Best
 * insight (exercise-history query), the tab bar (active workout is a focused takeover per the nav pattern).
 */
export default function WorkoutScreen() {
  const router = useRouter();
  /* The Memories strip, real. It refreshes on focus because the capture flow is a modal — returning from
     it is the only signal we get that anything was added, and the alternative (guessing from a push that
     returns nothing) would show a photo that might not exist. */
  const { data: memories, refetch: refetchMemories } = useQuery(fetchTodaysChapterPhotos, []);
  const { data: partners } = useQuery(fetchTrainingPartners, []);
  useFocusEffect(
    useCallback(() => {
      refetchMemories();
    }, [refetchMemories]),
  );
  const { finishWorkout, abandonWorkout } = useWorkoutSession();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [resumable, setResumable] = useState<ActiveSession | null>(null);
  /** A launch intent parked because work was already in progress. Null = they just opened the logger. */
  const [pendingLaunch, setPendingLaunch] = useState<Awaited<ReturnType<typeof readWorkoutLaunch>> | null>(null);
  /** Bumped to re-run the mount flow after discarding, so one code path builds every session. */
  const [reloadKey, setReloadKey] = useState(0);
  const [exIdx, setExIdx] = useState(0);
  // A conditioning leg shows distance in the athlete's own system; the record stays in miles.
  const { units } = useUnits();
  const [phase, setPhase] = useState<Phase>('loading');
  const [picker, setPicker] = useState<Picker | null>(null);
  const [pickerValue, setPickerValue] = useState('');
  const [wheelMode, setWheelMode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroPref, setHeroPref] = useState<Record<number, 'expanded' | 'collapsed'>>({});
  const [autoCollapsed, setAutoCollapsed] = useState<Record<number, boolean>>({});
  const [favorite, setFavorite] = useState(false);
  // set-completion celebrations
  const [flash, setFlash] = useState<{ ei: number; si: number; token: number } | null>(null); // green fuse on a row
  const [prShown, setPrShown] = useState<Record<number, boolean>>({}); // one PR per exercise
  const [prPrompt, setPrPrompt] = useState<{ name: string; perf: string; key: string | null } | null>(null);
  /**
   * The athlete's existing record on each lift in this session, so the live PR moment is measured
   * against their history rather than against the set they did ten seconds ago. Undefined for a lift
   * they have never done — which is exactly the case that must stay silent.
   */
  const [priorRecord, setPriorRecord] = useState<Record<string, number> | null>(null);
  const [seal, setSeal] = useState<{ name: string; sets: number; volume: number; next: string | null; token: number } | null>(null);
  const [restEnabled, setRestEnabled] = useState(false); // default OFF; the saved pref loads on mount
  const [restSec, setRestSec] = useState(90);
  // rest-timer runtime — deadline-based so the count survives re-renders and a paused freeze holds its remaining
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restPaused, setRestPaused] = useState(false);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(90);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<{ msg: string; token: number } | null>(null);
  const [pop, setPop] = useState<{ ei: number; si: number; field: 'weight' | 'reps'; token: number } | null>(null);
  const [durationPicker, setDurationPicker] = useState(false);
  const [durMin, setDurMin] = useState(1);
  const [durSec, setDurSec] = useState(30);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  // Walkthrough plumbing. Fires on the FIRST session and nothing after — a PO call: the six things this
  // screen doesn't explain about itself are worth one overlay, and "Skip" is one tap for anyone who is
  // genuinely under a bar.
  const optionsRef = useTourAnchor('workout-options');
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const sessionRef = useRef(session);
  // partner tagging — persists onto the saved workout; Finish opens the 4-stage seal (W-17) on real data
  const [taggedPartners, setTaggedPartners] = useState<string[]>([]);
  const [partnerSheetOpen, setPartnerSheetOpen] = useState(false);

  const showToast = useCallback((msg: string) => {
    const token = Date.now();
    setToast({ msg, token });
    setTimeout(() => setToast((t) => (t && t.token === token ? null : t)), 1900);
  }, []);

  // Resume-or-fresh on mount. A fresh session prefers the launch context (Program Detail's "Continue
  // Training" names the exact program + slot, so the prescription is that day's and the saved workout
  // is attributed back to the program); with no context it falls back to the demo active program.
  useEffect(() => {
    void (async () => {
      const saved = await loadSession();
      /**
       * THE LAUNCH IS READ FIRST, and this order is the whole fix.
       *
       * The resume gate used to run before it, so an unfinished session from days ago swallowed every
       * explicit start: tapping "Treadmill run" on Home landed you in a different workout entirely, and
       * the launch sat unconsumed, waiting to fire at some unrelated moment later.
       *
       * An explicit launch is the athlete asking for something specific, so it must not be silently
       * ignored — but neither may it silently discard work already logged. When both exist, ask.
       */
      const launch = await readWorkoutLaunch();
      const hasWork = hasLoggedWork(saved); // the same rule Home uses to offer "Continue" — see `autosave.ts`
      const wantsSomething = !!launch && (!!launch.conditioning || !!launch.templateId || !!launch.freestyle || !!launch.programId || !!launch.exercises?.length);

      if (hasWork) {
        setResumable(saved);
        setPendingLaunch(wantsSomething ? launch : null);
        setPhase('resume');
        // Held, not consumed: whichever way they answer, `startPending` re-reads it.
        return;
      }
      let fresh: ActiveSession | null = null;

      /* Invited (0092): whoever asked is pre-tagged, so accepting credits both athletes through the
         partner mechanism that already exists rather than a shared-session object two devices would have
         to keep in step. Applied before the branches below, because an invite can carry a template, a
         freestyle session, or neither. */
      if (launch?.partnerId) setTaggedPartners([launch.partnerId]);

      /* An explicit shape (0093) — what an invite carries. Checked before templateId because an invite
         snapshots its workout rather than pointing at one. */
      if (launch?.exercises && launch.exercises.length > 0) {
        const shape = launch.exercises;
        const nm = launch.workoutName ?? 'Shared Workout';
        await clearWorkoutLaunch();
        setSession({
          workoutName: nm,
          activityType: 'strength',
          startedAt: new Date().toISOString(),
          exercises: shape.map((e, i) => ({
            name: e.name,
            catalogKey: e.catalogKey ?? undefined,
            section: 'main',
            position: i,
            sets: Array.from({ length: Math.max(1, e.sets) }, (_, si) => ({
              setIndex: si,
              targetReps: e.targetReps || 8,
              weight: null,
              actualReps: null,
              done: false,
            })),
          })),
        });
        setPhase('active');
        return;
      }

      // A cardio-only session: one block, nothing else. Started from Home's "Something else today?" or
      // anywhere that wants a run without a program around it. Unprescribed, so both targets are open.
      if (launch?.conditioning) {
        await clearWorkoutLaunch();
        const activity = (launch.conditioning.activity ?? 'run') as CardioActivity;
        const modality = launch.conditioning.modality ?? 'outdoor';
        const block = cardioExercise(activity, 0, { modality, targetMi: null, targetPaceSec: null, targetSpdMph: null });
        setSession({
          workoutName: launch.workoutName ?? block.name,
          activityType: 'strength',
          startedAt: new Date().toISOString(),
          exercises: [block],
        });
        setPhase('active');
        return;
      }

      if (launch?.templateId) {
        await clearWorkoutLaunch();
        try {
          const t = (await fetchTemplates()).find((x) => x.id === launch.templateId);
          if (t) {
            setSession({
              workoutName: launch.workoutName ?? t.name,
              activityType: 'strength',
              startedAt: new Date().toISOString(),
              // Attributes the saved workout back to the template (0095) — what makes its "Times used"
              // and session history real, and what makes them count only sessions actually finished.
              templateId: t.id,
              exercises: t.exercises.map((e, i) => {
                // A template that ended in a run comes back as a cardio block, not as sets of it. The
                // modality it was trained in comes back too (0097) — a treadmill session shouldn't
                // silently become a road run the next time you repeat it.
                const act = activityFromKey(e.catalogKey);
                if (e.kind === 'cardio' && act) {
                  return cardioExercise(act, i, {
                    section: e.section ?? 'main',
                    modality: e.modality ?? 'outdoor',
                    targetMi: e.targetMi ?? null,
                    targetPaceSec: null,
                    targetSpdMph: null,
                  });
                }
                return {
                      name: e.name,
                      catalogKey: e.catalogKey ?? undefined,
                      // The template's own section, not a flat 'main' — warm-up and cool-down survived the
                      // round trip as of 0095, and the logger is where that has to show up.
                      section: e.section ?? 'main',
                      position: i,
                  sets: Array.from({ length: Math.max(1, e.sets) }, (_, si) => ({
                    setIndex: si,
                    targetReps: e.targetReps || 8,
                    weight: null,
                    actualReps: null,
                    done: false,
                  })),
                } satisfies SessionExercise;
              }),
            });
            setPhase('active');
            return;
          }
        } catch {
          // a missing template must not block training — fall through to a freestyle session
        }
        setSession({ workoutName: launch.workoutName ?? 'Shared Workout', activityType: 'strength', startedAt: new Date().toISOString(), exercises: [] });
        setPhase('active');
        return;
      }

      if (launch?.freestyle) {
        // A one-off: no program, no prescription. Starts empty and is filled from the Picker as they go.
        await clearWorkoutLaunch();
        setSession({ workoutName: launch.workoutName ?? 'Freestyle Workout', activityType: 'strength', startedAt: new Date().toISOString(), exercises: [] });
        setPhase('active');
        return;
      }
      if (launch?.programId) {
        await clearWorkoutLaunch(); // consume it, so a later ad-hoc workout isn't credited to this program
        try {
          const [program, done] = await Promise.all([
            fetchProgram(launch.programId),
            fetchProgramCompletedCount(launch.programId),
          ]);
          if (program) {
            // Resolve the next session HERE, from the live count, so the session trained is always the
            // one the progress bar is about to advance.
            const next = nextSession(program.structure, done);
            if (next) fresh = buildSessionFromProgram(program.id, program.structure, next.weekIndex, next.dayIndex);
          }
        } catch {
          // fall through to the default session — a lookup failure must not block training
        }
      }
      /**
       * No launch and no saved session means they opened the logger with nothing chosen. That is an
       * EMPTY session — add what you train as you go.
       *
       * It used to be `buildActiveSession()`, which builds a day out of the shipped catalog's demo
       * program: the same fabrication removed from Home and from Workouts, still living here as a
       * fallback. It is what an athlete actually landed in whenever anything upstream went wrong, and it
       * looked convincingly like a real workout they had never chosen.
       */
      setSession(fresh ?? { workoutName: 'Freestyle Workout', activityType: 'strength', startedAt: new Date().toISOString(), exercises: [] });
      setPhase('active');
    })();
  }, [reloadKey]);

  // load the saved rest-timer preference (stays OFF until the athlete has turned it on before)
  useEffect(() => {
    getRestTimerEnabled().then(setRestEnabled);
  }, []);

  // autosave on every change while active
  useEffect(() => {
    if (phase === 'active' && session) void persistSession(session);
  }, [session, phase]);

  /*
   * Read the athlete's existing marks once the session's lifts are known.
   *
   * Keyed on the exercise NAMES rather than the session object, so adding a set or logging reps does not
   * re-fetch — but swapping or adding an exercise does, which is when a new lift's mark is needed.
   */
  const exerciseNames = session?.exercises.map((e) => e.name).join('\u0000') ?? '';
  useEffect(() => {
    if (!exerciseNames) return;
    let alive = true;
    void fetchPriorRecords(exerciseNames.split('\u0000')).then((r) => {
      if (alive) setPriorRecord(r);
    });
    return () => {
      alive = false;
    };
  }, [exerciseNames]);

  // rest ticker — repaints twice a second while running; clears itself when the deadline passes (setState in
  // the interval callback is the async-callback form the strict react-hooks rules allow, like a query result)
  useEffect(() => {
    if (restEndsAt == null || restPaused) return;
    const t = setInterval(() => {
      const ms = Date.now();
      if (ms >= restEndsAt) {
        setRestEndsAt(null);
        showToast('Rest complete — next set.');
      } else setNow(ms);
    }, 500);
    return () => clearInterval(t);
  }, [restEndsAt, restPaused, showToast]);

  // keep the latest session in a ref so the focus drain reads it without re-subscribing on every edit
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // drain the Exercise Picker inbox when the workout regains focus (after add / swap), then jump to it
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void readExerciseInbox().then((inbox) => {
        if (!active || !inbox) return;
        void clearExerciseInbox();
        const cur = sessionRef.current;
        if (!cur) return;
        if (inbox.kind === 'add') {
          const base = cur.exercises.length;
          setSession((s) => (s ? { ...s, exercises: [...s.exercises, ...inbox.items.map((p, i) => pickedToExercise(p, base + i))] } : s));
          setExIdx(base);
          showToast(`Added ${inbox.items.length} ${inbox.items.length === 1 ? 'exercise' : 'exercises'}`);
        } else {
          const idx = inbox.targetIdx;
          if (idx < 0 || idx >= cur.exercises.length) return;
          setSession((s) => (s ? { ...s, exercises: s.exercises.map((e, i) => (i === idx ? swapExercise(e, inbox.item) : e)) } : s));
          setExIdx(idx);
          showToast(`Swapped to ${inbox.item.name}`);
        }
      });
      return () => {
        active = false;
      };
    }, [showToast]),
  );

  const mutate = useCallback((fn: (s: ActiveSession) => ActiveSession) => setSession((s) => (s ? fn(s) : s)), []);

  const startRest = useCallback(() => {
    const ms = Date.now();
    setNow(ms);
    setRestTotal(restSec);
    setRestEndsAt(ms + restSec * 1000);
    setRestPaused(false);
    setPausedRemaining(null);
  }, [restSec]);
  const restRemaining =
    restPaused && pausedRemaining != null
      ? pausedRemaining
      : restEndsAt != null
        ? Math.max(0, Math.ceil((restEndsAt - now) / 1000))
        : 0;
  const restRunning = restEndsAt != null || (restPaused && pausedRemaining != null);
  const restProminent = restRunning && restTotal - restRemaining < 3; // shows for ~3s, then demotes to the compact chip
  const restPauseToggle = () => {
    if (restPaused && pausedRemaining != null) {
      const ms = Date.now();
      setNow(ms);
      setRestEndsAt(ms + pausedRemaining * 1000);
      setRestPaused(false);
      setPausedRemaining(null);
    } else {
      setPausedRemaining(restRemaining);
      setRestPaused(true);
    }
  };
  const restAdjust = (delta: number) => {
    if (restPaused && pausedRemaining != null) setPausedRemaining((r) => Math.max(0, (r ?? 0) + delta));
    else if (restEndsAt != null) setRestEndsAt((e) => (e ?? now) + delta * 1000);
    setRestTotal((t) => Math.max(15, t + delta));
    setRestSec((s) => Math.max(15, s + delta)); // ±15 also nudges the saved default duration
  };
  const restSkip = () => {
    setRestEndsAt(null);
    setRestPaused(false);
    setPausedRemaining(null);
  };
  const toggleRest = () => {
    const next = !restEnabled;
    setRestEnabled(next);
    void setRestTimerEnabled(next); // persist — once on, stays on for later workouts
    if (!next) restSkip(); // turning it off mid-rest clears any running countdown
  };
  const openDuration = () => {
    setDurMin(Math.floor(restSec / 60));
    setDurSec(restSec % 60);
    setDurationPicker(true);
  };
  const confirmDuration = () => {
    setRestSec(Math.max(15, durMin * 60 + durSec)); // floor 15s
    setDurationPicker(false);
  };

  const completeSet = (ei: number, si: number) => {
    if (!session) return;
    const ns = patchSet(session, ei, si, (set) => ({ ...set, done: true, actualReps: set.actualReps ?? set.targetReps }));
    setSession(ns);
    const ex = ns.exercises[ei];
    const done = ex.sets[si];

    // green fuse flash on the row — the token guards a stale timeout from clearing a newer flash
    const token = Date.now();
    setFlash({ ei, si, token });
    setTimeout(() => setFlash((f) => (f && f.token === token ? null : f)), 1500);

    // hero auto-collapses the first time a set resolves on an untouched exercise (per-exercise, once)
    if (!autoCollapsed[ei]) {
      setAutoCollapsed((a) => ({ ...a, [ei]: true }));
      setHeroPref((p) => ({ ...p, [ei]: 'collapsed' }));
    }

    /*
     * A PERSONAL RECORD, against the athlete's actual history.
     *
     * This compared the set to EARLIER SETS IN THIS SESSION, by estimated 1RM — so working up 135 → 185
     * → 225 announced a personal record on the third set of a warm-up ramp, every session, forever. It
     * measured nothing except that you go heavier as you go.
     *
     * A record is now what it is everywhere else: the heaviest weight moved for 1–5 reps, beating what
     * they had already logged for 1–5 reps on this lift. `priorRecord` is undefined for a lift they have
     * never done, and that stays silent — the first time is a baseline, not a record.
     */
    if (!prShown[ei] && done.weight != null && done.actualReps != null && done.actualReps <= PR_MAX_REPS) {
      const prior = priorRecord?.[ex.name];
      if (prior != null && done.weight > prior) {
        const w = done.weight;
        const r = done.actualReps;
        setPrShown((p) => ({ ...p, [ei]: true }));
        setPrPrompt({ name: ex.name, perf: `${w} lb × ${r}`, key: ex.catalogKey ?? null });
      }
    }

    // milestone tier: exercise done (others remain) → non-blocking seal; else more sets → rest (never the last set)
    const exDone = ex.sets.every((s2) => s2.done);
    const allDone = ns.exercises.every((e) => e.sets.every((s2) => s2.done));
    if (allDone) {
      showToast('All exercises complete — tap Finish.');
    } else if (exDone) {
      const volume = ex.sets.reduce((v, s2) => v + (s2.weight != null && s2.actualReps != null ? s2.weight * s2.actualReps : 0), 0);
      const nextEx = ns.exercises.slice(ei + 1).find((e) => !e.sets.every((s2) => s2.done));
      setSeal({ name: ex.name, sets: ex.sets.length, volume: Math.round(volume), next: nextEx?.name ?? null, token });
      setTimeout(() => setSeal((sl) => (sl && sl.token === token ? null : sl)), 2800);
    } else {
      showToast('Set logged');
      if (restEnabled) startRest();
    }
  };
  const uncompleteSet = (ei: number, si: number) => mutate((s) => patchSet(s, ei, si, (set) => ({ ...set, done: false })));
  const addSet = (ei: number) =>
    mutate((s) => {
      const ex = s.exercises[ei];
      const last = ex.sets[ex.sets.length - 1];
      const next: SessionSet = { setIndex: ex.sets.length, weight: last?.weight ?? null, targetReps: last?.targetReps ?? 8, actualReps: null, done: false };
      return replaceExercise(s, ei, { ...ex, sets: [...ex.sets, next] });
    });
  const removeSet = (ei: number) =>
    mutate((s) => {
      const ex = s.exercises[ei];
      if (ex.sets.length <= 1) return s;
      return replaceExercise(s, ei, { ...ex, sets: ex.sets.slice(0, -1) });
    });

  const openPicker = (exI: number, setI: number, field: 'weight' | 'reps') => {
    const set = session?.exercises[exI]?.sets[setI];
    setPickerValue(field === 'weight' ? (set?.weight != null ? String(set.weight) : '') : String(set?.actualReps ?? set?.targetReps ?? ''));
    setPicker({ exIdx: exI, setIdx: setI, field });
  };
  const confirmPicker = () => {
    if (!picker) return;
    const raw = Number(pickerValue);
    const ok = pickerValue !== '' && Number.isFinite(raw) && raw >= 0;
    const clamped = picker.field === 'weight' ? Math.min(500, raw) : Math.min(30, Math.round(raw));
    mutate((s) =>
      patchSet(s, picker.exIdx, picker.setIdx, (set) =>
        picker.field === 'weight' ? { ...set, weight: ok ? clamped : null } : { ...set, actualReps: ok ? clamped : set.actualReps },
      ),
    );
    const token = Date.now();
    setPop({ ei: picker.exIdx, si: picker.setIdx, field: picker.field, token }); // value-pop on the edited cell
    setTimeout(() => setPop((p) => (p && p.token === token ? null : p)), 340);
    setPicker(null);
  };

  // End / Finish → commit the workout, then open the four-stage seal ceremony (W-17) on the committed data.
  // Never a silent discard: the seal IS the completion. Partner tags (from ⋮ Invite) persist onto the save.
  const finishToSeal = async () => {
    if (!session) return;
    restSkip();
    setSeal(null);
    setPhase('saving');
    setError(null);
    try {
      const partnerNames = taggedPartners.map((id) => (partners ?? []).find((p) => p.id === id)?.name).filter((n): n is string => Boolean(n));
      const r = await saveWorkout(session, partnerNames);
      await clearSession();
      finishWorkout();
      router.replace({ pathname: '/workout-complete', params: { id: r.workoutId } });
    } catch (e) {
      setError(errorMessage(e));
      setPhase('active');
    }
  };
  /**
   * Header back — leave WITHOUT finishing.
   *
   * TWO DIFFERENT FACTS, and this used to end neither. "I have unfinished work saved" is the local
   * autosave, and it SHOULD survive — that is what puts "Continue Workout" on Home. "I am training right
   * now" is `profiles.training_since`, broadcast to squad-mates and friends, and it should stop the moment
   * you walk away from the session. Only the successful-save path called `finishWorkout()`, so anyone who
   * started a workout and backed out stayed lit as training to everyone who could see them — until the
   * four-hour staleness window expired them.
   *
   * `abandonWorkout` ends the presence broadcast and the in-memory session. It does NOT clear the autosave,
   * so the work is still there to resume, which is the whole point of leaving this way.
   */
  const onLeave = () => {
    abandonWorkout();
    router.replace('/(tabs)');
  };
  const togglePartner = (id: string) => {
    if (taggedPartners.includes(id)) setTaggedPartners((cur) => cur.filter((x) => x !== id));
    else if (taggedPartners.length >= 3) showToast('Up to 3 partners'); // hard cap of 3
    else setTaggedPartners((cur) => [...cur, id]);
  };

  // ── resume prompt ──
  if (phase === 'resume' && resumable) {
    return (
      <Shell>
        <View style={styles.center}>
          <Card variant="hero" style={styles.resumeCard}>
            <Text style={styles.kicker}>Session in progress</Text>
            <Text style={styles.resumeName}>{resumable.workoutName}</Text>
            <Text style={styles.resumeSub}>
              {doneSetCount(resumable)} sets logged.
              {pendingLaunch ? ' Resume it, or start what you just picked?' : ' Resume where you left off?'}
            </Text>
            <View style={styles.resumeActions}>
              <Button
                variant="primary"
                fullWidth
                onPress={async () => {
                  // Resuming abandons the new intent — otherwise it would ambush them later.
                  if (pendingLaunch) await clearWorkoutLaunch();
                  setPendingLaunch(null);
                  setSession(resumable);
                  setPhase('active');
                }}
                accessibilityLabel="Resume workout"
              >
                Resume
              </Button>
              <Button
                variant="text"
                fullWidth
                onPress={async () => {
                  await clearSession();
                  setResumable(null);
                  // Re-enter the mount flow with no saved work in the way, so the parked launch is
                  // built by the same branches that would have built it in the first place.
                  setPendingLaunch(null);
                  setPhase('loading');
                  setReloadKey((k) => k + 1);
                }}
                accessibilityLabel={pendingLaunch ? 'Discard and start the new one' : 'Discard and start fresh'}
              >
                {pendingLaunch ? 'Discard & start the new one' : 'Discard & start fresh'}
              </Button>
            </View>
          </Card>
        </View>
      </Shell>
    );
  }

  if (phase === 'loading' || phase === 'saving' || !session) {
    return (
      <Shell>
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </Shell>
    );
  }

  // ── empty (a freestyle session before anything is added) ──
  // Guards the whole active render below, which indexes `exercises[exIdx]` and would crash on an empty
  // session. A one-off workout legitimately starts with nothing in it.
  if (session.exercises.length === 0) {
    return (
      <Shell>
        <View style={styles.center}>
          <Card variant="hero" style={styles.resumeCard}>
            <Text style={styles.kicker}>Freestyle</Text>
            <Text style={styles.resumeName}>{session.workoutName}</Text>
            <Text style={styles.resumeSub}>Nothing planned — add whatever you train, as you go.</Text>
            <View style={styles.resumeActions}>
              <Button
                variant="primary"
                fullWidth
                onPress={() => router.push({ pathname: '/exercise-picker', params: { mode: 'add' } })}
                accessibilityLabel="Add an exercise"
              >
                Add Exercise
              </Button>
              <Button
                variant="text"
                fullWidth
                onPress={async () => {
                  // "Not today" discards outright — so BOTH facts end: the autosave and the presence.
                  await clearSession();
                  abandonWorkout();
                  router.replace('/(tabs)');
                }}
                accessibilityLabel="Leave without logging"
              >
                Not today
              </Button>
            </View>
          </Card>
        </View>
      </Shell>
    );
  }

  // ── active ──
  const ex = session.exercises[exIdx];
  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  const setsDone = doneSetCount(session);
  const workoutComplete = hasLoggedSet(session) && session.exercises.every((e) => e.sets.every((s) => s.done));
  const currentSetIdx = ex.sets.findIndex((s) => !s.done); // -1 = all done
  const goalText = `${ex.sets.length}×${ex.sets[0]?.targetReps ?? '—'}`;
  const pickerCable = picker != null && equipmentForCatalogKey(session.exercises[picker.exIdx]?.catalogKey) === 'cable';
  const pickerWeightOpts = pickerCable ? WEIGHT_OPTS_CABLE : WEIGHT_OPTS;
  const heroExpanded = (heroPref[exIdx] ?? 'expanded') !== 'collapsed'; // expand on arrival unless manually collapsed here
  const setHero = (collapsed: boolean) => {
    setHeroPref((p) => ({ ...p, [exIdx]: collapsed ? 'collapsed' : 'expanded' }));
    setAutoCollapsed((a) => ({ ...a, [exIdx]: true })); // a manual choice also blocks the one-time auto-collapse
  };
  const isCardio = ex.kind === 'cardio';

  /**
   * Commit a cardio block: its single set carries the time and the ground covered, and `done` marks it
   * logged the same way a completed strength set does — so the progress dots, the Finish gate and the
   * save path all treat it as an ordinary exercise, which is the point of modelling it as one.
   *
   * `loggedModality` comes from the DRAFT, not from the live toggle: the form's shape was frozen when it
   * opened, and saving must record how the bout was actually done rather than what the card says now.
   */
  /**
   * Commit one cardio bout onto the block.
   *
   * `source` comes FROM THE CARD, which is the only place that knows whether GPS measured the distance
   * or the athlete typed it. This used to read `e.cardio?.source === 'tracked' ? 'tracked' : 'manual'`
   * — inspecting the value it was about to overwrite — which was correct only while a tracked run
   * arrived by a different path entirely. Now that both arrive here, that guess would file every
   * measured run as a claim.
   */
  const saveCardioLog = (r: { distanceMi: number; timeSec: number; inclinePct: number | null; modality: 'outdoor' | 'indoor'; source: 'tracked' | 'manual' }) => {
    mutate((cur) => {
      const withResult = {
        ...cur,
        exercises: cur.exercises.map((e, i) =>
          i !== exIdx
            ? e
            : {
                ...e,
                cardio: {
                  distanceMi: r.distanceMi,
                  timeSec: r.timeSec,
                  inclinePct: r.modality === 'indoor' ? r.inclinePct : (e.cardio?.inclinePct ?? null),
                  loggedModality: r.modality,
                  source: r.source,
                },
              },
        ),
      };
      return patchSet(withResult, exIdx, 0, (set) => ({
        ...set,
        done: true,
        durationSec: r.timeSec,
        distanceMi: r.distanceMi,
        inclinePct: r.modality === 'indoor' ? r.inclinePct : null,
        modality: r.modality,
        actualReps: null,
      }));
    });
    showToast(`${ex.name} logged`);
  };

  /** Switch where the block is being done. Renames it, and never touches what was already recorded. */
  const setCardioModality = (m: 'outdoor' | 'indoor') => {
    if (!ex.activity || ex.modality === m) return;
    const activity = ex.activity;
    mutate((cur) => ({
      ...cur,
      exercises: cur.exercises.map((e, i) =>
        i !== exIdx ? e : { ...e, modality: m, name: deriveName(activity, m) },
      ),
    }));
  };

  const isLastEx = exIdx >= session.exercises.length - 1;
  const primaryLabel = isLastEx ? 'Finish Workout' : 'Next Exercise';
  const goExercise = (idx: number) => {
    setExIdx(Math.max(0, Math.min(session.exercises.length - 1, idx)));
    restSkip(); // leaving an exercise ends its rest
  };
  const onPrimary = () => {
    if (isLastEx) {
      if (hasLoggedSet(session)) void finishToSeal();
    } else goExercise(exIdx + 1);
  };
  const primaryDisabled = isLastEx && !hasLoggedSet(session);
  const popCell = (rowSi: number, field: 'weight' | 'reps', node: ReactNode) =>
    pop && pop.ei === exIdx && pop.si === rowSi && pop.field === field ? <Pop key={pop.token}>{node}</Pop> : node;
  const openAdd = () => {
    setOptionsOpen(false);
    router.push({ pathname: '/exercise-picker', params: { mode: 'add' } });
  };
  const openSwap = () => {
    setOptionsOpen(false);
    router.push({ pathname: '/exercise-picker', params: { mode: 'replace', ex: ex.name, targetIdx: String(exIdx) } });
  };
  const skipExercise = () => {
    setOptionsOpen(false);
    goExercise(exIdx + 1);
  };
  const endFromOptions = () => {
    setOptionsOpen(false);
    void finishToSeal();
  };

  return (
    <Shell>
      <AppBar
        title={<Text style={styles.barTitle} numberOfLines={1}>{session.workoutName}</Text>}
        serif
        onBack={onLeave}
        actions={
          <>
            {/* Session-level, because a memory attaches to the CHAPTER, not to whichever lift you happen
                to be on. It used to live at the bottom of the exercise hero — which auto-collapses the
                first time you log a set, so it vanished exactly when you'd want it. */}
            <Pressable
              onPress={() => router.push('/add-photo')}
              accessibilityRole="button"
              accessibilityLabel="Add a photo or video"
              hitSlop={8}
              style={styles.overflowBtn}
            >
              <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.2-2h8.2l1.2 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
                <Circle cx={12} cy={13} r={3.2} />
              </Svg>
              {(memories ?? []).length > 0 ? <View style={styles.memoryBadge} /> : null}
            </Pressable>
          <Pressable ref={optionsRef} onPress={() => setOptionsOpen(true)} accessibilityRole="button" accessibilityLabel="Workout options" hitSlop={8} style={styles.overflowBtn}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill={flColor.gray400}>
              <Path d="M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </Svg>
          </Pressable>
          </>
        }
      />

      {/* progress band — rest chip flips to a live countdown while resting */}
      <TourAnchor id="workout-rest" style={styles.band}>
        <View style={styles.bandTop}>
          <Text style={styles.doneLabel}>
            <Text style={styles.doneAccent}>{setsDone}</Text> / {totalSets} Done
          </Text>
          {restRunning ? (
            <View style={styles.restActiveChip}>
              <RestRing value={restTotal - restRemaining} max={restTotal} size={26} stroke={3} />
              <Text style={styles.restActiveTime}>{fmtMMSS(restRemaining)}</Text>
              <Pressable onPress={() => restAdjust(-15)} accessibilityRole="button" accessibilityLabel="Subtract 15 seconds" hitSlop={6} style={styles.restMiniBtn}>
                <Text style={styles.restMiniText}>−15</Text>
              </Pressable>
              <Pressable onPress={restPauseToggle} accessibilityRole="button" accessibilityLabel={restPaused ? 'Resume rest' : 'Pause rest'} hitSlop={6} style={styles.restMiniRound}>
                <Svg width={13} height={13} viewBox="0 0 24 24" fill={flColor.bronze300}>
                  {restPaused ? <Path d="M8 5v14l11-7z" /> : <Path d="M6 5h4v14H6zM14 5h4v14h-4z" />}
                </Svg>
              </Pressable>
              <Pressable onPress={() => restAdjust(15)} accessibilityRole="button" accessibilityLabel="Add 15 seconds" hitSlop={6} style={styles.restMiniBtn}>
                <Text style={styles.restMiniText}>+15</Text>
              </Pressable>
              <Pressable onPress={restSkip} accessibilityRole="button" accessibilityLabel="Skip rest" hitSlop={6} style={styles.restMiniBtn}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill={flColor.gray400}>
                  <Path d="M5 5l9 7-9 7zM17 5h2v14h-2z" />
                </Svg>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => (restEnabled ? openDuration() : toggleRest())}
              accessibilityRole="button"
              accessibilityLabel={restEnabled ? 'Edit rest duration' : 'Turn rest timer on'}
              style={[styles.restChip, restEnabled ? styles.restChipOn : null]}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={restEnabled ? flColor.bronze400 : flColor.gray600} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2.4">
                <Path d="M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 9v4l2.5 1.5M9 2h6" />
              </Svg>
              <View style={styles.restChipText}>
                <Text style={styles.restChipKicker}>Rest Timer</Text>
                <Text style={[styles.restChipValue, { color: restEnabled ? flColor.cream100 : flColor.gray600 }]}>{restEnabled ? fmtMMSS(restSec) : 'Off'}</Text>
              </View>
              <Pressable onPress={toggleRest} accessibilityRole="switch" accessibilityState={{ checked: restEnabled }} accessibilityLabel="Toggle rest timer" hitSlop={8} style={[styles.restToggle, restEnabled ? styles.restToggleOn : styles.restToggleOff]}>
                <View style={[styles.restKnob, restEnabled ? styles.restKnobOn : styles.restKnobOff]} />
              </Pressable>
            </Pressable>
          )}
        </View>
        <ProgressBar value={setsDone} max={totalSets || 1} height={6} />
      </TourAnchor>

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* A cardio block replaces the hero as well as the set table. There is no demonstration to play,
            no How To to read and no per-lift Memories strip for a run — and leaving the lifting hero above
            it left two headers stacked on one exercise. The block's own card is the whole surface. */}
        {isCardio ? null : heroExpanded ? (
          <TourAnchor id="workout-hero" style={styles.hero}>
            <View style={styles.heroRow}>
              {/* media slot — engraved dumbbell placeholder (animation art is Phase-4) */}
              <View style={styles.mediaSlot}>
                <Svg width={74} height={74} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" opacity={0.14}>
                  <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
                </Svg>
              </View>
              {/* meta */}
              <View style={styles.heroMeta}>
                <View style={styles.heroTitleRow}>
                  <Text style={styles.heroName}>{ex.name}</Text>
                  <View style={styles.heroActionsTop}>
                    <Pressable onPress={() => setFavorite((v) => !v)} accessibilityRole="button" accessibilityLabel="Save exercise" hitSlop={6} style={styles.heroIconBtn}>
                      <Svg width={19} height={19} viewBox="0 0 24 24" fill={favorite ? flColor.bronze300 : 'none'} stroke={favorite ? flColor.bronze300 : flColor.gray600} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M6 4h12v17l-6-4-6 4z" />
                      </Svg>
                    </Pressable>
                    <Pressable onPress={() => setHero(true)} accessibilityRole="button" accessibilityLabel="Collapse exercise details" hitSlop={6} style={styles.heroIconBtn}>
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M18 15l-6-6-6 6" />
                      </Svg>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.heroEquipRow}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.6} strokeLinecap="square">
                    <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
                  </Svg>
                  <Text style={styles.heroEquip}>Main lift</Text>
                </View>
                <View style={styles.heroTags}>
                  <Pill size="sm">Strength</Pill>
                </View>
                {/* 732 exercises ship published coaching content; this used to open nothing. */}
                <Pressable
                  onPress={() => (ex.catalogKey ? router.push({ pathname: '/exercise/[id]', params: { id: ex.catalogKey } }) : undefined)}
                  accessibilityRole="button"
                  accessibilityLabel={`How to ${ex.name}`}
                  style={styles.howTo}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8}>
                    <Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
                    <Path d="M10 8.5l6 3.5-6 3.5z" fill={flColor.bronze400} stroke="none" />
                  </Svg>
                  <Text style={styles.howToText}>How To</Text>
                </Pressable>
              </View>
            </View>
            {/* insight row: Last · Goal · Best */}
            <View style={styles.insightRow}>
              <View style={styles.insightCol}>
                <Text style={styles.insightLabel}>Last</Text>
                <Text style={styles.insightVal}>—</Text>
              </View>
              <View style={[styles.insightCol, styles.insightMid]}>
                <Text style={styles.insightGoalLabel}>Goal</Text>
                <Text style={styles.insightGoal}>{goalText}</Text>
              </View>
              <View style={styles.insightCol}>
                <Text style={styles.insightLabel}>Best</Text>
                <Text style={styles.insightVal}>—</Text>
              </View>
            </View>
          </TourAnchor>
        ) : (
          <Pressable onPress={() => setHero(false)} accessibilityRole="button" accessibilityLabel="Expand exercise details" style={styles.heroStrip}>
            <View style={styles.heroStripThumb}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.16}>
                <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
              </Svg>
            </View>
            <View style={styles.heroStripText}>
              <Text style={styles.heroStripName} numberOfLines={1}>{ex.name}</Text>
              <Text style={styles.heroStripMeta}>Goal <Text style={styles.heroStripGoal}>{goalText}</Text></Text>
            </View>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M6 9l6 6 6-6" />
            </Svg>
          </Pressable>
        )}

        {/* The block stands where the hero AND the table would: same position in the session, entirely
            different measurement. Sets of reps have nothing to say about three miles. */}
        {isCardio ? (
          <CardioBlockCard
            exercise={ex}
            index={exIdx}
            units={units}
            onSetModality={setCardioModality}
            onSave={saveCardioLog}
          />
        ) : (
        <TourAnchor id="workout-sets" style={styles.table}>
          <View style={styles.headRow}>
            <Text style={[styles.h, styles.cSet]}>Set</Text>
            <Text style={[styles.h, styles.cTarget]}>Target</Text>
            <Text style={[styles.h, styles.cWeight]}>Weight (lb)</Text>
            <Text style={[styles.h, styles.cActual]}>Actual</Text>
          </View>
          <View style={styles.rows}>
            {ex.sets.map((set, si) => {
              const isDone = set.done;
              const isCurrent = !isDone && si === currentSetIdx;
              const ringColor = isDone ? flColor.greenMuted : isCurrent ? flColor.bronze400 : flColor.charcoal500;
              const numColor = isDone ? flColor.greenMuted : isCurrent ? flColor.bronze300 : flColor.gray600;
              const valColor = isDone || isCurrent ? flColor.cream100 : flColor.gray600;
              return (
                <View key={si} style={[styles.row, isDone && styles.rowDone, isCurrent && styles.rowCurrent]}>
                  {flash && flash.ei === exIdx && flash.si === si ? <FuseFlash key={flash.token} /> : null}
                  <View style={[styles.cSet, styles.setCell]}>
                    <View style={[styles.setNum, { borderColor: ringColor }]}>
                      <Text style={[styles.setNumText, { color: numColor }]}>{si + 1}</Text>
                    </View>
                    {isDone ? (
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.greenMuted} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M20 6L9 17l-5-5" />
                      </Svg>
                    ) : null}
                  </View>
                  <View style={styles.cTarget}>
                    <Text style={[styles.targetText, { color: valColor }]}>{set.targetReps}<Text style={styles.repsLabel}> Reps</Text></Text>
                  </View>
                  <Pressable style={[styles.cWeight, styles.weightBtn]} onPress={() => openPicker(exIdx, si, 'weight')} accessibilityRole="button" accessibilityLabel={`Edit weight, set ${si + 1}`}>
                    {popCell(si, 'weight', <Text style={[styles.weightText, { color: valColor }]}>{set.weight != null ? set.weight : '—'}</Text>)}
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.85}>
                      <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </Svg>
                  </Pressable>
                  <View style={[styles.cActual, styles.actualCell]}>
                    {isDone ? (
                      <>
                        <Pressable onPress={() => openPicker(exIdx, si, 'reps')} accessibilityLabel={`Edit actual reps, set ${si + 1}`}>
                          {popCell(si, 'reps', <Text style={styles.actualDone}>{set.actualReps ?? set.targetReps}</Text>)}
                        </Pressable>
                        <Pressable onPress={() => uncompleteSet(exIdx, si)} accessibilityRole="button" accessibilityLabel={`Mark set ${si + 1} incomplete`} style={styles.checkDoneBtn}>
                          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.greenMuted} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M20 6L9 17l-5-5" />
                          </Svg>
                        </Pressable>
                      </>
                    ) : isCurrent ? (
                      <>
                        <Pressable onPress={() => openPicker(exIdx, si, 'reps')} accessibilityLabel={`Edit actual reps, set ${si + 1}`}>
                          {popCell(si, 'reps', <Text style={styles.actualCurrent}>{set.actualReps ?? set.targetReps}</Text>)}
                        </Pressable>
                        <Pressable onPress={() => completeSet(exIdx, si)} accessibilityRole="button" accessibilityLabel={`Complete set ${si + 1}`} style={styles.checkCurrent}>
                          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M20 6L9 17l-5-5" />
                          </Svg>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Text style={styles.actualPending}>—</Text>
                        <View style={styles.checkPending} />
                      </>
                    )}
                  </View>
                </View>
              );
            })}
            <TourAnchor id="workout-addset" style={styles.setBtns}>
              <Pressable onPress={() => addSet(exIdx)} accessibilityRole="button" accessibilityLabel="Add set" style={styles.addSet}>
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round">
                  <Path d="M12 5v14M5 12h14" />
                </Svg>
                <Text style={styles.addSetText}>Add Set</Text>
              </Pressable>
              {ex.sets.length > 1 ? (
                <Pressable onPress={() => removeSet(exIdx)} accessibilityRole="button" accessibilityLabel="Remove last set" style={styles.removeSet}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                  </Svg>
                  <Text style={styles.removeSetText}>Remove</Text>
                </Pressable>
              ) : null}
            </TourAnchor>
          </View>
        </TourAnchor>
        )}

        {/* exercise nav dots */}
        <View style={styles.nav}>
          <Pressable disabled={exIdx === 0} onPress={() => goExercise(exIdx - 1)} accessibilityLabel="Previous exercise" style={styles.navArrow}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={exIdx === 0 ? flColor.charcoal500 : flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 6l-6 6 6 6" />
            </Svg>
          </Pressable>
          <View style={styles.dots}>
            {session.exercises.map((e, i) => {
              const eDone = e.sets.every((s) => s.done);
              const isCur = i === exIdx;
              const skipped = !isCur && !eDone && i < exIdx; // passed it by without finishing
              return (
                <Pressable key={i} onPress={() => goExercise(i)} accessibilityLabel={e.name} hitSlop={6}>
                  <View style={[styles.dot, isCur ? styles.dotCurrent : eDone ? styles.dotDone : skipped ? styles.dotSkipped : null]} />
                </Pressable>
              );
            })}
          </View>
          <Pressable disabled={isLastEx} onPress={() => goExercise(exIdx + 1)} accessibilityLabel="Next exercise" style={styles.navArrow}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={isLastEx ? flColor.charcoal500 : flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 6l6 6-6 6" />
            </Svg>
          </Pressable>
        </View>
        <Pressable onPress={() => setOverviewOpen(true)} accessibilityRole="button" accessibilityLabel="View full workout plan" style={styles.overviewBtn}>
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </Svg>
          <Text style={styles.overviewText}>View Plan · {exIdx + 1} / {session.exercises.length}</Text>
        </Pressable>

        {error ? <Text style={styles.err}>Couldn’t save — {error}. Try again.</Text> : null}
      </ScrollView>

      {/* bottom actions */}
      <View style={styles.bottom}>
        {workoutComplete ? (
          <View style={styles.completeNote}>
            <View style={styles.completeDot} />
            <Text style={styles.completeNoteText}>All exercises complete</Text>
          </View>
        ) : null}
        <View style={styles.bottomRow}>
          <View style={styles.endWrap}>
            <Button variant="secondary" fullWidth onPress={() => void finishToSeal()} accessibilityLabel="End workout">
              End Workout
            </Button>
          </View>
          <View style={[styles.primaryWrap, workoutComplete && styles.primaryGlow]}>
            <Button variant="primary" fullWidth disabled={primaryDisabled} onPress={onPrimary} accessibilityLabel={primaryLabel}>
              {primaryLabel}
            </Button>
          </View>
        </View>
      </View>

      {/* prominent rest overlay — floats near the top for ~3s, then demotes to the compact band chip */}
      {restProminent ? (
        <View style={styles.restOverlayWrap} pointerEvents="box-none">
          <View style={styles.restOverlay}>
            <Text style={styles.restOverlayLabel}>Rest</Text>
            <RestRing value={restTotal - restRemaining} max={restTotal} size={112} stroke={6}>
              <Text style={styles.restOverlayTime}>{fmtMMSS(restRemaining)}</Text>
            </RestRing>
            <View style={styles.restOverlayControls}>
              <Pressable onPress={() => restAdjust(-15)} accessibilityRole="button" accessibilityLabel="Subtract 15 seconds" style={styles.restCtlBtn}>
                <Text style={styles.restCtlText}>−15s</Text>
              </Pressable>
              <Pressable onPress={restPauseToggle} accessibilityRole="button" accessibilityLabel={restPaused ? 'Resume rest' : 'Pause rest'} style={styles.restCtlRound}>
                <Svg width={17} height={17} viewBox="0 0 24 24" fill={flColor.bronze300}>
                  {restPaused ? <Path d="M8 5v14l11-7z" /> : <Path d="M6 5h4v14H6zM14 5h4v14h-4z" />}
                </Svg>
              </Pressable>
              <Pressable onPress={() => restAdjust(15)} accessibilityRole="button" accessibilityLabel="Add 15 seconds" style={styles.restCtlBtn}>
                <Text style={styles.restCtlText}>+15s</Text>
              </Pressable>
            </View>
            <Pressable onPress={restSkip} accessibilityRole="button" accessibilityLabel="Skip rest" style={styles.restSkip} hitSlop={6}>
              <Text style={styles.restSkipText}>Skip Rest</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* exercise-complete seal — non-blocking, auto-dismisses (taps pass through to the sets below) */}
      {seal ? (
        <View style={styles.sealWrap} pointerEvents="none">
          <View style={styles.sealCard}>
            <View style={styles.sealMedal}>
              <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#1A1206" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 6L9 17l-5-5" />
              </Svg>
            </View>
            <Text style={styles.sealKicker}>Exercise Complete</Text>
            <Text style={styles.sealName}>{seal.name}</Text>
            <View style={styles.sealStats}>
              <Text style={styles.sealStatText}>{seal.sets} Sets</Text>
              <View style={styles.sealDot} />
              <Text style={styles.sealStatText}>{fmtNum(seal.volume)} lb</Text>
            </View>
            {seal.next ? (
              <Text style={styles.sealNext}>
                Up Next — <Text style={styles.sealNextName}>{seal.next}</Text>
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* PR prompt — a within-session record + an invitation to capture it */}
      {prPrompt ? (
        <View style={styles.prWrap}>
          <Pressable style={styles.prBackdrop} onPress={() => setPrPrompt(null)} accessibilityLabel="Dismiss" />
          <View style={styles.prCard}>
            <View style={styles.prMedal}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="#1A1206">
                <Path d="M12 2l2.6 7.1H22l-6 4.4 2.3 7.1-6.3-4.6-6.3 4.6 2.3-7.1-6-4.4h7.4z" />
              </Svg>
            </View>
            <Text style={styles.prKicker}>New Personal Record</Text>
            <Text style={styles.prName}>{prPrompt.name}</Text>
            <Text style={styles.prPerf}>{prPrompt.perf}</Text>
            <Text style={styles.prBody}>Capture the moment — add a photo or video to your legacy.</Text>
            <View style={styles.prBtns}>
              <Button
                variant="primary"
                fullWidth
                onPress={() => {
                  const p = prPrompt;
                  setPrPrompt(null);
                  // The photo is OF this lift, not just of today (0090) — the capture flow labels and
                  // stars it from the lift rather than asking again.
                  router.push({ pathname: '/add-photo', params: p.key ? { exercise: p.key, perf: p.perf } : {} });
                }}
                accessibilityLabel="Add photo or video"
              >
                Add Photo / Video
              </Button>
              <Button variant="text" fullWidth onPress={() => setPrPrompt(null)} accessibilityLabel="Not now">
                Not now
              </Button>
            </View>
          </View>
        </View>
      ) : null}

      {/* weight / reps picker — wheel (default) or type */}
      {picker ? (
        <View style={styles.pickerWrap}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setPicker(null)} accessibilityLabel="Close picker" />
          <View style={styles.picker}>
            <View style={styles.pickerHead}>
              <Text style={styles.pickerTitle}>{picker.field === 'weight' ? 'Weight' : 'Actual Reps'}</Text>
              <Pressable onPress={() => setWheelMode((v) => !v)} accessibilityRole="button" accessibilityLabel={wheelMode ? 'Type the value' : 'Use the wheel'} style={styles.pickerToggle}>
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  {wheelMode ? <Path d="M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /> : <Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2" />}
                </Svg>
                <Text style={styles.pickerToggleText}>{wheelMode ? 'Type' : 'Wheel'}</Text>
              </Pressable>
            </View>
            {wheelMode ? (
              <WheelPicker
                options={picker.field === 'weight' ? pickerWeightOpts : REPS_OPTS}
                value={Number(pickerValue) || 0}
                unit={picker.field === 'weight' ? 'lb' : 'Reps'}
                onChange={(v) => setPickerValue(String(v))}
              />
            ) : (
              <View style={styles.keypad}>
                <Text style={styles.keypadHint}>Type the value</Text>
                <TextInput style={styles.keypadInput} value={pickerValue} onChangeText={(t) => setPickerValue(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" autoFocus onSubmitEditing={confirmPicker} accessibilityLabel="Value" />
                <Text style={styles.keypadUnit}>{picker.field === 'weight' ? 'lb' : 'Reps'}</Text>
              </View>
            )}
            <View style={styles.pickerBtns}>
              <Button variant="primary" fullWidth onPress={confirmPicker} accessibilityLabel="Set value">
                Set
              </Button>
              <Button variant="text" fullWidth onPress={() => setPicker(null)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
          </View>
        </View>
      ) : null}

      {/* rest-duration picker — minutes : seconds dual wheel */}
      {durationPicker ? (
        <View style={styles.pickerWrap}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setDurationPicker(false)} accessibilityLabel="Close" />
          <View style={styles.picker}>
            <Text style={styles.pickerTitle}>Rest Duration</Text>
            <View style={styles.durHeader}>
              <Text style={styles.durHeaderLabel}>Minutes</Text>
              <Text style={styles.durHeaderLabel}>Seconds</Text>
            </View>
            <View style={styles.durWheels}>
              <View style={styles.durCol}>
                <WheelPicker options={DUR_MIN_OPTS} value={durMin} unit="" onChange={setDurMin} />
              </View>
              <Text style={styles.durColon}>:</Text>
              <View style={styles.durCol}>
                <WheelPicker options={DUR_SEC_OPTS} value={durSec} unit="" onChange={setDurSec} />
              </View>
            </View>
            <View style={styles.pickerBtns}>
              <Button variant="primary" fullWidth onPress={confirmDuration} accessibilityLabel="Set rest duration">
                Set
              </Button>
              <Button variant="text" fullWidth onPress={() => setDurationPicker(false)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
          </View>
        </View>
      ) : null}

      {/* workout overview — the full plan, jump to any exercise */}
      {overviewOpen ? (
        <View style={styles.pickerWrap}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setOverviewOpen(false)} accessibilityLabel="Close" />
          <View style={[styles.picker, styles.overviewSheet]}>
            <Text style={styles.pickerTitle}>Workout Plan</Text>
            <ScrollView style={styles.overviewList} contentContainerStyle={styles.overviewListContent} showsVerticalScrollIndicator={false}>
              {session.exercises.map((e, i) => {
                const total = e.sets.length;
                const done = e.sets.filter((s) => s.done).length;
                const eDone = done === total;
                const isCur = i === exIdx;
                const status = isCur ? 'Current' : eDone ? 'Completed' : i < exIdx ? 'Skipped' : 'Up Next';
                const w = e.sets[0]?.weight;
                const tint = isCur ? flColor.bronze400 : eDone ? flColor.greenMuted : status === 'Skipped' ? flColor.emberFlame : flColor.gray600;
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setOverviewOpen(false);
                      goExercise(i);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${e.name}, ${status}`}
                    style={[styles.ovRow, isCur && styles.ovRowCurrent]}
                  >
                    <View style={[styles.ovStatusDot, { backgroundColor: tint }]} />
                    <View style={styles.ovRowText}>
                      <Text style={styles.ovRowName} numberOfLines={1}>{e.name}</Text>
                      <Text style={styles.ovRowSub}>
                        {status} · {done}/{total} sets{w != null ? ` · ${w} lb` : ''}
                      </Text>
                    </View>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M9 6l6 6-6 6" />
                    </Svg>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button variant="text" fullWidth onPress={() => setOverviewOpen(false)} accessibilityLabel="Close">
              Close
            </Button>
          </View>
        </View>
      ) : null}

      {/* workout options (⋮) */}
      {optionsOpen ? (
        <View style={styles.pickerWrap}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setOptionsOpen(false)} accessibilityLabel="Close" />
          <View style={styles.picker}>
            <Text style={styles.pickerTitle}>Workout Options</Text>
            <View style={styles.optList}>
              <OptionRow onPress={openAdd} tint title="Add an exercise" sub="Pick another movement for this session" icon={<Path d="M12 5v14M5 12h14" />} />
                      <OptionRow onPress={openSwap} title="Swap this exercise" sub="Pick a different movement" icon={<Path d="M4 7h13l-3-3M20 17H7l3 3" />} />
              <OptionRow onPress={skipExercise} title="Skip this exercise" sub="Move on to the next one" icon={<Path d="M5 5l9 7-9 7zM18 5v14" />} />
              <OptionRow
                onPress={() => {
                  setOptionsOpen(false);
                  setPartnerSheetOpen(true);
                }}
                title="Invite training partner"
                sub="They’ll do this workout too"
                icon={
                  <>
                    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <Circle cx={9} cy={7} r={4} />
                    <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </>
                }
              />
              <OptionRow onPress={endFromOptions} danger title="End workout" sub="Finish and save your session" icon={<Rect x={6} y={6} width={12} height={12} rx={1.5} />} />
            </View>
          </View>
        </View>
      ) : null}

      {/* partner selection sheet (W-20) — opened from ⋮ Invite; tags persist onto the saved workout */}
      {partnerSheetOpen ? (
        <View style={styles.pickerWrap}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setPartnerSheetOpen(false)} accessibilityLabel="Close" />
          <View style={[styles.picker, styles.partnerSheet]}>
            <View style={styles.grabHandle} />
            <View style={styles.partnerHeader}>
              <Text style={styles.partnerHeaderTitle}>Trained with</Text>
              <Text style={styles.partnerCount}>{taggedPartners.length} of 3</Text>
            </View>
            <ScrollView style={styles.partnerScroll} showsVerticalScrollIndicator={false}>
              {(partners ?? []).length === 0 ? (
                <Text style={styles.partnerEmpty}>
                  Add a friend or join a squad, and the people you train alongside show up here.
                </Text>
              ) : (
                (partners ?? []).map((p) => {
                  const on = taggedPartners.includes(p.id);
                  return (
                    <Pressable key={p.id} onPress={() => togglePartner(p.id)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${on ? 'Remove' : 'Add'} ${p.name}`} style={[styles.prow, on && styles.prowOn]}>
                      <Avatar name={p.name} src={p.avatarUrl ?? undefined} size={38} />
                      <View style={styles.pText}>
                        <Text style={styles.pName}>{p.name}</Text>
                        <Text style={styles.pSub}>{p.squadName ?? (p.handle ? `@${p.handle}` : 'Friend')}</Text>
                      </View>
                      <View style={[styles.pCheck, on && styles.pCheckOn]}>
                        {on ? (
                          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#1A1206" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M20 6L9 17l-5-5" />
                          </Svg>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Button variant="primary" fullWidth onPress={() => setPartnerSheetOpen(false)} accessibilityLabel="Done">
              {taggedPartners.length ? `Done · ${taggedPartners.length} tagged` : 'Done'}
            </Button>
          </View>
        </View>
      ) : null}

      {/* toast — brief status line above the bottom bar */}
      {toast ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <Toast key={toast.token} msg={toast.msg} />
        </View>
      ) : null}

      <ScreenTour screenKey="workout" />
    </Shell>
  );
}

// ── helpers ──
function patchSet(s: ActiveSession, ei: number, si: number, fn: (set: SessionSet) => SessionSet): ActiveSession {
  const ex = s.exercises[ei];
  const sets = ex.sets.map((set, i) => (i === si ? fn(set) : set));
  return replaceExercise(s, ei, { ...ex, sets });
}
function replaceExercise(s: ActiveSession, ei: number, ex: ActiveSession['exercises'][0]): ActiveSession {
  return { ...s, exercises: s.exercises.map((e, i) => (i === ei ? ex : e)) };
}
/** A freshly-added (freestyle) exercise from the picker — 3 blank working sets. */
/**
 * One cardio block, in session shape. Every construction site — the picker, a program day, a template,
 * and a conditioning launch — goes through here so they cannot drift apart on the synthetic set, the
 * derived name, or which fields a block is supposed to carry.
 */
function cardioExercise(
  activity: CardioActivity,
  position: number,
  opts: { section?: SessionExercise['section']; targetMi?: number | null; targetPaceSec?: number | null; targetSpdMph?: number | null; modality?: 'outdoor' | 'indoor'; name?: string } = {},
): SessionExercise {
  const modality = opts.modality ?? 'outdoor';
  const base = newCardioBlock(activity);
  return {
    catalogKey: cardioKey(activity),
    name: opts.name ?? deriveName(activity, modality),
    kind: 'cardio',
    activity,
    modality,
    // `undefined` means "not specified, use the authored default"; `null` means "deliberately open".
    targetMi: opts.targetMi === undefined ? base.targetMi : opts.targetMi,
    targetPaceSec: opts.targetPaceSec === undefined ? base.targetPaceSec ?? null : opts.targetPaceSec,
    targetSpdMph: opts.targetSpdMph === undefined ? base.targetSpdMph ?? null : opts.targetSpdMph,
    cardio: { ...EMPTY_RESULT },
    section: opts.section ?? 'main',
    position,
    // The single synthetic set: one run is one unit of progress, and no progress math learns about cardio.
    sets: [{ setIndex: 0, targetReps: 0, weight: null, actualReps: null, done: false, durationSec: null, distanceMi: null }],
  };
}

function pickedToExercise(p: PickedExercise, position: number): SessionExercise {
  // A run picked from the catalog becomes a CARDIO BLOCK, not three sets of eight — the picker returns
  // it like any other exercise, and this is where the two kinds diverge. Added ad hoc, so it carries no
  // target: nothing prescribed it.
  const picked = activityFromKey(p.catalogKey);
  if (picked) return cardioExercise(picked, position, { targetMi: null, targetPaceSec: null, targetSpdMph: null });
  return {
    catalogKey: p.catalogKey,
    name: p.name,
    section: 'main',
    position,
    sets: Array.from({ length: 3 }, (_, s) => ({ setIndex: s, weight: null, targetReps: 8, actualReps: null, done: false })),
  };
}
/** A swap keeps the slot's set structure (count × target) but is a different movement — clear the logged work. */
function swapExercise(ex: SessionExercise, p: PickedExercise): SessionExercise {
  // Swapping a lift for a run (or back) changes what the slot IS, so it cannot keep the old set
  // structure — three sets of eight is not a shape a run has. This is the path someone takes when the
  // program said Outdoor Run and it started raining.
  if (isCardioKey(p.catalogKey) !== (ex.kind === 'cardio')) {
    return pickedToExercise(p, ex.position);
  }
  return {
    ...ex,
    catalogKey: p.catalogKey,
    name: p.name,
    sets: ex.sets.map((st) => ({ ...st, weight: null, actualReps: null, done: false })),
  };
}
function Toast({ msg }: { msg: string }) {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [a]);
  return (
    <Animated.View style={[styles.toast, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      <Text style={styles.toastText}>{msg}</Text>
    </Animated.View>
  );
}

/** A brief 1 → 1.16 → 1 value-pop, played on a freshly edited weight/reps cell. */
function Pop({ children }: { children: ReactNode }) {
  const s = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    Animated.sequence([
      Animated.timing(s, { toValue: 1.16, duration: 110, useNativeDriver: true }),
      Animated.spring(s, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [s]);
  return <Animated.View style={{ transform: [{ scale: s }] }}>{children}</Animated.View>;
}

function OptionRow({ onPress, title, sub, icon, tint, danger }: { onPress: () => void; title: string; sub: string; icon: ReactNode; tint?: boolean; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={[styles.optRow, tint && styles.optRowTint, danger && styles.optRowDanger]}>
      <View style={[styles.optIcon, danger && styles.optIconDanger]}>
        <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={danger ? flColor.redMuted : flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </Svg>
      </View>
      <View style={styles.optText}>
        <Text style={[styles.optTitle, danger && styles.optTitleDanger]}>{title}</Text>
        <Text style={styles.optSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

/**
 * The green fuse celebration — one-shot when a set is logged. Measures its row, then animates an SVG
 * border: a green stroke draws around the box while a brighter "head" segment races the perimeter (the
 * closest RN analogue of the design's CSS `offset-path` head), fading out at the end. JS-driven (stroke
 * props can't use the native driver) but it's a sub-second, one-off animation so that's fine.
 */
function FuseFlash() {
  const [d, setD] = useState<{ w: number; h: number } | null>(null);
  const anim = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
  }, [anim]);
  const rx = 10;
  const per = d ? 2 * (d.w + d.h) - 8 * rx + 2 * Math.PI * rx : 0;
  const opacity = anim.interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 1, 0] });
  return (
    <View
      style={styles.fuseWrap}
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setD((p) => (p && p.w === width && p.h === height ? p : { w: width, h: height }));
      }}
    >
      {d ? (
        <AnimatedSvg width={d.w} height={d.h} style={{ opacity }}>
          <AnimatedRect x={1.5} y={1.5} width={d.w - 3} height={d.h - 3} rx={rx} fill="none" stroke={flColor.greenMuted} strokeWidth={2} strokeDasharray={`${per}`} strokeDashoffset={anim.interpolate({ inputRange: [0, 1], outputRange: [per, 0] })} />
          <AnimatedRect x={1.5} y={1.5} width={d.w - 3} height={d.h - 3} rx={rx} fill="none" stroke="#8FE6A6" strokeWidth={3} strokeLinecap="round" strokeDasharray={`${72} ${per}`} strokeDashoffset={anim.interpolate({ inputRange: [0, 1], outputRange: [0, -per] })} />
        </AnimatedSvg>
      ) : null}
    </View>
  );
}
function WheelPicker({ options, value, unit, onChange }: { options: number[]; value: number; unit: string; onChange: (v: number) => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const [sel, setSel] = useState(() => nearestIdx(options, value));
  useEffect(() => {
    const i = nearestIdx(options, value);
    scrollRef.current?.scrollTo({ y: i * WHEEL_ITEM, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const i = Math.max(0, Math.min(options.length - 1, Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM)));
    setSel(i);
    onChange(options[i]);
  };
  return (
    <View style={styles.wheel}>
      <View style={styles.wheelBand} pointerEvents="none" />
      <LinearGradient colors={[flColor.charcoal900, 'rgba(0,0,0,0)']} style={styles.wheelFadeTop} pointerEvents="none" />
      <LinearGradient colors={['rgba(0,0,0,0)', flColor.charcoal900]} style={styles.wheelFadeBottom} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM}
        decelerationRate="fast"
        onMomentumScrollEnd={onEnd}
        onScrollEndDrag={onEnd}
        contentContainerStyle={styles.wheelContent}
      >
        {options.map((o, i) => (
          <View key={o} style={styles.wheelItem}>
            <Text style={[styles.wheelText, i === sel ? styles.wheelTextSel : styles.wheelTextDim]}>{o}</Text>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.wheelUnit}>{unit}</Text>
    </View>
  );
}
function RestRing({ value, max, size, stroke, children }: { value: number; max: number; size: number; stroke: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const mid = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={styles.ringSvg}>
        <Circle cx={mid} cy={mid} r={r} stroke={flColor.charcoal700} strokeWidth={stroke} fill="none" />
        <Circle cx={mid} cy={mid} r={r} stroke={flColor.bronze400} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" transform={`rotate(-90 ${mid} ${mid})`} />
      </Svg>
      {children}
    </View>
  );
}
function Shell({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  scroll: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24, gap: 14 },
  barTitle: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100, maxWidth: 240 },
  overflowBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // progress band
  band: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  bandTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  doneLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray400 },
  doneAccent: { color: flColor.bronze400 },
  restChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 11, paddingRight: 8, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  restChipOn: { borderColor: flColor.bronzeBorderSubtle },
  restChipText: { gap: 1 },
  restChipKicker: { fontSize: 8, fontWeight: '600', letterSpacing: 0.9, textTransform: 'uppercase', color: flColor.gray600 },
  restChipValue: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, fontVariant: ['tabular-nums'] },
  restToggle: { width: 34, height: 20, borderRadius: 999, borderWidth: 1, padding: 2, justifyContent: 'center' },
  restToggleOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder, alignItems: 'flex-end' },
  restToggleOff: { backgroundColor: flColor.charcoal700, borderColor: flColor.charcoal600, alignItems: 'flex-start' },
  restKnob: { width: 14, height: 14, borderRadius: 7 },
  restKnobOn: { backgroundColor: flColor.bronze400 },
  restKnobOff: { backgroundColor: flColor.gray600 },

  // rest active — compact band chip
  restActiveChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingLeft: 7, paddingRight: 8, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  restActiveTime: { fontFamily: flFont.display, fontSize: 15, fontWeight: '700', letterSpacing: 0.4, color: flColor.cream100, fontVariant: ['tabular-nums'], minWidth: 42, textAlign: 'center' },
  restMiniBtn: { minWidth: 30, height: 26, paddingHorizontal: 6, borderRadius: flRadius.sm, alignItems: 'center', justifyContent: 'center' },
  restMiniText: { fontSize: 11, fontWeight: '700', color: flColor.gray400, letterSpacing: 0.3 },
  restMiniRound: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: flColor.bronzeBorder, alignItems: 'center', justifyContent: 'center' },
  ringSvg: { position: 'absolute' },

  // rest prominent overlay
  restOverlayWrap: { position: 'absolute', top: 118, left: 0, right: 0, alignItems: 'center', zIndex: 40 },
  restOverlay: { width: 288, paddingTop: 22, paddingHorizontal: 22, paddingBottom: 18, borderRadius: flRadius.xl, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorder, alignItems: 'center', gap: 14, boxShadow: flShadow.elevated },
  restOverlayLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.bronze400 },
  restOverlayTime: { fontFamily: flFont.display, fontSize: 30, fontWeight: '600', letterSpacing: 0.5, color: flColor.cream100, fontVariant: ['tabular-nums'] },
  restOverlayControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%' },
  restCtlBtn: { minWidth: 52, height: 44, paddingHorizontal: 10, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center', justifyContent: 'center' },
  restCtlText: { fontSize: 12, fontWeight: '700', color: flColor.gray400 },
  restCtlRound: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint, alignItems: 'center', justifyContent: 'center' },
  restSkip: { paddingVertical: 2, paddingHorizontal: 8 },
  restSkipText: { fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },

  // fuse flash (green light around the row)
  fuseWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 },

  // exercise-complete seal
  sealWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 44 },
  sealCard: { width: 292, paddingTop: 26, paddingHorizontal: 24, paddingBottom: 22, borderRadius: flRadius.xl, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorder, alignItems: 'center', gap: 12, boxShadow: flShadow.elevated },
  sealMedal: { width: 66, height: 66, borderRadius: 33, backgroundColor: flColor.bronze400, borderWidth: 1, borderColor: flColor.bronzeMetalBorder, alignItems: 'center', justifyContent: 'center', boxShadow: flShadow.glowSubtle },
  sealKicker: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.bronze400 },
  sealName: { fontFamily: flFont.display, fontSize: 26, fontWeight: '600', letterSpacing: -0.3, color: flColor.cream100, textAlign: 'center', lineHeight: 28 },
  sealStats: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sealStatText: { fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray400 },
  sealDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: flColor.bronze400 },
  sealNext: { marginTop: 5, paddingTop: 12, width: '100%', textAlign: 'center', borderTopWidth: 1, borderTopColor: flColor.charcoal600, fontSize: 10, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray400 },
  sealNextName: { color: flColor.bronze400 },

  // PR prompt
  prWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 22, zIndex: 60 },
  prBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,9,12,0.62)' },
  prCard: { width: 302, paddingTop: 24, paddingHorizontal: 22, paddingBottom: 20, borderRadius: flRadius.xl, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorder, alignItems: 'center', gap: 12, boxShadow: flShadow.elevated },
  prMedal: { width: 62, height: 62, borderRadius: 31, backgroundColor: flColor.bronze400, borderWidth: 1, borderColor: flColor.bronzeMetalBorder, alignItems: 'center', justifyContent: 'center', boxShadow: flShadow.glowSubtle },
  prKicker: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.bronze400 },
  prName: { fontFamily: flFont.display, fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: flColor.cream100, textAlign: 'center', lineHeight: 26 },
  prPerf: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', letterSpacing: 0.4, color: flColor.bronze300 },
  prBody: { fontSize: 12, fontWeight: '500', lineHeight: 17, color: flColor.gray400, textAlign: 'center', maxWidth: 232 },
  prBtns: { width: '100%', gap: 8, marginTop: 4 },

  // hero card
  hero: { backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorder, borderRadius: flRadius.xl, padding: 16, boxShadow: flShadow.card },
  heroRow: { flexDirection: 'row', gap: 16 },
  mediaSlot: { width: 132, minHeight: 172, alignSelf: 'stretch', borderRadius: flRadius.lg, overflow: 'hidden', backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center', justifyContent: 'center' },
  heroMeta: { flex: 1, minWidth: 0, gap: 10 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  heroName: { flex: 1, fontFamily: flFont.display, fontSize: 23, fontWeight: '600', letterSpacing: -0.3, lineHeight: 26, color: flColor.cream100 },
  heroActionsTop: { flexDirection: 'row', alignItems: 'center' },
  heroIconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  heroEquipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroEquip: { fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray400 },
  heroTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  howTo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  howToText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.bronze400 },
  insightRow: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  insightCol: { flex: 1, gap: 2, paddingHorizontal: 12 },
  insightMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: flColor.charcoal700, alignItems: 'flex-start' },
  insightLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  insightVal: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  insightGoalLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400 },
  insightGoal: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', letterSpacing: -0.3, lineHeight: 24, color: flColor.bronze300 },
  memoryBadge: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: flRadius.round, backgroundColor: flColor.bronze400 },

  // hero collapsed strip
  heroStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorder, borderRadius: flRadius.xl, paddingVertical: 9, paddingHorizontal: 12, boxShadow: flShadow.card },
  heroStripThumb: { width: 46, height: 46, borderRadius: flRadius.md, overflow: 'hidden', backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center', justifyContent: 'center' },
  heroStripText: { flex: 1, minWidth: 0, gap: 3 },
  heroStripName: { fontFamily: flFont.display, fontSize: 16.5, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  heroStripMeta: { fontSize: 11, fontWeight: '600', color: flColor.gray400 },
  heroStripGoal: { color: flColor.bronze300, fontWeight: '700' },

  // set table
  table: { backgroundColor: flColor.charcoal900, borderRadius: flRadius.xl, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 8, gap: 6 },
  h: { fontSize: 9.5, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  rows: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 52, paddingVertical: 7, paddingHorizontal: 8, borderRadius: flRadius.md, borderWidth: 1, borderColor: 'transparent' },
  rowDone: { borderColor: 'rgba(90,158,104,0.35)', backgroundColor: 'rgba(90,158,104,0.06)' },
  rowCurrent: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  cSet: { width: 56 },
  cTarget: { flex: 1, alignItems: 'center' },
  cWeight: { flex: 1 },
  cActual: { flex: 1.05 },
  setCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setNum: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  setNumText: { fontFamily: flFont.display, fontSize: 14, fontWeight: '600' },
  targetText: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600' },
  repsLabel: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  weightBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 6 },
  weightText: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600' },
  actualCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 9 },
  actualDone: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100, paddingVertical: 6 },
  actualCurrent: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.bronze400, paddingVertical: 6 },
  actualPending: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.gray600 },
  checkDoneBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: flColor.greenMuted, alignItems: 'center', justifyContent: 'center' },
  checkCurrent: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint, alignItems: 'center', justifyContent: 'center', boxShadow: flShadow.glowSubtle },
  checkPending: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: flColor.charcoal500 },
  setBtns: { flexDirection: 'row', gap: 8, marginTop: 2 },
  addSet: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorder, borderRadius: flRadius.md, backgroundColor: 'transparent' },
  addSetText: { fontSize: 12.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze400 },
  removeSet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16, minHeight: 44, borderWidth: 1, borderColor: flColor.charcoal500, borderRadius: flRadius.md },
  removeSetText: { fontSize: 12.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray400 },

  // exercise nav
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  navArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: flColor.charcoal600 },
  dotCurrent: { width: 22, backgroundColor: flColor.bronze400 },
  dotDone: { backgroundColor: flColor.greenMuted },
  dotSkipped: { backgroundColor: flColor.emberFlame },
  overviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'center', paddingVertical: 5, paddingHorizontal: 12 },
  overviewText: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  err: { fontFamily: flFont.sans, fontSize: 13, color: flColor.redMuted, textAlign: 'center' },

  // bottom actions
  bottom: { borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: flColor.charcoal900 },
  completeNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 10 },
  completeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: flColor.greenMuted },
  completeNoteText: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400 },
  bottomRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  endWrap: { flex: 1 },
  primaryWrap: { flex: 1.15, borderRadius: flRadius.md },
  primaryGlow: { boxShadow: flShadow.glowSubtle },

  // resume
  resumeCard: { width: '100%', gap: 10, alignItems: 'flex-start' },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  resumeName: { fontFamily: flFont.display, fontSize: 24, color: flColor.cream100 },
  resumeSub: { fontFamily: flFont.sans, fontSize: 14, color: flColor.gray400 },
  resumeActions: { width: '100%', gap: 6, marginTop: 12 },

  // picker sheet
  pickerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, justifyContent: 'flex-end' },
  pickerBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(6,9,12,0.62)' },
  picker: { backgroundColor: flColor.charcoal900, borderTopLeftRadius: flRadius.xl, borderTopRightRadius: flRadius.xl, borderTopWidth: 1, borderColor: flColor.charcoal600, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24, gap: 12 },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  pickerToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600 },
  pickerToggleText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray400 },
  pickerBtns: { gap: 4, marginTop: 4 },

  // wheel
  wheel: { position: 'relative', height: 240, marginVertical: 2 },
  wheelBand: { position: 'absolute', left: 8, right: 8, top: WHEEL_PAD, height: WHEEL_ITEM, borderTopWidth: 1, borderBottomWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint, borderRadius: flRadius.sm, zIndex: 1 },
  wheelFadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: WHEEL_PAD, zIndex: 2 },
  wheelFadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: WHEEL_PAD, zIndex: 2 },
  wheelContent: { paddingVertical: WHEEL_PAD },
  wheelItem: { height: WHEEL_ITEM, alignItems: 'center', justifyContent: 'center' },
  wheelText: { fontFamily: flFont.display, fontSize: 26, fontWeight: '600' },
  wheelTextSel: { color: flColor.cream100 },
  wheelTextDim: { color: flColor.gray600 },
  wheelUnit: { position: 'absolute', top: 110, right: 24, zIndex: 3, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze400 },

  // keypad
  keypad: { height: 240, alignItems: 'center', justifyContent: 'center', gap: 12 },
  keypadHint: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },
  keypadInput: { width: 190, textAlign: 'center', fontFamily: flFont.display, fontSize: 54, fontWeight: '600', color: flColor.cream100, borderBottomWidth: 2, borderColor: flColor.bronzeBorder, paddingVertical: 6 },
  keypadUnit: { fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze400 },

  // duration dual wheel
  durHeader: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 2 },
  durHeaderLabel: { width: 110, textAlign: 'center', fontSize: 9.5, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },
  durWheels: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  durCol: { width: 110 },
  durColon: { fontFamily: flFont.display, fontSize: 28, fontWeight: '600', color: flColor.bronze400, marginTop: -4 },

  // workout overview
  overviewSheet: { maxHeight: '82%' },
  overviewList: { marginHorizontal: -4 },
  overviewListContent: { gap: 6, paddingHorizontal: 4, paddingBottom: 4 },
  ovRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal800 },
  ovRowCurrent: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  ovStatusDot: { width: 9, height: 9, borderRadius: 5 },
  ovRowText: { flex: 1, minWidth: 0, gap: 2 },
  ovRowName: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  ovRowSub: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray400 },

  // workout options sheet
  optList: { gap: 8 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  optRowTint: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  optRowDanger: { borderColor: 'rgba(190,90,76,0.3)', backgroundColor: 'rgba(190,90,76,0.12)' },
  optIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center' },
  optIconDanger: { borderColor: 'rgba(190,90,76,0.3)', backgroundColor: 'rgba(190,90,76,0.14)' },
  optText: { flex: 1, minWidth: 0, gap: 2 },
  optTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  optTitleDanger: { color: flColor.redMuted },
  optSub: { fontSize: 12, color: flColor.gray600 },

  // toast
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 100, alignItems: 'center', zIndex: 55 },
  toast: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal600, boxShadow: flShadow.elevated },
  toastText: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.cream100 },

  // completion ceremony
  ceremonyWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,9,12,0.72)', alignItems: 'center', justifyContent: 'center', padding: 22, zIndex: 70 },
  ceremonyCard: { width: '100%', maxWidth: 360, maxHeight: '88%', borderRadius: flRadius.xl, backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorder, boxShadow: flShadow.elevated, overflow: 'hidden' },
  ceremonyScroll: { paddingTop: 26, paddingHorizontal: 22, paddingBottom: 18, alignItems: 'center' },
  ceremonyInsignia: { width: 72, height: 72, borderRadius: 20, backgroundColor: flColor.bronze400, borderWidth: 1, borderColor: flColor.bronzeMetalBorder, alignItems: 'center', justifyContent: 'center', boxShadow: flShadow.glowSubtle },
  ceremonyEyebrow: { marginTop: 14, fontSize: 10, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, textAlign: 'center' },
  ceremonyTitle: { marginTop: 4, fontFamily: flFont.display, fontSize: 27, fontWeight: '600', letterSpacing: -0.4, color: flColor.cream100, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  statBlock: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal800, gap: 3 },
  statValue: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  statLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },
  ceremonySection: { width: '100%', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: flColor.charcoal700, gap: 9 },
  ceremonySectionLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, textAlign: 'center' },
  recordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  recordText: { fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  partnerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  partnerChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 6, paddingRight: 13, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  pAvatarSm: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pAvatarSmText: { fontSize: 10, fontWeight: '700', color: '#1A1206' },
  partnerChipName: { fontSize: 12.5, fontWeight: '600', color: flColor.cream100 },
  tagBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 15, borderRadius: flRadius.pill, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorder },
  tagBtnText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400 },
  ceremonyFooter: { padding: 18, gap: 4, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },

  // partner sheet (W-20)
  partnerSheet: { maxHeight: '82%', paddingTop: 8 },
  grabHandle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 99, backgroundColor: flColor.charcoal500, marginBottom: 8 },
  partnerHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  partnerHeaderTitle: { fontFamily: flFont.display, fontSize: 21, fontWeight: '600', color: flColor.cream100 },
  partnerCount: { fontSize: 12, color: flColor.gray600 },
  partnerScroll: { maxHeight: 400 },
  partnerGroup: { marginBottom: 16 },
  partnerEmpty: { paddingHorizontal: 4, paddingVertical: 18, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray600 },
  partnerGroupLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 10 },
  prow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: flRadius.lg, borderWidth: 1, borderColor: 'transparent', marginBottom: 8 },
  prowOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  pText: { flex: 1, minWidth: 0, gap: 1 },
  pName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  pSub: { fontSize: 12, color: flColor.gray600 },
  pCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: flColor.charcoal500, alignItems: 'center', justifyContent: 'center' },
  pCheckOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronze400 },
});
