import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
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
  dayLabel,
  groupByMeal,
  mealTitle,
  ringDash,
  ringFraction,
  shiftDay,
  totals,
  type MealGroup,
  type MealSlot,
} from '@/domain/nutrition/day';
import { copyMealFrom, fetchDay, hasFoodAfter, isNutritionFirstRun, mealHasFood } from '@/data/nutrition-live';
import { useEarnedMoments } from '@/hooks/useEarnedMoments';
import { useToast } from '@/hooks/useCeremony';
import { useEntitlementState, useNutritionAccess, useTier } from '@/lib/entitlement';
import { useProfile } from '@/lib/profile';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { useQuery } from '@/lib/useQuery';

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
const MACRO_RING = { box: 94, r: 40, stroke: 9 } as const;

export default function NutritionScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const tier = useTier();
  const { profile } = useProfile();
  /* 0206 — the preview allowlist. The TAB is hidden for everyone else, but `/nutrition` is still a real
     route, so a typed URL or a stale deep link lands here. Read alongside `status` so the two accounts
     that DO have access never see the refusal flash while entitlement is still loading. */
  const mayUseNutrition = useNutritionAccess();
  const { status: entitlementStatus } = useEntitlementState();
  useEarnedMoments();

  /* The day being read. Minted once per mount from the device clock, then moved only by the arrows —
     so a session that crosses midnight keeps showing the day the athlete was looking at. */
  const [todayIso] = useState(() => localToday());
  const [iso, setIso] = useState(todayIso);
  const [reloads, setReloads] = useState(0);

  const { data: day, loading } = useQuery(useCallback(() => fetchDay(iso), [iso]), [iso, reloads]);
  /**
   * ⚠ THE FORWARD ARROW IS NOT ONLY ABOUT TODAY ANY MORE. `canGoForward` closes the strip at today
   * because a diary of the future is a plan — still true of LOGGING. But Meal Detail can now copy a meal
   * FORWARD (meal prep is the reason the `.dc` defaults its copy to tomorrow), and that writes real rows
   * on a real day. A day the athlete cannot reach is a day they cannot correct, so the arrow also opens
   * when there is already food out there.
   */
  const { data: foodAhead } = useQuery(useCallback(() => hasFoodAfter(iso), [iso]), [iso, reloads]);
  const mayGoForward = canGoForward(iso, todayIso) || !!foodAhead;
  /* Any return to the tab re-reads — food logged on another screen has to be here when you come back. */
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));
  /* `Nutrition First Run.dc.html` — never touched the tab. Re-read on every return, so the first food
     logged from the welcome brings the athlete back to Home. Unknown answers Home (`first-run.ts`). */
  const { data: firstRun, settled: firstRunSettled } = useQuery(isNutritionFirstRun, [reloads]);

  /* Memoised before the two derived reads: `day?.entries ?? []` mints a new array on every render, which
     would make both useMemos below recompute every time (react-compiler flags exactly this). */
  const entries = useMemo(() => day?.entries ?? [], [day]);
  const eaten = useMemo(() => totals(entries), [entries]);
  const groups = useMemo(() => groupByMeal(entries), [entries]);
  const targets = day?.targets ?? null;

  const headline = targets
    ? calorieHeadline(eaten.kcal, targets.kcal, 'eaten')
    : { value: String(eaten.kcal), label: 'Calories' };

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
            onPress={() => setIso(todayIso)}
            style={styles.barAction}
          >
            <EngravedIcon name="calendar" size={21} />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: SCREEN_BOTTOM_GAP }]}
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

        {/* ── calorie ring ──────────────────────────────────────────────── */}
        <View style={styles.heroWrap}>
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
            <Text style={styles.heroValue}>{headline.value}</Text>
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
        </View>

        {/* ── macro rings ───────────────────────────────────────────────── */}
        <View style={styles.macroRow}>
          <MacroRing label="Protein" value={eaten.protein} target={targets?.protein ?? null} color={flColor.greenMuted} />
          <MacroRing label="Carbs" value={eaten.carb} target={targets?.carb ?? null} color={flColor.plumMuted} />
          <MacroRing label="Fat" value={eaten.fat} target={targets?.fat ?? null} color={flColor.blueMuted} />
        </View>

        {/* ── actions ───────────────────────────────────────────────────── */}
        <View style={styles.actions}>
          <Button variant="primary" fullWidth icon={<Plus />} onPress={() => goLog()}>
            Log Food
          </Button>
          <View style={styles.actionPair}>
            <View style={styles.actionHalf}>
              <Button variant="secondary" fullWidth icon={<ScanGlyph />} onPress={() => router.push({ pathname: '/log-food', params: { date: iso, scan: '1' } })}>
                Scan
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
                  if (tier !== 'PREMIUM') { router.push('/subscription'); return; }
                  router.push('/meal-plan');
                }}
              >
                Meal Plan
              </Button>
              {tier !== 'PREMIUM' ? (
                <View style={styles.premiumTag} pointerEvents="none">
                  <Text style={styles.premiumTagText}>Premium</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── meals ─────────────────────────────────────────────────────── */}
        <View style={styles.mealsHeader}>
          <Text style={styles.mealsTitle}>{iso === todayIso ? "Today's Meals" : 'Meals'}</Text>
          <Text style={styles.mealsTotal}>{loading && !day ? '—' : `${eaten.kcal.toLocaleString('en-US')} cal`}</Text>
        </View>

        <View style={styles.mealList}>
          {groups.map((group) => (
            <MealCard
              key={group.meal}
              group={group}
              /* A meal WITH food opens itself — Meal Detail is where a portion is fixed, a mis-tap is
                 deleted and the plate is saved. An empty one has nothing to show, so its card stays the
                 shortcut into the search it has always been. */
              onPress={() =>
                group.entries.length
                  ? router.push({ pathname: '/meal-detail', params: { date: iso, meal: group.meal } })
                  : goLog(group.meal)
              }
              onCopyYesterday={() => copyYesterday(group.meal)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

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
  onPress,
  onCopyYesterday,
}: {
  group: MealGroup;
  onPress: () => void;
  onCopyYesterday: () => void;
}) {
  const empty = group.entries.length === 0;

  if (empty) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.emptyMeal}>
        <View style={styles.emptyIcon}>
          <EngravedIcon name="plus" size={20} color={flColor.charcoal500} />
        </View>
        <View style={styles.mealBody}>
          <Text style={styles.emptyEyebrow}>{group.label}</Text>
          <Text style={styles.emptyText}>Nothing logged yet</Text>
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
        <Text style={styles.mealKcal}>{group.kcal}</Text>
      </View>
    </Surface>
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

const ScanGlyph = () => <EngravedIcon name="barcode-scan" size={16} />;

const CalendarGlyph = () => <EngravedIcon name="calendar" size={16} />;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  /* 0206 — the preview refusal. Role tokens only, so Alabaster gets it for free: the compiler catches
     colour but not layout, and a hardcoded cream here would be invisible on the light ground. */
  previewGate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 10 },
  previewTitle: { fontFamily: flFont.display, fontSize: 23, color: flColor.cream100, letterSpacing: -0.2 },
  previewBody: { fontSize: 14, lineHeight: 21, color: flColor.gray400, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 2 },
  barAction: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

  dayStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 18 },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayArrow: { width: 44, height: 44, marginHorizontal: -7, alignItems: 'center', justifyContent: 'center' },
  dayName: { fontFamily: flFont.display, fontSize: 23, color: flColor.cream100, letterSpacing: -0.2, lineHeight: 26 },
  dayDate: { fontSize: 12, fontWeight: '500', letterSpacing: 1.4, color: flColor.gray600, marginTop: 2 },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
  detailsText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400 },

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
  heroLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
  heroCaption: { fontSize: 13, color: flColor.gray400 },
  heroSetTarget: { fontSize: 13, fontWeight: '600', color: flColor.bronze400 },

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

  mealsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2, paddingBottom: 12 },
  mealsTitle: { fontFamily: flFont.display, fontSize: 19, color: flColor.cream100, letterSpacing: -0.2 },
  mealsTotal: { fontSize: 11, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.gray600 },

  mealList: { gap: 10 },
  mealCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14, boxShadow: flShadow.cardSoft },
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
  mealEyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.bronze400 },
  mealName: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  mealSummary: { fontSize: 12.5, color: flColor.gray600 },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealKcal: { fontSize: 15, fontWeight: '700', color: flColor.cream100 },

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
  copyLink: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.6, color: flColor.bronze400 },
});
