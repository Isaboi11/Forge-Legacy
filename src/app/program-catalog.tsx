import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ProgramCatalogRow } from '@/components/forge/compositions/ProgramCatalogRow';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchMyPrograms } from '@/data/programs-live';
import { getPrograms } from '@/domain/training/active-program';
import { useCoachDoor } from '@/hooks/useCoachDoor';
import { useQuery } from '@/lib/useQuery';

/**
 * ══ THE PROGRAM CATALOG — every Forge program, filterable by focus (Workouts restructure, 2026-09-22) ══
 *
 * Discover used to BE this list: a Family chip row over every program, rendered inline. Discover is now
 * a hub — Single Sessions, Browse by Focus, a short Recommended list, Coach Holt — and the full shelf
 * lives here, reached from any focus chip (`?family=Strength`) or either "See all" (no param).
 *
 * ⚠ ONE CATALOG, NOT ONE PER FAMILY. The focus arrives as a param and stays a chip filter on this screen,
 * so "Strength" from Discover and "All → Strength" here are the same view. No per-family screens.
 *
 * ⚠ BROWSING NEVER ADOPTS (`browse-is-not-adopt.test.mjs` lists this file). A tap opens Program Detail
 * on the DEFINITION slug; adoption waits for that screen's Start. A program the athlete already holds
 * live opens THEIR row instead, so they land on real progress rather than a preview.
 *
 * ⚠ AND IT SUBTRACTS NOTHING. A planned or active program stays on the shelf, marked — planning a
 * program is not consuming it (the history is in the old Discover note, now in `workouts.tsx`'s git log).
 */
export default function ProgramCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openCoach } = useCoachDoor();
  const { family: familyParam } = useLocalSearchParams<{ family?: string }>();

  const catalog = useMemo(() => getPrograms(), []);
  const families = useMemo(() => ['All', ...Array.from(new Set(catalog.map((p) => p.family)))], [catalog]);
  const [family, setFamily] = useState<string>(familyParam && families.includes(familyParam) ? familyParam : 'All');
  const shown = useMemo(() => (family === 'All' ? catalog : catalog.filter((p) => p.family === family)), [family, catalog]);

  const { data, refetch } = useQuery(fetchMyPrograms, []);
  useFocusEffect(useCallback(() => refetch(), [refetch]));
  const mine = useMemo(() => data ?? [], [data]);
  const liveFor = (id: string) => mine.find((m) => m.sourceDefinitionId === id && (m.state === 'future' || m.state === 'active'));

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/workouts'));

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Programs" onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.filterLabel}>Focus</Text>
        {/* Wraps rather than scrolling sideways — six chips fit a 360pt phone in two lines. */}
        <View style={styles.chips}>
          {families.map((f) => (
            <Pressable
              key={f}
              onPress={() => setFamily(f)}
              accessibilityRole="button"
              accessibilityState={{ selected: family === f }}
              style={[styles.chip, family === f ? styles.chipActive : styles.chipIdle]}
            >
              <Text style={[styles.chipText, family === f ? styles.chipTextActive : styles.chipTextIdle]}>{f}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.list}>
          {shown.map((p) => {
            const live = liveFor(p.id);
            return (
              <ProgramCatalogRow
                key={p.id}
                program={p}
                held={live?.state ?? null}
                onPress={() => router.push({ pathname: '/program/[id]', params: { id: live?.id ?? p.id } })}
              />
            );
          })}
          {shown.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No programs in this focus yet.</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => openCoach('recommend')}
          accessibilityRole="button"
          accessibilityLabel="Not sure which program to choose? Ask Coach Holt"
          style={({ pressed }) => [styles.helpMe, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.helpMeText}>
            Not sure which one? <Text style={styles.helpMeLink}>Ask Coach Holt.</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 18 },
  filterLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.gray600,
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: flRadius.pill, borderWidth: 1 },
  chipActive: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipIdle: { borderColor: flColor.charcoal600, backgroundColor: 'transparent' },
  chipText: { fontSize: 12.5, fontWeight: '600' },
  chipTextActive: { color: flColor.bronze300 },
  chipTextIdle: { color: flColor.gray400 },
  list: { marginTop: 22, gap: 10 },
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
  helpMe: { marginTop: 22, paddingVertical: 6 },
  helpMeText: { fontSize: 13, color: flColor.gray600 },
  helpMeLink: { color: flColor.bronze400, fontWeight: '600' },
});
