import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenBoundary } from '@/components/screen-boundary';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { useKeyboardPrimer } from '@/components/forge/KeyboardPrimer';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import {
  parseProgramTable,
  summarize,
  toProgramStructure,
  unmatchedNames,
  type ParsedWeek,
} from '@/domain/program/import-parse';
import { pickTextFile } from '@/lib/pick-text-file';
import { pickImageFromLibrary } from '@/lib/useMediaPicker';
import { readProgramPhoto } from '@/data/program-photo-live';
import { resolveExerciseName } from '@/domain/exercise-picker/data';
import { useToast } from '@/hooks/useCeremony';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { useUnits } from '@/lib/settings';
import { EquipIcon, equipmentLabel } from '@/components/forge/EquipIcon';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { claimInitiativeHonor } from '@/data/honors-live';
import {
  createProgram,
  fetchProgram,
  fetchProgramSessions,
  updateProgram,
  type ProgramDay,
  type ProgramExercise,
  type SavedProgram,
} from '@/data/programs-live';
import { totalSessions } from '@/domain/program/progress-core';
import { markFreeImportUsed } from '@/data/entitlement-live';
import { clearBuilderInbox, readBuilderInbox, type BuilderSection } from '@/lib/builder-inbox';
import {
  CARDIO_ACTIVITIES,
  TRACKS_DISTANCE,
  activitySymbol,
  bumpDistanceUnit,
  bumpDuration,
  bumpPace,
  bumpSpeed,
  deriveEquip,
  deriveName,
  distanceUnitFor,
  effortLabel,
  fmtDistanceIn,
  fmtDuration,
  hasRateTarget,
  parseDistanceIn,
  newCardioBlock,
  FIRST_TARGET,
  usesSpeed,
  type CardioActivity,
  type Modality,
} from '@/domain/workout/conditioning';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { fetchTemplates } from '@/data/templates-live';
import { daySectionsSummary, templateRowsToDay, type DaySections } from '@/domain/program/template-day';
import { STRUCTURED_DEVELOPMENT_MIN_WEEKS } from '@/domain/rank/thresholds';
import { fetchWeekTemplate, fetchWeekTemplates, saveWeekTemplate, weekSummary } from '@/data/week-templates-live';
import { defaultAudiences, filterStarters, starterMeta } from '@/domain/workout/starter-templates';
import { useProfile } from '@/lib/profile';
import type { Sex } from '@/domain/profile/schema';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourAnchor, useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import type { TourAnchorId } from '@/domain/onboarding/tour-plan';
import {
  absorbBuilderInbox,
  activeDays,
  applyDaysPerWeek,
  applyWeeks,
  clampReps,
  clampSets,
  clampDays,
  clampWeeks,
  clearProgramDraft,
  clearWeek,
  cloneDays,
  completedWeeks,
  copyWeek,
  DAYS_MAX,
  DAYS_MIN,
  dayTotal,
  daysLoseContent,
  draftHasContent,
  draftToStructure,
  hasMainExercise,
  hasName,
  hydrateDraft,
  isDraftValid,
  loadProgramDraft,
  newDraft,
  nextDayStop,
  dayAtStop,
  nextIncompleteWeek,
  normalizeDraft,
  pairWithNext,
  pairingAt,
  saveProgramDraft,
  unpairAt,
  setRepeatMode,
  setVaryMode,
  templateIntoDay,
  weekFit,
  weekTemplateIntoWeek,
  type WeekFit,
  weekBuilt,
  weekComplete,
  weeksLoseContent,
  withActiveDays,
  forLiveEdit,
  isLockedCell,
  liveEditViolation,
  lockedCells,
  type ProgramDraft,
} from '@/lib/program-draft';

/**
 * W-4 / W-24 Program Builder (`Forge Program Builder.dc.html`) — the authoring surface for a custom
 * program. Three views off one draft: **Setup** (details, length, training days, and either the weekly
 * split or the week list), the **Week day-list** (one week's workouts, in Customize mode), and the
 * **Day Builder** (a day's Warm-up / Main / Cool-down with per-exercise sets × reps).
 *
 * Wiring: the in-progress draft is device-local (`program-draft`, autosaved on every mutation, so an
 * interrupted build survives a reload); Save writes the real `programs` row via `createProgram` (or
 * `updateProgram` when editing); adding an exercise routes to the standalone Exercise Picker in
 * `builder` mode and comes back through the builder-inbox, drained on focus.
 *
 * DEFERRED vs the `.dc` (flagged, not faked — omitted rather than rendered inert): spreadsheet import.
 */

/**
 * ⛔ PHOTO IMPORT IS HIDDEN FOR LAUNCH — A DECISION, NOT A BUG (PO, 2026-08-21).
 *
 * The feature is BUILT and its code below is untouched. What is missing is the two things it needs to
 * actually run: migration `0174` (the credit weight for `photo_import`) is not applied, and the
 * `program-photo-read` Edge Function is not deployed. `GO-LIVE.md` rules out AI spend before full
 * release, so both are deliberately still pending — which left a control that failed on EVERY tap.
 *
 * ⚠ THIS IS THE GUIDELINE 1.2 LESSON, APPLIED BEFORE IT COSTS US AGAIN. The last submission blocker
 * found in this repo was a button whose only behaviour was a toast reading "Reporting a squad is
 * coming soon" — and the finding was that the toast is WORSE than no button, because it proves inside
 * the binary that the need was known and unmet. A visible "Or read a screenshot" that always fails is
 * the same shape, on a screen a reviewer will certainly open.
 *
 * ⚠ THE HINT COPY IS GATED ON THIS TOO, AND THAT IS THE HALF THAT IS EASY TO FORGET. Hiding the
 * button while leaving the paragraph that promises "Only have a screenshot? Read it in below" is the
 * same defect written in prose — it just fails silently instead of loudly.
 *
 * TO RE-ENABLE: apply `supabase/apply/pending-0174.sql`, deploy `program-photo-read`, then flip this to
 * `true`. Nothing else. Do not flip it before both are true — that is what this constant is for.
 */
const PHOTO_IMPORT_ENABLED = false;

const SECTION_META: { key: BuilderSection; label: string; addLabel: string; req: string; empty: string }[] = [
  { key: 'warmup', label: 'Warm-up', addLabel: 'warm-up', req: 'Optional', empty: 'No warm-up yet' },
  { key: 'main', label: 'Main', addLabel: 'exercise', req: 'Required', empty: 'No main exercises yet' },
  { key: 'cooldown', label: 'Cool-down', addLabel: 'cool-down', req: 'Optional', empty: 'No cool-down yet' },
];

/** Muscle → coarse group, for the day-row subtitle ("Chest & Arms · 6 exercises"). */
const MUSCLE_GROUP: Record<string, string> = {
  Chest: 'Chest', 'Upper Chest': 'Chest',
  Back: 'Back', Lats: 'Back',
  Shoulders: 'Shoulders', 'Side Delts': 'Shoulders', 'Rear Delts': 'Shoulders',
  Biceps: 'Arms', Triceps: 'Arms', Forearms: 'Arms',
  Quads: 'Legs', Glutes: 'Legs', Hamstrings: 'Legs',
  Abs: 'Core', Core: 'Core',
};

function inferLabel(items: ProgramExercise[]): string {
  const count = new Map<string, number>();
  for (const it of items) {
    for (const m of it.muscles ?? []) {
      const g = MUSCLE_GROUP[m];
      if (g) count.set(g, (count.get(g) ?? 0) + 1);
    }
  }
  const groups = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  if (groups.length === 0) return '';
  if (groups.length === 1) return groups[0];
  if (groups.length === 2) return `${groups[0]} & ${groups[1]}`;
  return 'Full Body';
}

const dayName = (day: ProgramDay) => (day.name.trim() ? day.name : `Day ${day.letter || '?'}`);
/** Fit a name into a button. Display only — never what a screen reader is handed. */
const ellipsis = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * What a previewed cardio bout asks for — "75 min", "1200 yd", "3.0 mi · 45 min".
 *
 * Says only what was actually read. A bout the sentence gave no target for reads "Open", which is a real
 * prescription and not a gap: the sheet said go ride, and it did not say how far.
 */
function cardioTargetText(it: { activity?: string; targetSec?: number | null; targetMi?: number | null }): string {
  const parts: string[] = [];
  if (it.targetMi != null) {
    const unit = distanceUnitFor((it.activity ?? 'run') as CardioActivity, false);
    parts.push(`${fmtDistanceIn(it.targetMi, unit)} ${unit}`);
  }
  if (it.targetSec != null) parts.push(fmtDuration(it.targetSec));
  return parts.length ? parts.join(' · ') : 'Open';
}

function Glyph({ d, size = 13, color, width = 2.2 }: { d: string; size?: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

const CHECK = 'M20 6L9 17l-5-5';
const CROSS = 'M18 6L6 18M6 6l12 12';
const PLUS = 'M12 5v14M5 12h14';
const DOTS = 'M12 5.4v.2M12 11.9v.2M12 18.4v.2';
/** The stacked rules W-26 uses for a template — the same mark, so the shortcut names its destination. */
const LINES = 'M4 6h16M4 12h16M4 18h10';

/**
 * The design's `pbRise` entry animation (`opacity 0→1`, `translateY 8→0`, `--fl-ease-out`) on the body of
 * each view. Both views mount fresh when the builder switches between them, so it replays per transition
 * exactly as the `.dc`'s `sc-if` toggle does.
 */
function useEntryRise(duration: number) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [t, duration]);
  return {
    opacity: t,
    transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };
}

/**
 * ⚠ WRAPPED, BECAUSE A CRASH HERE TOOK THE ERROR MESSAGE WITH IT.
 *
 * Reported 2026-08-09: "clicking edit on a program crashes the app." Every Forge program and a
 * coach-built plan were run through this screen's exact hydrate path and all of them come through clean,
 * so the failure is in rendering — which cannot be reproduced off the device. A crash that kills the app
 * also destroys the one thing that would identify it.
 *
 * The boundary does not hide the failure; it prints it, on screen, selectable. Next time it happens there
 * is something to read.
 */
/**
 * What a frozen session says when it is touched. One sentence, and it names the way forward — a lock
 * with no exit is the failure this whole change was made to remove.
 */
const FROZEN_NOTE =
  'You have already trained this session, so it stays as you did it. Sessions ahead of you can be changed.';

export default function ProgramBuilder() {
  const router = useRouter();
  return (
    <ScreenBoundary name="The program builder" onBack={() => router.back()}>
      <ProgramBuilderScreen />
    </ScreenBoundary>
  );
}

function ProgramBuilderScreen() {
  const { showToast } = useToast();
  const router = useRouter();
  const { profile } = useProfile();
  /* A pool is 25 yd or 25 m depending on where you swim, and a road distance is miles or kilometres.
     Storage stays in miles either way — this only chooses the scale the steppers walk and the card reads. */
  const { units } = useUnits();
  const metric = units === 'metric';
  const { o: entryMode, id: entryId, mode: surfaceMode } = useLocalSearchParams<{ o?: string; id?: string; mode?: string }>();
  /**
   * ══ WEEK MODE — the same builder, authoring a different object (0157) ══
   *
   * `?mode=week` builds a WEEK TEMPLATE: one week, saved to `week_templates`, startable over and over.
   *
   * It is a mode of this screen rather than a screen of its own because `SetupView`, `WeekDaysView`,
   * `DayBuilder`, `ExerciseCard` and `TemplateDaySheet` are all local to this file. A separate route
   * would mean extracting five components out of the app's most-used authoring surface first — a large,
   * risky refactor bought purely for a URL. What changes here is small and legible: the length control
   * disappears (a week has no length to choose and no weeks to vary), the titles change, and Save writes
   * somewhere else.
   */
  const isWeek = surfaceMode === 'week';
  const draftKind = isWeek ? ('week' as const) : ('program' as const);
  const [draft, setDraft] = useState<ProgramDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * `'repeat'` joins the two resize kinds because it is the same event wearing different clothes: a
   * structural choice that costs the athlete work they have already done.
   *
   * ⚠ AND IT WAS THE ONE THAT DID NOT ASK. Shrinking the week count has confirmed since the first build;
   * flipping Customize → Repeat did not, and it costs MORE. `setRepeatMode` only sets `vary: false`, so
   * the built weeks are merely hidden — but `draftToStructure` writes `weekPlans: d.vary ? … : null`, so
   * the next Save makes it permanent with no undo. Hidden-then-silently-discarded is the worst of both:
   * nothing looks destructive at the moment the athlete chooses it.
   */
  const [pendingResize, setPendingResize] = useState<{ kind: 'weeks' | 'days' | 'repeat'; to: number; msg: string } | null>(null);

  /*
   * ── IMPORT FROM A SPREADSHEET ────────────────────────────────────────────
   *
   * One sheet, two states, per `Forge Program Builder.dc.html`: paste, then preview what was read. The
   * architecture amendment specced four separate screens (W-IM-1..4) back in June; the design supersedes
   * it with a sheet inside the builder, which is also where an imported program is going to be edited
   * anyway. PD-7 — the design governs.
   */
  const guard = usePremiumGate();
  const [importOpen, setImportOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  /** A photo read is a network round-trip to a vision model — seconds, not milliseconds. It needs to say so. */
  const [photoBusy, setPhotoBusy] = useState(false);
  /** Non-null once a paste has parsed — the sheet flips to its preview state. */
  const [preview, setPreview] = useState<ParsedWeek[] | null>(null);

  /**
   * Resolve a written name to the catalogue — the SAME call the preview renders and the import commits,
   * so what the athlete is shown is exactly what gets stored. Two resolvers would drift.
   */
  const resolveName = (n: string) => resolveExerciseName(n);

  /**
   * ⚠ TWO CAPS GUARD THIS ONE BUTTON, AND BOTH HAVE TO PASS.
   *
   * An import creates a PROGRAM, so it spends a program slot as well as the one lifetime import
   * (Amendment 001 §6: *"a free user who has used their one free import and has 3 programs cannot
   * import another program"*). Checking only `imports` would open the sheet, let somebody paste and
   * correct a 12-week spreadsheet, and refuse it at the end — the dead end M-7 §2 forbids, arrived at
   * by the longest possible route.
   *
   * `imports` is checked first so the athlete is told the truer thing when both are exhausted.
   */
  const openImport = () => {
    if (!guard('imports')) return;
    if (!guard('programs')) return;
    setPasteText('');
    setImportError(null);
    setPreview(null);
    // A read that was in flight when the sheet was closed would otherwise reopen it stuck on
    // "Reading your screenshot…" with no request behind it.
    setPhotoBusy(false);
    setImportOpen(true);
  };

  const runParse = (text: string) => {
    const r = parseProgramTable(text);
    if (!r.ok) {
      setImportError(r.error);
      setPreview(null);
      return;
    }
    setImportError(null);
    setPreview(r.weeks);
  };

  const onPickFile = async () => {
    const r = await pickTextFile();
    if (!r.ok) {
      if (r.reason) setImportError(r.reason);
      return;
    }
    setPasteText(r.text);
    runParse(r.text);
  };

  /**
   * ══ READ A PHOTO OF A PROGRAM ══
   *
   * `Architecture-Amendment-001-Import.md` §5 named this and deferred it — *"Image Import: screenshots
   * of training tables … requires OCR or vision model parsing. Post-MVP."*
   *
   * ⚠ **AND IT LANDS AS A THIRD WAY TO FILL THE PASTE BOX, NOT AS A FOURTH IMPORT PATH.** That is the
   * whole design. The transcript goes into `pasteText` and through `runParse` — the same parser, the
   * same preview, the same − / + corrections, the same "grey text is the sentence we read it from".
   * An athlete who photographs a table and one who pastes it are, from this line onward, in identical
   * code. That is what keeps the feature inside §4.3's locked *"No AI interpretation. No inference."*
   *
   * Setting `pasteText` is not cosmetic either: if the transcription is imperfect the athlete is
   * looking at editable text they can fix and re-preview, rather than a wrong result and a dead end.
   */
  const onPickPhoto = async () => {
    const uri = await pickImageFromLibrary();
    if (!uri) return; // Cancelled. Not an error, and it must not leave one on screen.

    setImportError(null);
    setPhotoBusy(true);
    try {
      const r = await readProgramPhoto(uri);
      // ⚠ THREE FAILURES THAT FEEL IDENTICAL AND ARE NOT. Brief §6: an outage must be visibly different
      // from a verdict. "We couldn't read that" when the request never left the building tells somebody
      // their program is unreadable, and they will go and retake a photograph that was always fine.
      switch (r.kind) {
        case 'ok':
          setPasteText(r.tsv);
          runParse(r.tsv);
          break;
        case 'not_a_program':
          setImportError('That doesn’t look like a training program. Try a photo of the table itself.');
          break;
        case 'unreadable':
          setImportError('Couldn’t read a table out of that photo. A straighter, closer shot usually does it.');
          break;
        case 'too_large':
          setImportError('That image is too big to read. Try a screenshot rather than a full-size photo.');
          break;
        case 'out_of_credits':
          setImportError('You’re out of Coach AI credits for this month.');
          break;
        default:
          setImportError('Couldn’t reach us to read that photo. Check your connection and try again.');
      }
    } finally {
      // In a `finally` because every branch above needs it and the one that forgot would strand the
      // sheet in its loading state with no way back.
      setPhotoBusy(false);
    }
  };

  /** Adjust a parsed set/rep count before creating. The design's − / + on every preview row. */
  const bumpPreview = (wi: number, di: number, ii: number, field: 'sets' | 'reps', delta: number) =>
    setPreview((cur) =>
      !cur
        ? cur
        : cur.map((w, a) =>
            a !== wi
              ? w
              : {
                  ...w,
                  days: w.days.map((d, b) =>
                    b !== di
                      ? d
                      : {
                          ...d,
                          items: d.items.map((it, c) =>
                            c !== ii
                              ? it
                              : {
                                  ...it,
                                  [field]: Math.max(1, Math.min(field === 'sets' ? 20 : 100, it[field] + delta)),
                                  // Adjusting a value makes it authored, not assumed — the flag stops
                                  // claiming the sheet was silent once the athlete has spoken.
                                  [field === 'sets' ? 'setsAssumed' : 'repsAssumed']: false,
                                },
                          ),
                        },
                  ),
                },
          ),
    );

  /** "Add another week" — copies the last week forward, which is how a block is usually extended. */
  const addPreviewWeek = () =>
    setPreview((cur) => {
      if (!cur?.length) return cur;
      const last = cur[cur.length - 1];
      return [...cur, { index: last.index + 1, days: last.days.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i })) })) }];
    });

  /**
   * Replace the draft with what was imported.
   *
   * It fills the SETUP the athlete was already on rather than creating anything — the sheet's CTA says
   * "Create program", and the create still happens where it always did, on Save. So an import that reads
   * wrong is one Back away from being fixed, not a program row to go and delete.
   */
  const confirmImport = () => {
    if (!preview?.length) return;
    const imported = toProgramStructure(preview, draft?.name?.trim() || 'Imported Program', (n) => resolveName(n)?.key);

    /*
     * FIT WHAT WAS PASTED INTO WHAT THE BUILDER CAN HOLD — and say so when it does not fit.
     *
     * The draft has hard bounds (WEEKS 4–52, DAYS 2–6, SETS 1–8, REPS 1–60) and the import wrote
     * straight past them: a single-week paste produced `weeks: 1`, below the minimum, and a seven-day
     * program would have produced a seventh day the builder has no letter for and no chip to select.
     * Every one of those is a draft that cannot be edited or trusted.
     *
     * Clamping silently would be the worse fix. An athlete whose seventh day vanished must be told which
     * day went, not left to discover it on a Thursday.
     */
    const days = imported.days.slice(0, DAYS_MAX);
    const droppedDays = imported.days.slice(DAYS_MAX).map((d) => d.name);
    const fit = (list: typeof days) =>
      list.map((d) => ({
        ...d,
        main: d.main.map((x) => ({ ...x, sets: clampSets(x.sets), reps: clampReps(x.reps) })),
      }));

    const weeks = clampWeeks(imported.weeks);
    // ⚠ THIS USED TO FIRE THE OTHER WAY. With a floor of 4, a single-week paste was silently stretched
    // to 4 and the toast said so. The floor is 1 (PA2-D1), so a one-week paste now imports as one week
    // and says nothing — the stretch was the bug, and the note explaining it was the apology.
    // Only the CEILING can still move a number, so the copy has to name that direction instead.
    const clamped = weeks !== imported.weeks;

    mutate((d) => ({
      ...d,
      name: d.name?.trim() ? d.name : imported.name,
      weeks,
      daysPerWeek: clampDays(days.length),
      vary: imported.vary,
      days: fit(days),
      weekPlans: imported.weekPlans ? imported.weekPlans.map((w) => ({ days: fit(w.days.slice(0, DAYS_MAX)) })) : null,
      openWeek: null,
      openDay: null,
    }));
    setImportOpen(false);
    setFromImport(true);

    // One line, and it leads with whatever was LOST — the part an athlete needs to know about.
    const unmatched = unmatchedNames(preview, (n) => resolveName(n)?.key);
    const notes: string[] = [];
    if (droppedDays.length) notes.push(`${droppedDays.length} day${droppedDays.length === 1 ? '' : 's'} over the ${DAYS_MAX}-day limit dropped (${droppedDays.join(', ')})`);
    if (clamped) notes.push(`set to ${weeks} weeks — the longest a program can be`);
    if (unmatched.length) notes.push(`${unmatched.length} name${unmatched.length === 1 ? '' : 's'} weren’t in the library and kept yours`);
    showToast(notes.length ? `Imported · ${notes.join(' · ')}` : 'Imported — review and save');
  };
  /**
   * This draft came from a PASTE, so a successful save spends the free import.
   *
   * ⚠ HELD UNTIL THE SAVE, DELIBERATELY. `markFreeImportUsed()` shipped with ZERO CALLERS — the gate
   * checked a usage figure nothing ever wrote, so the one-import allowance could never actually bite.
   * Wiring it at the obvious place (opening the paste sheet, or confirming the preview) would be worse
   * than leaving it broken: an athlete who pastes the wrong tab, reads the preview and backs out would
   * have spent their only import on nothing. It is spent when a program actually exists.
   */
  const [fromImport, setFromImport] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [weekSheet, setWeekSheet] = useState<{ index: number; entering: boolean } | null>(null);
  const [dayMenu, setDayMenu] = useState<number | null>(null);
  /** The section the cardio sheet was opened from; null = closed. */
  const [cardioSheet, setCardioSheet] = useState<BuilderSection | null>(null);
  /**
   * The exercise whose coaching cue is being written; null = closed.
   *
   * The cue is the AUTHOR's — "4 seconds down, then push up" — and is shown to whoever trains this day.
   * It is not the athlete's log note, which is written during the session and lives on the workout.
   */
  const [noteSheet, setNoteSheet] = useState<{ section: BuilderSection; index: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  /** Typing a cardio target instead of stepping to it — which target, and the text so far. */
  const [targetSheet, setTargetSheet] = useState<{ section: BuilderSection; index: number; field: 'time' | 'distance' } | null>(null);
  const primeKeyboard = useKeyboardPrimer();
  const [targetDraft, setTargetDraft] = useState('');
  /** The unit the target sheet talks in — yards for a pool, miles for the road. */
  const targetUnitLabel =
    targetSheet && draft?.openDay != null
      ? distanceUnitFor(
          ((draft.vary && draft.weekPlans ? draft.weekPlans[draft.openWeek ?? 0]?.days : draft.days)?.[draft.openDay]?.[
            targetSheet.section
          ]?.[targetSheet.index]?.activity ?? 'run') as CardioActivity,
          metric,
        )
      : 'mi';
  /** "Use a template" for the open day — the chooser, and the replace/add question it can raise. */
  const [templateSheet, setTemplateSheet] = useState(false);
  const [templatePending, setTemplatePending] = useState<{ name: string; rows: DaySections } | null>(null);

  /**
   * "Use a saved week" — the week-level counterpart of the day chooser above.
   *
   * ⚠ IT CONFIRMS MORE OFTEN THAN THE DAY ONE DOES, and that is the whole difference between them. A day
   * template can honestly be ADDED to a day; a week replaces a week, because the number of days is fixed
   * by `daysPerWeek` and there is no end to append to. So the only question worth asking is what the
   * replacement COSTS — which is arithmetic (`weekFit`), not opinion, and is stated in the sheet before
   * anything is written. A week that fits exactly, into a week with nothing in it, asks nothing at all.
   */
  const [weekTplFor, setWeekTplFor] = useState<number | null>(null);
  const [weekTplPending, setWeekTplPending] = useState<{ index: number; name: string; days: ProgramDay[]; fit: WeekFit } | null>(null);

  // Boot + picker round-trip in one pass: read the stored draft, absorb anything the Picker handed back,
  // persist, then render. Runs on every focus, so returning from the Picker lands the new exercises.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const stored = await loadProgramDraft(draftKind);
        // Only picks addressed to THIS builder. The single-day Workout Builder (W-25) shares the same
        // round-trip, and a pick meant for it must not be absorbed into a program day.
        const raw = await readBuilderInbox();
        const inbox = raw && (raw.dest ?? 'program') === 'program' ? raw : null;
        let d = stored ? normalizeDraft(stored) : null;

        // Edit / Duplicate entry (from Program Detail). Hydrate from the source UNLESS this is the same
        // editing session resumed — otherwise coming back from the Picker would discard the work in
        // progress and reload the original. An inbox in hand always means a Picker round-trip.
        const wantMode = entryMode === 'edit' || entryMode === 'dup' ? entryMode : null;
        if (wantMode && entryId && !inbox) {
          const sameSession = d && d.mode === wantMode && d.srcId === entryId;
          if (!sameSession) {
            // In week mode the source is a saved WEEK, not a program — different table, same structure.
            const source = isWeek ? await fetchWeekTemplate(entryId) : await fetchProgram(entryId);
            d = source ? hydrateDraft(source, wantMode) : d;
            /* ── EDITING A PROGRAM THAT IS ALREADY RUNNING (W-5 Amendment-001) ────────────────────
               The locked spec forbade this outright. What replaced it is not "no rules" but two:
               sessions already trained are frozen, and the session COUNT cannot move — because
               graduation is recomputed live from this structure server-side, and shrinking the
               program would award five permanent honors that no path can revoke.

               The guard is built HERE, from the structure as it stands before a single edit, so the
               finish line the athlete signed up for is the one being defended. */
            if (d && source && !isWeek && wantMode === 'edit' && (source as SavedProgram).state === 'active') {
              const marks = await fetchProgramSessions(entryId);
              d = forLiveEdit(d, {
                trained: marks.map((m) => ({ weekIndex: m.weekIndex, dayIndex: m.dayIndex })),
                sessions: totalSessions((source as SavedProgram).structure),
              });
            }
          }
        } else if (!wantMode && !inbox && d && d.mode !== 'new') {
          d = null; // a fresh "build your own" entry must not inherit a stale edit session
        }

        d = d ?? newDraft();
        // The pin, applied on every pass rather than only at creation: a draft that reached week mode by
        // any route — resumed from storage, hydrated from a saved week, or handed back by the Picker —
        // must still be exactly one week, because the database CHECK will refuse anything else and the
        // athlete would find out at Save with a whole week already built.
        if (isWeek) d = { ...d, weeks: 1, vary: false, weekPlans: null, openWeek: null };
        if (inbox) {
          await clearBuilderInbox();
          /* ⚠ THE INBOX BYPASSES `patchActiveDay`. Absorption writes straight into the draft, so the
             funnel's lock check never sees it — a pick made against a frozen day would land here and
             rewrite a session the athlete already trained. Dropped, and said out loud rather than
             silently discarded. */
          if (d.live && isLockedCell(lockedCells(d), inbox.week, inbox.day)) {
            if (active) setError(FROZEN_NOTE);
          } else {
            d = absorbBuilderInbox(d, inbox);
          }
        }
        await saveProgramDraft(d, draftKind);
        if (active) setDraft(d);
        /* ⚠ `o=import` OPENS THE PASTE SHEET ON ARRIVAL. Coach Holt sends people here when they say they
           already have a plan, and "we take you to the Builder, now find the import button yourself" is
           not taking them anywhere. Only on a fresh entry — landing back here from the Picker mid-edit
           must not throw a paste sheet over the work. */
        if (active && entryMode === 'import' && !inbox) openImport();
      })();
      return () => {
        active = false;
      };
      /* eslint-disable-next-line react-hooks/exhaustive-deps -- `openImport` is deliberately out.
         It became an unstable reference when it started calling the cap gate (`guard` re-creates on
         every entitlement refetch), and adding it here would re-run this effect on refetch — which
         means throwing the paste sheet back over work in progress. The effect is keyed to ARRIVAL,
         and arrival has not changed. */
    }, [entryMode, entryId]),
  );

  // Every mutation is a pure draft→draft step plus an autosave; nothing writes state during render.
  const mutate = (fn: (d: ProgramDraft) => ProgramDraft) => {
    if (!draft) return;
    const next = fn(draft);
    setDraft(next);
    void saveProgramDraft(next, draftKind);
  };

  /** Sessions already trained, in builder space. Empty unless this is a live edit. */
  const locked = draft ? lockedCells(draft) : new Set<string>();
  /** The last word on whether a day may change — every content edit funnels through here. */
  const dayIsFrozen = (idx: number) => !!draft?.live && isLockedCell(locked, draft.openWeek, idx);

  const patchActiveDay = (idx: number, fn: (day: ProgramDay) => ProgramDay) => {
    if (dayIsFrozen(idx)) {
      setError(FROZEN_NOTE);
      return;
    }
    mutate((d) => withActiveDays(d, activeDays(d).map((day, i) => (i === idx ? fn(day) : day))));
  };

  const patchSection = (idx: number, section: BuilderSection, fn: (list: ProgramExercise[]) => ProgramExercise[]) =>
    patchActiveDay(idx, (day) => ({ ...day, [section]: fn(day[section]) }));

  /**
   * A template was chosen for the open day.
   *
   * An EMPTY day just takes it — asking "replace or add?" of a day with nothing in it is a question with
   * one real answer. A day with content asks, because replacing is destructive and the athlete may well
   * have meant to build a day out of two shapes.
   */
  const chooseTemplate = (name: string, rows: DaySections) => {
    setTemplateSheet(false);
    if (draft?.openDay == null) return;
    const day = activeDays(draft)[draft.openDay];
    if (day && dayTotal(day) > 0) {
      setTemplatePending({ name, rows });
      return;
    }
    mutate((d) => templateIntoDay(d, d.openDay ?? 0, rows, { mode: 'replace', name }));
    showToast(`${name} added to this day.`);
  };

  const applyPendingTemplate = (mode: 'replace' | 'append') => {
    const p = templatePending;
    setTemplatePending(null);
    if (!p) return;
    mutate((d) => templateIntoDay(d, d.openDay ?? 0, p.rows, { mode, name: p.name }));
    showToast(mode === 'replace' ? `This day is now ${p.name}.` : `${p.name} added to this day.`);
  };

  /**
   * A saved week was chosen for week `index`.
   *
   * Silent only when there is genuinely nothing to say: the target week is empty AND the template's day
   * count matches the program's exactly. Any other combination writes over something or leaves something
   * blank, and the athlete is told which before it happens.
   */
  const chooseWeekTemplate = (index: number, name: string, days: ProgramDay[]) => {
    setWeekTplFor(null);
    if (!draft) return;
    const fit = weekFit(draft, days.length);
    const target = draft.vary ? draft.weekPlans?.[index] : { days: draft.days };
    if (!weekBuilt(target) && fit.dropped === 0 && fit.emptied === 0) {
      mutate((d) => weekTemplateIntoWeek(d, index, days));
      showToast(`Week ${index + 1} is now ${name}.`);
      return;
    }
    setWeekTplPending({ index, name, days, fit });
  };

  const applyPendingWeek = () => {
    const p = weekTplPending;
    setWeekTplPending(null);
    if (!p) return;
    mutate((d) => weekTemplateIntoWeek(d, p.index, p.days));
    showToast(`Week ${p.index + 1} is now ${p.name}.`);
  };

  // Shrinking weeks/days can destroy built content — confirm first (design `pendingResize`).
  const requestWeeks = (n: number) => {
    if (!draft) return;
    const to = clampWeeks(n);
    if (to === draft.weeks) return;
    if (to < draft.weeks && weeksLoseContent(draft, to)) {
      setPendingResize({
        kind: 'weeks',
        to,
        msg: `Weeks ${to + 1}–${draft.weeks} will be removed, along with any workouts built in them. This can’t be undone.`,
      });
      return;
    }
    mutate((d) => applyWeeks(d, to));
  };

  const requestDays = (n: number) => {
    if (!draft || n === draft.daysPerWeek) return;
    if (n < draft.daysPerWeek && daysLoseContent(draft, n)) {
      setPendingResize({
        kind: 'days',
        to: n,
        msg: `Day ${draft.days[n]?.letter ?? n + 1} onward will be removed from every week, along with their exercises. This can’t be undone.`,
      });
      return;
    }
    mutate((d) => applyDaysPerWeek(d, n));
  };

  const confirmResize = () => {
    const p = pendingResize;
    setPendingResize(null);
    if (!p) return;
    mutate((d) => (p.kind === 'repeat' ? setRepeatMode(d) : p.kind === 'weeks' ? applyWeeks(d, p.to) : applyDaysPerWeek(d, p.to)));
  };

  /**
   * Switching to one repeating week. Asks only when there is per-week work to lose — which means weeks
   * BEYOND THE FIRST, because week 1's days are what the repeating template would be built from anyway.
   */
  const requestRepeat = () => {
    if (!draft || !draft.vary) return;
    const built = (draft.weekPlans ?? []).map((w, i) => (i > 0 && weekBuilt(w) ? i + 1 : 0)).filter(Boolean);
    if (built.length === 0) {
      mutate(setRepeatMode);
      return;
    }
    const which = built.length === 1 ? `Week ${built[0]} holds` : `Weeks ${built.join(', ')} hold`;
    setPendingResize({
      kind: 'repeat',
      to: 0,
      msg: `${which} workouts of their own. Switching to one repeating week sets them aside — switch back and they return, but saving from here keeps only the repeating week.`,
    });
  };

  // Leaving is not the same as discarding. The draft autosaves and the builder resumes it on re-entry,
  // so ✕ keeps the work by default and only ever destroys it on an explicit, named choice. (The `.dc`
  // clears the draft outright on cancel — a silent loss of everything typed, so we diverge deliberately.)
  /** Open a week. An empty week that has a built sibling offers to copy it rather than starting blank. */
  const openWeek = (i: number) => {
    if (!draft) return;
    const plans = draft.weekPlans ?? [];
    const canCopy = plans.some((w, k) => k !== i && weekBuilt(w));
    mutate((d) => ({ ...d, openWeek: i, openDay: null }));
    if (!weekBuilt(plans[i]) && canCopy) setWeekSheet({ index: i, entering: true });
  };

  /**
   * ══ THE DAY BUILDER'S FORWARD MOVE — AND WHY IT CAN CROSS A WEEK ══
   *
   * PO: *"It needs to be more obvious that I can save that day and move on to the next… all the way until
   * the last day and week."* `nextDayStop` decides WHERE forward is (the next day, else the first day of
   * the next week, else nowhere); this decides what opening it entails.
   *
   * ⚠ ENTERING A WEEK IS NOT THE SAME AS OPENING A DAY IN IT. An untouched week that has a built sibling
   * gets offered a copy — that is `openWeek`'s job and it is the difference between rebuilding twelve
   * weeks by hand and copying one. Walking into Week 2 from the last day of Week 1 must not skip it, so
   * the copy sheet is raised here on exactly the same condition, over the day that is now open. Both of
   * its answers (copy, or start empty) leave the athlete on that day, so neither path loses the move.
   */
  const goToNextDay = () => {
    if (!draft) return;
    const stop = nextDayStop(draft);
    if (!stop) return;
    if (stop.week == null) {
      mutate((d) => ({ ...d, openDay: stop.day }));
      return;
    }
    const plans = draft.weekPlans ?? [];
    const canCopy = plans.some((w, k) => k !== stop.week && weekBuilt(w));
    mutate((d) => ({ ...d, openWeek: stop.week, openDay: stop.day }));
    if (!weekBuilt(plans[stop.week]) && canCopy) setWeekSheet({ index: stop.week, entering: true });
  };

  /** "Save & continue" — move to the next week still needing work; all built → back to the week list. */
  const advanceWeek = () => {
    if (!draft || draft.openWeek == null) return;
    const next = nextIncompleteWeek(draft, draft.openWeek);
    if (next == null) mutate((d) => ({ ...d, openWeek: null, openDay: null }));
    else openWeek(next);
  };

  const onCancel = () => {
    if (draft && draftHasContent(draft)) {
      setConfirmClose(true);
      return;
    }
    void clearProgramDraft(draftKind);
    router.back();
  };

  const keepDraft = () => {
    setConfirmClose(false);
    router.back();
  };

  const discardDraft = () => {
    setConfirmClose(false);
    void clearProgramDraft(draftKind);
    router.back();
  };

  const onSave = async () => {
    if (!draft || !isDraftValid(draft) || saving) return;
    /* Backstop only, and only on the paths that CREATE. An edit writes back over a program that
       already exists and spends no slot — gating it would mean a Free athlete at the cap could never
       fix a typo in a program they already own, which is Never Charge For History pointed at the one
       thing it most obviously protects. The real pre-action check is at the tap that opens the
       builder; `programs_cap_guard()` in 0145 is the server's own last word. */
    if (draft.mode !== 'edit' && !guard(isWeek ? 'short_programs' : 'programs')) return;
    /* The count invariant, checked at the last possible moment rather than at each keystroke — an athlete
       mid-edit may legitimately pass through an unbalanced state on the way to a balanced one. */
    const violation = liveEditViolation(draft);
    if (violation) {
      setError(violation);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const structure = draftToStructure(draft);

      // A WEEK saves to `week_templates` and stops there — it is a shape, not a commitment, so nothing
      // is started and nothing is recorded. Running it is a separate, deliberate act on its detail
      // screen, which is also where the "this ends your active program" question belongs.
      if (isWeek) {
        const { id: weekId } = await saveWeekTemplate(draft.name, structure, draft.mode === 'edit' ? draft.editId : null);
        await clearProgramDraft(draftKind);
        void claimInitiativeHonor().catch(() => {});
        router.replace({ pathname: '/week-template/[id]', params: { id: weekId } });
        return;
      }

      // Edit writes back over the source; new AND duplicate both create a fresh program, so a copy can
      // never overwrite the original it was forked from.
      let id: string;
      if (draft.mode === 'edit' && draft.editId) {
        await updateProgram(draft.editId, structure);
        id = draft.editId;
      } else {
        ({ id } = await createProgram(structure));
      }
      await clearProgramDraft(draftKind);
      /* The import is spent HERE — a real program now exists from it. Best-effort and never awaited into
         the happy path: the row is written, and failing to tick a counter must not cost the athlete the
         program they just made. Create paths only; an edit rewrites something that already exists. */
      if (fromImport && draft.mode !== 'edit') void markFreeImportUsed().catch(() => {});
      // First-move honor (build path): grant "Initiative" — best-effort, DB dedupes to one row.
      void claimInitiativeHonor().catch(() => {});
      router.replace({ pathname: '/program/[id]', params: { id } });
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  if (!draft) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(6,7,8,0.3)' }} />
      </View>
    );
  }

  const days = activeDays(draft);
  const openDay = draft.openDay != null ? days[draft.openDay] : undefined;
  // Three views off one draft: a day being built wins, then an open week's day list, else Setup.
  const weekView = !openDay && draft.vary && draft.openWeek != null;

  /*
   * What the Day Builder's forward button promises, or null on the last day of the last week — which is
   * what demotes it and puts Save back in charge. A cross-week move names the WEEK as well, because
   * "Save & go to Day A" from the end of Week 1 would read as going backwards.
   */
  const nextStop = nextDayStop(draft);
  const nextStopDay = nextStop ? dayAtStop(draft, nextStop) : undefined;
  /*
   * ⚠ THE DAY NAME IS TRUNCATED FOR THE BUTTON AND NOT FOR THE SCREEN READER. A day name takes 30
   * characters, and "Save & go to Week 2 · Upper Body Heavy Push" wraps a footer button onto three
   * lines. The ellipsis is a fit problem, so it is solved where the fit is — the accessibility label
   * keeps the whole name, because a truncation is not something to read aloud.
   */
  const nextStopLabel = nextStop && nextStopDay ? `${nextStop.week == null ? '' : `Week ${nextStop.week + 1} · `}${dayName(nextStopDay)}` : null;
  const nextStopShort = nextStop && nextStopDay ? `${nextStop.week == null ? '' : `Week ${nextStop.week + 1} · `}${ellipsis(dayName(nextStopDay), 16)}` : null;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(6,7,8,0.3)' }} />

      {openDay && draft.openDay != null ? (
        <DayBuilder
          day={openDay}
          nextLabel={nextStopShort}
          nextLabelFull={nextStopLabel}
          onBack={() => mutate((d) => ({ ...d, openDay: null }))}
          onNext={goToNextDay}
          onName={(v) => patchActiveDay(draft.openDay!, (day) => ({ ...day, name: v }))}
          onAdd={(section) => {
            router.push({
              pathname: '/exercise-picker',
              params: {
                mode: 'builder',
                vary: draft.vary ? '1' : '0',
                week: String(draft.openWeek ?? 0),
                day: String(draft.openDay),
                section,
              },
            });
          }}
          onRemove={(section, i) => patchSection(draft.openDay!, section, (list) => list.filter((_, k) => k !== i))}
          // Superset authoring (0106). Pure list-in/list-out, so the rules — adjacency, extend rather
          // than fork, rounds from the longest member — live in the tested draft model, not in a handler.
          onPair={(section, i) => patchSection(draft.openDay!, section, (list) => pairWithNext(list, i))}
          onUnpair={(section, i) => patchSection(draft.openDay!, section, (list) => unpairAt(list, i))}
          onMove={(section, i, dir) =>
            patchSection(draft.openDay!, section, (list) => {
              const j = i + dir;
              if (j < 0 || j >= list.length) return list;
              const next = [...list];
              [next[i], next[j]] = [next[j], next[i]];
              return next;
            })
          }
          onAddCardio={(section) => setCardioSheet(section)}
          onUseTemplate={() => setTemplateSheet(true)}
          onModality={(section, i, m) =>
            patchSection(draft.openDay!, section, (list) =>
              list.map((x, k) => {
                if (k !== i || !x.activity || x.modality === m) return x;
                // The name and equipment are DERIVED — the author never types them, so the block always
                // states what it is rather than drifting out of step with its own toggle.
                return { ...x, modality: m, name: deriveName(x.activity, m), equip: deriveEquip(x.activity, m) };
              }),
            )
          }
          onSlotA={(section, i, dir) =>
            patchSection(draft.openDay!, section, (list) =>
              list.map((x, k) => {
                if (k !== i) return x;
                if (x.kind !== 'cardio') return { ...x, sets: clampSets((x.sets ?? 1) + dir) };
                /* Stepped IN THE UNIT THE ATHLETE IS READING. A swim walks hundreds of yards; everything
                   else walks half-miles. Stepping the canonical mile figure and converting afterwards
                   would land 1200 yd on 1197. */
                const act = x.activity ?? 'run';
                return {
                  ...x,
                  targetMi: bumpDistanceUnit(x.targetMi ?? null, dir, distanceUnitFor(act, metric), FIRST_TARGET[act].mi),
                };
              }),
            )
          }
          /* THE CLOCK. Every endurance plan ever written is written in minutes, and until now this was
             the one cardio target the builder could not state — see `bumpDuration`. */
          onSlotTime={(section, i, dir) =>
            patchSection(draft.openDay!, section, (list) =>
              list.map((x, k) => (k !== i ? x : { ...x, targetSec: bumpDuration(x.targetSec ?? null, dir) })),
            )
          }
          /* Both prime FIRST and synchronously: the sheet's field is inside a `<Modal>`, so it does not
             exist at the moment of the tap and its `autoFocus` fires one commit later — outside the
             gesture, which is where iOS Safari stops raising a keyboard. `decimal-pad`, matching the
             field being handed to. See `KeyboardPrimer`. */
          onTypeTime={(section, i) => {
            primeKeyboard('decimal-pad');
            const cur = days[draft.openDay!]?.[section]?.[i]?.targetSec;
            setTargetDraft(cur == null ? '' : String(Math.round(cur / 60)));
            setTargetSheet({ section, index: i, field: 'time' });
          }}
          onTypeDistance={(section, i) => {
            primeKeyboard('decimal-pad');
            const row = days[draft.openDay!]?.[section]?.[i];
            const unit = distanceUnitFor((row?.activity ?? 'run') as CardioActivity, metric);
            setTargetDraft(row?.targetMi == null ? '' : fmtDistanceIn(row.targetMi, unit));
            setTargetSheet({ section, index: i, field: 'distance' });
          }}
          onEditNote={(section, i) => {
            /* Seeded from what is already there, so opening an existing cue EDITS it. Without this the
               sheet opens blank and saving silently replaces the note with nothing. */
            setNoteDraft(days[draft.openDay!]?.[section]?.[i]?.coachNote ?? '');
            setNoteSheet({ section, index: i });
          }}
          metric={metric}
          onSlotB={(section, i, dir) =>
            patchSection(draft.openDay!, section, (list) =>
              list.map((x, k) =>
                k !== i
                  ? x
                  : x.kind !== 'cardio'
                    ? { ...x, reps: clampReps((x.reps ?? 1) + dir) }
                    : x.activity === 'bike'
                      ? { ...x, targetSpdMph: bumpSpeed(x.targetSpdMph ?? null, dir, FIRST_TARGET[x.activity ?? 'bike'].spdMph) }
                      : { ...x, targetPaceSec: bumpPace(x.targetPaceSec ?? null, dir, FIRST_TARGET[x.activity ?? 'run'].paceSec) },
              ),
            )
          }
        />
      ) : weekView ? (
        <WeekDaysView
          draft={draft}
          days={days}
          onBack={() => mutate((d) => ({ ...d, openWeek: null, openDay: null }))}
          onOpenDay={(i) => (dayIsFrozen(i) ? setError(FROZEN_NOTE) : mutate((d) => ({ ...d, openDay: i })))}
          onOpenDayMenu={setDayMenu}
          onOpenJump={() => setJumpOpen(true)}
          onOpenWeekSheet={() => setWeekSheet({ index: draft.openWeek ?? 0, entering: false })}
          onAdvance={advanceWeek}
        />
      ) : (
        <SetupView
          draft={draft}
          days={days}
          isWeek={isWeek}
          saving={saving}
          error={error}
          onCancel={onCancel}
          onName={(v) => mutate((d) => ({ ...d, name: v }))}
          onWeeks={requestWeeks}
          onDays={requestDays}
          onOpenDay={(i) => (dayIsFrozen(i) ? setError(FROZEN_NOTE) : mutate((d) => ({ ...d, openDay: i })))}
          onOpenDayMenu={setDayMenu}
          onOpenWeek={openWeek}
          onOpenWeekMenu={(i) => setWeekSheet({ index: i, entering: false })}
          onOpenImport={openImport}
          onOpenJump={() => setJumpOpen(true)}
          onRepeat={requestRepeat}
          onVary={() => mutate(setVaryMode)}
          onSave={onSave}
        />
      )}

      {/*
        TWO WALKTHROUGHS, ONE ROUTE. Setup and the Day Builder are different screens in every sense that
        matters — different controls, different question being answered — and a single tour spanning both
        would have to survive a view change mid-run. Each fires on its own first visit and is remembered
        separately, so opening your first day months later still explains the day.
      */}
      <ScreenTour screenKey="program-builder" ready={!openDay && !weekView} />
      <ScreenTour screenKey="day-builder" ready={!!openDay} />

      {/* Jump to week — the progress bar's destination. */}
      {/* Add a cardio block. Three activities — the modality is set on the card afterwards, and the
          targets are steppers rather than fields because either one can be left open. */}
      <BottomSheet open={cardioSheet != null} onClose={() => setCardioSheet(null)} title="Add a cardio block">
        <Text style={styles.cardioIntro}>
          Set the distance, time and pace on the card. Leave any of them open and the athlete decides.
        </Text>
        <View style={styles.sectionBody}>
          {CARDIO_ACTIVITIES.map((a) => (
            <Pressable
              key={a.key}
              onPress={() => {
                const section = cardioSheet;
                setCardioSheet(null);
                if (!section || draft.openDay == null) return;
                patchSection(draft.openDay, section, (list) => [
                  ...list,
                  {
                    id: `c${Date.now()}${Math.round(Math.random() * 1e6)}`,
                    kind: 'cardio' as const,
                    ...newCardioBlock(a.key),
                  },
                ]);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add a ${a.name.toLowerCase()}`}
              style={styles.cardioRow}
            >
              <View style={styles.cardioIcon}>
                <ActivityGlyph activity={a.key} size={19} color={flColor.bronze400} />
              </View>
              <View style={styles.cardioRowText}>
                <Text style={styles.cardioRowName}>{a.name}</Text>
                <Text style={styles.cardioRowSub}>{a.sub}</Text>
              </View>
              <Glyph d="M9 6l6 6-6 6" size={15} color={flColor.gray600} width={2} />
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      {/* ── TYPE A TARGET ───────────────────────────────────────────────────────────────────────────
          A number pad and nothing else. Stepping is a nudge; this is how a target gets SET, because
          twelve taps to reach 1200 yd and a five-minute grain that cannot state a 12-minute brick are
          both the stepper being asked to do a job it is bad at.

          Clearing the field and saving sets the target back to Open, which is a real prescription. */}
      <BottomSheet
        open={targetSheet != null}
        onClose={() => setTargetSheet(null)}
        title={targetSheet?.field === 'time' ? 'Time' : 'Distance'}
      >
        <View style={styles.sectionBody}>
          <Text style={styles.cardioIntro}>
            {targetSheet?.field === 'time'
              ? 'How many MINUTES? A 90-minute ride is 90; two and a half hours is 150. Leave it empty for no target.'
              : `How far, in ${targetUnitLabel}? Leave it empty for no target.`}
          </Text>
          <TextInput
            value={targetDraft}
            onChangeText={setTargetDraft}
            keyboardType="decimal-pad"
            inputMode="decimal"
            autoFocus
            selectTextOnFocus
            maxLength={7}
            placeholder={targetSheet?.field === 'time' ? 'minutes' : targetUnitLabel}
            placeholderTextColor={flColor.gray600}
            accessibilityLabel={targetSheet?.field === 'time' ? 'Minutes' : `Distance in ${targetUnitLabel}`}
            style={styles.targetInput}
          />
          <Button
            variant="primary"
            fullWidth
            onPress={() => {
              const at = targetSheet;
              if (!at || draft.openDay == null) return setTargetSheet(null);
              const raw = targetDraft.trim();
              patchSection(draft.openDay, at.section, (list) =>
                list.map((x, k) => {
                  if (k !== at.index) return x;
                  if (at.field === 'time') {
                    const mins = Number(raw.replace(',', '.'));
                    // An empty or unreadable entry clears the target rather than inventing one.
                    const sec = raw && Number.isFinite(mins) && mins > 0 ? Math.round(mins * 60) : null;
                    return { ...x, targetSec: sec };
                  }
                  const unit = distanceUnitFor((x.activity ?? 'run') as CardioActivity, metric);
                  return { ...x, targetMi: raw ? parseDistanceIn(raw, unit) : null };
                }),
              );
              setTargetSheet(null);
            }}
            accessibilityLabel="Save this target"
          >
            Save
          </Button>
          <Button variant="text" fullWidth onPress={() => setTargetSheet(null)} accessibilityLabel="Cancel">
            Cancel
          </Button>
        </View>
      </BottomSheet>

      {/* ── THE AUTHOR'S COACHING CUE ───────────────────────────────────────────────────────────────
          "4 seconds down, then push up." "Calf check — stop if pain climbs." "Hold Z2."

          The one thing a program could not say until now. `ExercisePrescription` carried a comment
          explaining that a notes field was deliberately absent because nothing rendered one — true, and
          the reason it stayed absent. This is the other half: the cue is drawn on the exercise card in
          the active workout and in its ⋯ menu, so the field is read as well as written.

          Cleared by emptying it. A cue you cannot delete makes the first typo permanent. */}
      <BottomSheet
        open={noteSheet != null}
        onClose={() => setNoteSheet(null)}
        title={
          noteSheet && draft.openDay != null
            ? days[draft.openDay]?.[noteSheet.section]?.[noteSheet.index]?.name ?? 'Coaching note'
            : 'Coaching note'
        }
      >
        <View style={styles.sectionBody}>
          <Text style={styles.cardioIntro}>
            What should they know while they’re doing it? Tempo, effort, a form cue, when to back off.
            Whoever trains this day sees it on the exercise.
          </Text>
          {/* A raw multiline field rather than `InputField`, which is specified single-line for names
              and short capped fields. A cue runs to a sentence or three. */}
          <TextInput
            value={noteDraft}
            onChangeText={setNoteDraft}
            multiline
            maxLength={280}
            placeholder="4 seconds down, then push up"
            placeholderTextColor={flColor.gray600}
            accessibilityLabel="Coaching note for this exercise"
            style={styles.noteInput}
          />
          <Button
            variant="primary"
            fullWidth
            onPress={() => {
              const at = noteSheet;
              if (!at || draft.openDay == null) return setNoteSheet(null);
              const next = noteDraft.trim().slice(0, 280);
              patchSection(draft.openDay, at.section, (list) =>
                list.map((x, k) => (k === at.index ? { ...x, coachNote: next || null } : x)),
              );
              setNoteSheet(null);
            }}
            accessibilityLabel="Save the coaching note"
          >
            Save Note
          </Button>
          <Button variant="text" fullWidth onPress={() => setNoteSheet(null)} accessibilityLabel="Cancel">
            Cancel
          </Button>
        </View>
      </BottomSheet>

      {/* ── USE A TEMPLATE AS THIS DAY ──────────────────────────────────────────────────────────────
          Both libraries in one list, because from the builder's point of view they are one thing: a
          workout shape to put in a day. The athlete's own come FIRST — they are fewer, they are theirs,
          and a saved "Push Day" is a better answer to "what goes in day A" than the eighty-first
          suggestion from Forge. The Forge set is capped to the profile's own track and searched rather
          than listed, because 81 rows in a sheet is a scroll, not a choice. */}
      <TemplateDaySheet
        open={templateSheet}
        onClose={() => setTemplateSheet(false)}
        onChoose={chooseTemplate}
        sex={profile?.sex}
      />

      {/* Replace is destructive and irreversible in a draft that autosaves, so it is never the tap that
          chose the template — it is a second, named choice. */}
      <BottomSheet
        open={templatePending != null}
        onClose={() => setTemplatePending(null)}
        title={templatePending ? templatePending.name : ''}
      >
        <View style={styles.resizeSheet}>
          <Text style={styles.resizeMsg}>
            This day already has exercises in it. Replace them with {templatePending?.name ?? 'this template'}, or add it
            after what&apos;s already here?
          </Text>
          <View style={styles.resizeActions}>
            <View style={styles.resizeBtn}>
              <Button variant="secondary" fullWidth onPress={() => applyPendingTemplate('append')} accessibilityLabel="Add to this day">
                Add to it
              </Button>
            </View>
            <View style={styles.resizeBtn}>
              <Button variant="destructive" fullWidth onPress={() => applyPendingTemplate('replace')} accessibilityLabel="Replace this day">
                Replace
              </Button>
            </View>
          </View>
        </View>
      </BottomSheet>

      <WeekTemplateSheet
        open={weekTplFor != null}
        weekNumber={(weekTplFor ?? 0) + 1}
        daysPerWeek={draft.daysPerWeek}
        onClose={() => setWeekTplFor(null)}
        onChoose={(name, days) => chooseWeekTemplate(weekTplFor ?? 0, name, days)}
      />

      {/* What the replacement COSTS, in numbers, before it happens. Only ever opened when there is
          something to say — see `chooseWeekTemplate`. */}
      <BottomSheet
        open={weekTplPending != null}
        onClose={() => setWeekTplPending(null)}
        title={weekTplPending ? `Week ${weekTplPending.index + 1}` : ''}
      >
        <View style={styles.resizeSheet}>
          <Text style={styles.resizeMsg}>
            {weekTplPending
              ? [
                  `Week ${weekTplPending.index + 1} becomes ${weekTplPending.name}.`,
                  weekBuilt(draft.vary ? draft.weekPlans?.[weekTplPending.index] : { days: draft.days })
                    ? 'What you built in it is replaced.'
                    : null,
                  /* Stated as a COUNT and a REASON, because "2 days won't fit" without the reason reads
                     as a bug in the import rather than as the arithmetic of two day counts. */
                  weekTplPending.fit.dropped > 0
                    ? `This week has ${weekTplPending.fit.taken + weekTplPending.fit.dropped} days and your program trains ${draft.daysPerWeek} — only the first ${weekTplPending.fit.taken} come in.`
                    : null,
                  weekTplPending.fit.emptied > 0
                    ? `It has ${weekTplPending.fit.taken} days, so the last ${weekTplPending.fit.emptied === 1 ? 'day' : `${weekTplPending.fit.emptied} days`} of this week ${weekTplPending.fit.emptied === 1 ? 'is' : 'are'} left empty.`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' ')
              : ''}
          </Text>
          <View style={styles.resizeActions}>
            <View style={styles.resizeBtn}>
              <Button variant="secondary" fullWidth onPress={() => setWeekTplPending(null)} accessibilityLabel="Keep this week as it is">
                Keep it
              </Button>
            </View>
            <View style={styles.resizeBtn}>
              <Button variant="destructive" fullWidth onPress={applyPendingWeek} accessibilityLabel="Use the saved week">
                Use it
              </Button>
            </View>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet open={jumpOpen} onClose={() => setJumpOpen(false)} title="Jump to week">
        <ScrollView style={styles.jumpScroll} showsVerticalScrollIndicator={false}>
          {(draft.weekPlans ?? []).map((w, i) => {
            const done = weekComplete(w);
            const current = i === draft.openWeek;
            return (
              <Pressable
                key={i}
                onPress={() => {
                  setJumpOpen(false);
                  openWeek(i);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Week ${i + 1}, ${done ? 'built' : current ? 'current' : 'not started'}`}
                style={[styles.jumpRow, current && styles.jumpRowCurrent]}
              >
                {done ? (
                  <View style={styles.doneMark}>
                    <Glyph d={CHECK} size={11} color={flColor.bronze300} width={2.8} />
                  </View>
                ) : current ? (
                  <View style={styles.jumpCurrentDot} />
                ) : (
                  <View style={styles.jumpTodoDot} />
                )}
                <Text style={styles.jumpLabel}>Week {i + 1}</Text>
                <Text style={[styles.jumpStatus, current && styles.jumpStatusCurrent]}>
                  {current ? 'Current' : done ? 'Built' : 'Not started'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>

      {/* Week sheet — seeds an empty week on entry, or acts as that week's overflow menu. */}
      <BottomSheet open={weekSheet != null} onClose={() => setWeekSheet(null)} title={weekSheet ? `Week ${weekSheet.index + 1}` : ''}>
        <View style={styles.resizeSheet}>
          <Text style={styles.resizeMsg}>
            {weekSheet?.entering
              ? "Start from a week you've saved, copy one you've already built, or start from scratch."
              : 'Bring in a saved week, copy another week, or clear this one.'}
          </Text>

          {/* ── A SAVED WEEK ────────────────────────────────────────────────────────────────────────
              First, above Copy, because it reaches OUTSIDE this program — and that is the wider door.
              Copy answers "again, like week 2"; this answers "the week I built for exactly this", which
              is the one an athlete arrives holding. Until this existed a day template could fill a day
              and a week template could only ever be run on its own, which made the two libraries read as
              different KINDS of thing when they are the same idea at two sizes. ── */}
          <Pressable
            onPress={() => {
              const i = weekSheet?.index ?? 0;
              setWeekSheet(null);
              setWeekTplFor(i);
            }}
            accessibilityRole="button"
            accessibilityLabel="Use a week you have saved"
            style={({ pressed }) => [styles.templateLink, pressed ? styles.pressed : null]}
          >
            <Glyph d={LINES} size={16} color={flColor.bronze300} width={1.8} />
            <View style={styles.templateLinkText}>
              <Text style={styles.templateLinkTitle}>Use a saved week</Text>
              <Text style={styles.templateLinkSub}>One of your week templates becomes this week</Text>
            </View>
            <Glyph d="M9 6l6 6-6 6" size={15} color={flColor.gray600} width={2} />
          </Pressable>
          {weekSheet
            ? (() => {
                const sources = (draft.weekPlans ?? [])
                  .map((w, i) => ({ i, built: weekBuilt(w) }))
                  .filter((s) => s.i !== weekSheet.index && s.built);
                return sources.length ? (
                  <View>
                    <Text style={styles.microLabel}>Copy from</Text>
                    <View style={styles.copyChips}>
                      {sources.map((s) => (
                        <Pressable
                          key={s.i}
                          onPress={() => {
                            mutate((d) => copyWeek(d, s.i, weekSheet.index));
                            setWeekSheet(null);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Copy week ${s.i + 1}`}
                          style={styles.copyChip}
                        >
                          <Text style={styles.copyChipText}>Week {s.i + 1}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null;
              })()
            : null}
          {weekSheet?.entering ? (
            <Button variant="secondary" fullWidth onPress={() => setWeekSheet(null)} accessibilityLabel="Start empty">
              Start empty
            </Button>
          ) : (
            <Button
              variant="destructive"
              fullWidth
              onPress={() => {
                if (weekSheet) mutate((d) => clearWeek(d, weekSheet.index));
                setWeekSheet(null);
              }}
              accessibilityLabel="Clear week"
            >
              Clear week
            </Button>
          )}
        </View>
      </BottomSheet>

      {/* Day options (Pass 3) — rename, duplicate onto another day, clear. */}
      <BottomSheet
        open={dayMenu != null}
        onClose={() => setDayMenu(null)}
        title={dayMenu != null && days[dayMenu] ? dayName(days[dayMenu]) : ''}
      >
        <View style={styles.resizeSheet}>
          {dayMenu != null && days[dayMenu] ? (
            <>
              <InputField
                label="Workout name"
                value={days[dayMenu].name}
                onChange={(v) => patchActiveDay(dayMenu, (day) => ({ ...day, name: v }))}
                maxLength={30}
              />
              {days.length > 1 ? (
                <View>
                  <Text style={styles.microLabel}>Duplicate exercises to</Text>
                  <View style={styles.copyChips}>
                    {days.map((d, i) =>
                      i === dayMenu ? null : (
                        <Pressable
                          key={`${d.letter}-${i}`}
                          onPress={() => {
                            const src = days[dayMenu];
                            patchActiveDay(i, () => ({
                              ...d,
                              warmup: cloneDays([src])[0].warmup,
                              main: cloneDays([src])[0].main,
                              cooldown: cloneDays([src])[0].cooldown,
                            }));
                            setDayMenu(null);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Duplicate to ${dayName(d)}`}
                          style={styles.copyChip}
                        >
                          <Text style={styles.copyChipText}>{dayName(d)}</Text>
                        </Pressable>
                      ),
                    )}
                  </View>
                </View>
              ) : null}
              <Button
                variant="destructive"
                fullWidth
                onPress={() => {
                  patchActiveDay(dayMenu, (day) => ({ ...day, warmup: [], main: [], cooldown: [] }));
                  setDayMenu(null);
                }}
                accessibilityLabel="Clear all exercises"
              >
                Clear all exercises
              </Button>
            </>
          ) : null}
        </View>
      </BottomSheet>

      <BottomSheet open={confirmClose} onClose={() => setConfirmClose(false)} title="Leave the builder?">
        <View style={styles.resizeSheet}>
          <Text style={styles.resizeMsg}>
            Your draft is saved — come back and pick up exactly where you left off. Discarding throws it away for good.
          </Text>
          <View style={styles.resizeActions}>
            <View style={styles.resizeBtn}>
              <Button variant="secondary" fullWidth onPress={keepDraft} accessibilityLabel="Keep the draft and leave">
                Keep draft
              </Button>
            </View>
            <View style={styles.resizeBtn}>
              <Button variant="destructive" fullWidth onPress={discardDraft} accessibilityLabel="Discard the draft">
                Discard
              </Button>
            </View>
          </View>
        </View>
      </BottomSheet>

      {/* ── IMPORT FROM A SPREADSHEET ─────────────────────────────────────
          One sheet, two states, per the design: paste → preview. The paste state's copy IS the parser's
          contract, so it states exactly what is read rather than describing a format vaguely. */}
      {/* `scroll` because an imported program is long — six days and forty-five exercises ran off the top
          of the screen with no way back. The actions live in the FOOTER so they stay put while the
          preview scrolls; buried under forty-five rows they may as well not exist. */}
      <BottomSheet
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import from spreadsheet"
        scroll
        footer={
          preview == null ? undefined : (
            <View style={styles.impActions}>
              <View style={styles.impBackBtn}>
                <Button variant="secondary" fullWidth onPress={() => setPreview(null)}>
                  Back
                </Button>
              </View>
              <View style={styles.impCreateBtn}>
                <Button variant="primary" fullWidth onPress={confirmImport}>
                  Create program
                </Button>
              </View>
            </View>
          )
        }
      >
        {preview == null ? (
          <View style={styles.impCol}>
            <Text style={styles.impHint}>
              Paste rows from Excel or Google Sheets. Include a header row — columns can be in any order.
              We look for <Text style={styles.impHintStrong}>Week</Text>, <Text style={styles.impHintStrong}>Day</Text>,{' '}
              <Text style={styles.impHintStrong}>Exercise</Text>, <Text style={styles.impHintStrong}>Sets</Text>,{' '}
              <Text style={styles.impHintStrong}>Reps</Text>. One week or the whole program — either works.
              {'\n\n'}
              Keep it one row per <Text style={styles.impHintStrong}>day</Text> instead? That works too —
              write the session out (&ldquo;75min bike Z2 + 30min upper strength&rdquo;) and we&rsquo;ll read the
              rides, runs and swims out of it. Check what we read before you create it.
              {PHOTO_IMPORT_ENABLED ? (
                <>
                {'\n\n'}
                Only have a <Text style={styles.impHintStrong}>screenshot</Text>? Read it in below — we type
                the table out for you and it lands in the box above, where you can fix anything we misread
                before previewing it.
                </>
              ) : null}
            </Text>
            <TextInput
              value={pasteText}
              onChangeText={setPasteText}
              multiline
              placeholder={'Week, Day, Exercise, Sets, Reps\n1, Push A, Bench Press, 3, 8\n1, Push A, Incline DB Press, 3, 10'}
              placeholderTextColor={flColor.gray600}
              accessibilityLabel="Paste your spreadsheet rows"
              style={styles.impPaste}
            />
            {importError ? <Text style={styles.impError}>{importError}</Text> : null}
            <Button variant="primary" fullWidth onPress={() => runParse(pasteText)}>
              Preview import
            </Button>
            <Pressable
              onPress={() => void onPickFile()}
              accessibilityRole="button"
              accessibilityLabel="Upload a CSV file"
              style={({ pressed }) => [styles.impFileBtn, pressed ? styles.impPressed : null]}
            >
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <Path d="M14 3v6h6" />
              </Svg>
              <Text style={styles.impFileText}>Or upload a .csv file</Text>
            </Pressable>
            {/* ⚠ LIBRARY ONLY, AND THAT IS A DECISION — see `pickImageFromLibrary`. The label says
                "screenshot" rather than "photo" because that is both the real use case and the honest
                description of what this opens: your camera roll, not your camera. */}
            {PHOTO_IMPORT_ENABLED ? (
              <Pressable
                onPress={() => void onPickPhoto()}
                disabled={photoBusy}
                accessibilityRole="button"
                accessibilityLabel="Read a screenshot of a program"
                accessibilityState={{ disabled: photoBusy, busy: photoBusy }}
                style={({ pressed }) => [
                  styles.impFileBtn,
                  pressed && !photoBusy ? styles.impPressed : null,
                  photoBusy ? styles.impBusy : null,
                ]}
              >
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <Circle cx={8.5} cy={8.5} r={1.5} />
                  <Path d="M21 15l-5-5L5 21" />
                </Svg>
                <Text style={styles.impFileText}>
                  {photoBusy ? 'Reading your screenshot…' : 'Or read a screenshot'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.impCol}>
            <View style={styles.impSummary}>
              <Text style={styles.impSummaryLabel}>Here&apos;s what we read</Text>
              <Text style={styles.impSummaryText}>{summarize(preview)}</Text>
            </View>
            <Text style={styles.impNote}>
              Tap − / + to fix any sets × reps now. Grey text is the sentence we read it from — it is kept
              as a coaching note, so anything we couldn&rsquo;t turn into a number still reaches you. You can
              rename, reorder and add exercises after you create the program.
            </Text>

            {preview.map((w, wi) => (
              <View key={`w${w.index}`} style={styles.impWeekBlock}>
                {preview.length > 1 ? (
                  <View style={styles.impWeekHead}>
                    <Text style={styles.impWeekLabel}>Week {w.index}</Text>
                    <View style={styles.impWeekRule} />
                  </View>
                ) : null}
                {w.days.map((d, di) => (
                  <View key={`${w.index}-${d.letter}`} style={styles.impDayCard}>
                    <Text style={styles.impDayName}>{d.name}</Text>
                    <View style={styles.impItems}>
                      {d.items.map((it, ii) => (
                        <View key={`${it.name}-${ii}`} style={styles.impItemRow}>
                          <View style={styles.impItemText}>
                            <Text style={styles.impItemName} numberOfLines={1}>
                              {it.name}
                            </Text>
                            {/*
                              ══ THE SENTENCE IT CAME FROM ══

                              Shown because this reader is a HEURISTIC and the preview is what makes that
                              honest. The athlete can see that "75min bike Z2 w/ 3x8min Z3" was read as a
                              75-minute ride, and that the interval detail it could not structure has been
                              kept as a coaching note rather than dropped. Without this line, a confident
                              wrong reading looks exactly like a right one.
                            */}
                            {it.note && it.note !== it.name ? (
                              <Text style={styles.impItemSource} numberOfLines={2}>
                                {it.note}
                              </Text>
                            ) : null}
                            {/* WHAT THE NAME RESOLVED TO, before anything is created.
                                A match found by the equipment convention rather than by the words is a
                                judgement, not a fact — showing it is what makes the convention honest,
                                and the athlete can swap the exercise in the builder afterwards. */}
                            {(() => {
                              // A bout is not looked up: its key is the `cardio:<activity>` convention.
                              if (it.kind === 'cardio') return null;
                              const hit = resolveName(it.name);
                              if (!hit) return <Text style={styles.impItemUnmatched}>not in the library · kept as written</Text>;
                              if (hit.name.toLowerCase() === it.name.trim().toLowerCase()) return null;
                              return (
                                <Text style={styles.impItemMatched} numberOfLines={1}>
                                  {hit.byPreference ? '≈ ' : '→ '}
                                  {hit.name}
                                </Text>
                              );
                            })()}
                          </View>
                          {/* A bout states its TARGET. Sets × reps is not a thing a 75-minute ride has,
                              and steppers for them would invite editing a number that does not exist. */}
                          {it.kind === 'cardio' ? (
                            <Text style={styles.impTarget}>{cardioTargetText(it)}</Text>
                          ) : (
                          <View style={styles.impSteppers}>
                            <ImpStep label={`Fewer sets of ${it.name}`} glyph="−" onPress={() => bumpPreview(wi, di, ii, 'sets', -1)} />
                            <Text style={[styles.impNum, it.setsAssumed ? styles.impNumAssumed : null]}>{it.sets}</Text>
                            <ImpStep label={`More sets of ${it.name}`} glyph="+" onPress={() => bumpPreview(wi, di, ii, 'sets', 1)} />
                            <Text style={styles.impTimes}>×</Text>
                            <ImpStep label={`Fewer reps of ${it.name}`} glyph="−" onPress={() => bumpPreview(wi, di, ii, 'reps', -1)} />
                            <Text style={[styles.impNum, styles.impNumWide, it.repsAssumed ? styles.impNumAssumed : null]}>{it.reps}</Text>
                            <ImpStep label={`More reps of ${it.name}`} glyph="+" onPress={() => bumpPreview(wi, di, ii, 'reps', 1)} />
                          </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ))}

            <Pressable
              onPress={addPreviewWeek}
              accessibilityRole="button"
              accessibilityLabel="Add another week"
              style={({ pressed }) => [styles.impAddWeek, pressed ? styles.impPressed : null]}
            >
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 5v14M5 12h14" />
              </Svg>
              <Text style={styles.impAddWeekText}>Add another week</Text>
            </Pressable>

          </View>
        )}
      </BottomSheet>

      {/* ⚠ THE REPEAT CASE IS WORDED DIFFERENTLY BECAUSE IT IS DIFFERENT. Shrinking removes content now;
          switching to Repeat sets it aside and only discards it on the next Save. Titling that "Remove
          content?" would be a threat the app does not carry out, and the athlete would learn the sheet
          lies. */}
      <BottomSheet
        open={pendingResize != null}
        onClose={() => setPendingResize(null)}
        title={pendingResize?.kind === 'repeat' ? 'Use one repeating week?' : 'Remove content?'}
      >
        <View style={styles.resizeSheet}>
          <Text style={styles.resizeMsg}>{pendingResize?.msg ?? ''}</Text>
          <View style={styles.resizeActions}>
            <View style={styles.resizeBtn}>
              <Button variant="secondary" fullWidth onPress={() => setPendingResize(null)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
            <View style={styles.resizeBtn}>
              <Button
                variant="destructive"
                fullWidth
                onPress={confirmResize}
                accessibilityLabel={pendingResize?.kind === 'repeat' ? 'Switch to one repeating week' : 'Remove content'}
              >
                {pendingResize?.kind === 'repeat' ? 'Switch' : 'Remove'}
              </Button>
            </View>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP — program details, length, training days, the weekly split
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The template chooser for a program day — the athlete's saved workouts above Forge's shipped sessions.
 *
 * ONE SEARCH OVER BOTH. Splitting them into two tabs would ask the athlete to know which library the
 * thing they want is in before they can look for it, and the answer to "where's my push day" is
 * genuinely "either". The sections stay labelled so provenance is never in doubt.
 *
 * THE FORGE SET IS FILTERED TO THEIR TRACK by default (`defaultAudiences`), the same rule the browse
 * screen opens on — and `'unspecified'` still sees everything, because the profile model's standing rule
 * is that an unset sex is never quietly read as male.
 *
 * The athlete's own list loads on open rather than on mount: this sheet is optional, most builds never
 * open it, and the builder must not spend a network round-trip on a screen that may never ask.
 */
function TemplateDaySheet({
  open,
  onClose,
  onChoose,
  sex,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (name: string, rows: DaySections) => void;
  sex: Sex | null | undefined;
}) {
  const [q, setQ] = useState('');
  const { data: mine, loading } = useQuery(() => (open ? fetchTemplates() : Promise.resolve([])), [open]);

  const needle = q.trim().toLowerCase();
  const match = (name: string) => !needle || name.toLowerCase().includes(needle);

  const ownRows = (mine ?? []).filter((t) => match(t.name));
  const forgeRows = filterStarters({ audiences: defaultAudiences(sex) }).filter((t) => match(t.name));
  const nothing = !loading && ownRows.length === 0 && forgeRows.length === 0;

  return (
    <BottomSheet open={open} onClose={onClose} title="Use a template" scroll>
      <View style={styles.tplCol}>
        <Text style={styles.tplIntro}>
          Its exercises, sets and reps become this day. You can change anything afterwards — nothing is linked, so
          editing the day never touches the template.
        </Text>

        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search templates"
          placeholderTextColor={flColor.gray600}
          accessibilityLabel="Search templates"
          style={styles.tplSearch}
        />

        {loading ? <Text style={styles.tplEmpty}>Loading your templates…</Text> : null}

        {ownRows.length ? (
          <>
            <Text style={styles.tplGroupLabel}>Your templates</Text>
            {ownRows.map((t) => (
              <TemplateDayRow
                key={t.id}
                name={t.name}
                rows={templateRowsToDay(t.exercises)}
                meta={t.sourceDefinitionId ? 'From Forge · yours' : 'Yours'}
                onChoose={onChoose}
              />
            ))}
          </>
        ) : null}

        {forgeRows.length ? (
          <>
            <Text style={styles.tplGroupLabel}>Built by Forge</Text>
            {forgeRows.map((t) => (
              <TemplateDayRow
                key={t.id}
                name={t.name}
                rows={templateRowsToDay(t.exercises)}
                meta={starterMeta(t)}
                onChoose={onChoose}
              />
            ))}
          </>
        ) : null}

        {nothing ? (
          <Text style={styles.tplEmpty}>
            {needle ? `Nothing matches “${q.trim()}”.` : 'No templates yet — save a session as one and it shows up here.'}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function TemplateDayRow({
  name,
  rows,
  meta,
  onChoose,
}: {
  name: string;
  rows: DaySections;
  meta: string;
  onChoose: (name: string, rows: DaySections) => void;
}) {
  return (
    <Pressable
      onPress={() => onChoose(name, rows)}
      accessibilityRole="button"
      accessibilityLabel={`Use ${name} — ${daySectionsSummary(rows)}`}
      style={({ pressed }) => [styles.tplRow, pressed ? styles.pressed : null]}
    >
      <View style={styles.tplRowText}>
        <Text style={styles.tplRowName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.tplRowSub} numberOfLines={1}>
          {daySectionsSummary(rows)} · {meta}
        </Text>
      </View>
      <Glyph d="M9 6l6 6-6 6" size={15} color={flColor.gray600} width={2} />
    </Pressable>
  );
}

/**
 * The weeks the athlete has saved, offered for one week of a program.
 *
 * ⚠ NO FORGE SHELF HERE, and the asymmetry with `TemplateDaySheet` is deliberate. That sheet searches two
 * libraries because Forge ships 81 day sessions and "where's my push day" is genuinely answered by
 * either. There is no Forge week catalogue — a week template is a thing an athlete builds — so a second
 * labelled section would be a permanently empty heading.
 *
 * ⚠ AND NO SEARCH FIELD, for the same reason inverted: the day sheet searches because it lists eighty-odd
 * rows. Weeks are counted in single figures. A search box over four rows is furniture.
 *
 * Loaded on OPEN rather than on mount: most builds never ask for this, and the builder must not spend a
 * round-trip on a sheet that may never open. Same rule the day sheet follows.
 */
function WeekTemplateSheet({
  open,
  weekNumber,
  daysPerWeek,
  onClose,
  onChoose,
}: {
  open: boolean;
  weekNumber: number;
  daysPerWeek: number;
  onClose: () => void;
  onChoose: (name: string, days: ProgramDay[]) => void;
}) {
  const { data, loading, error } = useQuery(() => (open ? fetchWeekTemplates() : Promise.resolve([])), [open]);
  const rows = data ?? [];

  return (
    <BottomSheet open={open} onClose={onClose} title={`Use a saved week for week ${weekNumber}`} scroll>
      <View style={styles.tplCol}>
        <Text style={styles.tplIntro}>
          Its days become this week. You can change anything afterwards — nothing is linked, so editing the program
          never touches the saved week.
        </Text>

        {loading ? <Text style={styles.tplEmpty}>Loading your weeks…</Text> : null}
        {error ? <Text style={styles.tplEmpty}>{error}</Text> : null}

        {!loading && !error && rows.length === 0 ? (
          /* The honest empty state names the OTHER door rather than apologising: a week template is built
             on the Templates tab, and an athlete who has none has not been anywhere near it. */
          <Text style={styles.tplEmpty}>
            You haven’t saved any weeks yet. Build one from Workouts → Your Templates → Build a Week, and it will
            show up here.
          </Text>
        ) : null}

        {rows.map((w) => {
          const days = w.structure.days ?? [];
          /* The cost is stated on the ROW, not only in the confirmation — an athlete choosing between
             three saved weeks should be able to see which one fits before they tap one of them. */
          const over = days.length - daysPerWeek;
          const note = over > 0 ? `${over} day${over === 1 ? '' : 's'} won’t fit` : over < 0 ? `leaves ${-over} day${over === -1 ? '' : 's'} empty` : 'fits exactly';
          return (
            <Pressable
              key={w.id}
              onPress={() => onChoose(w.name, days)}
              accessibilityRole="button"
              accessibilityLabel={`Use ${w.name} for week ${weekNumber} — ${weekSummary(w)}, ${note}`}
              style={({ pressed }) => [styles.tplRow, pressed ? styles.pressed : null]}
            >
              <View style={styles.tplRowText}>
                <Text style={styles.tplRowName} numberOfLines={1}>
                  {w.name}
                </Text>
                <Text style={styles.tplRowSub} numberOfLines={1}>
                  {weekSummary(w)} · {note}
                </Text>
              </View>
              <Glyph d="M9 6l6 6-6 6" size={15} color={flColor.gray600} width={2} />
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

function ImpStep({ glyph, label, onPress }: { glyph: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.impStep, pressed ? styles.impPressed : null]}
    >
      <Text style={styles.impStepGlyph}>{glyph}</Text>
    </Pressable>
  );
}

function SetupView({
  draft,
  days,
  isWeek,
  saving,
  error,
  onCancel,
  onName,
  onWeeks,
  onDays,
  onOpenDay,
  onOpenDayMenu,
  onOpenWeek,
  onOpenWeekMenu,
  onOpenJump,
  onOpenImport,
  onRepeat,
  onVary,
  onSave,
}: {
  draft: ProgramDraft;
  days: ProgramDay[];
  /** Authoring a week template rather than a program — hides length, structure and import (0157). */
  isWeek: boolean;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onName: (v: string) => void;
  onWeeks: (n: number) => void;
  onDays: (n: number) => void;
  onOpenDay: (i: number) => void;
  onOpenDayMenu: (i: number) => void;
  onOpenWeek: (i: number) => void;
  onOpenWeekMenu: (i: number) => void;
  onOpenJump: () => void;
  onOpenImport: () => void;
  onRepeat: () => void;
  onVary: () => void;
  onSave: () => void;
}) {
  // In Customize mode the list is weeks, so the summary counts every week's exercises — counting only
  // the (now unused) repeat template would under-report the program by a factor of its length.
  const totalEx = draft.vary
    ? (draft.weekPlans ?? []).reduce((a, w) => a + w.days.reduce((b, d) => b + dayTotal(d), 0), 0)
    : days.reduce((a, day) => a + dayTotal(day), 0);
  const summary = draft.vary
    ? `${plural(draft.weeks, 'week')} · ${plural(totalEx, 'exercise')}`
    : `${plural(draft.daysPerWeek, 'day')} · ${plural(totalEx, 'exercise')}`;
  const nameOk = hasName(draft);
  const mainOk = hasMainExercise(draft);
  const valid = nameOk && mainOk;

  const dayChips = Array.from({ length: DAYS_MAX - DAYS_MIN + 1 }, (_, i) => DAYS_MIN + i);
  const rise = useEntryRise(400);
  const builtWeeks = completedWeeks(draft);
  // Walkthrough anchors + the scroller, so the spotlight can reach the list and the save bar below the fold.
  const importRef = useTourAnchor('builder-import');
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();

  const noun = isWeek ? 'Week' : 'Program';
  const title = draft.mode === 'edit' ? `Edit ${noun}` : draft.mode === 'dup' ? `Duplicate ${noun}` : `New ${noun}`;
  const saveLabel = draft.mode === 'edit' ? 'Save Changes' : draft.mode === 'dup' ? 'Create Copy' : `Save ${noun}`;
  const context =
    draft.mode === 'edit'
      ? `Editing your ${noun.toLowerCase()}`
      : draft.mode === 'dup'
        ? 'New copy — the original stays unchanged'
        : isWeek
          // Says what this object IS, because it is the app's newest noun and nothing else on the screen
          // explains why there is no length control.
          ? 'One week you can run again whenever you want'
          : null;

  return (
    <>
      <AppBar title={title} serif onClose={onCancel} />

      <Animated.ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        style={rise}
        contentContainerStyle={styles.setupScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {context ? (
          <View style={styles.contextBanner}>
            <Glyph d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" size={16} color={flColor.bronze300} width={1.8} />
            <Text style={styles.contextText}>{context}</Text>
          </View>
        ) : null}

        <TourAnchor id="builder-details" style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <SectionHeader label={isWeek ? 'Week details' : 'Program details'} />
          </View>

          <InputField
            label={isWeek ? 'Week name' : 'Program name'}
            placeholder={isWeek ? 'e.g. Deload Week' : 'e.g. Winter Powerbuilding'}
            value={draft.name}
            onChange={onName}
            maxLength={40}
            showCount
          />

          {/* ⚠ NO LENGTH CONTROL IN WEEK MODE. A week is one week — the stepper would offer to make it
              something the database refuses, and the rank-credit line beneath it would be a permanent
              scold on an object whose whole purpose is to be short. The Repeat/Customize block goes for
              the same reason: there are no other weeks to vary from. */}
          {isWeek ? null : (
          <View style={styles.field}>
            <Text style={styles.microLabel}>Length</Text>
            <View style={styles.stepperRow}>
              <Stepper label="Fewer weeks" sign="−" onPress={() => onWeeks(draft.weeks - 1)} />
              <Text style={styles.stepperText}>
                <Text style={styles.stepperValue}>{draft.weeks}</Text> weeks
              </Text>
              <Stepper label="More weeks" sign="+" onPress={() => onWeeks(draft.weeks + 1)} />
            </View>
            <Text style={styles.hint}>1–52 weeks — a single week, or a multi-month block</Text>
            {/* W4-A1-D4 — the one consequence of going short that the athlete cannot otherwise know.
                A quiet line, not a warning and not a confirmation: a one-week block is a legitimate
                thing to build (a deload, a travel week, a test week) and the screen must not lecture
                anyone for building one. It states the fact and passes no judgement, the same register
                the Ended Early record uses. It NEVER blocks saving. */}
            {draft.weeks < STRUCTURED_DEVELOPMENT_MIN_WEEKS ? (
              <Text style={styles.hintQuiet}>
                Under {STRUCTURED_DEVELOPMENT_MIN_WEEKS} weeks this won’t count toward your rank or the
                Programs honors. Everything you log still counts.
              </Text>
            ) : null}
          </View>
          )}

          <View style={styles.field}>
            <Text style={styles.microLabel}>{isWeek ? 'Training days' : 'Training days / week'}</Text>
            <View style={styles.segmented}>
              {dayChips.map((n, i) => {
                const on = draft.daysPerWeek === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => onDays(n)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${n} training days per week`}
                    style={[styles.seg, on && styles.segOn, i > 0 && styles.segDivider]}
                  >
                    <Text style={[styles.segText, on && styles.segTextOn]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </TourAnchor>

        {/* "Import from a spreadsheet" — the design places it here, between the length controls and the
            structure choice, because importing decides both for you.

            Hidden in week mode: an import decides length and per-week structure, which is precisely what
            a week template does not have. A paste of an 8-week block would be clamped to its first week
            with no honest way to say so. */}
        {isWeek ? null : (
        <Pressable
          ref={importRef}
          onPress={onOpenImport}
          accessibilityRole="button"
          accessibilityLabel="Import from a spreadsheet"
          style={({ pressed }) => [styles.importLink, pressed ? styles.pressed : null]}
        >
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 3v12M8 11l4 4 4-4M4 19h16" />
          </Svg>
          <Text style={styles.importLinkText}>Import from a spreadsheet</Text>
        </Pressable>
        )}

        {isWeek ? null : (
        <TourAnchor id="builder-structure" style={styles.structure}>
          <SectionHeader label="Program structure" />
          <StructureOption
            selected={!draft.vary}
            title="Repeat the same week"
            body="Build one week and repeat it for the whole program."
            onPress={onRepeat}
          />
          <StructureOption
            selected={draft.vary}
            title="Customize each week"
            body="Build every week individually — copy a week forward and tweak."
            onPress={onVary}
          />
        </TourAnchor>
        )}

        {draft.vary ? (
          <Pressable onPress={onOpenJump} accessibilityRole="button" accessibilityLabel="Jump to week" style={styles.progressBlock}>
            <View style={styles.progressHead}>
              <Text style={styles.progressLabel}>Program progress</Text>
              <Text style={styles.progressLink}>
                {builtWeeks} of {draft.weeks} weeks built ›
              </Text>
            </View>
            <ProgressBar value={builtWeeks} max={draft.weeks} />
          </Pressable>
        ) : null}

        <View style={styles.listHeader}>
          <SectionHeader label={draft.vary ? 'Weeks' : 'Workouts'} />
          <Text style={styles.listSummary}>{summary}</Text>
        </View>

        {draft.vary ? (
          <TourAnchor id="builder-list" style={styles.dayRows}>
            {(draft.weekPlans ?? []).map((w, i) => {
              const total = w.days.reduce((a, d) => a + dayTotal(d), 0);
              const built = weekComplete(w);
              return (
                <View key={i} style={[styles.dayRow, styles.rowSplit, built && styles.dayRowBuilt]}>
                  <Pressable
                    onPress={() => onOpenWeek(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open week ${i + 1}`}
                    style={styles.rowMain}
                  >
                    <View style={[styles.dayLetter, styles.weekNum]}>
                      <Text style={styles.dayLetterText}>{i + 1}</Text>
                    </View>
                    <View style={styles.dayText}>
                      <Text style={styles.dayNameText} numberOfLines={1}>Week {i + 1}</Text>
                      <Text style={[styles.daySub, total > 0 && styles.daySubBuilt]} numberOfLines={1}>
                        {total === 0 ? 'Empty' : plural(total, 'exercise')}
                      </Text>
                    </View>
                    {built ? (
                      <View style={styles.doneMark}>
                        <Glyph d={CHECK} size={12} color={flColor.bronze300} width={2.6} />
                      </View>
                    ) : (
                      <View style={styles.todoMark} />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => onOpenWeekMenu(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`Week ${i + 1} options`}
                    style={styles.rowMenu}
                  >
                    <Glyph d={DOTS} size={18} color={flColor.gray600} width={2.6} />
                  </Pressable>
                </View>
              );
            })}
          </TourAnchor>
        ) : (
        <TourAnchor id="builder-list" style={styles.dayRows}>
          {days.map((day, i) => {
            const total = dayTotal(day);
            const built = day.main.length > 0;
            const label = inferLabel(day.main);
            return (
              <View key={`${day.letter}-${i}`} style={[styles.dayRow, styles.rowSplit, built && styles.dayRowBuilt]}>
                <Pressable
                  onPress={() => onOpenDay(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Build ${dayName(day)}`}
                  style={styles.rowMain}
                >
                  <View style={styles.dayLetter}>
                    <Text style={styles.dayLetterText}>{day.letter || i + 1}</Text>
                  </View>
                  <View style={styles.dayText}>
                    <Text style={styles.dayNameText} numberOfLines={1}>
                      {dayName(day)}
                    </Text>
                    <Text style={[styles.daySub, total > 0 && styles.daySubBuilt]} numberOfLines={1}>
                      {total === 0 ? 'No exercises yet · Tap to build' : `${label ? `${label} · ` : ''}${plural(total, 'exercise')}`}
                    </Text>
                  </View>
                  {built ? (
                    <View style={styles.doneMark}>
                      <Glyph d={CHECK} size={12} color={flColor.bronze300} width={2.6} />
                    </View>
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => onOpenDayMenu(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayName(day)} options`}
                  style={styles.rowMenu}
                >
                  <Glyph d={DOTS} size={18} color={flColor.gray600} width={2.6} />
                </Pressable>
              </View>
            );
          })}
        </TourAnchor>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Animated.ScrollView>

      <LinearGradient colors={['rgba(6,7,8,0.35)', 'rgba(6,7,8,0.82)']} style={styles.footer}>
        <TourAnchor id="builder-save">
          {!valid ? (
            <View style={styles.checks}>
              <CheckRow ok={nameOk} label="Program name" />
              <CheckRow ok={mainOk} label="At least one main exercise" />
            </View>
          ) : null}
          <Button variant="primary" fullWidth disabled={!valid || saving} onPress={onSave} accessibilityLabel={saveLabel}>
            {saving ? 'Saving…' : saveLabel}
          </Button>
        </TourAnchor>
      </LinearGradient>
    </>
  );
}

/** One of the two Program-structure radios. */
function StructureOption({
  selected,
  title,
  body,
  onPress,
}: {
  selected: boolean;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      style={[styles.structOption, selected && styles.structOptionOn]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.structText}>
        <Text style={styles.structTitle}>{title}</Text>
        <Text style={styles.structBody}>{body}</Text>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEK DAY-LIST — one week's workouts, in Customize mode
// ─────────────────────────────────────────────────────────────────────────────

function WeekDaysView({
  draft,
  days,
  onBack,
  onOpenDay,
  onOpenDayMenu,
  onOpenJump,
  onOpenWeekSheet,
  onAdvance,
}: {
  draft: ProgramDraft;
  days: ProgramDay[];
  onBack: () => void;
  onOpenDay: (i: number) => void;
  onOpenDayMenu: (i: number) => void;
  onOpenJump: () => void;
  onOpenWeekSheet: () => void;
  onAdvance: () => void;
}) {
  const rise = useEntryRise(360);
  const week = draft.openWeek ?? 0;
  const built = completedWeeks(draft);
  const totalEx = days.reduce((a, d) => a + dayTotal(d), 0);

  return (
    <>
      <AppBar
        title={`Week ${week + 1}`}
        serif
        onBack={onBack}
        actions={
          <Pressable onPress={onOpenWeekSheet} accessibilityRole="button" accessibilityLabel="Week options" hitSlop={6} style={styles.barBtn}>
            <Glyph d={DOTS} size={18} color={flColor.gray400} width={2.6} />
          </Pressable>
        }
      />

      <Pressable onPress={onOpenJump} accessibilityRole="button" accessibilityLabel="Jump to week" style={styles.weekProgress}>
        <View style={styles.progressHead}>
          <Text style={styles.progressLabel}>Program progress</Text>
          <Text style={styles.progressLink}>
            {built} of {draft.weeks} weeks built ›
          </Text>
        </View>
        <ProgressBar value={built} max={draft.weeks} />
      </Pressable>

      <Animated.ScrollView style={rise} contentContainerStyle={styles.setupScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.listHeader}>
          <SectionHeader label="Workouts" />
          <Text style={styles.listSummary}>{plural(totalEx, 'exercise')}</Text>
        </View>

        <View style={styles.dayRows}>
          {days.map((day, i) => {
            const total = dayTotal(day);
            const done = day.main.length > 0;
            const label = inferLabel(day.main);
            return (
              <View key={`${day.letter}-${i}`} style={[styles.dayRow, styles.rowSplit, done && styles.dayRowBuilt]}>
                <Pressable onPress={() => onOpenDay(i)} accessibilityRole="button" accessibilityLabel={`Build ${dayName(day)}`} style={styles.rowMain}>
                  <View style={styles.dayLetter}>
                    <Text style={styles.dayLetterText}>{day.letter || i + 1}</Text>
                  </View>
                  <View style={styles.dayText}>
                    <Text style={styles.dayNameText} numberOfLines={1}>{dayName(day)}</Text>
                    <Text style={[styles.daySub, total > 0 && styles.daySubBuilt]} numberOfLines={1}>
                      {total === 0 ? 'No exercises yet · Tap to build' : `${label ? `${label} · ` : ''}${plural(total, 'exercise')}`}
                    </Text>
                  </View>
                  {done ? (
                    <View style={styles.doneMark}>
                      <Glyph d={CHECK} size={12} color={flColor.bronze300} width={2.6} />
                    </View>
                  ) : null}
                </Pressable>
                <Pressable onPress={() => onOpenDayMenu(i)} accessibilityRole="button" accessibilityLabel={`${dayName(day)} options`} style={styles.rowMenu}>
                  <Glyph d={DOTS} size={18} color={flColor.gray600} width={2.6} />
                </Pressable>
              </View>
            );
          })}
        </View>
      </Animated.ScrollView>

      <LinearGradient colors={['rgba(6,7,8,0.35)', 'rgba(6,7,8,0.82)']} style={styles.footer}>
        <Button variant="primary" fullWidth onPress={onAdvance} accessibilityLabel="Save and continue">
          Save &amp; continue
        </Button>
      </LinearGradient>
    </>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.checkRow}>
      <Glyph d={ok ? CHECK : CROSS} size={15} color={ok ? flColor.bronze300 : flColor.gray600} width={2.4} />
      <Text style={[styles.checkLabel, ok && styles.checkLabelOk]}>{label}</Text>
    </View>
  );
}

function Stepper({ label, sign, onPress }: { label: string; sign: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.stepperBtn} hitSlop={6}>
      <Text style={styles.stepperSign}>{sign}</Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DAY BUILDER — one day's Warm-up / Main / Cool-down
// ─────────────────────────────────────────────────────────────────────────────

function DayBuilder({
  day,
  nextLabel,
  nextLabelFull,
  onBack,
  onNext,
  onName,
  onAdd,
  onAddCardio,
  onUseTemplate,
  onRemove,
  onMove,
  onModality,
  onSlotA,
  onSlotB,
  onSlotTime,
  onTypeTime,
  onTypeDistance,
  onEditNote,
  metric,
  onPair,
  onUnpair,
}: {
  day: ProgramDay;
  /** Where "save and keep going" leads — the next day, or `Week 2 · Day A`. Null on the very last day. */
  nextLabel: string | null;
  /** The same destination with the day name intact, for the accessibility label. */
  nextLabelFull: string | null;
  onBack: () => void;
  onNext: () => void;
  onName: (v: string) => void;
  onAdd: (section: BuilderSection) => void;
  onAddCardio: (section: BuilderSection) => void;
  /** Fill (or extend) the whole day from a saved template or a Forge session. */
  onUseTemplate: () => void;
  onRemove: (section: BuilderSection, i: number) => void;
  onMove: (section: BuilderSection, i: number, dir: -1 | 1) => void;
  onModality: (section: BuilderSection, i: number, m: Modality) => void;
  /** Sets for a lift, distance for a block. */
  onSlotA: (section: BuilderSection, i: number, dir: 1 | -1) => void;
  /** Reps for a lift, pace or speed for a block. */
  onSlotB: (section: BuilderSection, i: number, dir: 1 | -1) => void;
  /** Minutes on the clock — cardio only. */
  onSlotTime: (section: BuilderSection, i: number, dir: 1 | -1) => void;
  /** Type a target instead of stepping to it — cardio only. */
  onTypeTime: (section: BuilderSection, i: number) => void;
  onTypeDistance: (section: BuilderSection, i: number) => void;
  /** Write the author's coaching cue for this row. */
  onEditNote: (section: BuilderSection, i: number) => void;
  /** Chooses the distance scale: yards/metres for a swim, miles/kilometres for everything else. */
  metric: boolean;
  /** Pair a row with the one below it — a superset, authored (see `pairWithNext`). */
  onPair: (section: BuilderSection, i: number) => void;
  onUnpair: (section: BuilderSection, i: number) => void;
}) {
  const total = dayTotal(day);
  const est = Math.round((day.main.length * 9 + day.warmup.length * 4 + day.cooldown.length * 4) / 5) * 5;
  const rise = useEntryRise(360);
  // This view replaces Setup's scroller while it's open; the registry releases by identity, so the swap
  // in either direction is safe regardless of which unmounts first.
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();

  return (
    <>
      <AppBar title={dayName(day)} serif onBack={onBack} />

      <Animated.ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        style={rise}
        contentContainerStyle={styles.dayScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dayHead}>
          <InputField label="Workout name" placeholder="Workout name" value={day.name} onChange={onName} maxLength={30} />
          {total > 0 ? (
            <Text style={styles.daySummary}>
              {plural(total, 'exercise')}
              {est > 0 ? ` • ~${est} min` : ''}
            </Text>
          ) : null}
        </View>

        {SECTION_META.map((sec, si) => {
          const items = day[sec.key];
          const isMain = sec.key === 'main';
          return (
            <TourAnchor
              key={sec.key}
              id={isMain ? 'day-sections' : undefined}
              style={[styles.section, si > 0 && styles.sectionRuled, si === SECTION_META.length - 1 && styles.sectionLast]}
            >
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionLabel, isMain && styles.sectionLabelMain]}>{sec.label}</Text>
                <Text style={styles.sectionReq}>{sec.req}</Text>
                <View style={styles.spacer} />
                {items.length ? <Text style={styles.sectionCount}>{items.length}</Text> : null}
              </View>

              <View style={styles.sectionBody}>
                {items.length === 0 ? <Text style={styles.sectionEmpty}>{sec.empty}</Text> : null}

                {items.map((it, i) => (
                  <ExerciseCard
                    key={it.id ?? `${sec.key}-${i}`}
                    item={it}
                    first={i === 0}
                    last={i === items.length - 1}
                    anchor={isMain && i === 0 ? 'day-reps' : undefined}
                    pairing={pairingAt(items, i)}
                    onUp={() => onMove(sec.key, i, -1)}
                    onDown={() => onMove(sec.key, i, 1)}
                    onRemove={() => onRemove(sec.key, i)}
                    onModality={(m) => onModality(sec.key, i, m)}
                    onSlotA={(dir) => onSlotA(sec.key, i, dir)}
                    onSlotB={(dir) => onSlotB(sec.key, i, dir)}
                    onSlotTime={(dir) => onSlotTime(sec.key, i, dir)}
                    onTypeTime={() => onTypeTime(sec.key, i)}
                    onTypeDistance={() => onTypeDistance(sec.key, i)}
                    onEditNote={() => onEditNote(sec.key, i)}
                    metric={metric}
                    onPair={() => onPair(sec.key, i)}
                    onUnpair={() => onUnpair(sec.key, i)}
                  />
                ))}

                {/* Adding an exercise is the common path and stays bronze; adding cardio is available
                    but recessive. The hierarchy is the point. */}
                <View style={styles.addRow}>
                  <TourAnchor id={isMain ? 'day-add' : undefined} style={styles.addBtnGrow}>
                    <Pressable
                      onPress={() => onAdd(sec.key)}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${sec.addLabel}`}
                      style={styles.addBtn}
                    >
                      <Glyph d={PLUS} size={15} color={flColor.bronze300} width={2} />
                      <Text style={styles.addText}>Add {sec.addLabel}</Text>
                    </Pressable>
                  </TourAnchor>
                  <TourAnchor id={isMain ? 'day-cardio' : undefined}>
                    <Pressable
                      onPress={() => onAddCardio(sec.key)}
                      accessibilityRole="button"
                      accessibilityLabel="Add a cardio block"
                      style={styles.addCardioBtn}
                    >
                      <ActivityGlyph activity="run" size={17} color={flColor.gray400} />
                      <Text style={styles.addCardioText}>Cardio</Text>
                    </Pressable>
                  </TourAnchor>
                </View>
              </View>
            </TourAnchor>
          );
        })}

        {/*
          ── THE WHOLE DAY AT ONCE ──────────────────────────────────────────────────────────────────
          Below the three sections rather than inside one, because a template is not a warm-up or a main
          — it fills all three. Placed after them so the exercise-by-exercise path stays the default
          reading of the screen and this reads as the shortcut it is.
        */}
        <Pressable
          onPress={onUseTemplate}
          accessibilityRole="button"
          accessibilityLabel="Fill this day from a template"
          style={({ pressed }) => [styles.templateLink, pressed ? styles.pressed : null]}
        >
          <Glyph d={LINES} size={16} color={flColor.bronze300} width={1.8} />
          <View style={styles.templateLinkText}>
            <Text style={styles.templateLinkTitle}>Use a template</Text>
            <Text style={styles.templateLinkSub}>
              {total > 0 ? 'Add one of your saved workouts, or a Forge session, to this day' : 'Start this day from one of your saved workouts, or a Forge session'}
            </Text>
          </View>
          <Glyph d="M9 6l6 6-6 6" size={15} color={flColor.gray600} width={2} />
        </Pressable>
      </Animated.ScrollView>

      {/*
        ══ THE FORWARD MOVE LEADS ══

        PO: *"It needs to be more obvious that I can save that day and move on to the next. Right now it
        has 'save workout' as the more obvious button, and then 'save and move on to day B' underneath,
        and that should be reversed."*

        It was backwards against what building actually is. Nobody opens a four-day program to author ONE
        day: the sequence is the task, and the button that continues it was a grey line of text under a
        bronze button that ends the session. So the hierarchy now matches the work — **forward is the
        primary, and leaving is the quiet one** — right up until there is nowhere forward to go, where the
        two swap back and Save is the only thing on offer.

        BOTH BUTTONS SAVE, WHICH IS WHY NEITHER SAYS "DISCARD". The draft autosaves on every mutation, so
        the difference is only where you land: still building, or back at the overview. `Save workout` keeps
        its name because it is the athlete's own word for it.
      */}
      <LinearGradient colors={['rgba(6,7,8,0.35)', 'rgba(6,7,8,0.82)']} style={styles.footer}>
        {nextLabel ? (
          <>
            <Button
              variant="primary"
              fullWidth
              onPress={onNext}
              accessibilityLabel={`Save and go to ${nextLabelFull ?? nextLabel}`}
              trailingIcon={<Glyph d="M9 6l6 6-6 6" size={15} color="#F7F5F1" width={2.2} />}
            >
              Save &amp; go to {nextLabel}
            </Button>
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Save workout and go back" style={styles.nextDay}>
              <Text style={styles.nextDayText}>Save workout</Text>
            </Pressable>
          </>
        ) : (
          <Button variant="primary" fullWidth onPress={onBack} accessibilityLabel="Save workout">
            Save Workout
          </Button>
        )}
      </LinearGradient>
    </>
  );
}

function ExerciseCard({
  item,
  first,
  last,
  anchor,
  pairing,
  onUp,
  onDown,
  onRemove,
  onModality,
  onSlotA,
  onSlotB,
  onSlotTime,
  onTypeTime,
  onTypeDistance,
  onEditNote,
  metric,
  onPair,
  onUnpair,
}: {
  item: ProgramExercise;
  first: boolean;
  last: boolean;
  /** Walkthrough target — set on the first main-section card so the sets/reps step has something to ring. */
  anchor?: TourAnchorId;
  /** Which superset this row is in, if any — its letter position and the block's size. */
  /** Position in the block, its size, and what this row is CALLED — "A1", "A2" (see `pairingAt`). */
  pairing: { pos: number; count: number; label: string; letter: string } | null;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  onModality: (m: Modality) => void;
  onSlotA: (dir: 1 | -1) => void;
  onSlotB: (dir: 1 | -1) => void;
  /** The clock — a cardio bout prescribed in minutes. Never shown for a lift. */
  onSlotTime: (dir: 1 | -1) => void;
  /** Type the target rather than step to it. Cardio only. */
  onTypeTime: () => void;
  onTypeDistance: () => void;
  /** Open the sheet for this row's coaching cue. */
  onEditNote: () => void;
  metric: boolean;
  onPair: () => void;
  onUnpair: () => void;
}) {
  /**
   * The SAME card for a lift and a run — same shell, header and reorder cluster. What differs is the
   * modality row and WHICH TARGETS the footer offers. The visual continuity between a lift and a run in
   * one list is the point; a bespoke cardio card would break the day apart.
   *
   * ══ A LIFT HAS TWO NUMBERS; A BOUT HAS UP TO THREE ══
   *
   * Sets × reps fits one row of two meters. A cardio bout is distance, time AND a rate, which does not —
   * three meters on one row leaves each about 110 px, and the value between its two steppers is already
   * 58 px of that. So cardio stacks: distance and time on the first row, the rate on the second.
   *
   * Which meters appear is a property of the ACTIVITY, and the model already states it. A stair climber
   * counts floors, so it has no distance (`TRACKS_DISTANCE`). A swim, a row and an elliptical hold no
   * pace (`RATE_KIND`) — ⚠ this card used to show a pace stepper for all three anyway, contradicting the
   * rulebook's own EPS-D12, and a swimmer could author a per-MILE pace for a set measured in yards.
   */
  const cardio = item.kind === 'cardio';
  const activity = (item.activity ?? 'run') as CardioActivity;
  const speed = cardio && usesSpeed(activity);
  const indoor = item.modality === 'indoor';
  const id = (n: number) => n;

  /** Yards (or metres) for a swim, miles (or kilometres) for everything else. Storage is miles regardless. */
  const distUnit = distanceUnitFor(activity, metric);
  const showDistance = !cardio || TRACKS_DISTANCE[activity];
  const showRate = cardio && hasRateTarget(activity);

  // Slot A: sets for a lift, distance for a block. Slot B: reps, or pace/speed. Time is cardio-only.
  const aVal = cardio ? (item.targetMi == null ? 'Open' : fmtDistanceIn(item.targetMi, distUnit)) : String(item.sets ?? 1);
  const aUnit = cardio ? (item.targetMi == null ? '' : distUnit) : 'sets';
  const bVal = cardio ? effortLabel({ ...item, activity, name: item.name, equip: item.equip ?? '', modality: item.modality ?? 'outdoor', targetMi: item.targetMi ?? null }, id, id) : String(item.reps ?? 1);
  const bUnit = cardio ? (speed ? (item.targetSpdMph == null ? 'speed' : 'mph') : item.targetPaceSec == null ? 'pace' : '/mi') : 'reps';
  const tVal = item.targetSec == null ? 'Open' : fmtDuration(item.targetSec);
  const tOpen = item.targetSec == null;
  // Bronze on an open target is what makes "no target" read as a deliberate authored state rather than
  // a value someone forgot to fill in.
  const aOpen = cardio && item.targetMi == null;
  const bOpen = cardio && (speed ? item.targetSpdMph == null : item.targetPaceSec == null);

  return (
    <TourAnchor id={anchor} style={[styles.exCard, pairing ? styles.exCardPaired : null]}>
      {/* A superset, said once at the top of the block rather than repeated on every member. The A/B
          letter is what the logger will show, so the athoring surface and the doing surface agree. */}
      {pairing && pairing.pos === 1 ? (
        <View style={styles.pairHead}>
          <Text style={styles.pairHeadText}>Superset {pairing.letter} · {pairing.count} exercises, alternated</Text>
          <Pressable onPress={onUnpair} accessibilityRole="button" accessibilityLabel="Break this superset" hitSlop={8}>
            <Text style={styles.pairBreak}>Break</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.exTop}>
        <View style={styles.exIcon}>
          {cardio ? <ActivityGlyph activity={activity} size={19} color={flColor.bronze400} /> : <EquipIcon equip={item.equip} size={19} />}
        </View>
        <View style={styles.exText}>
          <Text style={styles.exName} numberOfLines={1}>
            {pairing ? `${pairing.label}  ` : ''}{item.name}
          </Text>
          {item.equip ? (
            <Text style={styles.exEquip} numberOfLines={1}>
              {equipmentLabel(item.equip)}
            </Text>
          ) : null}
        </View>
        <View style={styles.exControls}>
          <Pressable
            onPress={first ? undefined : onUp}
            disabled={first}
            accessibilityRole="button"
            accessibilityLabel={`Move ${item.name} up`}
            style={styles.exCtrl}
          >
            <Glyph d="M18 15l-6-6-6 6" color={first ? flColor.charcoal500 : flColor.gray400} />
          </Pressable>
          <Pressable
            onPress={last ? undefined : onDown}
            disabled={last}
            accessibilityRole="button"
            accessibilityLabel={`Move ${item.name} down`}
            style={styles.exCtrl}
          >
            <Glyph d="M6 9l6 6 6-6" color={last ? flColor.charcoal500 : flColor.gray400} />
          </Pressable>
          <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} style={styles.exCtrl}>
            <Glyph d="M5 7h14M9 7V5h6v2M8 7l1 13h6l1-13" color={flColor.redMuted} />
          </Pressable>
        </View>
      </View>

      {/* The link lives BETWEEN two rows because that is what it joins. Offered only where there is
          something below to join to — the last row in a section has nothing to pair with. */}
      {!last ? (
        <Pressable onPress={onPair} accessibilityRole="button" accessibilityLabel={`Superset ${item.name} with the exercise below`} style={styles.pairLink}>
          <Glyph d="M9 7H6a5 5 0 0 0 0 10h3M15 7h3a5 5 0 0 1 0 10h-3M8 12h8" size={14} color={flColor.bronze400} />
          <Text style={styles.pairLinkText}>{pairing ? 'Add the next one to this superset' : 'Superset with the next exercise'}</Text>
        </Pressable>
      ) : null}

      {cardio ? (
        <View style={styles.modRow}>
          <Pressable
            onPress={() => onModality('outdoor')}
            accessibilityRole="button"
            accessibilityState={{ selected: !indoor }}
            accessibilityLabel="Outdoor"
            style={[styles.modBtn, !indoor ? styles.modBtnOn : null]}
          >
            <Text style={[styles.modText, !indoor ? styles.modTextOn : null]}>Outdoor</Text>
          </Pressable>
          <Pressable
            onPress={() => onModality('indoor')}
            accessibilityRole="button"
            accessibilityState={{ selected: indoor }}
            accessibilityLabel={activity === 'bike' ? 'Indoor' : 'Treadmill'}
            style={[styles.modBtn, styles.modBtnDiv, indoor ? styles.modBtnOn : null]}
          >
            <Text style={[styles.modText, indoor ? styles.modTextOn : null]}>{activity === 'bike' ? 'Indoor' : 'Treadmill'}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.exBottom}>
        {showDistance ? (
          <View style={[styles.exMeter, styles.exMeterDivider]}>
            <RoundStep label={cardio ? `Shorter distance for ${item.name}` : `Fewer sets for ${item.name}`} sign="−" onPress={() => onSlotA(-1)} />
            {/*
              ══ THE VALUE IS A BUTTON, AND TYPING IS THE POINT ══

              Stepping is fine for a nudge and miserable as the only way in: a 1200 yd swim is twelve taps
              from the seed and a 3200 yd one is twenty-two, and the clock steps in five-minute jumps that
              cannot state a 12-minute brick at all. Tapping the number types it.

              The steppers stay for the nudge, which is what they are good at.
            */}
            <Pressable
              onPress={cardio ? onTypeDistance : undefined}
              disabled={!cardio}
              accessibilityRole={cardio ? 'button' : undefined}
              accessibilityLabel={cardio ? `Type a distance for ${item.name}` : undefined}
              hitSlop={6}
            >
              <Text style={styles.exMeterText}>
                <Text style={[styles.exMeterValue, aOpen ? styles.exMeterOpen : null, cardio ? styles.exMeterTypeable : null]}>{aVal}</Text>
                {aUnit ? ` ${aUnit}` : ''}
              </Text>
            </Pressable>
            <RoundStep label={cardio ? `Longer distance for ${item.name}` : `More sets for ${item.name}`} sign="+" onPress={() => onSlotA(1)} />
          </View>
        ) : null}
        {/* THE CLOCK, for a bout — and reps, for a lift. Same slot, and they never both appear. */}
        {cardio ? (
          <View style={styles.exMeter}>
            <RoundStep label={`Shorter time for ${item.name}`} sign="−" onPress={() => onSlotTime(-1)} />
            <Pressable
              onPress={onTypeTime}
              accessibilityRole="button"
              accessibilityLabel={`Type a time for ${item.name}`}
              hitSlop={6}
            >
              <Text style={styles.exMeterText}>
                <Text style={[styles.exMeterValue, tOpen ? styles.exMeterOpen : null, styles.exMeterTypeable]}>{tVal}</Text>
              </Text>
            </Pressable>
            <RoundStep label={`Longer time for ${item.name}`} sign="+" onPress={() => onSlotTime(1)} />
          </View>
        ) : (
          <View style={styles.exMeter}>
            <RoundStep label={`Fewer reps for ${item.name}`} sign="−" onPress={() => onSlotB(-1)} />
            <Text style={styles.exMeterText}>
              <Text style={[styles.exMeterValue, bOpen ? styles.exMeterOpen : null]}>{bVal}</Text> {bUnit}
            </Text>
            <RoundStep label={`More reps for ${item.name}`} sign="+" onPress={() => onSlotB(1)} />
          </View>
        )}
      </View>

      {/* The rate gets its own row rather than a third of the one above — see the layout note up top.
          Absent entirely for the machines, which hold no pace (`RATE_KIND`). */}
      {showRate ? (
        <View style={styles.exBottom}>
          <View style={styles.exMeter}>
            <RoundStep
              label={speed ? `Lower target speed for ${item.name}` : `Faster target pace for ${item.name}`}
              sign="−"
              onPress={() => onSlotB(-1)}
            />
            <Text style={styles.exMeterText}>
              <Text style={[styles.exMeterValue, bOpen ? styles.exMeterOpen : null]}>{bVal}</Text> {bUnit}
            </Text>
            <RoundStep
              label={speed ? `Higher target speed for ${item.name}` : `Slower target pace for ${item.name}`}
              sign="+"
              onPress={() => onSlotB(1)}
            />
          </View>
        </View>
      ) : null}

      {/*
        ══ THE AUTHOR'S CUE ══

        "4 seconds down, then push up." Written here and shown to whoever trains the day — on the
        exercise card in the active workout and in its ⋯ menu. It is NOT the athlete's log note; that one
        is written during the session and says how the lift felt.

        A row with a cue shows it, so the day reads as authored rather than hiding its own instructions
        behind a tap.
      */}
      <Pressable
        onPress={onEditNote}
        accessibilityRole="button"
        accessibilityLabel={item.coachNote ? `Edit the coaching note on ${item.name}` : `Add a coaching note to ${item.name}`}
        style={({ pressed }) => [styles.exNoteRow, pressed ? styles.exNotePressed : null]}
      >
        <Glyph
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5"
          size={13}
          color={item.coachNote ? flColor.bronze400 : flColor.gray600}
        />
        <Text style={[styles.exNoteText, item.coachNote ? styles.exNoteTextSet : null]} numberOfLines={2}>
          {item.coachNote ? item.coachNote : 'Add a coaching note'}
        </Text>
      </Pressable>
    </TourAnchor>
  );
}

/** The activity glyph — same paths as `forge-symbols.js`, keyed off ACTIVITY and never equipment. */
function ActivityGlyph({ activity, size, color }: { activity: CardioActivity; size: number; color: string }) {
  const name = activitySymbol(activity);
  const p = { fill: 'none' as const, stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'bicycle') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={5.5} cy={15.5} r={3.2} {...p} />
        <Circle cx={18.5} cy={15.5} r={3.2} {...p} />
        <Path d="M5.5 15.5l4-7h6M9.5 8.5l3 7M18.5 15.5l-3-7" {...p} />
      </Svg>
    );
  }
  if (name === 'footprints') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M8 4.5c1.4 0 2.2 1.5 2.2 3.3 0 1.4-.6 2.7-2.2 2.7s-2.2-1.3-2.2-2.7C5.6 6 6.6 4.5 8 4.5z" {...p} />
        <Path d="M16 8.5c1.4 0 2.2 1.5 2.2 3.3 0 1.4-.6 2.7-2.2 2.7s-2.2-1.3-2.2-2.7C13.8 10 14.6 8.5 16 8.5z" {...p} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 15.6v-3c0-.5.4-.8.9-.6l3.3.8 2.6-2.9c.4-.5 1.2-.4 1.5.2l.7 1.5 6 1.7c1.2.3 2 1.1 2 2.4v.7c0 .4-.3.7-.7.7H4c-.6 0-1-.5-1-1z" {...p} />
    </Svg>
  );
}

function RoundStep({ label, sign, onPress }: { label: string; sign: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.roundStep} hitSlop={6}>
      <Text style={styles.roundStepSign}>{sign}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  importLink: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 22, paddingVertical: 6, paddingHorizontal: 2, alignSelf: 'flex-start' },
  importLinkText: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  pressed: { opacity: 0.65 },

  impCol: { gap: 12, paddingTop: 2 },
  impHint: { fontFamily: flFont.sans, fontSize: 12.5, lineHeight: 19, color: flColor.gray400 },
  impHintStrong: { color: flColor.cream100, fontWeight: '700' },
  impPaste: {
    height: 148,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    color: flColor.cream100,
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
    textAlignVertical: 'top',
  },
  impError: { fontFamily: flFont.sans, fontSize: 12, lineHeight: 17, color: flColor.redMuted },
  impFileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10 },
  impFileText: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  impPressed: { opacity: 0.6 },
  /** Distinct from `impPressed` — a press is momentary, this holds for the length of the round-trip. */
  impBusy: { opacity: 0.45 },

  impSummary: { padding: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  impSummaryLabel: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 5 },
  impSummaryText: { fontFamily: flFont.sans, fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  impNote: { fontFamily: flFont.sans, fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },

  impWeekBlock: { gap: 10 },
  impWeekHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  impWeekLabel: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  impWeekRule: { flex: 1, height: 1, backgroundColor: flColor.charcoal600 },

  impDayCard: { borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, overflow: 'hidden' },
  impDayName: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '700', color: flColor.cream100, paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  impItems: { gap: 6, paddingVertical: 10, paddingHorizontal: 12 },
  impItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  impItemText: { flex: 1, gap: 1 },
  impItemName: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray400 },
  impItemMatched: { fontFamily: flFont.sans, fontSize: 10.5, color: flColor.bronze400 },
  impItemUnmatched: { fontFamily: flFont.sans, fontSize: 10.5, color: flColor.gray600 },
  impSteppers: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  impStep: { width: 22, height: 22, borderRadius: flRadius.sm, borderWidth: 1, borderColor: flColor.charcoal500, alignItems: 'center', justifyContent: 'center' },
  impStepGlyph: { fontSize: 13, lineHeight: 15, color: flColor.gray400 },
  impNum: { fontSize: 12, color: flColor.cream100, width: 16, textAlign: 'center', fontVariant: ['tabular-nums'] },
  impNumWide: { width: 22 },
  /* An assumed number is dimmer — the sheet did not say it, and the athlete should see which is which. */
  impNumAssumed: { color: flColor.gray600 },
  impTimes: { fontSize: 11, color: flColor.gray600, marginHorizontal: 1 },

  impAddWeek: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal500 },
  impAddWeekText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  impActions: { flexDirection: 'row', gap: 10 },
  impBackBtn: { flexBasis: 96 },
  impCreateBtn: { flex: 1 },

  root: { flex: 1 },

  addRow: { flexDirection: 'row', gap: 8 },
  addBtnGrow: { flex: 1, minWidth: 0 },
  addCardioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: flRadius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal500 },
  addCardioText: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray400 },
  modRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  modBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  modBtnDiv: { borderLeftWidth: 1, borderLeftColor: flColor.charcoal700 },
  modBtnOn: { backgroundColor: flColor.bronzeTint },
  modText: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray600 },
  modTextOn: { color: flColor.bronze300 },
  exMeterOpen: { color: flColor.bronze300 },
  cardioRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  cardioIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal900, alignItems: 'center', justifyContent: 'center' },
  cardioRowText: { flex: 1, minWidth: 0, gap: 2 },
  cardioRowName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  cardioRowSub: { fontSize: 11.5, color: flColor.gray600 },
  cardioIntro: { fontSize: 12.5, lineHeight: 19, color: flColor.gray600, marginBottom: 2 },

  // "Use a template" — the whole-day shortcut, and its chooser
  templateLink: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, paddingVertical: 14, paddingHorizontal: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  templateLinkText: { flex: 1, minWidth: 0, gap: 3 },
  templateLinkTitle: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  templateLinkSub: { fontSize: 11.5, lineHeight: 16, color: flColor.gray600 },
  tplCol: { gap: 10 },
  tplIntro: { fontSize: 12.5, lineHeight: 19, color: flColor.gray600 },
  tplSearch: { paddingHorizontal: 13, paddingVertical: 11, minHeight: 44, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, fontSize: 14, color: flColor.cream100 },
  tplGroupLabel: { marginTop: 8, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.bronze400 },
  tplRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal900 },
  tplRowText: { flex: 1, minWidth: 0, gap: 2 },
  tplRowName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  tplRowSub: { fontSize: 11.5, color: flColor.gray600 },
  tplEmpty: { paddingVertical: 22, fontSize: 12.5, lineHeight: 18, color: flColor.gray600, textAlign: 'center' },

  // ── setup
  setupScroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  detailsCard: {
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: `${flShadow.borderInset}, ${flShadow.card}`,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 18,
    marginBottom: 16,
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  contextText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: flColor.bronze400 },
  cardHeader: { paddingHorizontal: 2 },
  field: { marginTop: 16 },
  microLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.gray600,
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSign: { fontSize: 19, lineHeight: 22, color: flColor.gray400 },
  stepperText: { fontSize: 13, color: flColor.gray400 },
  stepperValue: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  hint: { marginTop: 7, fontSize: 11, color: flColor.gray600 },
  /* One step brighter than `hint` and no accent colour — this is a fact worth reading, not a warning
     worth flinching at (W4-A1-D4). */
  hintQuiet: { marginTop: 6, fontSize: 11, lineHeight: 16, color: flColor.gray400 },

  segmented: {
    flexDirection: 'row',
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    overflow: 'hidden',
  },
  seg: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segOn: { backgroundColor: flColor.bronzeTint },
  segDivider: { borderLeftWidth: 1, borderLeftColor: flColor.charcoal700 },
  segText: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.gray400 },
  segTextOn: { color: flColor.bronze300 },

  listHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  listSummary: { fontSize: 11, color: flColor.gray600, marginBottom: 14 },
  dayRows: { gap: 8 },
  rowSplit: { paddingVertical: 0, paddingLeft: 0, paddingRight: 0, overflow: 'hidden' },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingLeft: 14, paddingRight: 8 },
  rowMenu: { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: flColor.charcoal700 },
  weekNum: { width: 38 },
  todoMark: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: flColor.charcoal500 },
  barBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  structure: { marginBottom: 20, gap: 8 },
  structOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  structOptionOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  radio: { marginTop: 1, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: flColor.charcoal500, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: flColor.bronze400 },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: flColor.bronze300 },
  structText: { flex: 1, minWidth: 0, gap: 2 },
  structTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  structBody: { fontSize: 12, lineHeight: 17, color: flColor.gray600 },

  progressBlock: { marginBottom: 20 },
  weekProgress: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 },
  progressHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  progressLink: { fontSize: 11, color: flColor.bronze400 },

  jumpScroll: { maxHeight: 400 },
  jumpRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: flRadius.md },
  jumpRowCurrent: { backgroundColor: flColor.bronzeTint },
  jumpCurrentDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: flColor.bronzeBorder, alignItems: 'center', justifyContent: 'center' },
  jumpTodoDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: flColor.charcoal500 },
  jumpLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  jumpStatus: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },
  jumpStatusCurrent: { color: flColor.bronze300 },

  copyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  copyChip: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  copyChipText: { fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.borderInset,
  },
  dayRowBuilt: { borderColor: flColor.bronzeBorderSubtle },
  dayLetter: {
    width: 34,
    height: 34,
    borderRadius: flRadius.sm,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLetterText: { fontFamily: flFont.display, fontSize: 14, fontWeight: '700', color: flColor.bronze300 },
  dayText: { flex: 1, minWidth: 0, gap: 2 },
  dayNameText: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  daySub: { fontSize: 12, color: flColor.gray600 },
  daySubBuilt: { color: flColor.bronze400 },
  doneMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { marginTop: 16, fontSize: 13, color: flColor.redMuted },

  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
  },
  checks: { gap: 7, marginBottom: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkLabel: { fontSize: 12, color: flColor.gray600 },
  checkLabelOk: { color: flColor.gray400 },

  // ── day builder
  dayScroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 26 },
  dayHead: { marginBottom: 18, paddingHorizontal: 2 },
  daySummary: { marginTop: 9, fontSize: 12, color: flColor.bronze400 },
  section: { marginBottom: 20 },
  sectionRuled: { marginBottom: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  sectionLast: { marginBottom: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: 9, paddingHorizontal: 2, paddingBottom: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
  sectionLabelMain: { fontSize: 11, color: flColor.bronze400 },
  sectionReq: { fontSize: 9, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },
  spacer: { flex: 1 },
  sectionCount: { fontSize: 10, fontWeight: '600', color: flColor.gray600 },
  sectionBody: { gap: 8 },
  sectionEmpty: { paddingHorizontal: 2, paddingBottom: 2, fontSize: 12.5, color: flColor.gray600 },

  exCard: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.borderInset,
    overflow: 'hidden',
  },
  exCardPaired: { borderColor: flColor.bronzeBorder },
  pairHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 7, paddingHorizontal: 13, backgroundColor: flColor.bronzeTint, borderBottomWidth: 1, borderBottomColor: flColor.bronzeBorderSubtle },
  pairHeadText: { flex: 1, fontSize: 10.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze400 },
  pairBreak: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray400 },
  pairLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 8, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  pairLinkText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, color: flColor.bronze400 },
  exTop: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, paddingHorizontal: 13 },
  exIcon: {
    width: 36,
    height: 36,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exText: { flex: 1, minWidth: 0, gap: 2 },
  exName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  exEquip: { fontSize: 11.5, color: flColor.gray600 },
  exControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exCtrl: {
    width: 26,
    height: 26,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exBottom: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  /* The cue sits under the meters as its own full-width row: it is a sentence, not a number, and
     squeezing it beside a stepper would truncate the one field whose whole value is the words in it. */
  /* The source sentence, under the name it produced. Small and quiet — it is evidence, not content. */
  impItemSource: { fontSize: 11, lineHeight: 15, color: flColor.gray600, fontStyle: 'italic', marginTop: 2 },
  impTarget: { fontFamily: flFont.display, fontSize: 13, color: flColor.bronze300, paddingLeft: 8 },
  exNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
  },
  exNotePressed: { backgroundColor: flColor.charcoal700 },
  exNoteText: { flex: 1, fontSize: 12, color: flColor.gray600 },
  /* An authored cue reads as prose — cream and italic, the same voice the logger shows it back in. */
  exNoteTextSet: { color: flColor.cream100, fontStyle: 'italic' },
  targetInput: {
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    borderRadius: flRadius.md,
    backgroundColor: flColor.surfaceRecessed,
    color: flColor.cream100,
    fontFamily: flFont.display,
    fontSize: 26,
    textAlign: 'center',
    paddingVertical: 14,
  },
  noteInput: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    borderRadius: flRadius.md,
    backgroundColor: flColor.surfaceRecessed,
    color: flColor.cream100,
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    textAlignVertical: 'top',
  },
  exMeter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 9 },
  exMeterDivider: { borderRightWidth: 1, borderRightColor: flColor.charcoal700 },
  exMeterText: { minWidth: 58, textAlign: 'center', fontSize: 12.5, color: flColor.gray400 },
  /* A dotted underline is what tells the athlete the number can be typed rather than only stepped. */
  exMeterTypeable: { textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: flColor.charcoal500 },
  exMeterValue: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  roundStep: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundStepSign: { fontSize: 16, lineHeight: 18, color: flColor.gray400 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  addText: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze300 },

  /** The recessive half of the footer pair — it ends the session, so it reads as a link, not a button. */
  nextDay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 9, paddingVertical: 10 },
  nextDayText: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray400 },

  // ── resize confirmation
  resizeSheet: { gap: 16 },
  resizeMsg: { fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },
  resizeActions: { flexDirection: 'row', gap: 10 },
  resizeBtn: { flex: 1 },
});
