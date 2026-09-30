import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { Pill } from '@/components/forge/composites/Pill';
import { ScreenBackground } from '@/components/screen-background';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { grouped, localToday, shiftDay } from '@/domain/nutrition/day';
import { ALLERGENS } from '@/domain/nutrition/meal-plan-setup';
import { DAY_NAMES, RECIPE_BY_ID, feedsDay, itemTotals, logKey, mondayOf, portionLabel, recipeView, slotKey, toggleLock } from '@/domain/nutrition/meal-planner';
import { batchNote, ingredientRows, servingsFor, servingsLabel, stepsNote } from '@/domain/nutrition/recipe-view';
import { EatenSheet } from '@/components/forge/compositions/EatenSheet';
import {
  deleteUserRecipe,
  fetchMealPlanPrefs,
  fetchMealPlanWeek,
  fetchUserRecipes,
  saveMealPlanWeek,
  saveUserRecipe,
  togglePlanLog,
} from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { requestSwap } from '@/lib/meal-plan-intent';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { useUnits } from '@/lib/settings';
import { logRecipeEaten } from '@/lib/log-recipe';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { NutritionPlannerGate } from '@/components/forge/NutritionPlannerGate';

const ALLERGEN_LABEL = Object.fromEntries(ALLERGENS.map((a) => [a.key, a.label])) as Record<string, string>;
const SLOT_LABEL: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snack' };

/**
 * Recipe — built to `Recipe.dc.html` (Claude Design b029488a). Opened from a meal on Meal Plan
 * (`?id=d02&d=0&i=2`), it knows where it sits in the week: whether it is a leftover, whether it feeds
 * tomorrow's lunch, whether it is locked or logged — and Swap / Lock / Log act on that meal.
 *
 * ⚠ **EVERY NUMBER IS FROM USDA × GRAMS** (`recipes-data.ts`, generated). The card says so. The `.dc`
 * has an "estimate" branch for recipes without detail; every Forge recipe has detail, so it never shows.
 *
 * ⚠ **SERVINGS DEFAULT TO WHAT THE COOK MAKES**, not the household: a dinner that also feeds tomorrow's
 * lunch prepares twice (`servingsFor`, per `Recipe Schema and Planner Rules` §3). A leftover prepares
 * nothing and says where it came from.
 *
 * ⚠ **"LOG MEAL" GOES PRIMARY ONCE YOU REACH THE END OF THE METHOD** — the `.dc`'s "cooking" state: the
 * button is quiet while you read and becomes the obvious next move when you have finished cooking.
 *
 * Swap hands back to Meal Plan and opens its swap sheet there (`lib/meal-plan-intent.ts`), exactly as
 * the `.dc`'s `goSwap` returns to the plan.
 */
function RecipeScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { units } = useUnits();
  const params = useLocalSearchParams<{ id?: string; d?: string; i?: string; from?: string }>();

  const [todayIso] = useState(() => localToday());
  const monday = mondayOf(todayIso);
  const [reloads, setReloads] = useState(0);
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));
  /* The athlete's recipes go into the book first — an `u:` id resolves only after this. */
  const mineQ = useQuery(fetchUserRecipes, [reloads]);
  const weekQ = useQuery(useCallback(() => fetchMealPlanWeek(monday), [monday]), [monday, reloads]);
  const prefsQ = useQuery(fetchMealPlanPrefs, []);

  const booked = mineQ.settled;
  const src = booked && params.id ? recipeView(params.id) : undefined;
  const r = booked && params.id ? RECIPE_BY_ID[params.id] : undefined;

  const [edited, setEdited] = useState<typeof weekQ.data>(null);
  const week = edited ?? weekQ.data ?? null;

  const [n, setN] = useState<number | null>(null);
  const [cooking, setCooking] = useState(false);
  const [busy, setBusy] = useState(false);
  /* "How much did you eat?" — My Recipes only (PO 2026-09-26). */
  const [eatOpen, setEatOpen] = useState(false);
  /* Delete, asked first (PO 09-27: "I should be able to delete off the list of my recipes"). */
  const [askDelete, setAskDelete] = useState(false);

  /* Where this recipe sits in the week — only when the plan still has it there. */
  const d = params.d != null ? Number(params.d) : NaN;
  const i = params.i != null ? Number(params.i) : NaN;
  const it = week && Number.isInteger(d) && Number.isInteger(i) ? week.days[d]?.items[i] : undefined;
  const ctx = it && r && it.recipeId === r.id ? { d, i, it } : null;

  if (!booked) {
    return (
      <View style={styles.screen}>
        <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.46)' }} />
        <AppBar title="" transparent onBack={() => router.back()} />
      </View>
    );
  }

  if (!src || !r) {
    return (
      <View style={styles.screen}>
        <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.46)' }} />
        <AppBar title="" transparent onBack={() => router.back()} />
        <Text style={[styles.lede, styles.missing]}>This recipe isn’t in Forge’s library any more.</Text>
      </View>
    );
  }

  const fedDay = ctx && week ? feedsDay(week.days, ctx.d, ctx.it) : null;
  const makesLunchFor = fedDay != null ? DAY_NAMES[fedDay] : null;
  const isLeftover = !!ctx?.it.leftover;
  const cookedOn = isLeftover && ctx?.it.cookDay != null ? DAY_NAMES[ctx.it.cookDay] : null;
  const portion = ctx?.it.portion ?? 1;
  /* Numbers for YOUR portion when the plan set one; one serving otherwise. */
  const shown = ctx ? itemTotals(ctx.it) : { kcal: r.kcal, protein: r.protein, carb: r.carb, fat: r.fat };
  const slot = ctx ? ctx.it.slot : r.slot;
  const household = prefsQ.data?.household ?? 1;
  const sctx = { household, portion, leftover: isLeftover, makesLunchFor, cookedOn, slot: SLOT_LABEL[slot].toLowerCase(), fromPlan: !!ctx };
  const servings = servingsFor(sctx);
  const count = n != null && servings.options.includes(n) ? n : servings.defaultN;
  const note = batchNote(sctx, count, servings.planned);
  const rows = ingredientRows(src, count, units === 'imperial');

  const isLocked = !!(ctx && week && week.locked[slotKey(ctx.d, ctx.it)]);
  const isLogged = !!(ctx && week && week.logged[logKey(ctx.d, ctx.it)]);

  const meta = [
    isLeftover && cookedOn ? `Leftover from ${cookedOn} dinner` : `${r.minutes} min`,
    SLOT_LABEL[slot],
    ...(makesLunchFor ? [`Leftovers for ${makesLunchFor} lunch`] : []),
  ].join(' · ');

  const save = async (next: NonNullable<typeof week>, toast: string) => {
    setEdited(next);
    try {
      await saveMealPlanWeek(next);
      showToast(toast);
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const done = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
    if (done !== cooking) setCooking(done);
  };

  const isMine = !ctx && src.mine;
  /* The athlete's own recipe as saved — its exact totals and how many servings the whole thing makes. */
  const mine = src.mine ? (mineQ.data ?? []).find((u) => u.id === r.id) : undefined;
  /* An own food (a scanned or typed label) is in it: Forge can't see its allergens, and its numbers are
     the label's, not USDA's. */
  const hasOwn = src.ingredients.some((x) => x.key.startsWith('own:'));
  /* One of Holt's dishes, in the week but not in My Recipes until it is saved here (0227). */
  const isTrial = !!mine?.trial;

  const keepTrial = async () => {
    if (busy || !mine) return;
    setBusy(true);
    try {
      await saveUserRecipe({ ...mine, id: mine.id, trial: false });
      setReloads((x) => x + 1);
      showToast('Saved to My Recipes');
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const removeMine = async () => {
    if (busy || !mine) return;
    setBusy(true);
    try {
      await deleteUserRecipe(mine.id, monday);
      setAskDelete(false);
      showToast(isTrial ? 'Removed' : `Deleted ${mine.name}`);
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /* Opened from My Recipes: log what they ATE today, in the recipe's first meal type. */
  const logEaten = async (q: number) => {
    if (busy || !mine) return;
    setBusy(true);
    try {
      await logRecipeEaten(todayIso, r.mealTypes[0] ?? 'dinner', mine, q);
      setEatOpen(false);
      showToast('Added to today’s diary');
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleLog = async () => {
    if (busy) return;
    if (!ctx || !week) {
      if (!src.mine) {
        showToast('Open this from your meal plan to log it');
        return;
      }
      if (!mine) {
        showToast('One moment, your recipe is still loading');
        return;
      }
      setEatOpen(true);
      return;
    }
    setBusy(true);
    try {
      /* On the day it is PLANNED for (0228), not today. */
      const dayIso = shiftDay(monday, ctx.d);
      const out = await togglePlanLog(week, ctx.d, ctx.i, dayIso);
      await save(out.week, out.logged ? (dayIso === todayIso ? 'Added to today’s diary' : `Added to ${DAY_NAMES[ctx.d]}’s diary`) : 'Removed from diary');
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.46)' }} />
      <AppBar title="" transparent onBack={() => router.back()} />

      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets style={styles.scroll} contentContainerStyle={styles.content} onScroll={onScroll} scrollEventThrottle={64}>
        <View style={styles.identity}>
          <Text style={styles.eyebrow}>Nutrition</Text>
          <Text style={styles.title}>{r.name}</Text>
          <Text style={styles.lede}>{meta}</Text>
        </View>

        {isTrial ? (
          <View style={styles.trial}>
            <Text style={styles.trialText}>Holt’s idea for this week. It isn’t in My Recipes until you save it.</Text>
            <Button variant="secondary" fullWidth disabled={busy} onPress={() => void keepTrial()}>
              Save to My Recipes
            </Button>
          </View>
        ) : null}

        {/* the numbers */}
        <View style={styles.card}>
          <View style={styles.calRow}>
            <Text style={styles.cal}>{grouped(shown.kcal)}</Text>
            <Text style={styles.calUnit}>cal</Text>
          </View>
          <View style={styles.macros}>
            {[
              ['Protein', shown.protein],
              ['Carbs', shown.carb],
              ['Fat', shown.fat],
            ].map(([label, v]) => (
              <View key={label as string} style={styles.macro}>
                <Text style={styles.macroVal}>
                  {v}
                  <Text style={styles.macroUnit}> g</Text>
                </Text>
                <Text style={styles.macroLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.source}>
            {`${portion !== 1 ? `Your portion · ${portionLabel(portion)}` : 'Per serving'} · calculated from ${hasOwn ? 'USDA data and your food labels' : 'USDA nutrition data'}`}
          </Text>
        </View>

        {/* contains */}
        <Text style={styles.section}>Contains</Text>
        {r.allergens.length ? (
          <View style={styles.pills}>
            {r.allergens.map((a) => (
              <Pill key={a} size="sm" tone="muted">
                {ALLERGEN_LABEL[a] ?? a}
              </Pill>
            ))}
          </View>
        ) : hasOwn ? (
          <Text style={styles.none}>None marked. Forge can’t see allergens in your own foods, so check their labels.</Text>
        ) : (
          <Text style={styles.none}>None of the 9 major allergens.</Text>
        )}
        <Text style={styles.checkLabels}>Always check labels.</Text>

        {src.equipment.length ? (
          <View style={styles.equipment}>
            <Text style={styles.equipmentLabel}>Equipment</Text>
            <Text style={styles.equipmentText}>{src.equipment.join(' · ')}</Text>
          </View>
        ) : null}

        {/* ingredients */}
        <View style={styles.headRow}>
          <Text style={styles.h2}>Ingredients</Text>
          {servings.options.length > 1 ? (
            <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel="Servings">
              {servings.options.map((v) => {
                const on = count === v;
                return (
                  <Pressable
                    key={v}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.segBtn, on && styles.segBtnOn]}
                    onPress={() => setN(v)}
                  >
                    <Text style={[styles.segText, on && styles.segTextOn]}>{servingsLabel(v)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
        {note ? <Text style={styles.batchNote}>{note}</Text> : null}
        {rows.map((row) => (
          <View key={row.key} style={styles.ingRow}>
            <Text style={styles.ingName}>{row.name}</Text>
            <View style={styles.ingAmount}>
              <Text style={styles.ingMetric}>{row.metric}</Text>
              {row.us ? <Text style={styles.ingUs}>{row.us}</Text> : null}
            </View>
          </View>
        ))}

        {/* method */}
        <View style={[styles.headRow, styles.methodHead]}>
          <Text style={styles.h2}>Method</Text>
        </View>
        {!src.steps.length ? <Text style={styles.noSteps}>Steps for this recipe haven’t been written yet.</Text> : null}
        {src.steps.length > 0 && stepsNote(src.stepsServe, count) ? (
          <Text style={styles.batchNote}>{stepsNote(src.stepsServe, count)}</Text>
        ) : null}
        {src.steps.map((st, j) => (
          <View key={j} style={styles.step}>
            <Text style={styles.stepN}>{j + 1}</Text>
            <View style={styles.stepBody}>
              <View style={styles.stepTitleRow}>
                <Text style={styles.stepTitle}>{st.title}</Text>
                {st.min ? <Text style={styles.stepMin}>{`${st.min} min`}</Text> : null}
              </View>
              <Text style={styles.stepText}>{st.text}</Text>
            </View>
          </View>
        ))}

        {mine ? (
          <Pressable accessibilityRole="button" hitSlop={6} style={styles.deleteLink} onPress={() => setAskDelete(true)}>
            <Text style={styles.deleteText}>{isTrial ? 'Don’t use this recipe' : 'Delete recipe'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {ctx ? (
          <View style={styles.footerLinks}>
            <Pressable
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => {
                requestSwap(ctx.d, ctx.i);
                router.back();
              }}
            >
              <Text style={styles.link}>Swap</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isLocked }}
              hitSlop={6}
              style={styles.lockLink}
              onPress={() => {
                if (!week) return;
                void save(
                  { ...week, locked: toggleLock(week.days, week.locked, ctx.d, ctx.i) },
                  isLocked ? 'Unlocked' : 'Locked. Kept when you rebuild',
                );
              }}
            >
              <EngravedIcon name={isLocked ? 'lock' : 'unlock'} size={12} />
              <Text style={styles.link}>{isLocked ? 'Locked' : 'Lock'}</Text>
            </Pressable>
          </View>
        ) : null}
        {isMine && !isTrial ? (
          <Pressable accessibilityRole="button" hitSlop={6} onPress={() => router.push({ pathname: '/my-recipes', params: { edit: r.id } })}>
            <Text style={styles.link}>Edit recipe</Text>
          </Pressable>
        ) : null}
        <View style={[styles.logWrap, !ctx && !isMine && styles.logWrapFull]}>
          <Button
            variant={!isLogged && (cooking || !src.steps.length) ? 'primary' : 'secondary'}
            fullWidth={!ctx && !isMine}
            disabled={busy}
            onPress={toggleLog}
          >
            {isLogged ? 'Logged' : 'Log meal'}
          </Button>
        </View>
      </View>

      {/* how much did you eat — My Recipes only; the plan's own portion covers a planned meal */}
      <EatenSheet recipe={eatOpen ? (mine ?? null) : null} busy={busy} onClose={() => setEatOpen(false)} onLog={(q) => void logEaten(q)} />

      <BottomSheet open={askDelete} onClose={() => (busy ? undefined : setAskDelete(false))} title={isTrial ? 'Don’t use this recipe?' : `Delete ${r.name}?`}>
        <View style={styles.sheetBody}>
          <Text style={styles.sheetMeta}>
            {isTrial
              ? 'It comes out of this week’s plan and won’t be picked again. Anything you logged stays in your diary.'
              : 'It comes off My Recipes and out of this week’s plan. Anything you logged stays in your diary.'}
          </Text>
          <Button variant="destructive" fullWidth disabled={busy} onPress={() => void removeMine()}>
            {busy ? 'Removing…' : isTrial ? 'Remove it' : 'Delete recipe'}
          </Button>
          <Button variant="text" fullWidth disabled={busy} onPress={() => setAskDelete(false)}>
            Keep it
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  identity: { gap: 6, paddingHorizontal: 2, paddingTop: 2 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.labelInk },
  title: { fontFamily: flFont.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.3, color: flColor.cream100 },
  lede: { marginTop: 4, fontSize: 14, lineHeight: 21, color: flColor.gray400 },
  missing: { paddingHorizontal: 22 },

  card: {
    gap: 16,
    marginTop: 22,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  calRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  cal: { fontFamily: flFont.display, fontSize: 48, lineHeight: 50, letterSpacing: -0.5, color: flColor.cream100, fontVariant: ['tabular-nums'] },
  calUnit: { fontSize: 15, fontWeight: '600', color: flColor.gray400 },
  macros: { flexDirection: 'row', gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.divider },
  macro: { flex: 1, gap: 3 },
  macroVal: { fontSize: 18, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  macroUnit: { fontSize: 12, fontWeight: '500', color: flColor.gray400 },
  macroLabel: { fontSize: 12, color: flColor.gray400 },
  source: { fontSize: 12, color: flColor.gray400 },

  section: { paddingTop: 32, paddingBottom: 12, paddingHorizontal: 2, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  none: { fontSize: 14, color: flColor.cream100, paddingHorizontal: 2 },
  checkLabels: { marginTop: 8, paddingHorizontal: 2, fontSize: 12.5, color: flColor.gray400 },

  equipment: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10, paddingTop: 28, paddingHorizontal: 2 },
  equipmentLabel: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  equipmentText: { fontSize: 14, color: flColor.gray400 },

  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 40,
    paddingBottom: 6,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.divider,
  },
  methodHead: { paddingTop: 44 },
  h2: { fontFamily: flFont.display, fontSize: 22, letterSpacing: -0.2, color: flColor.cream100 },
  seg: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: flRadius.pill, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600 },
  segBtn: { height: 34, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.pill, borderWidth: 1, borderColor: 'transparent' },
  segBtnOn: { backgroundColor: flColor.charcoal700, borderColor: flColor.charcoal500 },
  segText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  segTextOn: { color: flColor.cream100 },
  batchNote: { paddingTop: 10, paddingBottom: 2, paddingHorizontal: 2, fontSize: 12.5, color: flColor.gray400 },

  ingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 11,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.divider,
  },
  ingName: { flex: 1, fontSize: 14.5, lineHeight: 20, color: flColor.cream100 },
  ingAmount: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  ingMetric: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  ingUs: { fontSize: 12.5, color: flColor.gray400, fontVariant: ['tabular-nums'] },

  step: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.divider,
  },
  stepN: { width: 28, fontFamily: flFont.display, fontSize: 20, lineHeight: 24, color: flColor.bronzeInk },
  stepBody: { flex: 1, minWidth: 0, gap: 4 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  stepTitle: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 20, color: flColor.cream100 },
  stepMin: { fontSize: 12.5, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  stepText: { fontSize: 14.5, lineHeight: 22, color: flColor.gray400 },
  noSteps: { paddingTop: 6, paddingHorizontal: 2, fontSize: 14, color: flColor.gray400 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingTop: 10,
    paddingBottom: SCREEN_BOTTOM_GAP,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.divider,
    backgroundColor: flColor.charcoal900,
  },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  lockLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  link: { paddingVertical: 12, paddingHorizontal: 2, fontSize: 13, fontWeight: '600', color: flColor.bronzeInk },
  logWrap: { flex: 1, alignItems: 'flex-end' },
  logWrapFull: { alignItems: 'stretch' },

  trial: {
    gap: 12,
    marginTop: 18,
    padding: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  trialText: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400 },
  deleteLink: { alignSelf: 'center', marginTop: 32 },
  deleteText: { paddingVertical: 12, paddingHorizontal: 4, fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  sheetBody: { gap: 10, paddingBottom: 12 },
  sheetMeta: { marginTop: -8, marginBottom: 4, fontSize: 13, lineHeight: 19, color: flColor.gray400 },

});

/** Premium since 0244 (PO decision "B", 2026-09-29) — Free athletes meet `NutritionPlannerGate` instead. */
export default function RecipeScreenRoute() {
  return (
    <NutritionPlannerGate what="Editing recipes">
      <RecipeScreen />
    </NutritionPlannerGate>
  );
}
