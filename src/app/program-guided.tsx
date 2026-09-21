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
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
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
  daysTitle,
  recommendedDays,
  remindDefault,
  stepsFor,
  weekPresets,
  type GuidedStep,
} from '@/domain/program/guided-steps';
import { draftFromStructure, makeDays, newDraft } from '@/lib/program-draft-model';
import { PHOTO_IMPORT_LIVE } from '@/components/forge/ImportSpreadsheetSheet';
import { usePremiumAi } from '@/lib/entitlement';
import { usePremiumGate } from '@/hooks/usePremiumGate';
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
 * THE THREE WAYS IN — "How do you want to start?", the first screen of the PO's mockup (2026-09-21).
 *
 * ⚠ PASTE AND PICTURES ARE NOT REBUILT HERE. Both already live in the one import sheet
 * (`ImportSpreadsheetSheet`: paste, PDF, and the photo reader), opened on arrival by
 * `/program-builder?o=import`. These cards are doors to it, so there is still one parser and one preview.
 *
 * ⚠ PICTURES FOLLOWS THE SHEET'S OWN RULE: the photo reader's server half is live AND the athlete holds
 * Premium AI (0203). Anyone else sees two cards, never a third that fails.
 */

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

  const premiumAi = usePremiumAi();
  const photoOn = PHOTO_IMPORT_LIVE && premiumAi;
  /* An import spends the one free import AND a program slot — both checked BEFORE the screen opens, the
     same two gates the builder's own import button runs, so nobody pastes a whole block into a refusal. */
  const guard = usePremiumGate();
  const openImport = (m: 'paste' | 'photo') => {
    if (!guard('imports')) return;
    if (!guard('programs')) return;
    router.push({ pathname: '/program-import', params: { m } });
  };
  /** False = the "How do you want to start?" chooser; true = the from-scratch questions. */
  const [started, setStarted] = useState(false);
  /** The mockup's "Want full control?" confirmation behind "I'll set it up myself". */
  const [confirmManual, setConfirmManual] = useState(false);
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

  /* The header's back chevron: a step back, and from the first question back to the chooser. */
  const back = () => {
    if (index === 0) setStarted(false);
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
      {started ? <AppBar title="Build a Program" onBack={back} /> : <AppBar title="Build a Program" onClose={() => router.back()} />}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!started ? (
          <View style={styles.chooser}>
            <View style={styles.chooserRule} />
            <Text style={styles.chooserTitle}>How do you want to start?</Text>
            <Text style={styles.chooserSub}>Choose the option that works best for you.</Text>
            <View style={styles.chooserCards}>
              <StartCard
                icon={<DocGlyph />}
                title="Paste a program"
                sub="Already have a workout written somewhere? Paste it or upload a PDF and Forge will build it for you."
                onPress={() => openImport('paste')}
              />
              {photoOn ? (
                <StartCard
                  icon={<CameraGlyph />}
                  title="Upload pictures"
                  sub="Have screenshots or photos of a program? Upload them and Forge will convert it."
                  onPress={() => openImport('photo')}
                />
              ) : null}
              <StartCard
                icon={<BarbellGlyph color={flColor.bronze300} />}
                title="Build from scratch"
                sub="Answer a few questions and Forge will help build your program."
                onPress={() => {
                  setIndex(0);
                  setStarted(true);
                }}
              />
            </View>
          </View>
        ) : (
        <>
        <Text style={styles.stepLabel}>
          STEP {stepNumber} OF {steps.length}
        </Text>
        <View style={styles.segments}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.segment, i <= index ? styles.segmentOn : null]} />
          ))}
        </View>

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
            help="Pick what you can consistently maintain. You can change this later."
          >
            {/* The mockup's grid: three tiles, then two. */}
            {[dayCountOptions().slice(0, 3), dayCountOptions().slice(3)].map((row, r) => (
              <View key={r} style={styles.dayRow}>
                {row.map((n) => (
                  <DayTile
                    key={n}
                    n={n}
                    recommended={n === recommendedDays(known.experience)}
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
              </View>
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

      {started ? (
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
        ) : (
          <>
            <Button variant="primary" fullWidth onPress={next} disabled={!canAdvance(step)} trailingIcon={<ArrowGlyph />}>
              {step === 'style' && ownDays ? 'Build my days' : 'Continue'}
            </Button>
            {/* The express lane, reachable from every step — `Onboarding-Amendment-002`. It asks once
                first (the mockup's "Want full control?"), and the answer is still one tap. */}
            <Pressable onPress={() => setConfirmManual(true)} accessibilityRole="button">
              <Text style={[styles.quiet, styles.quietUnderline]}>I’ll set it up myself</Text>
            </Pressable>
          </>
        )}
      </View>
      ) : null}

      <Modal visible={confirmManual} transparent animationType="fade" onRequestClose={() => setConfirmManual(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Pressable
              onPress={() => setConfirmManual(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              style={styles.modalClose}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6L6 18" />
              </Svg>
            </Pressable>
            <SlidersGlyph />
            <Text style={styles.modalTitle}>Want full control?</Text>
            <Text style={styles.modalBody}>You can skip the guided setup and build your program manually.</Text>
            <View style={styles.modalActions}>
              <Button
                variant="primary"
                fullWidth
                onPress={() => {
                  setConfirmManual(false);
                  router.replace('/program-builder');
                }}
              >
                Set it up myself
              </Button>
              <Button variant="secondary" fullWidth onPress={() => setConfirmManual(false)}>
                Continue guided setup
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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

/** One of the three ways in — icon plate · title · one line · chevron. `featured` is the mockup's bronze edge. */
function StartCard({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      /* Navigation, not a selection — no card is ever "on". The bronze edge answers the pointer (web hover)
         and the press, and nothing else. `hovered` is react-native-web's; native never sets it. */
      style={(state) => [
        styles.startCard,
        (state as { hovered?: boolean }).hovered || state.pressed ? styles.startCardActive : null,
        state.pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.startIcon}>{icon}</View>
      <View style={styles.startText}>
        <Text style={styles.startTitle}>{title}</Text>
        <Text style={styles.startSub}>{sub}</Text>
      </View>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round">
        <Path d="M9 5l7 7-7 7" />
      </Svg>
    </Pressable>
  );
}

/** A day-count tile: the number, DAYS, a glyph, what it gets you. `recommended` follows experience. */
function DayTile({ n, recommended, selected, onPress }: { n: number; recommended: boolean; selected: boolean; onPress: () => void }) {
  const tint = selected ? flColor.bronze300 : flColor.gray400;
  const glyph =
    n === 2 ? <BarbellGlyph color={tint} /> : n === 3 ? <BarsGlyph color={tint} /> : n === 4 ? <LayersGlyph color={tint} /> : n === 5 ? <TrendGlyph color={tint} /> : <BoltGlyph color={tint} />;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${n} days. ${daysTitle(n)}. ${daysBlurb(n)}`}
      style={[styles.dayTile, selected ? styles.dayTileOn : null]}
    >
      <Text style={styles.dayNum}>{n}</Text>
      <Text style={styles.dayWord}>DAYS</Text>
      {recommended ? <Text style={styles.dayBadge}>RECOMMENDED</Text> : null}
      <View style={styles.dayGlyph}>{glyph}</View>
      <Text style={styles.dayTitle}>{daysTitle(n)}</Text>
      <Text style={styles.daySub}>{daysBlurb(n)}</Text>
    </Pressable>
  );
}

const G = { fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
function DocGlyph() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" {...G} stroke={flColor.gray400}>
      <Rect x={5} y={3} width={14} height={18} rx={2} />
      <Path d="M9 8h6M9 12h6M9 16h4" />
    </Svg>
  );
}
function CameraGlyph() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" {...G} stroke={flColor.gray400}>
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx={12} cy={13} r={3.5} />
    </Svg>
  );
}
function BarbellGlyph({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" {...G} stroke={color}>
      <Path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12" />
    </Svg>
  );
}
function BarsGlyph({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...G} stroke={color}>
      <Path d="M6 20v-6M12 20V9M18 20V4" />
    </Svg>
  );
}
function LayersGlyph({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...G} stroke={color}>
      <Path d="M12 4l9 5-9 5-9-5z" />
      <Path d="M3 14l9 5 9-5" />
    </Svg>
  );
}
function TrendGlyph({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...G} stroke={color}>
      <Path d="M3 17l6-6 4 4 8-8" />
      <Path d="M15 7h6v6" />
    </Svg>
  );
}
function BoltGlyph({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" {...G} stroke={color}>
      <Path d="M13 3L5 14h6l-1 7 8-11h-6z" />
    </Svg>
  );
}
function ArrowGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" {...G} stroke={flColor.onBronze} strokeWidth={2}>
      <Path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}
function SlidersGlyph() {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" {...G} stroke={flColor.gray400}>
      <Path d="M4 7h16M4 12h16M4 17h16" />
      <Circle cx={9} cy={7} r={1.8} />
      <Circle cx={15} cy={12} r={1.8} />
      <Circle cx={8} cy={17} r={1.8} />
    </Svg>
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

  pressed: { opacity: 0.86 },

  /* ── "How do you want to start?" ── */
  chooser: { alignItems: 'center', paddingTop: 14, width: '100%', maxWidth: 820, alignSelf: 'center' },
  chooserRule: { width: 40, height: 2, borderRadius: 1, backgroundColor: flColor.bronze400, marginBottom: 22 },
  chooserTitle: { fontFamily: flFont.display, fontSize: 26, fontWeight: '600', letterSpacing: -0.3, color: flColor.cream100, textAlign: 'center' },
  chooserSub: { fontSize: 14, color: flColor.gray400, marginTop: 8, textAlign: 'center' },
  chooserCards: { alignSelf: 'stretch', gap: 14, marginTop: 28 },
  startCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  startCardActive: { borderColor: flColor.bronze400 },
  startIcon: {
    width: 64,
    height: 64,
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  startText: { flex: 1, minWidth: 0, gap: 5 },
  startTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  startSub: { fontSize: 13.5, lineHeight: 19, color: flColor.gray400 },

  /* ── the step bar ── */
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.3,
    color: flColor.gray400,
    marginBottom: 8,
  },
  segments: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: flColor.charcoal600 },
  segmentOn: { backgroundColor: flColor.bronze400 },

  /* ── day tiles ── */
  dayRow: { flexDirection: 'row', gap: 10 },
  dayTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  dayTileOn: { borderColor: flColor.bronze400, backgroundColor: flColor.charcoal800 },
  dayNum: { fontFamily: flFont.display, fontSize: 32, fontWeight: '600', color: flColor.cream100 },
  dayWord: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: flColor.cream100, marginTop: 2 },
  dayBadge: {
    marginTop: 8,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: flColor.onBronze,
    backgroundColor: flColor.bronze400,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dayGlyph: { marginTop: 14, marginBottom: 10 },
  dayTitle: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  daySub: { fontSize: 11, lineHeight: 15, color: flColor.gray400, textAlign: 'center', marginTop: 6 },

  /* ── "Want full control?" ── */
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    padding: 26,
    paddingTop: 36,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  modalClose: { position: 'absolute', top: 16, right: 16 },
  modalTitle: { fontFamily: flFont.display, fontSize: 24, fontWeight: '600', color: flColor.cream100, marginTop: 16, textAlign: 'center' },
  modalBody: { fontSize: 14, lineHeight: 20, color: flColor.gray400, marginTop: 10, textAlign: 'center' },
  modalActions: { alignSelf: 'stretch', gap: 10, marginTop: 24 },

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
  quietUnderline: { textDecorationLine: 'underline' },
});
