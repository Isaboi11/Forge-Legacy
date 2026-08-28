import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { fetchTodaysChapterPhotos } from '@/data/photos-live';
import {
  acceptJoinRequest,
  declineWorkoutInvite,
  fetchAcceptedTrainingCredits,
  fetchPendingJoinRequests,
  fetchTrainingPartners,
  inviteToLiveSession,
  type PendingJoinRequest,
} from '@/data/train-together-live';
import { fetchTemplates, type TemplateExercise } from '@/data/templates-live';
import { getStarterTemplate } from '@/domain/workout/starter-templates';
import { Avatar } from '@/components/forge/composites/Avatar';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ExerciseLoop } from '@/components/forge/ExerciseLoop';
import { Pill } from '@/components/forge/composites/Pill';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourAnchor, useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { useSheetDrag } from '@/hooks/useSheetDrag';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useAppPrefs, useCoachIntensity, useHaptics, useSoundEnabled, useUnits } from '@/lib/settings';
import { loadContextFor } from '@/domain/program/percent-max';
import { displayWeight, unitLabel, weightInExact } from '@/domain/settings/units';
import { playRestDing, primeDing } from '@/lib/ding';
import { CardioBlockCard } from '@/components/workout/CardioBlockCard';
import { HoldTimer } from '@/components/workout/HoldTimer';
import { SetGoalPanel } from '@/components/workout/SetGoalPanel';
import {
  EMPTY_RESULT,
  activityFromKey,
  cardioKey,
  VERB,
  deriveName,
  isCardioKey,
  newCardioBlock,
  type CardioActivity,
} from '@/domain/workout/conditioning';
import { buildSessionFromProgram } from '@/domain/workout/build-session';
import { fetchProgram, fetchProgramSessions, resolveSharedSessionSlot } from '@/data/programs-live';
import { nextOpenSlot } from '@/domain/program/progress-core';
import {
  creditsInWindow,
  mergePartnerCredits,
  resolvePartnerNames,
  PARTNER_CREDIT_WINDOW_MS,
  type AcceptedTraining,
} from '@/domain/workout/partner-credit';
import { durText, supersetLabels } from '@/domain/program/prescription';
import { coachLine } from '@/domain/coach/coach-says';
import { profileFor } from '@/domain/coach/rulebook/intensity';
import { intraSetSuggestion } from '@/domain/coach/intra-set';
import { addSuggestions, swapSuggestions } from '@/domain/coach/session-suggest';
import { exerciseRelationships } from '@/domain/exercise-relationships/query-service';
import { fetchCoachProfile } from '@/data/coach-profile-live';
import { proposeIntensity, type IntensityProposal } from '@/domain/coach/intensity-learning';
import { fetchIntensitySignals } from '@/data/coach-signal-live';
import { useCapGate } from '@/lib/entitlement';
import { CoachSays } from '@/components/forge/CoachSays';
import { WorkoutEntry } from '@/components/forge/WorkoutEntry';
import { lastExerciseName, sessionStatLine } from '@/domain/workout/entry-summary';
import { resolveHomeWorkoutArtwork } from '@/domain/home-artwork/resolver';
import { useProfile } from '@/lib/profile';
import { clearWorkoutLaunch, readWorkoutLaunch } from '@/lib/workout-launch';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { clearSession, hasLoggedWork, loadSession, persistSession } from '@/domain/workout/autosave';
import { publishLiveSession } from '@/data/live-session-live';
import { liveSessionSnapshot } from '@/domain/workout/live-session';
import { blockAt, breakBlock, endsSupersetRound, makeSuperset, nextInSuperset, sessionToTemplateExercises, supersetRounds } from '@/domain/workout/session-core';
import { doneSetCount, hasLoggedSet, PR_MAX_REPS } from '@/domain/workout/metrics';
import { perSideFor } from '@/domain/workout/per-side-core';
import { continueWorkout, fetchLastNotes, saveWorkout, type LastNote } from '@/domain/workout/save';
import { saveAppPrefs, fetchVisibility } from '@/data/settings-live';
import { bumpWorkoutsLogged } from '@/lib/tour-phase';
import { SCREEN_GUTTER, useBarBottom } from '@/lib/screen-insets';
import { fetchLiftHistory, liftId, type LiftHistory } from '@/data/lift-history-live';
import { backOffTo, incrementFor, progressionFor, sessionPerformance, type Progression } from '@/domain/coach/progression';
import { useKeyboardPrimer } from '@/components/forge/KeyboardPrimer';
import { DEFAULT_HOLD_SEC, itemByKey, itemByName, PICKER_DB } from '@/domain/exercise-picker/data';
import { loadExperience } from '@/lib/coach-memory';
import { effortReply, shouldAskEffort, weightAfterEffort, type EffortAnswer } from '@/domain/coach/first-set';
import { SessionCoachSheet } from '@/components/forge/SessionCoachSheet';
import { PlaylistSheet } from '@/components/forge/composites/Playlist';
import { JoinRequestBanner } from '@/components/forge/JoinRequestBanner';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet';
import { playlistLabel } from '@/domain/workout/playlist';
import { enrichSessionExercises, equipmentForCatalogKey } from '@/domain/home-artwork/catalog';
import { familyOfExercise } from '@/domain/home-artwork/bridges';
import { resolveAsset } from '@/domain/home-artwork/manifest';
import { resolveArtworkSource } from '@/domain/home-artwork/artwork-source';
import { getRestMode, nextRestMode, setRestMode, type RestMode } from '@/lib/rest-timer-pref';
import { getWheelInput, setWheelInput } from '@/lib/set-input-pref';
import { useKeyboardInset } from '@/lib/useKeyboardInset';
import { clearExerciseInbox, readExerciseInbox, type PickedExercise } from '@/lib/exercise-inbox';
import type { ActiveSession, SessionExercise, SessionSet } from '@/domain/workout/types';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** Stable no-op, so the primer's `onChangeText` is not a fresh closure on every render. */
const noop = () => {};

type Phase = 'loading' | 'resume' | 'active' | 'saving';
/**
 * The set being edited, and which of its two fields has the caret (or the wheel).
 *
 * ONE SHEET, BOTH NUMBERS — this replaced a pair of single-field pickers, which made logging a set
 * three separate modal trips (weight, then reps, then a check) for what W-9 §6.2 has always specified
 * as one: weight and reps together under a single "Log Set".
 */
type SetSheet = { exIdx: number; setIdx: number; focus: 'weight' | 'reps' };

const WEIGHT_OPTS = Array.from({ length: 101 }, (_, i) => i * 5); // 0–500 lb by 5 (free weights / machines)
const WEIGHT_OPTS_CABLE = Array.from({ length: 201 }, (_, i) => i * 2.5); // 0–500 lb by 2.5 (cable stacks)
// 0–50. Was 0–30, which silently clamped a set of 40 air squats down to 30 and recorded a number the
// athlete did not do — the same class of quiet falsehood as counting an unweighted set as no set at all.
const REPS_OPTS = Array.from({ length: 51 }, (_, i) => i);

/**
 * Where the knob sits for each rest mode — left, centre, right.
 *
 * A plain `alignItems` per mode, so the track stays one flex row and the knob lands correctly at every
 * text scale. Module scope because it is a constant, and a `StyleSheet.create` entry per position would
 * put three near-identical rules in the sheet for what is one axis.
 */
const REST_KNOB_POS = {
  off: { alignItems: 'flex-start' },
  auto: { alignItems: 'center' },
  manual: { alignItems: 'flex-end' },
} as const;
const REPS_MAX = 999; // typed entry is not bounded by what fits on a wheel
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

/**
 * The Actual column.
 *
 * A to-failure set with nothing entered shows an em dash, never its target: that target is 0 by design
 * (nobody prescribed a count), and rendering it would tell the athlete they did zero reps of an exercise
 * they just finished.
 */
function actualText(set: SessionSet): string {
  /* A TIMED SET ANSWERS IN SECONDS. It has no rep count to report — `targetReps` is 0 by construction —
     so reading the rep fields for it printed "0" under a Target column that said "1m". The clock the
     athlete actually held is `durationSec`; the ask beside it is `targetSec`.
     `durationSec` is tested TOO, not just the ask: a RESUMED session rebuilds its sets from the saved
     rows (`continue-workout-live`), which carry what was done and not what was prescribed — so a
     half-finished plank comes back with a duration and no target, and would read "0" without it. */
  if (set.targetSec != null || set.durationSec != null) {
    return durText(set.durationSec ?? (set.done ? set.targetSec : null)) || '—';
  }
  if (set.actualReps != null) return String(set.actualReps);
  return set.toFailure ? '—' : String(set.targetReps);
}

/**
 * The Target column — "10" flat, or "10-12" when the program prescribed a range.
 *
 * ⚠ `actualText` above deliberately still back-fills from `targetReps` ALONE. Completing a set without
 * typing anything records the FLOOR, which is the conservative claim: the athlete may have hit twelve,
 * but the app must not enter a number they never said. The range is what to aim for; the floor is what
 * gets written when they say nothing.
 */
function targetRepsText(set: SessionSet): string {
  const top = set.targetRepsMax;
  return top != null && top > set.targetReps ? `${set.targetReps}-${top}` : String(set.targetReps);
}

/**
 * The Weight column — and the difference between "no load" and "no answer".
 *
 * `0` means BODYWEIGHT: the athlete said this set carried nothing, and "BW" is the honest render of
 * that. `null` means nothing was entered — an em dash, not "BW", because a warm-up done with an empty
 * bar is not a bodyweight set and the app must not decide it was. Both are LOGGED sets; the count of
 * what you did never depended on the load, and the day it did it told an athlete who pressed through
 * three warm-up sets that they had done zero.
 */
function weightText(set: SessionSet): string {
  if (set.weight === 0) return 'BW';
  return set.weight != null ? String(set.weight) : '—';
}

/**
 * The Goal line — what this exercise asks for, in one phrase.
 *
 * Read off the SETS rather than recomputed from a prescription, because by the time the athlete is
 * looking at it they may have added or removed some. A ladder shows every rung: "4×6-6-4-4" is the whole
 * point of the exercise, and "4×6" would be describing a different one.
 */
function goalTextFor(sets: readonly SessionSet[]): string {
  if (!sets.length) return '—';
  if (sets[0].targetSec != null) {
    const d = durText(sets[0].targetSec);
    return sets.length > 1 ? `${sets.length}×${d}` : d;
  }
  const parts = sets.map((s) => (s.toFailure ? 'F' : String(s.targetReps)));
  const uniform = parts.every((p) => p === parts[0]);
  return uniform ? `${sets.length}×${parts[0]}` : `${sets.length}×${parts.join('-')}`;
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
/**
 * A monotonic id for the two transient animations that guard themselves against a stale timeout — the
 * green fuse on a logged row and the value-pop on an edited cell.
 *
 * ⚠ IT WAS `Date.now()`, AND THAT WAS WRONG TWICE OVER. `Date.now()` can return the same value twice
 * inside one millisecond, so two fast set logs produce equal tokens and the older timeout clears the
 * NEWER flash — precisely the staleness the token exists to prevent. And it is an impure call that the
 * react-compiler flags the moment it can see the handler, which is how this surfaced.
 *
 * Module scope rather than a ref because it is not component state: only one Active Workout exists at a
 * time, nothing renders from it, and a ref read inside a handler the compiler believes is render-phase
 * would trade one lint error for another.
 */
/**
 * The window an accepted invite may reach back through to claim this session.
 *
 * ⚠ MODULE SCOPE BECAUSE `Date.now()` IS IMPURE. The react-compiler flags an impure call inside a
 * function it believes runs during render, and it believes that of `finishToSeal` — the same way it
 * flagged the animation tokens above. The reading is a fact about the clock rather than about this
 * component, so it belongs out here regardless; the lint is what made that obvious.
 */
function creditWindowFor(startedAt: string): { fromMs: number; toMs: number } {
  const now = Date.now();
  const startedMs = Date.parse(startedAt);
  return { fromMs: (Number.isFinite(startedMs) ? startedMs : now) - PARTNER_CREDIT_WINDOW_MS, toMs: now };
}

let animationToken = 0;
const nextAnimationToken = (): number => (animationToken += 1);

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
  const { session: liveSession, startWorkout, finishWorkout, abandonWorkout } = useWorkoutSession();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [resumable, setResumable] = useState<ActiveSession | null>(null);
  /** When the resume prompt was raised — the clock its "38 min" is measured against. See the setter. */
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  /** A launch intent parked because work was already in progress. Null = they just opened the logger. */
  const [pendingLaunch, setPendingLaunch] = useState<Awaited<ReturnType<typeof readWorkoutLaunch>> | null>(null);
  /** Bumped to re-run the mount flow after discarding, so one code path builds every session. */
  const [reloadKey, setReloadKey] = useState(0);
  // A conditioning leg shows distance in the athlete's own system; the record stays in miles.
  /* `fmt` re-expresses an already-formatted pounds string in the athlete's system — the app-wide rule
     that keeps every weight display honest without threading a number through every layer. */
  const { units, fmt: inUnits } = useUnits();
  /*
   * ⚠ EVERY WEIGHT LABEL ON THIS SCREEN NOW NAMES THE ATHLETE'S UNIT — because the number beside it is
   * ALREADY in that unit. The athlete types into the display system: a metric athlete enters 100 and
   * means 100 kg. Six labels said "lb" regardless — the table header, the entry-sheet field, the wheel's
   * unit chip, the PR prompt, the exercise seal and the overview row — so the one surface where the
   * number is unambiguous was the one contradicting it mid-set.
   *
   * The storage fix landed with these: `canonicalizeWeights` normalises the session to pounds once, at
   * the save boundary, so the database holds true lb and every read may convert. These labels are correct
   * either way — the typed number is in the athlete's unit in both worlds — which is why they went first.
   */
  /*
   * ⚠ THE ACTION BAR USED TO SIT ON THE HOME INDICATOR. This screen's own note said it takes no
   * safe-area inset anywhere "and introducing one here alone would float the bubble at a different
   * height than every other element it lines up with" — which was a fair reason to leave it and is no
   * longer one, because the coin below reads the same value. Both move together now.
   */
  const barBottom = useBarBottom();
  const haptics = useHaptics();
  const soundOn = useSoundEnabled();
  const [phase, setPhase] = useState<Phase>('loading');
  const [sheet, setSheet] = useState<SetSheet | null>(null);
  /**
   * The mid-set nudge — "next set, 195" — keyed by exercise index.
   *
   * ⚠ HELD, NOT TOASTED. A toast is gone in three seconds and this is an instruction for the set they
   * are about to do, so it rides the coin until the exercise changes or a later set answers it. Cleared
   * when the athlete moves on, because a suggestion about bench press has nothing to say about squats.
   */
  /* `upTo` is the weight the line asks them to reach — what lets `coachLine` retire it once they have
     logged a set at or above it. Carried beside the text because the sentence has already been rendered
     by then and no reliable number can be read back out of prose. */
  const [intraLine, setIntraLine] = useState<{ ei: number; text: string; upTo: number } | null>(null);
  /**
   * "How did that feel?" — the first set of a movement this athlete has never done (`first-set.ts`).
   *
   * ⚠ SEPARATE FROM `intraLine`, WHICH IS AN INFERENCE. That one reads the reps against the range and is
   * switched OFF for every beginner cell, on purpose: a mid-exercise load change is a judgement about a
   * rep, and a novice has not earned the reps to judge by. That decision is untouched. This ASKS, and
   * takes the athlete at their word about their own effort — the one thing they can report from their
   * very first set. The ANSWER is then written into `intraLine`, so both end up on the same coin.
   */
  const [effortAsk, setEffortAsk] = useState<{ ei: number } | null>(null);
  /** Answered already, per exercise index. Once per movement, ever — see `shouldAskEffort`. */
  const [effortDone, setEffortDone] = useState<Record<number, boolean>>({});
  /**
   * What the recent record suggests about how hard to push — read ONLY when the coach sheet opens.
   *
   * ⚠ NOT ON MOUNT. A proposal is a conversation, and this one belongs in a sheet the athlete tapped;
   * fetching it at session start would mean a request every workout for a line most sessions never
   * show. Null is the common answer and stays null until something is actually proposed.
   */
  const [proposal, setProposal] = useState<IntensityProposal | null>(null);
  /* Drafts, as STRINGS — '' is a real state ("nothing entered"), and a number cannot hold it. The old
     picker collapsed the two: it seeded '' and rendered the wheel at `Number('') || 0`, so a wheel you
     opened and did not scroll showed 0, reported nothing, and wrote the weight back as null. */
  const [draftW, setDraftW] = useState('');
  const [draftR, setDraftR] = useState('');
  /* The two sheet inputs, so the tap that OPENS the sheet can also focus the field it named. */
  const weightInputRef = useRef<TextInput | null>(null);
  const repsInputRef = useRef<TextInput | null>(null);
  /* The keyboard primer — an always-mounted invisible input, focused synchronously inside the tap so
     the browser will open a keyboard at all. Full reasoning above the focus effect. */
  const primerRef = useRef<TextInput | null>(null);
  const primeKeyboard = useKeyboardPrimer();
  const keyboardInset = useKeyboardInset();
  const [wheelMode, setWheelMode] = useState(false); // typing is the default; the saved pref loads on mount
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heroPref, setHeroPref] = useState<Record<number, 'expanded' | 'collapsed'>>({});
  const [autoCollapsed, setAutoCollapsed] = useState<Record<number, boolean>>({});
  const [favorite, setFavorite] = useState(false);
  /**
   * Which card has its goal editor open. One at a time, opened by tapping Goal on the card itself.
   *
   * ══ ⚠ IT USED TO OPEN ITSELF, AND THAT WAS THE PROBLEM ══
   *
   * A `goalQueue` held every freshly-added exercise and the panel appeared unbidden on each of their
   * cards, wedged between the hero and the set table. PO: *"I don't like that right there... I want it
   * to be after we click add exercise and THEN clicking the card."*
   *
   * They are right, and the reason is worth keeping: adding three exercises queued three panels, so
   * paging through what you just added meant dismissing a form three times before you could train. The
   * ask was pre-empting a decision most athletes make by just starting the set. Now the goal is offered
   * where it already lived — the Goal figure on the card, beside Last and Best — and it opens when
   * asked. Nothing is lost: the default is still three sets of eight (or a 30-second hold), which is
   * what the athlete would have accepted from the panel anyway.
   */
  const [goalOpen, setGoalOpen] = useState<number | null>(null);
  // set-completion celebrations
  const [flash, setFlash] = useState<{ ei: number; si: number; token: number } | null>(null); // green fuse on a row
  const [prShown, setPrShown] = useState<Record<number, boolean>>({}); // one PR per exercise
  const [prPrompt, setPrPrompt] = useState<{ name: string; perf: string; key: string | null } | null>(null);
  /**
   * WHAT THEY HAVE ALREADY DONE ON THESE LIFTS — the last two sessions and the standing mark.
   *
   * One read, four consumers: the Last column, the Best column, the coach's line under Goal, and the PR
   * moment (which is measured against their history rather than against the set they did ten seconds
   * ago). Keyed by `liftId` — catalogue key, name as fallback — the same identity `lastNotes` uses, so a
   * card's Last, Best and note all describe the same movement.
   *
   * ⚠ AN ABSENT ENTRY MEANS "NEVER DONE IT", and every consumer must stay silent for it. Defaulting a
   * missing mark to zero would make the first set an athlete ever logs a personal record.
   */
  const [liftHistory, setLiftHistory] = useState<Map<string, LiftHistory> | null>(null);
  /**
   * How long they have been lifting, remembered from the coach's questionnaire.
   *
   * ⚠ DEFAULTS TO INTERMEDIATE WHEN UNKNOWN, NOT BEGINNER. `incrementFor` scales the jump by experience
   * and beginner carries a 1.5× multiplier — so treating "never answered" as beginner would hand the
   * biggest weight increase to precisely the athlete the app knows least about.
   */
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  /*
   * HOW HARD HE PUSHES, resolved from the chosen level AND the athlete's experience — see
   * `rulebook/intensity.ts` for why both index the matrix rather than the level alone. `experience`
   * is device-local and starts undefined, and `profileFor` deliberately falls to the SAFEST row for
   * that rather than the middle one, so a new phone never quietly unlocks a harder coach.
   */
  const coachIntensity = useCoachIntensity();
  /* The whole blob and its refetch, so the in-session dial writes the SAME field `/preferences` writes
     rather than a second copy that could disagree with it. */
  const { prefs: appPrefs, loaded: prefsLoaded, refetch: refetchPrefs } = useAppPrefs();
  const coachProfile = useMemo(() => profileFor(coachIntensity, experience), [coachIntensity, experience]);

  /*
   * ══ THE ARTWORK ON THE ENTRY SCREEN — THE SAME RESOLVER HOME CALLS ══
   *
   * `Forge Workout Entry.dc.html` §2 is explicit that production must NOT hardcode the path the mock
   * uses: the whole reason to resolve here is that Resume should carry the art of the session being
   * resumed, so a Push Day resumes under push art.
   *
   * A live `ActiveSession` maps onto the resolver's `Workout` shape with nothing invented: the name feeds
   * its title rung, and `catalogKey` · `section` · `workingSets` are exactly what `enrichSessionExercises`
   * carries into the muscle, family and composition rungs. `WorkoutSectionKind` and `WorkoutSection` are
   * the same three-value union, so the section passes straight through rather than being mapped.
   *
   * ⚠ A KEYLESS EXERCISE IS DROPPED, NOT DEFAULTED. A custom lift with no catalogue key has no muscles to
   * read, and `enrichWithIndex` already discards a dangling key — passing `''` would rely on that, so the
   * filter here says it out loud. `sex` is the athlete's SAVED answer or `'unspecified'`, the resolver's
   * deliberate neutral path, so a profile that hasn't loaded degrades to neutral art rather than guessing.
   *
   * A freestyle session holds no exercises, so this lands on the neutral default — which is the correct
   * art for "nothing planned", reached by the normal path rather than by a special case.
   */
  const { profile: athleteProfile } = useProfile();
  const artFor = (s: ActiveSession) =>
    resolveHomeWorkoutArtwork({
      user: { sex: athleteProfile?.sex ?? 'unspecified' },
      workout: { name: s.workoutName },
      program: null,
      exercises: enrichSessionExercises(
        s.exercises
          .filter((e) => !!e.catalogKey)
          .map((e) => ({ catalogKey: e.catalogKey!, section: e.section, workingSets: e.sets.length })),
      ),
    });

  /** `Last: <exercise>` — §9's entire progress treatment. Omitted rather than faked on a fresh session. */
  const lastLine = (s: ActiveSession) => {
    const name = lastExerciseName(s);
    return name ? `Last: ${name}` : null;
  };

  /* The last thing they said about each of these lifts. Keyed by catalogKey ?? name, the same identity
     every other lift-history read in this app uses. */
  const [lastNotes, setLastNotes] = useState<Record<string, LastNote>>({});
  const [seal, setSeal] = useState<{ name: string; sets: number; volume: number; next: string | null; token: number } | null>(null);
  /* Off → Auto → Manual. `restEnabled` is derived from it, so every existing gate below — the
     countdown, the ding, the chip's bronze — keeps meaning "there is a timer" and none of them had to
     learn the third state. Only the two places that care WHEN it starts read the mode itself. */
  const [restMode, setRestModeState] = useState<RestMode>('off'); // default OFF; the saved pref loads on mount
  const restEnabled = restMode !== 'off';
  const [restSec, setRestSec] = useState(90);
  // rest-timer runtime — deadline-based so the count survives re-renders and a paused freeze holds its remaining
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restPaused, setRestPaused] = useState(false);
  /**
   * KEEP THE BIG REST PANEL UP — PO: *"when the timer starts you should be able to click it for it to
   * stay up if you want. Maybe a small 'stay' on the card when it starts."*
   *
   * The panel shows for ~3 seconds and then demotes to the header chip, which is right as a DEFAULT —
   * it is a 288pt card sitting over the exercise, and most of a rest is spent looking at the sets.
   * It is wrong as the only option: an athlete who wants the countdown in front of them had no way to
   * ask for it, and the chip's numerals are small enough to need looking for.
   *
   * ⚠ STICKY FOR THE SESSION, NOT FOR ONE REST. Clearing it each time would mean tapping Stay after
   * every set for the whole workout, which is worse than the problem. It is a preference the athlete
   * states once and takes back once.
   *
   * ⚠ NOT PERSISTED. `rest-timer-pref` stores the MODE, which is a setting; this is a mood for the
   * session in front of you, and a panel that reappeared over tomorrow's workout because of a tap made
   * today would be the app remembering the wrong thing.
   */
  const [restPinned, setRestPinned] = useState(false);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(90);
  const [now, setNow] = useState(() => Date.now());
  /**
   * An AMRAP's clock, tagged with the block it belongs to.
   *
   * Tagged rather than bare so it survives moving BETWEEN members of the same circuit — which is the
   * whole shape of an AMRAP, you cycle its exercises while one clock runs — and simply stops being shown
   * the moment you leave the block, with no cleanup effect to get wrong.
   */
  const [amrap, setAmrap] = useState<{ groupId: string; endsAt: number } | null>(null);
  const [toast, setToast] = useState<{ msg: string; token: number } | null>(null);
  const [pop, setPop] = useState<{ ei: number; si: number; field: 'weight' | 'reps'; token: number } | null>(null);
  const [durationPicker, setDurationPicker] = useState(false);
  const [durMin, setDurMin] = useState(1);
  const [durSec, setDurSec] = useState(30);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [wNameOpen, setWNameOpen] = useState(false);
  const [wNameDraft, setWNameDraft] = useState('');
  /* A note on the lift in front of you. Scoped to the exercise the ⋯ menu was opened from, so it cannot
     drift onto a different movement if the index moves while the sheet is up. */
  /*
   * Which superset member is open as a full card, if any.
   *
   * ⚠ THE CARD'S OWN COMMENT ALREADY CLAIMED THIS WORKED — "Tapping a member's name in the card opens it
   * on its own." It did not: the tap moved `exerciseIndex`, but `isSuperset` is derived from the block
   * the index sits in, so the fused card simply re-rendered around the new member and nothing visible
   * happened. Intended behaviour, described in a comment, never wired.
   */
  const [ssOpen, setSsOpen] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  /**
   * The sentence the athlete has read and closed — stored as the TEXT, not as a boolean.
   *
   * PO: *"during active workout when coach holt is talking, put an x on the text bubble so I can close
   * after reading."*
   *
   * ⚠ A BOOLEAN WOULD HAVE BEEN THE WRONG SHAPE, AND SILENTLY. `coachLine` is DERIVED on every render,
   * never fired (see `saysRaw`), so a `dismissed` flag would have to be cleared by something — and the
   * only honest trigger is "he has something different to say", which is the comparison itself. Keying
   * on the string means closing a cue closes THAT cue: the next progression line, the next mid-set
   * nudge, the next exercise's plan note all arrive as new text and appear on their own.
   *
   * It also cannot get stuck. Nothing persists it, so a line dismissed today is not silenced tomorrow,
   * and the coin never leaves the screen — closing the bubble hides a sentence, not the coach.
   */
  const [dismissedSay, setDismissedSay] = useState<string | null>(null);
  /**
   * The athlete's home gym, read once when Holt's sheet is first opened.
   *
   * ⚠ `undefined` MEANS "NOT READ YET" AND `null` MEANS "THEY NEVER SAID" — both must pass straight
   * through to `session-suggest`, which treats either as "do not filter". Collapsing them into `[]`
   * would empty every suggestion list for everyone who skipped that setup question.
   *
   * Read on OPEN rather than on mount, for the same reason `fetchIntensitySignals` is: this is a gym
   * screen and a network read nobody asked for is a network read that can fail while somebody is under
   * a bar.
   */
  const [ownedGear, setOwnedGear] = useState<string[] | null | undefined>(undefined);
  /**
   * The exercise pager.
   *
   * ⚠ DECLARED UP HERE, WITH THE OTHER TOP-LEVEL STATE, BECAUSE HOOKS CANNOT LIVE WHERE IT IS USED.
   * This screen has four early returns below (`loading`, `resume`, an empty freestyle session, the
   * saving state), so a `useRef` or `useEffect` beside the pager's own markup would be called
   * conditionally — the exact rule `react-hooks/rules-of-hooks` rejects, and the reason the coach
   * suggestions further down are plain computation rather than `useMemo`.
   */
  const pagerRef = useRef<ScrollView>(null);
  const { width: pageW } = useWindowDimensions();
  /* False until the pager has been positioned once, so a RESUMED session opens on its exercise instead
     of visibly sliding to it from the first one. Only the moves after that animate. */
  const pagerSettled = useRef(false);
  /**
   * ⚠ THE PAGE HEIGHT IS MEASURED, NOT INHERITED — and this is the RN trap that renders and then does
   * nothing.
   *
   * Each page holds a vertical `ScrollView` carrying `flex: 1`. Inside a HORIZONTAL scroll view the
   * content container's height is not definite, and `flex: 1` against an indefinite parent is not a
   * constraint at all: the inner scroller collapses to its content, stops scrolling, and the set table
   * runs off the bottom of the screen with no way to reach it. Nothing errors, and it looks fine until
   * an exercise has more than about four sets.
   *
   * `onLayout` on the pager gives a real number to hand each page. Zero on the first frame, which falls
   * back to content height for that one frame rather than to nothing.
   */
  const [pagerH, setPagerH] = useState(0);
  /**
   * The exercise index whose cardio bout is OPEN — started and not yet logged. Null when none is.
   *
   * Held here rather than in the card because it gates this screen's navigation, and a card cannot
   * disable the bar above it.
   */
  const [liveBoutIdx, setLiveBoutIdx] = useState<number | null>(null);
  // Walkthrough plumbing. Fires on the FIRST session and nothing after — a PO call: the six things this
  // screen doesn't explain about itself are worth one overlay, and "Skip" is one tap for anyone who is
  // genuinely under a bar.
  const optionsRef = useTourAnchor('workout-options');
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const sessionRef = useRef(session);
  /*
   * Partner tagging — persists onto the saved workout; Finish opens the 4-stage seal (W-17) on real data.
   *
   * READ OFF THE SESSION, not held in screen state. It was `useState` and that lost every tag on a
   * crash, because nothing outside this component could see them — and it made tagging a person who
   * joins you mid-workout impossible, since that accept happens on another screen with only AsyncStorage
   * between the two.
   */
  const taggedPartners = session?.partnerIds ?? [];
  const [playlistSheetOpen, setPlaylistSheetOpen] = useState(false);
  const [partnerSheetOpen, setPartnerSheetOpen] = useState(false);
  const invitePan = useSheetDrag({ onClose: () => setInvitePickerOpen(false) });
  const partnerPan = useSheetDrag({ onClose: () => setPartnerSheetOpen(false) });
  const [invitePickerOpen, setInvitePickerOpen] = useState(false);
  /* Holt, on this screen. Its own flag rather than a face of the ⋮ sheet — the two answer different
     questions and neither should close the other (see `SessionCoachSheet`). */
  const [coachOpen, setCoachOpen] = useState(false);
  const inWorkoutHolt = useCapGate('holt_in_workout');
  /* Join requests waiting on me (0121) — the banner, and the answer to it. */
  const [joinRequests, setJoinRequests] = useState<PendingJoinRequest[]>([]);
  const [joinBusy, setJoinBusy] = useState(false);

  const showToast = useCallback((msg: string) => {
    const token = Date.now();
    setToast({ msg, token });
    setTimeout(() => setToast((t) => (t && t.token === token ? null : t)), 1900);
  }, []);

  /**
   * `usePersist` for the coach-intensity writes, but against THIS screen's toast rather than the ceremony
   * one.
   *
   * ⚠ DELIBERATELY NOT `usePersist()`. That hook routes through `useToast` from `useCeremony`, and a
   * ceremony-layer toast during an active workout is the wrong surface — W-9–W-16 own their own overlay
   * (`showToast` above, 1.9s, inside the session chrome) precisely so nothing from the app's ceremony
   * queue can interrupt a working set. The RULE is shared; the surface is not.
   *
   * The four call sites all set `coachIntensity`, and each had a bare `void saveAppPrefs(...)` whose
   * failure was invisible — one of them then toasted "Pushing harder from here." regardless, which is a
   * statement about what the coach will do next that the next prescription would contradict.
   */
  const persistPref = useCallback(
    (write: () => Promise<unknown>, opts?: { onOk?: () => void }) => {
      void write().then(
        () => opts?.onOk?.(),
        () => showToast('Couldn’t save that — check your connection.'),
      );
    },
    [showToast],
  );

  /**
   * ⚠ LIVE PRESENCE IS DERIVED FROM A SESSION EXISTING, NOT FROM REMEMBERING TO ANNOUNCE ONE.
   *
   * `setTrainingStatus` has exactly one caller — `useWorkoutSession`'s `startWorkout` — so an athlete is
   * only visible in Live Now if the screen that launched them remembered to call it. EIGHT did not:
   * `workout-invite`, `workout-join`, `templates`, `template/[id]`, `starter-template/[id]`,
   * `workout-builder` (both paths) and `program/[id]`'s `goTrain`, all of which just
   * `router.replace('/workout')`. Nor did resuming after the app was killed.
   *
   * The consequences were the two-device kind this domain has already had to fix once: accept a Train
   * Together invite and you are INVISIBLE to the person who invited you — Live Now is empty, nobody can
   * tap "Join workout" on you, and branch 9 of `notification_events_for` (which gates on the recipient's
   * `training_since`) cannot fire either.
   *
   * `program/[id].tsx:391` carries a comment saying `startWorkout` "is not optional here even though the
   * logger builds its own session: it is what sets LIVE PRESENCE" — the sibling in the same file proves
   * the other omissions are oversights, not decisions.
   *
   * So the logger asserts it instead. This screen is the one place that always knows a session is
   * running, whatever route reached it, so presence stops depending on nine callers agreeing. Inside the
   * async body rather than the effect's own scope because `startWorkout` is a setState and
   * react-compiler refuses that synchronously in an effect.
   */
  useEffect(() => {
    const name = session?.workoutName;
    // Nothing to announce, or the provider already knows (the athlete came through a screen that did
    // call `startWorkout`). Re-announcing would reset `startedAt` and lose the time it really began.
    if (!name || liveSession) return;
    let alive = true;
    /*
     * Deferred by a microtask, not called inline. Synchronising React state to an external system is
     * exactly what an effect is for, but `startWorkout` is a setState and react-compiler refuses that in
     * an effect BODY (`react-hooks/set-state-in-effect`, the rule that already holds this repo's one
     * standing lint error). One tick later is outside the body and changes nothing an athlete can see.
     */
    void Promise.resolve().then(() => {
      if (alive) startWorkout(name);
    });
    return () => {
      alive = false;
    };
  }, [session?.workoutName, liveSession, startWorkout]);

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
      const wantsSomething =
        !!launch &&
        (!!launch.conditioning || !!launch.templateId || !!launch.starterId || !!launch.freestyle || !!launch.programId || !!launch.exercises?.length);

      if (hasWork) {
        setResumable(saved);
        setPendingLaunch(wantsSomething ? launch : null);
        /* ⚠ THE CLOCK IS READ HERE, NOT IN RENDER. `Date.now()` in a render body is an impure call the
           react-compiler lint rejects outright — and it would be wrong anyway: the elapsed figure would
           jump on every unrelated re-render. Frozen at the moment the prompt is raised, which is also the
           moment the number describes. */
        setResumeAt(Date.now());
        setPhase('resume');
        // Held, not consumed: whichever way they answer, `startPending` re-reads it.
        return;
      }
      let fresh: ActiveSession | null = null;

      /* Invited (0092): whoever asked is pre-tagged, so accepting credits both athletes through the
         partner mechanism that already exists rather than a shared-session object two devices would have
         to keep in step. Written INTO each session built below rather than into screen state, so it
         rides autosave like everything else on the session. */
      const launchPartners = launch?.partnerId ? [launch.partnerId] : undefined;

      /*
       * …AND ANYONE WHO ACCEPTED AN ASK OF YOURS, which is the half that was missing.
       *
       * `launch.partnerId` only ever reaches the device that RECEIVED something. Send an invite from
       * `/train-invite`, pocket the phone, then go and train, and nothing tagged anybody — the sender was
       * not in a session at the moment they asked. Deriving it from the accepted invite instead makes
       * both athletes run the same rule over the same row, so the credit is symmetric however the ask
       * went. See `domain/workout/partner-credit.ts`.
       *
       * ⚠ DELIBERATELY NOT AWAITED. Everything below this line builds the session the athlete is standing
       * there waiting for, and a name on a chip is not worth a network round trip in front of it. It
       * lands a moment later and merges into whatever the session has by then — including a session that
       * came back through the resume prompt, which this effect returns before ever reaching.
       *
       * Finish re-derives the whole set anyway, so a read that never lands costs the chip, not the credit.
       */
      const creditWindowStart = Date.now() - PARTNER_CREDIT_WINDOW_MS;
      /* Held in the closure so BOTH orders work. The branches below take anywhere from no awaits (a
         freestyle start) to two network reads (a program day), so this answer can arrive on either side
         of the session existing: `startSession` reads whatever has landed by then, and the handler
         catches the session if it had not been built yet. */
      let credits: AcceptedTraining[] = [];
      const applyCredits = (s: ActiveSession): ActiveSession => {
        const merged = mergePartnerCredits(s.partnerIds ?? [], credits, s.partnerIdsDeclined ?? []);
        return merged.length === (s.partnerIds ?? []).length ? s : { ...s, partnerIds: merged };
      };
      void fetchAcceptedTrainingCredits(new Date(creditWindowStart).toISOString()).then((accepted) => {
        credits = creditsInWindow(accepted, { fromMs: creditWindowStart, toMs: Date.now() });
        if (credits.length) setSession((s) => (s ? applyCredits(s) : s));
      });
      /* Where the guest opens (0121). An ordinary invite is 0; a JOIN accepted mid-workout is wherever
         the host had reached, snapshotted by them at accept time. Clamped when it is read. */
      const launchStart = launch?.startIndex ?? 0;
      /*
       * Every branch below builds a session and starts it through HERE, so the two launch-derived facts
       * are applied in one place. They used to be applied by branch — which is why `partnerId` reached
       * only the snapshot path and an invite carrying a TEMPLATE credited nobody.
       */
      const startSession = (s: ActiveSession) => {
        setSession(
          applyCredits({
            ...s,
            partnerIds: launchPartners ?? s.partnerIds,
            exerciseIndex: Math.min(Math.max(0, launchStart), Math.max(0, s.exercises.length - 1)),
          }),
        );
      };

      /* An explicit shape (0093) — what an invite carries. Checked before templateId because an invite
         snapshots its workout rather than pointing at one. */
      if (launch?.exercises && launch.exercises.length > 0) {
        const shape = launch.exercises;
        const nm = launch.workoutName ?? 'Shared Workout';
        await clearWorkoutLaunch();
        /*
         * ⚠ A SHARED WORKOUT IS STILL YOUR OWN PROGRAM'S SESSION, and until now it was not.
         *
         * The invite carries a SHAPE rather than a pointer, because the sender's program is theirs and
         * "next session" resolves per athlete (0093). Right — but it also meant this branch built a
         * session with no `programId`, so `save_workout` wrote no `program_sessions` row and Home went on
         * offering a day the athlete had already trained. Two athletes finished Week 2 · Day 1 together
         * and Home still said "Legs — Start Workout" afterwards; one of them re-logged the whole session
         * by hand because the app told him it had not happened.
         *
         * So ask the GUEST's own schedule whether this shape is one of the sessions they owe. Null — no
         * program, or no slot it covers — leaves the session exactly as it saved before. See
         * `domain/program/shared-session.ts`.
         */
        const slot = await resolveSharedSessionSlot(shape);
        startSession({
          workoutName: nm,
          activityType: 'strength',
          startedAt: new Date().toISOString(),
          templated: true, // arrived with a prescribed shape — see `ActiveSession.templated`
          /* Both coordinates travel, which is the exception `workout-launch.ts` names: the server picks
             the first OPEN slot when it is sent none, and the slot this shape covers is not always that
             one. A resolution made from live marks two seconds ago cannot go stale the way a card can. */
          ...(slot ? { programId: slot.programId, programWeek: slot.weekIndex, programDay: slot.dayIndex } : null),
          /*
           * ⚠ THE ONE CROSSING, NOT A SECOND COPY OF IT. This was a hand-rolled `shape.map` that read
           * four fields and hard-coded `section: 'main'` — right for an invite, which snapshots a
           * workout down to its bones, and wrong for the other thing that arrives here: a workout built
           * through Home's "Build for later" sends its whole `TemplateExercise[]`, and was landing with
           * its warm-up and cool-down flattened into main, its supersets dissolved, its cardio blocks
           * turned into sets of reps, and its coaching cues dropped.
           *
           * `templateToSessionExercises` is the converter that already handles all of that, and its set
           * construction is character-for-character what stood here (`Math.max(1, e.sets)`,
           * `targetReps || 8`, the same `'main'` default), so an invite's four-field rows build exactly
           * the session they built before. The `starterId` field in `workout-launch.ts` names this very
           * failure as its reason for existing; the planned workout was walking into it regardless.
           */
          exercises: templateToSessionExercises(shape),
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
        startSession({
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
            startSession({
              workoutName: launch.workoutName ?? t.name,
              activityType: 'strength',
              startedAt: new Date().toISOString(),
              // Attributes the saved workout back to the template (0095) — what makes its "Times used"
              // and session history real, and what makes them count only sessions actually finished.
              templateId: t.id,
              templated: true,
              exercises: templateToSessionExercises(t.exercises),
            });
            setPhase('active');
            return;
          }
        } catch {
          // a missing template must not block training — fall through to a freestyle session
        }
        startSession({ workoutName: launch.workoutName ?? 'Shared Workout', activityType: 'strength', startedAt: new Date().toISOString(), exercises: [] });
        setPhase('active');
        return;
      }

      /*
       * A FORGE SESSION, TRAINED WITHOUT BEING OWNED.
       *
       * The preview screen had one action — "Add to My Templates" — so the only way to train one of the
       * 81 shipped sessions was to first put a copy in your library. That is the wrong order for the
       * commonest case: you are standing in a gym looking at a push day and you want to do it, not file
       * it. Adopting stays exactly where it was, for when you want to keep and edit it.
       *
       * NO `templateId` IS STAMPED, because there is no row to stamp — the session saves as an ordinary
       * free workout under the definition's name. That is honest: nothing yet claims "times used" for a
       * template the athlete does not have. Taking it first, then training it, still attributes normally.
       */
      if (launch?.starterId) {
        await clearWorkoutLaunch();
        const def = getStarterTemplate(launch.starterId);
        startSession({
          workoutName: launch.workoutName ?? def?.name ?? 'Workout',
          activityType: 'strength',
          startedAt: new Date().toISOString(),
          /* ⚠ THE ONE CASE `programId`/`templateId` CANNOT COVER. This branch stamps neither on
             purpose (there is no row to attribute to), so without this flag an 11-exercise Forge push
             day would be indistinguishable from an empty freestyle session. */
          templated: true,
          exercises: def ? templateToSessionExercises(def.exercises) : [],
        });
        setPhase('active');
        return;
      }

      if (launch?.freestyle) {
        // A one-off: no program, no prescription. Starts empty and is filled from the Picker as they go.
        await clearWorkoutLaunch();
        startSession({ workoutName: launch.workoutName ?? 'Freestyle Workout', activityType: 'strength', startedAt: new Date().toISOString(), exercises: [] });
        setPhase('active');
        return;
      }
      if (launch?.programId) {
        await clearWorkoutLaunch(); // consume it, so a later ad-hoc workout isn't credited to this program
        try {
          const [program, marks] = await Promise.all([
            fetchProgram(launch.programId),
            fetchProgramSessions(launch.programId),
          ]);
          if (program) {
            /*
             * WHICH session to open. A slot the athlete PICKED wins; otherwise the first one with
             * nothing against it, resolved HERE from live state so the session trained is always the
             * one the progress bar is about to advance.
             *
             * It read `nextSession(structure, count)` until 0119, and a count can only describe a
             * program done strictly in order — the reason a swap was impossible rather than merely
             * unbuilt. `nextOpenSlot` walks the schedule and skips anything already trained OR skipped.
             */
            const chosen =
              launch.programWeek != null && launch.programDay != null
                ? { weekIndex: launch.programWeek, dayIndex: launch.programDay }
                : null;
            const next = chosen ?? nextOpenSlot(program.structure, marks);
            if (next) {
              // Percentages resolve HERE, from the run's own frozen maxes, so each set carries the bar
              // it is asking for and the athlete does no arithmetic mid-session. A program with no
              // percentages, or one whose gate is unanswered, produces sets with no target weight —
              // which is the honest result, not a zero.
              const load = loadContextFor(program.liftMaxes, units === 'metric', (lb) => weightInExact(lb, units));
              fresh = buildSessionFromProgram(program.id, program.structure, next.weekIndex, next.dayIndex, load);
              // Only a deliberate pick travels to the commit; the default path leaves it to the server,
              // which resolves the same first-open slot from the same rows.
              if (fresh && chosen) fresh = { ...fresh, programWeek: chosen.weekIndex, programDay: chosen.dayIndex };
            }
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
      startSession(
        fresh
          ? { ...fresh, templated: true }
          : { workoutName: 'Freestyle Workout', activityType: 'strength', startedAt: new Date().toISOString(), exercises: [] },
      );
      setPhase('active');
    })();
    /*
     * `units` is READ here and deliberately not a dependency. This effect SEEDS the session; re-running
     * it rebuilds every exercise from the prescription, which would throw away sets the athlete has
     * already logged. Flipping lb/kg mid-session must not cost someone their workout — the target
     * weights stay in the unit the session was built in, and every figure they log is stored in pounds
     * regardless, so nothing is misrecorded by the omission.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  // load the saved rest-timer preference (stays OFF until the athlete has turned it on before)
  useEffect(() => {
    getRestMode().then(setRestModeState);
  }, []);

  /*
   * The scroll position follows `exerciseIndex`, never the other way round.
   *
   * Four things move that index without touching the pager: the arrows, the dot strip, "Next Exercise",
   * and the Picker's inbox draining after an add or a swap (which jumps to the new lift). Each one has
   * to carry the page with it, and the alternative — having every caller remember to scroll — is the
   * kind of rule that holds until somebody adds a fifth caller.
   *
   * A swipe settles onto a page and then calls `goExercise`, so this fires with the offset already
   * correct and the `scrollTo` is a no-op. That is the intended shape: one direction of truth.
   */
  useEffect(() => {
    const n = session?.exercises.length ?? 0;
    if (phase !== 'active' || !pageW || n === 0) return;
    const i = Math.min(Math.max(0, session?.exerciseIndex ?? 0), n - 1);
    pagerRef.current?.scrollTo({ x: i * pageW, animated: pagerSettled.current });
    pagerSettled.current = true;
  }, [session?.exerciseIndex, session?.exercises.length, pageW, phase]);

  // …and the input preference. Typing unless they have chosen the wheel before.
  useEffect(() => {
    getWheelInput().then(setWheelMode);
  }, []);

  // autosave on every change while active
  useEffect(() => {
    if (phase === 'active' && session) void persistSession(session);
  }, [session, phase]);

  /*
   * ══ PUBLISH THE SESSION FOR WHOEVER IS ALLOWED TO WATCH (0181) ══
   *
   * PO: *"I see a friend working out rn I should be able to see what they've logged and have planned."*
   * Only when this athlete has opted in (`live_session` is not private — read once, here, because the
   * gate is the athlete's own setting and the server enforces the audience). Debounced: a set logged is
   * one publish four seconds later, not one per keystroke in the weight sheet, and a session that is
   * being edited furiously still lands within seconds of going quiet. The row is cleared when the
   * session ends (`useWorkoutSession.endSession`), and the read ignores it after four hours regardless.
   */
  const [shareLive, setShareLive] = useState(false);
  useEffect(() => {
    let alive = true;
    void fetchVisibility().then((v) => alive && setShareLive(v.live_session !== 'private'), () => {});
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!shareLive || phase !== 'active' || !session) return;
    const t = setTimeout(() => void publishLiveSession(liveSessionSnapshot(session)), 4000);
    return () => clearTimeout(t);
  }, [session, phase, shareLive]);

  /*
   * Read what they have already done on these lifts, once the session's lifts are known.
   *
   * Keyed on the exercise IDENTITIES rather than the session object, so adding a set or logging reps
   * does not re-fetch — but swapping or adding an exercise does, which is when a new lift's history is
   * needed. The key carries the catalogue key as well as the name: swapping to a differently-keyed lift
   * that happens to share a display name is rare, and silently reusing the wrong history for it is not
   * the kind of bug that announces itself.
   *
   * JSON rather than a delimiter-joined string: an exercise name is athlete-supplied text, and picking a
   * separator it cannot contain is a guess. This one cannot be wrong.
   */
  const exerciseIds = JSON.stringify(
    session?.exercises.map((e) => [e.catalogKey ?? null, e.name]) ?? [],
  );
  useEffect(() => {
    const lifts = (JSON.parse(exerciseIds) as [string | null, string][]).map(([catalogKey, name]) => ({
      catalogKey,
      name,
    }));
    if (!lifts.length) return;
    let alive = true;
    void fetchLiftHistory(lifts).then((r) => {
      if (alive) setLiftHistory(r);
    });
    return () => {
      alive = false;
    };
  }, [exerciseIds]);

  /* Remembered once, at the coach's questionnaire, and read here to size the weight jump. Its own effect
     because it is device-local and instant: folding it into the history read above would make a coaching
     line wait on a network round trip that has nothing to do with it. */
  useEffect(() => {
    let alive = true;
    void loadExperience().then((e) => {
      if (alive && e) setExperience(e.lifting);
    });
    return () => {
      alive = false;
    };
  }, []);

  /* The same read, for what they last SAID about these lifts. Separate effect rather than folded into
     the one above: a note is decoration on the card and a record gates the PR banner, so a slow or
     failed note read must never hold up the thing that decides whether a set is a record. */
  useEffect(() => {
    if (!session?.exercises.length) return;
    let alive = true;
    void fetchLastNotes(session.exercises.map((e) => ({ catalogKey: e.catalogKey, name: e.name }))).then((r) => {
      if (alive) setLastNotes(r);
    });
    return () => {
      alive = false;
    };
  }, [exerciseIds, session?.exercises]);

  // rest ticker — repaints twice a second while running; clears itself when the deadline passes (setState in
  // the interval callback is the async-callback form the strict react-hooks rules allow, like a query result)
  useEffect(() => {
    if (restEndsAt == null || restPaused) return;
    const t = setInterval(() => {
      const ms = Date.now();
      if (ms >= restEndsAt) {
        setRestEndsAt(null);
        // A small ding, and only if they want one. The toast alone required looking at the phone,
        // which is exactly what an athlete resting between sets has put down.
        if (soundOn) playRestDing();
        showToast('Rest complete — next set.');
      } else setNow(ms);
    }, 500);
    return () => clearInterval(t);
  }, [restEndsAt, restPaused, showToast, soundOn]);

  // AMRAP ticker — same deadline-based shape as the rest timer, so a re-render never loses the count
  useEffect(() => {
    if (!amrap) return;
    const t = setInterval(() => {
      const ms = Date.now();
      if (ms >= amrap.endsAt) {
        setAmrap(null);
        showToast('Time — that’s the AMRAP.');
      } else setNow(ms);
    }, 500);
    return () => clearInterval(t);
  }, [amrap, showToast]);

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
          /* A superset declared in the Picker is the SAME block the ⋮ menu builds — `makeSuperset`
             already takes N ≥ 2 and derives the round count from the longest member, so grouping
             three at once needs no grouping logic of its own. Appended contiguously, which is what
             `blockAt`'s adjacency walk requires. */
          const asSuperset = inbox.group === 'superset' && inbox.items.length >= 2;
          const gid = `ss${Date.now()}`;
          // Appending and jumping to what was appended are ONE update now that the index lives on the
          // session — two calls would still queue correctly, but a later edit could reorder them.
          setSession((s) => {
            if (!s) return s;
            const appended = [...s.exercises, ...inbox.items.map((p, i) => pickedToExercise(p, base + i))];
            return { ...s, exercises: asSuperset ? makeSuperset(appended, base, inbox.items.length, gid) : appended, exerciseIndex: base };
          });
          /* NOTHING IS ASKED HERE. This used to queue a goal panel per added lift — see `goalOpen` for
             why that came out. The added exercise arrives ready to train, and its goal is one tap away
             on its own card whenever the athlete wants it. */
          showToast(
            asSuperset
              ? `Added ${inbox.items.length} exercises as a superset`
              : `Added ${inbox.items.length} ${inbox.items.length === 1 ? 'exercise' : 'exercises'}`,
          );
        } else {
          const idx = inbox.targetIdx;
          if (idx < 0 || idx >= cur.exercises.length) return;
          setSession((s) => (s ? { ...s, exercises: s.exercises.map((e, i) => (i === idx ? swapExercise(e, inbox.item) : e)), exerciseIndex: idx } : s));
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
    /*
     * UNLOCK THE AUDIO HERE, INSIDE THE TAP.
     *
     * Rest expiry fires from a setInterval, and iOS Safari will not let a timer make a sound: an
     * AudioContext starts suspended and only resumes inside a user gesture. This runs synchronously
     * from the athlete's press on "Log Set", so the action that STARTS the rest is what buys the
     * permission to end it out loud. No-op on native. See `lib/ding.web.ts`.
     */
    primeDing();
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
  /* Shows for ~3s and then demotes to the compact chip — unless the athlete pinned it. See `restPinned`. */
  const restProminent = restRunning && (restPinned || restTotal - restRemaining < 3);
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
  const cycleRest = () => {
    const next = nextRestMode(restMode);
    setRestModeState(next);
    void setRestMode(next); // persist — the choice stays for later workouts
    if (next === 'off') restSkip(); // turning it off mid-rest clears any running countdown
  };
  /* What the chip's value line says. `Auto` and `Manual` are named because the duration alone cannot
     tell them apart, and an athlete who has just switched to manual and sees only "1:30" has no way to
     know whether the next logged set will start it. */
  const restValueText = restMode === 'off' ? 'Off' : `${fmtMMSS(restSec)} · ${restMode === 'auto' ? 'Auto' : 'Manual'}`;
  const openDuration = () => {
    setDurMin(Math.floor(restSec / 60));
    setDurSec(restSec % 60);
    setDurationPicker(true);
  };
  const confirmDuration = () => {
    setRestSec(Math.max(15, durMin * 60 + durSec)); // floor 15s
    setDurationPicker(false);
  };

  /**
   * Mark a set logged.
   *
   * `base` lets a caller hand in a session it has ALREADY patched — the Set Input Sheet writes weight
   * and reps and completes in one action, and reading `session` from the closure here would complete
   * the set as it was before those values landed.
   */
  const completeSet = (ei: number, si: number, base?: ActiveSession) => {
    const from = base ?? session;
    if (!from) return;
    /**
     * Completing a set back-fills the actual from the target — EXCEPT to failure, where there is no
     * target to back-fill from. Its `targetReps` is 0 by design, so the old back-fill would have written
     * a zero-rep set into the athlete's history and into the volume behind their records. A failure set
     * stays blank until they say what they got, which is the only number that set was ever about.
     *
     * ⚠ A TIMED SET BACK-FILLS THE CLOCK, NOT THE REP COUNT. "You did what was asked" is the right
     * default for both shapes; for a 60s Plank what was asked is sixty seconds, and the rep column has
     * nothing true to put in it (`session-core` now carries `targetReps: 0` for exactly this reason).
     * Writing the duration is what makes the completed hold a record of the hold rather than a done
     * checkbox with no data behind it.
     */
    const ns = patchSet(from, ei, si, (set) => ({
      ...set,
      done: true,
      actualReps: set.actualReps ?? (set.toFailure || set.targetSec != null ? null : set.targetReps),
      durationSec: set.targetSec != null ? set.durationSec ?? set.targetSec : set.durationSec,
    }));
    setSession(ns);
    /* The confirmation that does not need eyes. Fired here rather than in the button's `onPress` so
       that every path into a completed set gets it — the check, the hold timer's `logHold`, and the
       auto-complete in `commitSheet` — instead of only the one the thumb happened to take. */
    haptics.light();
    const ex = ns.exercises[ei];
    const done = ex.sets[si];

    // green fuse flash on the row — the token guards a stale timeout from clearing a newer flash
    const token = nextAnimationToken();
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
     * they had already logged for 1–5 reps on this lift. The mark is ABSENT for a lift they have never
     * done, and that stays silent — the first time is a baseline, not a record.
     *
     * ⚠ MATCHED BY CATALOGUE KEY FIRST (`liftId`), name only as the fallback. It used to match by name
     * alone, while `continueWorkout` — deciding the same question about the same set — matched key-first.
     * One file, two answers to "which lift is this", and this was the weaker one.
     */
    if (!prShown[ei] && done.weight != null && done.actualReps != null && done.actualReps <= PR_MAX_REPS) {
      const prior = liftHistory?.get(liftId(ex))?.best?.weight;
      if (prior != null && done.weight > prior) {
        const w = done.weight;
        const r = done.actualReps;
        setPrShown((p) => ({ ...p, [ei]: true }));
        /* A PR should not feel like logging set three — `success` is iOS's two-beat pattern, and the
           set that earned it has already fired `light` a beat earlier. */
        haptics.success();
        setPrPrompt({ name: ex.name, perf: `${w} ${unitLabel(units)} × ${r}`, key: ex.catalogKey ?? null });
      }
    }

    /*
     * ══ "LET'S GO UP 10 LBS" ══
     *
     * The PO's ask, and the only coaching line in the app that reads the set that just happened rather
     * than the last two sessions. It fires here because this is the one funnel every logged set and
     * every finished hold passes through.
     *
     * ⚠ ALL FIVE GATES LIVE IN `intraSetSuggestion`, NOT HERE — the profile allowing it, a genuine
     * overshoot, a later set to instruct, loadable equipment, and never downward. Keeping them in the
     * pure module is what lets them be tested; a condition added to this call site instead would be a
     * rule nobody can see.
     */
    const nudge = intraSetSuggestion({
      exerciseName: ex.name,
      pattern: patternOf(ex),
      experience,
      equipment: equipmentForCatalogKey(ex.catalogKey),
      profile: coachProfile,
      justLogged: { weight: done.weight, actualReps: done.actualReps },
      topReps: done.targetRepsMax ?? done.targetReps,
      /* Counted off the SESSION AFTER this set landed, so the last set of an exercise reports zero and
         the module's "nothing left to instruct" gate closes on its own. */
      setsRemaining: ex.sets.filter((s2) => !s2.done).length,
    });
    /*
     * ⚠ THE NULL CASE WRITES TOO, AND THAT IS THE FIX. This was `if (nudge) setIntraLine(...)`, so a set
     * that warranted no nudge left the PREVIOUS one standing — a sentence about a set two sets ago,
     * presented as the newest thing the coach knows. PO: *"He needs to stay current."*
     *
     * Scoped to `ei`: a nudge on another exercise is not stale just because a set landed over here, and
     * the coin already refuses to carry one across lifts. So a null result clears only this exercise's
     * line and leaves the rest of the session alone.
     */
    setIntraLine((prev) =>
      nudge ? { ei, text: nudge.message, upTo: nudge.suggestedWeight } : prev?.ei === ei ? null : prev,
    );

    /*
     * THE FIRST SET OF A MOVEMENT THEY HAVE NEVER DONE — ask how it felt.
     *
     * `startingLoadLine` tells a first-timer how to pick a weight, and a guess made that way is
     * deliberately conservative, so the first working set is usually too light. Nothing corrected it
     * until the next session. This does, from the one thing a beginner can report accurately.
     *
     * ⚠ IT DOES NOT REACH PAST THE NUDGE ABOVE — every gate is in `shouldAskEffort`, and the two cannot
     * both fire: `intraSession` is false for every beginner cell, and this is beginners only.
     */
    if (
      shouldAskEffort({
        experience,
        pattern: patternOf(ex),
        equipment: equipmentForCatalogKey(ex.catalogKey),
        hasHistory: (liftHistory?.get(liftId(ex))?.sessions.length ?? 0) > 0,
        weight: done.weight,
        setsRemaining: ex.sets.filter((s2) => !s2.done).length,
        answered: !!effortDone[ei],
      })
    ) {
      setEffortAsk({ ei });
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
      /*
       * REST BELONGS AT THE END OF A ROUND, NOT IN THE MIDDLE OF ONE.
       *
       * The point of a superset is that A and B are done back to back. Firing the rest overlay after A
       * would be the app arguing with the training method the athlete just chose — so inside a superset
       * the timer waits until no member still owes this round. Everywhere else, unchanged.
       */
      const b = blockAt(ns.exercises, ei);
      const holdRest = b?.kind === 'superset' && !endsSupersetRound(ns.exercises, b, ei, si);
      /* ⚠ `auto` ONLY. On `manual` the timer exists and is armed — it just waits for ▶ on the chip,
         which is the whole difference the mode buys (see `lib/rest-timer-pref`). */
      if (restMode === 'auto' && !holdRest) startRest();
    }
  };
  /**
   * They answered. Write the new weight into every set of this exercise still to come, and hand the
   * sentence to the same coin the nudge uses.
   *
   * ⚠ UNLOGGED SETS ONLY. A set already done is a record of what happened; rewriting its weight because
   * of something said afterwards would edit history rather than the plan.
   */
  const answerEffort = (answer: EffortAnswer) => {
    const ask = effortAsk;
    const ex = ask ? session?.exercises[ask.ei] : null;
    if (!ask || !ex) return;
    const input = {
      experience,
      pattern: patternOf(ex),
      equipment: equipmentForCatalogKey(ex.catalogKey),
      hasHistory: (liftHistory?.get(liftId(ex))?.sessions.length ?? 0) > 0,
      weight: ex.sets.find((s2) => s2.done)?.weight ?? null,
      setsRemaining: ex.sets.filter((s2) => !s2.done).length,
      answered: false,
    };
    const next = weightAfterEffort(input, answer);
    if (next != null) {
      mutate((s2) => ({
        ...s2,
        exercises: s2.exercises.map((e, i) =>
          i !== ask.ei ? e : { ...e, sets: e.sets.map((st) => (st.done ? st : { ...st, weight: next })) },
        ),
      }));
    }
    /* `upTo: 0` on purpose — that field retires a line once the athlete has LIFTED the weight it named,
       which is right for "go up to X" and wrong for both of the others. Zero means the line simply ages
       out with the exercise, like every cue that names no target. */
    setIntraLine({ ei: ask.ei, text: effortReply(answer, next), upTo: 0 });
    setEffortDone((d) => ({ ...d, [ask.ei]: true }));
    setEffortAsk(null);
  };

  const uncompleteSet = (ei: number, si: number) => mutate((s) => patchSet(s, ei, si, (set) => ({ ...set, done: false })));

  /**
   * A hold finished — write what the clock watched, then complete the set through the normal path.
   *
   * Two steps, deliberately, and `completeSet(…, base)` is what makes it one update: the duration is
   * patched FIRST so the completion sees a set that already carries its own answer, and `completeSet`'s
   * `durationSec ?? targetSec` back-fill therefore leaves it alone. Everything that follows a logged set
   * — the fuse flash, the seal, the superset-aware rest, the advance — is the same code the rep path
   * runs, because a hold is a set and should not have a second, quietly divergent completion.
   */
  const logHold = (ei: number, si: number, heldSec: number) => {
    if (!session) return;
    completeSet(ei, si, patchSet(session, ei, si, (set) => ({ ...set, durationSec: heldSec })));
  };

  const addSet = (ei: number) =>
    mutate((s) => {
      const ex = s.exercises[ei];
      const last = ex.sets[ex.sets.length - 1];
      /* A fourth plank is another plank. Carrying `targetSec` forward is what stops "Add set" turning a
         timed exercise into a rep-based one halfway down its own table. */
      const next: SessionSet = {
        setIndex: ex.sets.length,
        weight: last?.weight ?? null,
        targetReps: last?.targetReps ?? 8,
        ...(last?.targetSec != null ? { targetSec: last.targetSec } : null),
        actualReps: null,
        done: false,
      };
      return replaceExercise(s, ei, { ...ex, sets: [...ex.sets, next] });
    });
  /**
   * Remove ONE set — the one whose trash was tapped, not the last one. PO: *"take out the 'remove set'
   * button during an active workout and put a small subtle red trash can symbol on the right of the
   * set."* The old pill only ever popped the tail, so removing set 2 of 4 meant removing 3 and 4 as well
   * and adding two back.
   *
   * ⚠ RE-INDEXED AFTER THE SPLICE. `setIndex` is what `save-core` writes as `set_index`, and it matches
   *   saved rows against fresh ones by that number (`fresh.some((f) => f.setIndex === s.set_index)`). A
   *   hole in the sequence would save a session whose sets are numbered 1, 2, 4.
   *
   * The last set stays: a table with no rows is an exercise with no prescription, and the exercise has
   * its own remove. The icon disappears at one set rather than greying out — a disabled trash beside the
   * only set reads as "this one is stuck", which is not the message.
   */
  const removeSet = (ei: number, si: number) =>
    mutate((s) => {
      const ex = s.exercises[ei];
      if (ex.sets.length <= 1 || si < 0 || si >= ex.sets.length) return s;
      const sets = ex.sets.filter((_, i) => i !== si).map((set, i) => ({ ...set, setIndex: i }));
      return replaceExercise(s, ei, { ...ex, sets });
    });

  /**
   * ══ THE COACH'S CALL ON EVERY LIFT IN THIS SESSION ══
   *
   * `progressionFor` reads the last two sessions and answers the one question a generator cannot: not
   * what to train, but *how much*. Add weight, add a rep, hold, or come back down. It was built, tested,
   * and wired only to the Coach wizard's preview — where the sentence was rendered once and then thrown
   * away, because the draft it saved carried no field for it. This is the screen it was written for.
   *
   * ⚠ ONLY WHERE A REP PRESCRIPTION EXISTS. Skipped for cardio (endurance refuses rather than guesses),
   * for timed sets, and for to-failure sets — a to-failure set carries `targetReps: 0`, which the engine
   * would read as a rep target of nothing and satisfy trivially, producing "go for 1".
   */
  /**
   * This lift's movement pattern — how much weight it should move by, and what it can be swapped for.
   *
   * ⚠ THE NAME FALLBACK IS NOT BELT-AND-BRACES, IT IS THE FIX FOR A REPORTED DEFECT. Keyed lookup alone
   * returned nothing for any exercise carrying no `catalogKey` — everything added freestyle, everything
   * imported, everything logged before the key existed. `incrementFor` then fell to its 5 lb default and
   * halved it for an advanced lifter, and the PO got "2.5 lb" offered on a barbell back squat. The
   * catalogue knows that lift perfectly well; nothing had asked it by name.
   */
  const patternOf = (e: { catalogKey?: string | null; name: string }): string =>
    (e.catalogKey ? itemByKey(e.catalogKey)?.pattern : undefined) ?? itemByName(e.name)?.pattern ?? '';

  const progressions = useMemo(() => {
    const out = new Map<number, Progression>();
    if (!session || !liftHistory) return out;
    session.exercises.forEach((e, i) => {
      const first = e.sets[0];
      if (e.kind === 'cardio' || !first || first.toFailure || first.targetSec != null || first.targetReps < 1) return;
      /* Absent means the read has not landed (or this lift was not asked about) — as opposed to an entry
         with no sessions in it, which means "never done it" and is a real answer the engine handles. */
      const hist = liftHistory.get(liftId(e));
      if (!hist) return;
      out.set(
        i,
        progressionFor({
          exerciseName: e.name,
          pattern: patternOf(e),
          experience,
          /* Read off the SETS, not off the original prescription — by now the athlete may have added or
             removed some, and `goalTextFor` right beside it reads them for the same reason. */
          prescription: { sets: e.sets.length, reps: first.targetReps, repsMax: first.targetRepsMax ?? null },
          history: hist.sessions,
          /* Without this the increment cannot know a dumbbell rack has nothing between 45 and 50, and a
             cable stack does have a 2.5 lb pin. */
          equipment: equipmentForCatalogKey(e.catalogKey),
        }),
      );
    });
    return out;
  }, [session, liftHistory, experience]);

  /**
   * What the weight box opens showing, when the athlete has not put a number in this set yet.
   *
   * ⚠ THIS SEEDS THE INPUT, NOT THE SET. `set.weight` stays null until they log, and that distinction is
   * load-bearing: a weight written onto an untouched set records a lift nobody made and can announce a
   * personal record for it (see `session-core`). The row keeps reading "—"; only the box is pre-filled.
   *
   * The order is `Active-Workout-Flow-Spec-W9-W16` §6.3 with the coach inserted at 2 (W9-Amendment-005,
   * D-1): §6.3 says "most recently logged weight", and the coach's answer *is* that number plus a
   * decision. Last time's number is still there underneath, at 3, for every lift the coach has no call on.
   *
   * Every figure is used as stored, unconverted, for the reason set out on `wxr` below — the athlete
   * reads back the number they typed.
   */
  const prefillWeight = (exI: number, setI: number): string => {
    const e = session?.exercises[exI];
    if (!e) return '';

    // 1 · what they are already lifting today, which outranks anything history has to say
    const earlier = e.sets.slice(0, setI).reverse().find((s) => s.weight != null);
    if (earlier?.weight != null) return String(earlier.weight);

    // 2 · the coach's number
    const p = progressions.get(exI);
    if (p?.suggestedWeight != null) return String(p.suggestedWeight);

    // 3 · what they did at this position last time
    const prev = liftHistory?.get(liftId(e))?.sessions[0]?.sets[setI];
    if (prev?.weight != null) return String(prev.weight);

    // 4 · the prescription, for percentage-of-max programs. Already in display units.
    return e.sets[setI]?.targetWeight != null ? String(e.sets[setI].targetWeight) : '';
  };

  const openSheet = (exI: number, setI: number, focus: 'weight' | 'reps') => {
    const set = session?.exercises[exI]?.sets[setI];
    if (!set) return;
    /* Seeded from what is THERE, and from what they did last time when there is nothing there. A set
       already carrying 135 lb opens showing 135, so confirming without touching anything keeps 135 — the
       behaviour the wheel only appeared to have. */
    setDraftW(set.weight != null ? String(set.weight) : prefillWeight(exI, setI));
    setDraftR(set.actualReps != null ? String(set.actualReps) : set.toFailure ? '' : String(set.targetReps));
    /* Synchronously, INSIDE the tap — see `primerRef`. Must happen before the setState below, because
       React may process the update and return control to the browser first. */
    if (!wheelMode) primerRef.current?.focus();
    setSheet({ exIdx: exI, setIdx: setI, focus });
  };

  /**
   * RAISE THE KEYBOARD ON THE TAP THAT ASKED FOR IT.
   *
   * Tapping a weight or reps cell opened the sheet with that field HIGHLIGHTED and nothing focused,
   * so logging a set cost a second tap on the input the athlete had already pointed at. The field's
   * `selectTextOnFocus` was set the whole time and never fired, because focus never happened.
   *
   * Depends on the sheet's PRIMITIVES, not the object. `SetField.onFocus` writes a fresh sheet object
   * on the focus event this effect causes; depending on identity would refocus an already-focused
   * input and re-run its selection out from under a typing thumb.
   *
   * Wheel mode is excluded deliberately — there is no TextInput to focus, and a keyboard rising under
   * the wheel is the opposite of what choosing the wheel asked for.
   *
   * ══ THIS EFFECT ALONE IS NOT ENOUGH ON WEB, AND THAT IS WHY THE PRIMER EXISTS ══
   *
   * A browser opens the software keyboard only for a `focus()` issued INSIDE the user-gesture call
   * stack. Anything deferred — a frame, a timeout, an effect after a state commit — moves the call
   * outside that stack, and iOS Safari then focuses the element and silently declines to show a
   * keyboard. The previous fix deferred by one `requestAnimationFrame`, which is precisely the
   * disqualifying step, and it passed review because native RN has no such rule.
   *
   * The field itself cannot be focused from the tap: the sheet is not mounted yet at that moment.
   * So `primerRef` — a permanently-mounted, invisible input — takes focus synchronously during the
   * gesture and opens the keyboard, and this effect then MOVES focus to the real field once it
   * mounts. Moving focus between inputs while a keyboard is already up needs no gesture, which is
   * the property the whole arrangement rests on.
   */
  const sheetOpen = sheet != null;
  const sheetFocus = sheet?.focus ?? null;
  const sheetExI = sheet?.exIdx ?? -1;
  const sheetSetI = sheet?.setIdx ?? -1;
  useEffect(() => {
    if (!sheetOpen || wheelMode) return;
    const target = sheetFocus === 'weight' ? weightInputRef : repsInputRef;
    /* Try immediately — when the sheet is already open and the athlete taps the OTHER field, the node
       exists and this hands over in the same commit with no visible switch. The frame is the fallback
       for the mounting case. Both are cheap, and focusing an already-focused input is a no-op. */
    target.current?.focus();
    const frame = requestAnimationFrame(() => target.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [sheetOpen, sheetFocus, sheetExI, sheetSetI, wheelMode]);

  /* Let the keyboard go when the sheet does. Without this the primer can hold focus after a Cancel and
     leave a keyboard up over a screen with nothing to type into. */
  useEffect(() => {
    if (sheetOpen) return;
    primerRef.current?.blur();
  }, [sheetOpen]);

  /** Parse a draft field. '' is "nothing entered" and stays null; garbage keeps whatever was there. */
  const readDraft = (raw: string, prev: number | null, max: number, round: boolean): number | null => {
    const t = raw.trim();
    if (t === '') return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) return prev;
    return Math.min(max, round ? Math.round(n) : n);
  };

  /**
   * Log the set: write both numbers, then complete it.
   *
   * Two taps became one. The sheet used to write a value and leave the set open, so every logged set
   * needed a separate tap on a green check the athlete had no reason to expect — "I pressed Set, why is
   * it not set?" A set that is ALREADY done is only edited: no re-completion, no second rest timer, no
   * PR toast for a record it already announced.
   */
  const commitSheet = () => {
    if (!sheet || !session) return;
    const { exIdx: ei, setIdx: si } = sheet;
    const set = session.exercises[ei]?.sets[si];
    if (!set) {
      setSheet(null);
      return;
    }
    const weight = readDraft(draftW, set.weight, 500, false);
    const reps = readDraft(draftR, set.actualReps, REPS_MAX, true);
    const base = patchSet(session, ei, si, (s) => ({ ...s, weight, actualReps: reps }));

    const token = nextAnimationToken();
    setPop({ ei, si, field: sheet.focus, token }); // value-pop on the edited cell
    setTimeout(() => setPop((p) => (p && p.token === token ? null : p)), 340);
    setSheet(null);

    // Only the CURRENT set completes. Editing a done set, or pre-filling a later one, just writes.
    const currentIdx = session.exercises[ei].sets.findIndex((s) => !s.done);
    if (!set.done && si === currentIdx) completeSet(ei, si, base);
    else setSession(base);
  };

  /* Written out rather than folded into the updater: a state updater must stay pure (StrictMode calls
     it twice), and this one persists. Same shape as `toggleRest`. */
  const toggleWheel = () => {
    const next = !wheelMode;
    setWheelMode(next);
    void setWheelInput(next);
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
      /*
       * WHO WAS THERE — re-derived at the last possible moment, for two reasons.
       *
       * An accept can land WHILE you are training: the start-time pass could not have seen it, and the
       * athlete never saw it either, so there is nothing of theirs to overwrite. And a session RESUMED
       * from autosave never ran that pass at all. Both are covered by asking again here, over a window
       * that reaches back from when this session actually started.
       *
       * `partnerIdsDeclined` is what keeps the second pass honest — anyone taken off stays off.
       */
      const { fromMs: since, toMs } = creditWindowFor(session.startedAt);
      const accepted: AcceptedTraining[] = await fetchAcceptedTrainingCredits(new Date(since).toISOString());
      const credits = creditsInWindow(accepted, { fromMs: since, toMs });
      const creditedIds = mergePartnerCredits(taggedPartners, credits, session.partnerIdsDeclined ?? []);
      /* Names from the live roster first, the accepted invite as the fallback. It used to be the roster
         alone, and `training_partners()` returns `[]` on ANY failure by design — so one dropped read at
         Finish silently cost the tag on a workout that saved perfectly. */
      const partnerNames = resolvePartnerNames(creditedIds, partners ?? [], credits);
      /* A reopened workout is APPENDED to, never saved again. `saveWorkout` writes the chapter
         counter, the program slot and an honor pass — running it twice for one session would count a
         single workout as two on the Legacy screen and claim a second slot in the program. */
      /*
       * WHAT HOLT DECIDED ABOUT EACH LIFT — captured here because it cannot be recomputed later.
       *
       * `progressionFor`'s verdict depends on the PRESCRIPTION in force (sets, reps, top of range) and a
       * saved workout stores none of it: eight reps is "topped the range" against 3×8 and "short of it"
       * against 3×12. The map was built when the screen loaded, against the history the athlete was
       * actually shown; re-deriving it at save time could disagree with what they read.
       *
       * ⚠ NOT SENT ON A CONTINUE. `continueWorkout` appends to a session already saved, and its
       * decisions were recorded the first time round — writing them again would double the record of a
       * single week's training.
       */
      const signals = [...progressions.entries()].map(([i, p]) => ({
        position: session.exercises[i]?.position ?? i,
        action: p.action,
        catalog_key: session.exercises[i]?.catalogKey ?? null,
        pattern: patternOf(session.exercises[i]),
      }));
      const workoutId = session.continuingWorkoutId
        /* ⚠ `units` TRAVELS WITH THE SESSION. The athlete types in their own system; storage is
           canonical pounds. Omit it and a metric athlete's kilos go into the database labelled lb — the
           defect `canonicalizeWeights` exists to close. Imperial is the identity, so this is a no-op for
           everyone today and correct the moment somebody chooses Kgs. */
        ? (await continueWorkout(session.continuingWorkoutId, session, units), session.continuingWorkoutId)
        : (await saveWorkout(session, partnerNames, signals, units)).workoutId;
      await clearSession();
      /* One more session in the book — the tutorial's phases are counted in workouts, and this is the
         only place a workout becomes one. A no-op until the count has been seeded from the server, so it
         can never invent a "1" for a veteran on a new phone. */
      void bumpWorkoutsLogged();
      finishWorkout();
      router.replace({ pathname: '/workout-complete', params: { id: workoutId } });
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
  /**
   * Watch for someone asking to join, while a session is actually running.
   *
   * ══ WHY POLLING, AND WHY TWENTY SECONDS ══
   *
   * There is no realtime transport anywhere in this app, and building one for a banner would be a
   * subsystem to serve an event that happens rarely. Twenty seconds fits inside a rest interval, so the
   * ask lands within one break of being made, and it costs a single indexed row read
   * (`workout_invites_to_kind`) per poll.
   *
   * ⚠ ONLY WHILE `phase === 'active'`. Not on the resume prompt, not on the empty state, and not after
   * finishing — a request to join a workout that has ended is not answerable, which is the same rule the
   * union's own presence ceiling enforces server-side.
   *
   * Failure is silent by design: `fetchPendingJoinRequests` returns `[]` rather than throwing, because a
   * banner that cannot appear is a missing feature and an error toast every twenty seconds during a
   * workout is a broken app.
   */
  useEffect(() => {
    if (phase !== 'active') return;
    let live = true;
    const tick = () => {
      fetchPendingJoinRequests().then((rows) => {
        if (live) setJoinRequests(rows);
      });
    };
    const timer = setInterval(tick, 20_000);
    tick();
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [phase]);

  /**
   * Yes or no, from inside the session.
   *
   * Accepting snapshots the live shape and the live position onto the row — the same thing
   * `/workout-invite` does for a host who answers from the inbox, and deliberately the same code path
   * shape, so the two cannot drift about what "where I am" means.
   */
  const answerJoin = async (req: PendingJoinRequest, yes: boolean) => {
    if (joinBusy || !session) return;
    setJoinBusy(true);
    try {
      if (!yes) {
        // Deleting, not flagging — nothing anywhere records that someone said no (0092).
        await declineWorkoutInvite(req.id);
        showToast('Not this time');
      } else {
        const shape = sessionToTemplateExercises(session.exercises);
        if (shape.length === 0) {
          showToast('Add an exercise first — there’s nothing to share yet.');
          return;
        }
        const at = Math.min(Math.max(0, session.exerciseIndex ?? 0), session.exercises.length - 1);
        // Counted over the SNAPSHOT, which drops cardio blocks — see the same note in `/workout-invite`.
        const startIndex = Math.min(sessionToTemplateExercises(session.exercises.slice(0, at)).length, shape.length - 1);
        await acceptJoinRequest(req.id, { workoutName: session.workoutName, exercises: shape, startIndex });
        if (!taggedPartners.includes(req.fromId) && taggedPartners.length < 3) {
          mutate((s) => ({ ...s, partnerIds: [...(s.partnerIds ?? []), req.fromId] }));
        }
        showToast(`${req.fromName} is joining at ${shape[startIndex]?.name ?? 'your workout'}`);
      }
      setJoinRequests((cur) => cur.filter((r) => r.id !== req.id));
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setJoinBusy(false);
    }
  };

  /**
   * Ask someone to come and join this session.
   *
   * Carries the live shape AND `startIndex`, so what they receive is "join me here", not "do this
   * workout too" — the distinction the ⋯ row used to claim without delivering. They are pre-tagged as a
   * partner on the way out, exactly as accepting a join request tags the asker: the credit is symmetric
   * whichever direction the ask went.
   */
  const inviteToJoin = async (toId: string, toName: string) => {
    if (joinBusy || !session) return;
    setJoinBusy(true);
    try {
      const shape = sessionToTemplateExercises(session.exercises);
      if (shape.length === 0) {
        showToast('Add an exercise first — there’s nothing to share yet.');
        return;
      }
      const at = Math.min(Math.max(0, session.exerciseIndex ?? 0), session.exercises.length - 1);
      const startIndex = Math.min(sessionToTemplateExercises(session.exercises.slice(0, at)).length, shape.length - 1);
      await inviteToLiveSession({ toId, workoutName: session.workoutName, exercises: shape, startIndex });
      if (!taggedPartners.includes(toId) && taggedPartners.length < 3) {
        mutate((s) => ({ ...s, partnerIds: [...(s.partnerIds ?? []), toId] }));
      }
      setInvitePickerOpen(false);
      showToast(`Asked ${toName} to join`);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setJoinBusy(false);
    }
  };

  /*
   * ⚠ REMOVING A TAG HAS TO BE REMEMBERED, not just applied.
   *
   * Finish re-derives credits from the same accepted invites the session start used (an accept can
   * arrive mid-workout), so a plain removal would be undone on the way out — the app writing a name the
   * athlete had explicitly taken off. Re-adding clears the refusal, so the list only ever holds a "no"
   * that is still current.
   */
  const togglePartner = (id: string) => {
    if (taggedPartners.includes(id))
      mutate((s) => ({
        ...s,
        partnerIds: (s.partnerIds ?? []).filter((x) => x !== id),
        partnerIdsDeclined: [...(s.partnerIdsDeclined ?? []).filter((x) => x !== id), id],
      }));
    else if (taggedPartners.length >= 3) showToast('Up to 3 partners'); // hard cap of 3
    else
      mutate((s) => ({
        ...s,
        partnerIds: [...(s.partnerIds ?? []), id],
        partnerIdsDeclined: (s.partnerIdsDeclined ?? []).filter((x) => x !== id),
      }));
  };

  // ── resume prompt ──
  /*
   * ══ THE CARD IS GONE — `Forge Workout Entry.dc.html`, Resume state ══
   *
   * This was a `Card variant="hero"` floating in a vertically-centred void with left-aligned type inside
   * it. It is now the shared Workout Entry composition: artwork over a bottom-anchored centred column,
   * bronze spent on the CTA alone. See `WorkoutEntry` for what the shell does and what it deliberately
   * leaves out.
   *
   * ⚠ THE SECOND LINE IS SESSION STATE, NOT AN INSTRUCTION. `N sets logged. Resume where you left off?`
   * asked a question the two buttons underneath already ask. §9 replaces it with the facts — the stat
   * line, and `Last: <exercise>` as the entire progress treatment.
   *
   * ⚠ AND THERE IS A THIRD STATE THE DESIGN DOES NOT DRAW. `pendingLaunch` means the athlete picked a
   * DIFFERENT workout while this one was still open, so the dismiss does not end anything — it starts the
   * other one. Labelling that "End workout" would hide the more important half, so that case keeps its
   * shipped copy and says what it does.
   */
  if (phase === 'resume' && resumable) {
    return (
      <Shell>
        <WorkoutEntry
          art={artFor(resumable)}
          eyebrow="WORKOUT IN PROGRESS"
          title={resumable.workoutName}
          titleSize={38}
          line1={sessionStatLine(resumable, resumeAt ?? Date.parse(resumable.startedAt))}
          line2={pendingLaunch ? 'You picked a different workout while this one was open.' : lastLine(resumable)}
          ctaLabel="RESUME WORKOUT"
          onCta={async () => {
            // Resuming abandons the new intent — otherwise it would ambush them later.
            if (pendingLaunch) await clearWorkoutLaunch();
            setPendingLaunch(null);
            setSession(resumable);
            setPhase('active');
          }}
          dismissLabel={pendingLaunch ? 'Discard & start the new one' : 'End workout'}
          onDismiss={async () => {
            await clearSession();
            setResumable(null);
            // Re-enter the mount flow with no saved work in the way, so the parked launch is
            // built by the same branches that would have built it in the first place.
            setPendingLaunch(null);
            setPhase('loading');
            setReloadKey((k) => k + 1);
          }}
        />
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
        <WorkoutEntry
          /* Nothing has been added yet, so the resolver has nothing to classify and lands on its neutral
             default — which is the right art for "no plan". Passed the same context Home passes rather
             than special-cased, per the design's §2. */
          art={artFor(session)}
          eyebrow="FREESTYLE"
          title={session.workoutName}
          titleSize={34}
          line1="Build today’s session as you go."
          line2="Add exercises as you train."
          ctaLabel="ADD EXERCISE"
          ctaPlus
          onCta={() => router.push({ pathname: '/exercise-picker', params: { mode: 'add' } })}
          dismissLabel="Not today"
          onDismiss={async () => {
            // "Not today" discards outright — so BOTH facts end: the autosave and the presence.
            await clearSession();
            abandonWorkout();
            router.replace('/(tabs)');
          }}
        />
      </Shell>
    );
  }

  // ── active ──
  /*
   * WHERE THEY ARE, read off the session rather than held here.
   *
   * ⚠ CLAMPED, and the clamp is load-bearing, not defensive noise. The index is restored from
   * AsyncStorage — possibly written before an exercise was removed, or by a build that had one more in
   * the list — and the very next line indexes `exercises[exIdx]`. It is also clamped for the honest
   * case: finishing the last exercise, then deleting it.
   *
   * Declared here, after the two guards above, because both of them return before there is an
   * `exercises` array worth indexing into.
   */
  const exIdx = Math.min(Math.max(0, session.exerciseIndex ?? 0), session.exercises.length - 1);
  /* Freestyle is the absence of a plan, not a kind of plan — see `ActiveSession.templated`. */
  const templated = !!session.templated;
  const setExIdx = (i: number) => mutate((s) => ({ ...s, exerciseIndex: i }));
  const ex = session.exercises[exIdx];
  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  const setsDone = doneSetCount(session);
  const workoutComplete = hasLoggedSet(session) && session.exercises.every((e) => e.sets.every((s) => s.done));
  const currentSetIdx = ex.sets.findIndex((s) => !s.done); // -1 = all done
  const goalText = goalTextFor(ex.sets);
  /**
   * ⚠ ONLY WHILE A SET IS STILL OPEN. A goal writes to sets that have not been logged (`applyRepGoal`
   * leaves the rest alone, because a logged set was performed against the target it carried), so on a
   * finished exercise every control in the editor would move a number and change nothing on screen. The
   * pencil goes with it — "Add Set" is the honest way back to having a goal to set.
   */
  const goalEditable = ex.kind !== 'cardio' && ex.sets.some((s) => !s.done);
  const goalPanelOpen = goalEditable && goalOpen === exIdx;
  const lastNote = lastNotes[ex.catalogKey ?? ex.name] ?? null;
  /*
   * ══ WHAT THEY HAVE ALREADY DONE ON THIS LIFT ══
   *
   * `—` for a lift with no history, never `0`. An absent mark means "never done it", and the whole card
   * has to keep saying that honestly: the first time you meet a movement is a baseline, not a failure.
   *
   * ⚠ CONVERTED, AS OF THE CANONICAL-WEIGHT FIX. This block used to explain at length why these figures
   * were shown RAW: `save-core` stamped `weight_unit: 'lb'` on whatever the athlete typed, so for anyone
   * on metric the stored number was kilos wearing a pounds label, and a lb→kg conversion on the way out
   * would have halved their own logged lift in front of them. Reading it back exactly as typed was the
   * only shape that round-tripped for everyone.
   *
   * `canonicalizeWeights` closed that at the write: storage is genuinely pounds now, which is what every
   * other layer in the project has always claimed. So the reasoning above inverted — showing these raw
   * is what would now be wrong. `wxr` converts.
   *
   * The unit is still left off the figure, as the design has it: the column is a third of the card wide,
   * and the table header just below says which unit this screen is in — and now says it correctly.
   */
  const liftHist = liftHistory?.get(liftId(ex)) ?? null;
  /* ⚠ CONVERTS NOW. These figures come from `personal_records` / `workout_sets`, which hold canonical
     POUNDS since `canonicalizeWeights` — so a metric athlete's own history has to be handed back in
     kilos. Before that fix, storage held whatever was typed, and converting here would have halved a
     metric athlete's logged lift in front of them; showing it raw was the correct workaround for a
     broken write. The write is fixed, so the workaround is now the bug. */
  const wxr = (weight: number, reps: number): string => `${displayWeight(weight, units).value} × ${reps}`;
  const lastPerf = liftHist?.sessions[0] ? sessionPerformance(liftHist.sessions[0]) : null;
  const lastText = lastPerf ? wxr(lastPerf.weight, lastPerf.reps) : '—';
  const bestText = liftHist?.best ? wxr(liftHist.best.weight, liftHist.best.reps) : '—';
  const progression = progressions.get(exIdx) ?? null;
  /*
   * WHAT THE COIN IS SAYING ABOUT THIS EXERCISE.
   *
   * Derived on every render rather than fired as an event, which is what lets the line survive things it
   * has no business being cancelled by: a set resolving and collapsing the hero, the ⋮ sheet opening,
   * moving to the next exercise and back. `holtHidden` can take the mark off screen and the sentence is
   * still there when it returns, because nothing ever "showed" it.
   *
   * `live` is null until Stage 4 lands the mid-set nudge — the slot exists now so the priority rule is
   * written once and tested, rather than being retrofitted around a shipped two-case version.
   */
  /*
   * ⚠ THE HEAVIEST SET ALREADY LOGGED ON THIS LIFT TODAY — what retires a line the athlete has outrun.
   *
   * PO: *"I did one set of 85lbs for ten reps, coach holt said move up the weight to 95lbs... the second
   * set I actually did 165lbs for 8 reps. He still said move up to 95lbs."* Both lines below are written
   * once and neither could expire; `coachLine` now drops a "go up to X" whose X is already behind them.
   *
   * Logged sets only (`done`), and the MAXIMUM rather than the latest: a back-off set after a heavy top
   * set does not make "go to 95" current again.
   */
  const heaviestThisSession = ex.sets.reduce<number | null>(
    (m, s) => (s.done && s.weight != null && (m == null || s.weight > m) ? s.weight : m),
    null,
  );
  const saysRaw = coachLine({
    /* Scoped to the exercise it was said about — a nudge about bench press has nothing to say once the
       athlete is standing at a squat rack, and the coin would otherwise carry it there. */
    live: intraLine?.ei === exIdx ? intraLine.text : null,
    liveUpTo: intraLine?.ei === exIdx ? intraLine.upTo : null,
    progression: progression?.message,
    /* ⚠ ONLY `add_weight` names a weight to REACH. `hold` names the one to stay at and `back_off` the
       one to rebuild from — passing those would retire the line the moment the athlete did the set it
       was asking for, which is the opposite of what it means. */
    progressionUpTo: progression?.action === 'add_weight' ? progression.suggestedWeight : null,
    planCue: ex.coachNote,
    heaviestThisSession,
    /* ⚠ EVERY LOGGED SET, NOT JUST THE ONES CARRYING A WEIGHT. A plank, a carry and a bodyweight row
       all log with `weight` null or 0, and counting only weighted sets would leave their cue on screen
       for the whole exercise — which is the report, on the exercises where it is most obvious. */
    setsDoneThisExercise: ex.sets.filter((s) => s.done).length,
  });
  /*
   * ⚠ THE COACH SPEAKS POUNDS; THE SCREEN SPEAKS THE ATHLETE'S UNIT.
   *
   * Reported by the PO: *"Holt is talking in KG and I have it set to lbs."* Two faults met here. The
   * mid-set line stamped `unitLabel(units)` onto a POUNDS number, so a metric athlete was told to load
   * "86 kg" when the figure was 86 pounds — mislabelled, which is worse than unconverted because it
   * looks right. And the coin never ran through `fmt` at all, so `progressionFor`'s hardcoded " lb"
   * reached a metric athlete untouched.
   *
   * Now every line the coin carries goes through the same converter every other weight string in the
   * app does. It is a no-op for imperial and does the arithmetic for metric, so neither athlete can be
   * shown a number wearing the wrong name.
   */
  /*
   * ══ WHAT HOLT WOULD PUT HERE INSTEAD, AND WHAT TODAY HAS NOT TRAINED ══
   *
   * Derived, not fetched — the relationship graph and the picker catalogue are both bundled data, so
   * this costs no network and cannot fail. Only the home-gym list is read, and only on sheet-open.
   *
   * ⚠ COMPUTED ONLY WHILE THE SHEET IS OPEN. `swapSuggestions` walks the catalogue for the fallback
   * and `addSuggestions` walks it per gap pattern; running that on every render of a screen that
   * re-renders on every tick of a rest timer would be paying for an answer nobody is looking at.
   */
  /*
   * ⚠ NO `useMemo`, AND IT IS NOT AN OVERSIGHT. This block sits BELOW the screen's early returns
   * (`loading`, `resume`, the empty freestyle state), so a hook here would be called conditionally —
   * `react-hooks/rules-of-hooks` rejects it, correctly, and the version of this that shipped with the
   * memo would have changed hook order the first time a session was empty.
   *
   * Plain computation is fine because it is gated on `coachOpen`: nothing walks the catalogue at all
   * until the athlete has tapped the coin, and a filter-and-sort over 721 rows is a fraction of a
   * millisecond against a screen that already re-renders once a second during a rest countdown.
   */
  const sessionKeys = session.exercises.map((e) => e.catalogKey).filter((k): k is string => !!k);
  const sessionNames = session.exercises.map((e) => e.name);
  const swapPicks = coachOpen
    ? swapSuggestions({
        currentKey: ex.catalogKey,
        currentName: ex.name,
        pool: PICKER_DB,
        /* The authored graph, best first. It answers by catalogue id, so a lift added freestyle with
           no key simply has no edges and falls through to the same-pattern fallback. */
        alternativeKeys: ex.catalogKey
          ? exerciseRelationships.getSubstitutionPool(ex.catalogKey).map((r) => r.targetExerciseId)
          : [],
        inSession: sessionKeys,
        owned: ownedGear,
      })
    : null;
  const addPicks = coachOpen
    ? addSuggestions({ sessionKeys, sessionNames, pool: PICKER_DB, owned: ownedGear })
    : null;
  /**
   * Apply one of his suggestions, with no trip through the Picker.
   *
   * ⚠ IT REUSES THE EXACT PATHS THE PICKER'S INBOX TAKES — `swapExercise` and `pickedToExercise`.
   * That is load-bearing rather than tidy: `swapExercise` clears the logged work, re-derives per-side
   * counting, and preserves `prescribedName` so a substitution is still recorded as one (a LOCKED
   * requirement, `Exercise-002` §10.2). A hand-rolled "just change the name and key" here would have
   * looked identical on screen and silently stopped recording what the program actually prescribed.
   */
  const applyPick = (mode: 'swap' | 'add', key: string, name: string) => {
    const item = itemByKey(key);
    if (!item) return; // a suggestion the catalogue cannot resolve is not applied, and says nothing
    const picked: PickedExercise = {
      catalogKey: item.key,
      name: item.name,
      equip: item.equip,
      muscles: item.muscles,
      type: item.cat,
    };
    if (mode === 'swap') {
      mutate((s) => ({ ...s, exercises: s.exercises.map((e, i) => (i === exIdx ? swapExercise(e, picked) : e)) }));
      showToast(`Swapped to ${name}`);
      return;
    }
    /* Appended and NAVIGATED TO. Adding a movement you then have to go and find is half an action —
       the Picker's own add path does the same thing when it drains its inbox. */
    mutate((s) => {
      const next = [...s.exercises, pickedToExercise(picked, s.exercises.length)];
      return { ...s, exercises: next, exerciseIndex: next.length - 1 };
    });
    showToast(`Added ${name}`);
  };

  /*
   * ⚠ THE PLAN CUE SAYS IT IS FOR EVERY SET, AND IT HAS TO SAY SO OUT LOUD.
   *
   * Holt's cue is an ARRIVAL line: `coachLine` retires it once the first set is logged, which is right
   * for "go up to 95 lb" — that sentence is answered by doing it — and reads as a broken coach for
   * "underhand close grip", which is true of set four as much as set one. The PO's call is to keep the
   * retirement and fix the WORDING: he says it once, says it covers the whole exercise, and gets out of
   * the way. The cue itself does not leave with him — it stays in italic under the exercise name and in
   * the ⋯ menu for as long as the athlete is on this lift.
   *
   * Added in the RENDER rather than in `coachLine`, alongside `inUnits` and for the same reason: that
   * function returns the sentence the plan holds, and stitching presentation into it would put this
   * suffix into the unit tests, the chat sheet and anywhere else the line is read.
   *
   * ⚠ AND IT IS ADDED BEFORE THE DISMISS COMPARISON BELOW, which keys on the final text. Suffixing
   * afterwards would mean the athlete closed one string while the next render produced another, and the
   * X would stop working.
   */
  const saysFull = saysRaw
    ? { ...saysRaw, text: saysRaw.source === 'plan' ? `${inUnits(saysRaw.text)} — that holds for every set.` : inUnits(saysRaw.text) }
    : null;
  /* Closed by the athlete, and only while he is still saying the same thing. See `dismissedSay`. */
  const says = saysFull && saysFull.text === dismissedSay ? null : saysFull;
  /* The collapsed strip's `Prev`, indexed to the SAME set position last time — set 3 against last week's
     set 3, not against their best set of the day. `currentSetIdx` is -1 once every set is done, at which
     point there is no next set to compare and the strip says nothing. */
  const prevSet = currentSetIdx >= 0 ? liftHist?.sessions[0]?.sets[currentSetIdx] : undefined;
  const prevText =
    prevSet?.weight != null && prevSet.reps != null ? wxr(prevSet.weight, prevSet.reps) : null;
  /**
   * Every overlay this screen owns, and the bubble hides behind all of them.
   *
   * A floating control is only acceptable while it floats over NOTHING. The set-entry sheet is the one
   * that matters most — a bubble over the number pad, mid-set, is the exact complaint that got the coach
   * pulled off most of the app — but a countdown, a completion seal and a PR moment each own the screen
   * for the same reason: they are the thing the athlete is looking at.
   *
   * ⚠ AN ALLOW-LIST WOULD BE WRONG HERE AND A BLOCK-LIST IS RIGHT, which is the opposite of the call in
   * `CoachBubble`. There, the question is "which of ~40 routes should this appear on" and enumerating the
   * exceptions was proven to miss some. Here it is one screen, the overlays are all declared within forty
   * lines of each other, and a new one that forgets to hide the bubble is a visible bug on the next run —
   * not a silent policy breach on a route nobody re-tested.
   */
  /*
   * ══ THE TWO NUMBERS HOLT OFFERS FOR THIS LIFT ══
   *
   * Lighter is `backOffTo`: a weight from a recent session if there is a genuinely lighter one, else ~10%
   * off rounded to what this equipment can actually load. NOT an increment in reverse — see `backOffTo`
   * for why 5 lb off a 315 squat is not a back-off.
   *
   * Heavier stays the pattern increment, and that asymmetry is the point: going up is double progression,
   * a small step you earn, and going down is a rescue whose size scales with the load.
   */
  /* The weight this lift is being worked at right now — what "heavier" and "lighter" are relative to.
     The next undone set's number first, because that is the one they are about to do; otherwise the last
     set they actually completed, because walking into set 2 the honest answer to "what am I lifting" is
     whatever set 1 was; the prescription last. Null when nothing is known and there is nothing to move. */
  const coachLoad = progression
    ? (ex.sets.find((s) => !s.done && s.weight != null)?.weight ??
       [...ex.sets].reverse().find((s) => s.done && s.weight != null)?.weight ??
       ex.sets.find((s) => !s.done)?.targetWeight ??
       null)
    : null;
  const coachEquip = equipmentForCatalogKey(ex.catalogKey);
  /**
   * ⭐ THE NUMBER HOLT IS RECOMMENDING — which is NOT the same as the number on the bar.
   *
   * ⚠ THIS DISTINCTION WAS MISSED ONCE AND IT CHANGED THE WHOLE SHEET. `coachLoad` above reads what the
   * SET carries (logged, typed, or prescribed). `progression.suggestedWeight` is what the engine says to
   * do next, and until this pass it reached the athlete only as the PLACEHOLDER in the weight field
   * (`placeholderWeight`, rung 2) — a grey hint that vanishes the moment you type, and which nothing
   * ever committed. So Holt could say "go to 50" and the only way to take his advice was to type 50.
   *
   * The card states this number, the pills bracket THIS number, and `onUseWeight` is what finally makes
   * accepting it one tap.
   */
  const coachRec = progression?.suggestedWeight ?? null;
  const coachReps = progression?.suggestedReps ?? null;
  /* What the sheet is talking about. His recommendation when he has one; otherwise the bar as it is. */
  const coachAnchor = coachRec ?? coachLoad;
  const coachLighter =
    coachAnchor != null
      ? backOffTo({
          current: coachAnchor,
          /* Every working weight they have on record for this lift, newest first — `backOffTo` picks the
             closest one that is a real step down and ignores the rest. */
          recent: (liftHist?.sessions ?? []).map((s) => sessionPerformance(s)?.weight).filter((w): w is number => w != null),
          equipment: coachEquip,
        })
      : null;
  /* Null when the lift adds no pounds at all — a band, a bodyweight movement, mobility. Offering
     "too easy" there would name a weight that cannot be put on anything. */
  const coachStepUp = incrementFor(patternOf(ex), experience, coachEquip);
  const coachHeavier = coachAnchor != null && coachStepUp > 0 ? coachAnchor + coachStepUp : null;
  /**
   * The one-tap accept — and `null` is the common answer.
   *
   * ⚠ OFFERED ONLY WHEN IT WOULD DO SOMETHING. If the sets already carry his number there is nothing to
   * apply, and a button that writes the value already present would be the most prominent control in
   * the sheet doing nothing at all. That was the defect caught in the design draft; this is the guard
   * that keeps it caught.
   */
  const coachUseWeight = coachRec != null && coachRec !== coachLoad ? () => setRemainingLoad(coachRec) : null;
  /**
   * The engraved figure in the card — the same nine-family artwork Home's hero draws from, chosen by
   * this lift's movement pattern and equipment.
   *
   * ⚠ RESOLVED THROUGH THE MANIFEST, NEVER BY BUILDING A FILENAME. `manifest.ts` says so in its own
   * header — the canonical keys are underscored (`hip_hinge`) and the files are hyphenated
   * (`hip-hinge.png`), so a call site that concatenated a path would miss on exactly one family and
   * look like a missing asset rather than a bug.
   */
  const coachArt = (() => {
    const fam = familyOfExercise(patternOf(ex), coachEquip ?? '');
    if (!fam) return undefined;
    const path = resolveAsset('exercise_family', fam, athleteProfile?.sex === 'female' ? 'female' : 'male');
    return path ? resolveArtworkSource(path) : undefined;
  })();

  const holtHidden =
    /*
     * ⚠ FREE TIER: HOLT IS NOT RENDERED HERE AT ALL, AND THAT IS THE ENFORCEMENT (M7-D13, MA3-D4).
     *
     * In-workout Holt is Premium — the moment of highest value, recurring every session, and the felt
     * weekly benefit of paying. But it is the ONE cap in Amendment 003 that cannot fire M-7: §12 has
     * always forbidden M-7 during an active workout, that rule is older and locked, and an upsell
     * interrupting a working set is the single worst place in this product to ask for money.
     *
     * So the cap is enforced by suppression rather than by a gate: there is no control, so there is no
     * tap, so there is no modal. The athlete meets this benefit on P-8 and in the Premium comparison,
     * not mid-set.
     *
     * ⚠ MANUAL SUBSTITUTION IS UNAFFECTED AND STAYS FREE (MA3-D5). Nobody is stranded mid-session —
     * what Premium buys is the coach ANSWERING, never the ability to change an exercise.
     *
     * `.ok` and not `!showRetry`: an athlete whose entitlement cannot be read gets the bubble hidden
     * rather than a retry toast, because a toast about subscriptions during a set is the same
     * interruption in a smaller box.
     */
    !inWorkoutHolt.ok ||
    coachOpen ||
    sheet != null ||
    optionsOpen ||
    overviewOpen ||
    endConfirmOpen ||
    wNameOpen ||
    noteOpen != null ||
    ssOpen != null ||
    prPrompt != null ||
    seal != null ||
    restProminent ||
    playlistSheetOpen ||
    partnerSheetOpen ||
    invitePickerOpen ||
    /* A running bout owns the screen the way a rest countdown does — and every action behind the bubble
       is refused mid-bout anyway (`blockedByBout`), so the bubble would open onto a sheet of things that
       all decline. `liveBoutIdx` rather than `boutLive`, which is declared further down. */
    liveBoutIdx != null ||
    /* The join banner occupies this exact band (`joinBannerWrap`, full width at `bottom: 108`). Somebody
       asking to train with you outranks a button that will still be there in ten seconds. */
    joinRequests.length > 0;
  const sheetCable = sheet != null && equipmentForCatalogKey(session.exercises[sheet.exIdx]?.catalogKey) === 'cable';
  const sheetWeightOpts = sheetCable ? WEIGHT_OPTS_CABLE : WEIGHT_OPTS;
  /* Everything the sheet needs to describe itself: which lift, which set of how many, and whether this
     is the set that is next up (only that one completes on Log Set — see `commitSheet`). */
  const sheetEx = sheet ? session.exercises[sheet.exIdx] : null;
  const sheetSet = sheet && sheetEx ? sheetEx.sets[sheet.setIdx] : null;
  const sheetIsCurrent = !!(sheet && sheetEx && sheetSet && !sheetSet.done && sheet.setIdx === sheetEx.sets.findIndex((s) => !s.done));
  const heroExpanded = (heroPref[exIdx] ?? 'expanded') !== 'collapsed'; // expand on arrival unless manually collapsed here
  const setHero = (collapsed: boolean) => {
    setHeroPref((p) => ({ ...p, [exIdx]: collapsed ? 'collapsed' : 'expanded' }));
    setAutoCollapsed((a) => ({ ...a, [exIdx]: true })); // a manual choice also blocks the one-time auto-collapse
  };
  const isCardio = ex.kind === 'cardio';

  /**
   * The block this exercise sits in, if any — its kind, its name, its size and where in it we are.
   *
   * The walk itself now lives in `session-core` with tests around it, because the adjacency rule is
   * load-bearing in three places (here, the superset card, and grouping) and getting it wrong swallows a
   * later block that happens to share an id. Without this the athlete sees three unrelated exercises in a
   * row and no indication that they are one block performed four times — which is most of what a
   * finisher IS, and all of what a superset is.
   */
  const block = blockAt(session.exercises, exIdx);
  const blockPos = block ? exIdx - block.start + 1 : 0;
  const isSuperset = block?.kind === 'superset';
  /* FUSED is the display question; `isSuperset` stays the structural one. The options menu still needs
     to know this is a superset while a member is open — "Break the superset" must not vanish because you
     tapped one of its lifts. */
  const ssFused = isSuperset && ssOpen !== exIdx;
  /* Where the athlete is inside the pairing, scanned ROUND-MAJOR (A1 → B1 → A2 → B2). Null once the
     whole block is logged. `ssRounds` is the LONGEST member's set count, so a 4-set row paired with a
     3-set press still shows four rounds rather than hiding the fourth. */
  const ssNext = block && isSuperset ? nextInSuperset(session.exercises, block) : null;
  const ssRounds = block && isSuperset ? supersetRounds(session.exercises, block) : 0;
  /* What each member is CALLED — "A1", "A2", and "B1"/"B2" for a second superset in the same session.
     Computed for the whole list rather than per row: the letter identifies the BLOCK, which is a fact
     about the session and not about the member. See `supersetLabels`. */
  const ssLabels = supersetLabels(session.exercises);

  /** One more time through — adds a set to every member, so a round is a round on all of them. */
  const addSupersetRound = () => {
    if (!block) return;
    mutate((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => {
        if (i < block.start || i >= block.start + block.count) return e;
        const last = e.sets[e.sets.length - 1];
        return {
          ...e,
          groupRounds: (block.rounds ?? e.sets.length) + 1,
          sets: [...e.sets, { setIndex: e.sets.length, weight: last?.weight ?? null, targetReps: last?.targetReps ?? 8, actualReps: null, done: false }],
        };
      }),
    }));
  };

  /**
   * Pair this lift with the one after it.
   *
   * Adjacent by construction: `blockAt` walks by adjacency, so a pairing whose members sit apart would
   * silently read as two separate one-member blocks. Joining an existing superset extends it rather than
   * starting a rival block beside it.
   */
  const supersetWithNext = () => {
    setOptionsOpen(false);
    if (isLastEx) return;
    const existing = blockAt(session.exercises, exIdx);
    const start = existing?.kind === 'superset' ? existing.start : exIdx;
    const count = existing?.kind === 'superset' ? existing.count + 1 : 2;
    const gid = existing?.kind === 'superset' ? existing.groupId : `ss${Date.now()}`;
    mutate((s) => ({ ...s, exercises: makeSuperset(s.exercises, start, count, gid) }));
    setExIdx(start);
    showToast('Superset — log them back to back.');
  };

  const breakSuperset = () => {
    setOptionsOpen(false);
    mutate((s) => ({ ...s, exercises: breakBlock(s.exercises, exIdx) }));
    showToast('Superset broken.');
  };

  /**
   * ══ CHANGE THE BAR FOR THE SETS THEY HAVE NOT DONE YET ══
   *
   * "That felt heavy" is the most common thing an athlete says mid-exercise and, until now, the app had
   * no answer to it: you could edit each remaining set by hand, one sheet at a time, or carry on with a
   * number you had already decided was wrong.
   *
   * ⚠ ONLY THE UNDONE SETS MOVE. A completed set is a record of something that happened — rewriting its
   * weight would falsify the log, and it is exactly the set the athlete is reacting TO.
   *
   * ⚠ AND IT MOVES `weight`, NOT `targetWeight`. `targetWeight` is what the PROGRAM asked for; a program
   * that prescribed 80% of a max did not stop asking for it because today felt heavy, and overwriting it
   * would erase the prescription the athlete is deviating from. What changes is the number waiting in the
   * box — a proposal, still confirmed set by set, which is the same status the prefill has.
   *
   * Floors at the empty bar rather than going negative: 45 is the lightest a barbell gets, and a
   * suggestion of "-5 lb" is not a suggestion.
   */
  const setRemainingLoad = (to: number) => {
    let touched = 0;
    mutate((s) => {
      const e = s.exercises[exIdx];
      if (!e) return s;
      const sets = e.sets.map((set) => {
        if (set.done) return set;
        touched += 1;
        return { ...set, weight: to };
      });
      return replaceExercise(s, exIdx, { ...e, sets });
    });
    if (touched === 0) return;
    showToast(`${to} ${unitLabel(units)} for your last ${touched} set${touched === 1 ? '' : 's'}.`);
  };

  /** Seconds left on the AMRAP clock, but only while we are still inside the block that started it. */
  const amrapLeft =
    amrap && amrap.groupId === ex.groupId ? Math.max(0, Math.ceil((amrap.endsAt - now) / 1000)) : null;

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
  const saveCardioLog = (r: {
    /** Null for a machine that covers no ground — see the card's `onSave`, and 0151. */
    distanceMi: number | null;
    floors: number | null;
    timeSec: number;
    inclinePct: number | null;
    modality: 'outdoor' | 'indoor';
    source: 'tracked' | 'manual';
    /** The trimmed polyline and the climb (0162). Null unless GPS measured an outdoor bout. */
    route: string | null;
    climbM: number | null;
  }) => {
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
                  floors: r.floors,
                  timeSec: r.timeSec,
                  inclinePct: r.modality === 'indoor' ? r.inclinePct : (e.cardio?.inclinePct ?? null),
                  loggedModality: r.modality,
                  source: r.source,
                  /* Kept on the RESULT as well as on the set, so the card can draw its map after the
                     live track is gone — a resume, a reload, or just paging to another exercise. */
                  route: r.route,
                  climbM: r.climbM,
                },
              },
        ),
      };
      return patchSet(withResult, exIdx, 0, (set) => ({
        ...set,
        done: true,
        durationSec: r.timeSec,
        distanceMi: r.distanceMi,
        /* Its own field the whole way down to the column. Folding it into `distanceMi` here would put
           floors in `workouts.distance`, which every mileage total in the app reads as miles. */
        floors: r.floors,
        inclinePct: r.modality === 'indoor' ? r.inclinePct : null,
        modality: r.modality,
        /* Already trimmed by `routeForStorage` before it reached the card's `onSave` (0162). Nothing
           between here and the column may re-derive it, and nothing may read a distance off it. */
        route: r.route,
        climbM: r.climbM,
        actualReps: null,
      }));
    });
    showToast(`${ex.name} logged`);
  };

  /**
   * Switch where the block is being done. Renames it, and never touches what was already recorded.
   *
   * ══ AND RENAMES THE SESSION, WHEN THE SESSION IS THIS BLOCK ══
   *
   * PO: *"It's logging it as an outdoor walk when it's a treadmill."* The block renamed itself here and
   * the WORKOUT did not. A cardio-only session is named at the door — Home's "Something else today?"
   * calls `startWorkout(deriveName(activity, modality))` and Workouts' Track a Run hard-codes "Outdoor
   * Run" — and the modality toggle lives on the card, one screen later, because nobody decides indoors
   * or outdoors from a menu. So every treadmill walk started that way was filed under "Outdoor Walk":
   * the name in the athlete's history said the one thing about the session that was not true.
   *
   * ⚠ ONLY WHEN THE NAME IS STILL THE DERIVED ONE, and only for a one-block session. `⋯ Options → name
   * this workout` writes `workoutName` too, and a name the athlete typed is theirs — a toggle must
   * never overwrite it. Matching the block's own previous name is the exact test for "nobody has
   * renamed this yet", and it costs nothing when they have.
   */
  const setCardioModality = (m: 'outdoor' | 'indoor') => {
    if (!ex.activity || ex.modality === m) return;
    const activity = ex.activity;
    const was = ex.name;
    const next = deriveName(activity, m);
    mutate((cur) => ({
      ...cur,
      workoutName: cur.exercises.length === 1 && cur.workoutName === was ? next : cur.workoutName,
      exercises: cur.exercises.map((e, i) => (i !== exIdx ? e : { ...e, modality: m, name: next })),
    }));
  };

  /**
   * ══ A BOUT UNDER WAY LOCKS THE SESSION TO IT ══
   *
   * Reported: an athlete started a treadmill walk, never ended it, added strength work and completed
   * that. The finished record showed a walk AND a workout — except the walk was never stopped, so
   * nothing was ever measured. It read as training that happened.
   *
   * The clock lives inside `CardioBlockCard`, so this screen could not see it and every exit stayed
   * open: Next Exercise, Add Exercise, Skip, Replace and Finish. While a bout is open, all of them are
   * closed. The way forward is the card's own end-and-log button, which is one tap away and always
   * visible — so this is a lock, not a trap.
   */
  const boutLive = liveBoutIdx != null;
  const blockedByBout = () => {
    if (!boutLive) return false;
    showToast(`End your ${VERB[session.exercises[liveBoutIdx!]?.activity ?? 'run'].toLowerCase()} first`);
    return true;
  };

  /**
   * When a horizontal swipe must not move the workout.
   *
   * ⚠ ITS OWN LIST, NOT `holtHidden`. That one hides the coin and includes an ENTITLEMENT check
   * (`inWorkoutHolt.ok`) — reusing it here would have made swiping between exercises depend on a
   * subscription read, which is both wrong and the kind of coupling nobody would look for.
   *
   * `ssOpen` is here because an expanded superset member is a drill-down: the way out of it is the
   * "Back to the superset" bar, and swiping sideways out of a view you opened leaves no way back to it.
   */
  const pagerLocked =
    sheet != null ||
    coachOpen ||
    optionsOpen ||
    overviewOpen ||
    endConfirmOpen ||
    wNameOpen ||
    noteOpen != null ||
    ssOpen != null ||
    prPrompt != null ||
    seal != null ||
    playlistSheetOpen ||
    partnerSheetOpen ||
    invitePickerOpen ||
    liveBoutIdx != null;

  const isLastEx = exIdx >= session.exercises.length - 1;
  const primaryLabel = isLastEx ? 'Finish Workout' : 'Next Exercise';
  const goExercise = (idx: number) => {
    /* Moving OUT of the block closes the expansion. Without this, walking away and coming back would
       land you on a member's own card instead of the pairing, which is not where you left off. */
    const target = blockAt(session?.exercises ?? [], idx);
    if (!target || target.kind !== 'superset' || target.start !== block?.start) setSsOpen(null);
    // Guards the dot strip too, which jumps straight here without passing through onPrimary.
    if (idx !== exIdx && blockedByBout()) return;
    /* A goal panel opened by hand belongs to the card it was opened on. Left set, it would spring back
       open the next time the athlete walked past that lift, with no tap to explain it. (The QUEUED ask is
       deliberately not cleared: that one is owed on every added lift, and travels with the card.) */
    if (idx !== exIdx) setGoalOpen(null);
    setExIdx(Math.max(0, Math.min(session.exercises.length - 1, idx)));
    restSkip(); // leaving an exercise ends its rest
  };
  /**
   * A swipe landed on a page. Make it the exercise — or refuse and snap back.
   *
   * ⚠ IT ROUTES THROUGH `goExercise` RATHER THAN `setExIdx`, which is the whole reason this is four
   * lines instead of one. `goExercise` closes a superset expansion, drops a hand-opened goal panel, ends
   * the rest countdown, and — the important one — refuses while a cardio bout is running. Setting the
   * index directly would have quietly reopened the hole `blockedByBout` exists to close: an athlete
   * swiping away from a treadmill bout they never ended, and finishing a workout that records a walk
   * nothing ever measured.
   *
   * ⚠ AND IT SNAPS BACK WHEN REFUSED. `goExercise` returning without moving leaves the pager sitting on
   * a page that is not the exercise — a screen showing one lift while the app believes you are on
   * another. The toast says why; this puts the page back under it.
   */
  const onPagerSettle = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    if (!pageW) return;
    const page = Math.min(Math.max(0, Math.round(e.nativeEvent.contentOffset.x / pageW)), session.exercises.length - 1);
    if (page === exIdx) return; // settled where it started — a cancelled drag, not a move
    goExercise(page);
    if (boutLive) pagerRef.current?.scrollTo({ x: exIdx * pageW, animated: true });
  };
  const onPrimary = () => {
    if (blockedByBout()) return;
    if (isLastEx) {
      if (hasLoggedSet(session)) void finishToSeal();
    } else goExercise(exIdx + 1);
  };
  const primaryDisabled = isLastEx && !hasLoggedSet(session);
  const popCell = (rowSi: number, field: 'weight' | 'reps', node: ReactNode) =>
    pop && pop.ei === exIdx && pop.si === rowSi && pop.field === field ? <Pop key={pop.token}>{node}</Pop> : node;
  /**
   * NAME THE SESSION WHILE IT IS STILL HAPPENING.
   *
   * `Active-Workout-Flow-Spec-W9-W16` §4.2 has listed "workout name edit for free workouts" among the
   * ⋯ Options sheet's contents since it locked, and it was never built — one more amendment-shaped
   * gap of the kind this project keeps rediscovering. A free workout is called "Freestyle Workout"
   * until the athlete says otherwise, and until now they could not.
   *
   * NOTHING IS WRITTEN HERE. The session is local-first until the atomic Finish commit, so this edits
   * `session.workoutName` in memory and autosave carries it; `save_workout` sends it with everything
   * else. Reaching for the database mid-session would create a row that does not exist yet.
   */
  /*
   * ⚠ THIS SCREEN INVENTED THE PRIMER AND THEN DID NOT USE IT HERE.
   *
   * `primerRef` below fixes the Set Input Sheet and is hardcoded to `decimal-pad`, which is right for a
   * weight and wrong for a name — so these two overlays were left on bare `autoFocus` and have had the
   * bug the whole time, three hundred lines from the comment explaining it. The shared
   * `KeyboardPrimer` exists because the type has to be chosen at focus time; this asks for the plain
   * keyboard.
   */
  const openWorkoutName = () => {
    primeKeyboard();
    setOptionsOpen(false);
    setWNameDraft(session?.workoutName ?? '');
    setWNameOpen(true);
  };
  const commitWorkoutName = () => {
    const next = wNameDraft.trim().slice(0, 60);
    // Blank keeps the current name rather than clearing it: mid-session the header would be left
    // empty, and this screen has no fallback to show there. Clearing belongs on W-17, after the
    // session exists and Activity History has an activity type to fall back to.
    if (next) mutate((sess) => ({ ...sess, workoutName: next }));
    setWNameOpen(false);
  };

  const openNote = () => {
    /* Same as `openWorkoutName` above — the note overlay is `{noteOpen != null ? … }`, so its field
       mounts after this commit and its `autoFocus` lands outside the gesture. */
    primeKeyboard();
    setOptionsOpen(false);
    setNoteDraft(session?.exercises[exIdx]?.note ?? '');
    setNoteOpen(exIdx);
  };
  const commitNote = () => {
    const at = noteOpen;
    if (at == null) return;
    const next = noteDraft.trim().slice(0, 280);
    /* ⚠ BLANK CLEARS, unlike the workout name above — and the difference is deliberate. A name has no
       empty state this screen can render, so clearing it there would leave a hole in the header. A note
       has one: no note. Deleting what you wrote has to be possible, or the first typo is permanent. */
    mutate((sess) => ({
      ...sess,
      exercises: sess.exercises.map((e, i) => (i === at ? { ...e, note: next || null } : e)),
    }));
    setNoteOpen(null);
  };

  const openAdd = () => {
    setOptionsOpen(false);
    if (blockedByBout()) return;
    router.push({ pathname: '/exercise-picker', params: { mode: 'add' } });
  };
  const openSwap = () => {
    setOptionsOpen(false);
    if (blockedByBout()) return;
    router.push({ pathname: '/exercise-picker', params: { mode: 'replace', ex: ex.name, targetIdx: String(exIdx) } });
  };
  const skipExercise = () => {
    setOptionsOpen(false);
    if (blockedByBout()) return;
    goExercise(exIdx + 1);
  };
  /**
   * ⋮ → End workout — ASK FIRST.
   *
   * This ended the session on one tap, with no confirmation anywhere in the path, and it is the door
   * an athlete goes through by accident: it sits in a menu they opened to do something else, two rows
   * under "Add an exercise". Finishing is irreversible in a way the other options are not — the seal
   * commits the workout and a committed workout cannot be reopened and added to (EL-D6; a session is a
   * record, and editing belongs to W-17's reflection window).
   *
   * The confirmation states the cost in NUMBERS rather than asking "are you sure": what is unlogged is
   * the thing the athlete is about to lose, and it is the one fact that decides the answer.
   *
   * The primary "Finish Workout" button is deliberately NOT confirmed. It only appears once every set
   * is logged, so there is nothing left to lose — a confirm there would be a tax on the normal path.
   */
  const endFromOptions = () => {
    setOptionsOpen(false);
    if (blockedByBout()) return;
    setEndConfirmOpen(true);
  };
  const confirmEnd = () => {
    setEndConfirmOpen(false);
    void finishToSeal();
  };
  /*
   * Attach what you're training to (Workout-Playlist-Amendment-001 §4).
   *
   * HERE rather than before the workout, deliberately — §4: pre-workout attachment "would add a step to
   * workout initiation, which Forge Legacy keeps as low-friction as possible (W-1 → 'Start Workout' is one
   * tap)." The Options menu is already the place optional extras live.
   *
   * It writes to the SESSION, not to the cloud, because nothing about this workout exists server-side
   * until Finish. `saveWorkout` puts it on the row afterwards; autosave carries it through a crash.
   */
  const openPlaylistSheet = () => {
    setOptionsOpen(false);
    setPlaylistSheetOpen(true);
  };

  return (
    <Shell>
      {/* THE KEYBOARD PRIMER. Invisible, unreachable, and never typed into — its whole job is to be
          mounted BEFORE the tap so `openSheet` has something it can focus inside the gesture, which
          is the only kind of focus a browser will open a keyboard for. `decimal-pad` matches the real
          fields so the keypad does not visibly change type when focus hands over a frame later.
          Never `display: none` — a hidden element cannot take focus, which would defeat the point. */}
      <TextInput
        ref={primerRef}
        style={styles.keyboardPrimer}
        keyboardType="decimal-pad"
        caretHidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        value=""
        onChangeText={noop}
      />
      <AppBar
        title={session.workoutName}
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
              style={({ pressed }) => [styles.overflowBtn, pressed && styles.ctlPressed]}
            >
              <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.2-2h8.2l1.2 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
                <Circle cx={12} cy={13} r={3.2} />
              </Svg>
              {(memories ?? []).length > 0 ? <View style={styles.memoryBadge} /> : null}
            </Pressable>
          <Pressable ref={optionsRef} onPress={() => setOptionsOpen(true)} accessibilityRole="button" accessibilityLabel="Workout options" hitSlop={8} style={({ pressed }) => [styles.overflowBtn, pressed && styles.ctlPressed]}>
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
              <Pressable onPress={() => restAdjust(-15)} accessibilityRole="button" accessibilityLabel="Subtract 15 seconds" hitSlop={6} style={({ pressed }) => [styles.restMiniBtn, pressed && styles.ctlPressed]}>
                <Text style={styles.restMiniText}>−15</Text>
              </Pressable>
              <Pressable onPress={restPauseToggle} accessibilityRole="button" accessibilityLabel={restPaused ? 'Resume rest' : 'Pause rest'} hitSlop={6} style={({ pressed }) => [styles.restMiniRound, pressed && styles.ctlPressed]}>
                <Svg width={13} height={13} viewBox="0 0 24 24" fill={flColor.bronze300}>
                  {restPaused ? <Path d="M8 5v14l11-7z" /> : <Path d="M6 5h4v14H6zM14 5h4v14h-4z" />}
                </Svg>
              </Pressable>
              <Pressable onPress={() => restAdjust(15)} accessibilityRole="button" accessibilityLabel="Add 15 seconds" hitSlop={6} style={({ pressed }) => [styles.restMiniBtn, pressed && styles.ctlPressed]}>
                <Text style={styles.restMiniText}>+15</Text>
              </Pressable>
              <Pressable onPress={restSkip} accessibilityRole="button" accessibilityLabel="Skip rest" hitSlop={6} style={({ pressed }) => [styles.restMiniBtn, pressed && styles.ctlPressed]}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill={flColor.gray400}>
                  <Path d="M5 5l9 7-9 7zM17 5h2v14h-2z" />
                </Svg>
              </Pressable>
            </View>
          ) : (
            /*
              ══ THREE CONTROLS, NOT ONE ══

              This was a single Pressable wrapping a switch. It cannot stay that way once there is a
              third mode: `manual` needs a START that is not the same tap as EDIT DURATION, and burying
              either behind a long-press would make the mode a secret.

              So the chip is now a plain View with three children, each with its own job and its own
              screen-reader name: the leading glyph is ▶ Start on `manual` (and an inert clock
              otherwise), the text block edits the duration (or turns the timer on from `off`), and the
              track on the right steps Off → Auto → Manual.

              ⚠ THE TRACK IS A BUTTON, NOT A SWITCH. `accessibilityRole="switch"` states checked or
              unchecked, and there is no honest value for `manual` in that vocabulary — a screen reader
              would have had to call it "on" and lose the distinction the control exists to make.
            */
            <View style={[styles.restChip, restEnabled ? styles.restChipOn : null]}>
              {restMode === 'manual' ? (
                <Pressable onPress={startRest} accessibilityRole="button" accessibilityLabel="Start rest now" hitSlop={10} style={({ pressed }) => [styles.restStart, pressed && styles.ctlPressed]}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill={flColor.bronze300}>
                    <Path d="M7 4l12 8-12 8z" />
                  </Svg>
                </Pressable>
              ) : (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={restEnabled ? flColor.bronze400 : flColor.gray600} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2.4">
                  <Path d="M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 9v4l2.5 1.5M9 2h6" />
                </Svg>
              )}
              <Pressable
                onPress={() => (restEnabled ? openDuration() : cycleRest())}
                accessibilityRole="button"
                accessibilityLabel={restEnabled ? 'Edit rest duration' : 'Turn rest timer on'}
                style={styles.restChipText}
              >
                <Text style={styles.restChipKicker} numberOfLines={1}>Rest Timer</Text>
                {/* The value carries a mode name now, so on a narrow phone it can reach the label
                    beside it. Clipping one word is right; a second line would push the whole band down
                    and move every control under it. */}
                <Text style={[styles.restChipValue, { color: restEnabled ? flColor.cream100 : flColor.gray600 }]} numberOfLines={1}>{restValueText}</Text>
              </Pressable>
              <Pressable
                onPress={cycleRest}
                accessibilityRole="button"
                accessibilityLabel={`Rest timer ${restMode}. Switch to ${nextRestMode(restMode)}.`}
                hitSlop={8}
                style={[styles.restToggle, restMode === 'off' ? styles.restToggleOff : styles.restToggleOn, REST_KNOB_POS[restMode]]}
              >
                <View style={[styles.restKnob, restEnabled ? styles.restKnobOn : styles.restKnobOff]} />
              </Pressable>
            </View>
          )}
        </View>
        <ProgressBar value={setsDone} max={totalSets || 1} height={6} />
      </TourAnchor>

      {/*
        ══ A REAL PAGER, ONE PAGE PER EXERCISE ══

        PO: *"be able to swipe from exercise to exercise. And then going back. Needs to be smooth."*

        Navigation was arrows, a dot strip and View Plan — all taps, all discrete. This is a horizontal
        `pagingEnabled` ScrollView whose page index IS `exerciseIndex`, so the swipe tracks the finger,
        settles onto a page, and rubber-bands at both ends for free rather than by arithmetic.

        ⚠ ONLY THE CURRENT PAGE RENDERS THE REAL BODY. The exercise card is ~540 lines of JSX over a
        dozen derived values — lift history, progression, hero state, superset state — several of which
        come from hooks that cannot be run per page. Mounting all of them would also put an animated WebP
        demonstration on screen for every lift in the session at once. Neighbours render `ExercisePeek`:
        the same header, the same set line, quiet. It fills in on settle.

        ⚠ THE SETTLE GOES THROUGH `goExercise`, NOT `setExIdx`. That is the function that closes a
        superset expansion, drops a hand-opened goal panel, ends the rest countdown and refuses to move
        during a live cardio bout. Swiping past a running treadmill bout is exactly the hole the bout
        lock was built to close, so the pager snaps back instead.
      */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        /* A sheet, a ceremony or a live bout owns the screen — a swipe underneath one would move the
           workout out from under whatever the athlete is reading. */
        scrollEnabled={!pagerLocked}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPagerSettle}
        onLayout={(e) => setPagerH(e.nativeEvent.layout.height)}
        style={styles.pager}
      >
        {session.exercises.map((pe, pi) => (
          <View key={pi} style={[{ width: pageW }, pagerH > 0 ? { height: pagerH } : null]}>
            {pi !== exIdx ? (
              <ExercisePeek ex={pe} index={pi} total={session.exercises.length} />
            ) : (
            <ScrollView
              ref={tourScroller}
              onScroll={onTourScroll}
              scrollEventThrottle={16}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* The block this exercise belongs to, named above it — an AMRAP announces its clock, a circuit
                  its round count, and both say which of their members you are standing on. */}
              {/* The way back. An expanded member is still part of a pairing, and without this the athlete is
                  looking at a single lift with no sign that the other half exists. */}
              {isSuperset && !ssFused ? (
                <Pressable
                  onPress={() => setSsOpen(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Back to the superset"
                  style={styles.ssBackBar}
                >
                  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M15 18l-6-6 6-6" />
                  </Svg>
                  <Text style={styles.ssBackText}>Back to the superset</Text>
                </Pressable>
              ) : null}

              {block && !isSuperset ? (
                <View style={[styles.blockBanner, block.capSec ? styles.blockBannerAmrap : null]}>
                  <View style={styles.blockBannerHead}>
                    <Text style={styles.blockKicker}>{block.capSec ? 'AMRAP' : 'Circuit'}</Text>
                    {block.capSec ? (
                      <Text style={styles.blockRounds}>{durText(block.capSec)} cap</Text>
                    ) : block.rounds && block.rounds > 1 ? (
                      <Text style={styles.blockRounds}>{block.rounds} rounds</Text>
                    ) : null}
                  </View>
                  <Text style={styles.blockName} numberOfLines={1}>{block.name}</Text>
                  <Text style={styles.blockMeta}>
                    Exercise {blockPos} of {block.count}
                    {block.capSec ? ' · as many rounds as you get' : ''}
                  </Text>
                  {/* The cap, made real. Stating "8m" without a way to run it leaves the athlete timing an
                      AMRAP on their phone's clock while the app watches. */}
                  {block.capSec && ex.groupId ? (
                    <Pressable
                      onPress={() =>
                        amrapLeft != null
                          ? setAmrap(null)
                          : setAmrap({ groupId: ex.groupId as string, endsAt: Date.now() + (block.capSec as number) * 1000 })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={amrapLeft != null ? 'Stop the AMRAP clock' : 'Start the AMRAP clock'}
                      style={[styles.amrapBtn, amrapLeft != null ? styles.amrapBtnOn : null]}
                    >
                      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={amrapLeft != null ? flColor.cream100 : flColor.bronze300} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                        {amrapLeft != null ? <Path d="M7 6h10v12H7z" /> : <Path d="M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 9v4l2.5 1.5M9 2h6" />}
                      </Svg>
                      <Text style={[styles.amrapBtnText, amrapLeft != null ? styles.amrapBtnTextOn : null]}>
                        {amrapLeft != null ? fmtMMSS(amrapLeft) : `Start ${durText(block.capSec)}`}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {/*
                * THE SUPERSET, AS ONE CARD.
                *
                * A superset is not two exercises that happen to be adjacent — it is one thing you do, A then B
                * then A again, resting only at the end of a round. Drawn as separate cards it would need the
                * athlete to page between them between every single set, and the rest timer would fire in the
                * middle of the round, which is the one thing a superset exists to avoid.
                *
                * The whole card is driven by `nextInSuperset`, which scans round-major — so "what do I do now"
                * is answered by the domain, with tests, rather than by the render.
                */}
              {block && ssFused ? (
                <View style={styles.supersetCard}>
                  <View style={styles.supersetHead}>
                    <Text style={styles.blockKicker}>Superset {ssLabels[block.start]?.replace(/\d+$/, '') ?? ''}</Text>
                    <Text style={styles.blockRounds}>
                      {ssNext ? `Round ${ssNext.round + 1} of ${ssRounds}` : `${ssRounds} rounds · complete`}
                    </Text>
                  </View>
                  {Array.from({ length: block.count }, (_, m) => {
                    const mi = block.start + m;
                    const mex = session.exercises[mi];
                    const round = ssNext?.round ?? ssRounds - 1;
                    const mset = mex.sets[round];
                    const isNext = ssNext?.exIdx === mi;
                    return (
                      <View key={mi} style={[styles.ssRow, isNext && styles.ssRowNext]}>
                        <View style={[styles.ssTag, isNext && styles.ssTagNext]}>
                          <Text style={[styles.ssTagText, isNext && styles.ssTagTextNext]}>{ssLabels[mi] ?? `A${m + 1}`}</Text>
                        </View>
                        <View style={styles.ssBody}>
                          <Pressable
                            onPress={() => {
                              goExercise(mi);
                              setSsOpen(mi);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${mex.name} on its own`}
                          >
                            <Text style={styles.ssName} numberOfLines={1}>{mex.name}</Text>
                          </Pressable>
                          {mset ? (
                            <Text style={[styles.ssSet, mset.done && styles.ssSetDone]}>
                              {mset.done
                                ? `${weightText(mset)} × ${actualText(mset)}  ✓`
                                : `Goal ${mset.toFailure ? 'max' : mset.targetSec != null ? durText(mset.targetSec) : `${targetRepsText(mset)} reps`}${mex.per ? ` per ${mex.per}` : ''}`}
                            </Text>
                          ) : (
                            <Text style={styles.ssSetNone}>— no set this round</Text>
                          )}
                        </View>
                        {mset && !mset.done ? (
                          <Pressable
                            onPress={() => openSheet(mi, round, 'weight')}
                            accessibilityRole="button"
                            accessibilityLabel={`Log ${mex.name}, round ${round + 1}`}
                            style={[styles.ssLog, isNext && styles.ssLogNext]}
                          >
                            <Text style={[styles.ssLogText, isNext && styles.ssLogTextNext]}>Log Set</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                  {/* Every round, at a glance — so the card is the whole block and not just the next thing in
                      it. A round is done when no member still owes it. */}
                  <View style={styles.ssRounds}>
                    {Array.from({ length: ssRounds }, (_, r) => {
                      const owed = Array.from({ length: block.count }, (_, m) => session.exercises[block.start + m].sets[r]).filter((s) => s && !s.done).length;
                      const current = ssNext?.round === r;
                      return (
                        <View key={r} style={[styles.ssRoundChip, owed === 0 && styles.ssRoundChipDone, current && styles.ssRoundChipCurrent]}>
                          <Text style={[styles.ssRoundChipText, owed === 0 && styles.ssRoundChipTextDone, current && styles.ssRoundChipTextCurrent]}>{r + 1}</Text>
                        </View>
                      );
                    })}
                    <Pressable onPress={addSupersetRound} accessibilityRole="button" accessibilityLabel="Add a round" style={({ pressed }) => [styles.ssAddRound, pressed && styles.ctlPressed]}>
                      <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round">
                        <Path d="M12 5v14M5 12h14" />
                      </Svg>
                      <Text style={styles.ssAddRoundText}>Round</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.ssFoot}>No rest between them — the timer starts once the round is done.</Text>
                </View>
              ) : null}

              {/* A cardio block replaces the hero as well as the set table. There is no demonstration to play,
                  no How To to read and no per-lift Memories strip for a run — and leaving the lifting hero above
                  it left two headers stacked on one exercise. The block's own card is the whole surface. */}
              {/* In a superset the merged card above IS the surface — the hero names one member and the
                  table logs one member, and both would be arguing with a card whose whole point is that the
                  pairing is a single thing you do. Tapping a member's name in the card opens it on its own. */}
              {isCardio || ssFused ? null : heroExpanded ? (
                <TourAnchor id="workout-hero" style={styles.hero}>
                  <View style={styles.heroRow}>
                    {/* media slot — the exercise's looping demonstration, falling back to the engraved
                        dumbbell for lifts the library doesn't cover (strongman, most mobility). */}
                    <View style={styles.mediaSlot}>
                      <ExerciseLoop
                        exerciseId={ex.catalogKey}
                        fallback={
                          <Svg width={74} height={74} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" opacity={0.14}>
                            <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
                          </Svg>
                        }
                      />
                    </View>
                    {/* meta */}
                    <View style={styles.heroMeta}>
                      {/*
                        ⚠ NOT A CARD, AND DELIBERATELY NOT THE ONE THAT WAS DELETED. `THE PLAN SAYS` used
                        to be a hero card stacked here and was removed in the "cards are for acting inside
                        of" pass — correctly: a cue is information, and information gets a line, not a
                        bordered box you cannot act in. This is that line. It sits under the name, in the
                        same italic cream the ⋯ menu and the builder's own row show it in, and it is drawn
                        in BOTH hero faces (see the collapsed strip below) because the hero auto-collapses
                        the moment the first set resolves — which is exactly when a grip cue is still true.
                      */}
                      <View style={styles.heroTitleRow}>
                        <Text style={styles.heroName}>{ex.name}</Text>
                        <View style={styles.heroActionsTop}>
                          <Pressable onPress={() => setFavorite((v) => !v)} accessibilityRole="button" accessibilityLabel="Save exercise" hitSlop={6} style={({ pressed }) => [styles.heroIconBtn, pressed && styles.ctlPressed]}>
                            <Svg width={19} height={19} viewBox="0 0 24 24" fill={favorite ? flColor.bronze300 : 'none'} stroke={favorite ? flColor.bronze300 : flColor.gray600} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                              <Path d="M6 4h12v17l-6-4-6 4z" />
                            </Svg>
                          </Pressable>
                          <Pressable onPress={() => setHero(true)} accessibilityRole="button" accessibilityLabel="Collapse exercise details" hitSlop={6} style={({ pressed }) => [styles.heroIconBtn, pressed && styles.ctlPressed]}>
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <Path d="M18 15l-6-6-6 6" />
                            </Svg>
                          </Pressable>
                        </View>
                      </View>
                      {ex.coachNote ? <Text style={styles.planCueLine}>{ex.coachNote}</Text> : null}
                      <View style={styles.heroEquipRow}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.6} strokeLinecap="square">
                          <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
                        </Svg>
                        <Text style={styles.heroEquip}>Main lift</Text>
                      </View>
                      <View style={styles.heroTags}>
                        <Pill size="sm">Strength</Pill>
                      </View>
                      {/*
                        735 exercises ship published coaching — setup, execution, cues, common mistakes,
                        breathing, tempo. It is the best beginner asset in the product and it used to open
                        nothing; then it opened the right screen, styled as a footnote.

                        ⚠ LOUD ON A MOVEMENT THEY HAVE NEVER DONE, QUIET EVERYWHERE ELSE. Somebody meeting a
                        lift for the first time has exactly one question — *how do I do this* — and the answer
                        was a 13pt link competing with the weight field. Somebody on their fortieth set of
                        bench does not need it shouted at them, and shouting it at everybody is how a useful
                        affordance becomes furniture nobody reads.

                        `liftHist` is null for a lift with no history — the same fact the card already uses to
                        print `—` where a previous best would go. No new state, no new read.
                      */}
                      <Pressable
                        onPress={() => (ex.catalogKey ? router.push({ pathname: '/exercise/[id]', params: { id: ex.catalogKey } }) : undefined)}
                        accessibilityRole="button"
                        accessibilityLabel={liftHist ? `How to ${ex.name}` : `First time on ${ex.name} — see how it's done`}
                        style={({ pressed }) => [styles.howTo, liftHist ? null : styles.howToFirst, pressed ? styles.howToPressed : null]}
                      >
                        <Svg width={liftHist ? 16 : 18} height={liftHist ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke={liftHist ? flColor.bronze400 : flColor.bronze300} strokeWidth={1.8}>
                          <Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
                          <Path d="M10 8.5l6 3.5-6 3.5z" fill={liftHist ? flColor.bronze400 : flColor.bronze300} stroke="none" />
                        </Svg>
                        <Text style={[styles.howToText, liftHist ? null : styles.howToTextFirst]}>
                          {liftHist ? 'How To' : "First time — here's how"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  {/*
                    ══ WHAT YOU SAID LAST TIME ══

                    The whole reason notes are worth building. A note you can only find by digging through
                    history is a diary; the same note in front of you as you set up for the lift is coaching.
                    Shown only for a DIFFERENT session — repeating back a note you wrote ninety seconds ago
                    would be the app talking to itself.
                  */}
                  {lastNote && !ex.note ? (
                    <View style={styles.lastNote}>
                      <Text style={styles.lastNoteLabel}>LAST TIME</Text>
                      <Text style={styles.lastNoteText}>{lastNote.text}</Text>
                    </View>
                  ) : null}
                  {/*
                    ⚠ `HOLT SAYS` AND `THE PLAN SAYS` USED TO BE TWO CARDS HERE, AND BOTH VANISHED AFTER SET ONE.

                    They were stacked in this hero — the author's cue and `progressionFor`'s sentence — and the
                    hero AUTO-COLLAPSES the first time a set resolves (see `autoCollapsed` in `completeSet`). So
                    the coach spoke before the first rep and then said nothing for the rest of the session,
                    while the medallion in the corner volunteered nothing and only opened a sheet.

                    Both now come out of the coin (`CoachSays`, bottom right), which is the PO's call and the
                    right one: *"whatever the coach says should come from the coach coin."* One object says the
                    thing, points at itself, and is tappable to answer. It also survives the collapse, which is
                    the actual defect. `coachLine` decides which of the three he says — see `domain/coach/coach-says`.
                  */}
                  {/*
                    insight row: Last · Goal · Best

                    Both outer figures were hard-coded em-dashes over data the app already had — Best in
                    particular was fetched on mount, held in state, and read three lines away to decide the PR
                    moment while the column beside it claimed there was nothing to show.

                    An em-dash still means NEVER DONE IT, and it must: a zero here would read as "you lifted
                    nothing", and a zero taken as a prior best would make an athlete's first ever set a record.
                  */}
                  <View style={styles.insightRow}>
                    <View style={styles.insightCol}>
                      <Text style={styles.insightLabel}>Last</Text>
                      <Text style={styles.insightVal}>{lastText}</Text>
                    </View>
                    {/* THE ONE FIGURE HERE THAT IS A DECISION RATHER THAN A RECORD, so it is the one that
                        opens. Last and Best are history and nothing can edit them; the goal is the athlete's
                        own, and until now the only way to change it was to have caught the panel the moment the
                        exercise was added. The pencil says so, in the same bronze the weight cells use. */}
                    <Pressable
                      onPress={() => setGoalOpen(goalPanelOpen ? null : exIdx)}
                      disabled={!goalEditable}
                      accessibilityRole={goalEditable ? 'button' : 'text'}
                      accessibilityState={{ expanded: goalPanelOpen }}
                      accessibilityLabel={goalEditable ? `Goal is ${goalText}. Change it.` : `Goal was ${goalText}`}
                      style={[styles.insightCol, styles.insightMid]}
                    >
                      <Text style={styles.insightGoalLabel}>Goal</Text>
                      <View style={styles.insightGoalRow}>
                        <Text style={styles.insightGoal}>{goalText}</Text>
                        {goalEditable ? (
                          <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}>
                            <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                          </Svg>
                        ) : null}
                      </View>
                    </Pressable>
                    <View style={styles.insightCol}>
                      <Text style={styles.insightLabel}>Best</Text>
                      <Text style={styles.insightVal}>{bestText}</Text>
                    </View>
                  </View>
                </TourAnchor>
              ) : (
                <Pressable onPress={() => setHero(false)} accessibilityRole="button" accessibilityLabel="Expand exercise details" style={({ pressed }) => [styles.heroStrip, pressed && styles.ctlPressed]}>
                  <View style={styles.heroStripThumb}>
                    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.16}>
                      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
                    </Svg>
                  </View>
                  <View style={styles.heroStripText}>
                    <Text style={styles.heroStripName} numberOfLines={1}>{ex.name}</Text>
                    {/* Collapsed, the strip is all the athlete can see of the lift — so it carries what they
                        did at THIS set position last time beside what is being asked now. Omitted rather than
                        drawn as "Prev —": a placeholder in a one-line strip is noise, and the expanded card
                        above already says the honest em-dash. */}
                    <Text style={styles.heroStripMeta}>
                      {prevText ? <>Prev <Text style={styles.heroStripPrev}>{prevText}</Text>{'   '}</> : null}
                      Goal <Text style={styles.heroStripGoal}>{goalText}</Text>
                    </Text>
                    {/* ⚠ THE CUE HAS TO BE HERE, NOT ONLY IN THE EXPANDED FACE. The hero auto-collapses
                        on the first resolved set, so from set two onward this strip is the whole of the
                        lift the athlete can see — and "underhand close grip" is exactly as true then as
                        it was walking up. One line and clipped: the strip is a summary, and the full text
                        is a tap away in the expanded card and in the ⋯ menu. */}
                    {ex.coachNote ? (
                      <Text style={styles.heroStripCue} numberOfLines={1}>
                        {ex.coachNote}
                      </Text>
                    ) : null}
                  </View>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M6 9l6 6 6-6" />
                  </Svg>
                </Pressable>
              )}

              {/*
                * THE GOAL EDITOR — opened from the Goal figure directly above, never on its own.
                *
                * Sits under the hero and over the table on purpose: it changes the Target column a couple of
                * inches below, so the control and what it does are in one glance. Tapping Goal again closes
                * it, which is why it carries no Done button of its own.
                *
                * Not drawn over a FUSED superset, where the merged card replaces the table entirely and "the
                * current exercise" is one of two being alternated — an editor there would point at a column
                * that is not on screen. Tapping a member's name opens that member on its own card.
                */}
              {goalPanelOpen && !ssFused ? (
                <SetGoalPanel exercise={ex} onChange={(next) => mutate((s) => replaceExercise(s, exIdx, next))} />
              ) : null}

              {/* The block stands where the hero AND the table would: same position in the session, entirely
                  different measurement. Sets of reps have nothing to say about three miles. */}
              {isSuperset ? null : isCardio ? (
                <CardioBlockCard
                  exercise={ex}
                  index={exIdx}
                  units={units}
                  onSetModality={setCardioModality}
                  onSave={saveCardioLog}
                  onLiveChange={(live) => setLiveBoutIdx(live ? exIdx : null)}
                />
              ) : (
              <TourAnchor id="workout-sets" style={styles.table}>
                <View style={styles.headRow}>
                  <Text style={[styles.h, styles.cSet]}>Set</Text>
                  <Text style={[styles.h, styles.cTarget]}>Target</Text>
                  <Text style={[styles.h, styles.cWeight]}>Weight ({unitLabel(units)})</Text>
                  <Text style={[styles.h, styles.cActual]}>Actual</Text>
                  <View style={styles.cTrash} />
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
                          {/* Three kinds of ask, and only one of them is a rep count. A to-failure set showing
                              "0 Reps" — which is what the hard-coded label produced — reads as a set with
                              nothing in it, the opposite of what it prescribes. */}
                          {set.toFailure ? (
                            <Text style={[styles.targetText, { color: valColor }]}>F<Text style={styles.repsLabel}> Max</Text></Text>
                          ) : set.targetSec != null ? (
                            <Text style={[styles.targetText, { color: valColor }]}>{durText(set.targetSec)}</Text>
                          ) : (
                            <Text style={[styles.targetText, { color: valColor }]}>{targetRepsText(set)}<Text style={styles.repsLabel}> Reps</Text></Text>
                          )}
                          {/* THE SIDE. "10 Reps" for a split squat is half the prescription wearing the whole
                              prescription's clothes — the athlete has no way to tell it apart from a real
                              thirty-rep day. Shown per row because the row is where they are looking. */}
                          {ex.per ? <Text style={styles.targetPer}>per {ex.per}</Text> : null}
                          {/* The bar a percentage-based program is asking for. Shown UNDER the rep target
                              rather than pre-filled into Weight, because Weight is what the athlete lifted:
                              seeding it would record a lift nobody made and could announce a PR for it. */}
                          {set.targetWeight != null ? (
                            <Text style={styles.targetLoad}>{set.targetWeight} {unitLabel(units)}</Text>
                          ) : null}
                        </View>
                        <Pressable style={({ pressed }) => [styles.cWeight, styles.weightBtn, pressed && styles.cellBtnPressed]} onPress={() => openSheet(exIdx, si, 'weight')} accessibilityRole="button" accessibilityLabel={`Edit weight, set ${si + 1}`}>
                          {popCell(si, 'weight', <Text style={[styles.weightText, { color: valColor }]}>{weightText(set)}</Text>)}
                          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.85}>
                            <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                          </Svg>
                        </Pressable>
                        {/* THE ACTUAL IS EDITABLE, and it now looks it. It was a bare label beside an emphatic
                            weight button carrying a pencil, so the one number the athlete most often has to
                            change read as a printed target. Same bordered cell, same pencil, both states. */}
                        <View style={[styles.cActual, styles.actualCell]}>
                          {isDone ? (
                            <>
                              <Pressable style={({ pressed }) => [styles.actualBtn, pressed && styles.cellBtnPressed]} onPress={() => openSheet(exIdx, si, 'reps')} accessibilityRole="button" accessibilityLabel={`Edit actual reps, set ${si + 1}`}>
                                {popCell(si, 'reps', <Text style={styles.actualDone}>{actualText(set)}</Text>)}
                                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.8}>
                                  <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                                </Svg>
                              </Pressable>
                              <Pressable onPress={() => uncompleteSet(exIdx, si)} accessibilityRole="button" accessibilityLabel={`Mark set ${si + 1} incomplete`} style={({ pressed }) => [styles.checkDoneBtn, pressed && styles.checkDoneBtnPressed]}>
                                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.greenMuted} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                                  <Path d="M20 6L9 17l-5-5" />
                                </Svg>
                              </Pressable>
                            </>
                          ) : isCurrent ? (
                            /* ══ A HOLD GETS A CLOCK, NOT A REPS BOX ══
                               The pencil-and-tick pair asks "how many did you get". For a plank the question
                               is "how long did you last", and until now the app had no way to ask it — the
                               athlete timed themselves on their phone and pressed a check. The timer records
                               what it actually watched, so stopping at forty of a prescribed sixty logs a
                               forty-second set rather than a failure or a lie. */
                            set.targetSec != null ? (
                              <HoldTimer
                                targetSec={set.targetSec}
                                soundOn={soundOn}
                                label={ex.name}
                                onDone={(held) => logHold(exIdx, si, held)}
                              />
                            ) : (
                            <>
                              <Pressable style={({ pressed }) => [styles.actualBtn, styles.actualBtnCurrent, pressed && styles.cellBtnPressed]} onPress={() => openSheet(exIdx, si, 'reps')} accessibilityRole="button" accessibilityLabel={`Edit actual reps, set ${si + 1}`}>
                                {popCell(si, 'reps', <Text style={styles.actualCurrent}>{actualText(set)}</Text>)}
                                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                                  <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                                </Svg>
                              </Pressable>
                              <Pressable onPress={() => completeSet(exIdx, si)} accessibilityRole="button" accessibilityLabel={`Complete set ${si + 1}`} style={({ pressed }) => [styles.checkCurrent, pressed && styles.checkCurrentPressed]}>
                                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                                  <Path d="M20 6L9 17l-5-5" />
                                </Svg>
                              </Pressable>
                            </>
                            )
                          ) : (
                            /* A pending row is tappable too — so you can put set 3's weight in before you get
                               there. It writes only: sets still resolve top-down (see `commitSheet`). */
                            <>
                              <Pressable style={({ pressed }) => [styles.actualBtn, pressed && styles.cellBtnPressed]} onPress={() => openSheet(exIdx, si, 'reps')} accessibilityRole="button" accessibilityLabel={`Pre-fill set ${si + 1}`}>
                                <Text style={styles.actualPending}>{set.actualReps != null ? String(set.actualReps) : '—'}</Text>
                              </Pressable>
                              <View style={styles.checkPending} />
                            </>
                          )}
                        </View>
                        {/* The way a set leaves the table. Small and quiet on purpose — the row's
                            business is the weight and the reps, and a red control at full weight beside
                            every set would out-rank both. It sits in a fixed trailing column so the
                            three data cells keep their widths, and it is absent (not greyed) when this is
                            the only set — see `removeSet`. `hitSlop` gives the 20pt glyph a 44pt target
                            without drawing one. */}
                        <View style={styles.cTrash}>
                          {ex.sets.length > 1 ? (
                            <Pressable
                              onPress={() => removeSet(exIdx, si)}
                              hitSlop={12}
                              accessibilityRole="button"
                              accessibilityLabel={`Remove set ${si + 1}`}
                              style={({ pressed }) => [styles.trashBtn, pressed && styles.trashBtnPressed]}
                            >
                              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.redMuted} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                                <Path d="M4 7h16" />
                                <Path d="M9 7V5h6v2" />
                                <Path d="M6.5 7l1 13h9l1-13" />
                                <Path d="M10 11v6M14 11v6" />
                              </Svg>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                  <TourAnchor id="workout-addset" style={styles.setBtns}>
                    <Pressable onPress={() => addSet(exIdx)} accessibilityRole="button" accessibilityLabel="Add set" style={({ pressed }) => [styles.addSet, pressed && styles.ctlPressed]}>
                      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round">
                        <Path d="M12 5v14M5 12h14" />
                      </Svg>
                      <Text style={styles.addSetText}>Add Set</Text>
                    </Pressable>
                    {/* Full width again. This used to be one of two halves — Add Set / Remove Set, split
                        down the middle by PO decision — until the PO moved removal onto the rows
                        themselves, where the set being removed is the one you are looking at. */}
                  </TourAnchor>
                  {/* Says the one thing the table does not say about itself, and stops saying it the moment
                      it stops being news. Derived from the session rather than a stored "seen" flag — there
                      is nothing to persist, nothing to clear on account switch, and no effect to get wrong. */}
                  {setsDone === 0 ? (
                    <Text style={styles.tableHint}>Tap a weight or a rep count to change it — then Log Set marks it done.</Text>
                  ) : null}

                </View>
              </TourAnchor>
              )}

              {/*
                ══ THE ATHLETE'S OWN NOTE, ON THE CARD ══

                PO: *"there's no place to type and leave a note that's obvious for me."* Correct, and the
                field was not missing — it was **written, saved, read back as LAST TIME, and reachable
                only from the ⋮ sheet**, eleven rows down and below the fold. A control the athlete cannot
                find is a control that does not exist, and this one had the additional problem that its
                OUTPUT is visible (LAST TIME sits on the hero) while its INPUT was not — so the app showed
                you notes with no evident way to have written one.

                ⚠ HERE, NOT INSIDE THE SET TABLE, AND THAT IS THE WHOLE POINT OF THE POSITION. The three
                bodies above are mutually exclusive — a strength table, a `CardioBlockCard`, or nothing at
                all for a superset member — so a row placed inside the table would have appeared on
                exactly one kind of exercise and been missing from a run and from every superset. One
                instance below all three covers each of them.

                ⚠ EXCEPT A FUSED SUPERSET, WHICH IS THE ONE HONEST EXCLUSION. That card draws two
                exercises merged into one, so "a note about this exercise" has no referent — tapping a
                member's name opens it on its own card, and the row is there.

                ⚠ NOT A CARD AND NOT A SECOND DASHED BUTTON. `Add Set` owns the dashed bronze treatment
                just above; repeating it would put two equal-weight targets in a row where only one is
                part of logging. Same quiet row both builders use for the author's cue — so "a note lives
                here" looks the same on all three screens.
              */}
              {ssFused ? null : (
                <Pressable
                  onPress={openNote}
                  accessibilityRole="button"
                  accessibilityLabel={ex.note ? `Edit your note on ${ex.name}` : `Add a note about ${ex.name} for next time`}
                  style={({ pressed }) => [styles.exerciseNoteRow, pressed ? styles.exerciseNotePressed : null]}
                >
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={ex.note ? flColor.bronze400 : flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5" />
                  </Svg>
                  <Text style={[styles.exerciseNoteText, ex.note ? styles.exerciseNoteTextSet : null]} numberOfLines={2}>
                    {ex.note ? ex.note : 'Add a note for next time'}
                  </Text>
                </Pressable>
              )}

              {/* exercise nav dots */}
              <View style={styles.nav}>
                <Pressable disabled={exIdx === 0} onPress={() => goExercise(exIdx - 1)} accessibilityLabel="Previous exercise" style={({ pressed }) => [styles.navArrow, pressed && styles.ctlPressed]}>
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
                <Pressable disabled={isLastEx} onPress={() => goExercise(exIdx + 1)} accessibilityLabel="Next exercise" style={({ pressed }) => [styles.navArrow, pressed && styles.ctlPressed]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={isLastEx ? flColor.charcoal500 : flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M9 6l6 6-6 6" />
                  </Svg>
                </Pressable>
              </View>
              <Pressable onPress={() => setOverviewOpen(true)} accessibilityRole="button" accessibilityLabel="View full workout plan" style={({ pressed }) => [styles.overviewBtn, pressed && styles.ctlPressed]}>
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </Svg>
                <Text style={styles.overviewText}>View Plan · {exIdx + 1} / {session.exercises.length}</Text>
              </Pressable>

              {error ? <Text style={styles.err}>Couldn’t save — {error}. Try again.</Text> : null}
            </ScrollView>
            )}
          </View>
        ))}
      </ScrollView>

      {/* bottom actions */}
      <View style={styles.bottom}>
        {workoutComplete ? (
          <View style={styles.completeNote}>
            <View style={styles.completeDot} />
            <Text style={styles.completeNoteText}>All exercises complete</Text>
          </View>
        ) : null}
        {/*
          * ADD EXERCISE, not a second End Workout.
          *
          * This slot held "End Workout" beside a primary that reads "Finish Workout" on the last
          * exercise — two buttons, side by side, both calling `finishToSeal`. Meanwhile the one thing an
          * athlete mid-session actually reaches for, adding a lift, was three taps deep in the ⋮ menu.
          *
          * Ending is not lost: the primary IS "Finish Workout" once you are on the last exercise, ⋮ still
          * carries "End workout" (now with the §13.2 empty-session guard the footer button never had),
          * and ← Exit still offers Save & Exit.
          */}
        {/*
          * ⚠ THE PRIMARY IS ON THE LEFT, WHICH IS BACKWARDS EVERYWHERE ELSE IN THIS APP, AND IS THE PO'S
          * CALL FROM USING IT: *"during active workout the 'finish workout' and 'add workout' need to
          * swap places"*.
          *
          * The rest of the app puts the primary on the right because that is where a confirm belongs in a
          * dialog you are reading. This row is not that: the athlete is mid-set, looking at the exercise
          * card, and reaches for the footer without reading it — so the button that gets tapped is the one
          * under the thumb, not the one the convention nominates. Advancing happens once per exercise and
          * adding a lift happens rarely, so the frequent action takes the reachable slot.
          *
          * Swapped by REORDERING the two wrappers, not by moving the buttons between them: `primaryWrap`
          * carries `flex: 1.15` and the completion glow, `endWrap` carries `flex: 1`. Swapping the
          * children instead would have moved the emphasis without moving the button, which is the shape of
          * this change that looks identical in a diff and is wrong on screen.
          */}
        <View style={[styles.bottomRow, { paddingBottom: barBottom }]}>
          <View style={[styles.primaryWrap, workoutComplete && styles.primaryGlow]}>
            <Button variant="primary" fullWidth disabled={primaryDisabled} onPress={onPrimary} accessibilityLabel={primaryLabel}>
              {primaryLabel}
            </Button>
          </View>
          {/*
            ⚠ FREESTYLE ONLY. PO: *"when you're in a full templated workout (so not freestyle) we need
            to get rid of the add button at the bottom."*

            The reasoning above still holds for a session you are BUILDING as you train — adding is the
            frequent action and it was three taps deep. It does not hold for a program day, a saved
            template or a Forge session: there the plan is the point, the frequent action is advancing
            through it, and a permanent Add sitting under the thumb invites editing a prescription by
            accident.

            Nothing is lost — ⋯ still carries "Add an exercise", and so does Holt's sheet. With one
            child, `primaryWrap`'s `flex: 1.15` fills the row on its own; no style change is needed to
            make the primary full-width.
          */}
          {templated ? null : (
            <View style={styles.endWrap}>
              <Button variant="secondary" fullWidth onPress={openAdd} accessibilityLabel="Add an exercise">
                Add Exercise
              </Button>
            </View>
          )}
        </View>
      </View>

      {/*
        ══ COACH HOLT, BOTTOM RIGHT ══

        The PO's call, and the reasoning was simply that there is real empty space there and a bubble in
        it stands in front of nothing. The note in `CoachBubble` claiming a live workout "owns the whole
        screen" was a guess about this screen and it was wrong.

        ⚠ MOUNTED HERE, NOT BY ADDING `/workout` TO `CoachBubble`'S ALLOW-LIST — and that is the load-
        bearing part. `CoachBubble` renders OUTSIDE the navigator (`_layout.tsx`), so it cannot see any of
        this screen's local state: the rest overlay, the seal, the PR prompt, the ⋮ sheet, and above all
        the set-entry sheet. Mounted a level up, the bubble would float over the number pad mid-set, which
        is precisely the "it blocks things on screens" complaint that shrank the bubble's reach in the
        first place. Owned by the screen, it can hide behind the screen's own overlays — see `holtHidden`.

        `HOME_SURFACES` is deliberately left alone: it was rewritten INTO an allow-list so it could not
        quietly acquire screens, and `/workout` should not be the exception that restarts that.

        Sits just above the action bar. The toast (`bottom: 100`) shares the band but is CENTRED and
        content-width, so a right-anchored bubble clears it; the join banner is full width and does not,
        which is why it hides the bubble in `holtHidden` rather than being dodged by arithmetic.
      */}
      {/*
        "How did that feel?" — once, on the first set of a movement they have never done.

        ⚠ SHARES `holtHidden`, so it obeys all fourteen conditions the coin does: it never floats over
        the number pad, a ceremony or the seal. A question is more intrusive than a sentence, not less,
        so it cannot be the one thing that ignores those rules. It sits directly above the coin because
        the ANSWER lands there — the athlete's eye does not have to move.
      */}
      {!holtHidden && effortAsk && effortAsk.ei === exIdx ? (
        <View style={[styles.effortAsk, { bottom: 82 + barBottom + 56 }]}>
          <Text style={styles.effortAskText}>How did that feel?</Text>
          <View style={styles.effortRow}>
            {(
              [
                ['easy', 'Easy'],
                ['right', 'About right'],
                ['heavy', 'Too heavy'],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => answerEffort(value as EffortAnswer)}
                accessibilityRole="button"
                accessibilityLabel={`That set felt ${label.toLowerCase()}`}
                style={({ pressed }) => [styles.effortChip, pressed ? styles.effortChipPressed : null]}
              >
                <Text style={styles.effortChipText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {!holtHidden ? (
        /*
         * ⚠ THE LINE IS QUEUED BEHIND `holtHidden`, NOT DROPPED BY IT. The fourteen conditions exist so
         * the mark never floats over the number pad, a ceremony or the seal — but a cue the athlete has
         * not read yet is not stale because a sheet was open. Closing the sheet brings the coach back
         * with the same thing to say, because `coachLine` is derived, not fired.
         */
        <CoachSays
          line={says?.text ?? null}
          onDismiss={says ? () => setDismissedSay(says.text) : undefined}
          onPress={() => {
            setCoachOpen(true);
            /* The home gym, once per session. `undefined` until it lands, which `session-suggest`
               reads as "do not filter" — so the first open offers slightly more rather than nothing,
               which is the right way for a read in flight to fail. */
            if (ownedGear === undefined) {
              void fetchCoachProfile().then(
                (p) => setOwnedGear(p.ownedEquipment),
                () => setOwnedGear(null), // a failed read must not silence him
              );
            }
            /* Read on OPEN. See `proposal` above for why this is not a mount-time fetch. */
            void fetchIntensitySignals().then((signals) => {
              const next = proposeIntensity(signals, coachIntensity);
              setProposal(next);
              /*
               * ⚠ A DOWN APPLIES ITSELF; AN UP WAITS TO BE ACCEPTED. That asymmetry is CL-D3 and it is
               * the whole design: a coach that quietly gets LOUDER leaves the athlete experiencing a
               * pushier app with no name for what changed, while easing off is the direction
               * `progression.ts` already prefers ("the cheaper mistake to make") and asking permission
               * to be gentler is its own small unkindness. The sheet shows the sentence and the undo in
               * the same breath, so nothing here is silent.
               */
              if (next?.autoApply && prefsLoaded) {
                // Silent on success by design (the sheet already said it); NOT silent on failure — the
                // sheet has already told the athlete the level changed.
                persistPref(() => saveAppPrefs({ ...appPrefs, coachIntensity: next.to }), { onOk: () => refetchPrefs() });
              }
            });
          }}
          openLabel="Ask Coach Holt about this exercise"
          /* Rides the bar's height so the coin keeps its distance from it on every phone — the single
             reason the inset was avoided here in the first place. */
          style={[styles.holtWrap, { bottom: 82 + barBottom }]}
        />
      ) : null}
      {coachOpen ? (
        <SessionCoachSheet
          onClose={() => setCoachOpen(false)}
          swapPicks={swapPicks}
          addPicks={addPicks}
          onPick={applyPick}
          exerciseName={ex.name}
          message={progression?.message ?? null}
          /* A sentence, not a label — "You completed 45 lb × 8, 8, 8 last time." reads as the coach
             citing what he saw. The old "Last time: 45 lb × 8, 8, 8" was a field and a value. */
          basis={
            progression?.basis
              ? `You completed ${progression.basis.weight} ${unitLabel(units)} × ${progression.basis.reps.join(', ')} last time.`
              : null
          }
          unit={unitLabel(units)}
          /* The two numbers the sheet offers, decided HERE where the lift, its equipment and its history
             all are — the sheet just draws them. Null on either side means that option is not offered
             rather than offered and useless: no load advice on a run, a plank or a to-failure set, and
             nothing to take off a bar that is already empty. */
          /* The dial, where it gets noticed. `saveAppPrefs` writes the same field `/preferences` writes,
             and `refetch` pushes it back through the provider so the coach's very next line uses it. */
          proposal={proposal}
          onAcceptProposal={() => {
            if (!proposal || !prefsLoaded) return;
            /* ⚠ THE TOAST USED TO FIRE UNCONDITIONALLY. "Pushing harder from here." is a statement about
               what the coach will now do; saying it on a write that never landed makes the app's next
               prescription contradict its own promise. It moves inside the success arm. */
            persistPref(() => saveAppPrefs({ ...appPrefs, coachIntensity: proposal.to }), {
              onOk: () => {
                refetchPrefs();
                showToast(`Pushing harder from here.`);
              },
            });
            setProposal(null);
          }}
          /* The undo. On an UP this just declines the offer (nothing was applied). On a DOWN it puts
             the level back where it was — which is why `from` is carried on the proposal at all. */
          onDismissProposal={() => {
            if (proposal?.autoApply && prefsLoaded) {
              // The undo must be as trustworthy as the thing it undoes.
              persistPref(() => saveAppPrefs({ ...appPrefs, coachIntensity: proposal.from }), {
                onOk: () => {
                  refetchPrefs();
                  showToast('Left it where it was.');
                },
              });
            }
            setProposal(null);
          }}
          intensity={coachIntensity}
          onSetIntensity={(level) => {
            /*
             * ⚠ GUARDED ON `prefsLoaded`, AND THIS IS NOT DEFENSIVE PROGRAMMING — IT IS A DATA-LOSS BUG.
             *
             * `useAppPrefs` serves `APP_PREFS_DEFAULTS` while its fetch is in flight, so spreading it
             * before the read lands writes DEFAULTS over every other preference this athlete has:
             * their units flip to imperial, reduce-motion resets, and — worst — an analytics opt-out is
             * silently cleared, which `ecosystem.test.mjs` calls "the one failure in this file that
             * would make the privacy policy untrue".
             *
             * A chip in a sheet opened two seconds into a workout is exactly the tap that lands first.
             */
            if (!prefsLoaded) return;
            persistPref(() => saveAppPrefs({ ...appPrefs, coachIntensity: level }), { onOk: () => refetchPrefs() });
          }}
          weight={coachAnchor}
          reps={coachReps}
          onUseWeight={coachUseWeight}
          artwork={coachArt}
          lighterTo={coachLighter}
          heavierTo={coachHeavier}
          onSetLoad={setRemainingLoad}
          canSuperset={!isLastEx}
          isSuperset={isSuperset}
          supersetWithName={!isLastEx ? session.exercises[exIdx + 1].name : null}
          onSwap={openSwap}
          onSuperset={supersetWithNext}
          onBreakSuperset={breakSuperset}
          onAdd={openAdd}
          onSkip={skipExercise}
        />
      ) : null}

      {/* prominent rest overlay — floats near the top for ~3s, then demotes to the compact band chip */}
      {restProminent ? (
        <View style={styles.restOverlayWrap} pointerEvents="box-none">
          <View style={styles.restOverlay}>
            <Text style={styles.restOverlayLabel}>Rest</Text>
            <RestRing value={restTotal - restRemaining} max={restTotal} size={112} stroke={6}>
              <Text style={styles.restOverlayTime}>{fmtMMSS(restRemaining)}</Text>
            </RestRing>
            <View style={styles.restOverlayControls}>
              <Pressable onPress={() => restAdjust(-15)} accessibilityRole="button" accessibilityLabel="Subtract 15 seconds" style={({ pressed }) => [styles.restCtlBtn, pressed && styles.ctlPressed]}>
                <Text style={styles.restCtlText}>−15s</Text>
              </Pressable>
              <Pressable onPress={restPauseToggle} accessibilityRole="button" accessibilityLabel={restPaused ? 'Resume rest' : 'Pause rest'} style={({ pressed }) => [styles.restCtlRound, pressed && styles.ctlPressed]}>
                <Svg width={17} height={17} viewBox="0 0 24 24" fill={flColor.bronze300}>
                  {restPaused ? <Path d="M8 5v14l11-7z" /> : <Path d="M6 5h4v14H6zM14 5h4v14h-4z" />}
                </Svg>
              </Pressable>
              <Pressable onPress={() => restAdjust(15)} accessibilityRole="button" accessibilityLabel="Add 15 seconds" style={({ pressed }) => [styles.restCtlBtn, pressed && styles.ctlPressed]}>
                <Text style={styles.restCtlText}>+15s</Text>
              </Pressable>
            </View>
            {/*
              ⚠ TWO DIFFERENT KINDS OF LEAVING, SIDE BY SIDE AND NAMED APART. `Stay` / `Minimise` changes
              what you can SEE; `Skip Rest` ends the rest itself. Collapsing them into one control — or
              letting a tap on the backdrop do either — is how an athlete who only wanted the panel out
              of the way ends up back at the bar early. The pin is the quiet one of the pair.
            */}
            <View style={styles.restOverlayFoot}>
              <Pressable
                onPress={() => setRestPinned((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ selected: restPinned }}
                accessibilityLabel={restPinned ? 'Minimise the rest timer to the header' : 'Keep the rest timer on screen'}
                style={({ pressed }) => [styles.restSkip, pressed && styles.ctlPressed]}
                hitSlop={6}
              >
                <Text style={[styles.restSkipText, restPinned ? styles.restStayOn : null]}>{restPinned ? 'Minimise' : 'Stay'}</Text>
              </Pressable>
              <View style={styles.restFootDot} />
              <Pressable onPress={restSkip} accessibilityRole="button" accessibilityLabel="Skip rest" style={({ pressed }) => [styles.restSkip, pressed && styles.ctlPressed]} hitSlop={6}>
                <Text style={styles.restSkipText}>Skip Rest</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* exercise-complete seal — non-blocking, auto-dismisses (taps pass through to the sets below) */}
      {seal ? (
        <View style={styles.sealWrap} pointerEvents="none">
          <View style={styles.sealCard}>
            <View style={styles.sealMedal}>
              <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={flColor.onBronze} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 6L9 17l-5-5" />
              </Svg>
            </View>
            <Text style={styles.sealKicker}>Exercise Complete</Text>
            <Text style={styles.sealName}>{seal.name}</Text>
            <View style={styles.sealStats}>
              <Text style={styles.sealStatText}>{seal.sets} Sets</Text>
              <View style={styles.sealDot} />
              <Text style={styles.sealStatText}>{fmtNum(seal.volume)} {unitLabel(units)}</Text>
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
              <Svg width={28} height={28} viewBox="0 0 24 24" fill={flColor.onBronze}>
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

      {/*
        * SET INPUT SHEET (W-9 §6.2) — weight and reps together, one Log Set.
        *
        * Typing is the default and the wheel is the opt-in, persisted per athlete. In wheel mode the two
        * fields become selectors for a single wheel below them, so there is one wheel on screen and it
        * always says which number it is turning.
        */}
      {sheet && sheetSet ? (
        /* `paddingBottom` and not `bottom`: the backdrop must keep covering the full screen, including
           the strip behind the keyboard, or a tap that lands there closes nothing. */
        <View style={[styles.pickerWrap, keyboardInset > 0 && { paddingBottom: keyboardInset }]}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setSheet(null)} accessibilityLabel="Close" />
          <View style={styles.picker}>
            <View style={styles.pickerHead}>
              <View style={styles.setSheetTitleWrap}>
                <Text style={styles.pickerTitle} numberOfLines={1}>{sheetEx?.name ?? 'Set'}</Text>
                <Text style={styles.setSheetSub}>
                  Set {sheet.setIdx + 1} of {sheetEx?.sets.length ?? 1}
                  {sheetSet.toFailure ? ' · to failure' : sheetSet.targetSec != null ? ` · goal ${durText(sheetSet.targetSec)}` : ` · goal ${sheetSet.targetReps} reps`}
                  {/* The sheet is where the number gets typed, so it is the last place the side can be
                      stated before it is too late to matter. */}
                  {sheetEx?.per ? ` per ${sheetEx.per}` : ''}
                </Text>
              </View>
              <Pressable onPress={toggleWheel} accessibilityRole="button" accessibilityLabel={wheelMode ? 'Type the values' : 'Use the wheel'} style={({ pressed }) => [styles.pickerToggle, pressed && styles.ctlPressed]}>
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  {wheelMode ? <Path d="M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /> : <Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2" />}
                </Svg>
                <Text style={styles.pickerToggleText}>{wheelMode ? 'Type' : 'Wheel'}</Text>
              </Pressable>
            </View>

            <View style={styles.fieldRow}>
              <SetField
                label={`Weight (${unitLabel(units)})`}
                value={draftW}
                display={draftW === '' ? '—' : draftW === '0' ? 'BW' : draftW}
                active={sheet.focus === 'weight'}
                typing={!wheelMode}
                inputRef={weightInputRef}
                onFocus={() => setSheet({ ...sheet, focus: 'weight' })}
                onChange={(t) => setDraftW(t.replace(/[^0-9.]/g, ''))}
                onSubmit={() => setSheet({ ...sheet, focus: 'reps' })}
              />
              <SetField
                label="Actual Reps"
                value={draftR}
                display={draftR === '' ? '—' : draftR}
                active={sheet.focus === 'reps'}
                typing={!wheelMode}
                inputRef={repsInputRef}
                onFocus={() => setSheet({ ...sheet, focus: 'reps' })}
                onChange={(t) => setDraftR(t.replace(/[^0-9]/g, ''))}
                onSubmit={commitSheet}
              />
            </View>

            {/* BODYWEIGHT IS AN ANSWER. It writes 0, which is a different fact from an empty field —
                one says "nothing on the bar", the other says "I didn't say". The app must not guess. */}
            <Pressable
              onPress={() => setDraftW(draftW === '0' ? '' : '0')}
              accessibilityRole="button"
              accessibilityState={{ selected: draftW === '0' }}
              accessibilityLabel="Bodyweight — no added load"
              style={[styles.bwChip, draftW === '0' && styles.bwChipOn]}
            >
              <Text style={[styles.bwChipText, draftW === '0' && styles.bwChipTextOn]}>BW</Text>
              <Text style={styles.bwChipSub}>Bodyweight — no added load</Text>
            </Pressable>

            {wheelMode ? (
              <WheelPicker
                options={sheet.focus === 'weight' ? sheetWeightOpts : REPS_OPTS}
                value={Number(sheet.focus === 'weight' ? draftW : draftR) || 0}
                unit={sheet.focus === 'weight' ? unitLabel(units) : 'Reps'}
                onChange={(v) => (sheet.focus === 'weight' ? setDraftW(String(v)) : setDraftR(String(v)))}
              />
            ) : null}

            <View style={styles.pickerBtns}>
              <Button variant="primary" fullWidth onPress={commitSheet} accessibilityLabel={sheetIsCurrent ? 'Log set' : 'Save set'}>
                {sheetIsCurrent ? 'Log Set' : 'Save'}
              </Button>
              <Button variant="text" fullWidth onPress={() => setSheet(null)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
          </View>
        </View>
      ) : null}

      {/* Same rule again — mounted in the branch that can open it. `overlay-branch.test.mjs` exists
          because a sheet was once rendered in a branch that could never be reached, so the button set
          state that nothing drew. */}
      {noteOpen != null ? (
        <View style={[styles.pickerWrap, keyboardInset > 0 && { paddingBottom: keyboardInset }]}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setNoteOpen(null)} accessibilityLabel="Close" />
          <View style={styles.picker}>
            <Text style={styles.pickerTitle}>{session.exercises[noteOpen]?.name ?? 'Note'}</Text>
            {/* ⚠ SAYS WHAT THE NOTE IS FOR, which the sheet never did. The note's whole value is that it
                comes back — it is shown as LAST TIME the next time this lift comes round — and an athlete
                who does not know that has no reason to write one. This is also the line that keeps it
                distinct from the plan's cue without naming the distinction: this one is yours, about
                today. */}
            <Text style={styles.noteIntro}>How it went, for next time — you’ll see this when this lift comes round again.</Text>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="Shoulder felt off. Belt on from set 3."
              placeholderTextColor={flColor.gray600}
              style={styles.noteInput}
              accessibilityLabel="Note on this exercise"
              maxLength={280}
              multiline
              autoFocus
              selectionColor={flColor.bronze300}
              underlineColorAndroid="transparent"
            />
            <View style={styles.pickerBtns}>
              <Button variant="primary" fullWidth onPress={commitNote} accessibilityLabel="Save note">
                Save Note
              </Button>
              <Button variant="text" fullWidth onPress={() => setNoteOpen(null)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
          </View>
        </View>
      ) : null}

      {/* Same rule as the End Workout sheet below: mounted in the branch that can open it. The row
          lives in ⋯ Options, which closes first, so this is a sibling of it rather than a child. */}
      {wNameOpen ? (
        <View style={[styles.pickerWrap, keyboardInset > 0 && { paddingBottom: keyboardInset }]}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setWNameOpen(false)} accessibilityLabel="Close" />
          <View style={styles.picker}>
            <Text style={styles.pickerTitle}>Name this workout</Text>
            <TextInput
              value={wNameDraft}
              onChangeText={setWNameDraft}
              placeholder="e.g. Heavy pull"
              placeholderTextColor={flColor.gray600}
              style={styles.wNameInput}
              accessibilityLabel="Workout name"
              maxLength={60}
              autoFocus
              selectTextOnFocus
              selectionColor={flColor.bronze300}
              underlineColorAndroid="transparent"
              returnKeyType="done"
              onSubmitEditing={commitWorkoutName}
            />
            <View style={styles.pickerBtns}>
              <Button variant="primary" fullWidth onPress={commitWorkoutName} accessibilityLabel="Save name">
                Save Name
              </Button>
              <Button variant="text" fullWidth onPress={() => setWNameOpen(false)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
          </View>
        </View>
      ) : null}

      {/* END WORKOUT — mounted in the SAME branch as the ⋮ row that opens it (see
          `overlay-branch.test.mjs`: a sheet declared outside the branch its trigger lives in
          sets state that nothing renders, and the button does nothing at all). */}
      <ConfirmSheet
        open={endConfirmOpen}
        onClose={() => setEndConfirmOpen(false)}
        headline="End this workout?"
        body={
          setsDone === totalSets
            ? `All ${totalSets} ${totalSets === 1 ? 'set is' : 'sets are'} logged. Sealing is final — you can’t add to this workout afterward.`
            : `You’ve logged ${setsDone} of ${totalSets} sets. The rest won’t be recorded, and sealing is final — you can’t add to this workout afterward.`
        }
        confirmLabel="End workout"
        cancelLabel="Keep training"
        onConfirm={confirmEnd}
      />

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
                        {status} · {done}/{total} sets{w != null ? ` · ${w} ${unitLabel(units)}` : ''}
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
          {/*
            ⚠ CAPPED AND SCROLLABLE, like every other sheet on this screen. It was neither, and it was
            the tallest: eleven rows at 68pt each is ~920pt of sheet against an 852pt iPhone 14. Once the
            sheet is taller than the viewport it covers the backdrop completely, and the backdrop is the
            only way out — no X, no cancel row, no back handler, and the AppBar is underneath. Taps on
            the sheet's own background hit the inert `picker` View; RN does not fall through to a sibling
            behind it. So the athlete was sealed in mid-workout with two exits, both destructive: "Skip
            this exercise" and "End workout". `justifyContent: 'flex-end'` sent the overflow off the TOP,
            so the title was chopped off-screen and it read as a broken render rather than a long sheet.
            Invisible on the web preview, where a desktop window leaves backdrop showing.
          */}
          <View style={[styles.picker, styles.optionsSheet]}>
            <Text style={styles.pickerTitle}>Workout Options</Text>
            <ScrollView style={styles.optScroll} contentContainerStyle={styles.optList} showsVerticalScrollIndicator={false}>
              <OptionRow
                onPress={openWorkoutName}
                title="Name this workout"
                sub={session.workoutName}
                icon={<><Path d="M12 20h9" /><Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>}
              />
              {/* THE AUTHOR'S CUE, restated where the athlete goes looking for instructions. Not a
                  row you can press: it belongs to the plan, and the athlete edits their own note
                  directly beneath it rather than overwriting what they were told to do. */}
              {ex.coachNote ? (
                <View style={styles.optRow}>
                  <View style={styles.optIcon}>
                    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v5M12 16h.01" />
                    </Svg>
                  </View>
                  <View style={styles.optText}>
                    <Text style={styles.optTitle}>The plan says</Text>
                    <Text style={styles.coachNoteSub}>{ex.coachNote}</Text>
                  </View>
                </View>
              ) : null}
              {/* The note belongs to the LIFT, not the session — "shoulder felt off" is about this
                  movement and is worth reading the next time you meet it, which is what carry-forward
                  below does with it. The session-level note lives on the finish screen instead. */}
              <OptionRow
                onPress={openNote}
                title={ex.note ? 'Edit your note' : 'Add a note'}
                sub={ex.note ? ex.note : `How ${ex.name} is feeling today`}
                icon={<><Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><Path d="M14 2v6h6M8 13h8M8 17h5" /></>}
              />
              <OptionRow onPress={openAdd} tint title="Add an exercise" sub="Pick another movement for this session" icon={<Path d="M12 5v14M5 12h14" />} />
                      <OptionRow onPress={openSwap} title="Swap this exercise" sub="Pick a different movement" icon={<Path d="M4 7h13l-3-3M20 17H7l3 3" />} />
              {/* Pairing is a decision made ON THE DAY — "I'll do these back to back" — so it lives
                  here rather than only in the builder. Joining extends the block you are already in
                  instead of starting a rival one beside it. */}
              {isSuperset ? (
                <OptionRow
                  onPress={breakSuperset}
                  title="Break the superset"
                  sub="Log these as ordinary exercises again"
                  icon={<Path d="M9 7H6a5 5 0 0 0 0 10h3M15 7h3a5 5 0 0 1 0 10h-3M4 4l16 16" />}
                />
              ) : null}
              {!isLastEx ? (
                <OptionRow
                  onPress={supersetWithNext}
                  title={isSuperset ? 'Add the next exercise to it' : 'Superset with next exercise'}
                  sub={`Alternate with ${session.exercises[exIdx + 1].name} — one rest, at the end of the round`}
                  icon={<Path d="M9 7H6a5 5 0 0 0 0 10h3M15 7h3a5 5 0 0 1 0 10h-3M8 12h8" />}
                />
              ) : null}
              <OptionRow onPress={skipExercise} title="Skip this exercise" sub="Move on to the next one" icon={<Path d="M5 5l9 7-9 7zM18 5v14" />} />
              {/*
                ⚠ THIS WAS ONE ROW CALLED "Invite training partner", SUB-TITLED "They'll do this workout
                too" — AND IT SENT NOTHING. It opened the tagging sheet, which credits somebody already
                standing next to you. The sub-line was a straightforward false claim, and it is the
                closest thing the app had to the feature the PO asked for.
                Split in two: crediting who is here, and actually asking someone to come.
              */}
              <OptionRow
                onPress={() => {
                  setOptionsOpen(false);
                  setPartnerSheetOpen(true);
                }}
                title="Trained with"
                sub={taggedPartners.length ? `${taggedPartners.length} tagged` : 'Credit whoever is here with you'}
                icon={
                  <>
                    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <Circle cx={9} cy={7} r={4} />
                    <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </>
                }
              />
              <OptionRow
                onPress={() => {
                  setOptionsOpen(false);
                  setInvitePickerOpen(true);
                }}
                title="Invite someone to join"
                sub={`They’ll start where you are — ${ex.name}`}
                icon={
                  <>
                    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <Circle cx={9} cy={7} r={4} />
                    <Path d="M19 8v6M22 11h-6" />
                  </>
                }
              />
              {/* §8.5. The sub-line names what's attached, so the row reports the state instead of
                  making you open the sheet to find out. */}
              <OptionRow
                onPress={openPlaylistSheet}
                title={session.playlist ? 'Change the playlist' : 'Attach a playlist'}
                sub={session.playlist ? playlistLabel(session.playlist) : 'Spotify or Apple Music — a link, not a player'}
                icon={
                  <>
                    <Path d="M9 18V5l11-2v13" />
                    <Path d="M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
                  </>
                }
              />
              {/* §13.2 — an empty session cannot be saved. The footer button this replaced carried no
                  such guard, so "End Workout" on a session with nothing logged ran the whole save. */}
              <OptionRow
                onPress={endFromOptions}
                danger
                disabled={!hasLoggedSet(session)}
                title="End workout"
                sub={hasLoggedSet(session) ? 'Finish and save your session' : 'Log at least one set to save'}
                icon={<Rect x={6} y={6} width={12} height={12} rx={1.5} />}
              />
            </ScrollView>
          </View>
        </View>
      ) : null}

      {/* Playlist attach/edit (§8.5) — the same sheet W-17 opens. Mounted only while open so its draft
          fields seed from the session on the way in (see PlaylistSheetProps). Saving mutates the session;
          the commit carries it to the row. */}
      {playlistSheetOpen ? (
        <PlaylistSheet
          initial={session.playlist ?? null}
          onClose={() => setPlaylistSheetOpen(false)}
          onSave={(link) => {
            mutate((s) => ({ ...s, playlist: link }));
            setPlaylistSheetOpen(false);
            showToast(link ? `Playlist attached · ${playlistLabel(link)}` : 'Playlist removed');
          }}
        />
      ) : null}

      {/*
        Invite someone INTO this session (0121) — the other half of the row that used to lie.
        Same roster as the tagging sheet, because it is the same question ("who do you train with") asked
        for a different reason; the difference is that this one sends something.
      */}
      {invitePickerOpen ? (
        <View style={styles.pickerWrap}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setInvitePickerOpen(false)} accessibilityLabel="Close" />
          <Animated.View onLayout={invitePan.onLayout} style={[styles.picker, styles.partnerSheet, invitePan.style]}>
            {/* The grabber grabs — see `useSheetDrag`. */}
            <View style={styles.grabHandleRow} {...invitePan.panHandlers}>
              <View style={styles.grabHandle} />
            </View>
            <View style={styles.partnerHeader}>
              <Text style={styles.partnerHeaderTitle}>Invite to join</Text>
              <Text style={styles.partnerCount}>{ex.name}</Text>
            </View>
            <ScrollView style={styles.partnerScroll} showsVerticalScrollIndicator={false}>
              {(partners ?? []).length === 0 ? (
                <Text style={styles.partnerEmpty}>Add a friend or join a squad, and the people you train alongside show up here.</Text>
              ) : (
                (partners ?? []).map((p) => (
                  <Pressable
                    key={p.id}
                    disabled={joinBusy}
                    onPress={() => void inviteToJoin(p.id, p.name)}
                    accessibilityRole="button"
                    accessibilityLabel={`Invite ${p.name} to join this workout`}
                    style={styles.prow}
                  >
                    <Avatar name={p.name} src={p.avatarUrl ?? undefined} size={38} />
                    <View style={styles.pText}>
                      <Text style={styles.pName}>{p.name}</Text>
                      <Text style={styles.pSub}>{p.squadName ?? (p.handle ? `@${p.handle}` : 'Friend')}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Button variant="secondary" fullWidth onPress={() => setInvitePickerOpen(false)} accessibilityLabel="Done">
              Done
            </Button>
          </Animated.View>
        </View>
      ) : null}

      {/* partner selection sheet (W-20) — opened from ⋮ Invite; tags persist onto the saved workout */}
      {partnerSheetOpen ? (
        <View style={styles.pickerWrap}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setPartnerSheetOpen(false)} accessibilityLabel="Close" />
          <Animated.View onLayout={partnerPan.onLayout} style={[styles.picker, styles.partnerSheet, partnerPan.style]}>
            {/* The grabber grabs — see `useSheetDrag`. */}
            <View style={styles.grabHandleRow} {...partnerPan.panHandlers}>
              <View style={styles.grabHandle} />
            </View>
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
                          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.onBronze} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
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
          </Animated.View>
        </View>
      ) : null}

      {/*
        The ask, where the host is already looking (0121).
        Mounted beside the toast rather than at the bottom of the file, and above the bottom bar so it
        cannot cover the set they are logging. Only the oldest is shown — see `JoinRequestBanner`.
      */}
      {phase === 'active' && joinRequests.length > 0 ? (
        <View style={styles.joinBannerWrap}>
          <JoinRequestBanner
            request={joinRequests[0]}
            busy={joinBusy}
            onAccept={() => void answerJoin(joinRequests[0], true)}
            onDecline={() => void answerJoin(joinRequests[0], false)}
          />
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
  opts: {
    section?: SessionExercise['section'];
    targetMi?: number | null;
    targetPaceSec?: number | null;
    targetSpdMph?: number | null;
    /**
     * ⚠ THIS OPTION DID NOT EXIST, AND ITS ABSENCE SILENTLY UNTIMED EVERY TEMPLATE BOUT.
     *
     * `TemplateExercise.targetDurationSec` has been stored and read back faithfully since cardio blocks
     * were built, and this — the ONE crossing into session shape — had no key to put it in. So "Row for
     * 20 minutes", saved as a template and started again, arrived as an open row with no target at all.
     * The program-day crossing (`template-day-core.ts`) carried it the whole time, which is how the two
     * consumers of one type came to disagree about what it meant.
     */
    targetSec?: number | null;
    modality?: 'outdoor' | 'indoor';
    name?: string;
    coachNote?: string | null;
  } = {},
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
    targetSec: opts.targetSec ?? null,
    cardio: { ...EMPTY_RESULT },
    ...(opts.coachNote ? { coachNote: opts.coachNote } : {}),
    section: opts.section ?? 'main',
    position,
    // The single synthetic set: one run is one unit of progress, and no progress math learns about cardio.
    sets: [{ setIndex: 0, targetReps: 0, weight: null, actualReps: null, done: false, durationSec: null, distanceMi: null }],
  };
}

/**
 * Template rows → session exercises. The ONE crossing, used by both doors into it: a saved template the
 * athlete owns (`templateId`) and a Forge definition trained without being adopted (`starterId`).
 *
 * It was written inline in the `templateId` branch, and "start this Forge session" would have needed a
 * second copy — which is how the sections, the cardio branch and the superset fields drift apart one
 * feature at a time. `StarterTemplateDefinition.exercises` is `TemplateExercise[]` already, so there is
 * nothing to convert; the two callers differ only in where the rows came from.
 */
function templateToSessionExercises(rows: readonly TemplateExercise[]): SessionExercise[] {
  return rows.map((e, i) => {
    // A template that ended in a run comes back as a cardio block, not as sets of it. The modality it
    // was trained in comes back too (0097) — a treadmill session shouldn't silently become a road run
    // the next time you repeat it.
    const act = activityFromKey(e.catalogKey);
    if (e.kind === 'cardio' && act) {
      return cardioExercise(act, i, {
        section: e.section ?? 'main',
        modality: e.modality ?? 'outdoor',
        targetMi: e.targetMi ?? null,
        // The clock the template was saved with. Dropped here until now — see `cardioExercise`'s opts.
        targetSec: e.targetDurationSec ?? null,
        targetPaceSec: null,
        targetSpdMph: null,
        coachNote: e.coachNote ?? null,
      });
    }
    return {
      name: e.name,
      catalogKey: e.catalogKey ?? undefined,
      ...(e.coachNote ? { coachNote: e.coachNote } : {}),
      // The template's own section, not a flat 'main' — warm-up and cool-down survived the round trip
      // as of 0095, and the logger is where that has to show up.
      section: e.section ?? 'main',
      position: i,
      // …and its blocks (0106). Repeating a session you built around a superset must give you the
      // superset back, not two lifts that merely sit next to each other.
      ...(e.groupId
        ? {
            groupId: e.groupId,
            groupName: e.groupName ?? undefined,
            groupKind: e.groupKind ?? 'circuit',
            groupRounds: e.groupRounds ?? undefined,
          }
        : null),
      sets: Array.from({ length: Math.max(1, e.sets) }, (_, si) => ({
        setIndex: si,
        targetReps: e.targetReps || 8,
        weight: null,
        actualReps: null,
        done: false,
      })),
    } satisfies SessionExercise;
  });
}

function pickedToExercise(p: PickedExercise, position: number): SessionExercise {
  // A run picked from the catalog becomes a CARDIO BLOCK, not three sets of eight — the picker returns
  // it like any other exercise, and this is where the two kinds diverge. Added ad hoc, so it carries no
  // target: nothing prescribed it.
  const picked = activityFromKey(p.catalogKey);
  if (picked) return cardioExercise(picked, position, { targetMi: null, targetPaceSec: null, targetSpdMph: null });
  /* Which side it is counted on, derived from the name. This is the add-as-you-go path — nothing
     prescribed this lift, so if it is not worked out here the athlete gets "3 × 8" on a single-arm row
     and does half the work the number implies. */
  const per = perSideFor(p.name);
  /**
   * ══ A PLANK ADDED MID-WORKOUT IS NOT THREE SETS OF EIGHT ══
   *
   * Every ad-hoc add got the same rep shape, because the catalogue had no way to say a movement is
   * measured by the clock. It does now (`PickerItem.unit`), so a hold, a carry or a held stretch is
   * built as a TIMED set — thirty seconds, three of them — and the logger draws it a countdown instead
   * of a reps box.
   *
   * Read from `itemByKey` rather than carried on the inbox payload: the catalogue is the authority on
   * what a movement IS, and threading a copy of it through AsyncStorage would give a stale pick the
   * power to disagree with the catalogue it came from.
   */
  const timed = p.unit ? p.unit === 'time' : p.catalogKey ? itemByKey(p.catalogKey)?.unit === 'time' : false;
  return {
    catalogKey: p.catalogKey,
    name: p.name,
    section: 'main',
    position,
    ...(per ? { per } : {}),
    sets: Array.from({ length: 3 }, (_, s) => ({
      setIndex: s,
      weight: null,
      // Zero, never a plausible-looking rep count — the same rule `session-core` applies to a
      // prescribed hold, and what keeps invented volume out of the record.
      targetReps: timed ? 0 : 8,
      ...(timed ? { targetSec: DEFAULT_HOLD_SEC } : null),
      actualReps: null,
      done: false,
    })),
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
  /* ⚠ RE-DERIVED, not carried over. Swapping a Bulgarian Split Squat for a Back Squat keeps the set
     structure but is emphatically NOT still per-leg, and inheriting the old label would double the
     volume of every set that followed. `null` clears it, which is why this is an explicit assignment
     rather than a spread that only adds. */
  const per = perSideFor(p.name);
  return {
    ...ex,
    catalogKey: p.catalogKey,
    name: p.name,
    per: per ?? undefined,
    /*
     * ⚠ WHAT IT REPLACED, KEPT — required by a LOCKED spec since substitution shipped, and discarded
     * until now. `Exercise-002` §10.2: "both the substitute and the original name are captured at write
     * time and are permanent". There is no `prescribed_*` column in 137 migrations, so the app has been
     * throwing away the most informative thing an athlete does in a session — telling you, by acting,
     * that the movement you gave them was the wrong one. See `Coach-Adaptive-Learning-Amendment-001`.
     *
     * THE FIRST ONE WINS. Swap A→B→C and the athlete was given A; recording B would say the program
     * prescribed something it never did. `??=` in effect, written out because the field is on `ex`.
     */
    prescribedName: ex.prescribedName ?? ex.name,
    prescribedCatalogKey: ex.prescribedName ? ex.prescribedCatalogKey : (ex.catalogKey ?? null),
    sets: ex.sets.map((st) => ({ ...st, weight: null, actualReps: null, done: false })),
  };
}
/**
 * A neighbouring exercise, as seen mid-swipe.
 *
 * ⚠ IT IS A PREVIEW, NOT THE CARD, AND THAT IS A DELIBERATE LIMIT. The real exercise body is ~540
 * lines over a dozen derived values — lift history, progression, hero and superset state — several
 * from hooks that cannot be run once per page. Rendering every exercise for real would also put an
 * animated demonstration on screen for every lift in the session simultaneously.
 *
 * So it shows what is knowable from the session row alone and stays quiet about the rest: position,
 * name, and what the sets ask for. It fills in the moment the page settles.
 */
function ExercisePeek({ ex, index, total }: { ex: SessionExercise; index: number; total: number }) {
  const done = ex.sets.filter((s) => s.done).length;
  const sub =
    ex.kind === 'cardio'
      ? VERB[ex.activity ?? 'run']
      : done > 0
        ? `${done} of ${ex.sets.length} sets logged`
        : `${ex.sets.length} ${ex.sets.length === 1 ? 'set' : 'sets'}`;
  return (
    <View style={styles.peek} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={styles.peekPos}>{index + 1} / {total}</Text>
      <Text style={styles.peekName} numberOfLines={2}>{ex.name}</Text>
      <Text style={styles.peekSub}>{sub}</Text>
      <View style={styles.peekRule} />
    </View>
  );
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

/**
 * One number in the Set Input Sheet.
 *
 * In TYPING mode it is a real input with the numeric keypad. In WHEEL mode it becomes a selector: the
 * value is read-only text and tapping it points the single wheel below at this field — one wheel on
 * screen, always labelled with what it is turning, rather than two wheels competing for the thumb.
 */
function SetField({
  label,
  value,
  display,
  active,
  typing,
  inputRef,
  onFocus,
  onChange,
  onSubmit,
}: {
  label: string;
  value: string;
  display: string;
  active: boolean;
  typing: boolean;
  /** Held by the screen so opening the sheet can focus the field the athlete tapped. */
  inputRef?: RefObject<TextInput | null>;
  onFocus: () => void;
  onChange: (t: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Pressable onPress={onFocus} accessibilityRole="button" accessibilityLabel={label} style={[styles.field, active && styles.fieldActive]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {typing ? (
        /* The focus affordance on this field is the BRONZE BORDER on the wrapper above (`fieldActive`).
           The platform draws its own on top of that and does not ask: react-native-web's TextInput
           reset covers appearance, border, font and padding but NOT `outline`, so the browser paints a
           blue focus ring; Android draws the theme-accent EditText underline for the same reason.
           Both are suppressed here, and the app's own bronze remains the only focus signal. */
        <TextInput
          ref={inputRef}
          style={styles.fieldInput}
          value={value}
          onChangeText={onChange}
          onFocus={onFocus}
          placeholder="—"
          placeholderTextColor={flColor.gray600}
          keyboardType="decimal-pad"
          returnKeyType="next"
          selectTextOnFocus
          selectionColor={flColor.bronze300}
          underlineColorAndroid="transparent"
          onSubmitEditing={onSubmit}
          accessibilityLabel={label}
        />
      ) : (
        <Text style={[styles.fieldValue, display === '—' && styles.fieldValueEmpty]}>{display}</Text>
      )}
    </Pressable>
  );
}

function OptionRow({ onPress, title, sub, icon, tint, danger, disabled }: { onPress: () => void; title: string; sub: string; icon: ReactNode; tint?: boolean; danger?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.optRow, tint && styles.optRowTint, danger && styles.optRowDanger, disabled && styles.optRowDisabled]}
    >
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
  /*
   * START ON MEASURE, NOT ON MOUNT.
   *
   * The SVG cannot be drawn until `onLayout` reports the row's size, so mounting kicked off a 1200 ms
   * animation over a subtree that rendered `null` for its first frames. The fuse then appeared
   * part-drawn — a stripe materialising halfway round the box instead of starting from the corner.
   * Gating on `d` costs nothing and makes the celebration begin where it looks like it begins.
   */
  useEffect(() => {
    if (!d) return;
    Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
  }, [anim, d]);
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
  /* The pager fills the space between the progress band and the action bar; each page is exactly one
     screen wide, which is what makes `pagingEnabled` snap to an exercise rather than to a fraction. */
  pager: { flex: 1 },
  peek: { flex: 1, paddingHorizontal: SCREEN_GUTTER, paddingTop: 18, gap: 10, opacity: 0.55 },
  peekPos: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
  peekName: { fontSize: 21, fontWeight: '600', color: flColor.cream100 },
  peekSub: { fontSize: 12.5, color: flColor.gray400 },
  peekRule: { height: 1, backgroundColor: flColor.charcoal700, marginTop: 4 },
  scroll: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24, gap: 14 },
  barTitle: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100, maxWidth: 240 },
  overflowBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  /* `box-none` so the empty space around the bubble stays tappable by the scroll view under it — a
     full-width absolute container that swallowed touches is the classic way a floating button kills the
     bottom of a screen it was only meant to sit on. */
  /* 96 clears the action bar (14 + 48 + 14 ≈ 76) with room to spare. No safe-area inset added: this
     screen takes none anywhere — the bar sits at the foot of a plain flex root — and introducing one
     here alone would float the bubble at a different height than every other element it lines up with. */
  holtWrap: { position: 'absolute', right: SCREEN_GUTTER, zIndex: 42, alignItems: 'flex-end' },
  /* Right-anchored like the coin it sits over, and on the same z-band so the two read as one voice. */
  effortAsk: {
    position: 'absolute',
    right: SCREEN_GUTTER,
    zIndex: 42,
    alignItems: 'flex-end',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
  },
  effortAskText: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray400 },
  effortRow: { flexDirection: 'row', gap: 7 },
  effortChip: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  effortChipPressed: { opacity: 0.7 },
  effortChipText: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '600', color: flColor.bronze300 },
  /* ⚠ `holtBubble`/`holtPressed` were deleted with the local mark. `CoachSays` draws it now, so the
     two screens that show the coach cannot drift apart on what he looks like. Only the PLACEMENT stays
     here, because the height that clears this screen's action bar is this screen's business. */

  // progress band
  band: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  bandTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  doneLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray400 },
  doneAccent: { color: flColor.bronze400 },
  restChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 11, paddingRight: 8, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  restChipOn: { borderColor: flColor.bronzeBorderSubtle },
  restChipText: { gap: 1, flexShrink: 1 },
  restChipKicker: { fontSize: 8, fontWeight: '600', letterSpacing: 0.9, textTransform: 'uppercase', color: flColor.gray600 },
  restChipValue: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, fontVariant: ['tabular-nums'] },
  /* Widened 34 → 42 so three knob positions read as three, not as a switch that never quite settles.
     Position is `alignItems` on the track — the same mechanism the two-state version used, extended by
     one value, rather than absolute offsets that would need re-measuring at every text scale. */
  restToggle: { width: 42, height: 20, borderRadius: 999, borderWidth: 1, padding: 2, justifyContent: 'center' },
  restToggleOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  restToggleOff: { backgroundColor: flColor.charcoal700, borderColor: flColor.charcoal600 },
  restStart: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: flColor.bronzeBorder, alignItems: 'center', justifyContent: 'center', paddingLeft: 1 },
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
  restOverlayFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  restFootDot: { width: 3, height: 3, borderRadius: flRadius.round, backgroundColor: flColor.charcoal500 },
  restSkip: { paddingVertical: 2, paddingHorizontal: 8 },
  restSkipText: { fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  /* Bronze ONLY while pinned — it is the one state that is a standing choice rather than a one-off tap,
     and it needs to say so from across a gym floor. Unpinned it is the same grey as Skip beside it. */
  restStayOn: { color: flColor.bronze300 },

  // fuse flash (green light around the row)
  fuseWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 },

  // exercise-complete seal
  sealWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 44 },
  sealCard: { width: 292, paddingTop: 26, paddingHorizontal: 24, paddingBottom: 22, borderRadius: flRadius.xl, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorder, alignItems: 'center', gap: 12, boxShadow: flShadow.elevated },
  sealMedal: { width: 66, height: 66, borderRadius: 33, backgroundColor: flColor.bronzeSolid, borderWidth: 1, borderColor: flColor.bronzeMetalBorder, alignItems: 'center', justifyContent: 'center', boxShadow: flShadow.glowSubtle },
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
  prMedal: { width: 62, height: 62, borderRadius: 31, backgroundColor: flColor.bronzeSolid, borderWidth: 1, borderColor: flColor.bronzeMetalBorder, alignItems: 'center', justifyContent: 'center', boxShadow: flShadow.glowSubtle },
  prKicker: { fontSize: 11, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.bronze400 },
  prName: { fontFamily: flFont.display, fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: flColor.cream100, textAlign: 'center', lineHeight: 26 },
  prPerf: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', letterSpacing: 0.4, color: flColor.bronze300 },
  prBody: { fontSize: 12, fontWeight: '500', lineHeight: 17, color: flColor.gray400, textAlign: 'center', maxWidth: 232 },
  prBtns: { width: '100%', gap: 8, marginTop: 4 },

  // hero card
  hero: { backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorder, borderRadius: flRadius.xl, padding: 16, boxShadow: flShadow.card },
  heroRow: { flexDirection: 'row', gap: 16 },
  mediaSlot: { width: 132, minHeight: 172, alignSelf: 'stretch', borderRadius: flRadius.lg, overflow: 'hidden', backgroundColor: flColor.charcoal600, borderWidth: 1, borderColor: flColor.bronzeBorder, boxShadow: 'inset 0 0 32px rgba(181, 138, 97, 0.10), 0 0 20px rgba(181, 138, 97, 0.14)', alignItems: 'center', justifyContent: 'center' },
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
  /* The first-time face: a real target rather than a link, on the one occasion it is the whole question. */
  howToFirst: {
    marginTop: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  howToPressed: { opacity: 0.7 },
  howToTextFirst: { fontSize: 14, color: flColor.bronze300 },
  insightRow: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  insightCol: { flex: 1, gap: 2, paddingHorizontal: 12 },
  insightMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: flColor.charcoal700, alignItems: 'flex-start' },
  insightLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  insightVal: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  insightGoalLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400 },
  insightGoal: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', letterSpacing: -0.3, lineHeight: 24, color: flColor.bronze300 },
  insightGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memoryBadge: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: flRadius.round, backgroundColor: flColor.bronze400 },

  // hero collapsed strip
  heroStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorder, borderRadius: flRadius.xl, paddingVertical: 9, paddingHorizontal: 12, boxShadow: flShadow.card },
  heroStripThumb: { width: 46, height: 46, borderRadius: flRadius.md, overflow: 'hidden', backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center', justifyContent: 'center' },
  heroStripText: { flex: 1, minWidth: 0, gap: 3 },
  heroStripName: { fontFamily: flFont.display, fontSize: 16.5, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  heroStripMeta: { fontSize: 11, fontWeight: '600', color: flColor.gray400 },
  heroStripGoal: { color: flColor.bronze300, fontWeight: '700' },
  /* Cream, not bronze: what you did is a fact and what you are being asked for is the instruction, and
     only one of them should pull the eye in a strip this small. */
  heroStripPrev: { color: flColor.cream100, fontWeight: '700' },

  // circuit / AMRAP banner — names the block the current exercise belongs to
  blockBanner: { gap: 3, paddingVertical: 10, paddingHorizontal: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  blockBannerAmrap: { borderColor: flColor.bronzeBorderSubtle },
  blockBannerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  blockKicker: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400 },
  ssBackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  ssBackText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  blockRounds: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, color: flColor.bronze300, fontVariant: ['tabular-nums'] },
  blockName: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  blockMeta: { fontSize: 11, fontWeight: '600', color: flColor.gray400 },
  amrapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8, paddingVertical: 8, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal900 },
  amrapBtnOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  amrapBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300, fontVariant: ['tabular-nums'] },
  amrapBtnTextOn: { color: flColor.cream100 },

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
  targetLoad: { fontSize: 11, fontWeight: '600', color: flColor.bronze300, marginTop: 1 },
  repsLabel: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  targetPer: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.bronze300, marginTop: 1 },
  weightBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 6 },
  weightText: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600' },
  actualCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 9 },
  actualBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: flRadius.sm, borderWidth: 1, borderColor: flColor.charcoal600 },
  actualBtnCurrent: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  tableHint: { fontSize: 11.5, lineHeight: 16, color: flColor.gray600, textAlign: 'center', paddingHorizontal: 10, paddingTop: 4 },
  actualDone: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100, paddingVertical: 6 },
  actualCurrent: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.bronze400, paddingVertical: 6 },
  actualPending: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.gray600 },
  checkDoneBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: flColor.greenMuted, alignItems: 'center', justifyContent: 'center' },
  checkCurrent: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint, alignItems: 'center', justifyContent: 'center', boxShadow: flShadow.glowSubtle },
  checkPending: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: flColor.charcoal500 },
  /* ══ THE TAP HAS TO ANSWER BEFORE THE DATA DOES ══
     Every control in this row used to sit inert until `completeSet` round-tripped. Mid-set,
     one-handed, that gap is long enough to read as a missed tap — so the athlete taps again.
     `scale: 0.96` is the standard press depth (0.98 and below reads as nothing at this size);
     the colour shift is the static cue that survives Reduce Motion, because a transform is
     never allowed to be the only confirmation. */
  checkCurrentPressed: { transform: [{ scale: 0.96 }], backgroundColor: flColor.bronzeBorder, borderColor: flColor.bronze300 },
  checkDoneBtnPressed: { transform: [{ scale: 0.96 }], backgroundColor: flColor.charcoal700 },
  cellBtnPressed: { transform: [{ scale: 0.96 }], opacity: 0.82 },
  /* The shared press depth for every other control on this screen — the rest-timer ±15/pause/skip
     cluster, the exercise arrows, Add Set, the overflow and hero buttons. One value, so the screen
     answers the thumb the same way everywhere instead of a third of it staying inert. */
  ctlPressed: { transform: [{ scale: 0.96 }], opacity: 0.82 },
  setBtns: { flexDirection: 'row', gap: 8, marginTop: 2 },
  addSet: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorder, borderRadius: flRadius.md, backgroundColor: 'transparent' },
  addSetText: { fontSize: 12.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze400 },
  /* The trailing column every row and the header carry, so the trash never steals width from the
     three data cells and the headings stay over their numbers. */
  cTrash: { width: 22, alignItems: 'flex-end', justifyContent: 'center' },
  /* Subtle by default — the glyph is red so it needs no weight of its own; at rest it is a mark, on
     press it is the control. The press answer is the same depth every other control here uses. */
  trashBtn: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', opacity: 0.5 },
  trashBtnPressed: { transform: [{ scale: 0.96 }], opacity: 1 },
  /*
   * THE ATHLETE'S NOTE ROW — the same shape both builders use for the author's cue, on purpose: one
   * treatment for "a note lives here", whichever screen you are on. Sentence case and no uppercase
   * tracking, unlike Add Set above it, because this is not part of logging a set.
   *
   * ⚠ A STRIP, NOT A CARD, AND IT SITS AT THE SAME LEVEL AS THE TABLE. It is a direct child of the
   * scroll body (18pt gutter, 14pt gap already applied), so it carries no margin of its own and takes
   * the table's own `charcoal900` surface — it reads as a small shelf under the table rather than a
   * fourth bordered object competing with it. No bronze until there is a note to show: an empty
   * prompt in the accent colour would claim the eye every session for something most exercises
   * never get.
   */
  exerciseNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  exerciseNotePressed: { backgroundColor: flColor.charcoal700 },
  exerciseNoteText: { flex: 1, fontSize: 13, color: flColor.gray600 },
  /* A written note reads as prose — the same cream italic LAST TIME shows it back in next session. */
  exerciseNoteTextSet: { color: flColor.cream100, fontStyle: 'italic' },

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
  /* `paddingBottom` is applied inline from `useBarBottom` — the floor plus whatever the hardware needs.
     Top padding stays fixed: the gap to the content above is a design decision, not a hardware one. */
  bottomRow: { flexDirection: 'row', gap: 12, paddingHorizontal: SCREEN_GUTTER, paddingTop: 14 },
  endWrap: { flex: 1 },
  primaryWrap: { flex: 1.15, borderRadius: flRadius.md },
  primaryGlow: { boxShadow: flShadow.glowSubtle },

  // resume
  /* The resume/freestyle card's own styles are GONE, not orphaned: `resumeCard`, `kicker`, `resumeName`,
     `resumeSub` and `resumeActions` described a bordered box that no longer exists. `WorkoutEntry` owns
     the composition that replaced them. */

  // picker sheet
  /* Off-screen rather than invisible: `opacity: 0` alone still occupies layout, and `display: none`
     would make it unfocusable, which is the one thing it exists to be. */
  keyboardPrimer: { position: 'absolute', top: -1000, left: -1000, width: 1, height: 1, opacity: 0 },

  wNameInput: {
    fontFamily: flFont.sans,
    fontSize: 17,
    color: flColor.cream100,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    outlineWidth: 0,
  },

  lastNote: {
    marginTop: 14,
    paddingLeft: 11,
    borderLeftWidth: 2,
    borderLeftColor: flColor.bronze400,
    gap: 3,
  },
  lastNoteLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.3, color: flColor.bronze400 },
  /* ⚠ `coachNote`, `coachNoteLabel`, `holtNote` and `holtNoteLabel` were deleted here, not orphaned.
     They dressed the two hero cards the coin replaced, and a style with no consumer reads as a thing
     the screen still draws — which is exactly how somebody rebuilds a card that was removed on purpose.
     `coachNoteSub` survives: the ⋮ Options sheet still shows the plan's cue, and should. */
  /* Not clamped to one line like `optSub` — a cue is the content of its row, not a caption on it. */
  coachNoteSub: { fontSize: 12, lineHeight: 18, color: flColor.cream100, fontStyle: 'italic', marginTop: 2 },
  /*
   * THE AUTHOR'S CUE, UNDER THE NAME, IN BOTH HERO FACES.
   *
   * ⚠ A LINE AND NOT A CARD — see the render. The card this replaces was deleted on purpose and must not
   * come back: no border, no background, no bronze edge. What it takes from bronze is nothing; it is
   * cream italic, which is the voice the ⋯ menu, the Program Builder's row and the Workout Builder's row
   * all already show a cue in, so the same sentence looks like the same sentence everywhere it appears.
   *
   * Unclamped here because the hero is roomy and a cue runs to a sentence or three; the strip below
   * clamps to one, because a strip is a summary.
   */
  planCueLine: { fontSize: 13, lineHeight: 19, color: flColor.cream100, fontStyle: 'italic', marginTop: -4 },
  heroStripCue: { fontSize: 11.5, lineHeight: 16, color: flColor.cream100, fontStyle: 'italic', marginTop: 1 },
  lastNoteText: { fontSize: 13.5, lineHeight: 20, color: flColor.cream100, fontStyle: 'italic' },
  noteInput: {
    fontFamily: flFont.sans,
    fontSize: 16,
    lineHeight: 23,
    color: flColor.cream100,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    // Tall enough for the two or three lines a real note runs to, without becoming a document editor.
    minHeight: 96,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },

  pickerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, justifyContent: 'flex-end' },
  pickerBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(6,9,12,0.62)' },
  picker: { backgroundColor: flColor.charcoal900, borderTopLeftRadius: flRadius.xl, borderTopRightRadius: flRadius.xl, borderTopWidth: 1, borderColor: flColor.charcoal600, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24, gap: 12 },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  noteIntro: { fontSize: 13, lineHeight: 19, color: flColor.gray400, marginTop: 8, marginBottom: 2 },
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

  // superset — one merged card for a pairing performed round by round
  supersetCard: { borderWidth: 1, borderColor: flColor.bronzeBorder, borderRadius: flRadius.lg, backgroundColor: flColor.charcoal800, padding: 14, gap: 10, boxShadow: flShadow.trainTogetherCard },
  supersetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ssRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9, paddingHorizontal: 10, borderRadius: flRadius.md, borderWidth: 1, borderColor: 'transparent' },
  ssRowNext: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  ssTag: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.4, borderColor: flColor.charcoal500, alignItems: 'center', justifyContent: 'center' },
  ssTagNext: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  ssTagText: { fontFamily: flFont.display, fontSize: 13, fontWeight: '700', color: flColor.gray600 },
  ssTagTextNext: { color: flColor.bronze300 },
  ssBody: { flex: 1, minWidth: 0, gap: 3 },
  ssName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  ssSet: { fontSize: 12, color: flColor.gray400 },
  ssSetDone: { color: flColor.greenMuted },
  ssSetNone: { fontSize: 12, color: flColor.gray600 },
  ssLog: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600 },
  ssLogNext: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  ssLogText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray400 },
  ssLogTextNext: { color: flColor.bronze300 },
  ssRounds: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, paddingTop: 4 },
  ssRoundChip: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center', justifyContent: 'center' },
  ssRoundChipDone: { borderColor: flColor.greenMuted },
  ssRoundChipCurrent: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  ssRoundChipText: { fontSize: 11.5, fontWeight: '700', color: flColor.gray600 },
  ssRoundChipTextDone: { color: flColor.greenMuted },
  ssRoundChipTextCurrent: { color: flColor.bronze300 },
  ssAddRound: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600 },
  ssAddRoundText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: flColor.bronze400 },
  ssFoot: { fontSize: 11.5, lineHeight: 16, color: flColor.gray600 },

  // set input sheet — two fields, one Log Set
  setSheetTitleWrap: { flex: 1, paddingRight: 12 },
  setSheetSub: { fontSize: 11.5, color: flColor.gray400, marginTop: 3 },
  fieldRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  field: { flex: 1, borderWidth: 1, borderColor: flColor.charcoal600, borderRadius: flRadius.md, backgroundColor: flColor.charcoal900, paddingVertical: 12, paddingHorizontal: 12, gap: 4 },
  fieldActive: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  fieldLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400 },
  /* `outlineWidth: 0` belt-and-braces alongside the `:focus` rule in `global.css` — this one field is
     large, bordered and bronze-highlighted, so a ring on it is never the thing telling you where you
     are. Native ignores the key. */
  fieldInput: { fontFamily: flFont.display, fontSize: 34, fontWeight: '600', color: flColor.cream100, padding: 0, minHeight: 42, outlineWidth: 0 },
  fieldValue: { fontFamily: flFont.display, fontSize: 34, fontWeight: '600', color: flColor.cream100, minHeight: 42 },
  fieldValueEmpty: { color: flColor.gray600 },
  bwChip: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600 },
  bwChipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  bwChipText: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: flColor.gray400 },
  bwChipTextOn: { color: flColor.bronze300 },
  bwChipSub: { flex: 1, fontSize: 11.5, color: flColor.gray600 },

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
  optionsSheet: { maxHeight: '82%' },
  /* `flexShrink: 1` is the part that matters: an RN flex child defaults to flexShrink 0, so without it
     the ScrollView keeps its full content height and pushes straight back through the 82% cap. */
  optScroll: { flexShrink: 1 },
  optList: { gap: 8, paddingBottom: 4 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  optRowTint: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  optRowDanger: { borderColor: 'rgba(190,90,76,0.3)', backgroundColor: 'rgba(190,90,76,0.12)' },
  optRowDisabled: { opacity: 0.45 },
  optIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center' },
  optIconDanger: { borderColor: 'rgba(190,90,76,0.3)', backgroundColor: 'rgba(190,90,76,0.14)' },
  optText: { flex: 1, minWidth: 0, gap: 2 },
  optTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  optTitleDanger: { color: flColor.redMuted },
  optSub: { fontSize: 12, color: flColor.gray600 },

  // toast
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 100, alignItems: 'center', zIndex: 55 },
  /* Above the bottom bar, below the toast's z-index — it must never cover the set being logged. */
  joinBannerWrap: { position: 'absolute', left: 16, right: 16, bottom: 108, zIndex: 54 },
  toast: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal600, boxShadow: flShadow.elevated },
  toastText: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.cream100 },

  // completion ceremony
  ceremonyWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,9,12,0.72)', alignItems: 'center', justifyContent: 'center', padding: 22, zIndex: 70 },
  ceremonyCard: { width: '100%', maxWidth: 360, maxHeight: '88%', borderRadius: flRadius.xl, backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorder, boxShadow: flShadow.elevated, overflow: 'hidden' },
  ceremonyScroll: { paddingTop: 26, paddingHorizontal: 22, paddingBottom: 18, alignItems: 'center' },
  ceremonyInsignia: { width: 72, height: 72, borderRadius: 20, backgroundColor: flColor.bronzeSolid, borderWidth: 1, borderColor: flColor.bronzeMetalBorder, alignItems: 'center', justifyContent: 'center', boxShadow: flShadow.glowSubtle },
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
  pAvatarSmText: { fontSize: 10, fontWeight: '700', color: flColor.onBronze },
  partnerChipName: { fontSize: 12.5, fontWeight: '600', color: flColor.cream100 },
  tagBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 15, borderRadius: flRadius.pill, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorder },
  tagBtnText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400 },
  ceremonyFooter: { padding: 18, gap: 4, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },

  // partner sheet (W-20)
  partnerSheet: { maxHeight: '82%', paddingTop: 8 },
  /** ~22px of grabbable height around the drawn bar — see `useSheetDrag`. */
  grabHandleRow: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
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
  pCheckOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeSolid },
});
