import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flBorder, flColor, flFont, flRadius } from '@/constants/foundation';
import { localToday, MEAL_LABELS, MEAL_SLOTS, type MealSlot } from '@/domain/nutrition/day';
import {
  defaultServing,
  looksSane,
  portionLabel,
  portionMacros,
  quickAddMacros,
  SOURCE_LABEL,
  type CatalogFood,
} from '@/domain/nutrition/serving';
import {
  addEntries,
  fetchFavorites,
  fetchMyFoods,
  fetchRecentFoods,
  fetchSavedMeals,
  logSavedMeal,
  lookupBarcode,
  searchFoods,
} from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { useQuery } from '@/lib/useQuery';

/**
 * Log Food — built to `Log Food.dc.html`, wired to the diary (0205) and `food-search`.
 *
 * Faithful to the `.dc`: back bar, the "ADDING TO Breakfast ⌄" line, search + the barcode button, the
 * four quiet filter pills (Recent · Favorites · My Foods · My Meals), grouped rows of
 * "name / 300 cal · 80 g dry" each with a round + on the right, and the Quick Add · Create Food footer.
 *
 * ⚠ **THE + AND THE ROW ARE DIFFERENT ACTIONS**, which is the whole speed argument for this screen: the
 * round + logs the food immediately in its default serving (a repeat breakfast is two taps), while the
 * row opens **Food Detail** for the case where today is half a cup. The `.dc` draws both; this keeps them
 * distinct rather than collapsing them into one. (An in-file portion sheet did the second job until
 * `Food Detail.dc.html` arrived; the sheet is gone rather than left as a second way to do the same thing.)
 *
 * ⚠ **BARCODE IS TYPED, NOT SCANNED — FOR NOW.** `expo-camera` is a native module: adding it needs a new
 * binary, so a camera cannot reach the current build over the air, and the PO reviews on the web preview
 * where the camera path differs again. The lookup, the fallbacks (USDA → Open Food Facts) and the
 * not-found → Create Food route are all real and tested by hand today; the scanner is a lens on the same
 * call, and lands with the next binary (Nutrition Architecture §5, Phase 1).
 */

type Filter = 'recent' | 'favorites' | 'mine' | 'meals';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'mine', label: 'My Foods' },
  { id: 'meals', label: 'My Meals' },
];

export default function LogFoodScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ date?: string; meal?: string; scan?: string }>();

  const iso = typeof params.date === 'string' ? params.date : localToday();
  const initialMeal = (MEAL_SLOTS as readonly string[]).includes(String(params.meal))
    ? (params.meal as MealSlot)
    : mealForNow();

  const [meal, setMeal] = useState<MealSlot>(initialMeal);
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('recent');
  /* ⚠ THE SEARCH IS ONE STATE, KEYED BY ITS QUERY, and everything else about it is derived. Holding
     `results` and `searching` as separate flags meant the effect had to clear them synchronously for a
     query under two characters — which react-compiler rejects (cascading renders) and which also raced:
     a stale reply could land after a newer keystroke. Keyed, a reply that does not match what is in the
     box is simply not this search's answer. */
  const [search, setSearch] = useState<{ q: string; foods: CatalogFood[] }>({ q: '', foods: [] });
  const [reloads, setReloads] = useState(0);

  const [barcodeOpen, setBarcodeOpen] = useState(params.scan === '1');
  const [quickOpen, setQuickOpen] = useState(false);

  /* Create Food is a SCREEN now (`Create Food.dc.html`), not the six-field sheet this file used to
     own — it carries a unit picker, a calories-versus-macros check and ten more nutrients, none of
     which fit under a keyboard in a sheet. It takes the meal and day so it can log what it creates. */
  const goCreateFood = () => router.push({ pathname: '/create-food', params: { date: iso, meal } });

  /* Back from My Foods & Meals, a food or meal may have been edited or deleted — re-read the lists. */
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));
  const { data: recents } = useQuery(fetchRecentFoods, [reloads]);
  const { data: favorites } = useQuery(fetchFavorites, [reloads]);
  const { data: myFoods } = useQuery(fetchMyFoods, [reloads]);
  const { data: savedMeals } = useQuery(fetchSavedMeals, [reloads]);

  /* Debounced so a paid or rate-limited source is never called per keystroke (Architecture §5). The
     cleanup cancels a pending search, so an abandoned query cannot land on top of a newer one. */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let live = true;
    const timer = setTimeout(async () => {
      const found = await searchFoods(q);
      if (live) setSearch({ q, foods: found.filter(looksSane) });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);

  const trimmed = query.trim();
  const isSearching = trimmed.length >= 2;
  /** Null means "not searching" — the filters and their lists own the screen instead. */
  const results = isSearching && search.q === trimmed ? search.foods : null;
  const searching = isSearching && search.q !== trimmed;


  /** One tap: the food's default serving, quantity 1, straight into the day. */
  const logNow = async (food: CatalogFood) => {
    const serving = defaultServing(food);
    const macros = portionMacros(food, { serving, quantity: 1 });
    if (macros.kcal === 0 && macros.grams == null) {
      // No weighed serving to assume — send them to Food Detail to choose one rather than log a zero.
      router.push({ pathname: '/food-detail', params: { key: food.key, date: iso, meal } });
      return;
    }
    await addEntries(iso, [
      {
        meal,
        source: food.source,
        sourceKey: food.key,
        name: food.name,
        brand: food.brand,
        servingLabel: portionLabel({ serving, quantity: 1 }),
        quantity: 1,
        macros,
      },
    ]);
    setReloads((n) => n + 1);
    showToast(`${food.name} · ${macros.kcal} cal added to ${MEAL_LABELS[meal]}`);
  };

  const rows = useMemo(() => buildRows({ results, filter, recents, favorites, myFoods }), [results, filter, recents, favorites, myFoods]);
  /* A search shows its best ten; "Show more" opens the rest for THAT query only, so the next one starts short again. */
  const [moreFor, setMoreFor] = useState<string | null>(null);
  const capped = results != null && moreFor !== trimmed && rows.length > SEARCH_PAGE;
  const visibleRows = capped ? rows.slice(0, SEARCH_PAGE) : rows;

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
      <AppBar title="Log Food" transparent onBack={() => router.back()} />

      {/* meal destination — one quiet line, tap to change */}
      <Pressable accessibilityRole="button" style={styles.mealLine} onPress={() => setMealPickerOpen(true)}>
        <Text style={styles.mealLineLabel}>Adding to</Text>
        <Text style={styles.mealLineValue}>{MEAL_LABELS[meal]}</Text>
        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 9l6 6 6-6" />
        </Svg>
      </Pressable>

      {/* search + barcode */}
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <InputField
            value={query}
            onChange={setQuery}
            placeholder="Search foods, brands, meals"
            autoCorrect={false}
            returnKeyType="search"
            leadingIcon={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx={11} cy={11} r={6.5} />
                <Path d="M16 16l4 4" />
              </Svg>
            }
          />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Scan barcode" style={styles.scanButton} onPress={() => setBarcodeOpen(true)}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round">
            <Path d="M4 6v12M7.5 6v12M11 6v12M14 6v12M17.5 6v12M21 6v12" />
          </Svg>
        </Pressable>
      </View>

      {/* filters — hidden while searching, because a search spans all of them */}
      {results == null ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
          {FILTERS.map((f) => (
            <Pressable key={f.id} accessibilityRole="button" onPress={() => setFilter(f.id)} style={[styles.pill, filter === f.id && styles.pillOn]}>
              <Text style={[styles.pillText, filter === f.id && styles.pillTextOn]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {searching ? <Text style={styles.status}>Searching…</Text> : null}

        {/* My Meals is a different row shape: it logs several foods at once. */}
        {results == null && filter === 'meals'
          ? (savedMeals ?? []).map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                style={styles.row}
                onPress={async () => {
                  const added = await logSavedMeal(m.id, iso, meal);
                  showToast(`${m.name} · ${added.length} items added`);
                }}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{m.name}</Text>
                  <Text style={styles.rowMeta}>{`${m.kcal} cal · ${m.itemCount} items`}</Text>
                </View>
                <AddCircle />
              </Pressable>
            ))
          : visibleRows.map((row) => (
              <Pressable
                key={row.key}
                accessibilityRole="button"
                style={styles.row}
                onPress={() => router.push({ pathname: '/food-detail', params: { key: row.food.key, date: iso, meal } })}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {row.food.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {row.meta}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Add ${row.food.name}`} hitSlop={6} onPress={() => logNow(row.food)}>
                  <AddCircle />
                </Pressable>
              </Pressable>
            ))}

        {capped ? (
          <Pressable accessibilityRole="button" style={styles.more} onPress={() => setMoreFor(trimmed)}>
            <Text style={styles.footerAction}>{`Show more (${rows.length - SEARCH_PAGE})`}</Text>
          </Pressable>
        ) : null}

        {!searching && rows.length === 0 && !(results == null && filter === 'meals' && (savedMeals ?? []).length) ? (
          <Text style={styles.empty}>{emptyCopy(filter, results, query)}</Text>
        ) : null}

        {/* The door to My Foods & Meals — where these two lists are edited, deleted and (meals) built. */}
        {results == null && (filter === 'mine' || filter === 'meals') ? (
          <Pressable
            accessibilityRole="button"
            style={styles.more}
            onPress={() => router.push({ pathname: '/my-foods', params: filter === 'meals' ? { tab: 'meals' } : {} })}
          >
            <Text style={styles.footerAction}>{filter === 'meals' ? 'Edit or build meals' : 'Edit or delete my foods'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* quiet secondary actions */}
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={() => setQuickOpen(true)}>
          <Text style={styles.footerAction}>Quick Add</Text>
        </Pressable>
        <View style={styles.footerDot} />
        <Pressable accessibilityRole="button" onPress={goCreateFood}>
          <Text style={styles.footerAction}>Create Food</Text>
        </Pressable>
      </View>

      <MealPicker open={mealPickerOpen} meal={meal} onPick={setMeal} onClose={() => setMealPickerOpen(false)} />

      <BarcodeSheet
        open={barcodeOpen}
        onClose={() => setBarcodeOpen(false)}
        onFound={(food) => {
          setBarcodeOpen(false);
          router.push({ pathname: '/food-detail', params: { key: food.key, date: iso, meal } });
        }}
        onNotFound={() => {
          setBarcodeOpen(false);
          goCreateFood();
          showToast('Not in the database — add it yourself');
        }}
      />

      <QuickAddSheet
        open={quickOpen}
        meal={meal}
        onClose={() => setQuickOpen(false)}
        onAdd={async (input) => {
          const macros = quickAddMacros(input);
          await addEntries(iso, [{ meal, source: 'quick', name: input.name || 'Quick add', quantity: 1, macros }]);
          setQuickOpen(false);
          setReloads((n) => n + 1);
          showToast(`${macros.kcal} cal added to ${MEAL_LABELS[meal]}`);
        }}
      />

    </View>
  );
}

/* ── rows ────────────────────────────────────────────────────────────────── */

interface Row {
  key: string;
  food: CatalogFood;
  meta: string;
}

const SEARCH_PAGE = 10;

/**
 * "515 cal · 1 item" when the food has a real serving, "234 cal / 100 g" only when it does not. PO,
 * 2026-09-24: per-100 g on a Big Mac read as the burger's calories.
 */
function calorieMeta(food: CatalogFood): string | null {
  const serving = defaultServing(food);
  if (serving.grams != null && !/^100\s*(g|ml)\b/i.test(serving.label)) {
    return `${portionMacros(food, { serving, quantity: 1 }).kcal} cal · ${serving.label}`;
  }
  return food.kcal100 != null ? `${Math.round(food.kcal100)} cal / 100 g` : null;
}

function buildRows({
  results,
  filter,
  recents,
  favorites,
  myFoods,
}: {
  results: CatalogFood[] | null;
  filter: Filter;
  recents: Awaited<ReturnType<typeof fetchRecentFoods>> | null | undefined;
  favorites: Awaited<ReturnType<typeof fetchFavorites>> | null | undefined;
  myFoods: CatalogFood[] | null | undefined;
}): Row[] {
  if (results) {
    return results.map((food) => ({
      key: food.key,
      food,
      meta: [
        calorieMeta(food),
        food.brand,
        SOURCE_LABEL[food.source],
      ]
        .filter(Boolean)
        .join(' · '),
    }));
  }

  if (filter === 'mine') {
    return (myFoods ?? []).map((food) => ({
      key: food.key,
      food,
      meta: [calorieMeta(food), food.brand].filter(Boolean).join(' · '),
    }));
  }

  if (filter === 'favorites') {
    /* A favourite is a pointer. Until it is opened, only the name and brand are known — the numbers come
       from the source when the portion sheet needs them, which is also why the row has no calorie line. */
    return (favorites ?? []).map((f) => ({
      key: f.key,
      food: pointerFood(f.key, f.name, f.brand),
      meta: f.brand ?? 'Saved',
    }));
  }

  return (recents ?? []).map((r) => ({
    key: r.key,
    food: pointerFood(r.key, r.name, r.brand),
    meta: [`${Math.round(r.kcal)} cal`, r.servingLabel, r.brand].filter(Boolean).join(' · '),
  }));
}

/**
 * A row we know by name but not yet by numbers. Opening it re-reads the real food; the empty serving list
 * means `servingOptions` offers "100 g", so a portion is always expressible.
 */
function pointerFood(key: string, name: string, brand: string | null): CatalogFood {
  const source = (key.split(':')[0] as CatalogFood['source']) ?? 'custom';
  return {
    key,
    source: ['usda', 'off', 'fs'].includes(source) ? source : 'custom',
    name,
    brand,
    kcal100: null,
    protein100: null,
    carb100: null,
    fat100: null,
    servings: [],
    attribution: null,
  };
}

function emptyCopy(filter: Filter, results: CatalogFood[] | null, query: string): string {
  if (results) return `Nothing found for "${query.trim()}". Try a simpler word, or Create Food.`;
  switch (filter) {
    case 'favorites':
      return 'No favourites yet. Star a food when you log it.';
    case 'mine':
      return 'No foods of your own yet. Create Food adds one from a label.';
    case 'meals':
      return 'No saved meals yet. Build one below, or save a meal you already logged.';
    default:
      return 'Nothing logged yet. Search for a food to start.';
  }
}

/** Which meal a tap at this hour most likely means — a default, always changeable. */
function mealForNow(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snacks';
}

/* ── sheets ──────────────────────────────────────────────────────────────── */

function MealPicker({ open, meal, onPick, onClose }: { open: boolean; meal: MealSlot; onPick: (m: MealSlot) => void; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Adding to">
      <View style={styles.sheetBody}>
        {MEAL_SLOTS.map((slot) => (
          <Pressable
            key={slot}
            accessibilityRole="button"
            style={[styles.choice, slot === meal && styles.choiceOn]}
            onPress={() => {
              onPick(slot);
              onClose();
            }}
          >
            <Text style={[styles.choiceText, slot === meal && styles.choiceTextOn]}>{MEAL_LABELS[slot]}</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

function BarcodeSheet({
  open,
  onClose,
  onFound,
  onNotFound,
}: {
  open: boolean;
  onClose: () => void;
  onFound: (food: CatalogFood) => void;
  onNotFound: () => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const look = useCallback(async () => {
    const digits = code.replace(/\D/g, '');
    if (digits.length < 8) return;
    setBusy(true);
    const found = await lookupBarcode(digits);
    setBusy(false);
    setCode('');
    if (found.length) onFound(found[0]);
    else onNotFound();
  }, [code, onFound, onNotFound]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Barcode">
      <View style={styles.sheetBody}>
        <Text style={styles.sheetNote}>
          Type the number under the barcode. Camera scanning arrives with the next app build.
        </Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="0 12345 67890 5"
          placeholderTextColor={flColor.gray600}
          style={styles.numberInput}
          accessibilityLabel="Barcode number"
          onSubmitEditing={look}
        />
        <Button variant="primary" fullWidth disabled={busy || code.replace(/\D/g, '').length < 8} onPress={look}>
          {busy ? 'Looking…' : 'Find it'}
        </Button>
      </View>
    </BottomSheet>
  );
}

function QuickAddSheet({
  open,
  meal,
  onClose,
  onAdd,
}: {
  open: boolean;
  meal: MealSlot;
  onClose: () => void;
  onAdd: (input: { name: string; kcal: number; protein?: number; carb?: number; fat?: number }) => void;
}) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carb, setCarb] = useState('');
  const [fat, setFat] = useState('');
  const n = (v: string) => (v.trim() === '' ? undefined : Number(v));

  return (
    <BottomSheet open={open} onClose={onClose} title="Quick add" scroll>
      <View style={styles.sheetBody}>
        <Text style={styles.sheetNote}>Calories now, the rest if you know them. No food attached.</Text>
        <InputField label="What was it (optional)" value={name} onChange={setName} placeholder="Restaurant lunch" />
        <View style={styles.macroInputs}>
          <NumberField label="Calories" value={kcal} onChange={setKcal} />
          <NumberField label="Protein" value={protein} onChange={setProtein} />
          <NumberField label="Carbs" value={carb} onChange={setCarb} />
          <NumberField label="Fat" value={fat} onChange={setFat} />
        </View>
        <Button
          variant="primary"
          fullWidth
          disabled={!Number(kcal)}
          onPress={() => onAdd({ name: name.trim(), kcal: Number(kcal), protein: n(protein), carb: n(carb), fat: n(fat) })}
        >
          {`Add to ${MEAL_LABELS[meal]}`}
        </Button>
      </View>
    </BottomSheet>
  );
}


function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={styles.numberInput}
        accessibilityLabel={label}
        selectTextOnFocus
      />
    </View>
  );
}

const AddCircle = () => (
  <View style={styles.addCircle}>
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.9} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },

  mealLine: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 4, paddingVertical: 4, paddingHorizontal: 2 },
  mealLineLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
  mealLineValue: { fontSize: 13.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze400 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  searchField: { flex: 1, minWidth: 0 },
  scanButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal800,
    ...flBorder.bronzeSubtle,
  },

  filters: { flexGrow: 0, paddingHorizontal: 18 },
  filtersContent: { alignItems: 'center', gap: 4, paddingBottom: 6 },
  pill: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: flRadius.pill },
  pillOn: { backgroundColor: flColor.bronzeDark },
  pillText: { fontSize: 11.5, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.gray600 },
  pillTextOn: { color: flColor.bronze300 },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 },
  status: { fontSize: 12.5, color: flColor.gray600, paddingVertical: 10 },
  more: { alignItems: 'center', paddingVertical: 16 },
  empty: { fontSize: 13.5, color: flColor.gray400, paddingVertical: 24, lineHeight: 20 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  rowName: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  rowMeta: { fontSize: 12.5, color: flColor.gray600 },
  addCircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.round,
    backgroundColor: flColor.charcoal800,
    ...flBorder.bronzeSubtle,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingTop: 14,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  footerAction: { fontSize: 12, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.gray400 },
  footerDot: { width: 4, height: 4, borderRadius: flRadius.round, backgroundColor: flColor.charcoal500 },

  sheetBody: { gap: 12, paddingBottom: 8 },
  sheetNote: { fontSize: 13, color: flColor.gray400, lineHeight: 19 },
  fieldLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.gray600 },
  servingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal800, ...flBorder.subtle },
  choiceOn: { backgroundColor: flColor.bronzeDark, borderColor: flColor.bronzeBorder },
  choiceText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  choiceTextOn: { color: flColor.bronze300 },
  numberInput: {
    fontSize: 16,
    fontWeight: '600',
    color: flColor.cream100,
    backgroundColor: flColor.charcoal800,
    borderRadius: flRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...flBorder.subtle,
  },
  numberField: { flexGrow: 1, flexBasis: '30%', gap: 6 },
  macroInputs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  portionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  portionMeta: { flex: 1, fontSize: 12.5, color: flColor.gray600 },
  previewRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 4 },
  previewKcal: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100 },
  previewLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  previewMacros: { flex: 1, textAlign: 'right', fontSize: 12.5, color: flColor.gray400 },
  attribution: { fontSize: 11, color: flColor.gray600, letterSpacing: 0.3 },
});
