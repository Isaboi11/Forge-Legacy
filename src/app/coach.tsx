import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { EMPTY_COACH_PROFILE, fetchCoachProfile } from '@/data/coach-profile-live';
import { fetchLiftHistory, liftId } from '@/data/lift-history-live';
import { assemble } from '@/domain/coach/assemble';
import {
  BODY_PARTS,
  BODY_PART_LABEL,
  SPLITS,
  SPLIT_LABEL,
  buildDayWorkout,
  type BodyPart,
  type DayFocus,
  type SplitName,
} from '@/domain/coach/day';
import {
  GOAL_LABEL,
  LIMITATIONS,
  LIMITATION_LABEL,
  SESSION_LENGTHS,
  type Environment,
  type Experience,
  type Goal,
  isEnduranceGoal,
  type Limitation,
  type SessionMinutes,
} from '@/domain/coach/constraints';
import { intakeSteps, type StepId } from '@/domain/coach/intake-steps';
import { progressionFor } from '@/domain/coach/progression';
import { rationaleFor } from '@/domain/coach/rulebook/rationale';
import {
  AUTHORED_GOALS,
  SPLIT_STYLE_BLURB,
  SPLIT_STYLE_LABEL,
  stylesForDays,
  type SplitStyle,
} from '@/domain/coach/rulebook/skeletons';
import { fetchLearnedPreferences } from '@/data/learned-preference-live';
import { appliedSentence, type LearnedPreferences } from '@/domain/coach/learned-preference';
import { scheduleSlots } from '@/domain/program/progress-core';
import type { ProgramStructure } from '@/data/programs-live';
import { canDoExercise, HOME_GYM_EQUIPMENT, HOME_GYM_GROUPS } from '@/domain/home-gym/equipment';
import { itemByKey, PICKER_DB } from '@/domain/exercise-picker/data';
import { draftFromStructure, saveProgramDraft } from '@/lib/program-draft';
import { saveWorkoutDraft } from '@/lib/workout-builder-draft';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { useQuery } from '@/lib/useQuery';

/**
 * Coach Holt.
 *
 * ══ A CONSULTATION, NOT A FORM ══
 *
 * The interaction model is deliberately plain — one question, tap an answer, move on — so everything that
 * makes this feel like a person rather than a questionnaire has to come from three places:
 *
 *  1. **A standing identity.** `COACH HOLT · PROGRAM DESIGN · 3 OF 6` sits under the nav on every step, so
 *     you always know who you are talking to and roughly how far in you are, without a progress bar.
 *  2. **Acknowledgment.** Holt answers the important choices before moving on — half a second, one line.
 *     It costs nothing and it is the whole difference between being asked and being listened to.
 *  3. **Restraint with bronze.** White is information, grey is explanation, bronze is Holt and the decision
 *     you just made. Nothing else is bronze, so bronze always means something.
 *
 * ══ CARD WEIGHT FOLLOWS CONTENT ══
 *
 * A ninety-point card holding the words "4 days" is what made this read as a template. Simple answers are
 * compact rows with a chevron; answers that need explaining get the taller card. The variation is the
 * hierarchy.
 *
 * ══ IT BUILDS, IT DOES NOT PICK ══
 *
 * Nothing here selects from the fourteen authored programs or the eighty-one starter templates. Every plan
 * is assembled slot by slot from the visible 733-exercise catalogue against this athlete's own equipment,
 * and the same answers produce the same plan every time.
 */

const INTRO_SEEN_KEY = 'forge_coach_intro_seen_v1';
const ACK_MS = 620;

/**
 * How the carried-over profile answers read back to the athlete.
 *
 * Separate from `EXPERIENCE_ACK` and the `where` step's own card titles on purpose: those are Holt
 * REPLYING to a choice just made ("Then we start with the movements, not the numbers"), these are
 * clauses in a sentence describing a standing fact. The same string cannot do both jobs.
 */
const EXPERIENCE_SUMMARY: Record<Experience, string> = {
  beginner: 'starting out',
  intermediate: 'training a while',
  advanced: 'years of training',
};

const ENVIRONMENT_SUMMARY: Record<Environment, string> = {
  full_gym: 'a full gym',
  home: 'training at home',
  bodyweight: 'bodyweight only',
  outdoor: 'training outdoors',
};

type Mode = 'program' | 'day';

/**
 * ⚠ `StepId` AND THE STEP LIST NOW LIVE IN `domain/coach/intake-steps.ts`.
 *
 * They moved the moment the wizard started skipping questions the profile already answers: a wrong
 * boolean there produces a flow that still runs and still builds, having silently never asked something.
 * That is not catchable by `tsc` and is catchable by a test, so it lives where a test can reach it.
 */
/** Weeks from today as an ISO date, which is what the engine counts back from. */
function isoInWeeks(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

/**
 * "22:30" or "1:45:20" → seconds. Anything unparseable is `null`, and `null` means Holt writes no pace.
 *
 * ⚠ IT MUST FAIL TO NULL RATHER THAN TO A NUMBER. A half-typed time that resolved to some default would
 * derive a whole set of training paces from a result the athlete never ran, and on the screen a wrong
 * pace is indistinguishable from a right one.
 */
function parseTime(text: string): number | null {
  const parts = text.trim().split(':').map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3) return null;
  if (parts.some((p) => p === '' || !/^\d+$/.test(p))) return null;
  const n = parts.map(Number);
  const sec = parts.length === 3 ? n[0] * 3600 + n[1] * 60 + n[2] : n[0] * 60 + n[1];
  return sec > 0 ? sec : null;
}

/** Weekly mileage bands. The stored value is the band's midpoint — nobody knows their mileage exactly. */
const MILEAGE_BANDS: { label: string; value: number }[] = [
  { label: "I don't run at the moment", value: 0 },
  { label: 'Under 5 miles a week', value: 3 },
  { label: '5 to 10 miles', value: 8 },
  { label: '10 to 20 miles', value: 15 },
  { label: '20 to 30 miles', value: 25 },
  { label: 'More than 30 miles', value: 35 },
];

const RACE_WHEN: { label: string; weeks: number }[] = [
  { label: 'About 6 weeks', weeks: 6 },
  { label: 'About 8 weeks', weeks: 8 },
  { label: 'About 12 weeks', weeks: 12 },
  { label: 'About 16 weeks', weeks: 16 },
  { label: 'About 20 weeks', weeks: 20 },
  { label: 'Six months or more', weeks: 26 },
];

const RESULT_DISTANCES: { label: string; mi: number }[] = [
  { label: '5K', mi: 3.1 },
  { label: '10K', mi: 6.2 },
  { label: 'Half', mi: 13.1 },
  { label: 'Marathon', mi: 26.2 },
];

export default function CoachScreen() {
  const router = useRouter();
  /**
   * What onboarding already asked. See `data/coach-profile-live.ts`.
   *
   * ⚠ THIS REPLACED `fetchHomeGym()` RATHER THAN JOINING IT. Every field is on the same `profiles` row,
   * and two reads of one row for one screen is how two callers start disagreeing about what the athlete
   * owns. Anything that still wants the bare equipment list uses `profile.ownedEquipment`.
   */
  const profileQ = useQuery(fetchCoachProfile, []);
  const known = profileQ.data ?? EMPTY_COACH_PROFILE;

  const [intro, setIntro] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(INTRO_SEEN_KEY)
      .then((v) => setIntro(v == null))
      .catch(() => setIntro(false));
  }, []);

  const guard = usePremiumGate();
  const [mode, setMode] = useState<Mode | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [ack, setAck] = useState<{ label: string; line: string } | null>(null);
  const ackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (ackTimer.current) clearTimeout(ackTimer.current);
    },
    [],
  );

  const [goal, setGoal] = useState<Goal | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [style, setStyle] = useState<SplitStyle | null>(null);
  const [focusKind, setFocusKind] = useState<'split' | 'body_parts' | null>(null);
  const [split, setSplit] = useState<SplitName | null>(null);
  const [parts, setParts] = useState<BodyPart[]>([]);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  /**
   * Gear named in the wizard, which overrides the saved Home Gym for this build only.
   *
   * `null` means "use the profile" and is not the same as `[]`, which means "I told you, and it is
   * nothing" — the same distinction the Home Gym profile itself keeps, and for the same reason.
   */
  const [pickedGear, setPickedGear] = useState<string[] | null>(null);
  const [sessionMinutes, setSessionMinutes] = useState<SessionMinutes | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [limitations, setLimitations] = useState<Limitation[]>([]);

  /* ── Endurance only ─────────────────────────────────────────────────────────────────────────────
     Weeks-until-race rather than a calendar date: it is the number the plan is actually built from, it
     is the one the athlete can answer without opening another app, and it removes a date picker from a
     flow whose whole premise is one question per card. The engine still takes a date — computed below. */
  const [raceWeeks, setRaceWeeks] = useState<number | null>(null);
  const [weeklyMi, setWeeklyMi] = useState<number | null>(null);
  /** `null` = not asked. Only asked of someone whose mileage does not already answer it. */
  const [canRun, setCanRun] = useState<boolean | null>(null);
  /** A recent all-out result. Absent means Holt describes effort and writes no pace at all (EPS-D10). */
  const [resultMi, setResultMi] = useState<number | null>(null);
  const [resultTime, setResultTime] = useState('');

  const [built, setBuilt] = useState<Built | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /*
   * ══ WHAT ONBOARDING ANSWERED IS NOT ASKED AGAIN — AND IS ALWAYS CHANGEABLE ══
   *
   * `missingFor()` in `domain/coach/constraints.ts` was written for exactly this and says so: goal and
   * experience come from onboarding, equipment from the Home Gym profile, and the wizard asks for the
   * rest. Until now nothing read the profile, so every athlete answered all eight questions on every
   * build — including the three they had just answered on the way in.
   *
   * ⚠ SKIPPED IS NOT THE SAME AS FIXED. `revising` puts all three back, and the chooser screen shows what
   * Holt is about to assume so the athlete can see it BEFORE it is used rather than discover it in the
   * built program. A profile answer is a good default and a bad cage: somebody who set up a full gym in
   * January is in a hotel room in March.
   *
   * ⚠ AND `revising` IS PLAIN STATE READ INLINE, not a seed written into the answer fields by an effect.
   * This project's react-compiler lint ERRORS on `setState` inside an effect, and seeding would also make
   * the profile and the athlete's own answer indistinguishable the moment they differ.
   */
  const [revising, setRevising] = useState(false);
  const askGoal = revising || known.goal == null;
  const askExperience = revising || known.experience == null;
  const askWhere = revising || known.environment == null;

  const effGoal = askGoal ? goal : known.goal;
  const effExperience = askExperience ? experience : known.experience;
  /* `full_gym` is the fallback of last resort and is only ever reached with the `where` step on screen
     and unanswered, which the step list prevents from mattering — it exists so the type is not optional
     all the way down into the engine. */
  const effEnvironment: Environment = (askWhere ? environment : known.environment) ?? 'full_gym';

  const endurance = effGoal != null && isEnduranceGoal(effGoal);

  const owned = pickedGear ?? known.ownedEquipment ?? [];
  /* A race plan asks a different set of questions, and skips three the strength flow needs: there is no
     split to choose, the room is wherever they run, and session length is decided by the volume curve
     rather than by a budget. `race_can_run` only appears for someone whose mileage has not already
     answered it — asking a 30-mile-a-week runner whether they can run for twenty minutes is the wizard
     not listening. */
  const steps: StepId[] = intakeSteps({
    mode,
    endurance,
    focusKind,
    namingGear: pickedGear != null,
    weeklyMi,
    askGoal,
    askWhere,
    askExperience,
  });

  const step = steps[stepIndex];

  /**
   * Answer, hear Holt, move on.
   *
   * `line` is optional and used sparingly — an acknowledgment on every screen would be a tic rather than a
   * personality. The timer is cleared on unmount so a fast back-tap cannot advance a screen nobody is
   * looking at any more.
   */
  const answer = (apply: () => void, ackLabel?: string, line?: string) => {
    apply();
    if (ackLabel && line) {
      setAck({ label: ackLabel, line });
      ackTimer.current = setTimeout(() => {
        setAck(null);
        setStepIndex((i) => i + 1);
      }, ACK_MS);
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const restart = () => {
    setBuilt(null);
    setError(null);
    setStepIndex(0);
    setMode(null);
  };

  const back = () => {
    if (built) {
      setBuilt(null);
      setStepIndex(Math.max(0, steps.length - 1));
      return;
    }
    if (stepIndex === 0) setMode(null);
    else setStepIndex((i) => i - 1);
  };

  async function build() {
    setBusy(true);
    setError(null);
    try {
      /* ⚠ FETCHED HERE AND PASSED DOWN, NEVER READ INSIDE THE ENGINE. `domain/coach/**` touches no
         database, and this is what keeps that true: the swaps this athlete has actually made become a
         plain map at the boundary, and `assemble()` stays a pure function of its arguments. Resolves to
         `{}` for anybody who has never swapped, which is most people, and `{}` builds what it built
         before any of this existed. */
      const learned = await fetchLearnedPreferences();
      if (mode === 'program') {
        const res = assemble(
          {
            goal: effGoal!,
            experience: { lifting: effExperience!, running: effExperience! },
            daysPerWeek: daysPerWeek!,
            // Not asked on a race plan: a long run is as long as it is, so a stated session budget would
            // be a question whose answer changes nothing. 60 keeps the field honest for the validator.
            sessionMinutes: sessionMinutes ?? 60,
            environment: effEnvironment,
            ownedEquipment: owned,
            limitations,
            excludeExercises: [],
            splitStyle: style,
            // Weeks → the ISO date the engine counts back from. Local midnight, so "in 12 weeks" is the
            // same day of the week they answered on rather than drifting by one in a western timezone.
            raceDate: raceWeeks != null ? isoInWeeks(raceWeeks) : null,
            currentWeeklyMi: weeklyMi,
            canRunContinuously: canRun,
            recentRaceMi: resultMi,
            recentRaceSec: parseTime(resultTime),
            learned,
          },
          PICKER_DB,
          canDoExercise,
        );
        if (!res.ok) {
          setError(res.refusal.message);
          return;
        }
        const { structure, notes, deloadWeeks, restructured } = res.assembly;
        const week1 = structure.weekPlans?.[0]?.days ?? structure.days;
        setBuilt({
          kind: 'program',
          title: structure.name,
          stats: [`${structure.weeks} weeks`, `${structure.daysPerWeek} days`, `~${sessionMinutes} min`],
          tag: GOAL_LABEL[effGoal!],
          why: rationaleFor({
            goal: effGoal!,
            daysPerWeek: daysPerWeek!,
            sessionMinutes: sessionMinutes!,
            weeks: structure.weeks,
            splitStyle: style,
            deloadWeeks,
            restructuredBecause: restructured?.because,
          }),
          restructured: restructured?.because ?? null,
          days: week1.map((d) => ({
            name: d.name,
            meta: `${d.main.length} exercises`,
            items: d.main.map((e) => ({ name: e.name, detail: '' })),
          })),
          /* Two kinds of honesty in one list: what he COULDN'T build, and what he built because of
             something this athlete taught him. Both are the coach showing his working. */
          notes: [...droppedLine(notes), ...stretchedLine(notes), ...learnedLine(learned, structure)],
          apply: async () => {
            await saveProgramDraft(draftFromStructure(structure));
            router.replace('/program-builder');
          },
        });
      } else {
        const focus: DayFocus =
          focusKind === 'split' ? { kind: 'split', split: split! } : { kind: 'body_parts', parts };
        const res = buildDayWorkout(
          {
            focus,
            sessionMinutes: sessionMinutes!,
            experience: effExperience!,
            environment: effEnvironment,
            ownedEquipment: owned,
            limitations,
            learned,
          },
          PICKER_DB,
          canDoExercise,
        );
        if (res.day.main.length === 0) {
          setError(
            "I couldn't put that together with what you've got. Try a different focus, or tell me it's bodyweight only.",
          );
          return;
        }
        /* Asked by catalogue key where there is one, so the wizard and the logger read the same history
           for the same lift — see `lift-history-live`. This used to ask by name alone. */
        const history = await fetchLiftHistory(res.day.main.map((e) => ({ catalogKey: e.catalogKey, name: e.name })));
        setBuilt({
          kind: 'day',
          title: res.day.name,
          stats: [`${res.day.main.length} movements`, `~${sessionMinutes} min`],
          tag: null,
          why: null,
          restructured: null,
          days: [
            {
              name: res.day.name,
              meta: `${res.day.main.length} exercises`,
              items: res.day.main.map((e) => {
                const p = progressionFor({
                  exerciseName: e.name,
                  pattern: (e.catalogKey ? itemByKey(e.catalogKey)?.pattern : undefined) ?? '',
                  experience: effExperience!,
                  prescription: { sets: e.sets ?? 3, reps: e.reps ?? 8, repsMax: e.repsMax ?? null },
                  history: history.get(liftId({ catalogKey: e.catalogKey, name: e.name }))?.sessions ?? [],
                  /* The rack's own constraint — a dumbbell lift cannot advance by 2.5 lb because no such
                     dumbbell exists. ⚠ `equipId`, NOT `equip`: `equip` is the display name ("Cable
                     Machine") and `EQUIPMENT_STEP` is keyed by id, so the label would miss every row and
                     fall silently to the default. */
                  equipment: e.catalogKey ? itemByKey(e.catalogKey)?.equipId ?? null : null,
                });
                return {
                  name: e.name,
                  detail: e.sets != null ? `${e.sets} × ${e.repsMax ? `${e.reps}–${e.repsMax}` : e.reps}` : '',
                  coach: p.action === 'no_history' ? undefined : p.message,
                };
              }),
            },
          ],
          notes:
            res.missing.length > 0
              ? [`Nothing you've got trains ${res.missing.join(' or ')} — left it out.`]
              : [],
          apply: async () => {
            await saveWorkoutDraft({
              name: res.day.name,
              warmup: res.day.warmup,
              main: res.day.main,
              cooldown: res.day.cooldown,
              editId: null,
            });
            router.replace('/workout-builder');
          },
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const onApply = async () => {
    if (!built || busy) return;
    setBusy(true);
    try {
      await built.apply();
    } catch {
      setError('Something went wrong handing that over. Try again.');
      setBusy(false);
    }
  };

  const showBack = intro === false && (mode != null || built != null);
  const chapter = mode === 'program' ? 'PROGRAM DESIGN' : "TODAY'S SESSION";

  /**
   * One sentence naming everything carried over from the profile, or `null` when nothing was.
   *
   * ⚠ IT NAMES ONLY WHAT IS ACTUALLY BEING SKIPPED. `known.goal` is null for an endurance or athletic
   * answer even though onboarding recorded one, and the goal question is then still asked — claiming
   * "Run a 5K" here on the strength of a coarse `endurance` bucket would be the summary asserting
   * something the engine is not being told.
   */
  const knownLine = ((): string | null => {
    const parts: string[] = [];
    if (known.goal) parts.push(GOAL_LABEL[known.goal].toLowerCase());
    if (known.experience) parts.push(EXPERIENCE_SUMMARY[known.experience]);
    if (known.environment) parts.push(ENVIRONMENT_SUMMARY[known.environment]);
    if (parts.length === 0) return null;
    // Sentence case on the first fragment only — the rest are lowercase clauses by construction.
    const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
    return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
  })();

  return (
    <View style={styles.root}>
      <AppBar title="Coach Holt" onClose={() => router.back()} onBack={showBack ? back : undefined} />

      {profileQ.loading || intro == null ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : intro ? (
        <Intro
          onDone={() => {
            void AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
            setIntro(false);
          }}
        />
      ) : built ? (
        <Reveal built={built} busy={busy} onApply={onApply} onAdjust={back} onRestart={restart} />
      ) : busy ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
          <Text style={styles.working}>Putting it together…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Button variant="secondary" onPress={restart}>
            Start again
          </Button>
        </View>
      ) : mode == null ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Eyebrow>COACH HOLT</Eyebrow>
          <Text style={styles.question}>What do you need?</Text>
          <View style={styles.options}>
            <BigOption
              title="Build me a program"
              sub="A full block, week by week, built around what you're after."
              /* Pre-action (M-7 §2). The wall goes on the PROGRAM, not the day (MA3-D4): a program is a
                 commitment and a day is a whim, so the free tier gets one program for life and two days
                 a month, refilling. Checked here rather than at generation because the flow that follows
                 asks six questions about goal, days, equipment and limitations — being refused at the
                 end of that is the dead end the spec exists to prevent. */
              onPress={() => {
                if (!guard('holt_programs')) return;
                setMode('program');
                setStepIndex(0);
              }}
            />
            <BigOption
              title="Just today's workout"
              sub="One session. Tell me what you're training and I'll write it."
              /* The refilling one — 2 per calendar month on Free. The refill is what keeps the free tier
                 alive rather than dead-ended once the lifetime program is spent. */
              onPress={() => {
                if (!guard('holt_days_per_month')) return;
                setMode('day');
                setStepIndex(0);
              }}
            />
          </View>
          {/*
            ⚠ WHAT HOLT IS ABOUT TO ASSUME, SHOWN BEFORE HE ASSUMES IT.
            Skipping a question the athlete already answered is only an improvement if they can SEE what
            was carried over. Without this the shorter flow is indistinguishable from a flow that quietly
            decided for them, and the first they would know of a wrong assumption is a program built on
            it. Rendered only when something was actually carried — an empty summary that says "I know
            nothing about you" is the generic teaser the coach spec forbids.
          */}
          {!revising && knownLine != null ? (
            <View style={styles.knows}>
              <Text style={styles.knowsHead}>What I already know</Text>
              <Text style={styles.knowsBody}>{knownLine}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change what Coach Holt knows about you"
                onPress={() => setRevising(true)}
                style={styles.knowsChange}
              >
                <Text style={styles.knowsChangeText}>Not right today? Change it</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      ) : ack ? (
        <Acknowledgement label={ack.label} line={ack.line} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Eyebrow>
            COACH HOLT{'\n'}
            <Text style={styles.chapter}>
              {chapter} · {stepIndex + 1} OF {steps.length}
            </Text>
          </Eyebrow>
          <Step
            step={step}
            state={{
              goal,
              daysPerWeek,
              style,
              focusKind,
              split,
              parts,
              environment: effEnvironment,
              pickedGear,
              raceWeeks,
              weeklyMi,
              canRun,
              resultMi,
              resultTime,
              sessionMinutes,
              experience,
              limitations,
              // The profile's own count — the Home Gym card describes what is SAVED, not what a
              // limited-equipment answer is currently overriding it with.
              ownedCount: (known.ownedEquipment ?? []).length,
            }}
            answer={answer}
            set={{
              setGoal,
              setDaysPerWeek,
              setStyle,
              setFocusKind,
              setSplit,
              setParts,
              setEnvironment,
              setPickedGear,
              setRaceWeeks,
              setWeeklyMi,
              setCanRun,
              setResultMi,
              setResultTime,
              setSessionMinutes,
              setExperience,
              setLimitations,
            }}
            onFinish={() => void build()}
          />
        </ScrollView>
      )}
    </View>
  );
}

/* ── INTRO ───────────────────────────────────────────────────────────────────────────────────────── */

function Intro({ onDone }: { onDone: () => void }) {
  return (
    <>
      <ScrollView contentContainerStyle={styles.introScroll}>
        <Text style={styles.introName}>I&apos;m Holt.</Text>
        <Text style={styles.introBody}>
          Tell me what you&apos;re after and I&apos;ll write the training that gets you there — a full block,
          or just what you&apos;re doing today.
        </Text>
        <Text style={styles.introBody}>
          I build around the gear you&apos;ve actually got, the time you&apos;ve actually got, and whatever
          your shoulder is complaining about this week. Nobody gets a plan off a shelf.
        </Text>
        <Text style={styles.introBody}>
          And I pay attention. When you&apos;ve earned more weight on the bar, I&apos;ll be the one to tell
          you.
        </Text>
        <Text style={styles.introSmall}>
          Everything I write lands in your builder first. You change whatever you want before it&apos;s
          yours.
        </Text>
      </ScrollView>
      <View style={styles.footer}>
        <Button variant="primary" fullWidth onPress={onDone}>
          Let&apos;s go
        </Button>
      </View>
    </>
  );
}

/* ── ACKNOWLEDGEMENT ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Half a second where Holt answers you.
 *
 * The cheapest thing in the whole flow and it does more for the feel than any card treatment: the screen
 * stops being a form the moment something responds to what you said.
 */
function Acknowledgement({ label, line }: { label: string; line: string }) {
  return (
    <View style={styles.ackWrap}>
      <View style={styles.ackChosen}>
        <Text style={styles.ackLabel}>{label}</Text>
        <Text style={styles.ackTick}>✓</Text>
      </View>
      <Text style={styles.ackLine}>{line}</Text>
    </View>
  );
}

/* ── QUESTIONS ───────────────────────────────────────────────────────────────────────────────────── */

interface StepState {
  goal: Goal | null;
  daysPerWeek: number | null;
  style: SplitStyle | null;
  focusKind: 'split' | 'body_parts' | null;
  split: SplitName | null;
  parts: BodyPart[];
  environment: Environment;
  pickedGear: string[] | null;
  raceWeeks: number | null;
  weeklyMi: number | null;
  canRun: boolean | null;
  resultMi: number | null;
  resultTime: string;
  sessionMinutes: SessionMinutes | null;
  experience: Experience | null;
  limitations: Limitation[];
  ownedCount: number;
}

interface StepSetters {
  setGoal: (g: Goal) => void;
  setDaysPerWeek: (n: number) => void;
  setStyle: (s: SplitStyle | null) => void;
  setFocusKind: (k: 'split' | 'body_parts') => void;
  setSplit: (s: SplitName) => void;
  setParts: React.Dispatch<React.SetStateAction<BodyPart[]>>;
  setEnvironment: (e: Environment) => void;
  setPickedGear: React.Dispatch<React.SetStateAction<string[] | null>>;
  setRaceWeeks: (n: number) => void;
  setWeeklyMi: (n: number) => void;
  setCanRun: (b: boolean) => void;
  setResultMi: (n: number | null) => void;
  setResultTime: (t: string) => void;
  setSessionMinutes: (m: SessionMinutes) => void;
  setExperience: (e: Experience) => void;
  setLimitations: React.Dispatch<React.SetStateAction<Limitation[]>>;
}

/** Holt's replies. Deliberately not one for every answer — see the note on `Acknowledgement`. */
const DAYS_ACK: Record<number, string> = {
  2: "Two it is. We'll make both of them count.",
  3: 'Three is plenty to work with.',
  4: 'Good. Four gives me room to build this properly.',
  5: 'Five. You mean it, then.',
  6: "Six. I'll keep each one short so you can actually recover.",
};

const TIME_ACK: Record<number, string> = {
  30: "Tight, but workable. I'll cut straight to what matters.",
  45: 'Enough for the real work and a bit either side.',
  60: "That's enough room to build this properly.",
  75: 'Good. We can be thorough.',
};

const EXPERIENCE_ACK: Record<Experience, string> = {
  beginner: 'Then we start with the movements, not the numbers.',
  intermediate: 'Good — you know what a hard set feels like.',
  advanced: "Right. I won't waste your time with beginner progressions.",
};

function Step({
  step,
  state,
  set,
  answer,
  onFinish,
}: {
  step: StepId;
  state: StepState;
  set: StepSetters;
  answer: (apply: () => void, ackLabel?: string, line?: string) => void;
  onFinish: () => void;
}) {
  switch (step) {
    case 'goal':
      return (
        <Question ask="What are we working toward?">
          {AUTHORED_GOALS.map((g) => (
            <Row
              key={g}
              label={GOAL_LABEL[g]}
              on={state.goal === g}
              onPress={() => answer(() => set.setGoal(g))}
            />
          ))}
        </Question>
      );

    case 'race_when':
      return (
        <Question
          ask="When's the race?"
          hint="Roughly is fine. I build the block backwards from it, so this decides everything else."
        >
          {RACE_WHEN.map((r) => (
            <Row
              key={r.weeks}
              label={r.label}
              on={state.raceWeeks === r.weeks}
              onPress={() => answer(() => set.setRaceWeeks(r.weeks))}
            />
          ))}
        </Question>
      );

    case 'race_base':
      return (
        <Question
          ask="What are you running in a normal week right now?"
          hint="Be honest. I'd rather start you lower and get you there than start you where you'd like to be."
        >
          {MILEAGE_BANDS.map((b) => (
            <Row
              key={b.label}
              label={b.label}
              on={state.weeklyMi === b.value}
              onPress={() => answer(() => set.setWeeklyMi(b.value))}
            />
          ))}
        </Question>
      );

    case 'race_can_run':
      return (
        <Question
          ask="Can you run for twenty minutes without stopping?"
          hint="No is a perfectly good answer — it just changes where we start."
        >
          <BigOption
            title="Yes"
            sub="I can hold a steady twenty minutes."
            on={state.canRun === true}
            onPress={() => answer(() => set.setCanRun(true))}
          />
          <BigOption
            title="Not yet"
            sub="We'll build it with run/walk intervals. It works, and it's how most people start."
            on={state.canRun === false}
            onPress={() => answer(() => set.setCanRun(false))}
          />
        </Question>
      );

    case 'race_result':
      return (
        <Question
          ask="Raced recently?"
          hint="Give me a time from the last month or two and I'll write your actual paces. Skip it and I'll describe the effort instead — I won't guess a number."
        >
          <Chips
            options={RESULT_DISTANCES.map((d) => ({ value: String(d.mi), label: d.label }))}
            selected={state.resultMi != null ? [String(state.resultMi)] : []}
            onPress={(v) => set.setResultMi(state.resultMi === Number(v) ? null : Number(v))}
          />
          {state.resultMi != null ? (
            <TextInput
              value={state.resultTime}
              onChangeText={set.setResultTime}
              placeholder="Time — 22:30, or 3:45:00"
              placeholderTextColor={flColor.gray600}
              keyboardType="numbers-and-punctuation"
              style={styles.timeInput}
              accessibilityLabel="Your time for that race"
            />
          ) : null}
          <View style={styles.cta}>
            <Button variant="primary" fullWidth onPress={() => answer(() => {})}>
              {state.resultMi != null && parseTime(state.resultTime) != null
                ? "That's my time"
                : 'Skip — describe the effort'}
            </Button>
          </View>
        </Question>
      );

    case 'days':
      return (
        <Question
          ask="How many days a week can you train?"
          hint="Be honest — I'd rather build three you'll hit than five you won't."
        >
          {[2, 3, 4, 5, 6].map((n) => (
            <Row
              key={n}
              label={`${n} days`}
              on={state.daysPerWeek === n}
              onPress={() =>
                answer(
                  () => {
                    set.setDaysPerWeek(n);
                    // A style that cannot be built at this many days must not survive the change.
                    set.setStyle(state.style && stylesForDays(n).includes(state.style) ? state.style : null);
                  },
                  `${n} days`,
                  DAYS_ACK[n],
                )
              }
            />
          ))}
        </Question>
      );

    case 'style': {
      const options = stylesForDays(state.daysPerWeek ?? 4);
      return (
        <Question ask="How do you want to train?">
          {options.map((s) => (
            <BigOption
              key={s}
              title={SPLIT_STYLE_LABEL[s]}
              sub={SPLIT_STYLE_BLURB[s]}
              on={state.style === s}
              onPress={() => answer(() => set.setStyle(s))}
            />
          ))}
          {/* Delegating to the coach is a real moment, so it carries Holt's mark rather than reading as
              "skip this question". */}
          <BigOption
            title="Choose for me"
            sub="I'll use your goal and your schedule to pick the best fit."
            holt
            onPress={() => answer(() => set.setStyle(null))}
          />
        </Question>
      );
    }

    case 'focus':
      return (
        <Question ask="What are we training today?">
          {SPLITS.map((s) => (
            <Row
              key={s}
              label={SPLIT_LABEL[s]}
              on={state.split === s && state.focusKind === 'split'}
              onPress={() =>
                answer(() => {
                  set.setSplit(s);
                  set.setFocusKind('split');
                })
              }
            />
          ))}
          <BigOption
            title="Pick the muscles"
            sub="Chest and triceps, back and biceps — whatever you're after."
            on={state.focusKind === 'body_parts'}
            onPress={() => answer(() => set.setFocusKind('body_parts'))}
          />
        </Question>
      );

    case 'muscles':
      return (
        <Question ask="Which ones?" hint="Pick as many as you like.">
          <Chips
            options={BODY_PARTS.map((p) => ({ value: p, label: BODY_PART_LABEL[p] }))}
            selected={state.parts}
            onPress={(p) => set.setParts((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]))}
          />
          <View style={styles.cta}>
            <Button
              variant="primary"
              fullWidth
              disabled={state.parts.length === 0}
              onPress={() => answer(() => {})}
            >
              That&apos;s it
            </Button>
          </View>
        </Question>
      );

    case 'where':
      return (
        <Question ask="Where are you training?">
          <BigOption
            title="Full Gym"
            sub="Full equipment access — barbells, machines, cables."
            on={state.environment === 'full_gym'}
            onPress={() =>
              answer(() => {
                set.setEnvironment('full_gym');
                set.setPickedGear(null);
              })
            }
          />
          <BigOption
            title="Home Gym"
            sub={
              state.ownedCount > 0
                ? `I'll use the ${state.ownedCount} pieces saved in your Home Gym.`
                : "Nothing saved yet — set your gear up in Home Gym and I'll be specific."
            }
            on={state.environment === 'home' && state.pickedGear == null}
            onPress={() =>
              answer(() => {
                set.setEnvironment('home');
                // Back to the profile as the source — otherwise a list named on a previous pass through
                // this question would silently keep overriding it.
                set.setPickedGear(null);
              })
            }
          />
          <BigOption
            title="Bodyweight Only"
            sub="No equipment. Travelling, a hotel room, or just today."
            on={state.environment === 'bodyweight'}
            onPress={() =>
              answer(() => {
                set.setEnvironment('bodyweight');
                set.setPickedGear(null);
              })
            }
          />
          {/* The middle ground, and the commonest real answer — a garage with three things in it is
              neither a full gym nor a bare floor. Choosing it inserts the gear step (see `gearStep`). */}
          <BigOption
            title="Limited Equipment"
            sub="Tell me exactly what you have and I'll build around it."
            on={state.pickedGear != null}
            onPress={() =>
              answer(() => {
                set.setEnvironment('home');
                // `[]` rather than null — it is what makes the gear step appear, and an empty list is
                // the honest starting point for a question nobody has answered yet.
                set.setPickedGear((g) => g ?? []);
              })
            }
          />
        </Question>
      );

    case 'gear':
      return (
        <Question ask="What have you got?" hint="Everything you can reach. Bodyweight is assumed — no need to say it.">
          {HOME_GYM_GROUPS.map((group) => {
            const items = HOME_GYM_EQUIPMENT.filter((e) => e.group === group);
            if (items.length === 0) return null;
            return (
              <View key={group} style={styles.gearGroup}>
                <Text style={styles.gearGroupLabel}>{group.toUpperCase()}</Text>
                <Chips
                  options={items.map((e) => ({ value: e.id, label: e.label }))}
                  selected={state.pickedGear ?? []}
                  onPress={(id) =>
                    set.setPickedGear((g) =>
                      (g ?? []).includes(id) ? (g ?? []).filter((x) => x !== id) : [...(g ?? []), id],
                    )
                  }
                />
              </View>
            );
          })}
          <View style={styles.cta}>
            <Button variant="primary" fullWidth onPress={() => answer(() => {})}>
              {(state.pickedGear ?? []).length > 0
                ? `That's it — ${(state.pickedGear ?? []).length} ${(state.pickedGear ?? []).length === 1 ? 'thing' : 'things'}`
                : 'Nothing but me and the floor'}
            </Button>
          </View>
        </Question>
      );

    case 'time':
      return (
        <Question ask="How long have you got in there?">
          {SESSION_LENGTHS.map((m) => (
            <Row
              key={m}
              label={m === 75 ? '75 minutes or more' : `${m} minutes`}
              on={state.sessionMinutes === m}
              onPress={() =>
                answer(() => set.setSessionMinutes(m), m === 75 ? '75+ minutes' : `${m} minutes`, TIME_ACK[m])
              }
            />
          ))}
        </Question>
      );

    case 'experience':
      return (
        <Question ask="How experienced are you?">
          {(
            [
              ['beginner', "I'm new to this"],
              ['intermediate', "I've been at it a while"],
              ['advanced', 'Years'],
            ] as const
          ).map(([value, label]) => (
            <Row
              key={value}
              label={label}
              on={state.experience === value}
              onPress={() => answer(() => set.setExperience(value), label, EXPERIENCE_ACK[value])}
            />
          ))}
        </Question>
      );

    case 'limits':
      return (
        <Question
          ask="Anything I should work around?"
          hint="Nothing here is a diagnosis — I'll just leave those movements out."
        >
          <Chips
            options={LIMITATIONS.map((l) => ({ value: l, label: LIMITATION_LABEL[l] }))}
            selected={state.limitations}
            onPress={(l) => set.setLimitations((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))}
          />
          <View style={styles.cta}>
            <Button variant="primary" fullWidth onPress={onFinish}>
              {state.limitations.length > 0 ? 'Build it' : 'Nothing — build it'}
            </Button>
          </View>
        </Question>
      );

    default:
      return null;
  }
}

/* ── PRIMITIVES ──────────────────────────────────────────────────────────────────────────────────── */

const Eyebrow = ({ children }: { children: React.ReactNode }) => <Text style={styles.eyebrow}>{children}</Text>;

function Question({ ask, hint, children }: { ask: string; hint?: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.question}>{ask}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.options}>{children}</View>
    </View>
  );
}

/** A compact answer. Two words do not need ninety points of card. */
function Row({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
    >
      <Text style={[styles.rowLabel, on && styles.rowLabelOn]}>{label}</Text>
      <Text style={[styles.chevron, on && styles.chevronOn]}>›</Text>
    </Pressable>
  );
}

/** An answer that needs explaining, so it earns the taller card. */
function BigOption({
  title,
  sub,
  on,
  holt,
  onPress,
}: {
  title: string;
  sub: string;
  on?: boolean;
  holt?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={({ pressed }) => [styles.big, on && styles.bigOn, pressed && styles.pressed]}
    >
      <View style={styles.bigHead}>
        <Text style={[styles.bigTitle, on && styles.bigTitleOn]}>{title}</Text>
        {holt ? <Text style={styles.holtMark}>H</Text> : null}
      </View>
      <Text style={styles.bigSub}>{sub}</Text>
    </Pressable>
  );
}

function Chips<T extends string>({
  options,
  selected,
  onPress,
}: {
  options: { value: T; label: string }[];
  selected: readonly T[];
  onPress: (v: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onPress(o.value)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── REVEAL ──────────────────────────────────────────────────────────────────────────────────────── */

interface Built {
  kind: 'program' | 'day';
  title: string;
  stats: string[];
  tag: string | null;
  why: string | null;
  restructured: string | null;
  days: { name: string; meta: string; items: { name: string; detail: string; coach?: string }[] }[];
  notes: string[];
  apply: () => Promise<void>;
}

/**
 * Where the whole thing pays off.
 *
 * The athlete answered six questions; this has to read as *"here is what I decided, and why"* rather than
 * as a list of exercise names. Hence the attribution line, the stat row, Holt's reasoning, and days that
 * are numbered and counted so the SHAPE is legible before any single movement is.
 */
function Reveal({
  built,
  busy,
  onApply,
  onAdjust,
  onRestart,
}: {
  built: Built;
  busy: boolean;
  onApply: () => void;
  onAdjust: () => void;
  onRestart: () => void;
}) {
  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Eyebrow>BUILT BY HOLT</Eyebrow>
        <Text style={styles.revealTitle}>{built.title}</Text>
        <View style={styles.statRow}>
          {built.stats.map((s) => (
            <Text key={s} style={styles.stat}>
              {s}
            </Text>
          ))}
        </View>
        {built.tag ? <Text style={styles.tag}>{built.tag.toUpperCase()}</Text> : null}

        {built.restructured ? (
          <View style={styles.restructure}>
            <Text style={styles.restructureHead}>I changed the split</Text>
            <Text style={styles.restructureBody}>{built.restructured}</Text>
          </View>
        ) : null}

        {built.why && !built.restructured ? (
          <View style={styles.why}>
            <Text style={styles.whyHead}>Why I built it this way</Text>
            <Text style={styles.whyBody}>{built.why}</Text>
          </View>
        ) : null}

        {built.kind === 'program' ? <Text style={styles.sectionLabel}>WEEK ONE</Text> : null}

        {built.days.map((d, i) => (
          <View key={`${d.name}-${i}`} style={styles.dayCard}>
            <View style={styles.dayHead}>
              <Text style={styles.dayName}>
                {built.kind === 'program' ? `${String(i + 1).padStart(2, '0')} · ` : ''}
                {d.name.toUpperCase()}
              </Text>
              <Text style={styles.dayMeta}>{d.meta}</Text>
            </View>
            {d.items.map((it, j) => (
              <View key={`${it.name}-${j}`} style={styles.item}>
                <Text style={styles.itemName}>{it.name}</Text>
                {it.detail ? <Text style={styles.itemDetail}>{it.detail}</Text> : null}
                {it.coach ? <Text style={styles.itemCoach}>{it.coach}</Text> : null}
              </View>
            ))}
          </View>
        ))}

        {built.notes.map((n) => (
          <Text key={n} style={styles.note}>
            {n}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="primary" fullWidth disabled={busy} onPress={onApply}>
          Final touches
        </Button>
        <Button variant="secondary" fullWidth disabled={busy} onPress={onAdjust}>
          Adjust with Holt
        </Button>
        {/* Quiet and tertiary on purpose — starting over is the rare choice, not a peer of the other two. */}
        <Pressable accessibilityRole="button" onPress={onRestart} style={styles.tertiary}>
          <Text style={styles.tertiaryText}>Start over</Text>
        </Pressable>
      </View>
    </>
  );
}

/**
 * The learned-preference line, if one actually landed in the built plan (CL-D2).
 *
 * Reads the catalogue keys the assembler CHOSE rather than the ones it was told to favour, so the
 * sentence can only ever name a movement that is genuinely in the program.
 */
function learnedLine(learned: LearnedPreferences, structure: ProgramStructure): string[] {
  const keys: string[] = [];
  for (const slot of scheduleSlots(structure)) {
    for (const ex of slot.day?.main ?? []) if (ex.catalogKey) keys.push(ex.catalogKey);
  }
  const said = appliedSentence(learned, keys, (k) => itemByKey(k)?.name ?? k);
  return said ? [said] : [];
}

function droppedLine(notes: readonly { kind: string; wanted: string }[]): string[] {
  const dropped = [...new Set(notes.filter((n) => n.kind === 'dropped').map((n) => n.wanted))];
  return dropped.length > 0
    ? [`Nothing you've got trains ${dropped.join(' or ').toLowerCase()} — left it out rather than fake it.`]
    : [];
}

/**
 * Holt reached past the level the athlete told us they were, because their level held nothing for that
 * movement — see `STRETCH_CEILING` in `domain/coach/candidates.ts`.
 *
 * ⚠ ONE SENTENCE, NOT ONE PER SLOT. The stretch is normal in a home gym — a beginner with dumbbells hits
 * it on pressing, rowing and curling at once — and three lines saying the same thing reads as the plan
 * apologising for itself. It names the movements so the claim is checkable, and says the thing that
 * actually matters: these are still the right movements, start light.
 */
function stretchedLine(notes: readonly { kind: string; got?: string }[]): string[] {
  const got = [...new Set(notes.filter((n) => n.kind === 'stretched').map((n) => n.got).filter(Boolean))];
  if (got.length === 0) return [];
  const named = got.length <= 3 ? got.join(', ') : `${got.slice(0, 3).join(', ')} and ${got.length - 3} more`;
  return [`A few of these — ${named} — sit a step above where you said you're starting. They're the right movements for what you've got; take the weight light for the first week.`];
}

/* ── STYLE ───────────────────────────────────────────────────────────────────────────────────────── */
/*
 * ONE RULE, held everywhere: white is information, grey is explanation, bronze is Holt and the decision
 * you just made. Nothing else takes bronze, which is what keeps it meaning something.
 */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  working: { fontSize: 13, color: flColor.gray600 },
  scroll: { padding: 20, paddingBottom: 40, gap: 10 },
  pressed: { opacity: 0.86 },

  eyebrow: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    lineHeight: 15,
    color: flColor.bronze400,
    marginBottom: 6,
  },
  chapter: { color: flColor.gray600, letterSpacing: 1.4 },

  question: { fontFamily: flFont.display, fontSize: 24, lineHeight: 32, color: flColor.cream100 },
  hint: { fontSize: 13.5, lineHeight: 20, color: flColor.gray600, marginTop: 6 },
  options: { gap: 8, marginTop: 16 },

  // Compact — the size two words deserve.
  row: {
    height: 64,
    paddingHorizontal: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  rowLabel: { fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  rowLabelOn: { color: flColor.bronze300 },
  chevron: { fontSize: 20, color: flColor.gray600 },
  chevronOn: { color: flColor.bronze300 },

  // Taller — earned by having something to explain.
  big: {
    padding: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    gap: 6,
  },
  bigOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  bigHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2, color: flColor.cream100 },
  bigTitleOn: { color: flColor.bronze300 },
  bigSub: { fontSize: 13, lineHeight: 19, color: flColor.gray600 },
  holtMark: { fontFamily: flFont.display, fontSize: 15, color: flColor.bronze400 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  chipTextOn: { color: flColor.bronze300 },

  cta: { marginTop: 18 },

  /* Quiet by construction — recessed surface, no bronze on the card itself. It is context for the two
     choices above it, not a third one. */
  knows: {
    marginTop: 22,
    padding: 14,
    gap: 6,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    backgroundColor: flColor.surfaceRecessed,
  },
  knowsHead: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, color: flColor.gray600 },
  knowsBody: { fontSize: 14, lineHeight: 21, color: flColor.gray400 },
  knowsChange: { alignSelf: 'flex-start', paddingVertical: 6 },
  knowsChangeText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },

  timeInput: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    color: flColor.cream100,
    fontSize: 16,
  },
  gearGroup: { gap: 8, marginTop: 6 },
  gearGroupLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: flColor.gray600 },

  ackWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  ackChosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  ackLabel: { fontSize: 17, fontWeight: '700', color: flColor.bronze300 },
  ackTick: { fontSize: 16, color: flColor.bronze300 },
  ackLine: { fontSize: 15.5, lineHeight: 23, color: flColor.gray400, textAlign: 'center' },

  introScroll: { padding: 24, paddingTop: 32, gap: 16 },
  introName: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100 },
  introBody: { fontSize: 15.5, lineHeight: 24, color: flColor.gray400 },
  introSmall: { fontSize: 13, lineHeight: 20, color: flColor.gray600, marginTop: 6 },

  revealTitle: { fontFamily: flFont.display, fontSize: 25, lineHeight: 32, color: flColor.cream100 },
  statRow: { flexDirection: 'row', gap: 14, marginTop: 2 },
  stat: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: flColor.gray400,
  },
  tag: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.1, color: flColor.bronze400, marginTop: 2 },

  why: { marginTop: 14, gap: 6 },
  whyHead: { fontSize: 14.5, fontWeight: '700', color: flColor.cream100 },
  whyBody: { fontSize: 14, lineHeight: 22, color: flColor.gray400 },

  restructure: {
    marginTop: 14,
    padding: 14,
    gap: 6,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  restructureHead: { fontSize: 14.5, fontWeight: '700', color: flColor.bronze300 },
  restructureBody: { fontSize: 14, lineHeight: 22, color: flColor.gray400 },

  sectionLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.gray600,
    marginTop: 18,
  },

  dayCard: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    backgroundColor: flColor.surfaceRecessed,
    overflow: 'hidden',
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  dayName: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1.1, color: flColor.bronze400 },
  dayMeta: { fontSize: 11, color: flColor.gray600 },
  item: { paddingHorizontal: 14, paddingVertical: 9, gap: 2 },
  itemName: { fontSize: 14.5, color: flColor.cream100 },
  itemDetail: { fontSize: 12, color: flColor.gray600 },
  itemCoach: { fontSize: 12.5, lineHeight: 18, color: flColor.bronze300, marginTop: 2 },

  note: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600, marginTop: 4 },
  error: { fontSize: 15, lineHeight: 23, color: flColor.bronze300, textAlign: 'center' },

  footer: {
    padding: 18,
    paddingBottom: 22,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  tertiary: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  tertiaryText: { fontSize: 12.5, letterSpacing: 0.2, color: flColor.gray600 },
});
