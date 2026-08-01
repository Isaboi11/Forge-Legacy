import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { EquipIcon } from '@/components/forge/EquipIcon';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { writeExerciseInbox, type PickedExercise } from '@/lib/exercise-inbox';
import { CONDITIONING } from '@/domain/workout/conditioning';
import { fetchHomeGym } from '@/data/home-gym-live';
import { canDoExercise } from '@/domain/home-gym/equipment';
import { getGearOnly, setGearOnly } from '@/lib/gear-filter';
import { writeBuilderInbox, type BuilderSection } from '@/lib/builder-inbox';
import { addFavorite, fetchFavoriteKeys, fetchRecentExerciseKeys, removeFavorite } from '@/data/exercise-prefs-live';
import { useQuery } from '@/lib/useQuery';
import {
  buildSections,
  canonicalName,
  DIFFS,
  EMPTY_FILTERS,
  EQUIP_FILTER_GROUPS,
  EXERCISE_CATEGORIES,
  filterCount,
  filtersActive,
  itemByKey,
  MUSCLE_FILTER_GROUPS,
  PICKER_DB,
  type Difficulty,
  type ExerciseCategoryKey,
  type PickerFilters,
  type PickerItem,
} from '@/domain/exercise-picker/data';

function toPicked(x: PickerItem): PickedExercise {
  return { catalogKey: x.key, name: x.name, equip: x.equip, muscles: x.muscles, type: x.modality };
}

/**
 * The three runs, pinned above the catalog rather than inside it.
 *
 * NOT in `PICKER_DB`: the six browse categories are LOCKED (`Exercise-Library-Wireframe-Spec-W21` §5),
 * the catalog is invariant-tested to come wholly from `exercises.json` and to be name-sorted, and a run
 * has no muscle map, pattern or difficulty because it is a different KIND of exercise. Adding a seventh
 * category to make the code fit would be amending a governed decision from the wrong end. They are
 * offered here, in the same list and through the same round-trip, without disturbing any of that.
 */
const CONDITIONING_ROWS: PickerItem[] = CONDITIONING.map((c) => ({
  key: `conditioning:${c.key}`,
  name: c.name,
  cat: 'FULL_BODY',
  equipId: 'none',
  equip: c.detail,
  equipClass: 'Bodyweight',
  muscleIds: [],
  muscles: [],
  primaryMuscleIds: [],
  difficulty: 'Beginner',
  pattern: 'Locomotion',
  modality: 'cardio',
  aliases: [],
  environments: [],
})) as PickerItem[];

/** Catalog first, then the pinned runs — so a conditioning key resolves everywhere a catalog one does. */
const resolveKey = (k: string): PickerItem | undefined =>
  itemByKey(k) ?? CONDITIONING_ROWS.find((c) => c.key === k);

/**
 * W-23 Exercise Picker (`Forge Exercise Picker.dc.html`). Three modes off the route params:
 * `mode=add` (multi-select → append to the live workout), `mode=replace` (single-select → swap the
 * exercise at `targetIdx`, via a persistence choice + an undo window), or `mode=builder` (multi-select →
 * append to one week/day/section of the Program Builder draft, the design's `#o=builder` entry). The first
 * two hand back through the exercise-inbox (drained by the Active Workout); `builder` hands back through
 * the builder-inbox (drained by the Program Builder), since the two round-trips must not consume each
 * other's payload.
 *
 * Data is the REAL 794-exercise catalog (see domain/exercise-picker/data + catalog-core for the mapping
 * onto the 6 locked browse categories). Deferred vs the `.dc`: the row ⓘ → Exercise Detail (W-22), the
 * "just this / this + future" scope writing differently (both commit the same today).
 *
 * MY EXERCISES is real: bookmarks come from `exercise_favorites` (0020) and recents from the athlete's
 * own logged `workout_exercises`. Both also rank results — the catalog carries no popularity data, so
 * these personal signals are used instead of an invented "most common" ordering.
 */
export default function ExercisePickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    ex?: string;
    targetIdx?: string;
    vary?: string;
    week?: string;
    day?: string;
    section?: string;
  }>();
  const isBuilder = params.mode === 'builder';
  const isReplace = !isBuilder && params.mode !== 'add';
  const replacingName = params.ex ? canonicalName(params.ex) : null;
  const targetIdx = params.targetIdx != null ? Number(params.targetIdx) : -1;

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null); // replace: single key
  const [picked, setPicked] = useState<string[]>([]); // add: many keys
  const [applied, setApplied] = useState<PickerFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<PickerFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [persistOpen, setPersistOpen] = useState(false);
  const [toast, setToast] = useState<{ to: string } | null>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // id → display label, so an applied-filter chip can name itself.
  const labelFor = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of MUSCLE_FILTER_GROUPS) for (const x of g.muscles) m.set(x.id, x.name);
    for (const g of EQUIP_FILTER_GROUPS) for (const x of g.equipment) m.set(x.id, x.name);
    for (const c of EXERCISE_CATEGORIES) m.set(c.key, c.label);
    return m;
  }, []);

  // The athlete's own signals — bookmarked first, then what they've actually logged.
  const { data: favData, refetch: refetchFavorites } = useQuery(fetchFavoriteKeys, []);
  const { data: recentData } = useQuery(() => fetchRecentExerciseKeys(8), []);
  const [favOverride, setFavOverride] = useState<Record<string, boolean>>({});
  const favorites = useMemo(() => {
    const base = favData ?? [];
    const kept = base.filter((k) => favOverride[k] !== false);
    const added = Object.keys(favOverride).filter((k) => favOverride[k] && !base.includes(k));
    return [...added, ...kept];
  }, [favData, favOverride]);
  const isFavorite = (key: string) => favOverride[key] ?? (favData ?? []).includes(key);

  /** Long-press toggles the bookmark (EX-003-D4: the heart is long-press only, never a stray tap). */
  const toggleFavorite = (key: string) => {
    const next = !isFavorite(key);
    setFavOverride((o) => ({ ...o, [key]: next })); // optimistic: the list must not jump under a long press
    void (next ? addFavorite(key) : removeFavorite(key)).then(() => refetchFavorites());
  };

  /**
   * THE GEAR GATE.
   *
   * `canDoExercise` has existed, fully tested, since the Home Gym profile shipped — and nothing called
   * it. So an athlete told the app they own dumbbells and a bench, then got all 794 exercises anyway,
   * most of which they cannot do.
   *
   * `null` means the profile was NEVER SET UP, which is not the same as owning nothing: filtering on it
   * would cut the catalog to bodyweight for someone who simply hasn't answered yet. So the gate only
   * engages once there is an answer to gate on.
   */
  const { data: ownedGear } = useQuery(fetchHomeGym, []);
  const { data: storedGearOnly } = useQuery(getGearOnly, []);
  const [gearOverride, setGearOverride] = useState<boolean | null>(null);
  const hasGymProfile = ownedGear != null;
  // Default ON once a profile exists — that is the whole point — but the athlete's own choice wins and
  // persists, because "My Home Gym" is what you own at HOME and you may be standing in a commercial gym.
  const gearOnly = hasGymProfile && (gearOverride ?? storedGearOnly ?? true);

  const pool = useMemo(
    () => (gearOnly && ownedGear ? PICKER_DB.filter((x) => canDoExercise({ key: x.key, equipId: x.equipId }, ownedGear)) : PICKER_DB),
    [gearOnly, ownedGear],
  );
  const hiddenByGear = PICKER_DB.length - pool.length;

  const toggleGearOnly = () => {
    const next = !gearOnly;
    setGearOverride(next);
    void setGearOnly(next);
  };

  const sections = buildSections({
    search,
    filters: applied,
    isReplace,
    replacingName,
    favorites,
    recents: recentData ?? [],
    pool,
  });
  const hasFilters = filtersActive(applied);

  const togglePicked = (key: string) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  const toggleDraft = <K extends keyof PickerFilters>(group: K, v: string) =>
    setDraft((d) => {
      const list = d[group] as string[];
      const next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
      return { ...d, [group]: next };
    });

  const removeApplied = (group: keyof PickerFilters, v: string) =>
    setApplied((a) => ({ ...a, [group]: (a[group] as string[]).filter((x) => x !== v) }));

  /** Tapping a browse category applies it as an implicit filter chip (W23-D7). */
  const openCategory = (key: ExerciseCategoryKey) => setApplied((a) => ({ ...a, cat: [key] }));

  const openFilter = () => {
    setDraft(applied);
    setFilterOpen(true);
  };
  const applyFilter = () => {
    setApplied(draft);
    setFilterOpen(false);
  };

  const commitReplace = () => {
    if (selected == null || targetIdx < 0) return;
    const item = resolveKey(selected);
    if (!item) return;
    setPersistOpen(false);
    setToast({ to: item.name });
    navTimer.current = setTimeout(() => {
      void writeExerciseInbox({ kind: 'replace', targetIdx, item: toPicked(item) });
      router.back();
    }, 2800);
  };
  const undo = () => {
    if (navTimer.current) clearTimeout(navTimer.current);
    navTimer.current = null;
    setToast(null);
  };

  const onConfirm = () => {
    if (isReplace) {
      if (selected != null) setPersistOpen(true);
    } else {
      const items = picked.map(resolveKey).filter((x): x is PickerItem => Boolean(x));
      if (!items.length) return;
      if (isBuilder) {
        void writeBuilderInbox({
          vary: params.vary === '1',
          week: Number(params.week ?? 0) || 0,
          day: Number(params.day ?? 0) || 0,
          section: (params.section as BuilderSection | undefined) ?? 'main',
          items: items.map(toPicked),
        });
      } else {
        void writeExerciseInbox({ kind: 'add', items: items.map(toPicked) });
      }
      router.back();
    }
  };

  const confirmDisabled = isReplace ? selected == null : picked.length === 0;
  const confirmLabel = isReplace
    ? selected != null
      ? `Replace with ${itemByKey(selected)?.name ?? ''}`
      : 'Select an exercise'
    : picked.length
      ? `Add ${picked.length} ${picked.length === 1 ? 'exercise' : 'exercises'}`
      : 'Select exercises';

  const appliedChips: { group: keyof PickerFilters; value: string; label: string }[] = [
    ...applied.cat.map((v) => ({ group: 'cat' as const, value: v, label: labelFor.get(v) ?? v })),
    ...applied.equip.map((v) => ({ group: 'equip' as const, value: v, label: labelFor.get(v) ?? v })),
    ...applied.muscle.map((v) => ({ group: 'muscle' as const, value: v, label: labelFor.get(v) ?? v })),
    ...applied.diff.map((v) => ({ group: 'diff' as const, value: v, label: v })),
  ];

  const renderRow = (x: PickerItem) => {
    const sel = isReplace ? selected === x.key : picked.includes(x.key);
    const fav = isFavorite(x.key);
    return (
      <Pressable
        key={x.key}
        onPress={() => (isReplace ? setSelected(x.key) : togglePicked(x.key))}
        onLongPress={() => toggleFavorite(x.key)}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityState={{ selected: sel }}
        accessibilityLabel={`${x.name}${fav ? ', bookmarked' : ''}. Long press to ${fav ? 'remove the bookmark' : 'bookmark'}.`}
        style={[styles.row, sel && styles.rowSel]}
      >
        <View style={styles.rowIcon}>
          <EquipIcon equip={x.equipId} />
        </View>
        <View style={styles.rowText}>
          <View style={styles.rowNameLine}>
            {fav ? <Text style={styles.favMark}>★</Text> : null}
            <Text style={styles.rowName} numberOfLines={1}>{x.name}</Text>
          </View>
          <Text style={styles.rowSub} numberOfLines={1}>
            {x.equip}
            {x.muscles.length ? ` · ${x.muscles.slice(0, 3).join(', ')}` : ''}
          </Text>
        </View>
        {sel ? (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 6L9 17l-5-5" />
          </Svg>
        ) : (
          <View style={styles.emptyMark} />
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(6,7,8,0.34)' }} />
      <AppBar
        title={isReplace ? 'Replace Exercise' : 'Add Exercise'}
        serif
        onBack={() => router.back()}
        actions={
          <Pressable onPress={openFilter} accessibilityRole="button" accessibilityLabel="Filter" hitSlop={6} style={styles.filterBtn}>
            <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={hasFilters ? flColor.bronze300 : flColor.gray400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 5h18l-7 8v5l-4 2v-7z" />
            </Svg>
            {hasFilters ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{appliedChips.length}</Text>
              </View>
            ) : null}
          </Pressable>
        }
      />

      {/* sub-header: replacing banner + search + applied chips */}
      <View style={styles.subHeader}>
        {isReplace && replacingName ? (
          <View style={styles.banner}>
            <View style={styles.bannerDiamond} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerKicker}>Replacing</Text>
              <Text style={styles.bannerName} numberOfLines={1}>{replacingName}</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.searchWrap}>
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={styles.searchIcon}>
            <Circle cx={11} cy={11} r={7} />
            <Path d="M20 20l-3.2-3.2" />
          </Svg>
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises"
            placeholderTextColor={flColor.gray600}
            accessibilityLabel="Search exercises"
          />
        </View>
        {/* The gate is never silent. When it is on it says so and says how many it is holding back, and
            one tap sees everything — so a short list is always explained, never just short. */}
        {hasGymProfile ? (
          <View style={styles.chipRow}>
            <Pressable
              onPress={toggleGearOnly}
              accessibilityRole="button"
              accessibilityState={{ selected: gearOnly }}
              accessibilityLabel={gearOnly ? `Showing only what you own. ${hiddenByGear} exercises hidden. Tap to show everything.` : 'Showing every exercise. Tap to narrow to your own equipment.'}
              style={[styles.appliedChip, !gearOnly && styles.gearChipOff]}
            >
              <Text style={[styles.appliedChipText, !gearOnly && styles.gearChipTextOff]}>
                {gearOnly ? `My gear · ${hiddenByGear} hidden` : 'Showing everything'}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {/* Never set up. Saying nothing here was a dead end of my own making: the screen KNOWS it could
            cut 500 exercises and just didn't mention it. `router.back()` from the editor lands here
            again, so setting it up costs one detour and no lost place. */}
        {ownedGear === null ? (
          <Pressable
            onPress={() => router.push('/home-gym')}
            accessibilityRole="button"
            accessibilityLabel="Set up your home gym to filter this list to what you own"
            style={({ pressed }) => [styles.gearPrompt, pressed && styles.gearPromptPressed]}
          >
            <Text style={styles.gearPromptText}>
              Tell us what equipment you have and this list only shows what you can actually do.
            </Text>
            <Text style={styles.gearPromptCta}>Set up my gym</Text>
          </Pressable>
        ) : null}
        {hasFilters ? (
          <View style={styles.chipRow}>
            {appliedChips.map((c) => (
              <Pressable key={`${c.group}-${c.value}`} onPress={() => removeApplied(c.group, c.value)} accessibilityRole="button" accessibilityLabel={`Remove ${c.label}`} style={styles.appliedChip}>
                <Text style={styles.appliedChipText}>{c.label}</Text>
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.4} strokeLinecap="round">
                  <Path d="M18 6L6 18M6 6l12 12" />
                </Svg>
              </Pressable>
            ))}
            <Pressable onPress={() => setApplied(EMPTY_FILTERS)} accessibilityRole="button" accessibilityLabel="Clear filters" style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* body */}
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {sections.hasResults ? (
          <>
            {sections.best.length ? (
              <View style={styles.section}>
                <SectionHeader label="Best replacements" />
                <Text style={styles.bestSub}>Closest functional matches to {replacingName}</Text>
                <View style={styles.rows}>{sections.best.map(renderRow)}</View>
              </View>
            ) : null}

            {sections.browsing && sections.mine.length ? (
              <View style={styles.section}>
                <SectionHeader label="My exercises" />
                <Text style={styles.bestSub}>Bookmarked, and what you&rsquo;ve trained recently</Text>
                <View style={styles.rows}>{sections.mine.map(renderRow)}</View>
              </View>
            ) : null}

            {sections.browsing ? (
              <>
                <SectionHeader label="All exercises" />
                <Text style={styles.bestSub}>{sections.total} exercises · tap a category to narrow</Text>
                <View style={styles.rows}>
                  {sections.categoryRows.map((c) => (
                    <Pressable
                      key={c.key}
                      onPress={() => openCategory(c.key)}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.label}, ${c.count} exercises`}
                      style={styles.catRow}
                    >
                      <Text style={styles.catRowLabel} numberOfLines={1}>{c.label}</Text>
                      <Text style={styles.catRowCount}>{c.count}</Text>
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M9 6l6 6-6 6" />
                      </Svg>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.resultsHead}>
                  <SectionHeader label={search.trim() ? 'Results' : 'Exercises'} />
                  <Text style={styles.resultsCount}>{sections.results.length}</Text>
                </View>
                <View style={styles.rows}>{sections.results.map(renderRow)}</View>
              </>
            )}
            {/* BELOW the catalog, not above it. Pinning three runs over 794 lifts made every athlete
                adding a bench press scroll past cardio first — paying on the common case to help the
                rare one. Search is where finding them actually matters, and it still surfaces them
                instantly. */}
            {(() => {
              const q = search.trim().toLowerCase();
              const rows = q ? CONDITIONING_ROWS.filter((c) => c.name.toLowerCase().includes(q)) : CONDITIONING_ROWS;
              return rows.length ? (
                <View style={styles.section}>
                  <SectionHeader label="Running & Cardio" />
                  <Text style={styles.bestSub}>Timed, and measured in distance rather than reps</Text>
                  <View style={styles.rows}>{rows.map(renderRow)}</View>
                </View>
              ) : null;
            })()}
          </>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx={11} cy={11} r={7} />
                <Path d="M20 20l-3.2-3.2" />
              </Svg>
            </View>
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptyBody}>Nothing fits that search and filter. Try clearing a filter or a different term.</Text>
          </View>
        )}
      </ScrollView>

      {/* footer confirm */}
      <View style={styles.footer}>
        <Button variant="primary" fullWidth disabled={confirmDisabled} onPress={onConfirm} accessibilityLabel={confirmLabel}>
          {confirmLabel}
        </Button>
      </View>

      {/* filter sheet */}
      {filterOpen ? (
        <View style={styles.sheetWrap}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setFilterOpen(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Filter</Text>
            <ScrollView style={styles.filterScroll} showsVerticalScrollIndicator={false}>
              <FilterGroup
                label="Category"
                options={EXERCISE_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
                active={draft.cat}
                onToggle={(v) => toggleDraft('cat', v)}
              />
              {MUSCLE_FILTER_GROUPS.map((g) => (
                <FilterGroup
                  key={g.region}
                  label={`Muscle · ${g.region}`}
                  options={g.muscles.map((m) => ({ value: m.id, label: m.name }))}
                  active={draft.muscle}
                  onToggle={(v) => toggleDraft('muscle', v)}
                />
              ))}
              {EQUIP_FILTER_GROUPS.map((g) => (
                <FilterGroup
                  key={g.category}
                  label={`Equipment · ${g.category}`}
                  options={g.equipment.map((e) => ({ value: e.id, label: e.name }))}
                  active={draft.equip}
                  onToggle={(v) => toggleDraft('equip', v)}
                />
              ))}
              <FilterGroup
                label="Difficulty"
                options={DIFFS.map((d) => ({ value: d, label: d }))}
                active={draft.diff}
                onToggle={(v) => toggleDraft('diff', v as Difficulty)}
              />
            </ScrollView>
            <View style={styles.filterActions}>
              <Button variant="secondary" onPress={() => setDraft(EMPTY_FILTERS)} accessibilityLabel="Reset filters">
                Reset
              </Button>
              <View style={styles.filterApply}>
                <Button variant="primary" fullWidth onPress={applyFilter} accessibilityLabel="Apply filters">
                  {filtersActive(draft) ? `Apply · ${filterCount(draft)}` : 'Apply'}
                </Button>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {/* persistence choice (replace) */}
      {persistOpen ? (
        <View style={styles.sheetWrap}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setPersistOpen(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Apply replacement</Text>
            <Text style={styles.persistBlurb}>
              Swap {replacingName} for {selected != null ? itemByKey(selected)?.name : ''}.
            </Text>
            <Pressable onPress={commitReplace} accessibilityRole="button" accessibilityLabel="Just this session" style={styles.persistRow}>
              <View style={styles.persistIcon}>
                <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  <Circle cx={12} cy={12} r={9} />
                  <Path d="M12 7v5l3 2" />
                </Svg>
              </View>
              <View style={styles.persistText}>
                <Text style={styles.persistName}>Just this session</Text>
                <Text style={styles.persistSub}>Your program stays as written.</Text>
              </View>
            </Pressable>
            <Pressable onPress={commitReplace} accessibilityRole="button" accessibilityLabel="This and future workouts" style={[styles.persistRow, styles.persistRowHi]}>
              <View style={styles.persistIcon}>
                <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M5 4h14v16l-7-4-7 4z" />
                </Svg>
              </View>
              <View style={styles.persistText}>
                <Text style={styles.persistName}>This &amp; future workouts</Text>
                <Text style={styles.persistSub}>Updates this exercise in the program.</Text>
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* commit toast + undo */}
      {toast ? (
        <View style={styles.toast}>
          <View style={styles.toastCheck}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20 6L9 17l-5-5" />
            </Svg>
          </View>
          <Text style={styles.toastText} numberOfLines={2}>
            {replacingName} replaced with {toast.to}
          </Text>
          <Pressable onPress={undo} accessibilityRole="button" accessibilityLabel="Undo" style={styles.undoBtn}>
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{label}</Text>
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
  active: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterGroupLabel}>{label}</Text>
      <View style={styles.filterChips}>
        {options.map((o) => {
          const on = active.includes(o.value);
          return (
            <Pressable key={o.value} onPress={() => onToggle(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={o.label} style={[styles.filterChip, on && styles.filterChipOn]}>
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
  filterBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  filterBadge: { position: 'absolute', top: 3, right: 2, minWidth: 15, height: 15, paddingHorizontal: 3, borderRadius: 999, backgroundColor: flColor.bronze400, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 9, fontWeight: '800', color: '#1A1206' },

  subHeader: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal900 },
  bannerDiamond: { width: 9, height: 9, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  bannerText: { flex: 1, minWidth: 0, gap: 1 },
  bannerKicker: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },
  bannerName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  searchWrap: { position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 13, zIndex: 1 },
  search: { borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, borderRadius: flRadius.md, paddingVertical: 11, paddingLeft: 40, paddingRight: 12, fontFamily: flFont.sans, fontSize: 14, color: flColor.cream100 },
  chipRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  appliedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingLeft: 11, paddingRight: 8, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  gearPrompt: { marginTop: 10, padding: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, gap: 6 },
  gearPromptPressed: { opacity: 0.85 },
  gearPromptText: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  gearPromptCta: { fontSize: 12.5, fontWeight: '700', color: flColor.bronze300 },
  gearChipOff: { borderColor: flColor.charcoal600, backgroundColor: 'transparent' },
  gearChipTextOff: { color: flColor.gray400 },
  appliedChipText: { fontSize: 11, fontWeight: '600', color: flColor.bronze300 },
  clearBtn: { paddingVertical: 5, paddingHorizontal: 10 },
  clearText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },

  body: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 28 },
  section: { marginBottom: 22 },
  sectionHeader: { paddingHorizontal: 2, paddingBottom: 10 },
  sectionHeaderText: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  bestSub: { paddingHorizontal: 2, paddingBottom: 11, marginTop: -4, fontSize: 11.5, color: flColor.gray600 },
  rows: { gap: 8 },
  resultsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  resultsCount: { fontSize: 11.5, color: flColor.gray600, paddingBottom: 10 },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  catRowLabel: { flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  catRowCount: { fontSize: 12, fontWeight: '600', color: flColor.bronze400, fontVariant: ['tabular-nums'] },

  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 11, paddingHorizontal: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  rowSel: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  rowIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  favMark: { fontSize: 12, color: flColor.bronze300 },
  rowName: { flexShrink: 1, fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  rowSub: { fontSize: 11.5, color: flColor.gray600 },
  emptyMark: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: flColor.charcoal500 },

  empty: { paddingVertical: 56, paddingHorizontal: 24, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { fontSize: 13, lineHeight: 19, color: flColor.gray400, textAlign: 'center', maxWidth: 230 },

  footer: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18, borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: flColor.charcoal900 },

  // sheets
  sheetWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,9,12,0.62)' },
  sheet: { backgroundColor: flColor.charcoal900, borderTopLeftRadius: flRadius.xl, borderTopRightRadius: flRadius.xl, borderTopWidth: 1, borderColor: flColor.charcoal600, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 24, gap: 14, maxHeight: '84%' },
  sheetTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  filterScroll: { maxHeight: 380 },
  filterGroup: { marginBottom: 20 },
  filterGroupLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 11 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: 'transparent' },
  filterChipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  filterChipText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  filterChipTextOn: { color: flColor.bronze300 },
  filterActions: { flexDirection: 'row', gap: 10 },
  filterApply: { flex: 1 },

  persistBlurb: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  persistRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  persistRowHi: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  persistIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center' },
  persistText: { flex: 1, minWidth: 0, gap: 2 },
  persistName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  persistSub: { fontSize: 12, color: flColor.gray600 },

  toast: { position: 'absolute', left: 14, right: 14, bottom: 92, zIndex: 40, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 15, borderRadius: flRadius.lg, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorder, boxShadow: flShadow.elevated },
  toastCheck: { width: 26, height: 26, borderRadius: 13, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorder, alignItems: 'center', justifyContent: 'center' },
  toastText: { flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 17, color: flColor.cream100 },
  undoBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: flRadius.sm, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  undoText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: flColor.bronze300 },
});
