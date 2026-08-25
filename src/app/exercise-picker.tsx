import { useCallback, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { EquipIcon } from '@/components/forge/EquipIcon';
import { ExercisePoster } from '@/components/forge/ExercisePoster';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_GUTTER, useBarBottom } from '@/lib/screen-insets';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { writeExerciseInbox, type PickedExercise } from '@/lib/exercise-inbox';
import { fetchHomeGym } from '@/data/home-gym-live';
import { canDoExercise, HOME_GYM_EQUIPMENT } from '@/domain/home-gym/equipment';
import { dismissGearPrompt, getGearOnly, getGearPromptDismissed, setGearOnly } from '@/lib/gear-filter';
import { writeBuilderInbox, type BuilderSection } from '@/lib/builder-inbox';
import { addFavorite, fetchFavoriteKeys, fetchRecentExerciseKeys, removeFavorite } from '@/data/exercise-prefs-live';
import { createCustomExercise, fetchCustomExercise, fetchCustomExercises } from '@/data/custom-exercises-live';
import {
  customKey,
  customToPickerItem,
  emptyDraft,
  isCustomKey,
  type CustomExercise,
} from '@/domain/exercise-picker/custom-core';
import { takeCreatedCustom } from '@/lib/custom-exercise-inbox';
import { useToast } from '@/hooks/useCeremony';
import { usePersist } from '@/hooks/usePersist';
import { errorMessage, useQuery } from '@/lib/useQuery';
import {
  CONDITIONING_ROWS,
  buildSections,
  canonicalName,
  DIFFS,
  EMPTY_FILTERS,
  EQUIP_FILTER_GROUPS,
  EXERCISE_CATEGORIES,
  filterCount,
  filtersActive,
  itemByKey,
  matchesTokens,
  searchFields,
  searchTokens,
  MUSCLE_FILTER_GROUPS,
  PICKER_DB,
  type Difficulty,
  type ExerciseCategoryKey,
  type PickerFilters,
  type PickerItem,
} from '@/domain/exercise-picker/data';

function toPicked(x: PickerItem): PickedExercise {
  return {
    catalogKey: x.key,
    name: x.name,
    equip: x.equip,
    muscles: x.muscles,
    type: x.modality,
    /* ONLY for a custom row. A catalogue exercise's `unit` is read from `itemByKey` downstream, because
       the catalogue is the authority on what a movement is; a custom exercise is not in `PICKER_DB`, so
       the pick is the only thing that knows whether it draws a rep box or a countdown. See
       `exercise-inbox`. */
    ...(isCustomKey(x.key) ? { unit: x.unit } : null),
  };
}

/* Custom exercises store IDS, not labels (0128) — and their equipment ids come from the HOME GYM
   vocabulary, not the catalogue's, which is why this lookup is not `labelFor` below. */
const EQUIP_LABEL = new Map(HOME_GYM_EQUIPMENT.map((e) => [e.id, e.label] as const));
const MUSCLE_LABEL = new Map(MUSCLE_FILTER_GROUPS.flatMap((g) => g.muscles.map((m) => [m.id, m.name] as const)));
const toCustomItem = (c: CustomExercise): PickerItem =>
  customToPickerItem(c, {
    muscleName: (id) => MUSCLE_LABEL.get(id) ?? id,
    equipName: (id) => EQUIP_LABEL.get(id) ?? id,
  });

/**
 * The row that was just inserted, as it will read once the server is asked for it again.
 *
 * Everything the name-only path does not collect is what 0128's own column defaults store, so this is a
 * restatement of the row rather than a guess at it — and it exists only to cover the round trip between
 * the insert returning an id and the list being refetched.
 */
const draftCustom = (id: string, name: string, unit: 'reps' | 'time'): CustomExercise => ({
  id,
  name,
  category: null,
  equipment: [],
  primaryMuscles: [],
  secondaryMuscles: [],
  environments: [],
  notes: null,
  unit,
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
});

/**
 * The three runs, pinned above the catalog rather than inside it.
 *
 * NOT in `PICKER_DB`: the six browse categories are LOCKED (`Exercise-Library-Wireframe-Spec-W21` §5),
 * the catalog is invariant-tested to come wholly from `exercises.json` and to be name-sorted, and a run
 * has no muscle map, pattern or difficulty because it is a different KIND of exercise. Adding a seventh
 * category to make the code fit would be amending a governed decision from the wrong end. They are
 * offered here, in the same list and through the same round-trip, without disturbing any of that.
 */
// CONDITIONING_ROWS now lives in the picker domain — it is the CARDIO category's contents.

/**
 * W-23 Exercise Picker (`Forge Exercise Picker.dc.html`). Three modes off the route params:
 * `mode=add` (multi-select → append to the live workout), `mode=replace` (single-select → swap the
 * exercise at `targetIdx`, via a persistence choice + an undo window), or `mode=builder` (multi-select →
 * append to one week/day/section of the Program Builder draft, the design's `#o=builder` entry). The first
 * two hand back through the exercise-inbox (drained by the Active Workout); `builder` hands back through
 * the builder-inbox (drained by the Program Builder), since the two round-trips must not consume each
 * other's payload.
 *
 * Data is the REAL 809-exercise catalog (see domain/exercise-picker/data + catalog-core for the mapping
 * onto the 6 locked browse categories). Deferred vs the `.dc`: the row ⓘ → Exercise Detail (W-22), the
 * "just this / this + future" scope writing differently (both commit the same today).
 *
 * MY EXERCISES is real: bookmarks come from `exercise_favorites` (0020), recents from the athlete's own
 * logged `workout_exercises`, and the athlete's OWN exercises from `custom_exercises` (0128). Both
 * signals also rank results — the catalog carries no popularity data, so these personal signals are used
 * instead of an invented "most common" ordering.
 *
 * ══ THE CUSTOM EXERCISE THAT COULD BE CREATED AND NEVER FOUND AGAIN ══
 *
 * This screen wrote to `custom_exercises` and never read from it. Creating one mid-workout worked,
 * because `createInline` hands the new row STRAIGHT to the workout inbox without it ever passing through
 * the list — so it landed in the session and looked saved. It was saved. It was simply invisible from
 * then on: the pool was `PICKER_DB` alone, so the same exercise could not be found by search, did not
 * appear under My Exercises, and above all could not be put into a program, a week template or a
 * workout template, which all add exercises through this one screen in `builder` mode. `customToPickerItem`
 * and `mergeForSearch` had been written and unit-tested for exactly this and had no call site.
 */
export default function ExercisePickerScreen() {
  const persist = usePersist();
  const barBottom = useBarBottom();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    ex?: string;
    targetIdx?: string;
    vary?: string;
    week?: string;
    day?: string;
    section?: string;
    dest?: string;
  }>();
  const isBuilder = params.mode === 'builder';
  const isReplace = !isBuilder && params.mode !== 'add';
  const isAdd = !isBuilder && !isReplace;
  const replacingName = params.ex ? canonicalName(params.ex) : null;
  const targetIdx = params.targetIdx != null ? Number(params.targetIdx) : -1;

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null); // replace: single key
  const [picked, setPicked] = useState<string[]>([]); // add: many keys
  const [asSuperset, setAsSuperset] = useState(false); // add: group the picks into one block
  const [applied, setApplied] = useState<PickerFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<PickerFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [persistOpen, setPersistOpen] = useState(false);
  const [toast, setToast] = useState<{ to: string } | null>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Inline creation (W-28 §1.2 / §2.3): the name-only path, opened from the empty state with what the
     athlete already typed. The full form is `/custom-exercise`, one tap further on. */
  const [createOpen, setCreateOpen] = useState(false);
  const [createUnit, setCreateUnit] = useState<'reps' | 'time'>('reps');
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  // id → display label, so an applied-filter chip can name itself.
  const labelFor = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of MUSCLE_FILTER_GROUPS) for (const x of g.muscles) m.set(x.id, x.name);
    for (const g of EQUIP_FILTER_GROUPS) for (const x of g.equipment) m.set(x.id, x.name);
    for (const c of EXERCISE_CATEGORIES) m.set(c.key, c.label);
    return m;
  }, []);

  /**
   * The athlete's own exercises.
   *
   * Refetched on FOCUS, because the two ways to create one both leave this screen and come back: the
   * full form at `/custom-exercise`, and (from the Library) an exercise edited or deleted while this
   * picker sat underneath. `justCreated` covers the round trip in between — see `createInline`.
   */
  const { data: customData, refetch: refetchCustoms } = useQuery(fetchCustomExercises, []);
  const [justCreated, setJustCreated] = useState<PickerItem[]>([]);
  const customItems = useMemo(() => {
    const fetched = (customData ?? []).map(toCustomItem);
    const known = new Set(fetched.map((x) => x.key));
    return [...justCreated.filter((x) => !known.has(x.key)), ...fetched];
  }, [customData, justCreated]);

  /**
   * Tick a freshly-created exercise, however this screen is being used.
   *
   * ⚠ SELECTED, NOT COMMITTED — a delta from W-23 §15.4, which has the picker dismiss and hand the new
   * exercise straight back. That reads correctly for a single-select replace and would be destructive
   * here: `add` and `builder` are MULTI-select, and an athlete who ticked four lifts and then realised
   * the fifth was missing would have the four thrown away by the act of creating it.
   */
  const selectCreated = (key: string) => {
    if (isReplace) setSelected(key);
    else setPicked((p) => (p.includes(key) ? p : [...p, key]));
  };

  /**
   * Coming back from the full creator with the exercise it just made, already selected (W-23 §15.4).
   *
   * The row is fetched HERE rather than waited for: `refetchCustoms` is fire-and-forget, and selecting a
   * key before anything can resolve it means a fast Confirm silently drops the exercise the athlete just
   * spent a minute describing.
   */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const createdId = await takeCreatedCustom();
        refetchCustoms();
        if (!createdId || !alive) return;
        const ex = await fetchCustomExercise(createdId).catch(() => null);
        if (!alive || !ex) return;
        const item = toCustomItem(ex);
        setJustCreated((l) => (l.some((x) => x.key === item.key) ? l : [...l, item]));
        selectCreated(item.key);
      })();
      return () => {
        alive = false;
      };
      // `selectCreated` is stable for the life of the mount — it only reads route params.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetchCustoms]),
  );

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
    // The override wins over server truth for the life of the mount, so a silent failure never corrects.
    persist(() => (next ? addFavorite(key) : removeFavorite(key)), {
      onOk: () => refetchFavorites(),
      rollback: () => setFavOverride((o) => ({ ...o, [key]: !next })),
    });
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
  const { data: promptDismissed } = useQuery(getGearPromptDismissed, []);
  const [dismissedNow, setDismissedNow] = useState(false);
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

  /**
   * Catalog, then the pinned runs, then the athlete's own — so a key from any of the three resolves
   * everywhere a catalog one does.
   *
   * ⚠ THIS IS WHAT MAKES CONFIRM WORK. `onConfirm` turns the selected KEYS back into rows through here
   * and drops anything that fails to resolve, so a custom exercise that the list can show but this
   * cannot resolve would be silently discarded at the moment the athlete pressed the button.
   */
  const resolveKey = (k: string): PickerItem | undefined =>
    itemByKey(k) ?? CONDITIONING_ROWS.find((c) => c.key === k) ?? customItems.find((c) => c.key === k);

  const sections = buildSections({
    search,
    filters: applied,
    isReplace,
    replacingName,
    favorites,
    recents: recentData ?? [],
    pool,
    customs: customItems,
  });
  const hasFilters = filtersActive(applied);

  /*
   * ══ CONDITIONING IS MATCHED BEFORE THE SCREEN DECIDES IT FOUND NOTHING ══
   *
   * This used to be computed inline, INSIDE the `hasResults` branch — so a search that only a cardio
   * activity could answer fell into the "No matches" empty state and the section that held the answer
   * was never rendered. Five of the seven were unreachable that way: nothing in the visible catalogue
   * matches "elliptical", "stair climber", "swim", "ride" or "bike", because the 49 rows that used to
   * are hidden. Run, Walk and Row only ever appeared by luck — unrelated lifts ("row" hits 81) kept
   * the results non-empty for them.
   *
   * Matched on `searchFields`, not the name: token-AND over name + aliases + equipment, the same rule
   * the catalogue runs. That is what makes "bike" reach Ride and "treadmill" reach Run.
   *
   * ⚠ NOT rendered when the CARDIO chip is applied — `buildSections` widens the pool for that one
   * filter, so these same seven rows are already in `sections.results` and this would draw each twice.
   */
  const cardioRows = (() => {
    if (applied.cat.includes('CARDIO')) return [];
    const tokens = searchTokens(search);
    return tokens.length ? CONDITIONING_ROWS.filter((c) => matchesTokens(tokens, searchFields(c))) : CONDITIONING_ROWS;
  })();
  /** The screen has something to show if EITHER list does. */
  const hasAnything = sections.hasResults || cardioRows.length > 0;

/**
 * Choosing an exercise puts the keyboard away.
 *
 * ⚠ TYPING AND CHOOSING ARE TWO DIFFERENT MOVES and the keyboard used to survive both. You search, the
 * list narrows, you tap what you were looking for — and half the screen is still keyboard, hiding the
 * list you are now trying to read and the Confirm button you are trying to reach. The search field is
 * right there to bring it back, which is what makes dismissing it safe rather than presumptuous.
 *
 * On the tap, not on Confirm: by Confirm the screen is already closing and it would have made no
 * difference to anything.
 */
  const choose = (fn: () => void) => {
    Keyboard.dismiss();
    fn();
  };
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

  /**
   * Create the exercise the athlete just failed to find, and hand it straight back to whatever asked.
   *
   * ⚠ IT IS SENT ON, NOT MERELY SAVED. Creating an exercise mid-workout and being returned to an empty
   * search result would mean doing the search again to use the thing you just made — and this path is
   * reached from the Active Workout, standing at a machine. So it writes the row, wraps it in the same
   * `PickedExercise` shape any catalogue row uses, and puts it in the inbox: the workout appends it and
   * the athlete logs a set. `unit` rides along on the row, so a custom HOLD gets its countdown.
   *
   * ⚠ EXCEPT IN `builder`, WHERE IT IS SELECTED AND THE SCREEN STAYS. An author writing a program day is
   * ticking several exercises at once; committing on create would send this one and discard the rest. So
   * the new row joins the selection and the search clears, which is the same two-step the athlete is
   * already doing for every other exercise in the day.
   */
  const createInline = async () => {
    const name = search.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const id = await createCustomExercise({ ...emptyDraft(), name, unit: createUnit });
      const item: PickedExercise = {
        catalogKey: customKey(id),
        name,
        equip: 'Custom',
        muscles: [],
        type: 'Strength',
        unit: createUnit,
      };
      setCreateOpen(false);
      if (isBuilder) {
        /* Held locally as well as refetched: the key goes into `picked` now, and until the refetch lands
           there would otherwise be nothing for `resolveKey` to find — a Confirm inside that window would
           drop the exercise without saying so. */
        setJustCreated((l) => [...l, toCustomItem(draftCustom(id, name, createUnit))]);
        selectCreated(customKey(id));
        setSearch('');
        refetchCustoms();
        return;
      }
      if (isReplace) {
        if (targetIdx >= 0) await writeExerciseInbox({ kind: 'replace', targetIdx, item });
      } else {
        await writeExerciseInbox({ kind: 'add', items: [item] });
      }
      router.back();
    } catch (e) {
      setCreateOpen(false);
      showToast(errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  /** Open the full form (W-23 §15.1 entry 1). It writes the created id back to `custom-exercise-inbox`. */
  const openCreator = () => {
    Keyboard.dismiss();
    router.push({ pathname: '/custom-exercise', params: { returnTo: 'picker' } });
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
          // Which builder asked. Two authoring surfaces share this round-trip now, and each drains
          // only its own picks (see `builder-inbox`).
          dest: params.dest === 'workout' ? 'workout' : 'program',
          vary: params.vary === '1',
          week: Number(params.week ?? 0) || 0,
          day: Number(params.day ?? 0) || 0,
          section: (params.section as BuilderSection | undefined) ?? 'main',
          items: items.map(toPicked),
        });
      } else {
        void writeExerciseInbox({ kind: 'add', items: items.map(toPicked), group: supersetOn ? 'superset' : undefined });
      }
      router.back();
    }
  };

  /* DERIVED, not a second piece of state. Un-ticking back down to one exercise must not leave a
     stale "as a superset" flag armed behind a control that is no longer on screen — and deriving it
     avoids a setState-in-effect, which this repo's react-compiler lint treats as an error. */
  const supersetOn = isAdd && asSuperset && picked.length >= 2;

  const confirmDisabled = isReplace ? selected == null : picked.length === 0;
  const confirmLabel = isReplace
    ? selected != null
      ? `Replace with ${resolveKey(selected)?.name ?? ''}`
      : 'Select an exercise'
    : supersetOn
      ? `Add ${picked.length} exercises as a superset`
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
    const own = isCustomKey(x.key);
    return (
      <Pressable
        key={x.key}
        onPress={() => choose(() => (isReplace ? setSelected(x.key) : togglePicked(x.key)))}
        onLongPress={() => toggleFavorite(x.key)}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityState={{ selected: sel }}
        accessibilityLabel={`${x.name}${own ? ', your own exercise' : ''}${fav ? ', bookmarked' : ''}. Long press to ${fav ? 'remove the bookmark' : 'bookmark'}.`}
        style={[styles.row, sel && styles.rowSel]}
      >
        <View style={styles.rowIcon}>
          {/* No poster for an athlete's own exercise: the media bucket is keyed by CATALOGUE id, so a
              `custom:` key can only ever 404 — asking is a request that is guaranteed to fail. */}
          <ExercisePoster exerciseId={own ? null : x.key} radius={20} fallback={<EquipIcon equip={x.equipId} />} />
        </View>
        <View style={styles.rowText}>
          <View style={styles.rowNameLine}>
            {fav ? <Text style={styles.favMark}>★</Text> : null}
            <Text style={styles.rowName} numberOfLines={1}>{x.name}</Text>
          </View>
          {/* W-23 §10.4 — "Custom" leads the sub-line, so an athlete's own row is identifiable beside a
              catalogue one without a badge or an icon. `equip` already reads "Custom" when they named no
              equipment; when they did, the label would otherwise be the only thing there. */}
          <Text style={styles.rowSub} numberOfLines={1}>
            {own && x.equip !== 'Custom' ? `Custom · ${x.equip}` : x.equip}
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
        {ownedGear === null && !promptDismissed && !dismissedNow ? (
          <View style={styles.gearPrompt}>
            <Text style={styles.gearPromptText}>
              Training at home? Tell us your equipment and this list only shows what you can actually do.
            </Text>
            <View style={styles.gearPromptRow}>
              <Pressable
                onPress={() => router.push('/home-gym')}
                accessibilityRole="button"
                accessibilityLabel="Set up your home gym"
                style={({ pressed }) => [styles.gearPromptBtn, pressed && styles.gearPromptPressed]}
              >
                <Text style={styles.gearPromptCta}>Set up my gym</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setDismissedNow(true);
                  void dismissGearPrompt();
                }}
                accessibilityRole="button"
                accessibilityLabel="I train at a gym — stop showing this"
                style={({ pressed }) => [styles.gearPromptBtn, pressed && styles.gearPromptPressed]}
              >
                <Text style={styles.gearPromptDismiss}>I train at a gym</Text>
              </Pressable>
            </View>
          </View>
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
        {hasAnything ? (
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
                <Text style={styles.bestSub}>
                  {customItems.length
                    ? 'The ones you added, plus bookmarks and what you’ve trained recently'
                    : 'Bookmarked, and what you’ve trained recently'}
                </Text>
                <View style={styles.rows}>{sections.mine.map(renderRow)}</View>
                {/* The cap is never silent — see `MINE_CUSTOM_MAX`. */}
                {sections.customOverflow ? (
                  <Text style={styles.overflowNote}>
                    {sections.customOverflow} more of your own — search to find {sections.customOverflow === 1 ? 'it' : 'them'}.
                  </Text>
                ) : null}
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
            ) : sections.hasResults ? (
              <>
                <View style={styles.resultsHead}>
                  <SectionHeader label={search.trim() ? 'Results' : 'Exercises'} />
                  <Text style={styles.resultsCount}>{sections.results.length}</Text>
                </View>
                <View style={styles.rows}>{sections.results.map(renderRow)}</View>
              </>
            ) : null}
            {/* BELOW the catalog, not above it. Pinning three runs over 809 lifts made every athlete
                adding a bench press scroll past cardio first — paying on the common case to help the
                rare one. Search is where finding them actually matters, and it still surfaces them
                instantly. */}
            {cardioRows.length ? (
              <View style={styles.section}>
                <SectionHeader label="Running & Cardio" />
                <Text style={styles.bestSub}>Measured in distance and time, not sets and reps</Text>
                <View style={styles.rows}>{cardioRows.map(renderRow)}</View>
              </View>
            ) : null}

            {/* ══ ALWAYS AT THE BOTTOM OF THE LIST (W-23 §6, §15.1 entry 1) ══
                The quiet one. It is not for the athlete who searched and found nothing — the empty state
                below catches them, with their words already typed — but for the author building a program
                who knows in advance that their gym's machine is not in anybody's catalogue. Subtle
                because it must never compete with 809 exercises that ARE there; last because that is
                where you arrive having decided the list does not have it. The full form, not the
                name-only sheet: away from a live set there is time to say what the movement is, and it
                comes back with the new exercise already ticked. */}
            <Pressable
              onPress={openCreator}
              accessibilityRole="button"
              accessibilityLabel="Add your own exercise"
              style={({ pressed }) => [styles.ownRow, pressed ? styles.ownRowPressed : null]}
            >
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round">
                <Path d="M12 5v14M5 12h14" />
              </Svg>
              <Text style={styles.ownRowText}>Add your own exercise</Text>
            </Pressable>
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
            {/* ══ THE DEAD END BECOMES A DOOR ══
                "It isn't in the list" was previously the end of the road — and it is the exact moment
                the athlete knows what is missing AND has already typed its name. Offering creation here
                costs them one tap and no retyping. Name-only, per W-28 §1.2's "fastest creation path":
                a form in the middle of a workout is a form that gets abandoned.

                Now offered in `builder` too. It was withheld there only because the commit path behind it
                wrote to the WORKOUT inbox, which a program builder never drains — the pick would have
                vanished. `createInline` selects instead of committing in that mode, so the door opens. */}
            {search.trim() ? (
              <Pressable
                onPress={() => setCreateOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${search.trim()} as your own exercise`}
                style={({ pressed }) => [styles.createBtn, pressed ? styles.createBtnPressed : null]}
              >
                <Text style={styles.createBtnText}>Add “{search.trim()}” as your own</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={openCreator} accessibilityRole="button" accessibilityLabel="Add your own exercise with full details" style={styles.emptyLink}>
              <Text style={styles.emptyLinkText}>Or add one with muscles, equipment and notes</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* footer confirm */}
      <View style={[styles.footer, { paddingBottom: barBottom }]}>
        {/* SAY IT WHILE YOU PICK THEM.
            Building as you go, the ⋮ menu's "Superset with next exercise" means adding three lifts
            and then pairing them one at a time — restating a decision already made. Ticking them
            together is when the athlete knows. Appears only once there are two to pair. */}
        {isAdd && picked.length >= 2 ? (
          <Pressable
            onPress={() => setAsSuperset((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: supersetOn }}
            accessibilityLabel="Add these as a superset — alternate them, one rest at the end of the round"
            style={[styles.ssRow, supersetOn && styles.ssRowOn]}
          >
            <View style={[styles.ssBox, supersetOn && styles.ssBoxOn]}>
              {supersetOn ? (
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.charcoal900} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M4 12.5l5.2 5.2L20 7" />
                </Svg>
              ) : null}
            </View>
            <View style={styles.ssText}>
              <Text style={[styles.ssTitle, supersetOn && styles.ssTitleOn]}>Add as a superset</Text>
              <Text style={styles.ssSub}>Alternate them — one rest, at the end of the round</Text>
            </View>
          </Pressable>
        ) : null}
        <Button variant="primary" fullWidth disabled={confirmDisabled} onPress={onConfirm} accessibilityLabel={confirmLabel}>
          {confirmLabel}
        </Button>
      </View>

      {/* ══ INLINE CREATION — NAME ONLY, AND THE NAME IS ALREADY TYPED ══
          W-28 §1.2 keeps this distinct from the full form on purpose: this is the path taken mid-set,
          and every field added to it is a reason to give up and log the exercise under the wrong name.
          The one question it does ask is reps-or-hold, because getting that wrong is not cosmetic — it
          decides whether the set draws a rep box or a countdown, and correcting it later means editing
          an exercise you created to avoid an interruption. */}
      <BottomSheet open={createOpen} onClose={() => setCreateOpen(false)} title="Add your own exercise">
        <Text style={styles.createName} numberOfLines={2}>
          {search.trim()}
        </Text>
        <Text style={styles.createHint}>Saved to your library. You can add muscles, equipment and notes later.</Text>
        <View style={styles.createRow}>
          {([
            { key: 'reps' as const, label: 'Reps' },
            { key: 'time' as const, label: 'Hold / time' },
          ]).map((o) => (
            <Pressable
              key={o.key}
              onPress={() => setCreateUnit(o.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: createUnit === o.key }}
              accessibilityLabel={o.label}
              style={[styles.createChip, createUnit === o.key ? styles.createChipOn : null]}
            >
              <Text style={[styles.createChipText, createUnit === o.key ? styles.createChipTextOn : null]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
        {/* The label states what actually happens next, which differs by mode — see `createInline`. */}
        <Button variant="primary" fullWidth disabled={creating} onPress={() => void createInline()} accessibilityLabel="Create this exercise">
          {creating ? 'Adding…' : isBuilder ? 'Create and select' : isReplace ? 'Create and swap in' : 'Create and add'}
        </Button>
      </BottomSheet>

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
              {/* See the long note on the identical group in `exercise-library.tsx`: the tag rates
                  TECHNICAL demand, not required fitness, and read as fitness it quietly removes most of
                  the catalogue for the beginner most likely to reach for it. Data unchanged; word fixed. */}
              <FilterGroup
                label="Technique"
                hint="How demanding the movement is to perform well — not how fit you need to be."
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
              Swap {replacingName} for {selected != null ? resolveKey(selected)?.name : ''}.
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
  hint,
  options,
  active,
  onToggle,
}: {
  label: string;
  /** One line under the label, for a group whose meaning the label alone gets wrong. */
  hint?: string;
  options: { value: string; label: string }[];
  active: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterGroupLabel}>{label}</Text>
      {hint ? <Text style={styles.filterGroupHint}>{hint}</Text> : null}
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
  filterBadge: { position: 'absolute', top: 3, right: 2, minWidth: 15, height: 15, paddingHorizontal: 3, borderRadius: 999, backgroundColor: flColor.bronzeSolid, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 9, fontWeight: '800', color: flColor.onBronze },

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
  gearPromptRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  gearPromptBtn: { paddingVertical: 4 },
  gearPromptDismiss: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
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

  overflowNote: { marginTop: 10, paddingHorizontal: 2, fontSize: 11.5, color: flColor.gray600 },

  /* Deliberately quieter than a category row: no fill, dashed edge, bronze only on the glyph and the
     label. It reads as an action available rather than an option being offered. */
  ownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, paddingVertical: 13, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal600 },
  ownRowPressed: { borderColor: flColor.bronzeBorderSubtle, opacity: 0.9 },
  ownRowText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },

  empty: { paddingVertical: 56, paddingHorizontal: 24, alignItems: 'center', gap: 12 },
  emptyLink: { paddingVertical: 8, paddingHorizontal: 12 },
  emptyLinkText: { fontSize: 12.5, color: flColor.gray600, textDecorationLine: 'underline' },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { fontSize: 13, lineHeight: 19, color: flColor.gray400, textAlign: 'center', maxWidth: 230 },

  createBtn: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: 'rgba(176,124,68,0.12)' },
  createBtnPressed: { opacity: 0.85 },
  createBtnText: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300, textAlign: 'center' },
  createName: { fontFamily: flFont.display, fontSize: 20, fontWeight: '700', color: flColor.cream100, textAlign: 'center' },
  createHint: { marginTop: 8, fontSize: 12.5, lineHeight: 18, color: flColor.gray600, textAlign: 'center' },
  createRow: { flexDirection: 'row', gap: 9, marginTop: 18, marginBottom: 16 },
  createChip: { flex: 1, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, alignItems: 'center' },
  createChipOn: { borderColor: flColor.bronze400, backgroundColor: 'rgba(176,124,68,0.16)' },
  createChipText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  createChipTextOn: { color: flColor.cream100 },

  /* `paddingBottom` from `useBarBottom` — see `lib/screen-insets`. */
  footer: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: flColor.charcoal900, gap: 12 },

  // "Add as a superset" — the pick-time pairing declaration
  ssRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: 'transparent' },
  ssRowOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  ssBox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: flColor.charcoal600, alignItems: 'center', justifyContent: 'center' },
  ssBoxOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeSolid },
  ssText: { flex: 1 },
  ssTitle: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  ssTitleOn: { color: flColor.bronze300 },
  ssSub: { fontSize: 11.5, color: flColor.gray600, marginTop: 2 },

  // sheets
  sheetWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,9,12,0.62)' },
  sheet: { backgroundColor: flColor.charcoal900, borderTopLeftRadius: flRadius.xl, borderTopRightRadius: flRadius.xl, borderTopWidth: 1, borderColor: flColor.charcoal600, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 24, gap: 14, maxHeight: '84%' },
  sheetTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  filterScroll: { maxHeight: 380 },
  filterGroup: { marginBottom: 20 },
  filterGroupLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 11 },
  // Sits between the label and its chips, so it is read before the choice rather than after it.
  filterGroupHint: { fontSize: 11.5, lineHeight: 16, color: flColor.gray600, marginTop: -5, marginBottom: 11 },
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
