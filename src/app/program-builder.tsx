import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
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
import { resolveExerciseName } from '@/domain/exercise-picker/data';
import { useToast } from '@/hooks/useCeremony';
import { EquipIcon } from '@/components/forge/EquipIcon';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { claimInitiativeHonor } from '@/data/honors-live';
import { createProgram, fetchProgram, updateProgram, type ProgramDay, type ProgramExercise } from '@/data/programs-live';
import { clearBuilderInbox, readBuilderInbox, type BuilderSection } from '@/lib/builder-inbox';
import {
  CARDIO_ACTIVITIES,
  activitySymbol,
  bumpDistance,
  bumpPace,
  bumpSpeed,
  deriveEquip,
  deriveName,
  distanceLabel,
  effortLabel,
  newCardioBlock,
  FIRST_TARGET,
  usesSpeed,
  type CardioActivity,
  type Modality,
} from '@/domain/workout/conditioning';
import { errorMessage } from '@/lib/useQuery';
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
  nextIncompleteWeek,
  normalizeDraft,
  saveProgramDraft,
  setRepeatMode,
  setVaryMode,
  weekBuilt,
  weekComplete,
  weeksLoseContent,
  withActiveDays,
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
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

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

export default function ProgramBuilderScreen() {
  const { showToast } = useToast();
  const router = useRouter();
  const { o: entryMode, id: entryId } = useLocalSearchParams<{ o?: string; id?: string }>();
  const [draft, setDraft] = useState<ProgramDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingResize, setPendingResize] = useState<{ kind: 'weeks' | 'days'; to: number; msg: string } | null>(null);

  /*
   * ── IMPORT FROM A SPREADSHEET ────────────────────────────────────────────
   *
   * One sheet, two states, per `Forge Program Builder.dc.html`: paste, then preview what was read. The
   * architecture amendment specced four separate screens (W-IM-1..4) back in June; the design supersedes
   * it with a sheet inside the builder, which is also where an imported program is going to be edited
   * anyway. PD-7 — the design governs.
   */
  const [importOpen, setImportOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  /** Non-null once a paste has parsed — the sheet flips to its preview state. */
  const [preview, setPreview] = useState<ParsedWeek[] | null>(null);

  /**
   * Resolve a written name to the catalogue — the SAME call the preview renders and the import commits,
   * so what the athlete is shown is exactly what gets stored. Two resolvers would drift.
   */
  const resolveName = (n: string) => resolveExerciseName(n);

  const openImport = () => {
    setPasteText('');
    setImportError(null);
    setPreview(null);
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
    const stretched = weeks !== imported.weeks;

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

    // One line, and it leads with whatever was LOST — the part an athlete needs to know about.
    const unmatched = unmatchedNames(preview, (n) => resolveName(n)?.key);
    const notes: string[] = [];
    if (droppedDays.length) notes.push(`${droppedDays.length} day${droppedDays.length === 1 ? '' : 's'} over the ${DAYS_MAX}-day limit dropped (${droppedDays.join(', ')})`);
    if (stretched) notes.push(`set to ${weeks} weeks — the shortest a program can be`);
    if (unmatched.length) notes.push(`${unmatched.length} name${unmatched.length === 1 ? '' : 's'} weren’t in the library and kept yours`);
    showToast(notes.length ? `Imported · ${notes.join(' · ')}` : 'Imported — review and save');
  };
  const [confirmClose, setConfirmClose] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [weekSheet, setWeekSheet] = useState<{ index: number; entering: boolean } | null>(null);
  const [dayMenu, setDayMenu] = useState<number | null>(null);
  /** The section the cardio sheet was opened from; null = closed. */
  const [cardioSheet, setCardioSheet] = useState<BuilderSection | null>(null);

  // Boot + picker round-trip in one pass: read the stored draft, absorb anything the Picker handed back,
  // persist, then render. Runs on every focus, so returning from the Picker lands the new exercises.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const stored = await loadProgramDraft();
        const inbox = await readBuilderInbox();
        let d = stored ? normalizeDraft(stored) : null;

        // Edit / Duplicate entry (from Program Detail). Hydrate from the source UNLESS this is the same
        // editing session resumed — otherwise coming back from the Picker would discard the work in
        // progress and reload the original. An inbox in hand always means a Picker round-trip.
        const wantMode = entryMode === 'edit' || entryMode === 'dup' ? entryMode : null;
        if (wantMode && entryId && !inbox) {
          const sameSession = d && d.mode === wantMode && d.srcId === entryId;
          if (!sameSession) {
            const source = await fetchProgram(entryId);
            d = source ? hydrateDraft(source, wantMode) : d;
          }
        } else if (!wantMode && !inbox && d && d.mode !== 'new') {
          d = null; // a fresh "build your own" entry must not inherit a stale edit session
        }

        d = d ?? newDraft();
        if (inbox) {
          await clearBuilderInbox();
          d = absorbBuilderInbox(d, inbox);
        }
        await saveProgramDraft(d);
        if (active) setDraft(d);
      })();
      return () => {
        active = false;
      };
    }, [entryMode, entryId]),
  );

  // Every mutation is a pure draft→draft step plus an autosave; nothing writes state during render.
  const mutate = (fn: (d: ProgramDraft) => ProgramDraft) => {
    if (!draft) return;
    const next = fn(draft);
    setDraft(next);
    void saveProgramDraft(next);
  };

  const patchActiveDay = (idx: number, fn: (day: ProgramDay) => ProgramDay) =>
    mutate((d) => withActiveDays(d, activeDays(d).map((day, i) => (i === idx ? fn(day) : day))));

  const patchSection = (idx: number, section: BuilderSection, fn: (list: ProgramExercise[]) => ProgramExercise[]) =>
    patchActiveDay(idx, (day) => ({ ...day, [section]: fn(day[section]) }));

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
    mutate((d) => (p.kind === 'weeks' ? applyWeeks(d, p.to) : applyDaysPerWeek(d, p.to)));
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
    void clearProgramDraft();
    router.back();
  };

  const keepDraft = () => {
    setConfirmClose(false);
    router.back();
  };

  const discardDraft = () => {
    setConfirmClose(false);
    void clearProgramDraft();
    router.back();
  };

  const onSave = async () => {
    if (!draft || !isDraftValid(draft) || saving) return;
    setSaving(true);
    setError(null);
    try {
      const structure = draftToStructure(draft);
      // Edit writes back over the source; new AND duplicate both create a fresh program, so a copy can
      // never overwrite the original it was forked from.
      let id: string;
      if (draft.mode === 'edit' && draft.editId) {
        await updateProgram(draft.editId, structure);
        id = draft.editId;
      } else {
        ({ id } = await createProgram(structure));
      }
      await clearProgramDraft();
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

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(6,7,8,0.3)' }} />

      {openDay && draft.openDay != null ? (
        <DayBuilder
          day={openDay}
          index={draft.openDay}
          dayCount={days.length}
          nextName={draft.openDay + 1 < days.length ? dayName(days[draft.openDay + 1]) : null}
          onBack={() => mutate((d) => ({ ...d, openDay: null }))}
          onNext={() => mutate((d) => ({ ...d, openDay: d.openDay != null && d.openDay + 1 < days.length ? d.openDay + 1 : null }))}
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
              list.map((x, k) =>
                k !== i
                  ? x
                  : x.kind === 'cardio'
                    ? { ...x, targetMi: bumpDistance(x.targetMi ?? null, dir, FIRST_TARGET[x.activity ?? 'run'].mi) }
                    : { ...x, sets: clampSets((x.sets ?? 1) + dir) },
              ),
            )
          }
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
          onOpenDay={(i) => mutate((d) => ({ ...d, openDay: i }))}
          onOpenDayMenu={setDayMenu}
          onOpenJump={() => setJumpOpen(true)}
          onOpenWeekSheet={() => setWeekSheet({ index: draft.openWeek ?? 0, entering: false })}
          onAdvance={advanceWeek}
        />
      ) : (
        <SetupView
          draft={draft}
          days={days}
          saving={saving}
          error={error}
          onCancel={onCancel}
          onName={(v) => mutate((d) => ({ ...d, name: v }))}
          onWeeks={requestWeeks}
          onDays={requestDays}
          onOpenDay={(i) => mutate((d) => ({ ...d, openDay: i }))}
          onOpenDayMenu={setDayMenu}
          onOpenWeek={openWeek}
          onOpenWeekMenu={(i) => setWeekSheet({ index: i, entering: false })}
          onOpenImport={openImport}
          onOpenJump={() => setJumpOpen(true)}
          onRepeat={() => mutate(setRepeatMode)}
          onVary={() => mutate(setVaryMode)}
          onSave={onSave}
        />
      )}

      {/* Jump to week — the progress bar's destination. */}
      {/* Add a cardio block. Three activities — the modality is set on the card afterwards, and the
          targets are steppers rather than fields because either one can be left open. */}
      <BottomSheet open={cardioSheet != null} onClose={() => setCardioSheet(null)} title="Add a cardio block">
        <Text style={styles.cardioIntro}>
          Set the distance and pace on the card. Leave either one open and the athlete decides.
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
              ? "Copy a week you've already built into this one, or start from scratch."
              : 'Copy another week in, or clear this one.'}
          </Text>
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
          </View>
        ) : (
          <View style={styles.impCol}>
            <View style={styles.impSummary}>
              <Text style={styles.impSummaryLabel}>Here&apos;s what we read</Text>
              <Text style={styles.impSummaryText}>{summarize(preview)}</Text>
            </View>
            <Text style={styles.impNote}>
              Tap − / + to fix any sets × reps now. You can also rename, reorder, and add exercises after you
              create the program.
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
                            {/* WHAT THE NAME RESOLVED TO, before anything is created.
                                A match found by the equipment convention rather than by the words is a
                                judgement, not a fact — showing it is what makes the convention honest,
                                and the athlete can swap the exercise in the builder afterwards. */}
                            {(() => {
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
                          <View style={styles.impSteppers}>
                            <ImpStep label={`Fewer sets of ${it.name}`} glyph="−" onPress={() => bumpPreview(wi, di, ii, 'sets', -1)} />
                            <Text style={[styles.impNum, it.setsAssumed ? styles.impNumAssumed : null]}>{it.sets}</Text>
                            <ImpStep label={`More sets of ${it.name}`} glyph="+" onPress={() => bumpPreview(wi, di, ii, 'sets', 1)} />
                            <Text style={styles.impTimes}>×</Text>
                            <ImpStep label={`Fewer reps of ${it.name}`} glyph="−" onPress={() => bumpPreview(wi, di, ii, 'reps', -1)} />
                            <Text style={[styles.impNum, styles.impNumWide, it.repsAssumed ? styles.impNumAssumed : null]}>{it.reps}</Text>
                            <ImpStep label={`More reps of ${it.name}`} glyph="+" onPress={() => bumpPreview(wi, di, ii, 'reps', 1)} />
                          </View>
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

      <BottomSheet open={pendingResize != null} onClose={() => setPendingResize(null)} title="Remove content?">
        <View style={styles.resizeSheet}>
          <Text style={styles.resizeMsg}>{pendingResize?.msg ?? ''}</Text>
          <View style={styles.resizeActions}>
            <View style={styles.resizeBtn}>
              <Button variant="secondary" fullWidth onPress={() => setPendingResize(null)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
            <View style={styles.resizeBtn}>
              <Button variant="destructive" fullWidth onPress={confirmResize} accessibilityLabel="Remove content">
                Remove
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

  const title = draft.mode === 'edit' ? 'Edit Program' : draft.mode === 'dup' ? 'Duplicate Program' : 'New Program';
  const saveLabel = draft.mode === 'edit' ? 'Save Changes' : draft.mode === 'dup' ? 'Create Copy' : 'Save Program';
  const context =
    draft.mode === 'edit'
      ? 'Editing your program'
      : draft.mode === 'dup'
        ? 'New copy — the original stays unchanged'
        : null;

  return (
    <>
      <AppBar title={title} serif onClose={onCancel} />

      <Animated.ScrollView
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

        <View style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <SectionHeader label="Program details" />
          </View>

          <InputField
            label="Program name"
            placeholder="e.g. Winter Powerbuilding"
            value={draft.name}
            onChange={onName}
            maxLength={40}
            showCount
          />

          <View style={styles.field}>
            <Text style={styles.microLabel}>Length</Text>
            <View style={styles.stepperRow}>
              <Stepper label="Fewer weeks" sign="−" onPress={() => onWeeks(draft.weeks - 1)} />
              <Text style={styles.stepperText}>
                <Text style={styles.stepperValue}>{draft.weeks}</Text> weeks
              </Text>
              <Stepper label="More weeks" sign="+" onPress={() => onWeeks(draft.weeks + 1)} />
            </View>
            <Text style={styles.hint}>4–52 weeks — supports multi-month blocks</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.microLabel}>Training days / week</Text>
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
        </View>

        {/* "Import from a spreadsheet" — the design places it here, between the length controls and the
            structure choice, because importing decides both for you. */}
        <Pressable
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

        <View style={styles.structure}>
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
        </View>

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
          <View style={styles.dayRows}>
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
          </View>
        ) : (
        <View style={styles.dayRows}>
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
        </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Animated.ScrollView>

      <LinearGradient colors={['rgba(6,7,8,0.35)', 'rgba(6,7,8,0.82)']} style={styles.footer}>
        {!valid ? (
          <View style={styles.checks}>
            <CheckRow ok={nameOk} label="Program name" />
            <CheckRow ok={mainOk} label="At least one main exercise" />
          </View>
        ) : null}
        <Button variant="primary" fullWidth disabled={!valid || saving} onPress={onSave} accessibilityLabel={saveLabel}>
          {saving ? 'Saving…' : saveLabel}
        </Button>
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
  index,
  dayCount,
  nextName,
  onBack,
  onNext,
  onName,
  onAdd,
  onAddCardio,
  onRemove,
  onMove,
  onModality,
  onSlotA,
  onSlotB,
}: {
  day: ProgramDay;
  index: number;
  dayCount: number;
  nextName: string | null;
  onBack: () => void;
  onNext: () => void;
  onName: (v: string) => void;
  onAdd: (section: BuilderSection) => void;
  onAddCardio: (section: BuilderSection) => void;
  onRemove: (section: BuilderSection, i: number) => void;
  onMove: (section: BuilderSection, i: number, dir: -1 | 1) => void;
  onModality: (section: BuilderSection, i: number, m: Modality) => void;
  /** Sets for a lift, distance for a block. */
  onSlotA: (section: BuilderSection, i: number, dir: 1 | -1) => void;
  /** Reps for a lift, pace or speed for a block. */
  onSlotB: (section: BuilderSection, i: number, dir: 1 | -1) => void;
}) {
  const total = dayTotal(day);
  const est = Math.round((day.main.length * 9 + day.warmup.length * 4 + day.cooldown.length * 4) / 5) * 5;
  const rise = useEntryRise(360);

  return (
    <>
      <AppBar title={dayName(day)} serif onBack={onBack} />

      <Animated.ScrollView
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
            <View key={sec.key} style={[styles.section, si > 0 && styles.sectionRuled, si === SECTION_META.length - 1 && styles.sectionLast]}>
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
                    onUp={() => onMove(sec.key, i, -1)}
                    onDown={() => onMove(sec.key, i, 1)}
                    onRemove={() => onRemove(sec.key, i)}
                    onModality={(m) => onModality(sec.key, i, m)}
                    onSlotA={(dir) => onSlotA(sec.key, i, dir)}
                    onSlotB={(dir) => onSlotB(sec.key, i, dir)}
                  />
                ))}

                {/* Adding an exercise is the common path and stays bronze; adding cardio is available
                    but recessive. The hierarchy is the point. */}
                <View style={styles.addRow}>
                  <Pressable
                    onPress={() => onAdd(sec.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${sec.addLabel}`}
                    style={[styles.addBtn, styles.addBtnGrow]}
                  >
                    <Glyph d={PLUS} size={15} color={flColor.bronze300} width={2} />
                    <Text style={styles.addText}>Add {sec.addLabel}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onAddCardio(sec.key)}
                    accessibilityRole="button"
                    accessibilityLabel="Add a cardio block"
                    style={styles.addCardioBtn}
                  >
                    <ActivityGlyph activity="run" size={17} color={flColor.gray400} />
                    <Text style={styles.addCardioText}>Cardio</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </Animated.ScrollView>

      <LinearGradient colors={['rgba(6,7,8,0.35)', 'rgba(6,7,8,0.82)']} style={styles.footer}>
        <Button variant="primary" fullWidth onPress={onBack} accessibilityLabel="Save workout">
          Save Workout
        </Button>
        {index + 1 < dayCount && nextName ? (
          <Pressable onPress={onNext} accessibilityRole="button" accessibilityLabel={`Save and go to ${nextName}`} style={styles.nextDay}>
            <Text style={styles.nextDayText}>Save &amp; go to {nextName}</Text>
            <Glyph d="M9 6l6 6-6 6" size={14} color={flColor.bronze300} />
          </Pressable>
        ) : null}
      </LinearGradient>
    </>
  );
}

function ExerciseCard({
  item,
  first,
  last,
  onUp,
  onDown,
  onRemove,
  onModality,
  onSlotA,
  onSlotB,
}: {
  item: ProgramExercise;
  first: boolean;
  last: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  onModality: (m: Modality) => void;
  onSlotA: (dir: 1 | -1) => void;
  onSlotB: (dir: 1 | -1) => void;
}) {
  /**
   * The SAME card for a lift and a run — same shell, header and reorder cluster. Only two things differ:
   * a modality row is inserted, and the two footer steppers count different units. The visual continuity
   * between a lift and a run in one list is the point; a bespoke cardio card would break the day apart.
   */
  const cardio = item.kind === 'cardio';
  const activity = (item.activity ?? 'run') as CardioActivity;
  const speed = cardio && usesSpeed(activity);
  const indoor = item.modality === 'indoor';
  const id = (n: number) => n;

  // Slot A: sets for a lift, distance for a block. Slot B: reps, or pace/speed.
  const aVal = cardio ? distanceLabel(item.targetMi ?? null, id) : String(item.sets ?? 1);
  const aUnit = cardio ? (item.targetMi == null ? '' : 'mi') : 'sets';
  const bVal = cardio ? effortLabel({ ...item, activity, name: item.name, equip: item.equip ?? '', modality: item.modality ?? 'outdoor', targetMi: item.targetMi ?? null }, id, id) : String(item.reps ?? 1);
  const bUnit = cardio ? (speed ? (item.targetSpdMph == null ? 'speed' : 'mph') : item.targetPaceSec == null ? 'pace' : '/mi') : 'reps';
  // Bronze on an open target is what makes "no target" read as a deliberate authored state rather than
  // a value someone forgot to fill in.
  const aOpen = cardio && item.targetMi == null;
  const bOpen = cardio && (speed ? item.targetSpdMph == null : item.targetPaceSec == null);

  return (
    <View style={styles.exCard}>
      <View style={styles.exTop}>
        <View style={styles.exIcon}>
          {cardio ? <ActivityGlyph activity={activity} size={19} color={flColor.bronze400} /> : <EquipIcon equip={item.equip} size={19} />}
        </View>
        <View style={styles.exText}>
          <Text style={styles.exName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.equip ? (
            <Text style={styles.exEquip} numberOfLines={1}>
              {item.equip}
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
        <View style={[styles.exMeter, styles.exMeterDivider]}>
          <RoundStep label={cardio ? `Shorter distance for ${item.name}` : `Fewer sets for ${item.name}`} sign="−" onPress={() => onSlotA(-1)} />
          <Text style={styles.exMeterText}>
            <Text style={[styles.exMeterValue, aOpen ? styles.exMeterOpen : null]}>{aVal}</Text>
            {aUnit ? ` ${aUnit}` : ''}
          </Text>
          <RoundStep label={cardio ? `Longer distance for ${item.name}` : `More sets for ${item.name}`} sign="+" onPress={() => onSlotA(1)} />
        </View>
        <View style={styles.exMeter}>
          <RoundStep
            label={cardio ? (speed ? `Lower target speed for ${item.name}` : `Faster target pace for ${item.name}`) : `Fewer reps for ${item.name}`}
            sign="−"
            onPress={() => onSlotB(-1)}
          />
          <Text style={styles.exMeterText}>
            <Text style={[styles.exMeterValue, bOpen ? styles.exMeterOpen : null]}>{bVal}</Text> {bUnit}
          </Text>
          <RoundStep
            label={cardio ? (speed ? `Higher target speed for ${item.name}` : `Slower target pace for ${item.name}`) : `More reps for ${item.name}`}
            sign="+"
            onPress={() => onSlotB(1)}
          />
        </View>
      </View>
    </View>
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
  exMeter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 9 },
  exMeterDivider: { borderRightWidth: 1, borderRightColor: flColor.charcoal700 },
  exMeterText: { minWidth: 58, textAlign: 'center', fontSize: 12.5, color: flColor.gray400 },
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

  nextDay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 9, paddingVertical: 10 },
  nextDayText: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze300 },

  // ── resize confirmation
  resizeSheet: { gap: 16 },
  resizeMsg: { fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },
  resizeActions: { flexDirection: 'row', gap: 10 },
  resizeBtn: { flex: 1 },
});
