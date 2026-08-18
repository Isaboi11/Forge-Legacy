import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AskHoltSheet } from '@/components/forge/AskHoltSheet';
import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import {
  adoptCatalogProgram,
  deleteProgram,
  endProgram,
  fetchProgram,
  fetchProgramSessions,
  fetchProgramWorkouts,
  runProgramAgain,
  skipProgramSession,
  updateProgram,
  startProgram,
  type ProgramStructure,
  type SavedProgram,
} from '@/data/programs-live';
import { fmtLongDate, spanLabel, workoutsLabel } from '@/domain/program/graduation';
import { useCoachDoor } from '@/hooks/useCoachDoor';
import {
  buildLog,
  computeProgress,
  dayLabel,
  computeStats,
  equipmentOf,
  fmtVolume,
  isSealed,
  nextOpenSlot,
  plannedDays,
  swapSessionOrder,
  totalSessions,
  trainingDays,
  viewForState,
  type LogWeek,
  type LoggedWorkout,
  type ProgramState,
  type SessionMark,
  type SessionState,
} from '@/domain/program/progress-core';
import { getProgramDefinition } from '@/domain/training/programs';
import { structureFromDefinition } from '@/domain/program/adopt-core';
import { equipmentForCatalogKey } from '@/domain/home-artwork/catalog';
import { fetchHomeGym } from '@/data/home-gym-live';
import { nextAfter, programGymCoverage, specialisationBlocks } from '@/domain/onboarding/recommend';
import { itemByName } from '@/domain/exercise-picker/data';
import { LiftMaxSheet } from '@/components/forge/LiftMaxSheet';
import {
  loadContextFor,
  maxLiftNames,
  missingMaxKeys,
  requiredMaxKeys,
} from '@/domain/program/percent-max';
import { weightInExact } from '@/domain/settings/units';
import { writeWorkoutLaunch } from '@/lib/workout-launch';
import { useUnits } from '@/lib/settings';
import { useProfile } from '@/lib/profile';
import { useShareSheet } from '@/hooks/useShareSheet';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { errorMessage } from '@/lib/useQuery';

/**
 * Program Detail (`Forge Program.dc.html`) — one athlete-authored program across its five lifecycle
 * states (preview / planned / active / graduated / ended early), backed end-to-end by real data:
 * the structure from `programs` (0013), the state from 0017, and the progress + log + stats derived
 * from the workouts actually attributed to it (0018).
 *
 * "The Schedule" (what you will do) and "Your Log" (what you did) are the same week→day→exercise tree;
 * the log simply replaces a planned row with real sets once that slot has been trained. Nothing here is
 * a placeholder — an untrained program shows an honest empty log rather than invented history.
 *
 * SHARE IS LIVE, in both senses the word has here — and they are genuinely different features:
 *
 *   **Share Program** builds a keepsake card through SH-1 and posts it to a squad or to friends. It is
 *   a picture of the training, and it was previously reachable only from the graduation ceremony, which
 *   meant the one moment you could show anyone this program was the moment you finished it.
 *
 *   **Send to a Friend** hands over the PROGRAM — the plan itself, so they can run it. See
 *   `/send-program`. The distinction is worth keeping sharp: one of these is a post, the other is a copy
 *   of your training, and conflating them is how an athlete accidentally publishes a plan they meant to
 *   pass to one person.
 *
 * DEFERRED vs the `.dc` (omitted, not faked): the "What's Next" successor card, which needs a catalog
 * successor graph these authored programs don't have.
 */

const CHEVRON = 'M6 9l6 6 6-6';

/** A saved program's id is a uuid; a catalog program's is its definition slug. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Glyph({ d, size = 16, color, width = 2, flip = false }: { d: string; size?: number; color: string; width?: number; flip?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={flip ? styles.flip : undefined}>
      <Path d={d} />
    </Svg>
  );
}

export default function ProgramDetailScreen() {
  const router = useRouter();
  const { openShare } = useShareSheet();
  const { profile } = useProfile();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { startWorkout } = useWorkoutSession();
  const { load, units } = useUnits(); // "Heaviest" set, in the athlete's system

  const [program, setProgram] = useState<SavedProgram | null>(null);
  const [workouts, setWorkouts] = useState<LoggedWorkout[]>([]);
  /** Which sessions have been trained or skipped (0119) — the schedule's state, not the workout log. */
  const [marks, setMarks] = useState<SessionMark[]>([]);
  /** The session an athlete asked to move, while they pick what to move it with. Null when closed. */
  const [swapping, setSwapping] = useState<{ weekIndex: number; dayIndex: number; name: string } | null>(null);
  const [asking, setAsking] = useState<{ weekIndex: number; dayIndex: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'conflict' | 'end' | 'remove' | null>(null);
  /** The athlete's owned gear, or null when they have never built a Home Gym. Null shows nothing. */
  const [homeGym, setHomeGym] = useState<string[] | null>(null);
  /** 'gate' = answering before the program starts; 'change' = correcting one mid-run. */
  const [maxSheet, setMaxSheet] = useState<'gate' | 'change' | null>(null);
  /**
   * A row that exists but that the athlete has NOT agreed to keep.
   *
   * Start adopts before it opens the max gate, because the gate writes the run's frozen maxes and needs
   * a row to write them to. Which means backing out of that gate would leave the same "Planned" program
   * on the list that browsing used to leave — one press further in, and no less unasked for. So the id
   * is held here from adoption until the athlete commits (answers the gate, or the program starts), and
   * if they close the gate before either, the row goes with it.
   *
   * A REF, not state: `LiftMaxSheet` calls `onSaved` and then `onClose` in the same tick, and both close
   * over the same render — a state flag cleared in the first would still read as set in the second, and
   * this screen would delete the program they had just answered for.
   */
  const provisionalRef = useRef<string | null>(null);
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();

  /**
   * ══ LOOKING AT A PROGRAM IS NOT TAKING IT ON ══
   *
   * A built-in program has no database row, and this screen used to be reached by CREATING one — the
   * catalog called `adoptCatalogProgram` purely to get an id to navigate with. So opening a program to
   * read it put "Planned" on the athlete's list, for a plan they had not chosen. Reported by the PO
   * doing exactly what the screen invites: having a look.
   *
   * A catalog `id` is a definition slug (`squat-ascent-intermediate`), not a UUID, and that is the
   * signal. In preview there is NO row, NO fetch and NO write of any kind: the structure is built from
   * the shipped definition, the log is empty because nothing has been trained, and adoption is deferred
   * to the moment the athlete presses Start.
   */
  const previewDef = id && !UUID.test(id) ? getProgramDefinition(id) : null;

  // Refetch on focus so returning from a finished workout shows the new session immediately.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        if (!id) return;

        /*
         * THE GEAR PROFILE IS READ IN BOTH STATES, AND IT IS THE ONE THING A PREVIEW DOES FETCH.
         *
         * A preview needs it to warn BEFORE Start — which is the whole point, since `environment` is a
         * string on a screen the athlete may never open, and Close Quarters needs a bench that the
         * equipment table cannot see. An adopted program needs it too, because a gym changes after the
         * program was started.
         *
         * A failure is swallowed to null on purpose: null already means "no profile to judge against"
         * and renders nothing, which is the honest outcome. Failing to read someone's gear is not
         * evidence they lack a bench, and it must never take down the screen.
         */
        void fetchHomeGym()
          .then((g) => {
            if (active) setHomeGym(g);
          })
          .catch(() => {});

        if (previewDef) {
          // Nothing else to read. A preview is otherwise derived entirely from shipped content.
          setLoading(false);
          return;
        }
        try {
          const [p, w, m] = await Promise.all([fetchProgram(id), fetchProgramWorkouts(id), fetchProgramSessions(id)]);
          if (!active) return;
          setProgram(p);
          setWorkouts(w);
          setMarks(m);
        } catch (e) {
          if (active) setError(errorMessage(e));
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [id, previewDef]),
  );

  /* ⚠ ABOVE THE EARLY RETURNS. Both of these are hooks, and the loading and not-found branches below
     return before they would have run — which is a rules-of-hooks violation that only bites on the
     render where the data lands. `program` is simply undefined until then, and `whatsNext` follows it. */
  const { openCoach } = useCoachDoor();
  /* Derived, not fetched — `nextAfter` is a find over fourteen shipped programs, which cannot change
     under this screen. Deliberately NOT memoised: hand-written deps here read `program?.sourceDefinitionId`
     while react-compiler infers `program`, and it refuses to optimise the whole component rather than
     honour a narrower dependency than it can prove. The compiler memoises this correctly on its own.
     Null for a program that is not a Forge one: an athlete's own block names no successor, and inventing
     one for it would be the app pretending to know their plan. */
  const whatsNext = program?.sourceDefinitionId ? nextAfter(program.sourceDefinitionId) : null;
  /* The four-week blocks that sharpen ONE lift. Offered here because their own design records call them
     standalone blocks run BETWEEN general programs — so finishing one is the moment they make sense, and
     it is the only moment the intake could never reach them from. The block they just did is dropped:
     offering somebody Squat Ascent as they walk out of Squat Ascent is the app not paying attention. */
  const sharpen = specialisationBlocks().filter((b) => b.id !== program?.sourceDefinitionId);

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(5,5,5,0.3)' }} />
        <AppBar title="" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  if (!program && !previewDef) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(5,5,5,0.3)' }} />
        <AppBar title="Program" serif onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Program not found</Text>
          <Text style={styles.emptyBody}>{error ?? 'It may have been deleted.'}</Text>
        </View>
      </View>
    );
  }

  /**
   * One screen, two sources. An owned program reads its structure from its row; a preview builds the
   * same shape from the shipped definition, so everything below — the schedule, the equipment pills, the
   * max gate, the resolved percentages — works identically without a row existing.
   */
  const owned = program != null;
  const structure = program
    ? program.structure
    : structureFromDefinition(previewDef!, (k) => equipmentForCatalogKey(k) ?? undefined, (n) => itemByName(n)?.key);
  const state: ProgramState = program?.state ?? 'future';
  /** A preview has no run, so no frozen maxes — the gate asks on Start, as it does for any program. */
  const liftMaxes = program?.liftMaxes ?? {};
  const view = viewForState(state, owned);
  const programName = program?.name ?? previewDef?.name ?? 'Program';
  /*
   * ⚠ THE WHITE SCREEN. This read `previewDef!.id`, and the `!` was wrong in the one case the comment
   * directly below has always described: `sourceDefinitionId` is NULL for a program the athlete built
   * themselves — `createProgram` inserts no `source_definition_id` at all.
   *
   * The `??` chain only reaches the fallback when the left side is null, and an OWNED program reaches
   * this line with `previewDef` NULL, because `previewDef` is only resolved for a non-UUID id (a
   * catalogue preview). So a self-built program evaluated `null.id` during render, threw, and took the
   * whole tree down — a blank white screen with no error, since a production export has no boundary
   * to catch it. Every program made in the Program Builder opened this way.
   *
   * Falling back to null is the correct value, not merely a safe one: `def` below is then null, which
   * is exactly what that comment asks for — no author, so no description and no goals.
   */
  const sourceDefId = program?.sourceDefinitionId ?? previewDef?.id ?? null;
  /*
   * Keyed off `sourceDefId` rather than `previewDef`, so an ALREADY-ADOPTED catalog program is covered
   * too — a gym changes after a program is started. `programGymCoverage` returns null for a null
   * profile and for an id that is not a shipped definition, so a builder-made program shows nothing.
   */
  const coverage = sourceDefId ? programGymCoverage(sourceDefId, homeGym) : null;
  const gearGap = coverage && coverage.total > 0 && coverage.doable < coverage.total ? coverage : null;
  const progress = computeProgress(structure, workouts.length);
  const stats = computeStats(workouts);

  /**
   * WHAT THIS PROGRAM IS, before you agree to run it.
   *
   * Read off the catalog definition this run was adopted from — `sourceDefinitionId` (0019) is already
   * stored, so the prose costs no column and no migration. It is deliberately NOT copied into the saved
   * row: the description is the CATALOG's account of the program, and freezing a snapshot of it per run
   * would leave a corrected description stranded behind every athlete who had already adopted it.
   *
   * `null` for a program the athlete built themselves — there is no author to describe it, and this
   * screen would rather say nothing than say "A program you built." underneath the name they gave it.
   */
  const def = sourceDefId ? getProgramDefinition(sourceDefId) : null;
  const goals = def?.goals?.filter((g) => g.trim().length > 0) ?? [];

  /**
   * PERCENTAGE PRESCRIPTIONS resolve here, at render, against the run's own frozen maxes.
   *
   * Which is why changing a max needs no recalculation pass: `buildLog` draws a completed day from what
   * was logged and a future day from the prescription, so a new max moves everything not yet trained
   * and cannot touch anything already trained.
   */
  const loadCtx = loadContextFor(liftMaxes, units === 'metric', (lb) => weightInExact(lb, units));
  const maxKeys = requiredMaxKeys(structure);
  const liftNames = maxLiftNames(structure);

  /**
   * What to say when a max is changed mid-run.
   *
   * Both halves are things this screen actually knows, not a guess at a "peaking phase" the program
   * model has no concept of. The first sentence is always true and is the reassurance; the second is
   * the honest warning, and it only appears once there is a run to disturb. Neither of them blocks the
   * change — it is the athlete's training.
   */
  const changeWarning =
    workouts.length > 0
      ? `Sessions you've already trained won't change — they record what you actually lifted. This moves the ${
          Math.max(0, totalSessions(structure) - workouts.length)
        } sessions ahead of you, which are built from this number.`
      : null;

  const weeks = buildLog(structure, workouts, loadCtx);
  const equipment = equipmentOf(structure);
  const trained = workouts.length > 0;
  /** Sealed: a permanent legacy record. Not editable, not deletable, never reactivated (Amendment-001). */
  const terminal = isSealed(state);
  /* The three sealed states are not interchangeable in COPY. Two of them describe a program that ran to
     its end; only one of those earned anything. Derived once here because three separate ternaries on
     `state` is how the share card and the record start disagreeing with each other. */
  const sealedWord = state === 'graduated' ? 'Graduated' : state === 'finished' ? 'Week complete' : 'Ended early';
  /* A copy of something Forge ships, rather than something the athlete wrote. Decides whether the
     destructive action reads "Remove from Planned" or "Delete Program" — see the action row. */
  const isForgeProgram = program != null && program.sourceDefinitionId != null;
  const showProgress = state === 'active' || terminal;

  /*
   * WHICH sessions are done, skipped, or still owed (0119). Fetched alongside the workouts because the
   * two answer different questions: `workouts` is what was logged, `marks` is what the schedule has been
   * told about — and a skipped session appears in the second and never the first.
   */
  const stateByWeek: Record<number, Record<number, SessionState>> = {};
  for (const m of marks) (stateByWeek[m.weekIndex] ??= {})[m.dayIndex] = m.state;

  /**
   * Reorder two sessions inside a week, and persist it.
   *
   * ⚠ ONLY UNTOUCHED SESSIONS ARE OFFERED, and that is a correctness rule rather than a courtesy.
   * `program_sessions` rows are keyed by (week, dayIndex), so moving a session that has been trained or
   * skipped would leave its record pointing at a different workout — the app would then claim a session
   * nobody did. Untouched days carry no rows, so swapping them moves the plan and nothing else.
   */
  const doSwap = async (weekIndex: number, a: number, b: number) => {
    if (!program || busy) return;
    setBusy(true);
    try {
      const next = swapSessionOrder(program.structure, weekIndex, a, b);
      await updateProgram(program.id, next);
      setProgram({ ...program, structure: next });
      setSwapping(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Persist an edit Holt made to a live program.
   *
   * Deliberately the same shape as `doSwap` above — same write, same optimistic update. The safety is
   * not here: `edit-ops` will not return a structure that changes the session count or touches a slot
   * already trained, and the 0123 trigger refuses one at the database if it ever did. This saves what
   * came back.
   */
  const applyHoltEdit = async (next: ProgramStructure) => {
    if (!program || busy) return;
    setBusy(true);
    try {
      await updateProgram(program.id, next);
      setProgram({ ...program, structure: next });
      setAsking(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const goTrain = async () => {
    if (!nextOpenSlot(structure, marks)) return; // program finished — nothing left to train
    await writeWorkoutLaunch({ programId: program!.id });
    router.push('/workout');
  };

  /**
   * Train ONE named session, rather than whichever is next — the swap.
   *
   * `startWorkout` is not optional here even though the logger builds its own session from the launch:
   * it is what sets LIVE PRESENCE, so a squad sees "training now" and the name they see is this one.
   * Home and Workouts both call it, and leaving it out of this path would have made a swapped session
   * the only kind of workout nobody could see you doing.
   */
  const trainDay = async (weekIndex: number, dayIndex: number, name: string) => {
    if (!program) return;
    await writeWorkoutLaunch({ programId: program.id, programWeek: weekIndex, programDay: dayIndex });
    startWorkout(name);
    router.push('/workout');
  };

  /**
   * Pass over a session. It counts toward finishing the program and can therefore be the thing that
   * completes it, which is what the product decision means — the record keeps saying it was a skip.
   */
  const skipDay = async (weekIndex: number, dayIndex: number) => {
    if (!program || busy) return;
    setBusy(true);
    try {
      await skipProgramSession(program.id, weekIndex, dayIndex);
      setMarks(await fetchProgramSessions(program.id));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /**
   * The keepsake card. Every value is read off the record in front of you — `buildShareContent` drops a
   * field whose value is empty, so a program with nothing to say about a slot renders SHORTER rather
   * than filled in with something plausible.
   *
   * "Completion" is the one line that must not overstate: a program you have started but not finished
   * says where you are, not that you finished. A sealed record says how it ended, in the same words the
   * screen above it uses.
   */
  const openShareCard = () => {
    // `fmtLongDate` and `workoutsLabel` both return null for input they can't read, so every piece is
    // filtered rather than interpolated — a share card reading "Graduated · null" is the exact class of
    // defect this file's own header is about, and it would be leaving the app when it happened.
    const completion = terminal
      ? [sealedWord, workoutsLabel(workouts.length)].filter(Boolean).join(' · ')
      : trained
        ? `Week ${progress.week} of ${structure.weeks} · ${progress.pct}%`
        : '';
    const endedOn = terminal ? fmtLongDate(program?.endedAt ?? null) : null;
    const startedOn = fmtLongDate(program?.startedAt ?? null);
    const when = endedOn ?? (startedOn ? `Started ${startedOn}` : '');
    openShare({
      shareType: 'program',
      overrides: {
        title: programName,
        athlete: profile?.name,
        values: { status: completion, date: when },
      },
    });
  };

  /**
   * Take a Forge program as your own — the ONE place a catalog definition becomes a row.
   *
   * Both doors call this: "Add to Planned" (queue it for later) and "Start Program" (queue it and
   * begin). Extracted rather than duplicated so `browse-is-not-adopt.test.mjs` can keep counting a
   * single `adoptCatalogProgram(` call in this file — two would make "adoption happens where the
   * athlete asked for it" a claim nobody could check.
   *
   * Idempotent: an athlete who already holds this plan resumes that row instead of forking a copy.
   */
  const adoptPreview = async () => {
    const row = await adoptCatalogProgram(
      previewDef!.id,
      structureFromDefinition(previewDef!, (k) => equipmentForCatalogKey(k) ?? undefined, (n) => itemByName(n)?.key),
    );
    setProgram(row);
    return row;
  };

  /**
   * ADD TO PLANNED — say yes to a program without starting it today.
   *
   * Start was the only way to take a Forge program, which made "I want this next" and "I am doing this
   * now" the same button. An athlete reading Monday's program on a Saturday had to either start it two
   * days early or remember to come back. The queue already existed — `state: 'future'` is what
   * `adoptCatalogProgram` writes, and the Workouts tab has had a Planned shelf all along; there was
   * simply no way to put anything on it deliberately.
   *
   * NO max gate here, unlike Start. The gate exists so a percentage-based program has numbers to
   * prescribe from before it prescribes; a planned program is not prescribing anything yet, and asking
   * for a tested max to answer "maybe next month" is the wrong moment. Start still asks.
   *
   * Not provisional either — see `provisionalRef`. This IS the athlete keeping it.
   */
  const onAddToPlanned = async () => {
    if (busy || program) return;
    setBusy(true);
    setError(null);
    try {
      await adoptPreview();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onPrimary = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (state === 'active') {
        await goTrain();
      } else if (terminal) {
        /*
         * RUN IT AGAIN — a NEW program, never a rewind (W-3 §7.2).
         *
         * This branch used to fall through to `startProgram`, which had no state check, so the button on
         * a finished program flipped the sealed record back to Active — erasing the graduation, its date
         * and its place in the record. Amendment-001 §1: "A Graduated program cannot be reactivated…
         * History cannot be rewritten." `start_program` now refuses outright (0104); this is the path
         * that was always meant to be here.
         *
         * `push`, not `replace`: the original record is where they came from and back should return to it.
         */
        const again = await runProgramAgain(program!.id);
        router.push({ pathname: '/program/[id]', params: { id: again.id } });
      } else {
        /*
         * ADOPTION HAPPENS HERE — on Start, and nowhere else.
         *
         * This is the write that used to fire the moment the athlete OPENED a catalog program, which put
         * "Planned" on their list for a plan they were only reading. Pressing Start is the first moment
         * they have said they want it, so it is the first moment a row exists. Idempotent, so an athlete
         * who already has this plan in flight resumes that row rather than forking a second copy.
         */
        let row = program;
        if (!row) {
          row = await adoptPreview();
          // Not theirs yet — see `provisionalRef`. Cleared the moment they answer the gate or it starts.
          provisionalRef.current = row.id;
        }

        /*
         * THE MAX GATE — a percentage-based program cannot prescribe anything until it has a number to
         * work from, so it is asked for BEFORE the program becomes active rather than nagged for after.
         *
         * After adoption, deliberately: the gate writes the run's frozen maxes, which needs a row to
         * write them to. `missingMaxKeys` is read off the row's own maxes so an athlete resuming a
         * planned program they already answered is not asked twice.
         */
        if (missingMaxKeys(structure, row.liftMaxes).length > 0) {
          setBusy(false);
          setMaxSheet('gate');
          return;
        }
        // Future → Active. start_program ends whatever else was active, atomically (0017).
        await startProgram(row.id);
        provisionalRef.current = null; // running it is the strongest form of keeping it
        setProgram({ ...row, state: 'active' });
        // Land on Home, which is where the change is visible: the new program anchors Today's Workout
        // and Current Program. Staying here would leave the athlete to go and check for themselves
        // whether starting actually did anything.
        router.replace('/(tabs)');
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /**
   * They pressed Start, saw what it wanted, and backed out. Undo the adoption.
   *
   * The alternative is a program sitting on their list as "Planned" because they looked at the gate —
   * which is the same complaint as browsing creating one, and the athlete cannot tell the two apart.
   * Nothing can have been logged against a row this new, so there is no training to lose.
   *
   * A failed delete is swallowed on purpose: the athlete abandoned this, and an error toast about a
   * program they are walking away from explains nothing they can act on.
   */
  const discardProvisional = async () => {
    const id = provisionalRef.current;
    if (!id) return;
    provisionalRef.current = null;
    try {
      await deleteProgram(id);
      if (previewDef) setProgram(null); // back to the preview it was before Start
    } catch {
      // leave it — `supabase/maintenance/clear-unstarted-catalog-programs.sql` is the sweep for residue
    }
  };

  const confirmSheet = async () => {
    const kind = sheet;
    setSheet(null);
    if (!kind || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (kind === 'end') {
        await endProgram(program!.id, 'ended_early');
        setProgram({ ...program!, state: 'ended_early' });
      } else if (kind === 'remove') {
        await deleteProgram(program!.id);
        router.back();
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const sheetCopy =
    sheet === 'end'
      ? {
          title: 'End this program?',
          body: `“${programName}” moves to your legacy as ended early. Everything you logged stays — this cannot be undone.`,
          confirm: 'End Program',
        }
      : sheet === 'remove'
        ? isForgeProgram
          ? {
              title: 'Remove from your plans?',
              body: `“${programName}” comes off your list. It stays in Discover, so you can pick it up again whenever you want — and every workout you logged against it is kept.`,
              confirm: 'Remove',
            }
          : {
              title: 'Delete this program?',
              body: `“${programName}” is yours — deleting it is permanent, and there is no copy in Discover to take again. Every workout you logged against it is kept.`,
              confirm: 'Delete',
            }
        : { title: '', body: '', confirm: '' };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(5,5,5,0.3)' }} />
      <AppBar
        title=""
        onBack={() => router.back()}
        actions={
          <View style={[styles.pill, state === 'active' && styles.pillActive]}>
            <Text style={[styles.pillText, state === 'active' && styles.pillTextActive]}>{view.pill}</Text>
          </View>
        }
      />

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{programName}</Text>
        {/* WAS HARDCODED "Custom". Squat Ascent Intermediate — a Strength/Intermediate catalog program —
            introduced itself to the athlete as Custom, which is simply untrue of anything adopted from
            the catalog. A program the athlete actually built keeps "Custom", and keeps the week shape
            alongside it: the `.dc` fills that slot with the difficulty too, but "Custom • Custom" says
            half as much as "Custom • Repeating week" and there is no authored difficulty to put there. */}
        <Text style={styles.metaFamily}>
          {def
            ? [def.family, def.difficulty].filter(Boolean).join(' • ')
            : `Custom • ${structure.vary ? 'Per-week' : 'Repeating week'}`}
        </Text>
        <Text style={styles.metaLine}>
          {structure.weeks} weeks • {progress.perWeek} {progress.perWeek === 1 ? 'day' : 'days'} / week
        </Text>

        {/* THE SEALED RECORD (W-3 §7). A finished program is history, and history states when and how
            much. `fmtLongDate`/`spanLabel` are the same functions the M-4 ceremony uses, so the modal
            congratulating you cannot disagree with the record it congratulates you on. */}
        {terminal && program?.endedAt ? (
          <View style={styles.sealed}>
            <Text style={styles.sealedWhen}>
              {state === 'ended_early' ? 'Ended' : sealedWord} {fmtLongDate(program?.endedAt ?? null)}
            </Text>
            <Text style={styles.sealedWhat}>
              {[workoutsLabel(workouts.length), spanLabel(program?.startedAt ?? null, program?.endedAt ?? null)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        ) : null}

        {/*
          WHAT COMES NEXT — the answer that used to be silence.

          ⚠ ONLY AFTER A PROGRAM THAT RAN ITS COURSE. `graduated` and `finished` earned this; `ended_early`
          did not, and offering somebody a sequel to a block they walked away from reads as not having
          noticed. The M-4 ceremony that plays at the moment of graduation is locked and deliberately
          program-agnostic, so this is the surface that can be specific — and it is where the record lives
          permanently rather than for the eight seconds a modal is up.

          ⚠ AND IT IS EXISTENCE-CHECKED. Seven programs name a successor; SIX OF THOSE NAMES ARE NOT
          AUTHORED. `nextAfter` matches against the real catalogue and falls through to Holt on a miss, so
          this can never promise a program nobody has written — the on-ramp's original defect, which would
          otherwise have reappeared here.
        */}
        {(state === 'graduated' || state === 'finished') && whatsNext ? (
          <View style={styles.next}>
            <Text style={styles.nextLabel}>What&apos;s next</Text>
            {whatsNext.kind === 'program' ? (
              <>
                <Text style={styles.nextName}>{whatsNext.program.name}</Text>
                <Text style={styles.nextMeta}>
                  {[whatsNext.program.family, whatsNext.program.difficulty, whatsNext.program.weeks ? `${whatsNext.program.weeks} weeks` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Button
                  variant="primary"
                  fullWidth
                  onPress={() => router.push({ pathname: '/program/[id]', params: { id: whatsNext.program.id } })}
                  accessibilityLabel={`Open ${whatsNext.program.name}`}
                >
                  Take a look
                </Button>
              </>
            ) : (
              <>
                <Text style={styles.nextName}>
                  {whatsNext.named ? `${whatsNext.named} isn't written yet.` : 'Nothing follows this one yet.'}
                </Text>
                <Text style={styles.nextMeta}>
                  Holt can build the next block from what you just did, rather than picking one off a shelf.
                </Text>
                <Button variant="primary" fullWidth onPress={() => openCoach('build')} accessibilityLabel="Build the next block with Coach Holt">
                  Build it with me
                </Button>
              </>
            )}
            {/*
              ⚠ SECONDARY, AND ONLY AFTER A BLOCK THAT WAS NOT ITSELF ONE OF THESE. The primary offer
              above is what comes NEXT in the athlete's progression; this is a four-week detour to put
              weight on one lift. Presented as a choice of lift rather than a recommendation, because
              which lift they care about is the one thing the app genuinely does not know.
            */}
            {sharpen.length > 0 ? (
              <View style={styles.sharpen}>
                <Text style={styles.sharpenLabel}>Or sharpen one lift first</Text>
                <View style={styles.sharpenRow}>
                  {sharpen.map((b) => (
                    <Pressable
                      key={b.id}
                      onPress={() => router.push({ pathname: '/program/[id]', params: { id: b.id } })}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${b.name}`}
                      style={({ pressed }) => [styles.sharpenChip, pressed ? styles.sharpenPressed : null]}
                    >
                      <Text style={styles.sharpenChipText}>{b.name.replace(/\s+Intermediate$/, '')}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.sharpenHint}>Four weeks each, loaded off a max you test first.</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {showProgress ? (
          <TourAnchor id="program-progress" style={styles.progressCard}>
            <View style={styles.progressHead}>
              <Text style={styles.progressWeek}>
                Week {progress.week} of {structure.weeks}
              </Text>
              <Text style={styles.progressPct}>{progress.pct}%</Text>
            </View>
            <ProgressBar value={progress.completed} max={progress.total} />
            <Text style={styles.progressSub}>
              Workout {progress.completed} of {progress.total}
            </Text>
          </TourAnchor>
        ) : null}

        {/* ── WHAT THIS IS ───────────────────────────────────────────────────────────────────────────
                The `.dc` puts the description here, between the progress card and Equipment, and the
                build had dropped it — the athlete decided whether to run four weeks of five-day squatting
                from a name and a week count. "What this builds" is NOT in the `.dc`; it renders the
                `goals` the program definitions have always carried, because the paragraph says what you
                will DO and these say what it is FOR, which is the half that answers "is this for me". ── */}
        {def?.description ? <Text style={styles.description}>{def.description}</Text> : null}

        {goals.length ? (
          <View style={styles.block}>
            <Text style={styles.microLabel}>What this builds</Text>
            <View style={styles.goalList}>
              {goals.map((g) => (
                <View key={g} style={styles.goalRow}>
                  <View style={styles.goalMark} />
                  <Text style={styles.goalText}>{g}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {equipment.length ? (
          <View style={styles.block}>
            <Text style={styles.microLabel}>Equipment</Text>
            <View style={styles.equipRow}>
              {equipment.map((e) => (
                <View key={e} style={styles.equipPill}>
                  <Text style={styles.equipText}>{e}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/*
          WORKING FROM — the maxes this run's percentages resolve against, and the way to change one.

          Shown only for a program that actually prescribes percentages — Squat Ascent, Bench Approach
          and Deadlift Measure since 0111. A lift with no max yet reads "not set" rather than a number,
          because an unanswered entry is a real state and a 0 would be a confident false claim about
          what the athlete lifts.

          ⚠ CHANGE IS OWNED-ONLY, and that is a crash fix as much as a rule. `LiftMaxSheet` writes
          against `program!.id`, and a PREVIEW has no row — so opening this sheet from a preview
          dereferenced null during render and whited out the screen. There is also nothing it could
          honestly do: a max is frozen onto a RUN at the gate, and a preview has no run to freeze it
          onto. The gate asks on Start, which is what the comment beside `liftMaxes` already promised.
        */}
        {maxKeys.length ? (
          <View style={styles.block}>
            <Text style={styles.microLabel}>Working from</Text>
            <Pressable
              onPress={owned ? () => setMaxSheet('change') : undefined}
              disabled={!owned}
              accessibilityRole={owned ? 'button' : undefined}
              accessibilityLabel={owned ? 'Change your maxes' : undefined}
              style={styles.maxRow}
            >
              <View style={styles.maxList}>
                {maxKeys.map((k) => {
                  const display = loadCtx.maxes[k];
                  const src = liftMaxes[k]?.source;
                  return (
                    <Text key={k} style={styles.maxItem}>
                      <Text style={styles.maxName}>{liftNames[k] ?? k}</Text>
                      {'  '}
                      {display != null
                        ? `${Math.round(display)} ${loadCtx.unit}${src === 'estimated' ? ' (est.)' : ''}`
                        : 'not set'}
                    </Text>
                  );
                })}
              </View>
              {owned ? <Text style={styles.maxChange}>Change</Text> : null}
            </Pressable>
          </View>
        ) : null}

        {trained ? (
          <View style={styles.statRow}>
            <Stat label="Volume" value={fmtVolume(stats.volume)} />
            <Stat label="Workouts" value={String(stats.workouts)} />
            <Stat label="Sets" value={String(stats.sets)} />
            <Stat label="Heaviest" value={stats.heaviest > 0 ? load(stats.heaviest) : '—'} />
          </View>
        ) : null}

        <TourAnchor id="program-schedule">
          <Text style={styles.sectionLabel}>{trained ? 'Your Log' : 'The Schedule'}</Text>
        <Text style={styles.sectionSub}>
          {trained
            ? 'Completed weeks show what you lifted; upcoming weeks show the plan.'
            : 'Open any week to see the workouts you will train.'}
        </Text>

        <View style={styles.weeks}>
          {weeks.map((wk, wi) => (
            <WeekCard
              key={wk.week}
              week={wk}
              current={wi === progress.week - 1}
              open={openWeek === wi}
              openDay={openDay}
              onToggle={() => {
                setOpenWeek(openWeek === wi ? null : wi);
                setOpenDay(null);
              }}
              onToggleDay={(k) => setOpenDay(openDay === k ? null : k)}
              states={stateByWeek[wi]}
              /* Only an ACTIVE program can be trained or skipped. A sealed record is history
                 (Amendment-001 §1) and a preview has no row to write against yet. */
              onTrainDay={state === 'active' ? (di, name) => void trainDay(wi, di, name) : undefined}
              onSkipDay={state === 'active' ? (di) => void skipDay(wi, di) : undefined}
              onSwapDay={state === 'active' ? (di, name) => setSwapping({ weekIndex: wi, dayIndex: di, name }) : undefined}
              onAskHolt={state === 'active' ? (di, name) => setAsking({ weekIndex: wi, dayIndex: di, name }) : undefined}
            />
          ))}
          </View>
        </TourAnchor>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <TourAnchor id="program-actions" style={styles.cta}>
        {/* ── WHAT YOUR GYM CANNOT DO, SAID BEFORE YOU START ─────────────────────────────────────────
                `environment` is a string ("Home — dumbbells and an adjustable bench") on a screen the
                athlete may never scroll to, and the equipment table cannot see a bench at all: a
                dumbbell bench press is tagged `dumbbell`, because that records what you LOAD, not what
                you lie on. So a home athlete could start a program a third of which they cannot do.

                Same rule and same wording as the onboarding card: shown ONLY when a real profile exists
                AND something is genuinely missing. "You can train all of it" is the expected case, and
                saying so every time is noise dressed up as reassurance. ── */}
        {gearGap ? (
          <Text style={styles.gearGap}>
            Your gym covers {gearGap.doable} of {gearGap.total} movements — you&apos;ll need to swap{' '}
            {gearGap.missing.slice(0, 2).join(' and ')}
            {gearGap.missing.length > 2 ? ` and ${gearGap.missing.length - 2} more` : ''}.
          </Text>
        ) : null}
        <Button variant="primary" fullWidth disabled={busy} onPress={onPrimary} accessibilityLabel={view.cta}>
          {view.cta}
        </Button>
        {/* ── ADD TO PLANNED — only on a preview, because it is the only state without a row yet.
                "I want this next" and "I am doing this now" were the same button; this separates them.
                Once it is taken the button is gone and the header pill reads Planned. ── */}
        {!program && previewDef ? (
          <Button variant="secondary" fullWidth disabled={busy} onPress={() => void onAddToPlanned()} accessibilityLabel="Add this program to your planned list">
            Add to Planned
          </Button>
        ) : null}
        {/* ── EDIT IS FUTURE-STATE ONLY (W-5 Decision 1) ─────────────────────────────────────────────
                This was gated on `terminal`, which let Edit through on an ACTIVE program — directly
                against the locked spec, whose permission matrix reads NO for Active on every row.

                The reason is not tidiness. `program_sessions` rows are keyed by (week_index, day_index)
                and graduation is `completed >= program_total_sessions(structure)`, recomputed live from
                the structure. So a structural edit mid-run re-points records the athlete already earned
                AND moves the finish line: shrinking a live program makes the next save fire the
                graduation branch, which writes a PROGRAM_GRADUATED timeline event and five honors that
                can never be revoked. There is no un-graduate path (Amendment-001 §1).

                Merely opening the builder is enough to do damage — `hydrateDraft` normalises through
                `clampDays`/`makeDays`, which TRUNCATE, so a ragged program loses days on a round trip
                it never asked for.

                Mid-flight changes belong to the coach's safe edit path instead: untouched slots only,
                session count invariant. Until that lands, Duplicate is the honest route and W-5 §Decision
                4 already names it — copy it, change the copy, start that.

                Both buttons also require a real row. A catalogue preview has `program === null` (state
                falls back to 'future' at the top of this component), and both handlers read `program!.id`
                — so without this guard a preview pushed the builder with `id: undefined`. ── */}
        {program ? (
          <View style={styles.ctaRow}>
            {/*
              ── YOU CANNOT EDIT A FORGE PROGRAM, FOR THE SAME REASON YOU CANNOT DELETE ONE ──

              What the athlete holds is a COPY of something Forge authored, and it keeps Forge's name at
              the top of the screen. Editing it in place would let it drift — a session swapped here, a
              week shortened there — while still presenting itself as the program we wrote and stand
              behind. That is the provenance problem `project_third_party_program_provenance` describes
              in the other direction: a plan must not carry an author's name over content they did not
              author. "Tweak it a little" is not a category here either.

              Duplicate is the honest route and it is already right there. The copy has no
              `sourceDefinitionId`, so it is the athlete's, and they can change every session in it.

              W-5 Decision 1 still governs the other axis: Edit is FUTURE-state only, never active.
            */}
            {state === 'future' && !isForgeProgram ? (
              <View style={styles.ctaHalf}>
                <Button
                  variant="secondary"
                  fullWidth
                  onPress={() => router.push({ pathname: '/program-builder', params: { o: 'edit', id: program.id } })}
                  accessibilityLabel="Edit program"
                >
                  Edit
                </Button>
              </View>
            ) : null}
            <View style={styles.ctaHalf}>
              <Button
                variant="secondary"
                fullWidth
                onPress={() => router.push({ pathname: '/program-builder', params: { o: 'dup', id: program.id } })}
                accessibilityLabel="Duplicate program"
              >
                Duplicate
              </Button>
            </View>
          </View>
        ) : null}
        {/* Said, not silently omitted — same courtesy the active case gets below. */}
        {state === 'future' && isForgeProgram ? (
          <Text style={styles.editNote}>
            This is a Forge program, so it stays as we wrote it. Duplicate it and the copy is yours to
            change however you like.
          </Text>
        ) : null}
        {/* Said, not silently omitted: an athlete who could edit this yesterday deserves the reason. */}
        {state === 'active' ? (
          <Text style={styles.editNote}>
            A program you&apos;ve started can&apos;t be restructured — the sessions you&apos;ve trained are
            recorded against it. Duplicate it to change the plan and start fresh.
          </Text>
        ) : null}
        {/* ── THE TWO KINDS OF SHARING, NAMED APART ──────────────────────────────────────────────────
                "Share Program" posts a card about the training. "Send to a Friend" hands over the plan
                itself. Sitting side by side with different verbs is deliberate: they are one word in
                every other app and two entirely different acts here — one is visible to a whole squad,
                the other puts a copy of your program in one person's library. ── */}
        <View style={styles.ctaRow}>
          <View style={styles.ctaHalf}>
            <Button variant="secondary" fullWidth onPress={openShareCard} accessibilityLabel="Share a card about this program">
              Share Card
            </Button>
          </View>
          <View style={styles.ctaHalf}>
            <Button
              variant="secondary"
              fullWidth
              onPress={() => router.push({ pathname: '/send-program', params: { id: program!.id } })}
              accessibilityLabel="Send this program to a friend or squad"
            >
              Send Program
            </Button>
          </View>
        </View>
        <View style={styles.secondaryRow}>
          {state === 'active' ? (
            <Pressable onPress={() => setSheet('end')} accessibilityRole="button" accessibilityLabel="End Program" style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>End Program</Text>
            </Pressable>
          ) : null}
          {/*
            ── YOU CANNOT DELETE A FORGE PROGRAM, BECAUSE YOU DO NOT HAVE ONE ──

            What the athlete holds is a COPY: `sourceDefinitionId` points at a definition that ships in
            the app and stays in Discover whether they keep their copy or not. Calling that "Delete
            Program" said the wrong thing twice — it implied the program itself was being destroyed, and
            it made removing a plan feel like a decision that costs something. It is `Remove from
            Planned`, which is what `viewForState` has returned for this state all along while the screen
            hardcoded the other word.

            A program the athlete AUTHORED is the other case, and it keeps `Delete Program`, because
            deleting really is deleting: there is no catalogue entry behind it and no way back.

            NEITHER appears on a sealed record. Amendment-001 §6: "Graduated and Ended Early programs are
            permanent legacy records. They may never be deleted." The RLS policy refuses it too since
            0104 — this hides an action that would otherwise fail rather than being the only thing
            standing in the way. Workouts logged against a removed plan survive either way (0018 nulls
            the link rather than cascading).
          */}
          {terminal || !program ? null : (
            <Pressable
              onPress={() => setSheet('remove')}
              accessibilityRole="button"
              accessibilityLabel={isForgeProgram ? 'Remove from planned' : 'Delete program'}
              style={styles.secondaryBtn}
            >
              <Text style={[styles.secondaryText, styles.deleteText]}>{isForgeProgram ? 'Remove from Planned' : 'Delete Program'}</Text>
            </Pressable>
          )}
        </View>
      </TourAnchor>

      <ScreenTour screenKey="program-detail" />

      {/*
        THE SWAP PICKER — the week, and what this session can trade places with.

        Only OUTSTANDING sessions are listed. A trained or skipped one has a `program_sessions` row keyed
        by its position, so moving it would leave that record pointing at a different workout; the app
        would then claim a session nobody did. Showing them greyed out would invite the tap that cannot
        be honoured, so they are simply not offered.
      */}
      <BottomSheet
        open={swapping != null}
        onClose={() => setSwapping(null)}
        title={swapping ? `Swap ${swapping.name} with…` : 'Swap'}
      >
        <View style={styles.swapList}>
          {(() => {
            if (!swapping) return null;
            const days = trainingDays(plannedDays(structure, swapping.weekIndex));
            const options = days
              .map((d, di) => ({ d, di }))
              .filter(({ di }) => di !== swapping.dayIndex && stateByWeek[swapping.weekIndex]?.[di] === undefined);
            if (options.length === 0) {
              return (
                <Text style={styles.sheetText}>
                  Nothing else in week {swapping.weekIndex + 1} is still outstanding — the other sessions are
                  already trained or skipped, and moving those would rewrite what you did.
                </Text>
              );
            }
            return options.map(({ d, di }) => (
              <Pressable
                key={di}
                onPress={() => void doSwap(swapping.weekIndex, swapping.dayIndex, di)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Swap ${swapping.name} with ${dayLabel(d, di)}`}
                style={styles.swapRow}
              >
                <View style={styles.swapNum}>
                  <Text style={styles.swapNumText}>{di + 1}</Text>
                </View>
                <Text style={styles.swapName} numberOfLines={1}>
                  {dayLabel(d, di)}
                </Text>
                <Glyph d={CHEVRON} color={flColor.gray600} />
              </Pressable>
            ));
          })()}
        </View>
      </BottomSheet>

      {/* Only mounted while a session is actually being edited. `program` is non-null here because the
          action that opens it is gated on `state === 'active'`, which requires a real row. */}
      {asking && program ? (
        <AskHoltSheet
          open
          onClose={() => setAsking(null)}
          structure={program.structure}
          marks={marks}
          weekIndex={asking.weekIndex}
          dayIndex={asking.dayIndex}
          dayName={asking.name}
          busy={busy}
          onApply={(next) => void applyHoltEdit(next)}
        />
      ) : null}

      <BottomSheet open={sheet != null} onClose={() => setSheet(null)} title={sheetCopy.title}>
        <View style={styles.sheetBody}>
          <Text style={styles.sheetText}>{sheetCopy.body}</Text>
          <View style={styles.sheetActions}>
            <View style={styles.ctaHalf}>
              <Button variant="secondary" fullWidth onPress={() => setSheet(null)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
            <View style={styles.ctaHalf}>
              <Button variant="destructive" fullWidth onPress={confirmSheet} accessibilityLabel={sheetCopy.confirm}>
                {sheetCopy.confirm}
              </Button>
            </View>
          </View>
        </View>
      </BottomSheet>

      {/*
        Remounted on open (the `key`) so the fields re-seed from whatever is currently known rather than
        keeping a half-typed correction from last time — the same pattern LogWeightSheet uses.

        `onSaved` writes the returned maxes straight onto the program in state, so the day list below
        re-resolves immediately. Starting is NOT chained onto saving: answering the gate and choosing to
        begin are two decisions, and an athlete who fills in their squat max to see the numbers should
        not find the program running.
      */}
      {/* `&& program` is the belt to the owned-only braces above: the sheet's every write needs a row,
          so it must never mount without one, whatever future path sets `maxSheet`. */}
      {maxSheet != null && program ? (
        <LiftMaxSheet
          key={`${maxSheet}-${maxKeys.join(',')}`}
          open
          onClose={() => {
            setMaxSheet(null);
            void discardProvisional();
          }}
          programId={program.id}
          keys={maxKeys}
          names={liftNames}
          known={liftMaxes}
          units={units}
          title={maxSheet === 'gate' ? 'Before you start' : 'Change your max'}
          warning={maxSheet === 'change' ? changeWarning : null}
          onSaved={(maxes) => {
            // Answering the gate IS keeping it — the row stops being provisional here, before the sheet's
            // own `onClose` fires and asks whether to throw it away.
            provisionalRef.current = null;
            setProgram((p) => (p ? { ...p, liftMaxes: maxes } : p));
          }}
        />
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function WeekCard({
  week,
  current,
  open,
  openDay,
  onToggle,
  onToggleDay,
  states,
  onTrainDay,
  onSkipDay,
  onSwapDay,
  onAskHolt,
}: {
  week: LogWeek;
  current: boolean;
  open: boolean;
  openDay: string | null;
  onToggle: () => void;
  onToggleDay: (key: string) => void;
  /** What has happened to each day of THIS week, by day index. Empty on a program not being trained. */
  states?: Record<number, SessionState | undefined>;
  /** Train or skip this specific session. Absent on a sealed or not-yet-started program. */
  onTrainDay?: (dayIndex: number, name: string) => void;
  onSkipDay?: (dayIndex: number) => void;
  onSwapDay?: (dayIndex: number, name: string) => void;
  onAskHolt?: (dayIndex: number, name: string) => void;
}) {
  const meta = week.complete
    ? 'Complete'
    : week.completedCount > 0
      ? `${week.completedCount} / ${week.days.length}`
      : `${week.days.length} ${week.days.length === 1 ? 'workout' : 'workouts'}`;

  return (
    <View style={[styles.weekCard, current && styles.weekCardCurrent]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Week ${week.week}, ${meta}`}
        style={[styles.weekHead, current && styles.weekHeadCurrent]}
      >
        {week.complete ? (
          <Glyph d="M20 6L9 17l-5-5" color={flColor.greenMuted} width={2.4} />
        ) : current ? (
          <View style={styles.currentDot} />
        ) : (
          <View style={styles.futureDot} />
        )}
        <Text style={[styles.weekLabel, current && styles.weekLabelCurrent]}>Week {week.week}</Text>
        <Text style={[styles.weekMeta, week.complete && styles.weekMetaDone]}>{meta}</Text>
        <Glyph d={CHEVRON} color={flColor.gray600} flip={open} />
      </Pressable>

      {open ? (
        <View style={styles.weekBody}>
          {week.days.map((d, di) => {
            const key = `${week.week}:${di}`;
            const dayOpen = openDay === key;
            return (
              <View key={key} style={styles.dayBlock}>
                <Pressable
                  onPress={() => onToggleDay(key)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: dayOpen }}
                  accessibilityLabel={`${d.name}, ${d.meta}`}
                  style={styles.dayHead}
                >
                  <View style={[styles.dayNum, d.completed && styles.dayNumDone]}>
                    <Text style={[styles.dayNumText, d.completed && styles.dayNumTextDone]}>{d.num}</Text>
                  </View>
                  <View style={styles.dayText}>
                    <Text style={styles.dayName} numberOfLines={1}>
                      {d.name}
                    </Text>
                    <Text style={styles.dayMeta} numberOfLines={1}>
                      {d.completed && d.date ? `${d.date} • ${d.meta}` : d.meta}
                    </Text>
                  </View>
                  {/* SKIPPED is its own mark, never a tick. A skipped session carries you to the end of
                      the program (PO decision) and the record still says you did not train it — the
                      whole reason `state` exists rather than a boolean. */}
                  {states?.[di] === 'skipped' ? <Text style={styles.skippedChip}>Skipped</Text> : null}
                  <Glyph d={CHEVRON} color={flColor.gray600} flip={dayOpen} />
                </Pressable>

                {/* Any OUTSTANDING session can be trained or passed over, not just the next one in line
                    — that is the swap. Offered only where there is something to act on: a day already
                    trained or skipped shows its state above instead. */}
                {onTrainDay && onSkipDay && states?.[di] === undefined && d.exercises.length > 0 ? (
                  <View style={styles.dayActions}>
                    <Pressable
                      onPress={() => onTrainDay(di, d.name)}
                      accessibilityRole="button"
                      accessibilityLabel={`Train ${d.name}`}
                      style={styles.dayAction}
                    >
                      <Text style={styles.dayActionText}>Train this</Text>
                    </Pressable>
                    {onSwapDay ? (
                      <Pressable
                        onPress={() => onSwapDay(di, d.name)}
                        accessibilityRole="button"
                        accessibilityLabel={`Swap ${d.name} with another workout this week`}
                        style={styles.dayAction}
                      >
                        <Text style={styles.dayActionText}>Swap</Text>
                      </Pressable>
                    ) : null}
                    {onAskHolt ? (
                      <Pressable
                        onPress={() => onAskHolt(di, d.name)}
                        accessibilityRole="button"
                        accessibilityLabel={`Ask Holt to change ${d.name}`}
                        style={styles.dayAction}
                      >
                        <Text style={styles.dayActionHolt}>Ask Holt</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => onSkipDay(di)}
                      accessibilityRole="button"
                      accessibilityLabel={`Skip ${d.name}`}
                      style={styles.dayAction}
                    >
                      <Text style={styles.dayActionSkip}>Skip</Text>
                    </Pressable>
                  </View>
                ) : null}

                {dayOpen ? (
                  <View style={styles.exList}>
                    {d.exercises.length === 0 ? (
                      <Text style={styles.restText}>Rest day</Text>
                    ) : (
                      d.exercises.map((ex, xi) => (
                        <View key={`${ex.name}-${xi}`} style={styles.exRow}>
                          {/* Named once, above the block it opens — so a superset reads as one thing
                              you do rather than two lifts that happen to be listed together. */}
                          {ex.blockLabel ? <Text style={styles.blockLabel}>{ex.blockLabel}</Text> : null}
                          {/* "A1" / "A2" ahead of the lift, the same tag the logger and both builders
                              draw — the log has to name a superset's members the way the session will. */}
                          <Text style={styles.exName}>
                            {ex.memberLabel ? `${ex.memberLabel}  ` : ''}
                            {ex.name}
                          </Text>
                          {ex.sets.length ? (
                            <View style={styles.setList}>
                              {ex.sets.map((s) => (
                                <View key={s.label} style={styles.setRow}>
                                  <Text style={styles.setLabel}>{s.label}</Text>
                                  <Text style={styles.setValue}>{s.value}</Text>
                                </View>
                              ))}
                            </View>
                          ) : ex.planned ? (
                            <Text style={styles.plannedText}>{ex.planned}</Text>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  flip: { transform: [{ rotate: '180deg' }] },

  pill: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  pillActive: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  pillText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray400 },
  pillTextActive: { color: flColor.bronze300 },

  scroll: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28 },
  title: { fontFamily: flFont.display, fontSize: 32, fontWeight: '700', letterSpacing: -0.3, lineHeight: 36, color: flColor.cream100, marginBottom: 8 },
  metaFamily: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  metaLine: { marginTop: 3, fontSize: 13, color: flColor.gray600 },

  next: {
    marginTop: 14,
    gap: 8,
    padding: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  nextLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  nextName: { fontFamily: flFont.display, fontSize: 18, lineHeight: 24, color: flColor.cream100 },
  sharpen: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.bronzeBorderSubtle, gap: 9 },
  sharpenLabel: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  sharpenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  sharpenChip: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.surfaceRecessed,
  },
  sharpenPressed: { opacity: 0.7 },
  sharpenChipText: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '600', color: flColor.bronze300 },
  sharpenHint: { fontFamily: flFont.sans, fontSize: 11.5, lineHeight: 16, color: flColor.gray600 },
  nextMeta: { fontFamily: flFont.sans, fontSize: 13, lineHeight: 19, color: flColor.gray400, marginBottom: 4 },
  sealed: { marginTop: 16, gap: 4 },
  sealedWhen: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  sealedWhat: { fontSize: 13, color: flColor.gray600 },
  progressCard: { marginTop: 18, padding: 16, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, boxShadow: flShadow.card, gap: 11 },
  progressHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  progressWeek: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  progressPct: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.bronze300, fontVariant: ['tabular-nums'] },
  progressSub: { fontSize: 12, color: flColor.gray600 },

  // 14.5 / 1.6 / text-secondary — the `.dc`'s paragraph spec exactly.
  description: { marginTop: 18, fontSize: 14.5, lineHeight: 23, color: flColor.gray400 },

  block: { marginTop: 18 },
  goalList: { gap: 9 },
  goalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  // The bronze diamond the design uses for its "Next ·" marker, reused so the list reads as Forge's
  // rather than as a generic bullet.
  goalMark: { width: 5, height: 5, marginTop: 7, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  goalText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: flColor.gray400 },

  microLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600, marginBottom: 9 },
  equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  equipPill: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  equipText: { fontSize: 12, fontWeight: '600', color: flColor.gray400 },
  maxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  maxList: { flex: 1, gap: 4 },
  maxItem: { fontSize: 13, color: flColor.cream100 },
  maxName: { color: flColor.gray400 },
  maxChange: { fontSize: 12, fontWeight: '600', color: flColor.bronze300 },

  statRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  stat: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 6, borderWidth: 1, borderColor: flColor.charcoal600, borderRadius: flRadius.lg, backgroundColor: flColor.charcoal900, alignItems: 'center', gap: 4 },
  statValue: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.bronze300, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },

  sectionLabel: { marginTop: 26, marginBottom: 6, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  sectionSub: { marginBottom: 12, fontSize: 12.5, color: flColor.gray600 },

  weeks: { gap: 8 },
  weekCard: { borderWidth: 1, borderColor: flColor.charcoal600, borderRadius: flRadius.lg, overflow: 'hidden', backgroundColor: flColor.charcoal900 },
  weekCardCurrent: { borderColor: flColor.bronzeBorder },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 15 },
  weekHeadCurrent: { backgroundColor: flColor.bronzeTint },
  currentDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 4, borderColor: flColor.bronze300 },
  futureDot: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5, borderColor: flColor.charcoal500 },
  weekLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.cream100 },
  weekLabelCurrent: { color: flColor.bronze300 },
  weekMeta: { fontSize: 11.5, color: flColor.gray600 },
  weekMetaDone: { color: flColor.greenMuted },
  weekBody: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },

  dayBlock: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, paddingHorizontal: 15 },
  dayNum: { width: 24, height: 24, borderRadius: flRadius.sm, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center' },
  dayNumDone: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  dayNumText: { fontSize: 11, fontWeight: '700', color: flColor.gray600 },
  dayNumTextDone: { color: flColor.bronze300 },
  dayText: { flex: 1, minWidth: 0 },
  dayName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  dayMeta: { fontSize: 11.5, color: flColor.gray600 },

  exList: { paddingLeft: 51, paddingRight: 15, paddingBottom: 12 },
  exRow: { paddingVertical: 9, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  blockLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 5 },
  exName: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100, marginBottom: 5 },
  setList: { gap: 3 },
  setRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  setLabel: { fontSize: 11.5, color: flColor.gray600 },
  setValue: { fontSize: 12.5, color: flColor.bronze400, fontVariant: ['tabular-nums'] },
  plannedText: { fontSize: 12.5, color: flColor.gray600, fontVariant: ['tabular-nums'] },
  restText: { paddingVertical: 10, fontSize: 12.5, fontStyle: 'italic', color: flColor.gray600 },

  error: { marginTop: 16, fontSize: 13, color: flColor.redMuted },

  cta: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20, borderTopWidth: 1, borderTopColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, gap: 8 },
  // Bronze, not red: needing to swap two movements is information, not an error.
  gearGap: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  // Why Edit is absent on an active program. Same quiet register as gearGap — an explanation, not a warning.
  editNote: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  ctaRow: { flexDirection: 'row', gap: 8 },
  ctaHalf: { flex: 1 },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 2 },
  secondaryBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  secondaryText: { fontSize: 11.5, letterSpacing: 0.2, color: flColor.gray600 },
  deleteText: { color: flColor.redMuted },

  emptyTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { fontSize: 13, lineHeight: 19, color: flColor.gray400, textAlign: 'center' },

  swapList: { gap: 8 },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.charcoal800,
  },
  swapNum: {
    width: 26,
    height: 26,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
  },
  swapNumText: { fontFamily: flFont.display, fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  swapName: { flex: 1, fontSize: 15, color: flColor.cream100 },
  sheetBody: { gap: 16 },
  sheetText: { fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },
  skippedChip: {
    fontFamily: flFont.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: flColor.gray400,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    borderRadius: flRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  dayActions: { flexDirection: 'row', gap: 8, paddingLeft: 44, paddingBottom: 10 },
  dayAction: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
  },
  dayActionText: { fontSize: 12, fontWeight: '600', color: flColor.bronze300 },
  dayActionHolt: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2, color: flColor.bronze300 },
  dayActionSkip: { fontSize: 12, fontWeight: '600', color: flColor.gray400 },
  sheetActions: { flexDirection: 'row', gap: 10 },
});
