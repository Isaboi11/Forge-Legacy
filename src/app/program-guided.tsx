/**
 * ══ BUILD MY OWN — THE GUIDED LANE ══
 *
 * One question per screen, each with an answer already in it, ending on a real program. This is the
 * door a first-timer takes from Workouts; `program-builder.tsx` — every control on one dense screen —
 * is the door everyone else takes, and it stays exactly where it was.
 *
 * ══ ⚠ WHY THIS IS NOT COACH HOLT, WHICH ALREADY HAS A WIZARD ══
 *
 * `app/coach.tsx` is a one-question-per-screen intake too, and it calls the same `assemble()` this file
 * calls. It is not the same product. Holt's wizard is Holt BUILDING FOR YOU — his voice, his
 * recommendation, his restructure note when he overrides your split. This is the athlete building their
 * own, with the engine used as a filling tool and never as an author. PO, 2026-09-20: *"If they say
 * they'll build one I don't want it to go through coach holt, it should do the program build screens we
 * just built."* Same engine, different promise, and the promise is the product.
 *
 * ══ ⚠ OFFERED, NEVER SUBSTITUTED ══
 *
 * `Onboarding-Amendment-002` (LOCKED) guarantees an express lane: *"Build-your-own and browse are the
 * express lane — a confident athlete reaches a program with zero questions."* So every step carries the
 * escape to the full builder, and Workouts keeps pointing at `program-builder` for anyone who wants it.
 * A guided flow that cannot be left is a gate, which `ONB-A3-D7` forbids in the same breath it forbade
 * a Home takeover.
 *
 * ══ ⚠ THE ENGINE IS PURE, SO THE PREVIEW IS FREE ══
 *
 * `assemble()` touches no network (`domain/coach/**` imports no Supabase, by rule). It is therefore
 * recomputed inline from the answers rather than built by a "Build" button, which is what lets the name
 * step arrive pre-filled and the review step show real exercises before anything is saved. The only
 * network in this file is the save itself.
 *
 * ⚠ NO `setState` IN AN EFFECT ANYWHERE HERE. This project's react-compiler lint ERRORS on it, and the
 *   seeded-name case is exactly where it is tempting: `effName` is derived inline (`name ?? generated`)
 *   the same way `coach.tsx` derives `effGoal` from the profile.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenBoundary } from '@/components/screen-boundary';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { createProgram, startProgram } from '@/data/programs-live';
import { fetchCoachProfile, EMPTY_COACH_PROFILE } from '@/data/coach-profile-live';
import { fetchBriefing, saveBriefing } from '@/data/settings-live';
import { assemble } from '@/domain/coach/assemble';
import {
  GOAL_LABEL,
  STRENGTH_GOALS,
  type Environment,
  type Experience,
  type Goal,
  type SessionMinutes,
} from '@/domain/coach/constraints';
import {
  SPLIT_STYLE_BLURB,
  SPLIT_STYLE_LABEL,
  defaultWeeksFor,
  stylesForDays,
  type SplitStyle,
} from '@/domain/coach/rulebook/skeletons';
import { PICKER_DB } from '@/domain/exercise-picker/data';
import { canDoExercise } from '@/domain/home-gym/equipment';
import { dayLines } from '@/domain/onboarding/first-week';
import { DAY_LABELS, ISO_DAYS, type IsoDay } from '@/domain/settings/briefing';
import {
  GUIDED_MAX_WEEKS,
  GUIDED_MIN_WEEKS,
  clampWeeks,
  dayCountOptions,
  daysBlurb,
  remindDefault,
  stepsFor,
  weekPresets,
  type GuidedStep,
} from '@/domain/program/guided-steps';
import { draftFromStructure, makeDays, newDraft } from '@/lib/program-draft-model';
import { PHOTO_IMPORT_ENABLED } from '@/components/forge/ImportSpreadsheetSheet';
import { saveProgramDraft } from '@/lib/program-draft';
import { useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';

/**
 * ⚠ A MODULE CONSTANT AND NOT `[]` INLINE. `remind ?? []` allocated a fresh array on every render, so
 * the value the screen reads changed identity constantly even when the answer had not — which is what
 * react-compiler flags, and it is right to. One frozen empty array, reused.
 */
const NO_DAYS: readonly IsoDay[] = [];

/**
 * THE THREE WAYS IN — PO, 2026-09-21: *"there should be tabs after I click build my own that give me the
 * option to paste text, upload pictures, or build from scratch."*
 *
 * ⚠ PASTE AND PICTURES ARE NOT REBUILT HERE. Both already live in the one import sheet
 * (`ImportSpreadsheetSheet`), mounted by the full builder and opened on arrival by `?o=import`. These
 * tabs are doors to it, so there is still exactly one parser and one preview.
 *
 * ⚠ PICTURES FOLLOWS THE SHEET'S OWN FLAG. It is hidden until the photo reader's server half is live
 * (see `PHOTO_IMPORT_ENABLED`): a tab that fails on every tap is the Guideline 1.2 defect that flag
 * exists to prevent, so the tab appears the moment the flag flips and not before.
 */
type Source = 'scratch' | 'paste' | 'photo';
const SOURCES: { key: Source; label: string }[] = [
  { key: 'paste', label: 'Paste text' },
  ...(PHOTO_IMPORT_ENABLED ? [{ key: 'photo' as const, label: 'Upload pictures' }] : []),
  { key: 'scratch', label: 'From scratch' },
];

export default function ProgramGuidedScreen() {
  const router = useRouter();
  return (
    <ScreenBoundary name="The guided program builder" onBack={() => router.back()}>
      <Guided />
    </ScreenBoundary>
  );
}

function Guided() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  /* What onboarding already answered. A failed read resolves to the empty profile, which simply means
     one more question — never a guessed goal. See `coach-profile-live.ts`'s own header. */
  const profileQ = useQuery(fetchCoachProfile, []);
  const known = profileQ.data ?? EMPTY_COACH_PROFILE;
  const briefingQ = useQuery(fetchBriefing, []);

  const [source, setSource] = useState<Source>('scratch');
  const [index, setIndex] = useState(0);
  /**
   * "I'll build my own days" — PO, 2026-09-21: *"the days, the weeks, that's totally fine. But after
   * that I should be able to just say 'I'll build my own days' and be able to do one day at a time."*
   * Chosen on the style step, in place of a split; it hands a blank program of the chosen shape to the
   * Day Builder, which already walks Day A → the last day one at a time (`nextDayStop`).
   */
  const [ownDays, setOwnDays] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [weeks, setWeeks] = useState<number | null>(null);
  const [style, setStyle] = useState<SplitStyle | null>(null);
  const [remind, setRemind] = useState<IsoDay[] | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ⚠ ONLY THE STRENGTH GOALS ARE OFFERED, and that is the same refusal `first-week.ts` makes: a race
     plan is built backwards from a date this flow never asks for. Someone training for a marathon
     belongs in Holt's endurance flow, not handed a push/pull split. */
  const askGoal = known.goal == null;
  const effGoal: Goal | null = askGoal ? goal : known.goal;

  const steps = stepsFor({ askGoal });
  const step: GuidedStep | undefined = steps[index];

  const effWeeks = weeks ?? (effGoal ? defaultWeeksFor(effGoal) : 8);
  const legalStyles = days != null ? stylesForDays(days) : [];
  /* The suggested split is simply the first the rulebook says is buildable at this day count —
     `stylesForDays` already refuses the misshapen combinations (ppl at two days, body-part at two). */
  const effStyle: SplitStyle | null = style ?? legalStyles[0] ?? null;
  const effRemind: readonly IsoDay[] = remind ?? (days != null ? remindDefault(days) : NO_DAYS);

  /* ⚠ RECOMPUTED FROM THE ANSWERS, NOT BUILT BY A BUTTON. `assemble()` is a pure, synchronous function
     of its three arguments and reaches no database, so the cost of keeping the preview live is a
     `useMemo`. `learned`/`recent` are deliberately not fetched — they only add variety ranking, and
     onboarding's own first build skips them for the same reason. */
  const built = ((): ReturnType<typeof assemble> | null => {
    if (effGoal == null || days == null || effStyle == null) return null;
    const experience: Experience = known.experience ?? 'beginner';
    const environment: Environment = known.environment ?? 'full_gym';
    return assemble(
      {
        goal: effGoal,
        experience: { lifting: experience, running: experience },
        daysPerWeek: days,
        sessionMinutes: 60 as SessionMinutes,
        environment,
        ownedEquipment: known.ownedEquipment ?? [],
        limitations: [],
        excludeExercises: [],
        splitStyle: effStyle,
        weeks: effWeeks,
      },
      PICKER_DB,
      canDoExercise,
    );
  })();

  const structure = built?.ok ? built.assembly.structure : null;
  /* Derived, never seeded by an effect — the engine's own name is the default and the athlete types
     over it. `assemble` names the block itself (e.g. "8-Week Strength Block"). */
  const effName = name ?? structure?.name ?? '';

  const week1 = structure?.weekPlans?.[0]?.days ?? structure?.days ?? [];

  const canAdvance = (s: GuidedStep | undefined): boolean => {
    switch (s) {
      case 'goal':
        return effGoal != null;
      case 'days':
        return days != null;
      case 'weeks':
        return effWeeks >= GUIDED_MIN_WEEKS;
      case 'style':
        return ownDays || effStyle != null;
      case 'remind':
        return true; // skippable by design — reminders are an offer
      case 'name':
        return effName.trim().length > 0;
      case 'review':
        return structure != null;
      default:
        return false;
    }
  };

  const back = () => {
    if (index === 0) router.back();
    else setIndex((i) => i - 1);
  };

  /**
   * A blank program of exactly the shape they chose — `days` × `weeks`, every day empty — opened on Day A.
   *
   * ⚠ REPEAT MODE (`vary: false`), SO "ONE DAY AT A TIME" MEANS `days` DAYS, NOT `days × weeks`. The same
   * week runs every week, which is what "build my own days" asks for; the full builder's Customize
   * control is still there for anyone who wants a different Week 3.
   */
  const buildOwnDays = async () => {
    if (days == null) return;
    await saveProgramDraft({
      ...newDraft(),
      weeks: effWeeks,
      daysPerWeek: days,
      days: makeDays(days, []),
      openDay: 0,
    });
    router.replace('/program-builder');
  };

  const next = () => {
    if (step === 'style' && ownDays) {
      void buildOwnDays();
      return;
    }
    setIndex((i) => Math.min(steps.length - 1, i + 1));
  };

  /** Hand the finished answers to the dense builder instead of saving — the express lane, mid-flight. */
  const openInBuilder = async () => {
    if (!structure) {
      router.replace('/program-builder');
      return;
    }
    await saveProgramDraft(draftFromStructure({ ...structure, name: effName.trim() || structure.name }));
    router.replace('/program-builder');
  };

  const save = async () => {
    if (!structure) return;
    setSaving(true);
    setError(null);
    try {
      const named = { ...structure, name: effName.trim() || structure.name };
      const { id } = await createProgram(named);
      await startProgram(id);
      /* ⚠ REMINDERS ARE A SEPARATE WRITE AND A SOFT ONE. `briefing_schedule` is when the briefing
         FIRES, never when the athlete trains (migration `0159` states that rule in its own header), so
         a failure here must not cost them the program they just built. */
      if (effRemind.length > 0) {
        try {
          /* Copied, not passed: `BriefingSchedule.days` is mutable and `effRemind` is the screen's own
             frozen value — handing the array itself over would let a later caller edit it. */
          await saveBriefing({ days: [...effRemind], hour: briefingQ.data?.hour ?? 7 });
        } catch {
          showToast('Program saved. We couldn’t set the reminders — you can pick them in Settings.');
        }
      }
      router.replace(`/program/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save that program. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const stepNumber = index + 1;

  return (
    <View style={styles.screen}>
      {/* A sibling, not a wrapper — `ScreenBackground` paints behind and takes no children. */}
      <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(6,7,8,0.3)' }} />
      <AppBar title="Build a Program" onClose={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* The three ways in, on arrival only — once somebody is answering questions they have chosen. */}
        {index === 0 ? (
          <View style={styles.tabs} accessibilityRole="tablist">
            {SOURCES.map((t) => {
              const on = source === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setSource(t.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  style={[styles.tab, on ? styles.tabOn : null]}
                >
                  <Text style={[styles.tabText, on ? styles.tabTextOn : null]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {source !== 'scratch' ? (
          <Question
            title={source === 'paste' ? 'Paste your program' : 'Upload a picture of your program'}
            help={
              source === 'paste'
                ? 'From a spreadsheet, a notes app or an email. We read the days, exercises, sets and reps, and you check every line before anything is saved.'
                : 'A screenshot or photo of the table. We read it into text you can check and fix before anything is saved.'
            }
          >
            <Button
              variant="primary"
              fullWidth
              onPress={() => router.replace('/program-builder?o=import')}
            >
              {source === 'paste' ? 'Paste text' : 'Choose a picture'}
            </Button>
          </Question>
        ) : (
        <>
        <View style={styles.dots}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.dot, i === index ? styles.dotOn : i < index ? styles.dotDone : null]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>
          STEP {stepNumber} OF {steps.length}
        </Text>

        {step === 'goal' ? (
          <Question
            title="What are you training for?"
            help="This decides how much you do and how it builds over the weeks."
          >
            {STRENGTH_GOALS.map((g) => (
              <Choice
                key={g}
                title={GOAL_LABEL[g]}
                selected={effGoal === g}
                onPress={() => setGoal(g)}
              />
            ))}
          </Question>
        ) : null}

        {step === 'days' ? (
          <Question
            title="How many days a week can you train?"
            help="Be honest about a normal week, not your best one. You can change this later."
          >
            {dayCountOptions().map((n) => (
              <Choice
                key={n}
                lead={String(n)}
                title={n === 1 ? 'One day' : `${['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'][n]} days`}
                sub={daysBlurb(n)}
                tag={n === 3 ? 'Suggested' : undefined}
                selected={days === n}
                onPress={() => {
                  setDays(n);
                  /* ⚠ A STYLE THAT NO LONGER FITS MUST NOT SURVIVE THE DAY CHANGE. Push/pull/legs is
                     legal at three days and not at two; leaving it set would send an illegal pair into
                     `assemble`, which silently falls back to the goal default and builds something the
                     athlete never chose. */
                  if (style != null && !stylesForDays(n).includes(style)) setStyle(null);
                }}
              />
            ))}
          </Question>
        ) : null}

        {step === 'weeks' ? (
          <Question
            title="How many weeks should it run?"
            help="This is how long before you'd step back and reassess — not a commitment."
          >
            {weekPresets().map((w) => (
              <Choice
                key={w}
                lead={String(w)}
                title={`${w} weeks`}
                sub={
                  w === 4
                    ? 'A short block, to see if you like it'
                    : w === 8
                      ? 'Long enough for the weights to move'
                      : 'A full training block'
                }
                tag={w === 8 ? 'Suggested' : undefined}
                selected={effWeeks === w}
                onPress={() => setWeeks(w)}
              />
            ))}
            {/* ⚠ THE PRESETS ARE A SHORTCUT, NEVER A CEILING — PO, 2026-09-20. Six weeks around a
                holiday and ten to hit a date are both real answers, and a suggestion that is also a
                limit stops being help. The engine clamps to the same 1–52 the dense builder offers. */}
            <Text style={styles.microLabel}>Or set your own</Text>
            <View style={styles.stepper}>
              <StepBtn
                label="One week fewer"
                sign="−"
                disabled={effWeeks <= GUIDED_MIN_WEEKS}
                onPress={() => setWeeks(clampWeeks(effWeeks - 1))}
              />
              <Text style={styles.stepperText}>
                <Text style={styles.stepperValue}>{effWeeks}</Text> {effWeeks === 1 ? 'week' : 'weeks'}
              </Text>
              <StepBtn
                label="One week more"
                sign="+"
                disabled={effWeeks >= GUIDED_MAX_WEEKS}
                onPress={() => setWeeks(clampWeeks(effWeeks + 1))}
              />
            </View>
            {days != null ? (
              <Text style={styles.hint}>
                {effWeeks * days} {effWeeks * days === 1 ? 'workout' : 'workouts'} in total
              </Text>
            ) : null}
          </Question>
        ) : null}

        {step === 'style' ? (
          <Question
            title="What's each session for?"
            help="Not sure? Take the suggestion — it's the one that fits the days you picked."
          >
            {legalStyles.map((s, i) => (
              <Choice
                key={s}
                title={SPLIT_STYLE_LABEL[s]}
                sub={SPLIT_STYLE_BLURB[s]}
                tag={i === 0 ? 'Suggested' : undefined}
                selected={!ownDays && effStyle === s}
                onPress={() => {
                  setStyle(s);
                  setOwnDays(false);
                }}
              />
            ))}
            <Choice
              title="I’ll build my own days"
              sub={days != null ? `${days} empty days. You fill them in, one at a time.` : 'You fill in each day, one at a time.'}
              selected={ownDays}
              onPress={() => setOwnDays(true)}
            />
          </Question>
        ) : null}

        {step === 'remind' ? (
          <Question
            title="Which days suit you?"
            help="Only used to remind you. Your program follows your training, not the calendar."
          >
            <View style={styles.chips}>
              {ISO_DAYS.map((d) => {
                const on = effRemind.includes(d);
                return (
                  <Pressable
                    key={d}
                    onPress={() =>
                      setRemind(on ? effRemind.filter((x) => x !== d) : [...effRemind, d].sort((a, b) => a - b))
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={DAY_LABELS[d]}
                    style={[styles.chip, on ? styles.chipOn : null]}
                  >
                    <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{DAY_LABELS[d].slice(0, 1)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {/* The one line that keeps the whole sequential model intact in the athlete's head. */}
            <View style={styles.reassure}>
              <Text style={styles.reassureHead}>Miss one? Nothing happens.</Text>
              <Text style={styles.reassureBody}>
                Your next session stays your next session, however long you leave it.
              </Text>
            </View>
            <Pressable onPress={() => setRemind([])} accessibilityRole="button">
              <Text style={styles.quiet}>Don’t remind me — I’ll open it when I train</Text>
            </Pressable>
          </Question>
        ) : null}

        {step === 'name' ? (
          <Question title="Give it a name" help={`You'll see this at the top of Home for the next ${effWeeks} weeks.`}>
            <TextInput
              value={effName}
              onChangeText={setName}
              maxLength={40}
              placeholder={structure?.name ?? 'My program'}
              placeholderTextColor={flColor.gray600}
              accessibilityLabel="Program name"
              style={styles.nameField}
            />
          </Question>
        ) : null}

        {step === 'review' ? (
          <Question title="Here's your program" help="Every session, built from your answers. Change anything before you save.">
            {built && !built.ok ? <Text style={styles.error}>{built.refusal.message}</Text> : null}
            {built?.ok && built.assembly.restructured?.because ? (
              <View style={styles.reassure}>
                <Text style={styles.reassureHead}>We changed the split</Text>
                <Text style={styles.reassureBody}>{built.assembly.restructured.because}</Text>
              </View>
            ) : null}
            {structure ? (
              <>
                <Text style={styles.summary}>
                  {structure.weeks * structure.daysPerWeek} sessions · {structure.daysPerWeek} a week ·{' '}
                  {structure.weeks} weeks
                </Text>
                {week1.map((d) => (
                  <View key={d.letter} style={styles.dayCard}>
                    <Text style={styles.dayName}>
                      {d.letter} · {d.name}
                    </Text>
                    {/* ⚠ `dayLines` AND NOT `main.map(e => e.name)` — a cardio finisher has no `name`
                        field at all and renders as a blank row. That helper is the one tested place
                        that handles both shapes. */}
                    {dayLines(d.main).map((line, i) => (
                      <Text key={`${d.letter}-${i}`} style={styles.dayLine}>
                        {line}
                      </Text>
                    ))}
                  </View>
                ))}
              </>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Question>
        ) : null}
        </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        {step === 'review' ? (
          <>
            <Button variant="primary" fullWidth onPress={save} disabled={saving || structure == null}>
              {saving ? 'Saving…' : 'Save and start'}
            </Button>
            <Pressable onPress={() => void openInBuilder()} accessibilityRole="button">
              <Text style={styles.quiet}>Change exercises in the full builder</Text>
            </Pressable>
          </>
        ) : source !== 'scratch' ? null : (
          <>
            <Button variant="primary" fullWidth onPress={next} disabled={!canAdvance(step)}>
              {step === 'style' && ownDays ? 'Build my days' : 'Continue'}
            </Button>
            {/* The express lane, reachable from every step — `Onboarding-Amendment-002`. */}
            <Pressable onPress={() => router.replace('/program-builder')} accessibilityRole="button">
              <Text style={styles.quiet}>I’ll set it up myself</Text>
            </Pressable>
          </>
        )}
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backLink}>{index === 0 ? 'Cancel' : 'Back'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// PIECES
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

function Question({ title, help, children }: { title: string; help: string; children: React.ReactNode }) {
  return (
    <View style={styles.question}>
      <Text style={styles.qTitle}>{title}</Text>
      <Text style={styles.qHelp}>{help}</Text>
      <View style={styles.qBody}>{children}</View>
    </View>
  );
}

function Choice({
  lead,
  title,
  sub,
  tag,
  selected,
  onPress,
}: {
  lead?: string;
  title: string;
  sub?: string;
  tag?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={sub ? `${title}. ${sub}` : title}
      style={[styles.choice, selected ? styles.choiceOn : null]}
    >
      {lead ? <Text style={[styles.choiceLead, selected ? styles.choiceLeadOn : null]}>{lead}</Text> : null}
      <View style={styles.choiceMain}>
        <Text style={styles.choiceTitle}>{title}</Text>
        {sub ? <Text style={styles.choiceSub}>{sub}</Text> : null}
      </View>
      {tag ? <Text style={styles.tag}>{tag}</Text> : null}
    </Pressable>
  );
}

function StepBtn({
  label,
  sign,
  disabled,
  onPress,
}: {
  label: string;
  sign: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.stepBtn, disabled ? styles.stepBtnOff : null]}
    >
      <Text style={styles.stepSign}>{sign}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  tabs: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    marginBottom: 18,
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: flRadius.sm, alignItems: 'center' },
  tabOn: { backgroundColor: flColor.charcoal600 },
  tabText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  tabTextOn: { color: flColor.cream100 },
  dots: { flexDirection: 'row', gap: 6, paddingBottom: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: flColor.charcoal600 },
  dotOn: { backgroundColor: flColor.bronze400 },
  dotDone: { backgroundColor: flColor.bronzeSolid },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.3,
    color: flColor.gray600,
    marginBottom: 14,
  },

  question: { gap: 8 },
  qTitle: { fontFamily: flFont.display, fontSize: 25, fontWeight: '600', letterSpacing: -0.3, color: flColor.cream100 },
  qHelp: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  qBody: { gap: 10, marginTop: 10 },

  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  choiceOn: { borderColor: flColor.bronze400, backgroundColor: flColor.charcoal700 },
  choiceLead: {
    fontFamily: flFont.display,
    fontSize: 27,
    fontWeight: '600',
    color: flColor.gray600,
    width: 34,
  },
  choiceLeadOn: { color: flColor.bronze300 },
  choiceMain: { flex: 1, minWidth: 0 },
  choiceTitle: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  choiceSub: { fontSize: 12, lineHeight: 17, color: flColor.gray600, marginTop: 3 },
  tag: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: flColor.bronze400,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
    overflow: 'hidden',
  },

  microLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: flColor.gray600,
    marginTop: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 6,
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  stepBtn: {
    width: 48,
    height: 44,
    borderRadius: flRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.charcoal700,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  stepBtnOff: { opacity: 0.3 },
  stepSign: { fontSize: 21, lineHeight: 24, color: flColor.bronze400 },
  stepperText: { flex: 1, textAlign: 'center', fontSize: 13, color: flColor.gray400 },
  stepperValue: { fontFamily: flFont.display, fontSize: 23, color: flColor.cream100 },
  hint: { fontSize: 12, color: flColor.gray600, textAlign: 'center' },

  chips: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: flRadius.sm,
    alignItems: 'center',
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  chipOn: { backgroundColor: flColor.bronzeSolid, borderColor: flColor.bronzeSolid },
  chipText: { fontSize: 13, fontWeight: '700', color: flColor.gray600 },
  chipTextOn: { color: flColor.onBronze },

  reassure: {
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
    borderRadius: flRadius.md,
    padding: 13,
    gap: 4,
  },
  reassureHead: { fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  reassureBody: { fontSize: 12, lineHeight: 17, color: flColor.gray400 },

  nameField: {
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal800,
    paddingHorizontal: 14,
    paddingVertical: 15,
    fontFamily: flFont.display,
    fontSize: 19,
    color: flColor.cream100,
  },

  summary: { fontSize: 12.5, color: flColor.gray400 },
  dayCard: {
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    padding: 13,
    gap: 4,
  },
  dayName: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100, marginBottom: 3 },
  dayLine: { fontSize: 12.5, color: flColor.gray400 },

  error: { fontSize: 12.5, lineHeight: 18, color: flColor.dangerText },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.surfaceNav,
  },
  quiet: { textAlign: 'center', fontSize: 12.5, fontWeight: '600', color: flColor.bronze400, paddingVertical: 4 },
  backLink: { textAlign: 'center', fontSize: 12.5, color: flColor.gray600, paddingVertical: 2 },
});
