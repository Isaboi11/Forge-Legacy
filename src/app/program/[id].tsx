import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import {
  deleteProgram,
  endProgram,
  fetchProgram,
  fetchProgramWorkouts,
  startProgram,
  type SavedProgram,
} from '@/data/programs-live';
import {
  buildLog,
  computeProgress,
  computeStats,
  equipmentOf,
  fmtVolume,
  nextSession,
  viewForState,
  type LogWeek,
  type LoggedWorkout,
} from '@/domain/program/progress-core';
import { writeWorkoutLaunch } from '@/lib/workout-launch';
import { useUnits } from '@/lib/settings';
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
 * DEFERRED vs the `.dc` (omitted, not faked): Share (needs the Share Configuration screen), and the
 * "What's Next" successor card (needs a catalog successor graph these authored programs don't have).
 */

const CHEVRON = 'M6 9l6 6 6-6';

function Glyph({ d, size = 16, color, width = 2, flip = false }: { d: string; size?: number; color: string; width?: number; flip?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={flip ? styles.flip : undefined}>
      <Path d={d} />
    </Svg>
  );
}

export default function ProgramDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { load } = useUnits(); // "Heaviest" set, in the athlete's system

  const [program, setProgram] = useState<SavedProgram | null>(null);
  const [workouts, setWorkouts] = useState<LoggedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'conflict' | 'end' | 'remove' | null>(null);

  // Refetch on focus so returning from a finished workout shows the new session immediately.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        if (!id) return;
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
    }, [id]),
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

  if (!program) {
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

  const { structure, state } = program;
  const view = viewForState(state, true);
  const progress = computeProgress(structure, workouts.length);
  const stats = computeStats(workouts);
  const weeks = buildLog(structure, workouts);
  const equipment = equipmentOf(structure);
  const trained = workouts.length > 0;
  const showProgress = state === 'active' || state === 'ended_early' || state === 'graduated';

  const goTrain = async () => {
    if (!nextSession(structure, workouts.length)) return; // program finished — nothing left to train
    await writeWorkoutLaunch({ programId: program.id });
    router.push('/workout');
  };

  const onPrimary = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (state === 'active') {
        await goTrain();
      } else {
        // start_program ends whatever else was active, atomically (0017).
        await startProgram(program.id);
        setProgram({ ...program, state: 'active' });
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
        await endProgram(program.id, 'ended_early');
        setProgram({ ...program, state: 'ended_early' });
      } else if (kind === 'remove') {
        await deleteProgram(program.id);
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
          body: `“${program.name}” moves to your legacy as ended early. Everything you logged stays — this cannot be undone.`,
          confirm: 'End Program',
        }
      : sheet === 'remove'
        ? {
            title: 'Delete this program?',
            body: `“${program.name}” will be removed from your programs. Every workout you logged against it is kept — deleting a plan never deletes the training you did.`,
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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{program.name}</Text>
        <Text style={styles.metaFamily}>Custom · {structure.vary ? 'Per-week' : 'Repeating week'}</Text>
        <Text style={styles.metaLine}>
          {structure.weeks} weeks • {progress.perWeek} {progress.perWeek === 1 ? 'day' : 'days'} / week
        </Text>

        {showProgress ? (
          <View style={styles.progressCard}>
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

        {trained ? (
          <View style={styles.statRow}>
            <Stat label="Volume" value={fmtVolume(stats.volume)} />
            <Stat label="Workouts" value={String(stats.workouts)} />
            <Stat label="Sets" value={String(stats.sets)} />
            <Stat label="Heaviest" value={stats.heaviest > 0 ? load(stats.heaviest) : '—'} />
          </View>
        ) : null}

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

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.cta}>
        <Button variant="primary" fullWidth disabled={busy} onPress={onPrimary} accessibilityLabel={view.cta}>
          {view.cta}
        </Button>
        <View style={styles.ctaRow}>
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
        <View style={styles.secondaryRow}>
          {state === 'active' ? (
            <Pressable onPress={() => setSheet('end')} accessibilityRole="button" accessibilityLabel="End Program" style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>End Program</Text>
            </Pressable>
          ) : null}
          {/* Delete is available in every state, not just Planned — a graduated or ended program the
              athlete no longer wants was otherwise stuck in their library with no way out. The workouts
              logged against it survive the delete (0018 nulls the link rather than cascading). */}
          <Pressable onPress={() => setSheet('remove')} accessibilityRole="button" accessibilityLabel="Delete program" style={styles.secondaryBtn}>
            <Text style={[styles.secondaryText, styles.deleteText]}>Delete Program</Text>
          </Pressable>
        </View>
      </View>

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

  progressCard: { marginTop: 18, padding: 16, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, boxShadow: flShadow.card, gap: 11 },
  progressHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  progressWeek: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  progressPct: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.bronze300, fontVariant: ['tabular-nums'] },
  progressSub: { fontSize: 12, color: flColor.gray600 },

  block: { marginTop: 18 },
  microLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600, marginBottom: 9 },
  equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  equipPill: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  equipText: { fontSize: 12, fontWeight: '600', color: flColor.gray400 },

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
