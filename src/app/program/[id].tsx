import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

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
  fetchProgramWorkouts,
  runProgramAgain,
  startProgram,
  type SavedProgram,
} from '@/data/programs-live';
import { fmtLongDate, spanLabel, workoutsLabel } from '@/domain/program/graduation';
import {
  buildLog,
  computeProgress,
  computeStats,
  equipmentOf,
  fmtVolume,
  nextSession,
  totalSessions,
  viewForState,
  type LogWeek,
  type LoggedWorkout,
  type ProgramState,
} from '@/domain/program/progress-core';
import { getProgramDefinition } from '@/domain/training/programs';
import { structureFromDefinition } from '@/domain/program/adopt-core';
import { equipmentForCatalogKey } from '@/domain/home-artwork/catalog';
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
  const { load, units } = useUnits(); // "Heaviest" set, in the athlete's system

  const [program, setProgram] = useState<SavedProgram | null>(null);
  const [workouts, setWorkouts] = useState<LoggedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'conflict' | 'end' | 'remove' | null>(null);
  /** 'gate' = answering before the program starts; 'change' = correcting one mid-run. */
  const [maxSheet, setMaxSheet] = useState<'gate' | 'change' | null>(null);
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
        if (previewDef) {
          // Nothing to read. A preview is derived entirely from shipped content.
          setLoading(false);
          return;
        }
        try {
          const [p, w] = await Promise.all([fetchProgram(id), fetchProgramWorkouts(id)]);
          if (!active) return;
          setProgram(p);
          setWorkouts(w);
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
  const programName = program?.name ?? previewDef!.name;
  const sourceDefId = program?.sourceDefinitionId ?? previewDef!.id;
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
  const terminal = state === 'graduated' || state === 'ended_early';
  const showProgress = state === 'active' || terminal;

  const goTrain = async () => {
    if (!nextSession(structure, workouts.length)) return; // program finished — nothing left to train
    await writeWorkoutLaunch({ programId: program!.id });
    router.push('/workout');
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
      ? [state === 'graduated' ? 'Graduated' : 'Ended early', workoutsLabel(workouts.length)].filter(Boolean).join(' · ')
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
          row = await adoptCatalogProgram(
            previewDef!.id,
            structureFromDefinition(previewDef!, (k) => equipmentForCatalogKey(k) ?? undefined, (n) => itemByName(n)?.key),
          );
          setProgram(row);
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
        ? {
            title: 'Delete this program?',
            body: `“${programName}” will be removed from your programs. Every workout you logged against it is kept — deleting a plan never deletes the training you did.`,
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
              {state === 'graduated' ? 'Graduated' : 'Ended'} {fmtLongDate(program?.endedAt ?? null)}
            </Text>
            <Text style={styles.sealedWhat}>
              {[workoutsLabel(workouts.length), spanLabel(program?.startedAt ?? null, program?.endedAt ?? null)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
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

          Shown only for a program that actually prescribes percentages, which is no shipped program
          today. A lift with no max yet reads "not set" rather than a number, because an unanswered
          entry is a real state and a 0 would be a confident false claim about what the athlete lifts.
        */}
        {maxKeys.length ? (
          <View style={styles.block}>
            <Text style={styles.microLabel}>Working from</Text>
            <Pressable
              onPress={() => setMaxSheet('change')}
              accessibilityRole="button"
              accessibilityLabel="Change your maxes"
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
              <Text style={styles.maxChange}>Change</Text>
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
            />
          ))}
          </View>
        </TourAnchor>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <TourAnchor id="program-actions" style={styles.cta}>
        <Button variant="primary" fullWidth disabled={busy} onPress={onPrimary} accessibilityLabel={view.cta}>
          {view.cta}
        </Button>
        <View style={styles.ctaRow}>
          {/* Edit is gone once the record is sealed — W-3 §7 calls it read-only, and editing the plan
              behind a finished program would rewrite what the athlete actually did. Duplicate stays in
              every state: it creates a new row and never touches the original. */}
          {terminal ? null : (
            <View style={styles.ctaHalf}>
              <Button
                variant="secondary"
                fullWidth
                onPress={() => router.push({ pathname: '/program-builder', params: { o: 'edit', id: program!.id } })}
                accessibilityLabel="Edit program"
              >
                Edit
              </Button>
            </View>
          )}
          <View style={styles.ctaHalf}>
            <Button
              variant="secondary"
              fullWidth
              onPress={() => router.push({ pathname: '/program-builder', params: { o: 'dup', id: program!.id } })}
              accessibilityLabel="Duplicate program"
            >
              Duplicate
            </Button>
          </View>
        </View>
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
          {/* NOT on a sealed record. Amendment-001 §6: "Graduated and Ended Early programs are permanent
              legacy records. They may never be deleted." The RLS policy refuses it too since 0104 — this
              hides an action that would otherwise fail, rather than being the only thing standing in the
              way. A live program's delete is unchanged; the workouts logged against it survive either way
              (0018 nulls the link rather than cascading). */}
          {terminal ? null : (
            <Pressable onPress={() => setSheet('remove')} accessibilityRole="button" accessibilityLabel="Delete program" style={styles.secondaryBtn}>
              <Text style={[styles.secondaryText, styles.deleteText]}>Delete Program</Text>
            </Pressable>
          )}
        </View>
      </TourAnchor>

      <ScreenTour screenKey="program-detail" />

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
      {maxSheet != null ? (
        <LiftMaxSheet
          key={`${maxSheet}-${maxKeys.join(',')}`}
          open
          onClose={() => setMaxSheet(null)}
          programId={program!.id}
          keys={maxKeys}
          names={liftNames}
          known={liftMaxes}
          units={units}
          title={maxSheet === 'gate' ? 'Before you start' : 'Change your max'}
          warning={maxSheet === 'change' ? changeWarning : null}
          onSaved={(maxes) => setProgram((p) => (p ? { ...p, liftMaxes: maxes } : p))}
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
}: {
  week: LogWeek;
  current: boolean;
  open: boolean;
  openDay: string | null;
  onToggle: () => void;
  onToggleDay: (key: string) => void;
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
                  <Glyph d={CHEVRON} color={flColor.gray600} flip={dayOpen} />
                </Pressable>

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
                          <Text style={styles.exName}>{ex.name}</Text>
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
  ctaRow: { flexDirection: 'row', gap: 8 },
  ctaHalf: { flex: 1 },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 2 },
  secondaryBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  secondaryText: { fontSize: 11.5, letterSpacing: 0.2, color: flColor.gray600 },
  deleteText: { color: flColor.redMuted },

  emptyTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { fontSize: 13, lineHeight: 19, color: flColor.gray400, textAlign: 'center' },

  sheetBody: { gap: 16 },
  sheetText: { fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },
  sheetActions: { flexDirection: 'row', gap: 10 },
});
