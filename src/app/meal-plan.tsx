import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { Pill } from '@/components/forge/composites/Pill';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { grouped, localToday } from '@/domain/nutrition/day';
import { setupGate } from '@/domain/nutrition/meal-plan-setup';
import {
  RECIPE_BY_ID,
  addSnack,
  alternatives,
  clearWeek,
  dayTotals,
  feedsDay,
  itemTotals,
  isSavedMeal,
  keptLocks,
  mealPicks,
  ownPicks,
  ownPicksHidden,
  placeOnDays,
  logKey,
  mondayOf,
  portionLabel,
  rebuildWeek,
  resolveWeek,
  shortBy,
  slotKey,
  snackOptions,
  spanDays,
  swapMeal,
  toggleLock,
  weekDates,
  weekRange,
  type PlaceSpan,
  type MealPlanWeek,
  type PlanItem,
  type PlanSlotName,
} from '@/domain/nutrition/meal-planner';
import {
  fetchMealPlanPrefs,
  fetchMealPlanWeek,
  fetchNutritionProfile,
  fetchTargetsOn,
  fetchUserRecipes,
  saveMealPlanWeek,
  saveUserRecipe,
  togglePlanLog,
} from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { takeSwapRequest } from '@/lib/meal-plan-intent';
import { budgetLine as budgetLineFor, estimateFor, groceryList, stateFor } from '@/domain/nutrition/grocery';
import { SCREEN_BOTTOM_GAP, useBarBottom } from '@/lib/screen-insets';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useNutritionAccess, usePremiumAi } from '@/lib/entitlement';
import { ensureConsent } from '@/lib/consent';
import { AI_DECLINED_LINE } from '@/domain/consent/consent';
import { askKitchenLive, recentKitchenDishesLive, rememberKitchenDishesLive } from '@/data/coach-kitchen-live';
import { dishCards, type DishCard } from '@/domain/nutrition/kitchen-cards';
import { kitchenError, rotationLeanToday } from '@/domain/nutrition/kitchen-dishes';
import { allergenLine, dayHasEmptySlot, emptySlots, fillAsk, fillAvoid, formForPlan, plannable } from '@/domain/nutrition/holt-fill';
import { recipeFrom } from '@/domain/nutrition/user-recipes';
import { NutritionPlannerGate } from '@/components/forge/NutritionPlannerGate';

const takeSwapRequestAsync = () => Promise.resolve(takeSwapRequest());

/**
 * Meal Plan — built to `Meal Plan.dc.html` (Claude Design b029488a), wired to `meal_plan_weeks` (0211)
 * and planned by `domain/nutrition/meal-planner.ts`, the design's `meal-recipes.js` ported and tested.
 *
 * ⚠ **THE RECIPE NUMBERS ARE REAL; THE DESIGN'S WERE NOT.** The `.dc` shipped hand-written calories for
 * its mockup. Here every figure is the sum of USDA SR Legacy values × grams (`recipes-data.ts`), and
 * allergens/diet are derived from ingredients. PO decision 2026-09-23: "Build now, fix numbers first."
 *
 * ⛔ **NO SETUP, NO PLAN — AND THE SETUP'S DOORS STILL HOLD.** Without saved answers, or when the setup's
 * gate is shut (under 18; no target), this screen hands straight to Meal Plan Setup, which says why.
 *
 * ⚠ **A WEEK BUILT ON OLD ANSWERS IS REBUILT ON OPEN** (`resolveWeek`): a new target or a changed setup
 * rebuilds it, keeping locks that still fit — a lock can never carry an allergen back in.
 *
 * Deltas from the `.dc`, each deliberate:
 *  · The budget line ("Estimated $X of your $Y budget") uses the Grocery List's sourced USDA ERS / BLS
 *    prices, and says how many items it could not price rather than inventing them.
 *  · **"Log meal" writes a real diary row** (a quick-add labelled "Forge recipe", ON THE MEAL'S OWN DAY, in
 *    that meal's slot) and "Logged" removes exactly that row. A day that has not begun cannot be logged —
 *    its meals wait on Nutrition Home with a checkbox (0228, plan ahead).
 *  · The `.dc`'s preview fixtures (a pre-locked Wednesday dinner, a pre-logged Monday breakfast) are
 *    not reproduced.
 *  · Open recipe goes to Recipe (`Recipe.dc.html`), whose Swap comes back here and opens this sheet;
 *    Grocery list goes to `Grocery List.dc.html`.
 */
function MealPlanScreen() {
  const router = useRouter();
  const barBottom = useBarBottom();
  const { showToast } = useToast();
  const scrollRef = useRef<ScrollView>(null);
  const dayY = useRef<number[]>([]);
  const stripH = useRef(0);
  const jumping = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [todayIso] = useState(() => localToday());
  const monday = mondayOf(todayIso);
  const dates = useMemo(() => weekDates(monday), [monday]);
  /* QA N-09: the week opens on today, and today is marked — a plan made on Saturday is not read from Monday. */
  const todayIdx = Math.max(0, dates.findIndex((x) => x.iso === todayIso));
  const landed = useRef(false);

  const [reloads, setReloads] = useState(0);
  const [picked, setPicked] = useState<{ d: number; i?: number; slot?: PlanSlotName; mode: 'actions' | 'swap' | 'snack' | 'pick' } | null>(null);
  /* Back from Edit setup, Targets or Recipe: re-read, so the week reflects what just changed. */
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));
  /* Recipe's Swap comes back here with a request waiting (`lib/meal-plan-intent.ts`). One read per
     focus, the `consumeMealHint` pattern — no state is set from an effect. */
  const swapQ = useQuery(takeSwapRequestAsync, [reloads]);
  const [handledSwap, setHandledSwap] = useState<object | null>(null);
  const requested = swapQ.data && swapQ.data !== handledSwap ? swapQ.data : null;
  const sheet = requested ? { d: requested.d, i: requested.i, mode: 'swap' as const } : picked;
  /* "Choose my own": which days the pick goes on. Back to just the tapped day each time the picker opens. */
  const [span, setSpan] = useState<PlaceSpan>('day');
  const setSheet = (next: typeof picked) => {
    if (requested) setHandledSwap(requested);
    if (next?.mode === 'pick') setSpan('day');
    setPicked(next);
  };

  /* The athlete's recipes go into the book BEFORE a week is resolved — a stored week naming one would
     otherwise look unreadable and be rebuilt (`registerUserRecipes`). */
  const mineQ = useQuery(fetchUserRecipes, [reloads]);
  const prefsQ = useQuery(fetchMealPlanPrefs, [reloads]);
  const profileQ = useQuery(fetchNutritionProfile, [reloads]);
  const targetQ = useQuery(useCallback(() => fetchTargetsOn(todayIso), [todayIso]), [todayIso, reloads]);
  const storedQ = useQuery(useCallback(() => fetchMealPlanWeek(monday), [monday]), [monday, reloads]);

  const loaded = mineQ.settled && prefsQ.settled && profileQ.settled && targetQ.settled && storedQ.settled;
  const prefs = prefsQ.data ?? null;
  const target = targetQ.data ?? null;
  const gate = loaded ? setupGate(profileQ.data?.birthYear ?? null, target, todayIso) : null;
  const ready = loaded && !!prefs && gate == null && !!target;

  const resolved = useMemo(
    () =>
      /* `mineQ.data` is read here on purpose: the athlete's recipes are registered into the book as that
         query lands, and the week must re-resolve against them. */
      ready && prefs && target && mineQ.data
        ? resolveWeek(storedQ.data ?? null, prefs, prefs.updatedAt, target, monday)
        : null,
    [ready, prefs, target, storedQ.data, monday, mineQ.data],
  );

  /* The athlete's edits this visit, tied to the week they were made on. When the week underneath is
     re-read (focus) or rebuilt (new setup, new target), `base` no longer matches and the edits give way
     — they were saved, so the re-read already carries them. */
  const [edits, setEdits] = useState<{ base: MealPlanWeek; week: MealPlanWeek } | null>(null);
  const week = edits && resolved && edits.base === resolved.week ? edits.week : (resolved?.week ?? null);

  /* A freshly built (or rebuilt) week is saved once, so reopening shows the same week. No state is set
     here — the save is fire-and-forget and the screen is already drawing the built week. */
  useEffect(() => {
    if (resolved?.rebuilt) saveMealPlanWeek(resolved.week).catch(() => undefined);
  }, [resolved]);

  const [open, setOpen] = useState<Record<number, boolean>>({});
  /*
   * ══ HOLT FILLS THE WEEK ══ (`domain/nutrition/holt-fill.ts`). One coach-kitchen call per empty meal, only
   * fully-matched dishes inside the setup, then a list the athlete confirms before anything is saved.
   */
  const premiumAi = usePremiumAi();
  const nutritionAccess = useNutritionAccess();
  /* "Only plan from my recipes" (0226) means Holt is never offered to write dishes into the week. */
  const canHolt = premiumAi && nutritionAccess && !prefsQ.data?.ownRecipesOnly;
  const [fill, setFill] = useState<
    { phase: 'writing' } | { phase: 'review'; picks: { slot: PlanSlotName; card: DishCard }[] } | { phase: 'saving' } | null
  >(null);
  const [active, setActive] = useState(todayIdx);
  const [busy, setBusy] = useState(false);
  /* Clear week (PO 09-27): asked first, then saved BEFORE the screen shows it — a clear that failed to save
     would look done and refill on reopen. */
  const [clearing, setClearing] = useState<'ask' | 'saving' | null>(null);

  /* ⛔ The doors. No saved setup, or a gate the setup would show — hand over, and let it explain. */
  if (loaded && (!prefs || gate != null || !target)) return <Redirect href="/meal-plan-setup" />;

  const commit = async (next: MealPlanWeek, toast?: string) => {
    if (resolved) setEdits({ base: resolved.week, week: next });
    setSheet(null);
    try {
      await saveMealPlanWeek(next);
      if (toast) showToast(toast);
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (jumping.current) return;
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const line = contentOffset.y + stripH.current + 24;
    let a = 0;
    dayY.current.forEach((y, d) => {
      if (y <= line) a = d;
    });
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 4) a = 6;
    if (a !== active) setActive(a);
  };

  const jump = (d: number) => {
    const y = dayY.current[d];
    if (y == null) return;
    if (jumping.current) clearTimeout(jumping.current);
    jumping.current = setTimeout(() => {
      jumping.current = null;
    }, 700);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - stripH.current - 12), animated: true });
    setActive(d);
  };

  const targetKcal = target?.kcal ?? 0;

  const startFill = async (only?: PlanSlotName) => {
    if (!week || !prefs || fill) return;
    const slots = only ? [only] : emptySlots(week.days, prefs.meals);
    if (!slots.length) return;
    /* One consent sheet for the whole fill, before anything is sent (MHMDA). */
    if (!(await ensureConsent('ai_sharing'))) {
      showToast(AI_DECLINED_LINE);
      return;
    }
    setFill({ phase: 'writing' });
    const [recent, mine] = await Promise.all([recentKitchenDishesLive(), fetchUserRecipes().catch(() => [])]);
    const exclude = [...new Set([...mine.map((u) => u.name), ...recent])].slice(0, 40);
    const avoid = fillAvoid(prefs);
    const picks: { slot: PlanSlotName; card: DishCard }[] = [];
    let failure: string | null = null;
    const results = await Promise.all(
      slots.map((slot, i) =>
        askKitchenLive({ have: [], ask: fillAsk(slot, prefs), avoid, exclude, nudge: null, lean: rotationLeanToday(i), left: null, minor: false }),
      ),
    );
    results.forEach((r, i) => {
      if (r.kind !== 'ok') {
        if (r.kind === 'no_consent') failure = AI_DECLINED_LINE;
        else if (r.kind !== 'stop') failure = kitchenError(r);
        return;
      }
      void rememberKitchenDishesLive(r.dishes);
      for (const card of plannable(dishCards(r.dishes, prefs.allergens, prefs.diet), prefs.cookMinutes)) picks.push({ slot: slots[i], card });
    });
    if (!picks.length) {
      setFill(null);
      showToast(failure ?? "Holt couldn't write dishes that fit your setup. Try loosening the cook time.");
      return;
    }
    setFill({ phase: 'review', picks });
  };

  /* The athlete's tap on the list that showed every dish's allergens — the confirmation `formForPlan` relies on. */
  const acceptFill = async (picks: { slot: PlanSlotName; card: DishCard }[]) => {
    if (!week || !prefs || !target) return;
    setFill({ phase: 'saving' });
    try {
      const now = new Date().toISOString();
      /* TRIAL (0227): in this week, not in My Recipes — the athlete saves one from its Recipe screen once they've
         tried it (PO 09-27: "I don't want to save them all cause I haven't even tried them"). */
      for (const { slot, card } of picks) await saveUserRecipe({ ...recipeFrom(formForPlan(card, slot), '', now), id: null, trial: true });
      await fetchUserRecipes(); // registers them in the book before the rebuild reads it
      await commit(rebuildWeek(week, prefs, target), `Holt's dishes are in your week · open one to save it`);
      setReloads((n) => n + 1);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setFill(null);
    }
  };
  const anyEmpty = !!week && !!prefs && emptySlots(week.days, prefs.meals).length > 0;

  const confirmClear = async () => {
    if (!week || !resolved) return;
    setClearing('saving');
    const next = clearWeek(week);
    try {
      await saveMealPlanWeek(next);
      setEdits({ base: resolved.week, week: next });
      showToast('Week cleared');
      setClearing(null);
    } catch (e) {
      showToast(errorMessage(e));
      setClearing('ask');
    }
  };

  /* ── the sheet ── */
  let sheetTitle = '';
  let sheetMeta = '';
  let sheetBody: ReactNode = null;
  if (week && prefs && sheet) {
    const { d, mode } = sheet;
    const day = week.days[d];
    const total = dayTotals(day).kcal;
    if (mode === 'pick' && sheet.slot && target) {
      /* ══ CHOOSE MY OWN ══ (PO 09-26: "I need to be able to add in my own things where I want.") Any of the
         athlete's recipes, made-for-this-meal first, then their saved meals ("sometimes people repeat the meal
         for lunches or dinners") — on this day, Monday–Friday, or every day. Each pick is locked, so a
         rebuild keeps it (`placeOnDays` → `placeMeal`). */
      const slot = sheet.slot;
      const picks = ownPicks(slot, prefs);
      const meals = mealPicks();
      const hidden = ownPicksHidden(prefs);
      const slotWord = SLOT_LABEL[slot].toLowerCase();
      const place = (recipeId: string, name: string) => {
        const out = placeOnDays(week, spanDays(span, d), slot, recipeId, prefs, target);
        const where = span === 'day' ? dates[d].name : span === 'weekdays' ? 'Monday to Friday' : 'every day';
        void commit({ ...week, days: out.days, locked: out.locked }, `${name} · ${where} ${slotWord} · kept on rebuild`);
      };
      sheetTitle = `${dates[d].name} ${slotWord}`;
      sheetMeta = 'Your recipes and meals. What you pick here stays when you rebuild the week.';
      sheetBody = (
        <View>
          <View style={styles.spanRow} accessibilityRole="radiogroup">
            {(
              [
                ['day', `Just ${dates[d].name}`],
                ['weekdays', 'Mon–Fri'],
                ['week', 'Every day'],
              ] as [PlaceSpan, string][]
            ).map(([key, label]) => {
              const on = span === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.spanChip, on && styles.spanChipOn]}
                  onPress={() => setSpan(key)}
                >
                  <Text style={[styles.spanText, on && styles.spanTextOn]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          {picks.length ? <Text style={styles.pickLabel}>Your recipes</Text> : null}
          <OptionList
            empty={false}
            options={picks.map(({ recipe, forSlot }) => ({
              key: recipe.id,
              name: recipe.name,
              cal: recipe.kcal,
              sub: `${recipe.minutes} min · ${recipe.protein}g protein${forSlot ? '' : ` · not tagged ${slotWord}`}`,
              pick: () => place(recipe.id, recipe.name),
            }))}
          />
          {meals.length ? <Text style={styles.pickLabel}>Your meals</Text> : null}
          <OptionList
            empty={false}
            options={meals.map((m) => ({
              key: m.id,
              name: m.name,
              cal: m.kcal,
              sub: `Saved meal · ${m.protein}g protein`,
              pick: () => place(m.id, m.name),
            }))}
          />
          {!picks.length && !meals.length ? (
            <Text style={styles.optionEmpty}>Nothing of yours can go in your plans yet. Add a recipe or a meal below.</Text>
          ) : null}
          {hidden.count ? (
            <Text style={styles.optionEmpty}>{`${hidden.count} of your recipes can't go in your plans (${hidden.example}).`}</Text>
          ) : null}
          <View style={styles.actions}>
            <ActionRow
              icon={<BookGlyph />}
              label="New recipe"
              hint={canHolt ? 'Type one in or add a picture' : 'Type one in'}
              onPress={() => {
                setSheet(null);
                /* `add=1`: the ways to add one — type it, or a picture — not straight into a blank form. */
                router.push({ pathname: '/my-recipes', params: { add: '1' } });
              }}
            />
            <ActionRow
              icon={<MealGlyph />}
              label="New meal"
              hint="Foods you eat together, like your usual lunch"
              last={!canHolt}
              onPress={() => {
                setSheet(null);
                router.push({ pathname: '/my-foods', params: { newMeal: '1' } });
              }}
            />
            {canHolt ? (
              <ActionRow
                icon={<SwapGlyph />}
                label={`Ask Holt for a ${SLOT_LABEL[slot].toLowerCase()}`}
                hint="He writes dishes that fit your setup; you confirm them"
                last
                onPress={() => {
                  setSheet(null);
                  void startFill(slot);
                }}
              />
            ) : null}
          </View>
        </View>
      );
    } else if (mode === 'snack' && target) {
      const opts = snackOptions(week.days, d, prefs, target, 3);
      sheetTitle = `Add a snack to ${dates[d].name}`;
      sheetMeta = `${grouped(shortBy(day, targetKcal))} cal short of ${grouped(targetKcal)}.`;
      sheetBody = (
        <OptionList
          empty={!opts.length}
          options={opts.map((o) => ({
            key: o.recipe.id,
            name: o.recipe.name,
            cal: o.kcal,
            sub: `${Math.round(o.recipe.protein * o.portion)}g protein · day total ${grouped(total + o.kcal)}`,
            pick: () => void commit({ ...week, days: addSnack(week.days, d, o) }),
          }))}
        />
      );
    } else if (sheet.i != null && day.items[sheet.i] && target) {
      const i = sheet.i;
      const it = day.items[i];
      const r = RECIPE_BY_ID[it.recipeId];
      const mine = itemTotals(it).kcal;
      const isLocked = !!week.locked[slotKey(d, it)];
      const loggedId = week.logged[logKey(d, it)];
      if (mode === 'swap') {
        const opts = alternatives(week.days, d, i, prefs, target, 3);
        sheetTitle = `Swap ${dates[d].name} ${it.extra ? 'snack' : it.slot === 'snacks' ? 'snack' : it.slot}`;
        sheetMeta = `Replacing ${r.name}.`;
        sheetBody = (
          <OptionList
            empty={!opts.length}
            onBack={() => setSheet({ d, i, mode: 'actions' })}
            options={opts.map((o) => ({
              key: o.recipe.id,
              name: o.recipe.name,
              cal: o.kcal,
              sub: `${o.recipe.minutes} min${o.portion !== 1 ? ` · ${portionLabel(o.portion)}` : ''} · day total ${grouped(total - mine + o.kcal)}`,
              pick: () => {
                const out = swapMeal(week.days, week.locked, d, i, { recipeId: o.recipe.id, portion: o.portion }, prefs, target);
                void commit({ ...week, days: out.days, locked: out.locked });
              },
            }))}
          />
        );
      } else {
        sheetTitle = r.name;
        const meal = isSavedMeal(it.recipeId);
        sheetMeta = `${grouped(mine)} cal · ${meal ? 'Saved meal' : it.leftover && it.cookDay != null ? `Leftover from ${dates[it.cookDay].name} dinner` : `${r.minutes} min`}${it.portion !== 1 ? ` · ${portionLabel(it.portion)}` : ''}`;
        sheetBody = (
          <View style={styles.actions}>
            {/* A saved meal has no recipe page — its foods are in My Meals. */}
            {!meal ? (
              <ActionRow
                icon={<BookGlyph />}
                label="Open recipe"
                onPress={() => {
                  setSheet(null);
                  router.push({ pathname: '/recipe', params: { id: it.recipeId, d: String(d), i: String(i) } });
                }}
              />
            ) : null}
            <ActionRow icon={<SwapGlyph />} label="Swap meal" chevron onPress={() => setSheet({ d, i, mode: 'swap' })} />
            {!it.extra ? (
              <ActionRow icon={<BookGlyph />} label="Choose my own" hint="Any of your recipes or meals · kept when you rebuild" chevron onPress={() => setSheet({ d, i, slot: it.slot, mode: 'pick' })} />
            ) : null}
            <ActionRow
              icon={<LockGlyph shut={isLocked} />}
              label={isLocked ? 'Locked' : 'Lock meal'}
              hint={isLocked ? 'Kept when you rebuild · tap to unlock' : 'Keep this one if you rebuild'}
              onPress={() => void commit({ ...week, locked: toggleLock(week.days, week.locked, d, i) })}
            />
            <ActionRow
              icon={<LogGlyph logged={!!loggedId} />}
              label={loggedId ? 'Logged' : 'Log meal'}
              hint={
                loggedId
                  ? 'Tap to remove from the diary'
                  : dates[d].iso === todayIso
                    ? 'Adds it to today’s diary'
                    : dates[d].iso < todayIso
                      ? `Adds it to ${dates[d].name}’s diary`
                      : `It waits on Nutrition · check it off on ${dates[d].name}`
              }
              last
              onPress={async () => {
                if (busy) return;
                setBusy(true);
                try {
                  /* On the day it is PLANNED for (0228) — Monday's dinner logged on Tuesday is Monday's. */
                  const out = await togglePlanLog(week, d, i, dates[d].iso);
                  await commit(
                    out.week,
                    out.logged ? (dates[d].iso === todayIso ? 'Added to today’s diary' : `Added to ${dates[d].name}’s diary`) : 'Removed from diary',
                  );
                } catch (e) {
                  setSheet(null);
                  showToast(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </View>
        );
      }
    }
  }

  /* The `.dc`'s budget line, on sourced prices: what this week's shop costs, staples at home excluded. */
  let budgetLine = '';
  if (week && prefs?.weeklyBudgetUsd) {
    const list = groceryList(week.days, prefs.household);
    const e = estimateFor(list, stateFor(null, list, ''));
    budgetLine = budgetLineFor(e, prefs.weeklyBudgetUsd);
  }

  /* Locks + logged meals — everything a rebuild keeps (logged meals are frozen, Rules §3). */
  const keptCount = week && prefs ? Object.keys(keptLocks(week, prefs)).length : 0;
  /* Nothing planned anywhere means the book is empty, not that the setup is wrong. Forge ships no recipes
     since 2026-09-24, so say where recipes come from rather than "No lunch fits your setup" seven times. */
  const weekEmpty = !!week && week.days.every((day) => day.items.length === 0);
  /* QA N-10: a small recipe book repeats meals and may have no snack at all. Say it ONCE at the top, and
     don't print an empty Snack row on all seven days. */
  const noSnackAnywhere =
    !!week && !weekEmpty && !!prefs?.meals.includes('snacks') && week.days.every((day) => !day.items.some((it) => it.slot === 'snacks'));
  const repeats = !!week && week.days.some((day) => day.items.some((it) => it.repeated));
  const smallBook = !weekEmpty && !week?.cleared && (repeats || noSnackAnywhere);

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.46)' }} />
      <AppBar title="" transparent onBack={() => router.back()} />

      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[1]}
        onScroll={onScroll}
        scrollEventThrottle={32}
      >
        <View style={styles.identity}>
          <Text style={styles.eyebrow}>Nutrition</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>This week</Text>
            <Text style={styles.range}>{weekRange(dates)}</Text>
          </View>
          {prefs && target ? (
            <Text style={styles.lede}>{`Built around ${grouped(target.kcal)} cal a day · cooking for ${prefs.household}.`}</Text>
          ) : null}
          {week && !weekEmpty ? (
            <Pressable accessibilityRole="button" hitSlop={6} style={styles.clearLink} onPress={() => setClearing('ask')}>
              <Text style={styles.linkQuiet}>Clear week</Text>
            </Pressable>
          ) : null}
          {week?.cleared && weekEmpty ? (
            <View style={styles.short}>
              <Text style={styles.shortText}>Week cleared. Tap + Add on any meal, or</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => {
                  if (!prefs || !target) return;
                  void commit(rebuildWeek(week, prefs, target), 'Week rebuilt');
                }}
              >
                <Text style={styles.shortLink}>rebuild it</Text>
              </Pressable>
            </View>
          ) : anyEmpty && canHolt ? (
            <View style={styles.short}>
              <Text style={styles.shortText}>{weekEmpty ? 'No recipes to plan from yet.' : 'Some meals have nothing that fits yet.'}</Text>
              <Pressable accessibilityRole="button" hitSlop={6} onPress={() => void startFill()} disabled={!!fill}>
                <Text style={styles.shortLink}>{fill?.phase === 'writing' ? 'Holt is writing…' : 'Let Holt fill them'}</Text>
              </Pressable>
              {/* Her own recipes are the other way to fill a week (PO 09-26) — offered beside Holt, not behind him. */}
              <Text style={styles.shortText}>or</Text>
              <Pressable accessibilityRole="button" hitSlop={6} onPress={() => router.push({ pathname: '/my-recipes', params: { add: '1' } })}>
                <Text style={styles.shortLink}>add a recipe</Text>
              </Pressable>
            </View>
          ) : weekEmpty ? (
            <View style={styles.short}>
              <Text style={styles.shortText}>No recipes to plan from yet.</Text>
              <Pressable accessibilityRole="button" hitSlop={6} onPress={() => router.push({ pathname: '/my-recipes', params: { add: '1' } })}>
                <Text style={styles.shortLink}>Add a recipe</Text>
              </Pressable>
            </View>
          ) : smallBook ? (
            <View style={styles.short}>
              <Text style={styles.shortText}>
                {`Only a few recipes to plan from${repeats ? ', so some meals repeat' : ''}${noSnackAnywhere ? `${repeats ? ' and' : ','} no snack fits yet` : ''}.`}
              </Text>
              <Pressable accessibilityRole="button" hitSlop={6} onPress={() => router.push({ pathname: '/my-recipes', params: { add: '1' } })}>
                <Text style={styles.shortLink}>Add a recipe</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* sticky day strip */}
        <View
          style={styles.strip}
          onLayout={(e: LayoutChangeEvent) => {
            stripH.current = e.nativeEvent.layout.height;
          }}
        >
          <View style={styles.stripRow}>
            {dates.map((dt, d) => {
              const on = active === d;
              return (
                <Pressable
                  key={dt.iso}
                  accessibilityRole="button"
                  accessibilityLabel={`${d === todayIdx ? 'Today, ' : ''}${dt.name} ${dt.label}`}
                  accessibilityState={{ selected: on }}
                  style={[styles.stripDay, on && styles.stripDayOn]}
                  onPress={() => jump(d)}
                >
                  <Text style={[styles.stripDow, d === todayIdx && styles.stripToday, on && styles.stripTextOn]} numberOfLines={1}>
                    {d === todayIdx ? 'Today' : dt.short}
                  </Text>
                  <Text style={[styles.stripNum, on && styles.stripTextOn]}>{dt.num}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {week
          ? week.days.map((day, d) => {
              const totals = dayTotals(day);
              const isOpen = !!open[d];
              /* A week the athlete cleared is theirs to fill: no "short" nag under seven empty days. */
              const gap = week.cleared ? 0 : shortBy(day, targetKcal);
              return (
                <View
                  key={dates[d].iso}
                  style={[styles.dayCard, d === 0 && styles.dayCardFirst]}
                  onLayout={(e: LayoutChangeEvent) => {
                    dayY.current[d] = e.nativeEvent.layout.y;
                    /* First layout of today's card: bring it up under the strip (once per visit). */
                    if (d === todayIdx && todayIdx > 0 && !landed.current) {
                      landed.current = true;
                      requestAnimationFrame(() => jump(d));
                    }
                  }}
                >
                  <View style={styles.dayHead}>
                    <View style={styles.dayName}>
                      <Text style={styles.dayTitle}>{dates[d].name}</Text>
                      <Text style={styles.dayDate}>{d === todayIdx ? `Today · ${dates[d].label}` : dates[d].label}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                      accessibilityLabel={`${grouped(totals.kcal)} of ${grouped(targetKcal)} calories. ${isOpen ? 'Hide' : 'Show'} macros`}
                      style={styles.totalButton}
                      onPress={() => setOpen((o) => ({ ...o, [d]: !o[d] }))}
                    >
                      <Text style={styles.total}>
                        {grouped(totals.kcal)}
                        <Text style={styles.totalOf}>{` / ${grouped(targetKcal)}`}</Text>
                      </Text>
                      <View style={isOpen ? styles.chevOpen : null}>
                        <Chevron />
                      </View>
                    </Pressable>
                  </View>

                  {isOpen && target ? (
                    <View style={styles.macros}>
                      {[
                        ['Protein', totals.protein, target.protein],
                        ['Carbs', totals.carb, target.carb],
                        ['Fat', totals.fat, target.fat],
                      ].map(([label, val, tgt]) => (
                        <Text key={label as string} style={styles.macro}>
                          {`${label} `}
                          <Text style={styles.macroVal}>{grouped(val as number)}</Text>
                          {` / ${grouped(tgt as number)}g`}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {day.items.map((it: PlanItem, i) => {
                    const r = RECIPE_BY_ID[it.recipeId];
                    const feeds = feedsDay(week.days, d, it);
                    const metaParts =
                      it.leftover && it.cookDay != null
                        ? [`From ${dates[it.cookDay].name} dinner`]
                        : isSavedMeal(it.recipeId)
                          ? ['Saved meal']
                          : [`${r.minutes} min`, ...(feeds != null ? [`leftovers for ${dates[feeds].name} lunch`] : [])];
                    if (it.portion !== 1) metaParts.push(portionLabel(it.portion));
                    /* PO 2026-09-23 (open question 1): when the library runs out, repeat — and say so. */
                    if (it.repeated) metaParts.push('Repeated');
                    const meta = metaParts.join(' · ');
                    const kcal = itemTotals(it).kcal;
                    const logged = !!week.logged[logKey(d, it)];
                    const locked = !!week.locked[slotKey(d, it)];
                    return (
                      <Pressable
                        key={`${slotKey(d, it)}-${i}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${SLOT_LABEL[it.slot]}: ${r.name}, ${kcal} calories`}
                        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                        onPress={() => setSheet({ d, i, mode: 'actions' })}
                      >
                        <View style={styles.itemText}>
                          <View style={styles.itemSlotRow}>
                            <Text style={styles.itemSlot}>{SLOT_LABEL[it.slot]}</Text>
                            {logged ? (
                              <View accessibilityLabel="Logged">
                                <CheckGlyph />
                              </View>
                            ) : null}
                            {it.leftover ? (
                              <>
                                <Text style={styles.dot}>·</Text>
                                <Pill size="sm">Leftover</Pill>
                              </>
                            ) : null}
                          </View>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {r.name}
                          </Text>
                          <Text style={styles.itemMeta}>{meta}</Text>
                        </View>
                        <View style={styles.itemRight}>
                          {locked ? (
                            <View accessibilityLabel="Locked">
                              <LockGlyph shut small />
                            </View>
                          ) : null}
                          <Text style={styles.itemCal}>
                            {grouped(kcal)}
                            <Text style={styles.itemCalUnit}> cal</Text>
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}

                  {/* A slot nothing in the library fits at all: said plainly, never filled with a
                      recipe the hard filters refused (Rules §3). */}
                  {(prefs?.meals ?? [])
                    .filter((s) => !day.items.some((it) => it.slot === s && !it.extra))
                    .filter((s) => !(s === 'snacks' && noSnackAnywhere))
                    .map((s) => (
                      <Pressable
                        key={`empty-${s}`}
                        style={styles.item}
                        accessibilityRole="button"
                        accessibilityLabel={`${dates[d].name} ${SLOT_LABEL[s]}: add your own`}
                        onPress={() => setSheet({ d, slot: s, mode: 'pick' })}
                      >
                        <View style={styles.itemText}>
                          <Text style={styles.itemSlot}>{SLOT_LABEL[s]}</Text>
                          <Text style={styles.itemMeta}>{`Nothing planned yet.`}</Text>
                        </View>
                        <Text style={styles.shortLink}>+ Add</Text>
                      </Pressable>
                    ))}

                  {/* A snack closes a small gap; a whole empty meal is not a snack's job (PO 09-26: "Monday is 2,290
                      short. Add a snack?"). With a meal empty, the offer is Holt's dishes — or nothing. */}
                  {gap > 0 && prefs && dayHasEmptySlot(day, prefs.meals) ? (
                    canHolt ? (
                      <View style={styles.short}>
                        <Text style={styles.shortText}>{`${dates[d].name} is ${grouped(gap)} short.`}</Text>
                        <Pressable accessibilityRole="button" hitSlop={6} onPress={() => void startFill()} disabled={!!fill}>
                          <Text style={styles.shortLink}>{fill?.phase === 'writing' ? 'Holt is writing…' : 'Let Holt fill it'}</Text>
                        </Pressable>
                      </View>
                    ) : null
                  ) : gap > 0 ? (
                    <View style={styles.short}>
                      <Text style={styles.shortText}>{`${dates[d].name} is ${grouped(gap)} short.`}</Text>
                      <Pressable accessibilityRole="button" hitSlop={6} onPress={() => setSheet({ d, mode: 'snack' })}>
                        <Text style={styles.shortLink}>Add a snack?</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })
          : null}
      </ScrollView>

      {week ? (
        <View style={[styles.footer, { paddingBottom: barBottom }]}>
          {budgetLine ? <Text style={styles.budgetLine}>{budgetLine}</Text> : null}
          <Button variant="primary" fullWidth onPress={() => router.push('/grocery-list')}>
            Grocery list
          </Button>
          <View style={styles.footerLinks}>
            <Pressable accessibilityRole="button" hitSlop={6} onPress={() => router.push('/my-recipes')}>
              <Text style={styles.linkQuiet}>My recipes</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => {
                if (!prefs || !target) return;
                void commit(rebuildWeek(week, prefs, target), keptCount ? `Week rebuilt · ${keptCount} kept` : 'Week rebuilt');
              }}
            >
              <Text style={styles.linkBronze}>Rebuild week</Text>
            </Pressable>
            <Pressable accessibilityRole="button" hitSlop={6} onPress={() => router.push('/meal-plan-setup')}>
              <Text style={styles.linkQuiet}>Edit setup</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Holt's dishes, before anything is saved: each with the allergens the app derived. "Add these" is the
          athlete confirming them (`formForPlan`). */}
      <BottomSheet
        open={fill?.phase === 'review' || fill?.phase === 'saving'}
        onClose={() => (fill?.phase === 'review' ? setFill(null) : undefined)}
        title="Holt's dishes for your week"
      >
        <View style={styles.sheetBody}>
          <Text style={styles.sheetMeta}>
            {"Every number is the app's, from these ingredients. Check the allergens: adding them confirms them for this plan. They go in your week, not My Recipes. Open one you like and tap Save to My Recipes."}
          </Text>
          {fill?.phase === 'review'
            ? fill.picks.map(({ slot, card }, k) => (
                <View key={`${card.name}-${k}`} style={styles.item}>
                  <View style={styles.itemText}>
                    <Text style={styles.itemSlot}>{SLOT_LABEL[slot]}</Text>
                    <Text style={styles.itemMeta}>{card.name}</Text>
                    <Text style={styles.itemMeta}>{`${card.minutes ? `${card.minutes} min · ` : ''}${grouped(card.kcal)} cal · ${card.protein} g protein · ${allergenLine(card)}`}</Text>
                  </View>
                </View>
              ))
            : null}
          <View style={styles.actions}>
            <Button
              variant="primary"
              fullWidth
              disabled={fill?.phase !== 'review'}
              onPress={() => (fill?.phase === 'review' ? void acceptFill(fill.picks) : undefined)}
            >
              {fill?.phase === 'saving' ? 'Adding…' : 'Use these this week'}
            </Button>
            <Button variant="text" fullWidth onPress={() => setFill(null)} disabled={fill?.phase === 'saving'}>
              Not now
            </Button>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet open={clearing != null} onClose={() => (clearing === 'ask' ? setClearing(null) : undefined)} title="Clear this week?">
        <View style={styles.sheetBody}>
          <Text style={styles.sheetMeta}>
            Every meal comes off the plan, locked ones too. Anything you logged stays in your diary.
          </Text>
          <View style={styles.actions}>
            <Button variant="primary" fullWidth disabled={clearing !== 'ask'} onPress={() => void confirmClear()}>
              {clearing === 'saving' ? 'Clearing…' : 'Clear week'}
            </Button>
            <Button variant="text" fullWidth onPress={() => setClearing(null)} disabled={clearing === 'saving'}>
              Keep it
            </Button>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet open={!!sheet && !!sheetBody} onClose={() => setSheet(null)} title={sheetTitle}>
        <View style={styles.sheetBody}>
          <Text style={styles.sheetMeta}>{sheetMeta}</Text>
          {sheetBody}
        </View>
      </BottomSheet>
    </View>
  );
}

const SLOT_LABEL: Record<PlanSlotName, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snack',
};

/* ── pieces ──────────────────────────────────────────────────────────────── */

function OptionList({
  options,
  empty,
  onBack,
}: {
  options: { key: string; name: string; cal: number; sub: string; pick: () => void }[];
  empty: boolean;
  onBack?: () => void;
}) {
  return (
    <View style={styles.options}>
      {options.map((o) => (
        <Pressable key={o.key} accessibilityRole="button" style={styles.option} onPress={o.pick}>
          <View style={styles.optionText}>
            <Text style={styles.optionName} numberOfLines={1}>
              {o.name}
            </Text>
            <Text style={styles.optionSub}>{o.sub}</Text>
          </View>
          <Text style={styles.optionCal}>
            {grouped(o.cal)}
            <Text style={styles.itemCalUnit}> cal</Text>
          </Text>
        </Pressable>
      ))}
      {empty ? <Text style={styles.optionEmpty}>Nothing else fits this spot with your setup.</Text> : null}
      {onBack ? (
        <Pressable accessibilityRole="button" style={styles.back} onPress={onBack}>
          <Text style={styles.linkQuiet}>Back</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ActionRow({
  icon,
  label,
  hint,
  chevron,
  last,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  chevron?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" style={[styles.actionRow, !last && styles.actionDivider]} onPress={onPress}>
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        {hint ? <Text style={styles.actionHint}>{hint}</Text> : null}
      </View>
      {chevron ? <Chevron /> : null}
    </Pressable>
  );
}

function Chevron() {
  return <EngravedIcon name="chevron-right" size={14} color={flColor.gray400} />;
}

function CheckGlyph() {
  return <EngravedIcon name="check" size={12} color={flColor.bronze400} />;
}

function LockGlyph({ shut, small }: { shut: boolean; small?: boolean }) {
  return <EngravedIcon name={shut ? 'lock' : 'unlock'} size={small ? 14 : 17} />;
}

function LogGlyph({ logged }: { logged: boolean }) {
  return <EngravedIcon name={logged ? 'check' : 'plus'} size={17} />;
}

function MealGlyph() {
  return <EngravedIcon name="list-plus" size={17} />;
}

function BookGlyph() {
  return <EngravedIcon name="book" size={17} />;
}

function SwapGlyph() {
  return <EngravedIcon name="swap" size={17} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28 },

  identity: { gap: 6, paddingHorizontal: 2, paddingTop: 2, paddingBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.labelInk },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  title: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100, letterSpacing: -0.3, lineHeight: 34 },
  range: { fontSize: 14, fontWeight: '600', color: flColor.gray400 },
  lede: { marginTop: 4, fontSize: 14, lineHeight: 21, color: flColor.gray400 },

  strip: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: flColor.charcoal900,
    borderBottomWidth: 1,
    borderBottomColor: flColor.divider,
  },
  stripRow: { flexDirection: 'row', gap: 6 },
  stripDay: {
    flex: 1,
    minWidth: 0,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  stripDayOn: { backgroundColor: flColor.selectedFill, borderColor: flColor.accentBorder },
  stripDow: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, color: flColor.gray400 },
  stripNum: { fontSize: 15, fontWeight: '600', color: flColor.gray400 },
  stripTextOn: { color: flColor.selectedInk },
  stripToday: { color: flColor.cream100, letterSpacing: 0 },

  dayCard: {
    marginTop: 14,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
    overflow: 'hidden',
  },
  dayCardFirst: { marginTop: 16 },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 10, paddingBottom: 6, paddingLeft: 16, paddingRight: 8 },
  dayName: { flexDirection: 'row', alignItems: 'baseline', gap: 8, minWidth: 0, flexShrink: 1 },
  dayTitle: { fontFamily: flFont.display, fontSize: 19, color: flColor.cream100 },
  dayDate: { fontSize: 12.5, color: flColor.gray400 },
  totalButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40, paddingHorizontal: 8, borderRadius: flRadius.md },
  total: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  totalOf: { fontWeight: '500', color: flColor.gray400 },
  chevOpen: { transform: [{ rotate: '90deg' }] },

  macros: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6, paddingHorizontal: 16, paddingBottom: 12 },
  macro: { fontSize: 12.5, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  macroVal: { fontWeight: '600', color: flColor.cream100 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: flColor.divider,
  },
  itemPressed: { backgroundColor: flColor.hoverWash },
  itemText: { flex: 1, minWidth: 0, gap: 3 },
  itemSlotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 18 },
  itemSlot: { fontSize: 12, color: flColor.gray400 },
  dot: { color: flColor.charcoal500 },
  itemName: { fontSize: 15, fontWeight: '600', lineHeight: 20, color: flColor.cream100 },
  itemMeta: { fontSize: 12.5, color: flColor.gray400 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemCal: { fontSize: 15, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  itemCalUnit: { fontSize: 11, fontWeight: '500', color: flColor.gray400 },

  short: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    paddingTop: 4,
    paddingBottom: 6,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: flColor.divider,
  },
  shortText: { fontSize: 13, color: flColor.gray400 },
  shortLink: { paddingVertical: 10, paddingHorizontal: 2, fontSize: 13, fontWeight: '600', color: flColor.bronzeInk },

  footer: {
    gap: 6,
    paddingTop: 14,
    paddingBottom: SCREEN_BOTTOM_GAP,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.divider,
    backgroundColor: flColor.charcoal900,
  },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  clearLink: { alignSelf: 'flex-start', marginLeft: -4 },
  budgetLine: { textAlign: 'center', fontSize: 12.5, color: flColor.gray400, paddingBottom: 4 },
  linkBronze: { paddingVertical: 10, paddingHorizontal: 4, fontSize: 13, fontWeight: '600', color: flColor.bronzeInk },
  linkQuiet: { paddingVertical: 10, paddingHorizontal: 4, fontSize: 13, fontWeight: '600', color: flColor.gray400 },

  sheetBody: { paddingBottom: 12 },
  sheetMeta: { marginTop: -8, fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  actions: { marginTop: 14 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 8, paddingHorizontal: 2 },
  actionDivider: { borderBottomWidth: 1, borderBottomColor: flColor.divider },
  actionIcon: { width: 20, alignItems: 'center' },
  actionText: { flex: 1, gap: 2 },
  actionLabel: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  actionHint: { fontSize: 12.5, color: flColor.gray400 },

  options: { gap: 6, marginTop: 16 },
  option: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  optionText: { flex: 1, minWidth: 0, gap: 3 },
  optionName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  optionSub: { fontSize: 12, color: flColor.gray400 },
  optionCal: { fontSize: 14, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  optionEmpty: { fontSize: 13, color: flColor.gray400 },
  pickLabel: { paddingTop: 14, paddingBottom: 2, fontSize: 11, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.labelInk },
  spanRow: { flexDirection: 'row', gap: 6, paddingBottom: 4 },
  spanChip: {
    flex: 1,
    minWidth: 0,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  spanChipOn: { backgroundColor: flColor.selectedFill, borderColor: flColor.accentBorder },
  spanText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  spanTextOn: { color: flColor.selectedInk },
  back: { alignSelf: 'center', marginTop: 6 },
});

/** Premium since 0244 (PO decision "B", 2026-09-29) — Free athletes meet `NutritionPlannerGate` instead. */
export default function MealPlanScreenRoute() {
  return (
    <NutritionPlannerGate what="The meal planner">
      <MealPlanScreen />
    </NutritionPlannerGate>
  );
}
