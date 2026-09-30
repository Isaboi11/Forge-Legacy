import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { EatenSheet } from '@/components/forge/compositions/EatenSheet';
import { BarcodeSheet } from '@/components/forge/BarcodeSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flBorder, flColor, flFont, flRadius } from '@/constants/foundation';
import { dayLabel, diaryDayParam, isAhead, localToday, MEAL_LABELS, MEAL_SLOTS, type MealSlot } from '@/domain/nutrition/day';
import { countOf } from '@/domain/text/plural';
import {
  defaultServing,
  energyKnown,
  looksSane,
  MAY_STORE_MICROS,
  portionLabel,
  portionMacros,
  quickAddMacros,
  repeatMacros,
  SOURCE_LABEL,
  type CatalogFood,
} from '@/domain/nutrition/serving';
import {
  addEntries,
  fetchFavorites,
  fetchFoodByKey,
  fetchMyFoods,
  fetchRecentFoods,
  fetchSavedMeals,
  fetchUserRecipes,
  logSavedMeal,
  peekFoodSearch,
  searchFoods,
  type RecentFood,
} from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { filterList, recipeRowMeta, savedRecipes, type UserRecipe } from '@/domain/nutrition/user-recipes';
import { logRecipeEaten } from '@/lib/log-recipe';
import { useNutritionAccess, usePremiumAi } from '@/lib/entitlement';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { SCREEN_BOTTOM_GAP, useBarBottom } from '@/lib/screen-insets';
import { forgeOr } from '@/constants/theme-scrim';

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
 * ⚠ **BARCODE IS SCANNED ON BUILD 9+, TYPED EVERYWHERE ELSE.** `expo-camera` is a native module, so the
 * viewfinder exists only in a binary built after it was added. `BarcodeCamera` is `require`d only when
 * `ExpoCamera` is present (`components/forge/BarcodeSheet`, shared with the recipe builder); build 8 and the web preview keep the typed box, which
 * stays under the camera on build 9 too for a code the camera cannot read. Both feed the same
 * `resolveBarcode` call and the same not-found → Create Food route (Nutrition Architecture §5, Phase 1).
 *
 * The camera button beside it opens **Log from Photo** (`meal-photo.tsx`, Premium AI) — shown only to an
 * athlete with Premium AI AND Nutrition access, and absent (not "Soon") for everyone else.
 */

type Filter = 'recent' | 'favorites' | 'mine' | 'meals' | 'recipes';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'mine', label: 'My Foods' },
  { id: 'meals', label: 'My Meals' },
  /* PO 2026-09-26: recipes were reachable only from Meal Plan. Logging one asks how much you ate. */
  { id: 'recipes', label: 'My Recipes' },
];

export default function LogFoodScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ date?: string; meal?: string; scan?: string }>();

  /* A link's date is checked, not trusted: a 1999 or malformed date logs to today (QA 09-26 N-19). */
  const todayIso = localToday();
  const iso = diaryDayParam(params.date, todayIso);
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
  const [search, setSearch] = useState<{ q: string; foods: CatalogFood[]; failed: boolean }>({ q: '', foods: [], failed: false });
  const [tries, setTries] = useState(0);
  const [reloads, setReloads] = useState(0);

  const [barcodeOpen, setBarcodeOpen] = useState(params.scan === '1');
  /* Log from a photo (Premium AI, Nutrition Architecture §2). Both gates, or the button is not there: the
     server refuses either way (0203's meter, the function's 403) and a door that always refuses is a lie. */
  const premiumAi = usePremiumAi();
  const nutritionAccess = useNutritionAccess();
  const photoOn = premiumAi && nutritionAccess;
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
  const { data: allRecipes } = useQuery(fetchUserRecipes, [reloads]);
  const myRecipes = allRecipes ? savedRecipes(allRecipes) : allRecipes;
  /* The recipe whose "How much did you eat?" sheet is open. */
  const [eatRecipe, setEatRecipe] = useState<UserRecipe | null>(null);
  const [eatBusy, setEatBusy] = useState(false);
  const logRecipe = async (u: UserRecipe, servings: number) => {
    if (eatBusy) return;
    setEatBusy(true);
    try {
      await logRecipeEaten(iso, meal, u, servings);
      setEatRecipe(null);
      showToast(`${u.name} added to ${MEAL_LABELS[meal]}`);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setEatBusy(false);
    }
  };

  /* Debounced so a paid or rate-limited source is never called per keystroke (Architecture §5). The
     cleanup cancels a pending search, so an abandoned query cannot land on top of a newer one. */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    /* Asked in the last ten minutes: the answer is already on screen (`cached` below) — no call, no wait (N-25). */
    if (peekFoodSearch(q)) return;
    let live = true;
    const timer = setTimeout(async () => {
      const found = await searchFoods(q);
      if (live) setSearch({ q, foods: found.foods.filter(looksSane), failed: found.failed });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, tries]);

  const trimmed = query.trim();
  const isSearching = trimmed.length >= 2;
  /* A query answered in the last ten minutes shows at once, from memory (QA 09-26 N-25). */
  const cached = isSearching && search.q !== trimmed ? peekFoodSearch(trimmed) : null;
  /** Null means "not searching" — the filters and their lists own the screen instead. */
  const results = !isSearching ? null : search.q === trimmed ? search.foods : cached ? cached.filter(looksSane) : null;
  const searching = isSearching && results == null;
  const failed = results != null && search.failed;
  /* Clearing the answer first puts "Searching…" back up while the retry is out. */
  const retry = () => {
    setSearch({ q: '', foods: [], failed: false });
    setTries((n) => n + 1);
  };


  const openDetail = (key: string) => router.push({ pathname: '/food-detail', params: { key, date: iso, meal } });

  /** One tap: the food's default serving, quantity 1, straight into the day. */
  const logNow = async (food: CatalogFood) => {
    /* ⚠ UNKNOWN CALORIES ARE NEVER LOGGED AS ZERO (QA R2-F3). A food whose energy we don't actually know —
       null, or "0 kcal, no macros" on something that isn't water — goes to Food Detail instead. */
    if (!energyKnown(food)) {
      openDetail(food.key);
      return;
    }
    const serving = defaultServing(food);
    const macros = portionMacros(food, { serving, quantity: 1 });
    if (macros.kcal === 0 && macros.grams == null) {
      // No weighed serving to assume — send them to Food Detail to choose one rather than log a zero.
      openDetail(food.key);
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
        micros: MAY_STORE_MICROS.has(food.source) ? (food.micros ?? null) : null,
      },
    ]);
    setReloads((n) => n + 1);
    showToast(`${food.name} · ${macros.kcal} cal added to ${MEAL_LABELS[meal]}`);
  };

  /**
   * The round + on a row. A Recent row logs again exactly what was logged last time — same serving, same
   * numbers (a repeat breakfast is two taps). A Favorite, or a Recent whose stored numbers can't be trusted,
   * is only a pointer, so the food is read first; if it can't be read, Food Detail opens (QA R2-F3).
   */
  const logRow = async (row: Row) => {
    if (!row.pointer) return logNow(row.food);
    const again = row.repeat ? repeatMacros(row.repeat) : null;
    if (row.repeat && again) {
      await addEntries(iso, [
        {
          meal,
          source: row.repeat.source,
          sourceKey: row.repeat.key,
          name: row.repeat.name,
          brand: row.repeat.brand,
          servingLabel: row.repeat.servingLabel,
          quantity: Number.isFinite(row.repeat.quantity) && row.repeat.quantity > 0 ? row.repeat.quantity : 1,
          macros: again,
          micros: MAY_STORE_MICROS.has(row.repeat.source) ? row.repeat.micros : null,
        },
      ]);
      setReloads((n) => n + 1);
      showToast(`${row.repeat.name} · ${Math.round(again.kcal)} cal added to ${MEAL_LABELS[meal]}`);
      return;
    }
    const food = await fetchFoodByKey(row.food.key);
    if (!food) {
      openDetail(row.food.key);
      return;
    }
    return logNow(food);
  };

  const barBottom = useBarBottom(SCREEN_BOTTOM_GAP);

  /* While the search service is out (1.7–4.9 s), your own foods that match are already listed (N-25). */
  const localFor = searching ? trimmed : null;
  const rows = useMemo(
    () => buildRows({ results, filter, recents, favorites, myFoods, localFor }),
    [results, filter, recents, favorites, myFoods, localFor],
  );
  /* A search shows its best ten; "Show more" opens the rest for THAT query only, so the next one starts short again. */
  const [moreFor, setMoreFor] = useState<string | null>(null);
  const capped = results != null && moreFor !== trimmed && rows.length > SEARCH_PAGE;
  const visibleRows = capped ? rows.slice(0, SEARCH_PAGE) : rows;

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
      {/* On a day that has not begun this is planning (0228) — the food waits there for its check. */}
      <AppBar title={isAhead(iso, todayIso) ? 'Plan Food' : 'Log Food'} transparent onBack={() => router.back()} />

      {/* meal destination — one quiet line, tap to change. Any day but today is named on it, so food meant
          for tonight never lands on yesterday unseen (QA 09-26 N-19). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Adding to ${MEAL_LABELS[meal]}${iso === todayIso ? '' : `, ${dayLabel(iso, todayIso)}`}. Change meal`}
        style={styles.mealLine}
        onPress={() => setMealPickerOpen(true)}
      >
        <Text style={styles.mealLineLabel}>Adding to</Text>
        <Text style={styles.mealLineValue}>
          {iso === todayIso ? MEAL_LABELS[meal] : `${MEAL_LABELS[meal]} · ${dayLabel(iso, todayIso)}`}
        </Text>
        <EngravedIcon name="chevron-down" size={13} color={forgeOr(flColor.bronze400, flColor.gray600)} />
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
              <EngravedIcon name="search" size={18} color={flColor.gray600} />
            }
          />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Scan barcode" style={styles.scanButton} onPress={() => setBarcodeOpen(true)}>
          <EngravedIcon name="barcode-scan" size={16} />
        </Pressable>
        {photoOn ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log from a photo"
            style={styles.scanButton}
            onPress={() => router.push({ pathname: '/meal-photo', params: { date: iso, meal } })}
          >
            <EngravedIcon name="camera" size={16} />
          </Pressable>
        ) : null}
      </View>

      {/* filters — hidden while searching, because a search spans all of them */}
      {!isSearching ? (
        <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
          {FILTERS.map((f) => (
            <Pressable key={f.id} accessibilityRole="button" onPress={() => setFilter(f.id)} style={[styles.pill, filter === f.id && styles.pillOn]}>
              <Text style={[styles.pillText, filter === f.id && styles.pillTextOn]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {searching ? <Text style={styles.status}>Searching…</Text> : null}

        {/* Your recipes — the filter's list, or the ones matching a search, above the food results. Tapping
            one asks how much you ate (`EatenSheet`) before anything is logged. */}
        {(!isSearching ? (filter === 'recipes' ? filterList(myRecipes ?? [], '', 'all') : []) : filterList(myRecipes ?? [], trimmed, 'all').slice(0, 3)).map(
          (u) => (
            <Pressable key={u.id} accessibilityRole="button" style={styles.row} onPress={() => setEatRecipe(u)}>
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {u.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {!isSearching ? recipeRowMeta(u) : `My recipe · ${recipeRowMeta(u)}`}
                </Text>
              </View>
              <AddCircle />
            </Pressable>
          ),
        )}

        {/* My Meals is a different row shape: it logs several foods at once. */}
        {!isSearching && filter === 'meals'
          ? (savedMeals ?? []).map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                style={styles.row}
                onPress={async () => {
                  const added = await logSavedMeal(m.id, iso, meal);
                  showToast(`${m.name} · ${countOf(added.length, 'item')} added`);
                }}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{m.name}</Text>
                  <Text style={styles.rowMeta}>{`${m.kcal} cal · ${countOf(m.itemCount, 'item')}`}</Text>
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
                <Pressable accessibilityRole="button" accessibilityLabel={`Add ${row.food.name}`} hitSlop={6} onPress={() => logRow(row)}>
                  <AddCircle />
                </Pressable>
              </Pressable>
            ))}

        {capped ? (
          <Pressable accessibilityRole="button" style={styles.more} onPress={() => setMoreFor(trimmed)}>
            <Text style={styles.footerAction}>{`Show more (${rows.length - SEARCH_PAGE})`}</Text>
          </Pressable>
        ) : null}

        {!searching &&
        rows.length === 0 &&
        !(!isSearching && filter === 'meals' && (savedMeals ?? []).length) &&
        !(!isSearching && filter === 'recipes' && (myRecipes ?? []).length) ? (
          <Text style={styles.empty}>{emptyCopy(filter, results, query, failed)}</Text>
        ) : null}
        {!searching && failed ? (
          <Pressable accessibilityRole="button" style={styles.more} onPress={retry}>
            <Text style={styles.footerAction}>Try again</Text>
          </Pressable>
        ) : null}

        {/* The door to My Foods & Meals — where these two lists are edited, deleted and (meals) built. */}
        {!isSearching && filter === 'recipes' ? (
          <Pressable accessibilityRole="button" style={styles.more} onPress={() => router.push('/my-recipes')}>
            <Text style={styles.footerAction}>Edit or add recipes</Text>
          </Pressable>
        ) : null}
        {!isSearching && (filter === 'mine' || filter === 'meals') ? (
          <Pressable
            accessibilityRole="button"
            style={styles.more}
            onPress={() => router.push({ pathname: '/my-foods', params: filter === 'meals' ? { tab: 'meals' } : {} })}
          >
            <Text style={styles.footerAction}>{filter === 'meals' ? 'Edit or build meals' : 'Edit or delete my foods'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* quiet secondary actions. ⚠ The bottom pad is the app's anchored-bar gap, not a fixed 28: a fixed
          pad ignored the home indicator and sat these two in the iPhone's swipe zone (PO, 09-24). */}
      <View style={[styles.footer, { paddingBottom: barBottom }]}>
        <Pressable accessibilityRole="button" style={styles.footerButton} onPress={() => setQuickOpen(true)}>
          <Text style={styles.footerAction}>Quick Add</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.footerButton} onPress={goCreateFood}>
          <Text style={styles.footerAction}>Create Food</Text>
        </Pressable>
        {/* The meal builder lives in My Foods & Meals; this is its front door (PO: "is there a create meal page?"). */}
        <Pressable
          accessibilityRole="button"
          style={styles.footerButton}
          onPress={() => router.push({ pathname: '/my-foods', params: { newMeal: '1' } })}
        >
          <Text style={styles.footerAction}>Create Meal</Text>
        </Pressable>
      </View>

      <EatenSheet
        recipe={eatRecipe}
        busy={eatBusy}
        onClose={() => setEatRecipe(null)}
        onLog={(q) => {
          if (eatRecipe) void logRecipe(eatRecipe, q);
        }}
      />
      <MealPicker open={mealPickerOpen} meal={meal} onPick={setMeal} onClose={() => setMealPickerOpen(false)} />

      <BarcodeSheet
        open={barcodeOpen}
        onClose={() => setBarcodeOpen(false)}
        onFound={(food, digits) => {
          setBarcodeOpen(false);
          /* The barcode travels so Food Detail can offer "Doesn't match the label? Fix it" (PO 09-28). */
          router.push({ pathname: '/food-detail', params: { key: food.key, date: iso, meal, gtin: digits } });
        }}
        onNotFound={(digits, empty) => {
          setBarcodeOpen(false);
          /*
           * ⚠ THE BARCODE ALWAYS TRAVELS NOW — Amendment 004 shares the food under it, so the next scan
           * finds it. It used to travel only where Scan label exists, so a miss on the web preview (or
           * build 8) opened a Create Food with no barcode and no "Share with Forge": fixable for yourself,
           * never for anyone else. Create Food says "No barcode match" itself (`.dc` A2).
           *
           * `empty` — Forge found a record for this code but it has no nutrition (PO 2026-09-28, the
           * protein bar whose numbers were all zero). Its name and brand come along so only the numbers
           * are left to type. See `pickBarcodeResult`.
           */
          router.push({
            pathname: '/create-food',
            params: {
              date: iso,
              meal,
              from: empty ? 'barcode-empty' : 'barcode',
              gtin: digits,
              ...(empty ? { name: empty.name, brand: empty.brand ?? '' } : {}),
            },
          });
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
  /** Known by name only (Recent, Favorites): the + must not log `food` as it stands — see `logRow`. */
  pointer?: boolean;
  /** Recent only: the portion last logged, which the + repeats. */
  repeat?: RecentFood;
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
  localFor,
}: {
  results: CatalogFood[] | null;
  filter: Filter;
  recents: RecentFood[] | null | undefined;
  favorites: Awaited<ReturnType<typeof fetchFavorites>> | null | undefined;
  myFoods: CatalogFood[] | null | undefined;
  /** The query still out at the search service: only the athlete's own matching foods, for now. */
  localFor?: string | null;
}): Row[] {
  if (localFor) {
    const words = localFor.toLowerCase().split(/\s+/).filter(Boolean);
    return (myFoods ?? [])
      .filter((food) => {
        const text = `${food.name} ${food.brand ?? ''}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
      .slice(0, 5)
      .map((food) => ({ key: food.key, food, meta: [calorieMeta(food), food.brand, SOURCE_LABEL[food.source]].filter(Boolean).join(' · ') }));
  }
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

  if (filter === 'recipes') return [];

  if (filter === 'favorites') {
    /* A favourite is a pointer. Until it is opened, only the name and brand are known — the numbers come
       from the source when the portion sheet needs them, which is also why the row has no calorie line. */
    return (favorites ?? []).map((f) => ({
      key: f.key,
      food: pointerFood(f.key, f.name, f.brand),
      meta: f.brand ?? 'Saved',
      pointer: true,
    }));
  }

  return (recents ?? []).map((r) => ({
    key: r.key,
    food: pointerFood(r.key, r.name, r.brand),
    meta: [`${Math.round(r.kcal)} cal`, r.servingLabel, r.brand].filter(Boolean).join(' · '),
    pointer: true,
    repeat: r,
  }));
}

/**
 * A row we know by name but not yet by numbers. Opening it re-reads the real food; the empty serving list
 * means `servingOptions` offers "100 g", so a portion is always expressible.
 *
 * ⚠ **NEVER LOG THIS AS IT STANDS.** Every number is unknown; `logNow` on it used to write "100 g · 0 cal"
 * (QA R2-F3). The + goes through `logRow`, which repeats the stored portion or reads the food first.
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

function emptyCopy(filter: Filter, results: CatalogFood[] | null, query: string, failed: boolean): string {
  if (failed) return 'Couldn’t connect to food search. Check your signal and try again.';
  if (results) return `Nothing found for "${query.trim()}". Try a simpler word, or Create Food.`;
  switch (filter) {
    case 'favorites':
      return 'No favourites yet. Star a food when you log it.';
    case 'mine':
      return 'No foods of your own yet. Create Food adds one from a label.';
    case 'meals':
      return 'No saved meals yet. Build one below, or save a meal you already logged.';
    case 'recipes':
      return 'No recipes yet. Add one below, and log it here with how much you ate.';
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
      <TextInput returnKeyType="done"
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
    <EngravedIcon name="plus" size={17} color={flColor.bronze400} />
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },

  mealLine: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 4, paddingVertical: 4, paddingHorizontal: 2 },
  mealLineLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
  mealLineValue: { fontSize: 13.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronzeInk },

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
  pillTextOn: { color: flColor.selectedInk },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 },
  status: { fontSize: 12.5, color: flColor.gray600, paddingVertical: 10 },
  more: { alignItems: 'center', paddingVertical: 16 },
  empty: { fontSize: 13.5, color: flColor.gray400, paddingVertical: 24, lineHeight: 20 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: flColor.divider },
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
    /* Three actions, no separator dots: with dots and the old padding the row measured ~406 pt, wider than
       any iPhone. Spread evenly it is ~330 pt, which fits the 375 pt SE with room for SF Pro's width. */
    justifyContent: 'space-evenly',
    paddingTop: 6,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: flColor.divider,
    backgroundColor: flColor.charcoal900,
  },
  footerAction: { fontSize: 12, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.gray400 },
  footerButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },

  sheetBody: { gap: 12, paddingBottom: 8 },
  sheetNote: { fontSize: 13, color: flColor.gray400, lineHeight: 19 },
  fieldLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.gray600 },
  servingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal800, ...flBorder.subtle },
  choiceOn: { backgroundColor: flColor.bronzeDark, borderColor: flColor.accentBorder },
  choiceText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  choiceTextOn: { color: flColor.selectedInk },
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
  previewLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.labelInk },
  previewMacros: { flex: 1, textAlign: 'right', fontSize: 12.5, color: flColor.gray400 },
  attribution: { fontSize: 11, color: flColor.gray600, letterSpacing: 0.3 },
});
