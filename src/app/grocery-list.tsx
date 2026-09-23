import { useCallback, useMemo, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont } from '@/constants/foundation';
import { localToday } from '@/domain/nutrition/day';
import {
  activeItems,
  addExtra,
  estimateFor,
  estimateLine,
  groceryList,
  markHave,
  planSignature,
  shareText,
  stateFor,
  toggle,
  type ActiveItem,
  type GroceryState,
} from '@/domain/nutrition/grocery';
import { AISLES } from '@/domain/nutrition/grocery-data';
import { mondayOf, portionLabel, weekDates, weekRange } from '@/domain/nutrition/meal-planner';
import { fetchGroceryState, fetchMealPlanPrefs, fetchMealPlanWeek, fetchUserRecipes, saveGroceryState } from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { errorMessage, useQuery } from '@/lib/useQuery';

const HAVE_AT = -72;

/**
 * Grocery List — built to `Grocery List.dc.html` (Claude Design b029488a).
 *
 * ⚠ **BUILT FROM COOKS, NEVER FROM MEALS** (Recipe Schema and Planner Rules §1, `domain/nutrition/
 * grocery.ts`). A dinner that also feeds tomorrow's lunch is bought once, for both. The list is derived
 * every time from the stored week; only the athlete's marks are saved (`meal_plan_weeks.grocery`, 0212),
 * so the phone and the web show the same cart — the `.dc` kept them in one browser's localStorage.
 *
 * ⚠ **THE ESTIMATE IS SOURCED OR SILENT.** USDA ERS and BLS average prices (`grocery-data.ts`); items with
 * no public price are left out and counted on the line ("25 items not priced"). PO 2026-09-23: "let's
 * pull" — the `.dc`'s mockup prices are not used.
 *
 * Deltas from the `.dc`, each deliberate:
 *  · The subline adds the week's cook count ("9 cooks"), which the Rules §3 say the Grocery List shows.
 *  · Its preview fixture (three produce items pre-ticked) is not reproduced.
 *  · Swipe-left to "Have it" is kept; every swipe action is also a button in the item's sheet, so it is
 *    reachable without the gesture.
 */
export default function GroceryListScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [todayIso] = useState(() => localToday());
  const monday = mondayOf(todayIso);
  const dates = useMemo(() => weekDates(monday), [monday]);
  const [reloads, setReloads] = useState(0);
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));

  /* The athlete's recipes go into the book first, so a week naming one buys its ingredients. */
  const mineQ = useQuery(fetchUserRecipes, [reloads]);
  const weekQ = useQuery(useCallback(() => fetchMealPlanWeek(monday), [monday]), [monday, reloads]);
  const prefsQ = useQuery(fetchMealPlanPrefs, [reloads]);
  const savedQ = useQuery(useCallback(() => fetchGroceryState(monday), [monday]), [monday, reloads]);

  const loaded = mineQ.settled && weekQ.settled && prefsQ.settled && savedQ.settled;
  const household = prefsQ.data?.household ?? 1;
  const days = mineQ.settled ? (weekQ.data?.days ?? null) : null;
  const mine = mineQ.data;

  const list = useMemo(() => (days && mine ? groceryList(days, household) : null), [days, household, mine]);
  const sig = useMemo(() => (days ? planSignature(days, household) : ''), [days, household]);
  const base = useMemo(() => (list ? stateFor(savedQ.data ?? null, list, sig) : null), [list, sig, savedQ.data]);

  /* The athlete's marks this visit, tied to the list they were made on. */
  const [local, setLocal] = useState<{ base: GroceryState; s: GroceryState } | null>(null);
  const state = local && base && local.base === base ? local.s : base;

  const [typing, setTyping] = useState('');
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [haveOpen, setHaveOpen] = useState(false);

  /* No week yet: the list is built from the plan, so the plan comes first. */
  if (loaded && !days) return <Redirect href="/meal-plan" />;

  const update = (next: GroceryState) => {
    if (base) setLocal({ base, s: next });
    saveGroceryState(monday, next).catch((e) => showToast(errorMessage(e)));
  };

  const active: ActiveItem[] = list && state ? activeItems(list, state) : [];
  const inCart = state ? active.filter((x) => state.checked[x.key]) : [];
  const groups = state
    ? [...AISLES, 'Other' as const]
        .map((aisle) => ({ aisle: aisle as string, items: active.filter((x) => x.aisle === aisle && !state.checked[x.key]) }))
        .filter((g) => g.items.length)
    : [];
  if (inCart.length) groups.push({ aisle: 'In the cart', items: inCart });
  const haveList = list && state ? list.items.filter((x) => state.have[x.key]) : [];
  const estimate = list && state ? estimateFor(list, state) : null;
  const budget = prefsQ.data?.weeklyBudgetUsd ?? null;
  const range = weekRange(dates);

  const commitTyping = () => {
    if (!list || !state) return;
    const out = addExtra(list, state, typing);
    setTyping('');
    if (out.note) showToast(out.note);
    if (out.state !== state) update(out.state);
  };

  const sheetActive = sheetKey ? active.find((x) => x.key === sheetKey) ?? null : null;
  const sheetItem = sheetKey && list ? (list.items.find((x) => x.key === sheetKey) ?? null) : null;

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.46)' }} />
      <AppBar title="" transparent onBack={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.identity}>
          <Text style={styles.eyebrow}>Nutrition</Text>
          <Text style={styles.title}>Grocery list</Text>
          {list ? (
            <Text style={styles.lede}>
              {`${range} · ${list.cooks} ${list.cooks === 1 ? 'cook' : 'cooks'} · for ${household} ${household === 1 ? 'person' : 'people'}`}
            </Text>
          ) : null}
        </View>

        <View style={styles.addWrap}>
          <InputField
            value={typing}
            onChange={setTyping}
            onSubmitEditing={commitTyping}
            submitBehavior="submit"
            returnKeyType="done"
            placeholder="Add something else, then return"
            maxLength={40}
            accessibilityLabel="Add an item"
          />
        </View>

        {state
          ? groups.map((g) => (
              <View key={g.aisle} style={styles.group}>
                <View style={styles.groupHead}>
                  <Text style={styles.groupLabel}>{g.aisle}</Text>
                  <Text style={styles.groupCount}>{g.items.length}</Text>
                </View>
                {g.items.map((x) => (
                  <SwipeRow
                    key={x.key}
                    item={x}
                    checked={!!state.checked[x.key]}
                    onToggle={() => update({ ...state, checked: toggle(state.checked, x.key) })}
                    onOpen={() => setSheetKey(x.key)}
                    onSwipe={() => {
                      if (x.extra) {
                        const checked = { ...state.checked };
                        delete checked[x.key];
                        update({ ...state, extras: state.extras.filter((y) => y.key !== x.key), checked });
                        showToast(`${x.name} removed`);
                      } else update(markHave(state, x.key));
                    }}
                  />
                ))}
              </View>
            ))
          : null}

        {state && haveList.length ? (
          <View style={styles.haveWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: haveOpen }}
              style={styles.haveHead}
              onPress={() => setHaveOpen((o) => !o)}
            >
              <View style={styles.haveHeadText}>
                <Text style={styles.groupLabel}>Have it</Text>
                <Text style={styles.haveSummary} numberOfLines={2}>
                  {haveList.map((x) => x.name).join(', ')}
                </Text>
              </View>
              <View style={haveOpen ? styles.chevOpen : null}>
                <Chevron />
              </View>
            </Pressable>
            {haveOpen
              ? haveList.map((x) => (
                  <View key={x.key} style={styles.haveRow}>
                    <Text style={styles.haveName}>{x.name}</Text>
                    <Pressable accessibilityRole="button" hitSlop={6} onPress={() => update({ ...state, have: toggle(state.have, x.key) })}>
                      <Text style={styles.link}>Add back</Text>
                    </Pressable>
                  </View>
                ))
              : null}
          </View>
        ) : null}
      </ScrollView>

      {state ? (
        <View style={styles.footer}>
          <View style={styles.footerText}>
            <Text style={styles.countLine} accessibilityLiveRegion="polite">
              {`${active.length - inCart.length} left · ${inCart.length} in cart`}
            </Text>
            {estimate && estimate.dollars > 0 ? <Text style={styles.estimate}>{estimateLine(estimate, budget)}</Text> : null}
          </View>
          <Button
            variant="secondary"
            onPress={async () => {
              try {
                await Share.share({ title: 'Grocery list', message: shareText(range, active, state) });
              } catch {
                showToast('Couldn’t share the list');
              }
            }}
          >
            Share
          </Button>
        </View>
      ) : null}

      <BottomSheet open={!!sheetKey && !!state} onClose={() => setSheetKey(null)} title={sheetActive?.name ?? sheetItem?.name ?? ''}>
        {state && sheetKey ? (
          <View style={styles.sheetBody}>
            {sheetItem ? (
              <>
                <View style={styles.sheetTop}>
                  <Text style={styles.sheetAmount}>{sheetItem.amount}</Text>
                  <Text style={styles.sheetMeta}>
                    {`for ${sheetItem.uses.length} ${sheetItem.uses.length === 1 ? 'meal' : 'meals'} · ${sheetItem.grams.toLocaleString('en-US')} g in recipes`}
                  </Text>
                </View>
                <Text style={styles.usedIn}>Used in</Text>
                {sheetItem.uses.map((u, i) => (
                  <View key={`${u.day}-${u.slot}-${i}`} style={styles.useRow}>
                    <View style={styles.useText}>
                      <Text style={styles.useWhen}>{`${u.day} ${u.slot.toLowerCase()} · ${portionLabel(u.servings)}`}</Text>
                      <Text style={styles.useRecipe} numberOfLines={1}>
                        {u.recipe}
                      </Text>
                    </View>
                    <Text style={styles.useGrams}>{`${u.grams.toLocaleString('en-US')} g`}</Text>
                  </View>
                ))}
                <View style={styles.sheetActions}>
                  <Button
                    variant="secondary"
                    fullWidth
                    onPress={() => {
                      update(state.have[sheetItem.key] ? { ...state, have: toggle(state.have, sheetItem.key) } : markHave(state, sheetItem.key));
                      setSheetKey(null);
                    }}
                  >
                    {state.have[sheetItem.key] ? 'Put back on the list' : 'Have it'}
                  </Button>
                </View>
              </>
            ) : (
              <Text style={styles.sheetMeta}>Added by you</Text>
            )}
            <Pressable
              accessibilityRole="button"
              style={styles.removeWrap}
              onPress={() => {
                const checked = { ...state.checked };
                delete checked[sheetKey];
                if (sheetItem) {
                  update({ ...state, removed: { ...state.removed, [sheetKey]: true }, checked });
                  showToast(`${sheetItem.name} removed. Type it in to add it back.`);
                } else {
                  update({ ...state, extras: state.extras.filter((x) => x.key !== sheetKey), checked });
                }
                setSheetKey(null);
              }}
            >
              <Text style={styles.linkQuiet}>Remove from list</Text>
            </Pressable>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

/**
 * One row: a checkbox, the name and amount (tap for the sheet), and swipe left past 72 px for "Have it"
 * (or, for an item the athlete added, remove). A mostly-vertical drag is left to the scroll view.
 */
function SwipeRow({
  item,
  checked,
  onToggle,
  onOpen,
  onSwipe,
}: {
  item: ActiveItem;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onSwipe: () => void;
}) {
  const [dx] = useState(() => new Animated.Value(0));
  const reveal = dx.interpolate({ inputRange: [HAVE_AT, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => dx.setValue(Math.max(-120, Math.min(0, g.dx))),
        onPanResponderRelease: (_, g) => {
          if (g.dx <= HAVE_AT) {
            Animated.timing(dx, { toValue: -400, duration: 160, useNativeDriver: false }).start(() => {
              dx.setValue(0);
              onSwipe();
            });
          } else Animated.timing(dx, { toValue: 0, duration: 220, useNativeDriver: false }).start();
        },
        onPanResponderTerminate: () => Animated.timing(dx, { toValue: 0, duration: 220, useNativeDriver: false }).start(),
      }),
    [dx, onSwipe],
  );

  return (
    <View style={styles.rowWrap}>
      <Animated.View style={[styles.reveal, { opacity: reveal }]} pointerEvents="none">
        <HouseGlyph />
        <Text style={styles.revealText}>{item.extra ? 'Remove' : 'Have it'}</Text>
      </Animated.View>
      <Animated.View style={[styles.row, { transform: [{ translateX: dx }] }]} {...pan.panHandlers}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={item.amount ? `${item.name}, ${item.amount}` : item.name}
          style={styles.checkHit}
          onPress={onToggle}
        >
          <View style={[styles.box, checked && styles.boxOn]}>
            {checked ? (
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.onBronze} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12.5l4.5 4.5L19 7.5" />
              </Svg>
            ) : null}
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]} onPress={onOpen}>
          <Text style={[styles.rowName, checked && styles.rowDone]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.amount ? <Text style={[styles.rowAmount, checked && styles.rowAmountDone]}>{item.amount}</Text> : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Chevron() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

function HouseGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  identity: { gap: 6, paddingHorizontal: 2, paddingTop: 2, paddingBottom: 6 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
  title: { fontFamily: flFont.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.3, color: flColor.cream100 },
  lede: { marginTop: 4, fontSize: 14, lineHeight: 21, color: flColor.gray400 },
  addWrap: { paddingTop: 16 },

  group: { paddingTop: 26 },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal600,
  },
  groupLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray400 },
  groupCount: { fontSize: 12, color: flColor.gray400, fontVariant: ['tabular-nums'] },

  rowWrap: { position: 'relative', overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  reveal: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingRight: 14,
    backgroundColor: flColor.bronzeTint,
  },
  revealText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: flColor.base },
  checkHit: { width: 44, height: 52, justifyContent: 'center', paddingLeft: 2 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: flColor.charcoal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: flColor.bronze400, borderColor: flColor.bronze400 },
  rowMain: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 2 },
  pressed: { opacity: 0.7 },
  rowName: { flex: 1, fontSize: 15, color: flColor.cream100 },
  rowDone: { color: flColor.gray400, textDecorationLine: 'line-through' },
  rowAmount: { fontSize: 14, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  rowAmountDone: { color: flColor.gray400 },

  haveWrap: { paddingTop: 30 },
  haveHead: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal600,
  },
  haveHeadText: { flex: 1, gap: 2, paddingVertical: 6 },
  haveSummary: { fontSize: 13, color: flColor.gray400 },
  chevOpen: { transform: [{ rotate: '90deg' }] },
  haveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  haveName: { fontSize: 14.5, color: flColor.gray400 },
  link: { paddingVertical: 12, paddingHorizontal: 2, fontSize: 13, fontWeight: '600', color: flColor.bronze400 },
  linkQuiet: { paddingVertical: 12, paddingHorizontal: 8, fontSize: 13, fontWeight: '600', color: flColor.gray400 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingTop: 12,
    paddingBottom: SCREEN_BOTTOM_GAP,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  footerText: { flex: 1, minWidth: 0, gap: 2 },
  countLine: { fontSize: 15, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  estimate: { fontSize: 12.5, lineHeight: 17, color: flColor.gray400 },

  sheetBody: { paddingBottom: 12 },
  sheetTop: { marginTop: -6, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  sheetAmount: { fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  sheetMeta: { fontSize: 13, color: flColor.gray400 },
  usedIn: { paddingTop: 20, paddingBottom: 4, fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray400 },
  useRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  useText: { flex: 1, minWidth: 0, gap: 2 },
  useWhen: { fontSize: 12, color: flColor.gray400 },
  useRecipe: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  useGrams: { fontSize: 13, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  sheetActions: { paddingTop: 18 },
  removeWrap: { alignSelf: 'center', paddingTop: 6 },
});
