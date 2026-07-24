import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { EquipIcon } from '@/components/forge/EquipIcon';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { addFavorite, fetchFavoriteKeys, fetchRecentExerciseKeys, removeFavorite } from '@/data/exercise-prefs-live';
import { fetchHomeGym } from '@/data/home-gym-live';
import { ENVIRONMENTS } from '@/domain/exercise-picker/catalog-core';
import { DIFFS, EQUIP_FILTER_GROUPS, EXERCISE_CATEGORIES, PICKER_DB } from '@/domain/exercise-picker/data';
import {
  buildLibrary,
  categoryCards,
  EMPTY_LIBRARY_FILTERS,
  filterCount,
  filtersActive,
  isFlatMode,
  liveCount,
  preview,
  type LibraryFilters,
  type LibraryView,
} from '@/domain/exercise-library/hub-core';
import { useQuery } from '@/lib/useQuery';

/**
 * W-21 Exercise Library (`Forge Exercise Library.dc.html`) — browse, search and filter the whole
 * catalog. Two modes off one state: a HUB of shortcuts (Favourites, Recently Used, category grid) and a
 * FLAT list entered by searching, filtering, or drilling in.
 *
 * Real throughout: the 772 offered exercises, the 6 locked browse categories, difficulty and equipment
 * straight from the catalog, favourites from `exercise_favorites`, and recents from the athlete's own
 * logged workouts. Rows open Exercise Detail (W-22).
 *
 * DEFERRED vs the `.dc` (omitted, not faked):
 *  · Custom Exercises section + Create — Exercise-001 is locked but has no table; there is nothing to
 *    list and nowhere to save.
 *  · Movement type (Compound/Isolation) — no such field on any of the 797 records, same as the Picker.
 *
 * "Where you train" → "Home Gym" resolves against the athlete's OWN equipment profile once they've built
 * one (`profiles.home_gym_equipment`, 0021); picking it without a profile routes to the editor first and
 * comes back with the filter applied. Without a profile it still works, generically, off each
 * equipment's `environments`.
 */

function Glyph({ d, size = 16, color, width = 1.9 }: { d: string; size?: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

const STAR = 'M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z';
const CHEVRON = 'M9 6l6 6-6 6';

export default function ExerciseLibraryScreen() {
  const router = useRouter();

  // `?home=1` is the Home Gym Editor's return handshake: the athlete asked for their own gym before
  // they had one, built it, and comes back with the filter already applied rather than having to
  // re-open the sheet and tap it again.
  const { home } = useLocalSearchParams<{ home?: string }>();
  const seeded: LibraryFilters = home === '1' ? { ...EMPTY_LIBRARY_FILTERS, env: ['Home Gym'] } : EMPTY_LIBRARY_FILTERS;

  const [query, setQuery] = useState('');
  const [view, setView] = useState<LibraryView>(null);
  const [filters, setFilters] = useState<LibraryFilters>(seeded);
  const [draft, setDraft] = useState<LibraryFilters>(seeded);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: homeGym } = useQuery(fetchHomeGym, []);
  const { data: favData, refetch: refetchFavorites } = useQuery(fetchFavoriteKeys, []);
  const { data: recentData } = useQuery(() => fetchRecentExerciseKeys(12), []);
  const [favOverride, setFavOverride] = useState<Record<string, boolean>>({});

  const favorites = useMemo(() => {
    const base = favData ?? [];
    const kept = base.filter((k) => favOverride[k] !== false);
    const added = Object.keys(favOverride).filter((k) => favOverride[k] && !base.includes(k));
    return [...added, ...kept];
  }, [favData, favOverride]);
  const isFav = (key: string) => favOverride[key] ?? (favData ?? []).includes(key);

  const toggleFav = (key: string) => {
    const next = !isFav(key);
    setFavOverride((o) => ({ ...o, [key]: next })); // optimistic — the row must not jump under the tap
    void (next ? addFavorite(key) : removeFavorite(key)).then(() => refetchFavorites());
  };

  const recents = recentData ?? [];
  const state = { query, filters, view };
  const flat = isFlatMode(state);
  const categoryLabel = (k: string) => EXERCISE_CATEGORIES.find((c) => c.key === k)?.label ?? '';
  const result = buildLibrary(PICKER_DB, state, { favorites, recents, categoryLabel: (k) => categoryLabel(k), homeGym });
  const cards = useMemo(() => categoryCards(PICKER_DB, EXERCISE_CATEGORIES), []);
  const active = filtersActive(filters);

  const equipLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of EQUIP_FILTER_GROUPS) for (const e of g.equipment) m.set(e.id, e.name);
    return m;
  }, []);

  /** Context-sensitive back: leave the drill → clear search/filters → leave the screen. */
  const onBack = () => {
    if (view) return setView(null);
    if (query.trim() || active) {
      setQuery('');
      setFilters(EMPTY_LIBRARY_FILTERS);
      return;
    }
    router.back();
  };

  const toggleDraft = (group: keyof LibraryFilters, v: string) =>
    setDraft((d) => {
      const list = d[group] as string[];
      return { ...d, [group]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] };
    });

  const chips: { group: keyof LibraryFilters; value: string; label: string }[] = [
    ...filters.cat.map((v) => ({ group: 'cat' as const, value: v, label: categoryLabel(v) })),
    ...filters.env.map((v) => ({ group: 'env' as const, value: v, label: v })),
    ...filters.equip.map((v) => ({ group: 'equip' as const, value: v, label: equipLabel.get(v) ?? v })),
    ...filters.diff.map((v) => ({ group: 'diff' as const, value: v, label: v })),
  ];

  const openEx = (key: string) => router.push({ pathname: '/exercise/[id]', params: { id: key } });

  const Row = ({ x }: { x: (typeof PICKER_DB)[number] }) => {
    const fav = isFav(x.key);
    return (
      <Pressable onPress={() => openEx(x.key)} accessibilityRole="button" accessibilityLabel={x.name} style={styles.row}>
        <View style={styles.rowIcon}>
          <EquipIcon equip={x.equipId} size={19} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowName} numberOfLines={1}>
            {x.name}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {x.equip} · {x.difficulty}
          </Text>
        </View>
        <Pressable
          onPress={() => toggleFav(x.key)}
          accessibilityRole="button"
          accessibilityState={{ selected: fav }}
          accessibilityLabel={fav ? `Remove ${x.name} from favorites` : `Add ${x.name} to favorites`}
          hitSlop={8}
          style={styles.starBtn}
        >
          <Svg width={17} height={17} viewBox="0 0 24 24" fill={fav ? flColor.bronze300 : 'none'} stroke={fav ? flColor.bronze300 : flColor.charcoal500} strokeWidth={1.8} strokeLinejoin="round">
            <Path d={STAR} />
          </Svg>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(6,7,8,0.30)' }} />
      <AppBar title={flat && !query.trim() && view ? result.title : 'Exercise Library'} serif onBack={onBack} />

      {/* search + filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.9} strokeLinecap="round" style={styles.searchIcon}>
            <Circle cx={11} cy={11} r={7} />
            <Path d="M20 20l-3.2-3.2" />
          </Svg>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              if (t.trim()) setView(null); // searching leaves any drill — one narrowing at a time
            }}
            placeholder="Search exercises"
            placeholderTextColor={flColor.gray600}
            accessibilityLabel="Search exercises"
          />
        </View>
        <Pressable
          onPress={() => {
            setDraft(filters);
            setSheetOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Filter"
          style={[styles.filterBtn, active && styles.filterBtnOn]}
        >
          <Glyph d="M3 5h18l-7 8v5l-4 2v-7z" size={20} color={active ? flColor.bronze300 : flColor.gray400} />
          {active ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount(filters)}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {chips.length ? (
        <View style={styles.chipRow}>
          {chips.map((c) => (
            <Pressable
              key={`${c.group}-${c.value}`}
              onPress={() => setFilters((f) => ({ ...f, [c.group]: (f[c.group] as string[]).filter((x) => x !== c.value) }))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${c.label}`}
              style={styles.chip}
            >
              <Text style={styles.chipText}>{c.label}</Text>
              <Glyph d="M18 6L6 18M6 6l12 12" size={11} color={flColor.bronze300} width={2.4} />
            </Pressable>
          ))}
          <Pressable onPress={() => setFilters(EMPTY_LIBRARY_FILTERS)} accessibilityRole="button" accessibilityLabel="Clear filters" style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {flat ? (
          result.rows.length ? (
            <>
              <View style={styles.listHead}>
                <Text style={styles.sectionTitle}>{result.title}</Text>
                <Text style={styles.count}>
                  {result.rows.length} {result.rows.length === 1 ? 'exercise' : 'exercises'}
                </Text>
              </View>
              <View style={styles.rows}>
                {result.rows.map((x) => (
                  <Row key={x.key} x={x} />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing found</Text>
              <Text style={styles.emptyBody}>Try a different name or muscle, or clear a filter.</Text>
            </View>
          )
        ) : (
          <>
            {favorites.length ? (
              <HubSection
                title="Favorites"
                onViewAll={favorites.length > 3 ? () => setView({ type: 'favorites' }) : undefined}
              >
                {preview(PICKER_DB, favorites).map((x) => (
                  <Row key={x.key} x={x} />
                ))}
              </HubSection>
            ) : null}

            {recents.length ? (
              <HubSection title="Recently Used" onViewAll={recents.length > 3 ? () => setView({ type: 'recent' }) : undefined}>
                {preview(PICKER_DB, recents).map((x) => (
                  <Row key={x.key} x={x} />
                ))}
              </HubSection>
            ) : null}

            <Text style={styles.sectionTitle}>Browse</Text>
            <View style={styles.grid}>
              {cards.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => setView({ type: 'category', id: c.key })}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.label}, ${c.count} exercises`}
                  style={styles.card}
                >
                  <Text style={styles.cardName}>{c.label}</Text>
                  <Text style={styles.cardCount}>{c.count} exercises</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* filter sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filter">
        <View style={styles.sheet}>
          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            <FilterGroup
              label="Where you train"
              options={ENVIRONMENTS.map((e) => ({ value: e, label: e }))}
              active={draft.env}
              onToggle={(v) => {
                // Asking for "Home Gym" without having built one is a question the app can't answer
                // yet — so send them to build it, and come back with the filter already on.
                if (v === 'Home Gym' && homeGym == null && !draft.env.includes(v)) {
                  setSheetOpen(false);
                  router.push('/home-gym?return=%2Fexercise-library%3Fhome%3D1');
                  return;
                }
                toggleDraft('env', v);
              }}
            />
            {homeGym != null ? (
              <Pressable
                onPress={() => {
                  setSheetOpen(false);
                  router.push('/home-gym?return=%2Fexercise-library%3Fhome%3D1');
                }}
                accessibilityRole="button"
                accessibilityLabel="Edit my home gym"
                style={styles.gymNote}
              >
                <Text style={styles.gymNoteText}>
                  {homeGym.length === 0
                    ? 'Your home gym is empty — bodyweight only.'
                    : `Home Gym means your ${homeGym.length} item${homeGym.length === 1 ? '' : 's'}.`}
                </Text>
                <Text style={styles.gymNoteLink}>Edit</Text>
              </Pressable>
            ) : null}
            <FilterGroup
              label="Category"
              options={EXERCISE_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
              active={draft.cat}
              onToggle={(v) => toggleDraft('cat', v)}
            />
            <FilterGroup
              label="Difficulty"
              options={DIFFS.map((d) => ({ value: d, label: d }))}
              active={draft.diff}
              onToggle={(v) => toggleDraft('diff', v)}
            />
            {EQUIP_FILTER_GROUPS.map((g) => (
              <FilterGroup
                key={g.category}
                label={`Equipment · ${g.category}`}
                options={g.equipment.map((e) => ({ value: e.id, label: e.name }))}
                active={draft.equip}
                onToggle={(v) => toggleDraft('equip', v)}
              />
            ))}
          </ScrollView>
          <View style={styles.sheetActions}>
            <Button variant="secondary" onPress={() => setDraft(EMPTY_LIBRARY_FILTERS)} accessibilityLabel="Reset filters">
              Reset
            </Button>
            <View style={styles.applyWrap}>
              <Button
                variant="primary"
                fullWidth
                onPress={() => {
                  setFilters(draft);
                  setSheetOpen(false);
                }}
                accessibilityLabel="Apply filters"
              >
                {`Show ${liveCount(PICKER_DB, draft, homeGym)} exercises`}
              </Button>
            </View>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

function HubSection({ title, onViewAll, children }: { title: string; onViewAll?: () => void; children: ReactNode }) {
  return (
    <View style={styles.hubSection}>
      <View style={styles.listHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onViewAll ? (
          <Pressable onPress={onViewAll} accessibilityRole="button" accessibilityLabel={`View all ${title}`} style={styles.viewAll}>
            <Text style={styles.viewAllText}>View all</Text>
            <Glyph d={CHEVRON} size={13} color={flColor.bronze400} width={2} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

function FilterGroup({
  label,
  options,
  active,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  active: readonly string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterGroupLabel}>{label}</Text>
      <View style={styles.filterChips}>
        {options.map((o) => {
          const on = active.includes(o.value);
          return (
            <Pressable
              key={o.value}
              onPress={() => onToggle(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.label}
              style={[styles.filterChip, on && styles.filterChipOn]}
            >
              <Text style={[styles.filterChipText, on && styles.filterChipTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingBottom: 12 },
  searchWrap: { flex: 1, position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 13, zIndex: 1 },
  search: {
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    borderRadius: flRadius.md,
    paddingVertical: 11,
    paddingLeft: 40,
    paddingRight: 12,
    fontFamily: flFont.sans,
    fontSize: 14,
    color: flColor.cream100,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    borderRadius: 999,
    backgroundColor: flColor.bronze400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 9, fontWeight: '800', color: '#1A1206' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, paddingHorizontal: 18, paddingBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingLeft: 11,
    paddingRight: 8,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: flColor.bronze300 },
  clearBtn: { paddingVertical: 5, paddingHorizontal: 10 },
  clearText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },

  gymNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: -8,
    marginBottom: 16,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  gymNoteText: { flex: 1, fontSize: 11.5, color: flColor.gray400 },
  gymNoteLink: { fontSize: 11.5, fontWeight: '700', color: flColor.bronze400 },

  body: { paddingHorizontal: 18, paddingBottom: 32 },
  hubSection: { marginBottom: 26 },
  listHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  count: { fontSize: 11.5, color: flColor.gray600 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  viewAllText: { fontSize: 12, fontWeight: '600', color: flColor.bronze400 },

  rows: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.surfaceRecessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  rowMeta: { fontSize: 11.5, color: flColor.gray600 },
  starBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47.6%',
    flexGrow: 1,
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.borderInset,
    gap: 5,
  },
  cardName: { fontFamily: flFont.display, fontSize: 15.5, fontWeight: '600', color: flColor.cream100 },
  cardCount: { fontSize: 11.5, color: flColor.bronze400 },

  empty: { paddingVertical: 56, alignItems: 'center', gap: 8 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { fontSize: 13, color: flColor.gray400, textAlign: 'center' },

  sheet: { gap: 14 },
  sheetScroll: { maxHeight: 380 },
  filterGroup: { marginBottom: 18 },
  filterGroupLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    marginBottom: 10,
  },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  filterChipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  filterChipText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  filterChipTextOn: { color: flColor.bronze300 },
  sheetActions: { flexDirection: 'row', gap: 10 },
  applyWrap: { flex: 1 },
});
