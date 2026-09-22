import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius, flShadow } from '@/constants/foundation';
import { fetchMyPrograms, type SavedProgram } from '@/data/programs-live';
import { isSealed, sessionsPerWeek, shelvePrograms, viewForState } from '@/domain/program/progress-core';
import { useQuery } from '@/lib/useQuery';

/**
 * ══ YOUR PROGRAMS — the athlete's own program library (Workouts restructure, PO 2026-09-22) ══
 *
 * The Workouts hub is a hub now: one "Programs" card under YOUR PROGRAMS, and this is where it goes. It
 * holds everything the hub used to list inline — the same four shelves, the same rows, the same taps —
 * so nothing an athlete could reach before is further than one more tap away.
 *
 *   active  — the one in flight. Also the hub's anchor; listed here so the library is complete.
 *   planned — queued, not started (0017 `state = 'future'`).
 *   built   — authored or imported: no catalogue source. "Built, imported" in the card's own words.
 *   past    — sealed runs of Forge programs, kept readable (Amendment-001 §6).
 *
 * ⚠ SHELVING IS `shelvePrograms`, NOT A SECOND COPY OF IT. The hub and this screen used to disagree
 * only in where they drew the rows; the rule for which row goes where lives in `progress-core` and both
 * read it.
 *
 * Refetched on focus, for the reason the hub's own read carries: a program just built, planned, started
 * or ended on another screen must be here when the athlete comes back.
 */
export default function ProgramsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, refetch, settled } = useQuery(fetchMyPrograms, []);
  useFocusEffect(useCallback(() => refetch(), [refetch]));
  const mine = useMemo(() => data ?? [], [data]);
  const { active, planned, built, past } = useMemo(() => shelvePrograms(mine), [mine]);
  /** The design collapses Planned to a digest at 2+, so a queue never outweighs the program in flight. */
  const [plannedExpanded, setPlannedExpanded] = useState(false);
  const plannedCollapsed = planned.length >= 2 && !plannedExpanded;

  const open = (p: SavedProgram) => router.push({ pathname: '/program/[id]', params: { id: p.id } });
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/workouts'));
  const empty = settled && !active && planned.length === 0 && built.length === 0 && past.length === 0;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Your Programs" onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.lede}>Programs you’ve built, imported, or saved.</Text>

        <View style={styles.stack}>
          {active ? (
            <View>
              <SectionHeader label="Active" />
              <ProgramRow program={active} onPress={() => open(active)} />
            </View>
          ) : null}

          {planned.length > 0 ? (
            <View>
              <SectionHeader
                label="Planned"
                action={plannedCollapsed ? 'View all' : undefined}
                onAction={() => setPlannedExpanded(true)}
              />
              <View style={styles.stackTight}>
                {plannedCollapsed ? (
                  <PlannedDigest programs={planned} onOpen={open} onExpand={() => setPlannedExpanded(true)} />
                ) : (
                  planned.map((p) => <ProgramRow key={p.id} program={p} onPress={() => open(p)} />)
                )}
              </View>
            </View>
          ) : null}

          {built.length > 0 ? (
            <View>
              <SectionHeader label="Built & Imported" />
              <View style={styles.stackTight}>
                {built.map((p) => (
                  <ProgramRow key={p.id} program={p} onPress={() => open(p)} />
                ))}
              </View>
            </View>
          ) : null}

          {past.length > 0 ? (
            <View>
              <SectionHeader label="Past Programs" />
              <View style={styles.stackTight}>
                {past.map((p) => (
                  <ProgramRow key={p.id} program={p} onPress={() => open(p)} />
                ))}
              </View>
            </View>
          ) : null}

          {/* Nothing yet: say so plainly and hand over the two real ways to have something here. No
              invented rows — a library that is empty looks empty. */}
          {empty ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No programs yet</Text>
              <Text style={styles.emptyBody}>Build one around your goal, or find a Forge program in Discover.</Text>
            </View>
          ) : null}

          {/* Creation beside what it creates — the same guided lane as Create New's "Build Program". */}
          <Pressable
            onPress={() => router.push('/program-guided')}
            accessibilityRole="button"
            accessibilityLabel="Build a program"
            style={({ pressed }) => [styles.createRow, pressed ? styles.createRowPressed : null]}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round">
              <Path d="M12 5v14M5 12h14" />
            </Svg>
            <Text style={styles.createRowText}>Build a Program</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/** One of the athlete's programs: name, lifecycle, shape. Taps through to Program Detail. */
function ProgramRow({ program, onPress }: { program: SavedProgram; onPress: () => void }) {
  const { pill } = viewForState(program.state, true);
  const isActive = program.state === 'active';
  const isRetired = isSealed(program.state);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${program.name}, ${pill}`} style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, isRetired && styles.rowTitleRetired]} numberOfLines={1}>
          {program.name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {program.structure.weeks} wk · {sessionsPerWeek(program.structure)}/wk
        </Text>
      </View>
      <View style={[styles.statePill, isActive && styles.statePillActive]}>
        <Text style={[styles.statePillText, isActive && styles.statePillTextActive]}>{pill}</Text>
      </View>
      <ChevronRightIcon size={18} color={flColor.bronze400} />
    </Pressable>
  );
}

/** Planned, at 2+ — one card instead of a stack. Smaller, not shorter: it still names and opens each. */
function PlannedDigest({ programs, onOpen, onExpand }: { programs: SavedProgram[]; onOpen: (p: SavedProgram) => void; onExpand: () => void }) {
  return (
    <View style={styles.digest}>
      <Text style={styles.digestCount}>
        {programs.length} planned {programs.length === 1 ? 'program' : 'programs'}
      </Text>
      {programs.map((p) => (
        <Pressable key={p.id} onPress={() => onOpen(p)} accessibilityRole="button" accessibilityLabel={`${p.name}, planned`} style={styles.digestRow}>
          <View style={styles.digestMark} />
          <View style={styles.rowBody}>
            <Text style={styles.digestName} numberOfLines={1}>
              {p.name}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {p.structure.weeks} wk · {sessionsPerWeek(p.structure)}/wk
            </Text>
          </View>
          <ChevronRightIcon size={16} color={flColor.gray600} />
        </Pressable>
      ))}
      <Pressable onPress={onExpand} accessibilityRole="button" accessibilityLabel="View all planned programs" style={styles.digestAll}>
        <Text style={styles.digestAllText}>View all</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 18 },
  lede: { marginBottom: 22, fontSize: 13.5, lineHeight: 19.5, color: flColor.gray400 },
  stack: { gap: 28 },
  stackTight: { gap: 10 },
  row: {
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
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  rowTitleRetired: { color: flColor.gray400 },
  rowSub: { marginTop: 1, fontSize: 12.5, color: flColor.gray400 },
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
  digest: {
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.xl,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
    overflow: 'hidden',
  },
  digestCount: {
    paddingTop: 13,
    paddingHorizontal: 16,
    paddingBottom: 6,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.gray600,
  },
  digestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
  },
  digestMark: { width: 5, height: 5, flexShrink: 0, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  digestName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  digestAll: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  digestAllText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },
  empty: { gap: 6, paddingVertical: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { fontSize: 13.5, lineHeight: 19.5, color: flColor.gray400 },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  createRowPressed: { opacity: 0.88, borderColor: flColor.bronzeBorder },
  createRowText: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
