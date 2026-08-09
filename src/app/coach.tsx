import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { fetchHomeGym } from '@/data/home-gym-live';
import { fetchRecentSetsFor } from '@/data/coach-live';
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
  type Limitation,
  type SessionMinutes,
} from '@/domain/coach/constraints';
import { progressionFor } from '@/domain/coach/progression';
import { rationaleFor } from '@/domain/coach/rulebook/rationale';
import {
  AUTHORED_GOALS,
  SPLIT_STYLE_BLURB,
  SPLIT_STYLE_LABEL,
  stylesForDays,
  type SplitStyle,
} from '@/domain/coach/rulebook/skeletons';
import { canDoExercise, HOME_GYM_EQUIPMENT, HOME_GYM_GROUPS } from '@/domain/home-gym/equipment';
import { itemByKey, PICKER_DB } from '@/domain/exercise-picker/data';
import { draftFromStructure, saveProgramDraft } from '@/lib/program-draft';
import { saveWorkoutDraft } from '@/lib/workout-builder-draft';
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
 * is assembled slot by slot from the visible 721-exercise catalogue against this athlete's own equipment,
 * and the same answers produce the same plan every time.
 */

const INTRO_SEEN_KEY = 'forge_coach_intro_seen_v1';
const ACK_MS = 620;

type Mode = 'program' | 'day';
type StepId =
  | 'goal'
  | 'days'
  | 'style'
  | 'focus'
  | 'muscles'
  | 'where'
  | 'gear'
  | 'time'
  | 'experience'
  | 'limits';

export default function CoachScreen() {
  const router = useRouter();
  const gym = useQuery(fetchHomeGym, []);

  const [intro, setIntro] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(INTRO_SEEN_KEY)
      .then((v) => setIntro(v == null))
      .catch(() => setIntro(false));
  }, []);

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
  const [environment, setEnvironment] = useState<Environment>('full_gym');
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

  const [built, setBuilt] = useState<Built | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const owned = pickedGear ?? gym.data ?? [];

  // The gear step only exists once the athlete has said they want to name their equipment. Inserting it
  // straight after `where` means answering that question walks onto it, and changing the answer walks
  // back off — no index bookkeeping either way.
  const gearStep: StepId[] = pickedGear != null ? ['gear'] : [];
  const steps: StepId[] =
    mode === 'program'
      ? ['goal', 'days', 'style', 'where', ...gearStep, 'time', 'experience', 'limits']
      : focusKind === 'body_parts'
        ? ['focus', 'muscles', 'where', ...gearStep, 'time', 'experience', 'limits']
        : ['focus', 'where', ...gearStep, 'time', 'experience', 'limits'];

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
      if (mode === 'program') {
        const res = assemble(
          {
            goal: goal!,
            experience: { lifting: experience!, running: experience! },
            daysPerWeek: daysPerWeek!,
            sessionMinutes: sessionMinutes!,
            environment,
            ownedEquipment: owned,
            limitations,
            excludeExercises: [],
            splitStyle: style,
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
          tag: GOAL_LABEL[goal!],
          why: rationaleFor({
            goal: goal!,
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
          notes: droppedLine(notes),
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
            experience: experience!,
            environment,
            ownedEquipment: owned,
            limitations,
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
        const history = await fetchRecentSetsFor(res.day.main.map((e) => e.name));
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
                  experience: experience!,
                  prescription: { sets: e.sets ?? 3, reps: e.reps ?? 8, repsMax: e.repsMax ?? null },
                  history: history.get(e.name) ?? [],
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

  return (
    <View style={styles.root}>
      <AppBar title="Coach Holt" serif onClose={() => router.back()} onBack={showBack ? back : undefined} />

      {gym.loading || intro == null ? (
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
              onPress={() => {
                setMode('program');
                setStepIndex(0);
              }}
            />
            <BigOption
              title="Just today's workout"
              sub="One session. Tell me what you're training and I'll write it."
              onPress={() => {
                setMode('day');
                setStepIndex(0);
              }}
            />
          </View>
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
              environment,
              pickedGear,
              sessionMinutes,
              experience,
              limitations,
              // The profile's own count — the Home Gym card describes what is SAVED, not what a
              // limited-equipment answer is currently overriding it with.
              ownedCount: (gym.data ?? []).length,
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

function droppedLine(notes: readonly { kind: string; wanted: string }[]): string[] {
  const dropped = [...new Set(notes.filter((n) => n.kind === 'dropped').map((n) => n.wanted))];
  return dropped.length > 0
    ? [`Nothing you've got trains ${dropped.join(' or ').toLowerCase()} — left it out rather than fake it.`]
    : [];
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
