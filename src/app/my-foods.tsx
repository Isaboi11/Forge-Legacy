import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import {
  MEAL_NAME_MAX,
  amountLine,
  foodListKcal,
  foodMeta,
  itemFromFood,
  itemFromRow,
  itemKcal,
  itemRow,
  matchesQuery,
  mealMeta,
  mealTotals,
  missingLine,
  qtyText,
  stepQty,
  type MealItem,
} from '@/domain/nutrition/my-foods';
import { looksSane, type CatalogFood } from '@/domain/nutrition/serving';
import {
  deleteSavedMeal,
  deleteUserFood,
  fetchMyFoods,
  fetchSavedMealItems,
  fetchSavedMeals,
  saveSavedMeal,
  searchFoods,
  type SavedMeal,
} from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { errorMessage, useQuery } from '@/lib/useQuery';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

type Tab = 'foods' | 'meals';
type Sheet = { kind: 'food' | 'meal'; id: string; step: 'menu' | 'confirm' };
type Editor = { id: string | null; name: string; items: MealItem[]; loading: boolean };

/**
 * My Foods & Meals — built to `My Foods and Meals.dc.html` (Claude Design b029488a), wired to
 * `user_foods` and `saved_meals` (0205). Closes the stress test's "append-only" finding (§8 #3, #7):
 * before this, neither could be edited or deleted anywhere.
 *
 * One route, two modes like the `.dc`: the list (Foods · Meals), and the meal editor (new or edit).
 * A food edits in Create Food, which already has an edit mode. `?tab=meals` opens on Meals and
 * `?newMeal=1` opens a blank meal.
 *
 * ⚠ **EDITS AND DELETES NEVER REACH A LOGGED DAY.** Diary rows and saved-meal items are snapshots
 * (0205), so this screen can only change what is logged from now on — which is what its footnote says.
 *
 * Deltas from the `.dc`, each deliberate:
 *  · Its sample foods and meals are preview fixtures and are not seeded — a real list starts empty.
 *  · Lists sort A–Z (as Log Food lists them), not newest first: `user_foods` reads carry no date.
 *  · "Add a food" searches the athlete's own foods, then the live food search (USDA · Open Food
 *    Facts · FatSecret), where the `.dc` searched its own sample list.
 */
export default function MyFoodsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ tab?: string; newMeal?: string }>();

  const [reloads, setReloads] = useState(0);
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));
  const foodsQ = useQuery(fetchMyFoods, [reloads]);
  const mealsQ = useQuery(fetchSavedMeals, [reloads]);
  const foods = useMemo(() => foodsQ.data ?? [], [foodsQ.data]);
  const meals = useMemo(() => mealsQ.data ?? [], [mealsQ.data]);

  const [tab, setTab] = useState<Tab>(params.tab === 'meals' || params.newMeal === '1' ? 'meals' : 'foods');
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(
    params.newMeal === '1' ? { id: null, name: '', items: [], loading: false } : null,
  );

  /* ── list ── */
  const onFoods = tab === 'foods';
  const shownFoods = foods.filter((f) => matchesQuery(f.name, q));
  const shownMeals = meals.filter((m) => matchesQuery(m.name, q));
  const count = onFoods ? foods.length : meals.length;
  const shownCount = onFoods ? shownFoods.length : shownMeals.length;
  const settled = onFoods ? foodsQ.settled : mealsQ.settled;

  const editFood = (key: string) => {
    setSheet(null);
    router.push({ pathname: '/create-food', params: { mode: 'edit', food: key } });
  };

  const openMeal = async (m: SavedMeal) => {
    setSheet(null);
    setEditor({ id: m.id, name: m.name, items: [], loading: true });
    try {
      const rows = await fetchSavedMealItems(m.id);
      setEditor((e) => (e && e.id === m.id ? { ...e, items: rows.map(itemFromRow), loading: false } : e));
    } catch (e) {
      setEditor(null);
      showToast(errorMessage(e));
    }
  };

  const remove = async (kind: 'food' | 'meal', id: string, name: string) => {
    if (busy) return;
    setBusy(true);
    try {
      if (kind === 'food') await deleteUserFood(id);
      else await deleteSavedMeal(id);
      setSheet(null);
      setEditor(null);
      setReloads((n) => n + 1);
      showToast(`Deleted ${name}`);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /* ── meal editor ── */
  const [fq, setFq] = useState('');
  const [search, setSearch] = useState<{ q: string; foods: CatalogFood[] }>({ q: '', foods: [] });
  useEffect(() => {
    const term = fq.trim();
    if (term.length < 2) return;
    let live = true;
    const timer = setTimeout(async () => {
      const found = await searchFoods(term);
      if (live) setSearch({ q: term, foods: found.filter(looksSane) });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [fq]);

  const term = fq.trim();
  const mineHits = term ? foods.filter((f) => matchesQuery(f.name, term)).slice(0, 3) : [];
  const libHits = term.length >= 2 && search.q === term ? search.foods : [];
  const results = [...mineHits.map((f) => ({ food: f, mine: true })), ...libHits.map((f) => ({ food: f, mine: false }))].slice(0, 6);
  const searching = term.length >= 2 && search.q !== term;

  const setItems = (fn: (items: MealItem[]) => MealItem[]) => setEditor((e) => (e ? { ...e, items: fn(e.items) } : e));
  const totals = editor ? mealTotals(editor.items) : { kcal: 0, protein: 0 };
  const missing = editor && !editor.loading ? missingLine(editor.name, editor.items) : '';

  const closeEditor = () => {
    setEditor(null);
    setFq('');
  };

  const saveMeal = async () => {
    if (!editor || editor.loading || missing || busy) return;
    setBusy(true);
    try {
      const name = editor.name.trim();
      await saveSavedMeal(editor.id, name, editor.items.map(itemRow));
      showToast(editor.id ? 'Meal saved' : `${name} saved. Log it from My meals.`);
      setTab('meals');
      closeEditor();
      setReloads((n) => n + 1);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /* ── sheet ── */
  const sheetFood = sheet?.kind === 'food' ? foods.find((f) => f.key === sheet.id) : undefined;
  const sheetMeal = sheet?.kind === 'meal' ? meals.find((m) => m.id === sheet.id) : undefined;
  const sheetName = sheetFood?.name ?? sheetMeal?.name ?? '';
  const sheetMeta = sheetFood
    ? `${foodMeta(sheetFood)} · ${fmt(foodListKcal(sheetFood))} cal`
    : sheetMeal
      ? `${sheetMeal.itemCount} ${sheetMeal.itemCount === 1 ? 'food' : 'foods'} · ${fmt(sheetMeal.kcal)} cal`
      : '';

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.46)' }} />
      <AppBar title="" transparent onBack={() => (editor ? closeEditor() : router.back())} />

      {!editor ? (
        <>
          {/* ═══════════ LIST ═══════════ */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.identity}>
              <Text style={styles.eyebrow}>Nutrition</Text>
              <Text style={styles.title}>My foods & meals</Text>
            </View>

            <View accessibilityRole="radiogroup" accessibilityLabel="Show" style={styles.tabs}>
              {(
                [
                  ['foods', `Foods · ${foods.length}`],
                  ['meals', `Meals · ${meals.length}`],
                ] as const
              ).map(([key, label]) => {
                const on = tab === key;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.tab, on && styles.tabOn]}
                    onPress={() => {
                      setTab(key);
                      setQ('');
                    }}
                  >
                    <Text style={[styles.tabText, on && styles.tabTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {count ? (
              <>
                <View style={styles.searchWrap}>
                  <InputField
                    value={q}
                    onChange={setQ}
                    placeholder={onFoods ? 'Search my foods' : 'Search my meals'}
                    accessibilityLabel={onFoods ? 'Search my foods' : 'Search my meals'}
                    leadingIcon={<SearchGlyph />}
                  />
                </View>
                <View style={styles.listTop}>
                  {onFoods
                    ? shownFoods.map((f) => (
                        <ListRow
                          key={f.key}
                          name={f.name}
                          meta={foodMeta(f)}
                          kcal={foodListKcal(f)}
                          onEdit={() => editFood(f.key)}
                          onMore={() => setSheet({ kind: 'food', id: f.key, step: 'menu' })}
                        />
                      ))
                    : shownMeals.map((m) => (
                        <ListRow
                          key={m.id}
                          name={m.name}
                          meta={mealMeta(m.itemNames)}
                          kcal={m.kcal}
                          onEdit={() => openMeal(m)}
                          onMore={() => setSheet({ kind: 'meal', id: m.id, step: 'menu' })}
                        />
                      ))}
                </View>
                {!shownCount ? <Text style={styles.noMatch}>{`Nothing matches “${q.trim()}”.`}</Text> : null}
                <Text style={styles.footnote}>
                  Edits and deletes only change what you log from now on. Days you’ve already logged keep what you ate.
                </Text>
              </>
            ) : settled ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{onFoods ? 'No foods of your own yet' : 'No saved meals yet'}</Text>
                <Text style={styles.emptyBody}>
                  {onFoods
                    ? 'Create a food when you can’t find it in search, like something homemade or from a local shop.'
                    : 'Save foods you eat together, like a post-lift shake, and log them all in one tap.'}
                </Text>
              </View>
            ) : null}
          </ScrollView>
          <View style={styles.footer}>
            <Button
              variant="primary"
              fullWidth
              onPress={() => (onFoods ? router.push('/create-food') : setEditor({ id: null, name: '', items: [], loading: false }))}
            >
              {onFoods ? 'Create food' : 'Create meal'}
            </Button>
          </View>
        </>
      ) : (
        <>
          {/* ═══════════ MEAL EDITOR ═══════════ */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.identityForm}>
              <Text style={styles.eyebrow}>My meals</Text>
              <Text style={styles.title}>{editor.id ? 'Edit meal' : 'New meal'}</Text>
              {!editor.id ? <Text style={styles.lede}>Foods you eat together, saved so they log in one tap.</Text> : null}
            </View>

            <InputField
              label="Name"
              value={editor.name}
              onChange={(v) => setEditor((e) => (e ? { ...e, name: v } : e))}
              placeholder="e.g. Post-lift shake"
              maxLength={MEAL_NAME_MAX}
            />

            <View style={styles.h2Row}>
              <Text style={styles.h2}>Foods</Text>
              <Text style={styles.h2Meta}>
                <Text style={styles.h2MetaStrong}>{fmt(totals.kcal)}</Text>
                {` cal · ${fmt(totals.protein)} g protein`}
              </Text>
            </View>

            {editor.loading ? <Text style={styles.status}>Loading…</Text> : null}
            {editor.items.map((it, j) => (
              <View key={`${it.sourceKey ?? it.name}-${j}`} style={styles.itemRow}>
                <View style={styles.itemText}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {it.name}
                  </Text>
                  <Text style={styles.itemAmount}>{`${amountLine(it)} · ${fmt(itemKcal(it))} cal`}</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Less ${it.name}`}
                    style={styles.stepBtn}
                    onPress={() => setItems((a) => a.map((y, k) => (k === j ? { ...y, quantity: stepQty(y.quantity, -1) } : y)))}
                  >
                    <Text style={styles.stepSign}>−</Text>
                  </Pressable>
                  <Text style={styles.stepValue}>{qtyText(it.quantity)}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`More ${it.name}`}
                    style={styles.stepBtn}
                    onPress={() => setItems((a) => a.map((y, k) => (k === j ? { ...y, quantity: stepQty(y.quantity, 1) } : y)))}
                  >
                    <Text style={styles.stepSign}>+</Text>
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${it.name}`}
                  style={styles.xBtn}
                  onPress={() => setItems((a) => a.filter((_, k) => k !== j))}
                >
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2.4} strokeLinecap="round">
                    <Path d="M6 6l12 12M18 6L6 18" />
                  </Svg>
                </Pressable>
              </View>
            ))}

            <View style={styles.searchWrap}>
              <InputField
                value={fq}
                onChange={setFq}
                placeholder="Search foods to add"
                accessibilityLabel="Search foods to add"
                leadingIcon={<SearchGlyph />}
              />
            </View>
            {results.length ? (
              <View style={styles.results}>
                {results.map(({ food, mine }, j) => {
                  const add = itemFromFood(food);
                  return (
                    <Pressable
                      key={`${food.key}-${j}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${food.name}`}
                      style={({ pressed }) => [styles.result, j > 0 && styles.resultDivider, pressed && styles.pressed]}
                      onPress={() => {
                        setItems((a) => [...a, add]);
                        setFq('');
                      }}
                    >
                      <View style={styles.resultText}>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {food.name}
                        </Text>
                        <Text style={styles.resultSub} numberOfLines={1}>
                          {[mine ? 'My food' : null, `${fmt(add.per.kcal)} cal per ${add.unit}`].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2.2} strokeLinecap="round">
                        <Path d="M12 5v14M5 12h14" />
                      </Svg>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {searching && !results.length ? <Text style={styles.noResults}>Searching…</Text> : null}
            {term.length >= 2 && !searching && !results.length ? (
              <Text style={styles.noResults}>No foods match. Try a simpler word, like “chicken”.</Text>
            ) : null}

            {editor.id ? (
              <Pressable
                accessibilityRole="button"
                style={styles.deleteLink}
                onPress={() => setSheet({ kind: 'meal', id: editor.id as string, step: 'confirm' })}
              >
                <Text style={styles.deleteLinkText}>Delete this meal</Text>
              </Pressable>
            ) : null}
          </ScrollView>
          <View style={styles.footer}>
            {missing ? <Text style={styles.missing}>{missing}</Text> : null}
            <Button variant="primary" fullWidth disabled={!!missing || editor.loading || busy} onPress={saveMeal}>
              {editor.id ? 'Save changes' : 'Save meal'}
            </Button>
          </View>
        </>
      )}

      <BottomSheet
        open={!!sheet && !!sheetName}
        onClose={() => setSheet(null)}
        title={sheet?.step === 'confirm' ? `Delete ${sheetName}?` : sheetName}
      >
        {sheet?.step === 'menu' ? (
          <View style={styles.menu}>
            <Text style={styles.menuMeta}>{sheetMeta}</Text>
            <Pressable
              accessibilityRole="button"
              style={[styles.menuRow, styles.menuRowFirst]}
              onPress={() => (sheetFood ? editFood(sheetFood.key) : sheetMeal ? openMeal(sheetMeal) : undefined)}
            >
              <Text style={styles.menuText}>{sheet.kind === 'food' ? 'Edit food' : 'Edit meal'}</Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M9 6l6 6-6 6" />
              </Svg>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.menuRow} onPress={() => setSheet({ ...sheet, step: 'confirm' })}>
              <Text style={styles.menuText}>Delete</Text>
            </Pressable>
          </View>
        ) : sheet ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmBody}>
              {sheet.kind === 'food'
                ? 'It comes out of your search results and My foods. Days you already logged it keep it.'
                : 'It comes out of My meals. The foods inside it stay, and days you already logged it keep it.'}
            </Text>
            <Button variant="destructive" fullWidth disabled={busy} onPress={() => remove(sheet.kind, sheet.id, sheetName)}>
              {sheet.kind === 'food' ? 'Delete food' : 'Delete meal'}
            </Button>
            <Button variant="text" fullWidth onPress={() => setSheet(null)}>
              Keep it
            </Button>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

function ListRow({ name, meta, kcal, onEdit, onMore }: { name: string; meta: string; kcal: number; onEdit: () => void; onMore: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]} onPress={onEdit}>
        <View style={styles.rowText}>
          <Text style={styles.rowName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <Text style={styles.cal}>
          {fmt(kcal)}
          <Text style={styles.calUnit}> cal</Text>
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Options for ${name}`} style={styles.moreBtn} onPress={onMore}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill={flColor.gray400}>
          <Circle cx={12} cy={5} r={1.6} />
          <Circle cx={12} cy={12} r={1.6} />
          <Circle cx={12} cy={19} r={1.6} />
        </Svg>
      </Pressable>
    </View>
  );
}

function SearchGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-4-4" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28 },

  identity: { gap: 6, paddingHorizontal: 2, paddingTop: 2, paddingBottom: 18 },
  identityForm: { gap: 6, paddingHorizontal: 2, paddingTop: 2, paddingBottom: 20 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
  title: { fontFamily: flFont.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.3, color: flColor.cream100 },
  lede: { marginTop: 4, fontSize: 14, lineHeight: 21, color: flColor.gray400 },

  tabs: { flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  tabOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  tabText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  tabTextOn: { color: flColor.bronze300 },

  searchWrap: { paddingTop: 12 },
  listTop: { marginTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 2 },
  pressed: { backgroundColor: flColor.hoverWash },
  rowText: { flex: 1, minWidth: 0, gap: 4 },
  rowName: { fontSize: 15.5, fontWeight: '600', lineHeight: 20, color: flColor.cream100 },
  rowMeta: { fontSize: 12.5, color: flColor.gray400 },
  cal: { fontSize: 15, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  calUnit: { fontSize: 11, fontWeight: '500', color: flColor.gray400 },
  moreBtn: { width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  noMatch: { paddingTop: 18, paddingHorizontal: 2, fontSize: 13.5, color: flColor.gray400 },
  footnote: { marginTop: 18, paddingHorizontal: 2, fontSize: 12.5, lineHeight: 19, color: flColor.gray600 },
  empty: { gap: 10, paddingTop: 36, paddingHorizontal: 8 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 20, color: flColor.cream100 },
  emptyBody: { fontSize: 14, lineHeight: 22, color: flColor.gray400 },

  footer: {
    gap: 8,
    paddingTop: 14,
    paddingBottom: SCREEN_BOTTOM_GAP,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  missing: { textAlign: 'center', fontSize: 12.5, color: flColor.gray400 },

  h2Row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 30,
    paddingBottom: 6,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal600,
  },
  h2: { fontFamily: flFont.display, fontSize: 22, letterSpacing: -0.2, color: flColor.cream100 },
  h2Meta: { fontSize: 13, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  h2MetaStrong: { fontWeight: '600', color: flColor.cream100 },
  status: { paddingTop: 14, paddingHorizontal: 2, fontSize: 13, color: flColor.gray400 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 60,
    paddingVertical: 6,
    paddingLeft: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  itemText: { flex: 1, minWidth: 0, gap: 2 },
  itemName: { fontSize: 14.5, color: flColor.cream100 },
  itemAmount: { fontSize: 12.5, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  stepper: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  stepBtn: { width: 40, height: '100%', alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 18, color: flColor.gray400 },
  stepValue: { width: 34, textAlign: 'center', fontSize: 14, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  xBtn: { width: 40, height: 44, marginRight: -8, alignItems: 'center', justifyContent: 'center' },

  results: {
    marginTop: 6,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal700,
    overflow: 'hidden',
  },
  result: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8, paddingHorizontal: 14 },
  resultDivider: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  resultText: { flex: 1, minWidth: 0, gap: 2 },
  resultName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  resultSub: { fontSize: 12, color: flColor.gray400 },
  noResults: { paddingTop: 10, paddingHorizontal: 2, fontSize: 13, color: flColor.gray400 },

  deleteLink: { alignSelf: 'flex-start', marginTop: 28, height: 44, justifyContent: 'center', paddingHorizontal: 2 },
  deleteLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: flColor.gray400,
    textDecorationLine: 'underline',
    textDecorationColor: flColor.charcoal500,
  },

  menu: { marginTop: -4 },
  menuMeta: { marginTop: -8, paddingBottom: 10, fontSize: 13, color: flColor.gray400 },
  menuRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  menuRowFirst: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  menuText: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  confirm: { gap: 10 },
  confirmBody: { marginTop: -6, marginBottom: 12, fontSize: 14, lineHeight: 22, color: flColor.gray400 },
});
