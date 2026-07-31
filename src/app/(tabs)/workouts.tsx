import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { Pill } from '@/components/forge/composites/Pill';
import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { getPrograms } from '@/domain/training/active-program';
import { getProgramDefinitions } from '@/domain/training/programs';
import { equipmentForCatalogKey } from '@/domain/home-artwork/catalog';
import { structureFromDefinition } from '@/domain/program/adopt-core';
import { itemByName } from '@/domain/exercise-picker/data';
import { adoptCatalogProgram, fetchMyPrograms, type SavedProgram } from '@/data/programs-live';
import { fetchProgramCompletedCount } from '@/data/programs-live';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { dayLabel, nextSession, sessionsPerWeek, viewForState } from '@/domain/program/progress-core';
import { writeWorkoutLaunch } from '@/lib/workout-launch';
import { useQuery } from '@/lib/useQuery';
import { fetchTemplates, templateSummary } from '@/data/templates-live';
import type { Program } from '@/domain/training/schema';
import { ScreenTour } from '@/components/tour/ScreenTour';

/**
 * Workouts tab root (plural) — W-2 Program Browse / Programs Catalog.
 * Source of truth: the design handoff "Forge Programs Catalog.dc.html".
 *
 * Two tabs: "My Workouts" (what you own + train today) and "Discover" (find
 * something new). Distinct from `/workout` (singular) — the active session that
 * the header start button and Home's "Start Workout" push to.
 *
 * REAL data: the active program (getActiveProgram) and the Discover catalog
 * (getPrograms — the converted, LOCKED Strength programs), including each
 * program's family / difficulty / duration / frequency. The header start button
 * starts today's real workout via useWorkoutSession + /workout.
 *
 * DEFERRED to a follow-up sub-phase (noted at the gate, not faked here): the
 * three bottom sheets — Start Training (activity tiles), Train with others
 * (friends roster is placeholder social data), and Filters (needs a per-program
 * `equipment` field the runtime Program does not carry yet). Sections with no
 * backend — Planned, Your Programs (custom), Shared — are omitted while empty
 * rather than shown with fabricated rows. Library rows + program taps route to a
 * not-yet-built destination and are inert (consistent with Home's unbuilt links).
 */

// ── derivations from the runtime Program (all real, from the definition) ──
function freqAndWeeks(p: Program): { freq: number; weeks?: number } {
  const freq = p.frequencyPerWeek ?? p.schedule.length;
  const weeks = p.durationWeeks ?? (p.progress ? Math.round(p.progress.total / Math.max(1, freq)) : undefined);
  return { freq, weeks };
}
function compactMeta(p: Program): string {
  const { freq, weeks } = freqAndWeeks(p);
  return weeks ? `${p.family} · ${weeks} wk · ${freq}/wk` : `${p.family} · ${freq}/wk`;
}

export default function WorkoutsScreen() {
  const router = useRouter();
  const { startWorkout } = useWorkoutSession();
  const [tab, setTab] = useState<'mine' | 'discover'>('mine');
  const [family, setFamily] = useState<string>('All');

  // The athlete's own programs. Refetched on focus so a program just built, duplicated, or ended shows
  // up the moment they come back to this tab.
  const { data: myPrograms, refetch: refetchMine } = useQuery(fetchMyPrograms, []);
  const { data: templateData } = useQuery(fetchTemplates, []);
  useFocusEffect(
    useCallback(() => {
      refetchMine();
    }, [refetchMine]),
  );
  // Memoized: `?? []` would mint a fresh array every render and defeat the catalog memo below.
  const mine = useMemo(() => myPrograms ?? [], [myPrograms]);
  const templates = templateData ?? [];
  const [adopting, setAdopting] = useState<string | null>(null);

  /**
   * Open a built-in program. It has no database row until now, so adopt it first — that is what gives it
   * an id, a lifecycle and somewhere for finished workouts to attach. Idempotent, so re-opening one the
   * athlete already started resumes the same row rather than forking a second copy.
   */
  const openCatalogProgram = async (p: Program) => {
    if (adopting) return;
    setAdopting(p.id);
    try {
      const def = getProgramDefinitions().find((d) => d.id === p.id);
      if (!def) return;
      const equipFor = (key: string) => equipmentForCatalogKey(key) ?? undefined;
      const adopted = await adoptCatalogProgram(def.id, structureFromDefinition(def, equipFor, (n) => itemByName(n)?.key));
      refetchMine();
      router.push({ pathname: '/program/[id]', params: { id: adopted.id } });
    } catch {
      // leave the athlete where they are rather than dead-ending on an error screen
    } finally {
      setAdopting(null);
    }
  };

  /**
   * ACTIVE IS THE ATHLETE'S OWN, NOT THE CATALOG'S DEMO DEFAULT.
   *
   * `getActiveProgram()` reads the shipped program DEFINITIONS and returns whichever one the catalog
   * marks active — a demo cursor from before an athlete-progress backend existed. Its own header says so.
   * That backend has existed since 0017: `programs` carries a per-athlete `state`, and `fetchMyPrograms`
   * reads it. So this screen was telling a brand-new athlete they had Strength Foundation I underway
   * before they had chosen anything — a claim about their own record, which is the one thing the app must
   * never invent.
   */
  const { catalog, families } = useMemo(() => {
    const programs = getPrograms();
    // "Recommended Next" pool = the real catalog minus whatever the athlete already has.
    const owned = new Set(mine.map((p) => p.sourceDefinitionId).filter((id): id is string => !!id));
    const catalog = programs.filter((p) => !owned.has(p.id));
    const families = ['All', ...Array.from(new Set(programs.map((p) => p.family)))];
    return { catalog, families };
  }, [mine]);

  const discover = useMemo(
    () => (family === 'All' ? catalog : catalog.filter((p) => p.family === family)),
    [family, catalog],
  );

  // The athlete's own active program wins over the built-in one — it's the thing actually tracking.
  const myActive = mine.find((p) => p.state === 'active') ?? null;
  const [startOpen, setStartOpen] = useState(false);

  const startToday = async () => {
    setStartOpen(false);
    if (myActive) {
      const next = nextSession(myActive.structure, await fetchProgramCompletedCount(myActive.id));
      if (!next) return;
      await writeWorkoutLaunch({ programId: myActive.id });
      startWorkout(dayLabel(next.day, next.dayIndex));
      router.push('/workout');
      return;
    }
    // No active program: a session started from here is a one-off, not a phantom catalog day.
    await writeWorkoutLaunch({ freestyle: true });
    startWorkout('Freestyle Workout');
    router.push('/workout');
  };

  /** A one-off session, deliberately unattributed — it belongs to no program's progress. */
  const startFreestyle = async () => {
    setStartOpen(false);
    await writeWorkoutLaunch({ freestyle: true });
    startWorkout('Freestyle Workout');
    router.push('/workout');
  };

  const todayLabel = myActive ? myActive.name : null;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />

      <AppBar
        title={<Text style={styles.barTitle}>Workouts</Text>}
        actions={
          <Pressable
            onPress={() => setStartOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Start training"
            style={styles.startBtn}
            hitSlop={8}
          >
            <PlusIcon color={flColor.bronze400} />
          </Pressable>
        }
      />

      {/* segmented control — two mindsets: own/train vs. find new */}
      <View style={styles.segWrap}>
        <View style={styles.segTrack}>
          <Segment label="My Workouts" active={tab === 'mine'} onPress={() => setTab('mine')} />
          <Segment label="Discover" active={tab === 'discover'} onPress={() => setTab('discover')} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'mine' ? (
          <View style={styles.stack}>
            {/* ACTIVE — the anchor */}
            <View>
              <SectionHeader label="Active" />
              <View style={styles.sectionBody}>
                {myActive ? (
                  <SavedProgramRow
                    program={myActive}
                    onPress={() => router.push({ pathname: '/program/[id]', params: { id: myActive.id } })}
                  />
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>Forge Your Next Legacy</Text>
                    <Text style={styles.emptySub}>Build your own below, or find one in Discover.</Text>
                  </View>
                )}
              </View>
            </View>

            {/* YOUR PROGRAMS — always rendered, because the create row lives here and the moment you most
                need it is the moment you have none. It used to be gated on `mine.length > 0`, which hid
                authoring from exactly the athlete who had never authored anything. */}
            <View>
              <SectionHeader label="Your Programs" />
              <View style={[styles.sectionBody, styles.stackTight]}>
                {mine.map((p) => (
                  <SavedProgramRow
                    key={p.id}
                    program={p}
                    onPress={() => router.push({ pathname: '/program/[id]', params: { id: p.id } })}
                  />
                ))}
                {/* Creation beside what it creates. This was a dashed CTA in DISCOVER — which means "find
                    something someone else made", and where the thing you built then landed in the OTHER
                    tab. */}
                <CreateRow label="Build a Program" onPress={() => router.push('/program-builder')} />
              </View>
            </View>

            {/* YOUR TEMPLATES — a personal artifact, so it sits with programs rather than under "Library"
                beside two platform surfaces everyone shares. That grouping was the real error. */}
            <View>
              <SectionHeader label="Your Templates" action={templates.length > 3 ? 'View all' : undefined} onAction={() => router.push('/templates')} />
              <View style={[styles.sectionBody, styles.stackTight]}>
                {templates.slice(0, 3).map((t) => (
                  <LibraryRow
                    key={t.id}
                    title={t.name}
                    sub={templateSummary(t)}
                    icon={<TemplatesIcon />}
                    onPress={() => router.push('/templates')}
                  />
                ))}
                <CreateRow label="Build a Workout" onPress={() => void startFreestyle()} />
              </View>
            </View>

            {/* REFERENCE — what's left once the personal things move out is genuinely reference, and the
                section name is finally true. */}
            <View>
              <SectionHeader label="Reference" />
              <View style={[styles.sectionBody, styles.stackTight]}>
                <LibraryRow
                  title="Exercise Library"
                  sub="Browse every exercise, bookmark the ones you use."
                  icon={<DumbbellIcon />}
                  onPress={() => router.push('/exercise-library')}
                />
                {/* Stays here, deliberately. It answers "what did I lift Tuesday" — a training question at
                    set-level granularity. The Legacy Timeline answers "what has this amounted to". Moving
                    a set-by-set log into the museum would dilute the museum. */}
                <LibraryRow
                  title="Activity History"
                  sub="Every session you’ve logged, month by month."
                  icon={<HistoryIcon />}
                  onPress={() => router.push('/activity-history')}
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.stack}>
            {/* Kept OUT of Discover: authorship is not discovery, and what you build lands in the other
                tab. The one honest mention is the exit line under empty results, below. */}
            <Pressable onPress={() => router.push('/program-builder')} accessibilityRole="button" accessibilityLabel="Build your own program" style={[styles.buildCta, styles.hidden]}>
              <View style={styles.buildIcon}>
                <PlusIcon color={flColor.bronze300} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Build Your Own</Text>
                <Text style={styles.rowSub}>Design a program around your lifts.</Text>
              </View>
              <ChevronRightIcon size={18} color={flColor.bronze400} />
            </Pressable>

            {/* Family filter */}
            <View>
              <Text style={styles.filterLabel}>Family</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {families.map((f) => (
                  <FamilyChip key={f} label={f} active={family === f} onPress={() => setFamily(f)} />
                ))}
              </ScrollView>
            </View>

            {/* Recommended Next — real catalog */}
            <View>
              <Text style={styles.recTitle}>Recommended Next</Text>
              <Text style={styles.recBlurb}>
                {myActive
                  ? `Something to follow ${myActive.name}.`
                  : 'A curated starting point for your next chapter.'}
              </Text>
              <View style={styles.stackTight}>
                {discover.map((p) => (
                  <CompactProgramCard key={p.id} program={p} onOpen={() => void openCatalogProgram(p)} />
                ))}
                {discover.length === 0 ? (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>No programs in this family yet.</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Start Training — the `+`'s sheet (`openStart` in the .dc): today's session, a freestyle strength
          log, distance-activity logging ("Log a Run" → run/walk/ride/row/swim with miles), and building a
          program. "Train with others" still needs the social plumbing, so it stays absent. */}
      <BottomSheet open={startOpen} onClose={() => setStartOpen(false)} title="Start Training">
        <View style={styles.stackTight}>
          {todayLabel ? (
            <Pressable onPress={() => void startToday()} accessibilityRole="button" accessibilityLabel={`Start today's workout — ${todayLabel}`} style={styles.libRow}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Today’s Workout</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{todayLabel}</Text>
              </View>
              <ChevronRightIcon size={18} color={flColor.bronze400} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => void startFreestyle()}
            accessibilityRole="button"
            accessibilityLabel="Start a freestyle workout"
            style={styles.libRow}
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Freestyle Workout</Text>
              <Text style={styles.rowSub}>A one-off. Log whatever you train.</Text>
            </View>
            <ChevronRightIcon size={18} color={flColor.bronze400} />
          </Pressable>
          <Pressable
            onPress={() => {
              setStartOpen(false);
              router.push('/log-activity');
            }}
            accessibilityRole="button"
            accessibilityLabel="Log a run"
            style={styles.libRow}
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Log a Run</Text>
              <Text style={styles.rowSub}>Record a run, walk, ride, row, or swim — with distance.</Text>
            </View>
            <ChevronRightIcon size={18} color={flColor.bronze400} />
          </Pressable>
          <Pressable
            onPress={() => {
              setStartOpen(false);
              router.push('/program-builder');
            }}
            accessibilityRole="button"
            accessibilityLabel="Build a program"
            style={styles.libRow}
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Build a Program</Text>
              <Text style={styles.rowSub}>Design your own week, day by day.</Text>
            </View>
            <ChevronRightIcon size={18} color={flColor.bronze400} />
          </Pressable>
        </View>
      </BottomSheet>

      <ScreenTour screenKey="workouts" />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local presentational pieces
// ─────────────────────────────────────────────────────────────────────────────

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.segment, active ? styles.segmentActive : null]}
    >
      {active ? (
        <LinearGradient
          colors={flGradient.bronzeFill.colors}
          locations={flGradient.bronzeFill.locations}
          start={flGradient.bronzeFill.start}
          end={flGradient.bronzeFill.end}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : styles.segmentTextIdle]}>{label}</Text>
    </Pressable>
  );
}


function CompactProgramCard({ program, onOpen }: { program: Program; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${program.name}`} style={styles.compactCard}>
      <View style={styles.compactBody}>
        <Text style={styles.compactName} numberOfLines={1}>
          {program.name}
        </Text>
        <Text style={styles.compactMeta} numberOfLines={1}>
          {compactMeta(program)}
        </Text>
      </View>
      <Pill tone="muted" size="sm">
        {program.difficulty}
      </Pill>
    </Pressable>
  );
}

/** One athlete-authored program: name, lifecycle, shape. Taps through to the existing Program Detail. */
function SavedProgramRow({ program, onPress }: { program: SavedProgram; onPress: () => void }) {
  const { pill } = viewForState(program.state, true);
  const perWeek = sessionsPerWeek(program.structure);
  const isActive = program.state === 'active';
  const isRetired = program.state === 'ended_early' || program.state === 'graduated';

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${program.name}, ${pill}`} style={styles.libRow}>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, isRetired && styles.rowTitleRetired]} numberOfLines={1}>
          {program.name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {program.structure.weeks} wk · {perWeek}/wk
        </Text>
      </View>
      <View style={[styles.statePill, isActive && styles.statePillActive]}>
        <Text style={[styles.statePillText, isActive && styles.statePillTextActive]}>{pill}</Text>
      </View>
      <ChevronRightIcon size={18} color={flColor.bronze400} />
    </Pressable>
  );
}

/** Authoring, rendered as the last row of the section holding what it authors. */
function CreateRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.createRow, pressed ? styles.createRowPressed : null]}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round">
        <Path d="M12 5v14M5 12h14" />
      </Svg>
      <Text style={styles.createRowText}>{label}</Text>
    </Pressable>
  );
}

function LibraryRow({ title, sub, icon, onPress }: { title: string; sub: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={styles.libRow}>
      <View style={styles.libIcon}>{icon}</View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <ChevronRightIcon size={18} color={flColor.bronze400} />
    </Pressable>
  );
}

function FamilyChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}>{label}</Text>
    </Pressable>
  );
}

// ── inline glyphs (Forged DNA: square caps / miter joins on structural marks) ──
function PlusIcon({ color = flColor.bronze400 }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter">
      <Path d="M12 6v12M6 12h12" />
    </Svg>
  );
}
function TemplatesIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M4 6h16M4 12h16M4 18h10" />
    </Svg>
  );
}
function DumbbellIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </Svg>
  );
}
function HistoryIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <Path d="M3 4v4h4" />
      <Path d="M12 8v4l3 2" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  hidden: { display: 'none' },
  createRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  createRowPressed: { opacity: 0.88, borderColor: flColor.bronzeBorder },
  createRowText: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
  root: { flex: 1 },
  barTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: flColor.cream100,
  },
  startBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.round,
  },

  // segmented control
  segWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  segTrack: {
    flexDirection: 'row',
    gap: 5,
    padding: 5,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.base,
  },
  segment: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentActive: {
    borderColor: flColor.bronzeBorder,
    boxShadow: flShadow.card,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  segmentTextActive: {
    color: flColor.cream100,
    textShadowColor: 'rgba(8,5,2,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  segmentTextIdle: {
    color: flColor.gray400,
  },

  // scroll
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 40,
  },
  stack: { gap: 28 },
  stackTight: { gap: 10 },
  sectionBody: { marginTop: 12 },

  // active hero card
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.base,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    gap: 14,
    boxShadow: flShadow.missionCard,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroTitleWrap: { flex: 1, minWidth: 0, gap: 4 },
  heroName: {
    fontFamily: flFont.display,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
    color: flColor.cream100,
  },
  heroMeta: { fontSize: 13, color: flColor.gray400 },
  heroProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroProgressBar: { flex: 1 },
  heroPct: {
    fontSize: 12,
    fontWeight: '700',
    color: flColor.bronze300,
    fontVariant: ['tabular-nums'],
  },
  heroWorkoutLabel: { fontSize: 12, color: flColor.gray600 },
  heroNextRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  diamond: {
    width: 5,
    height: 5,
    transform: [{ rotate: '45deg' }],
    backgroundColor: flColor.bronze400,
  },
  heroNext: { flex: 1, fontSize: 12.5, color: flColor.bronze400 },

  // empty state
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.bronzeBorder,
    borderRadius: flRadius.xl,
    paddingVertical: 30,
    paddingHorizontal: 22,
    alignItems: 'center',
    backgroundColor: flColor.bronzeTint,
  },
  emptyTitle: {
    fontFamily: flFont.display,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: flColor.cream100,
  },
  emptySub: { marginTop: 7, fontSize: 13.5, color: flColor.gray400 },

  // library / build rows
  libRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.xl,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
  },
  libIcon: {
    width: 38,
    height: 38,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  rowTitleRetired: { color: flColor.gray400 },
  statePill: {
    flexShrink: 0,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  statePillActive: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  statePillText: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  statePillTextActive: { color: flColor.bronze300 },
  rowSub: { marginTop: 1, fontSize: 12.5, color: flColor.gray400 },
  buildCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.bronzeBorder,
    borderRadius: flRadius.xl,
    backgroundColor: flColor.bronzeTint,
  },
  buildIcon: {
    width: 38,
    height: 38,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // family filter
  filterLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.gray600,
    marginBottom: 10,
  },
  chips: { gap: 8, paddingRight: 4 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: flRadius.pill,
    borderWidth: 1,
  },
  chipActive: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipIdle: { borderColor: flColor.charcoal600, backgroundColor: 'transparent' },
  chipText: { fontSize: 12.5, fontWeight: '600' },
  chipTextActive: { color: flColor.bronze300 },
  chipTextIdle: { color: flColor.gray400 },

  // recommended
  recTitle: {
    fontFamily: flFont.display,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: flColor.cream100,
    marginBottom: 4,
  },
  recBlurb: { fontSize: 13, lineHeight: 20, color: flColor.gray400, marginBottom: 14 },

  // compact card
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
  },
  compactBody: { flex: 1, minWidth: 0, gap: 2 },
  compactName: { fontSize: 15, fontWeight: '600', lineHeight: 18, color: flColor.cream100 },
  compactMeta: { fontSize: 12, color: flColor.gray400 },

  noResults: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.lg,
    alignItems: 'center',
  },
  noResultsText: { fontSize: 13, color: flColor.gray600 },
});
