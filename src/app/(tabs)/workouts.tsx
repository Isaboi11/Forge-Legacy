import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { Pill } from '@/components/forge/composites/Pill';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { getActiveProgram, getPrograms } from '@/domain/training/active-program';
import type { Program } from '@/domain/training/schema';

/**
 * Workouts tab root (plural) — W-2 Program Browse / Programs Catalog.
 * Source of truth: the design handoff "Forge Programs Catalog.dc.html".
 *
 * Two tabs: "My Programs" (what you own + train today) and "Discover" (find
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
function activeMeta(p: Program): string {
  const { freq, weeks } = freqAndWeeks(p);
  if (!weeks) return p.family;
  const wk = p.progress ? Math.min(weeks, Math.floor(p.progress.completed / Math.max(1, freq)) + 1) : 1;
  return `${p.family} · Week ${wk} of ${weeks}`;
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

  const { active, catalog, families } = useMemo(() => {
    const programs = getPrograms();
    const active = getActiveProgram();
    // "Recommended Next" pool = the real catalog minus whatever is already active.
    const catalog = programs.filter((p) => p.state !== 'active');
    const families = ['All', ...Array.from(new Set(programs.map((p) => p.family)))];
    return { active, catalog, families };
  }, []);

  const discover = useMemo(
    () => (family === 'All' ? catalog : catalog.filter((p) => p.family === family)),
    [family, catalog],
  );

  const startToday = () => {
    if (!active?.nextWorkout) return;
    startWorkout(active.nextWorkout.name);
    router.push('/workout');
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />

      <AppBar
        title={<Text style={styles.barTitle}>Workouts</Text>}
        actions={
          <Pressable
            onPress={startToday}
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
          <Segment label="My Programs" active={tab === 'mine'} onPress={() => setTab('mine')} />
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
                {active ? (
                  <ActiveProgramCard program={active} onOpen={() => {}} />
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>Forge Your Next Legacy</Text>
                    <Text style={styles.emptySub}>Start a program, or browse Discover.</Text>
                  </View>
                )}
              </View>
            </View>

            {/* LIBRARY — platform-level resources */}
            <View>
              <SectionHeader label="Library" />
              <View style={[styles.sectionBody, styles.stackTight]}>
                <LibraryRow
                  title="Your Templates"
                  sub="Reusable workouts you can start any time."
                  icon={<TemplatesIcon />}
                  onPress={() => {}}
                />
                <LibraryRow
                  title="Exercise Library"
                  sub="Browse every exercise and create your own."
                  icon={<DumbbellIcon />}
                  onPress={() => {}}
                />
                <LibraryRow
                  title="Activity History"
                  sub="Every session you’ve logged, month by month."
                  icon={<HistoryIcon />}
                  onPress={() => {}}
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.stack}>
            {/* Build Your Own — primary creation CTA */}
            <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Build your own program" style={styles.buildCta}>
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
                {active
                  ? `Chosen to build on your ${active.family.toLowerCase()} work.`
                  : 'A curated starting point for your next chapter.'}
              </Text>
              <View style={styles.stackTight}>
                {discover.map((p) => (
                  <CompactProgramCard key={p.id} program={p} onOpen={() => {}} />
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

function ActiveProgramCard({ program, onOpen }: { program: Program; onOpen: () => void }) {
  const pct = program.progress ? Math.round((program.progress.completed / program.progress.total) * 100) : 0;
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${program.name}`} style={styles.heroCard}>
      <LinearGradient
        colors={flGradient.missionCardWash.colors}
        locations={flGradient.missionCardWash.locations}
        start={flGradient.missionCardWash.start}
        end={flGradient.missionCardWash.end}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroTopRow}>
        <View style={styles.heroTitleWrap}>
          <Text style={styles.heroName}>{program.name}</Text>
          <Text style={styles.heroMeta} numberOfLines={1}>
            {activeMeta(program)}
          </Text>
        </View>
        <Pill tone="bronze" size="sm">
          Active
        </Pill>
      </View>

      {program.progress ? (
        <View style={styles.heroProgressRow}>
          <View style={styles.heroProgressBar}>
            <ProgressBar value={program.progress.completed} max={program.progress.total} height={6} label={`${pct}% complete`} />
          </View>
          <Text style={styles.heroPct}>{pct}%</Text>
        </View>
      ) : null}

      {program.progress ? (
        <Text style={styles.heroWorkoutLabel}>
          Workout {program.progress.completed} of {program.progress.total}
        </Text>
      ) : null}

      {program.nextWorkout ? (
        <View style={styles.heroNextRow}>
          <View style={styles.diamond} />
          <Text style={styles.heroNext} numberOfLines={1}>
            Next · {program.nextWorkout.name}
          </Text>
        </View>
      ) : null}
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
