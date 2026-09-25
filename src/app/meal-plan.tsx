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
  dayTotals,
  feedsDay,
  itemTotals,
  keptLocks,
  logKey,
  mondayOf,
  portionLabel,
  rebuildWeek,
  resolveWeek,
  shortBy,
  slotKey,
  snackOptions,
  swapMeal,
  toggleLock,
  weekDates,
  weekRange,
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
  togglePlanLog,
} from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { takeSwapRequest } from '@/lib/meal-plan-intent';
import { estimateFor, groceryList, stateFor } from '@/domain/nutrition/grocery';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { errorMessage, useQuery } from '@/lib/useQuery';

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
 *  · **"Log meal" writes a real diary row** (a quick-add labelled "Forge recipe", today, in that meal's
 *    slot) and "Logged" removes exactly that row.
 *  · The `.dc`'s preview fixtures (a pre-locked Wednesday dinner, a pre-logged Monday breakfast) are
 *    not reproduced.
 *  · Open recipe goes to Recipe (`Recipe.dc.html`), whose Swap comes back here and opens this sheet;
 *    Grocery list goes to `Grocery List.dc.html`.
 */
export default function MealPlanScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const scrollRef = useRef<ScrollView>(null);
  const dayY = useRef<number[]>([]);
  const stripH = useRef(0);
  const jumping = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [todayIso] = useState(() => localToday());
  const monday = mondayOf(todayIso);
  const dates = useMemo(() => weekDates(monday), [monday]);

  const [reloads, setReloads] = useState(0);
  const [picked, setPicked] = useState<{ d: number; i?: number; mode: 'actions' | 'swap' | 'snack' } | null>(null);
  /* Back from Edit setup, Targets or Recipe: re-read, so the week reflects what just changed. */
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));
  /* Recipe's Swap comes back here with a request waiting (`lib/meal-plan-intent.ts`). One read per
     focus, the `consumeMealHint` pattern — no state is set from an effect. */
  const swapQ = useQuery(takeSwapRequestAsync, [reloads]);
  const [handledSwap, setHandledSwap] = useState<object | null>(null);
  const requested = swapQ.data && swapQ.data !== handledSwap ? swapQ.data : null;
  const sheet = requested ? { d: requested.d, i: requested.i, mode: 'swap' as const } : picked;
  const setSheet = (next: typeof picked) => {
    if (requested) setHandledSwap(requested);
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
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);

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

  /* ── the sheet ── */
  let sheetTitle = '';
  let sheetMeta = '';
  let sheetBody: ReactNode = null;
  if (week && prefs && sheet) {
    const { d, mode } = sheet;
    const day = week.days[d];
    const total = dayTotals(day).kcal;
    if (mode === 'snack' && target) {
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
        sheetMeta = `${grouped(mine)} cal · ${it.leftover && it.cookDay != null ? `Leftover from ${dates[it.cookDay].name} dinner` : `${r.minutes} min`}${it.portion !== 1 ? ` · ${portionLabel(it.portion)}` : ''}`;
        sheetBody = (
          <View style={styles.actions}>
            <ActionRow
              icon={<BookGlyph />}
              label="Open recipe"
              onPress={() => {
                setSheet(null);
                router.push({ pathname: '/recipe', params: { id: it.recipeId, d: String(d), i: String(i) } });
              }}
            />
            <ActionRow icon={<SwapGlyph />} label="Swap meal" chevron onPress={() => setSheet({ d, i, mode: 'swap' })} />
            <ActionRow
              icon={<LockGlyph shut={isLocked} />}
              label={isLocked ? 'Locked' : 'Lock meal'}
              hint={isLocked ? 'Kept when you rebuild · tap to unlock' : 'Keep this one if you rebuild'}
              onPress={() => void commit({ ...week, locked: toggleLock(week.days, week.locked, d, i) })}
            />
            <ActionRow
              icon={<LogGlyph logged={!!loggedId} />}
              label={loggedId ? 'Logged' : 'Log meal'}
              hint={loggedId ? 'Tap to remove from the diary' : 'Adds it to today’s diary'}
              last
              onPress={async () => {
                if (busy) return;
                setBusy(true);
                try {
                  const out = await togglePlanLog(week, d, i, todayIso);
                  await commit(out.week, out.logged ? 'Added to today’s diary' : 'Removed from diary');
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
    budgetLine = `Estimated $${Math.round(e.dollars).toLocaleString('en-US')} of your $${prefs.weeklyBudgetUsd.toLocaleString('en-US')} budget`;
    if (e.unpriced) budgetLine += ` · ${e.unpriced} ${e.unpriced === 1 ? 'item' : 'items'} not priced`;
  }

  /* Locks + logged meals — everything a rebuild keeps (logged meals are frozen, Rules §3). */
  const keptCount = week && prefs ? Object.keys(keptLocks(week, prefs)).length : 0;
  /* Nothing planned anywhere means the book is empty, not that the setup is wrong. Forge ships no recipes
     since 2026-09-24, so say where recipes come from rather than "No lunch fits your setup" seven times. */
  const weekEmpty = !!week && week.days.every((day) => day.items.length === 0);

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.46)' }} />
      <AppBar title="" transparent onBack={() => router.back()} />

      <ScrollView
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
          {weekEmpty ? (
            <View style={styles.short}>
              <Text style={styles.shortText}>No recipes to plan from yet.</Text>
              <Pressable accessibilityRole="button" hitSlop={6} onPress={() => router.push('/my-recipes')}>
                <Text style={styles.shortLink}>Add one in My Recipes</Text>
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
                  accessibilityLabel={`${dt.name} ${dt.label}`}
                  accessibilityState={{ selected: on }}
                  style={[styles.stripDay, on && styles.stripDayOn]}
                  onPress={() => jump(d)}
                >
                  <Text style={[styles.stripDow, on && styles.stripTextOn]}>{dt.short}</Text>
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
              const gap = shortBy(day, targetKcal);
              return (
                <View
                  key={dates[d].iso}
                  style={[styles.dayCard, d === 0 && styles.dayCardFirst]}
                  onLayout={(e: LayoutChangeEvent) => {
                    dayY.current[d] = e.nativeEvent.layout.y;
                  }}
                >
                  <View style={styles.dayHead}>
                    <View style={styles.dayName}>
                      <Text style={styles.dayTitle}>{dates[d].name}</Text>
                      <Text style={styles.dayDate}>{dates[d].label}</Text>
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
                        : [`${r.minutes} min`, ...(feeds != null ? [`leftovers for ${dates[feeds].name} lunch`] : [])];
                    if (it.portion !== 1) metaParts.push(portionLabel(it.portion));
                    /* PO 2026-09-23 (open question 1): when the library runs out, repeat — and say so. */
                    if (it.repeated) metaParts.push('Repeated · nothing else fits');
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
                    .map((s) => (
                      <View key={`empty-${s}`} style={styles.item}>
                        <View style={styles.itemText}>
                          <Text style={styles.itemSlot}>{SLOT_LABEL[s]}</Text>
                          <Text style={styles.itemMeta}>{`No ${SLOT_LABEL[s].toLowerCase()} fits your setup yet.`}</Text>
                        </View>
                      </View>
                    ))}

                  {gap > 0 ? (
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
        <View style={styles.footer}>
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
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
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
    borderBottomColor: flColor.charcoal700,
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
  stripDayOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  stripDow: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, color: flColor.gray400 },
  stripNum: { fontSize: 15, fontWeight: '600', color: flColor.gray400 },
  stripTextOn: { color: flColor.bronze300 },

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
    borderTopColor: flColor.charcoal700,
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
    borderTopColor: flColor.charcoal700,
  },
  shortText: { fontSize: 13, color: flColor.gray400 },
  shortLink: { paddingVertical: 10, paddingHorizontal: 2, fontSize: 13, fontWeight: '600', color: flColor.bronze400 },

  footer: {
    gap: 6,
    paddingTop: 14,
    paddingBottom: SCREEN_BOTTOM_GAP,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  budgetLine: { textAlign: 'center', fontSize: 12.5, color: flColor.gray400, paddingBottom: 4 },
  linkBronze: { paddingVertical: 10, paddingHorizontal: 4, fontSize: 13, fontWeight: '600', color: flColor.bronze400 },
  linkQuiet: { paddingVertical: 10, paddingHorizontal: 4, fontSize: 13, fontWeight: '600', color: flColor.gray400 },

  sheetBody: { paddingBottom: 12 },
  sheetMeta: { marginTop: -8, fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  actions: { marginTop: 14 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 8, paddingHorizontal: 2 },
  actionDivider: { borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
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
  back: { alignSelf: 'center', marginTop: 6 },
});
