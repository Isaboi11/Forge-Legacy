import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { CalendarField } from '@/components/forge/composites/CalendarField';
import { NutritionCareLine, useCareLine } from '@/components/forge/NutritionCareLine';
import { NutritionFirstRun } from '@/components/forge/NutritionFirstRun';
import { Surface } from '@/components/forge/composites/Surface';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flBorder, flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import {
  calorieCaption,
  calorieHeadline,
  canGoForward,
  localToday,
  dayDateLine,
  mealForHour,
  dayLabel,
  groupByMeal,
  grouped,
  isAhead,
  mealTitle,
  PLAN_AHEAD_DAYS,
  ringDash,
  ringFraction,
  shiftDay,
  totals,
  type MealGroup,
  type MealSlot,
} from '@/domain/nutrition/day';
import {
  allRows,
  checkEntry,
  checkPlanMeal,
  copyMealFrom,
  fetchPlanDay,
  isNutritionFirstRun,
  mealHasFood,
  type PlanDayView,
} from '@/data/nutrition-live';
import { applyChecks, checklistByMeal, checklistCount, mayCheck, plannedKcal, type ChecklistRow } from '@/domain/nutrition/plan-ahead';
import { useEarnedMoments } from '@/hooks/useEarnedMoments';
import { useToast } from '@/hooks/useCeremony';
import { autoPrompts, consentAllows, NUTRITION_DOOR } from '@/domain/consent/consent';
import { ensureConsent, useConsent, warmConsents } from '@/lib/consent';
import { useEntitlementState, useNutritionAccess, useNutritionPlanner } from '@/lib/entitlement';
import { labelScanAvailable } from '@/lib/label-scan';
import { useProfile } from '@/lib/profile';
import { TAB_SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Nutrition tab root — built to `Nutrition Home.dc.html` (Claude Design), wired to the real diary (0205).
 *
 * Faithful to the `.dc`: the day strip (‹ Today · SEP 16, 2026 › · See Details), the bronze calorie ring
 * over its ember glow with the flame mark, three macro rings (protein green · carbs bronze · fat blue),
 * Log Food, the Scan / Meal Plan pair, and "Today's Meals" — a card per slot with its kcal on the right,
 * empty slots drawn as dashed rows, and "Copy yesterday" on an empty one.
 *
 * ⚠ **NO NUMBER IS COMPUTED HERE.** Every figure comes from `domain/nutrition/day.ts`, which is tested
 * (NUT-D4). This file positions and paints them.
 *
 * ⚠ **THE RING LEADS WITH WHAT WAS EATEN**, exactly as the `.dc` ships it, and the reason is the bad day:
 * "remaining" would read "−120" once someone goes over, so the caption says "120 over" instead and the
 * big number keeps counting up. Over target never turns anything red (NUT-D5 · Architecture §10).
 *
 * ⚠ **"ADD" REPLACED "SCAN" IN THE PAIR** (PO 09-26, `Docs/Nutrition-Flow-Scenarios-2026-09-26.md`). The
 * flow walk found recipes, the label scan, Create Meal and the recipe screenshot all 3–4 taps deep, and the
 * tab's "Scan" was the BARCODE — so "where do I scan the nutrition facts?" had no answer here. "Add" opens one
 * sheet with one row per KIND of thing (recipe · meal · scan · what you've saved); how it gets in — typed, a
 * picture, label or barcode — is chosen one step on. The barcode is also still the icon in Log Food's search. A deliberate delta from the `.dc`, which drew "Scan".
 *
 * ⚠ **MEAL PLAN IS PREMIUM AND STILL VISIBLE**, carrying a "PREMIUM" tag — PO, 2026-09-22: *"have it show
 * but make it so that they know it's part of premium"*. That is a deliberate amendment of NUT-D8 (which
 * hid Premium surfaces from Free athletes entirely), and it adds one M-7-shaped moment: the tag opens the
 * plan screen. It is never shown during a workout and never dressed as a limit (M7-D16).
 */

/*
 * Ring geometry. The `.dc` drew 228/98/13 and 84/36/6; the PO asked for the circles to carry more
 * weight on a real screen, so the strokes are heavier and the macro rings larger. Everything else about
 * them — colours, placement, the glow — is unchanged, and `ringDash` still derives the arc from `r`,
 * so these four numbers are the only thing that moves.
 */
const RING = { box: 228, r: 97, stroke: 17 } as const;

/** The hero figure's size for its length: "2,450" at the `.dc`'s 52, longer figures stepped down to fit the ring. */
function heroFontSize(text: string): { fontSize: number; lineHeight: number } | null {
  const size = text.length <= 5 ? 52 : text.length === 6 ? 44 : text.length === 7 ? 38 : text.length <= 9 ? 30 : 24;
  return size === 52 ? null : { fontSize: size, lineHeight: size + 2 };
}
const MACRO_RING = { box: 94, r: 40, stroke: 9 } as const;

export default function NutritionScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { profile } = useProfile();
  /* 0206 — the preview allowlist. The TAB is hidden for everyone else, but `/nutrition` is still a real
     route, so a typed URL or a stale deep link lands here. Read alongside `status` so the two accounts
     that DO have access never see the refusal flash while entitlement is still loading. */
  const mayUseNutrition = useNutritionAccess();
  /* 0244: the meal planner, grocery list and building recipes are Premium; logging stays free. */
  const planner = useNutritionPlanner();
  const { status: entitlementStatus } = useEntitlementState();
  useEarnedMoments();

  /*
   * ══ CONSENT BEFORE COLLECTION (MHMDA / Nevada SB 370 — `domain/consent/consent.ts`) ══
   *
   * The first time an athlete opens the tab, the consent sheet rises by itself, before anything can be
   * logged. "Not now" is stored, so it is asked once, not on every visit — the tab then shows its door
   * (below) and the rest of the app carries on untouched. Existing athletes are asked too: nobody is
   * grandfathered, because there was never a stored yes to grandfather.
   *
   * ⚠ ON FOCUS, NOT ON MOUNT. The tab can be mounted without being looked at; a sheet must never rise
   * over some other screen because this one exists.
   */
  const consent = useConsent();
  const nutritionConsent = consent.status.nutrition;
  useFocusEffect(
    useCallback(() => {
      if (!mayUseNutrition) return;
      if (!consent.loaded) return warmConsents();
      if (autoPrompts(nutritionConsent)) void ensureConsent('nutrition');
    }, [mayUseNutrition, consent.loaded, nutritionConsent]),
  );

  /* The day being read. Minted once per mount from the device clock, then moved only by the arrows —
     so a session that crosses midnight keeps showing the day the athlete was looking at. */
  const [todayIso] = useState(() => localToday());
  const [iso, setIso] = useState(todayIso);
  const [reloads, setReloads] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  /* QA N-12: the calendar icon opens a month grid; it used to only jump back to today. */
  const [pickOpen, setPickOpen] = useState(false);
  const canScanLabel = labelScanAvailable();

  /* The day and its Meal Plan week, read together (`fetchPlanDay`). */
  const { data: view, loading } = useQuery(
    useCallback(() => (mayUseNutrition ? fetchPlanDay(iso) : Promise.resolve(null)), [iso, mayUseNutrition]),
    [iso, reloads, mayUseNutrition],
  );
  const day = view?.day ?? null;
  /**
   * ══ PLAN AHEAD (PO 09-27, 0228) ══ The › arrow goes into the future (`canGoForward`, two weeks). Food put on
   * a day that has not begun is PLANNED — it counts toward nothing and waits in its meal's checklist; the Meal
   * Plan's meals are in the same checklists, read from the week. A tick logs it; on a day ahead nothing can
   * be ticked yet (`mayCheck`).
   */
  const mayGoForward = canGoForward(iso, todayIso);
  const ahead = isAhead(iso, todayIso);
  const checkable = mayCheck(iso, todayIso);
  /* Any return to the tab re-reads — food logged on another screen has to be here when you come back. */
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));
  /* The care line (`domain/nutrition/care-line.ts`): about the athlete's last seven days, not the day on screen. */
  const care = useCareLine(reloads);
  /* `Nutrition First Run.dc.html` — never touched the tab. Re-read on every return, so the first food
     logged from the welcome brings the athlete back to Home. Unknown answers Home (`first-run.ts`). */
  const { data: firstRun, settled: firstRunSettled } = useQuery(isNutritionFirstRun, [reloads]);

  /* Memoised before the two derived reads: `day?.entries ?? []` mints a new array on every render, which
     would make both useMemos below recompute every time (react-compiler flags exactly this). */
  /*
   * Ticks tapped but not yet re-read (`applyChecks`), tied to the read they were made on: the re-read after the
   * last write lands carries them for real, and the map gives way — the same pattern as Meal Plan's `edits`.
   */
  const [checks, setChecks] = useState<{ base: PlanDayView; map: Record<string, boolean> } | null>(null);
  const inflight = useRef(new Set<string>());
  const liveChecks = view && checks && checks.base === view ? checks.map : null;
  const shown = useMemo(
    () => (view ? applyChecks(allRows(view.day), view.week, view.iso, liveChecks ?? {}) : { rows: [], week: null }),
    [view, liveChecks],
  );
  const entries = useMemo(() => shown.rows.filter((e) => !e.planned), [shown]);
  const eaten = useMemo(() => totals(entries), [entries]);
  const groups = useMemo(() => groupByMeal(entries), [entries]);
  const lists = useMemo(() => checklistByMeal(shown.rows, shown.week, view?.iso ?? iso), [shown, view, iso]);
  const waiting = useMemo(() => plannedKcal(lists), [lists]);
  const targets = day?.targets ?? null;

  /**
   * The checkbox. Drawn at once; written behind. A tick on a day that has not begun says when it can be ticked
   * instead. A failure un-draws the tick and says why — a check that silently didn't log is the one thing
   * this feature must never do.
   */
  const toggleCheck = async (row: ChecklistRow) => {
    if (!view) return;
    if (!row.checked && !checkable) {
      showToast(iso === shiftDay(todayIso, 1) ? 'You can check this off tomorrow' : `You can check this off on ${dayLabel(iso, todayIso)}`);
      return;
    }
    if (inflight.current.has(row.key)) return;
    inflight.current.add(row.key);
    const next = !row.checked;
    setChecks((c) => ({ base: view, map: { ...(c && c.base === view ? c.map : {}), [row.key]: next } }));
    try {
      if (row.kind === 'entry' && row.entryId) await checkEntry(row.entryId, next, view.iso);
      else if (row.kind === 'plan' && row.weekStart && row.planKey) await checkPlanMeal(row.weekStart, row.planKey, view.iso, next);
    } catch (e) {
      setChecks((c) => {
        if (!c) return c;
        const map = { ...c.map };
        delete map[row.key];
        return { ...c, map };
      });
      showToast(errorMessage(e));
    } finally {
      inflight.current.delete(row.key);
      /* Re-read once the LAST tick lands, so a quick run of ticks never flickers back mid-way. */
      if (inflight.current.size === 0) setReloads((n) => n + 1);
    }
  };

  const headline = targets
    ? calorieHeadline(eaten.kcal, targets.kcal, 'eaten')
    : { value: grouped(eaten.kcal), label: 'Calories' };
  /* The figure shrinks to stay INSIDE the ring (QA N-05 / N-24): at 52pt a six-figure day spilled across it. */
  const heroFit = heroFontSize(headline.value);

  const goLog = (meal?: MealSlot) =>
    router.push({ pathname: '/log-food', params: meal ? { date: iso, meal } : { date: iso } });

  const copyYesterday = async (meal: MealSlot) => {
    const from = shiftDay(iso, -1);
    if (!(await mealHasFood(from, meal))) {
      showToast('Nothing logged yesterday to copy');
      return;
    }
    const copied = await copyMealFrom(from, iso, meal);
    setReloads((n) => n + 1);
    showToast(`Copied ${copied.length} ${copied.length === 1 ? 'item' : 'items'}`);
  };

  /** Leave the Add sheet for a route. */
  const addGo = (to: Parameters<typeof router.push>[0]) => {
    setAddOpen(false);
    router.push(to);
  };

  /*
   * ══ 0206 — NOT ON THE PREVIEW ALLOWLIST ══
   *
   * Every hook above has already run, so this early return cannot change hook order. It is placed after
   * them deliberately rather than at the top of the component.
   *
   * ⚠ This is a COURTESY, not the gate: 0206 puts the allowlist inside the RLS of all seven nutrition
   * tables, so without it `fetchDay` returns nothing and every write is refused. What this avoids is a
   * chromed, permanently-empty food diary that reads as a bug rather than as a closed door.
   *
   * While entitlement is still loading nothing is said either way — claiming "not available" to the PO
   * for a few hundred milliseconds would be a lie with a short shelf life.
   */
  if (!mayUseNutrition) {
    return (
      <View style={styles.screen}>
        <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
        <AppBar
          title="Nutrition"
          transparent
          avatar={<Avatar name={profile?.name ?? ''} src={profile?.avatarUrl ?? undefined} size="appBar" />}
        />
        {entitlementStatus === 'ready' ? (
          <View style={styles.previewGate}>
            <Text style={styles.previewTitle}>Not open yet</Text>
            <Text style={styles.previewBody}>
              Nutrition is still being built. It will arrive as part of Forge when it is finished — nothing to
              sign up for.
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  /* No consent, no diary — the door back in. Held blank (not the door) while the stored answer is read,
     so an athlete who already agreed never sees it flash. */
  if (!consent.loaded || !consentAllows(nutritionConsent)) {
    return (
      <View style={styles.screen}>
        <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
        <AppBar
          title="Nutrition"
          transparent
          avatar={<Avatar name={profile?.name ?? ''} src={profile?.avatarUrl ?? undefined} size="appBar" />}
          onAvatar={() => router.push('/account-settings')}
        />
        {consent.loaded ? (
          <View style={styles.previewGate}>
            <Text style={styles.previewTitle}>{NUTRITION_DOOR.title}</Text>
            <Text style={styles.previewBody}>{NUTRITION_DOOR.body}</Text>
            <View style={styles.consentAction}>
              <Button variant="primary" fullWidth onPress={() => void ensureConsent('nutrition')}>
                {NUTRITION_DOOR.action}
              </Button>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  /* Held until the first-run read answers once, so neither screen flashes before the other. `settled`
     latches, so returning to the tab never blanks it again. */
  if (!firstRunSettled || firstRun) {
    return (
      <View style={styles.screen}>
        <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
        <AppBar
          title="Nutrition"
          transparent
          avatar={<Avatar name={profile?.name ?? ''} src={profile?.avatarUrl ?? undefined} size="appBar" />}
          onAvatar={() => router.push('/account-settings')}
        />
        {firstRun ? (
          <NutritionFirstRun onLog={() => goLog()} onTargets={() => router.push('/nutrition-targets')} />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />

      <AppBar
        title="Nutrition"
        transparent
        avatar={<Avatar name={profile?.name ?? ''} src={profile?.avatarUrl ?? undefined} size="appBar" />}
        onAvatar={() => router.push('/account-settings')}
        actions={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pick a day"
            hitSlop={8}
            onPress={() => setPickOpen(true)}
            style={styles.barAction}
          >
            <EngravedIcon name="calendar" size={21} />
          </Pressable>
        }
      />

      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: TAB_SCREEN_BOTTOM_GAP }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── day strip ─────────────────────────────────────────────────── */}
        <View style={styles.dayStrip}>
          <View style={styles.dayLeft}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous day"
              onPress={() => setIso((d) => shiftDay(d, -1))}
              style={styles.dayArrow}
            >
              <Chevron direction="left" color={flColor.bronze400} />
            </Pressable>
            <View>
              <Text style={styles.dayName}>{dayLabel(iso, todayIso)}</Text>
              <Text style={styles.dayDate}>{dayDateLine(iso)}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next day"
              disabled={!mayGoForward}
              onPress={() => setIso((d) => shiftDay(d, 1))}
              style={styles.dayArrow}
            >
              {/* Nothing to see ahead — the arrow greys out rather than disappearing, so the
                  control never moves under the thumb. */}
              <Chevron direction="right" color={mayGoForward ? flColor.bronze400 : flColor.charcoal500} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            /* Was a toast saying the analytics pass was coming — the one dead end in the tab. It opens
               `Nutrition Details.dc.html` now: the week, its target band, and where the gap is. */
            onPress={() => router.push('/nutrition-details')}
            style={styles.detailsLink}
          >
            <Text style={styles.detailsText}>See Details</Text>
            <Chevron direction="right" color={flColor.bronze400} size={14} width={2.2} />
          </Pressable>
        </View>

        {/* ── the care line: top of the day, above everything the day holds ── */}
        <NutritionCareLine care={care} style={styles.careLine} />

        {/* ── calorie ring ──────────────────────────────────────────────── */}
        {/* The rings are the door back into Daily targets. Every other link to it only shows while no
            target exists, so once one was set there was no way to change it from this tab. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit daily targets"
          onPress={() => router.push('/nutrition-targets')}
          style={styles.heroWrap}
        >
          <View style={styles.heroGlow} pointerEvents="none" />
          <Svg width={RING.box} height={RING.box} viewBox={`0 0 ${RING.box} ${RING.box}`}>
            <Circle cx={RING.box / 2} cy={RING.box / 2} r={RING.r} fill="none" stroke={flColor.charcoal600} strokeWidth={RING.stroke} />
            {targets ? (
              <Circle
                cx={RING.box / 2}
                cy={RING.box / 2}
                r={RING.r}
                fill="none"
                stroke={flColor.bronze400}
                strokeWidth={RING.stroke}
                strokeLinecap="round"
                strokeDasharray={ringDash(ringFraction(eaten.kcal, targets.kcal), RING.r)}
                transform={`rotate(-90 ${RING.box / 2} ${RING.box / 2})`}
              />
            ) : null}
          </Svg>

          {/* ⚠ `box-none`, NOT `none`. This wrapper sits over the ring so touches fall through to it,
              but `none` excludes the view AND ITS CHILDREN — which made "Set a daily target" below
              completely untappable, on the one screen a brand-new athlete starts from. `box-none` lets
              the children stay interactive while the wrapper itself still passes touches through. */}
          <View style={styles.heroCentre} pointerEvents="box-none">
            <EngravedIcon name="flame" size={22} color={flColor.emberFlame} />
            <Text style={[styles.heroValue, heroFit]} numberOfLines={1}>{headline.value}</Text>
            <Text style={styles.heroLabel}>{headline.label}</Text>
            {targets ? (
              <Text style={styles.heroCaption}>{calorieCaption(eaten.kcal, targets.kcal, 'eaten')}</Text>
            ) : (
              /* No target yet: the ring still counts what was eaten. Setting one is an invitation, not a
                 wall — nothing here is blocked without it. */
              <Pressable accessibilityRole="button" onPress={() => router.push('/nutrition-targets')}>
                <Text style={styles.heroSetTarget}>Set a daily target</Text>
              </Pressable>
            )}
          </View>
        </Pressable>

        {/* ── macro rings ───────────────────────────────────────────────── */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit macro targets"
          onPress={() => router.push('/nutrition-targets')}
          style={styles.macroRow}
        >
          <MacroRing label="Protein" value={eaten.protein} target={targets?.protein ?? null} color={flColor.macroProtein} />
          <MacroRing label="Carbs" value={eaten.carb} target={targets?.carb ?? null} color={flColor.macroCarb} />
          <MacroRing label="Fat" value={eaten.fat} target={targets?.fat ?? null} color={flColor.macroFat} />
        </Pressable>

        {/* ── actions ───────────────────────────────────────────────────── */}
        <View style={styles.actions}>
          <Button variant="primary" fullWidth icon={<Plus />} onPress={() => goLog()}>
            Log Food
          </Button>
          <View style={styles.actionPair}>
            <View style={styles.actionHalf}>
              <Button variant="secondary" fullWidth icon={<AddGlyph />} onPress={() => setAddOpen(true)}>
                Add
              </Button>
            </View>
            <View style={styles.actionHalf}>
              <Button
                variant="secondary"
                fullWidth
                icon={<CalendarGlyph />}
                onPress={() => {
                  /* Premium (MA6 §4). A Free athlete is told what the button is, not refused: the tag
                     says PREMIUM and the tap opens the plan screen. Premium lands on the week (0211),
                     which hands to Meal Plan Setup (0210) until the setup is saved. */
                  if (!planner) { router.push('/subscription'); return; }
                  router.push('/meal-plan');
                }}
              >
                Meal Plan
              </Button>
              {!planner ? (
                <View style={styles.premiumTag} pointerEvents="none">
                  <Text style={styles.premiumTagText}>Premium</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── meals ─────────────────────────────────────────────────────── */}
        <View style={styles.mealsHeader}>
          <Text style={styles.mealsTitle}>{iso === todayIso ? "Today's Meals" : ahead ? 'Planned Meals' : 'Meals'}</Text>
          <Text style={styles.mealsTotal}>
            {loading && !day
              ? '—'
              : /* What waits on a tick is said beside the total, never added to it. */
                `${eaten.kcal.toLocaleString('en-US')} cal${waiting > 0 ? ` · ${waiting.toLocaleString('en-US')} planned` : ''}`}
          </Text>
        </View>

        <View style={styles.mealList}>
          {groups.map((group) => (
            <MealCard
              key={group.meal}
              group={group}
              checklist={lists[group.meal]}
              ahead={ahead}
              checkable={checkable}
              onToggle={toggleCheck}
              /* A meal WITH food opens itself — Meal Detail is where a portion is fixed, a mis-tap is
                 deleted and the plate is saved. Pre-logged food is food there too. A meal holding only the
                 plan's dish has nothing of its own to show, so its card stays the shortcut into the search. */
              onPress={() =>
                group.entries.length || lists[group.meal].some((r) => r.kind === 'entry')
                  ? router.push({ pathname: '/meal-detail', params: { date: iso, meal: group.meal } })
                  : goLog(group.meal)
              }
              onCopyYesterday={() => copyYesterday(group.meal)}
            />
          ))}
        </View>
      </ScrollView>

      {/* ── pick a day: a month grid, up to the plan-ahead limit ─────────────── */}
      <BottomSheet open={pickOpen} onClose={() => setPickOpen(false)} title="Pick a day">
        <View style={styles.pickBody}>
          <CalendarField
            key={pickOpen ? iso : 'closed'}
            label="Day"
            hideLabel
            startOpen
            today={todayIso}
            value={iso}
            onChange={(next) => {
              if (!next) return;
              const last = shiftDay(todayIso, PLAN_AHEAD_DAYS);
              if (next > last) {
                showToast(`You can plan up to ${PLAN_AHEAD_DAYS} days ahead`);
                return;
              }
              setIso(next);
              setPickOpen(false);
            }}
          />
          {iso !== todayIso ? (
            <Button
              variant="secondary"
              fullWidth
              onPress={() => {
                setIso(todayIso);
                setPickOpen(false);
              }}
            >
              Back to today
            </Button>
          ) : null}
        </View>
      </BottomSheet>

      {/* ── add: every way in, each named for what it is ─────────────────── */}
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add">
        {/* One row per KIND of thing (PO 09-26: "a lot of options for the same category"). How it gets in —
            typed, a picture, a camera — is chosen on the screen the row opens, not here. */}
        <View style={styles.addList}>
          <AddRow
            icon="book"
            title="Recipe"
            sub={planner ? 'Type it in, or add a picture of one.' : 'Premium — build your own recipes.'}
            onPress={() => (planner ? addGo({ pathname: '/my-recipes', params: { add: '1' } }) : addGo('/subscription'))}
          />
          <AddRow
            icon="list-plus"
            title="Meal"
            sub="Foods you eat together, logged in one tap."
            onPress={() => addGo({ pathname: '/my-foods', params: { newMeal: '1' } })}
          />
          {/* Both scans are one kind — a packaged food — so one row, with the two ways side by side. */}
          <View style={[styles.addRow, styles.addDivider]}>
            <View style={styles.addIcon}>
              <EngravedIcon name="barcode-scan" size={20} />
            </View>
            <View style={styles.addText}>
              <Text style={styles.addTitle}>Scan</Text>
              <Text style={styles.addSub}>A packaged food.</Text>
              <View style={styles.scanPair}>
                <View style={styles.actionHalf}>
                  <Button
                    variant="secondary"
                    fullWidth
                    onPress={() =>
                      addGo({
                        pathname: '/create-food',
                        params: { date: iso, meal: mealForHour(new Date().getHours()), ...(canScanLabel ? { scan: '1' } : {}) },
                      })
                    }
                  >
                    Nutrition label
                  </Button>
                </View>
                <View style={styles.actionHalf}>
                  <Button variant="secondary" fullWidth onPress={() => addGo({ pathname: '/log-food', params: { date: iso, scan: '1' } })}>
                    Barcode
                  </Button>
                </View>
              </View>
            </View>
          </View>
          <AddRow
            icon="bookmark"
            title="My foods, meals & recipes"
            sub="Everything you’ve saved, to see, edit or log."
            last
            onPress={() => addGo('/my-foods')}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

function AddRow({
  icon,
  title,
  sub,
  last,
  onPress,
}: {
  icon: 'book' | 'list-plus' | 'bookmark';
  title: string;
  sub: string;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.addRow, !last && styles.addDivider, pressed && styles.addPressed]}
    >
      <View style={styles.addIcon}>
        <EngravedIcon name={icon} size={20} />
      </View>
      <View style={styles.addText}>
        <Text style={styles.addTitle}>{title}</Text>
        <Text style={styles.addSub}>{sub}</Text>
      </View>
      <Chevron direction="right" color={flColor.gray400} size={14} />
    </Pressable>
  );
}

function MacroRing({ label, value, target, color }: { label: string; value: number; target: number | null; color: string }) {
  const c = MACRO_RING.box / 2;
  return (
    <View style={styles.macro}>
      <View style={styles.macroRingWrap}>
        <Svg width={MACRO_RING.box} height={MACRO_RING.box} viewBox={`0 0 ${MACRO_RING.box} ${MACRO_RING.box}`}>
          <Circle cx={c} cy={c} r={MACRO_RING.r} fill="none" stroke={flColor.charcoal600} strokeWidth={MACRO_RING.stroke} />
          {target ? (
            <Circle
              cx={c}
              cy={c}
              r={MACRO_RING.r}
              fill="none"
              stroke={color}
              strokeWidth={MACRO_RING.stroke}
              strokeLinecap="round"
              strokeDasharray={ringDash(ringFraction(value, target), MACRO_RING.r)}
              transform={`rotate(-90 ${c} ${c})`}
            />
          ) : null}
        </Svg>
        <View style={styles.macroValueWrap} pointerEvents="none">
          <Text style={styles.macroValue}>
            {Math.round(value)}
            <Text style={styles.macroUnit}>g</Text>
          </Text>
        </View>
      </View>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroTarget}>{target ? `of ${target}g` : 'no target'}</Text>
    </View>
  );
}

function MealCard({
  group,
  checklist,
  ahead,
  checkable,
  onToggle,
  onPress,
  onCopyYesterday,
}: {
  group: MealGroup;
  checklist: ChecklistRow[];
  ahead: boolean;
  checkable: boolean;
  onToggle: (row: ChecklistRow) => void;
  onPress: () => void;
  onCopyYesterday: () => void;
}) {
  const empty = group.entries.length === 0;

  /* ── with a plan: the card, then its checklist ── */
  if (checklist.length) {
    return (
      <Surface variant="card" radius="lg" onPress={onPress} style={styles.mealCard}>
        <View style={styles.mealRow}>
          <View style={styles.mealThumb}>
            <EngravedIcon name="bowl" size={22} />
          </View>
          <View style={styles.mealBody}>
            <Text style={styles.mealEyebrow}>{group.label}</Text>
            <Text style={[styles.mealName, empty && styles.mealNameQuiet]} numberOfLines={1}>
              {empty ? (ahead ? 'Planned' : 'Nothing checked off yet') : mealTitle(group)}
            </Text>
            {empty ? null : (
              <Text style={styles.mealSummary} numberOfLines={1}>
                {group.summary}
              </Text>
            )}
          </View>
          <View style={styles.mealRight}>
            <Text style={[styles.mealKcal, empty && styles.mealKcalQuiet]}>{grouped(group.kcal)}</Text>
          </View>
        </View>

        <View style={styles.checkList}>
          <Text style={styles.checkHead}>{ahead ? 'Planned' : checklistCount(checklist)}</Text>
          {checklist.map((row) => (
            <CheckRow key={row.key} row={row} disabled={!row.checked && !checkable} onPress={() => onToggle(row)} />
          ))}
        </View>
      </Surface>
    );
  }

  if (empty) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.emptyMeal}>
        <View style={styles.emptyIcon}>
          <EngravedIcon name="plus" size={20} color={flColor.charcoal500} />
        </View>
        <View style={styles.mealBody}>
          <Text style={styles.emptyEyebrow}>{group.label}</Text>
          <Text style={styles.emptyText}>{ahead ? 'Nothing planned yet' : 'Nothing logged yet'}</Text>
        </View>
        {/* Only the first empty slot of the day carries the shortcut in the `.dc`; here every empty slot
            offers it, because the reason to copy is the slot, not its position. */}
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onCopyYesterday}>
          <Text style={styles.copyLink}>Copy yesterday</Text>
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Surface variant="card" radius="lg" onPress={onPress} style={styles.mealCard}>
      {/* ⚠ The row lives HERE, not on the Surface's style. Surface wraps its children in a content layer,
          so a flexDirection handed to the Surface lays out that one layer — the thumb, text and kcal then
          stacked in a column instead of sitting in a row. */}
      <View style={styles.mealRow}>
        <View style={styles.mealThumb}>
          <EngravedIcon name="bowl" size={22} />
        </View>
        <View style={styles.mealBody}>
          <Text style={styles.mealEyebrow}>{group.label}</Text>
          <Text style={styles.mealName} numberOfLines={1}>
            {mealTitle(group)}
          </Text>
          <Text style={styles.mealSummary} numberOfLines={1}>
            {group.summary}
          </Text>
        </View>
        <View style={styles.mealRight}>
          <Text style={styles.mealKcal}>{grouped(group.kcal)}</Text>
        </View>
      </View>
    </Surface>
  );
}

/**
 * One line of a meal's checklist: the box, the food, its portion, its calories. The whole row is the target —
 * a 22pt box alone is a hard tap with a fork in the other hand. On a day that has not begun the box is drawn
 * dim, and a tap says when it can be ticked (`toggleCheck`) rather than doing nothing.
 */
function CheckRow({ row, disabled, onPress }: { row: ChecklistRow; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: row.checked, disabled }}
      accessibilityLabel={`${row.name}, ${row.kcal} calories`}
      onPress={onPress}
      style={({ pressed }) => [styles.checkRow, pressed && styles.checkRowPressed]}
    >
      <View style={[styles.checkBox, row.checked && styles.checkBoxOn, disabled && styles.checkBoxDim]}>
        {row.checked ? <EngravedIcon name="check" size={14} color={flColor.onBronze} /> : null}
      </View>
      <View style={styles.checkText}>
        <Text style={[styles.checkName, row.checked && styles.checkNameDone]} numberOfLines={1}>
          {row.name}
        </Text>
        {row.detail ? (
          <Text style={styles.checkDetail} numberOfLines={1}>
            {row.detail}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.checkKcal, !row.checked && styles.checkKcalWaiting]}>{grouped(row.kcal)}</Text>
    </Pressable>
  );
}

function Chevron({ direction, color, size = 18 }: { direction: 'left' | 'right'; color: string; size?: number; width?: number }) {
  return <EngravedIcon name={direction === 'left' ? 'chevron-left' : 'chevron-right'} size={size} color={color} />;
}

/*
 * ⚠ `onBronze`, NOT `base`. A filled Button's label is `flColor.onBronze` (#FFFFFF in both palettes,
 * because the bronze ground does not change with the theme), so an icon drawn in `base` sits next to a
 * white label as a near-black mark on bronze — which is exactly what the PO saw on LOG FOOD. Any icon
 * handed to a primary Button takes the same token its label does.
 */
const Plus = () => <EngravedIcon name="plus" size={17} color={flColor.onBronze} />;

const AddGlyph = () => <EngravedIcon name="plus" size={16} />;

const CalendarGlyph = () => <EngravedIcon name="calendar" size={16} />;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  /* 0206 — the preview refusal. Role tokens only, so Alabaster gets it for free: the compiler catches
     colour but not layout, and a hardcoded cream here would be invisible on the light ground. */
  previewGate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 10 },
  previewTitle: { fontFamily: flFont.display, fontSize: 23, color: flColor.cream100, letterSpacing: -0.2 },
  previewBody: { fontSize: 14, lineHeight: 21, color: flColor.gray400, textAlign: 'center' },
  consentAction: { alignSelf: 'stretch', marginTop: 12 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 2 },
  barAction: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  pickBody: { gap: 14, paddingBottom: 8 },

  dayStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 18 },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayArrow: { width: 44, height: 44, marginHorizontal: -7, alignItems: 'center', justifyContent: 'center' },
  dayName: { fontFamily: flFont.display, fontSize: 23, color: flColor.cream100, letterSpacing: -0.2, lineHeight: 26 },
  dayDate: { fontSize: 12, fontWeight: '500', letterSpacing: 1.4, color: flColor.gray600, marginTop: 2 },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
  detailsText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronzeInk },

  heroWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 6, paddingBottom: 4 },
  heroGlow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(186,134,84,0.07)',
    boxShadow: '0 0 90px 40px rgba(186,134,84,0.10)',
  },
  heroCentre: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 4 },
  heroValue: { fontFamily: flFont.display, fontSize: 52, color: flColor.cream100, letterSpacing: -1, lineHeight: 54 },
  heroLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.labelInk },
  heroCaption: { fontSize: 13, color: flColor.gray400 },
  heroSetTarget: { fontSize: 13, fontWeight: '600', color: flColor.bronzeInk },

  macroRow: { flexDirection: 'row', gap: 8, paddingTop: 16, paddingBottom: 22 },
  macro: { flex: 1, alignItems: 'center', gap: 9 },
  macroRingWrap: { width: MACRO_RING.box, height: MACRO_RING.box },
  macroValueWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  macroValue: { fontSize: 19, fontWeight: '700', color: flColor.cream100, letterSpacing: -0.3 },
  macroUnit: { fontSize: 11.5, fontWeight: '600' },
  macroLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.gray400 },
  macroTarget: { fontSize: 11.5, color: flColor.gray600 },

  actions: { gap: 10, paddingBottom: 26 },
  actionPair: { flexDirection: 'row', gap: 10 },
  actionHalf: { flex: 1 },
  premiumTag: {
    position: 'absolute',
    top: -7,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: flRadius.sm,
    backgroundColor: flColor.charcoal800,
    ...flBorder.bronzeSubtle,
  },
  premiumTagText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze300 },

  addList: { marginTop: -4 },
  addRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 2 },
  addDivider: { borderBottomWidth: 1, borderBottomColor: flColor.divider },
  addPressed: { backgroundColor: flColor.hoverWash },
  addIcon: { width: 36, alignItems: 'center' },
  addText: { flex: 1, gap: 3 },
  addTitle: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  addSub: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  scanPair: { flexDirection: 'row', gap: 8, marginTop: 8 },

  mealsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2, paddingBottom: 12 },
  careLine: { marginBottom: 18 },
  mealsTitle: { fontFamily: flFont.display, fontSize: 19, color: flColor.cream100, letterSpacing: -0.2 },
  mealsTotal: { fontSize: 11, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.gray600 },

  mealList: { gap: 10 },
  mealCard: { paddingVertical: 12, paddingHorizontal: 14, boxShadow: flShadow.cardSoft },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mealThumb: {
    width: 52,
    height: 52,
    borderRadius: flRadius.sm,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealBody: { flex: 1, minWidth: 0, gap: 3 },
  mealEyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.labelInk },
  mealName: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  mealSummary: { fontSize: 12.5, color: flColor.gray600 },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealKcal: { fontSize: 15, fontWeight: '700', color: flColor.cream100 },
  mealNameQuiet: { color: flColor.gray400, fontWeight: '500' },
  mealKcalQuiet: { color: flColor.gray600 },

  /* Plan ahead (0228). The bronze fill is earned by a tick; food still waiting reads quieter. */
  checkList: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: flColor.divider, gap: 2 },
  checkHead: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.labelInk, paddingBottom: 4 },
  checkRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: flRadius.sm },
  checkRowPressed: { backgroundColor: flColor.hoverWash },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: flColor.gray400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: flColor.bronze400, borderColor: flColor.bronze400 },
  checkBoxDim: { borderColor: flColor.charcoal500, borderStyle: 'dashed' },
  checkText: { flex: 1, minWidth: 0, gap: 1 },
  checkName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  checkNameDone: { color: flColor.gray400 },
  checkDetail: { fontSize: 12, color: flColor.gray600 },
  checkKcal: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  checkKcalWaiting: { color: flColor.gray600 },

  emptyMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.charcoal600,
  },
  emptyIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  emptyEyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.gray600 },
  emptyText: { fontSize: 14, color: flColor.gray400 },
  copyLink: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.6, color: flColor.bronzeInk },
});
