import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { useKeyboardPrimer } from '@/components/forge/KeyboardPrimer';
import { Pill } from '@/components/forge/composites/Pill';
import { ScreenBackground } from '@/components/screen-background';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { localToday } from '@/domain/nutrition/day';
import { ALLERGENS } from '@/domain/nutrition/meal-plan-setup';
import { RECIPE_BY_ID, mondayOf } from '@/domain/nutrition/meal-planner';
import { INGREDIENTS, type IngredientKey, type PlanSlot } from '@/domain/nutrition/recipes-data';
import {
  MEAL_TYPES,
  STEP_G,
  STEP_PORTION,
  blankForm,
  clampMinutes,
  clampYield,
  detectAllergens,
  filterList,
  formFrom,
  listMeta,
  missingLine,
  pickGrams,
  planHint,
  portionOf,
  qtyLabel,
  recipeFrom,
  savedToast,
  searchFoods,
  switchUnit,
  toggleAllergen,
  toggleMealType,
  totalsOf,
  withIngredient,
  withoutIngredient,
  type RecipeForm,
} from '@/domain/nutrition/user-recipes';
import { fetchMealPlanWeek, fetchUserRecipes, saveUserRecipe } from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { errorMessage, useQuery } from '@/lib/useQuery';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const ALLERGEN_LABEL = Object.fromEntries(ALLERGENS.map((a) => [a.key, a.label])) as Record<string, string>;
const FILTERS: { key: PlanSlot | 'all'; label: string }[] = [{ key: 'all', label: 'All' }, ...MEAL_TYPES];

type Pick = { key: IngredientKey; unit: 'g' | 'portion'; qty: number; index: number | null };

/**
 * My Recipes — built to `My Recipes.dc.html` (Claude Design b029488a), wired to `user_recipes` (0213).
 * One route, two modes like the `.dc`: the list, and the form (`?new=1`, or `?edit=u:…` from Recipe's
 * "Edit recipe").
 *
 * ⚠ **NUMBERS ARE USDA; ALLERGENS ARE CONFIRMED BY A PERSON.** Ingredients come from Forge's catalogue
 * (`domain/nutrition/user-recipes.ts` — why), totals are recomputed from it, allergens are pre-filled
 * from it and the athlete CONFIRMS them. Only a confirmed recipe with "Use in my plans" on is planned.
 *
 * Deltas from the `.dc`, each deliberate:
 *  · Its preview fixtures (two sample recipes) are not seeded — a real list starts empty.
 *  · "Paste a recipe" and "Scan a recipe" show as "Soon", exactly as the `.dc` draws them.
 *  · Ingredient search covers Forge's 106-ingredient USDA catalogue (the `.dc` searched its own
 *    50-food list); the athlete's Create Food items are not offered yet, as they carry no allergen tags.
 */
export default function MyRecipesScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ new?: string; edit?: string }>();
  /* A new step field mounts one commit after the tap that adds it; on iOS Safari its `autoFocus` then
     raises no keyboard. Priming inside the gesture keeps the next step typeable. See `KeyboardPrimer`. */
  const primeKeyboard = useKeyboardPrimer();

  const [todayIso] = useState(() => localToday());
  const monday = mondayOf(todayIso);
  const [reloads, setReloads] = useState(0);
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));
  const listQ = useQuery(fetchUserRecipes, [reloads]);
  const weekQ = useQuery(useCallback(() => fetchMealPlanWeek(monday), [monday]), [monday, reloads]);

  const list = useMemo(() => listQ.data ?? [], [listQ.data]);
  const weekIds = useMemo(() => new Set((weekQ.data?.days ?? []).flatMap((d) => d.items.map((i) => i.recipeId))), [weekQ.data]);

  /* The form: what the route asked for (?new / ?edit) until the athlete opens or closes one themselves. */
  const [override, setOverride] = useState<{ form: RecipeForm | null } | null>(null);
  const found = params.edit ? list.find((u) => u.id === params.edit) : undefined;
  const paramForm = found ? formFrom(found) : params.new === '1' ? blankForm() : null;
  const form = override ? override.form : paramForm;
  const setForm = (f: RecipeForm | null) => setOverride({ form: f });

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<PlanSlot | 'all'>('all');
  const [addSheet, setAddSheet] = useState(false);
  const [foodQ, setFoodQ] = useState('');
  const [pick, setPick] = useState<Pick | null>(null);
  const [editAllergens, setEditAllergens] = useState(false);
  const [focusStep, setFocusStep] = useState(-1);
  const [saving, setSaving] = useState(false);

  const shown = filterList(list, q, filter);

  /* ── form derived values ── */
  const y = Math.max(1, form?.yield ?? 1);
  const t = form ? totalsOf(form.ingredients) : { kcal: 0, protein: 0, carb: 0, fat: 0 };
  const detected = form ? detectAllergens(form.ingredients) : [];
  const missing = form ? missingLine(form) : '';
  const results = foodQ.trim() ? searchFoods(foodQ, 6) : [];

  const closeForm = () => {
    setPick(null);
    setFoodQ('');
    setEditAllergens(false);
    if (form?.editId && params.edit) router.back();
    else setForm(null);
  };

  const save = async () => {
    if (!form || missing || saving) return;
    setSaving(true);
    try {
      const prev = form.editId ? list.find((u) => u.id === form.editId) : undefined;
      const draft = recipeFrom(form, form.editId ?? '', prev?.createdAt ?? new Date().toISOString());
      const saved = await saveUserRecipe({ ...draft, id: form.editId });
      showToast(savedToast(saved));
      setReloads((n) => n + 1);
      if (form.editId && params.edit) router.back();
      else {
        setForm(null);
        setFoodQ('');
        setEditAllergens(false);
      }
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  /* ── the pick sheet ── */
  const pickFood = pick ? INGREDIENTS[pick.key] : null;
  const pickPortion = pickFood ? portionOf(pickFood.us) : null;
  const pickG = pick && pickPortion ? pickGrams(pick.unit, pick.qty, pickPortion) : 0;

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.46)' }} />
      <AppBar title="" transparent onBack={() => (form ? closeForm() : router.back())} />

      {!form ? (
        <>
          {/* ═══════════ LIST ═══════════ */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.identity}>
              <Text style={styles.eyebrow}>Nutrition</Text>
              <Text style={styles.title}>My recipes</Text>
              {list.length ? <Text style={styles.lede}>{`${list.length} saved ${list.length === 1 ? 'recipe' : 'recipes'}`}</Text> : null}
            </View>

            {list.length ? (
              <>
                <InputField value={q} onChange={setQ} placeholder="Search recipes" accessibilityLabel="Search recipes" leadingIcon={<SearchGlyph />} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
                  {FILTERS.map((fl) => {
                    const on = filter === fl.key;
                    return (
                      <Pressable
                        key={fl.key}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        style={[styles.filterChip, on && styles.chipOn]}
                        onPress={() => setFilter(fl.key)}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{fl.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={styles.listTop}>
                  {shown.map((u) => {
                    const r = RECIPE_BY_ID[u.id];
                    return (
                      <Pressable
                        key={u.id}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
                        onPress={() => router.push({ pathname: '/recipe', params: { id: u.id, from: 'mine' } })}
                      >
                        <View style={styles.listText}>
                          <Text style={styles.listName} numberOfLines={1}>
                            {u.name}
                          </Text>
                          <Text style={styles.listMeta}>{listMeta(u)}</Text>
                          {weekIds.has(u.id) ? (
                            <View style={styles.pillRow}>
                              <Pill size="sm">In this week</Pill>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.cal}>
                          {fmt(r?.kcal ?? 0)}
                          <Text style={styles.calUnit}> cal</Text>
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!shown.length ? (
                  <Text style={styles.noMatch}>
                    {q.trim()
                      ? `No saved recipes match “${q.trim()}”.`
                      : `No ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} recipes yet.`}
                  </Text>
                ) : null}
              </>
            ) : listQ.settled ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Add meals you already eat</Text>
                <Text style={styles.emptyBody}>
                  The planner can use them in your week. Quick meals and vegan dishes help most, because those are where the
                  starter set is thinnest.
                </Text>
              </View>
            ) : null}
          </ScrollView>
          <View style={styles.footer}>
            <Button variant="primary" fullWidth onPress={() => setAddSheet(true)}>
              Add recipe
            </Button>
          </View>
        </>
      ) : (
        <>
          {/* ═══════════ FORM ═══════════ */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.identityForm}>
              <Text style={styles.eyebrow}>My recipes</Text>
              <Text style={styles.title}>{form.editId ? 'Edit recipe' : 'New recipe'}</Text>
            </View>

            <InputField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Chicken burrito bowls" maxLength={40} />

            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Meal types</Text>
              <Text style={styles.fieldHint}>Pick all that fit</Text>
            </View>
            <View style={styles.types}>
              {MEAL_TYPES.map((m) => {
                const on = form.mealTypes.includes(m.key);
                return (
                  <Pressable
                    key={m.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.typeBtn, on && styles.chipOn]}
                    onPress={() => setForm(toggleMealType(form, m.key))}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.steppers}>
              <Stepper
                label="Cook time"
                value={`${form.minutes} min`}
                lessLabel="Less time"
                moreLabel="More time"
                onLess={() => setForm({ ...form, minutes: clampMinutes(form.minutes - 5) })}
                onMore={() => setForm({ ...form, minutes: clampMinutes(form.minutes + 5) })}
              />
              <Stepper
                label="Makes"
                value={`${y} ${y === 1 ? 'serving' : 'servings'}`}
                lessLabel="Fewer servings"
                moreLabel="More servings"
                onLess={() => setForm({ ...form, yield: clampYield(form.yield - 1) })}
                onMore={() => setForm({ ...form, yield: clampYield(form.yield + 1) })}
              />
            </View>

            {/* ingredients */}
            <View style={styles.h2Row}>
              <Text style={styles.h2}>Ingredients</Text>
            </View>
            <View style={styles.totCard}>
              <View style={styles.totTop}>
                <Text style={styles.totCal}>{fmt(t.kcal / y)}</Text>
                <Text style={styles.totUnit}>cal per serving</Text>
              </View>
              <View style={styles.totMacros}>
                {[
                  ['Protein', t.protein],
                  ['Carbs', t.carb],
                  ['Fat', t.fat],
                ].map(([label, v]) => (
                  <View key={label as string} style={styles.totMacro}>
                    <Text style={styles.totMacroVal}>
                      {fmt((v as number) / y)}
                      <Text style={styles.calUnit}> g</Text>
                    </Text>
                    <Text style={styles.totMacroLabel}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.totWhole}>
                {form.ingredients.length ? `Whole recipe ${fmt(t.kcal)} cal · ${y} ${y === 1 ? 'serving' : 'servings'}` : 'Adds up as you add ingredients'}
              </Text>
            </View>

            {form.ingredients.map((x, i) => {
              const ing = INGREDIENTS[x.key];
              const p = portionOf(ing.us);
              const amount = x.unit === 'g' ? `${fmt(x.g)} g` : `${qtyLabel('portion', x.qty, p)} · ${fmt(x.g)} g`;
              return (
                <View key={`${x.key}-${i}`} style={styles.ingRow}>
                  <Pressable accessibilityRole="button" style={styles.ingText} onPress={() => setPick({ key: x.key, unit: x.unit, qty: x.qty, index: i })}>
                    <Text style={styles.ingName} numberOfLines={1}>
                      {ing.name}
                    </Text>
                    <Text style={styles.ingAmount}>{amount}</Text>
                  </Pressable>
                  <Text style={styles.ingCal}>
                    {fmt((ing.kcal * x.g) / 100)}
                    <Text style={styles.calUnit}> cal</Text>
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${ing.name}`} style={styles.xBtn} onPress={() => setForm(withoutIngredient(form, i))}>
                    <XGlyph />
                  </Pressable>
                </View>
              );
            })}

            <View style={styles.searchWrap}>
              <InputField value={foodQ} onChange={setFoodQ} placeholder="Search foods to add" accessibilityLabel="Search foods" leadingIcon={<SearchGlyph />} />
            </View>
            {results.length ? (
              <View style={styles.results}>
                {results.map((h, j) => (
                  <Pressable
                    key={h.key}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.result, j > 0 && styles.resultDivider, pressed && styles.pressed]}
                    onPress={() => setPick({ key: h.key, unit: 'portion', qty: 1, index: null })}
                  >
                    <View style={styles.resultText}>
                      <Text style={styles.resultName} numberOfLines={1}>
                        {h.name}
                      </Text>
                      <Text style={styles.resultSub}>{`${fmt((h.kcal100 * h.portion.g) / 100)} cal per ${h.portion.label}`}</Text>
                    </View>
                    <PlusGlyph />
                  </Pressable>
                ))}
              </View>
            ) : foodQ.trim() ? (
              <Text style={styles.noResults}>No foods match. Try a simpler word, like “chicken”.</Text>
            ) : null}

            {/* allergens */}
            <View style={styles.h2Row}>
              <Text style={styles.h2}>Allergens</Text>
            </View>
            {!form.ingredients.length && !editAllergens ? (
              <Text style={styles.allergenLead}>Add ingredients and Forge will check them for the 9 major allergens.</Text>
            ) : null}
            {form.ingredients.length > 0 && !editAllergens ? (
              <View style={styles.allergenSummary}>
                <Text style={styles.allergenSub}>
                  {form.allergens.length &&
                  !(form.allergens.every((a) => detected.includes(a)) && detected.every((a) => form.allergens.includes(a)))
                    ? 'Contains'
                    : 'Based on your ingredients'}
                </Text>
                {form.allergens.length ? (
                  <View style={styles.pills}>
                    {form.allergens.map((a) => (
                      <Pill key={a}>{ALLERGEN_LABEL[a]}</Pill>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noneDetected}>None detected</Text>
                )}
              </View>
            ) : null}
            {editAllergens ? (
              <>
                <Text style={styles.allergenLead}>Dotted ones were found in your ingredients. Add anything Forge missed, like a sauce or a brand.</Text>
                <View style={styles.chipsWrap}>
                  {ALLERGENS.map((a) => {
                    const on = form.allergens.includes(a.key);
                    return (
                      <Pressable
                        key={a.key}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.allergenChip, on && styles.chipOn]}
                        onPress={() => setForm(toggleAllergen(form, a.key))}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.label}</Text>
                        {detected.includes(a.key) ? <View style={[styles.dot, on && styles.dotOn]} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
            {form.ingredients.length > 0 || editAllergens ? (
              <View style={styles.allergenActions}>
                {form.confirmed ? (
                  <View style={styles.confirmed}>
                    <CheckGlyph />
                    <Text style={styles.confirmedText}>Confirmed</Text>
                  </View>
                ) : (
                  <Button
                    variant="secondary"
                    onPress={() => {
                      setForm({ ...form, confirmed: true });
                      setEditAllergens(false);
                    }}
                  >
                    ✓ Confirm
                  </Button>
                )}
                <Pressable accessibilityRole="button" hitSlop={6} onPress={() => setEditAllergens((e) => !e)}>
                  <Text style={styles.editLink}>{editAllergens ? 'Done' : 'Edit'}</Text>
                </Pressable>
              </View>
            ) : null}

            {/* method */}
            <View style={styles.h2RowSplit}>
              <Text style={styles.h2}>Method</Text>
              <Text style={styles.optional}>OPTIONAL</Text>
            </View>
            <View style={styles.steps}>
              {form.steps.map((text, i) => (
                <View key={i} style={styles.stepRow}>
                  <Text style={styles.stepN}>{i + 1}</Text>
                  <View style={styles.stepInput}>
                    <InputField
                      value={text}
                      onChange={(v) => {
                        const steps = form.steps.slice();
                        steps[i] = v;
                        setForm({ ...form, steps });
                      }}
                      onSubmitEditing={() => {
                        primeKeyboard();
                        const steps = form.steps.slice();
                        steps.splice(i + 1, 0, '');
                        setForm({ ...form, steps });
                        setFocusStep(i + 1);
                      }}
                      submitBehavior="submit"
                      returnKeyType="next"
                      autoFocus={focusStep === i}
                      placeholder={i === 0 ? 'e.g. Brown the beef and drain' : 'Next step'}
                      maxLength={200}
                      accessibilityLabel={`Step ${i + 1}`}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove step ${i + 1}`}
                    style={styles.xBtn}
                    onPress={() => {
                      const steps = form.steps.filter((_, j) => j !== i);
                      setForm({ ...form, steps: steps.length ? steps : [''] });
                      setFocusStep(-1);
                    }}
                  >
                    <XGlyph />
                  </Pressable>
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                style={styles.addStep}
                onPress={() => {
                  primeKeyboard();
                  setFocusStep(form.steps.length);
                  setForm({ ...form, steps: [...form.steps, ''] });
                }}
              >
                <PlusGlyph small />
                <Text style={styles.editLink}>Add step</Text>
              </Pressable>
            </View>

            {/* use in plans */}
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: form.usePlan }}
              style={styles.switchRow}
              onPress={() => setForm({ ...form, usePlan: !form.usePlan })}
            >
              <View style={styles.switchText}>
                <Text style={styles.switchTitle}>Use in my plans</Text>
                <Text style={styles.switchHint}>{planHint(form)}</Text>
              </View>
              <View style={[styles.track, form.usePlan && styles.trackOn]}>
                <View style={[styles.knob, form.usePlan && styles.knobOn]} />
              </View>
            </Pressable>
          </ScrollView>
          <View style={styles.footer}>
            {missing ? <Text style={styles.missing}>{missing}</Text> : null}
            <Button variant="primary" fullWidth disabled={!!missing || saving} onPress={save}>
              Save recipe
            </Button>
          </View>
        </>
      )}

      {/* add method sheet */}
      <BottomSheet open={addSheet} onClose={() => setAddSheet(false)} title="Add a recipe">
        <View style={styles.methods}>
          {[
            { title: 'Enter manually', sub: 'Build a recipe from ingredients.', soon: false },
            { title: 'Paste a recipe', sub: 'Paste text or a recipe link.', soon: true },
            { title: 'Scan a recipe', sub: 'Take a photo or upload one.', soon: true },
          ].map((m, j) => (
            <Pressable
              key={m.title}
              accessibilityRole="button"
              accessibilityState={{ disabled: m.soon }}
              disabled={m.soon}
              style={[styles.method, j < 2 && styles.methodDivider]}
              onPress={() => {
                setAddSheet(false);
                setForm(blankForm());
              }}
            >
              <View style={styles.methodText}>
                <View style={styles.methodTitleRow}>
                  <Text style={[styles.methodTitle, m.soon && styles.methodTitleSoon]}>{m.title}</Text>
                  {m.soon ? <Text style={styles.soon}>Soon</Text> : null}
                </View>
                <Text style={styles.methodSub}>{m.sub}</Text>
              </View>
              {!m.soon ? <Chevron /> : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      {/* pick sheet */}
      <BottomSheet open={!!pick && !!form} onClose={() => setPick(null)} title={pickFood?.name ?? ''}>
        {pick && pickFood && pickPortion && form ? (
          <View style={styles.pickBody}>
            <Text style={styles.pickPer}>{`${fmt(pickFood.kcal)} cal per 100 g · ${pickPortion.label} = ${fmt(pickPortion.g)} g`}</Text>
            <View style={styles.pickUnits} accessibilityRole="radiogroup">
              {(['portion', 'g'] as const).map((u) => {
                const on = pick.unit === u;
                return (
                  <Pressable
                    key={u}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.typeBtn, on && styles.chipOn]}
                    onPress={() => setPick({ ...pick, unit: u, qty: switchUnit(u, pickG, pickPortion) })}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {u === 'g' ? 'Grams' : pickPortion.label.charAt(0).toUpperCase() + pickPortion.label.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.pickQty}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Less"
                style={styles.pickStep}
                onPress={() => {
                  const step = pick.unit === 'g' ? STEP_G : STEP_PORTION;
                  setPick({ ...pick, qty: Math.max(step, pick.qty - step) });
                }}
              >
                <Text style={styles.pickStepText}>−</Text>
              </Pressable>
              <Text style={styles.pickQtyText}>{qtyLabel(pick.unit, pick.qty, pickPortion)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More"
                style={styles.pickStep}
                onPress={() => setPick({ ...pick, qty: pick.qty + (pick.unit === 'g' ? STEP_G : STEP_PORTION) })}
              >
                <Text style={styles.pickStepText}>+</Text>
              </Pressable>
            </View>
            <View style={styles.pickFoot}>
              <Text style={styles.pickFootText}>{pick.unit === 'g' ? '' : `${fmt(pickG)} g`}</Text>
              <Text style={styles.pickFootText}>
                <Text style={styles.pickCal}>{fmt((pickFood.kcal * pickG) / 100)}</Text>
                {` cal · ${fmt((pickFood.protein * pickG) / 100)}g protein`}
              </Text>
            </View>
            <Button
              variant="primary"
              fullWidth
              onPress={() => {
                setForm(withIngredient(form, { key: pick.key, g: pickG, unit: pick.unit, qty: pick.qty }, pick.index));
                setPick(null);
                setFoodQ('');
              }}
            >
              {pick.index != null ? 'Update' : 'Add to recipe'}
            </Button>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

function Stepper({
  label,
  value,
  lessLabel,
  moreLabel,
  onLess,
  onMore,
}: {
  label: string;
  value: string;
  lessLabel: string;
  moreLabel: string;
  onLess: () => void;
  onMore: () => void;
}) {
  return (
    <View style={styles.stepperCol}>
      <Text style={styles.fieldLabelSolo}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable accessibilityRole="button" accessibilityLabel={lessLabel} style={styles.stepperBtn} onPress={onLess}>
          <Text style={styles.stepperSign}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={moreLabel} style={styles.stepperBtn} onPress={onMore}>
          <Text style={styles.stepperSign}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SearchGlyph() {
  return (
    <EngravedIcon name="search" size={18} color={flColor.gray400} />
  );
}

function XGlyph() {
  return (
    <EngravedIcon name="close" size={14} color={flColor.gray400} />
  );
}

function PlusGlyph({ small }: { small?: boolean }) {
  const s = small ? 13 : 16;
  return (
    <EngravedIcon name="plus" size={s} color={flColor.bronze400} />
  );
}

function CheckGlyph() {
  return (
    <EngravedIcon name="check" size={14} color={flColor.bronze300} />
  );
}

function Chevron() {
  return (
    <EngravedIcon name="chevron-right" size={14} color={flColor.gray400} />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  identity: { gap: 6, paddingHorizontal: 2, paddingTop: 2, paddingBottom: 18 },
  identityForm: { gap: 6, paddingHorizontal: 2, paddingTop: 2, paddingBottom: 20 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
  title: { fontFamily: flFont.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.3, color: flColor.cream100 },
  lede: { marginTop: 4, fontSize: 14, lineHeight: 21, color: flColor.gray400 },

  filterScroll: { marginTop: 12, marginHorizontal: -20 },
  filterRow: { gap: 6, paddingHorizontal: 20 },
  filterChip: {
    height: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  chipOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  chipText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  chipTextOn: { color: flColor.bronze300 },

  listTop: { marginTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  pressed: { backgroundColor: flColor.hoverWash },
  listText: { flex: 1, minWidth: 0, gap: 4 },
  listName: { fontSize: 15.5, fontWeight: '600', lineHeight: 20, color: flColor.cream100 },
  listMeta: { fontSize: 12.5, color: flColor.gray400 },
  pillRow: { flexDirection: 'row', paddingTop: 2 },
  cal: { fontSize: 15, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  calUnit: { fontSize: 11, fontWeight: '500', color: flColor.gray400 },
  noMatch: { paddingTop: 18, paddingHorizontal: 2, fontSize: 13.5, color: flColor.gray400 },
  empty: { gap: 10, paddingTop: 36, paddingHorizontal: 8 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 20, color: flColor.cream100 },
  emptyBody: { fontSize: 14, lineHeight: 22, color: flColor.gray400 },

  footer: {
    gap: 8,
    paddingTop: 12,
    paddingBottom: SCREEN_BOTTOM_GAP,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  missing: { textAlign: 'center', fontSize: 12.5, color: flColor.gray400 },

  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingTop: 22, paddingBottom: 9 },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.bronze400 },
  fieldLabelSolo: { paddingBottom: 9, fontSize: 11, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.bronze400 },
  fieldHint: { fontSize: 12, color: flColor.gray400 },
  types: { flexDirection: 'row', gap: 6 },
  typeBtn: {
    flex: 1,
    minWidth: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },

  steppers: { flexDirection: 'row', gap: 12, paddingTop: 22 },
  stepperCol: { flex: 1, minWidth: 0 },
  stepper: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: flRadius.md,
    borderWidth: 1.5,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.surfaceRecessed,
  },
  stepperBtn: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
  stepperSign: { fontSize: 20, color: flColor.gray400 },
  stepperValue: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },

  h2Row: { paddingTop: 40, paddingBottom: 6, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: flColor.charcoal600 },
  h2RowSplit: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 6,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal600,
  },
  h2: { fontFamily: flFont.display, fontSize: 22, letterSpacing: -0.2, color: flColor.cream100 },
  optional: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, color: flColor.gray400 },

  totCard: {
    gap: 12,
    marginTop: 14,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  totTop: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  totCal: { fontFamily: flFont.display, fontSize: 34, lineHeight: 36, color: flColor.cream100, fontVariant: ['tabular-nums'] },
  totUnit: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  totMacros: { flexDirection: 'row', gap: 8 },
  totMacro: { flex: 1, gap: 2 },
  totMacroVal: { fontSize: 16, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  totMacroLabel: { fontSize: 12, color: flColor.gray400 },
  totWhole: { fontSize: 12, color: flColor.gray400 },

  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: 6,
    paddingLeft: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  ingText: { flex: 1, minWidth: 0, gap: 2 },
  ingName: { fontSize: 14.5, color: flColor.cream100 },
  ingAmount: { fontSize: 12.5, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  ingCal: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  xBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  searchWrap: { paddingTop: 12 },
  results: {
    marginTop: 6,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal700,
    overflow: 'hidden',
  },
  result: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8, paddingHorizontal: 14 },
  resultDivider: { borderTopWidth: 1, borderTopColor: flColor.charcoal600 },
  resultText: { flex: 1, minWidth: 0, gap: 2 },
  resultName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  resultSub: { fontSize: 12, color: flColor.gray400 },
  noResults: { paddingTop: 10, paddingHorizontal: 2, fontSize: 13, color: flColor.gray400 },

  allergenLead: { marginTop: 12, marginBottom: 12, paddingHorizontal: 2, fontSize: 13, lineHeight: 20, color: flColor.gray400 },
  allergenSummary: { gap: 12, paddingTop: 14, paddingHorizontal: 2 },
  allergenSub: { fontSize: 12.5, color: flColor.gray400 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  noneDetected: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allergenChip: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: flColor.gray400, opacity: 0.8 },
  dotOn: { backgroundColor: flColor.bronze300 },
  allergenActions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 14 },
  confirmed: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 },
  confirmedText: { fontSize: 14, fontWeight: '600', color: flColor.bronze300 },
  editLink: { paddingVertical: 12, paddingHorizontal: 6, fontSize: 13.5, fontWeight: '600', color: flColor.bronze400 },

  steps: { gap: 8, paddingTop: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepN: { width: 24, textAlign: 'center', fontFamily: flFont.display, fontSize: 18, color: flColor.bronze400 },
  stepInput: { flex: 1, minWidth: 0 },
  addStep: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingLeft: 30 },

  switchRow: {
    marginTop: 30,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: flColor.charcoal700,
  },
  switchText: { flex: 1, gap: 2 },
  switchTitle: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  switchHint: { fontSize: 12.5, color: flColor.gray400 },
  track: {
    width: 48,
    height: 28,
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.surfaceRecessed,
  },
  trackOn: { backgroundColor: flColor.bronzeSolid, borderColor: flColor.bronzeBorder },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: flColor.gray600 },
  knobOn: { backgroundColor: flColor.cream100, transform: [{ translateX: 20 }] },

  methods: { marginTop: -4 },
  method: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 2 },
  methodDivider: { borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  methodText: { flex: 1, gap: 3 },
  methodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodTitle: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  methodTitleSoon: { color: flColor.gray400 },
  soon: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray400 },
  methodSub: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },

  pickBody: { paddingBottom: 12 },
  pickPer: { marginTop: -8, fontSize: 13, color: flColor.gray400 },
  pickUnits: { flexDirection: 'row', gap: 6, marginTop: 18 },
  pickQty: {
    marginTop: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: flRadius.md,
    borderWidth: 1.5,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.surfaceRecessed,
  },
  pickStep: { width: 56, height: '100%', alignItems: 'center', justifyContent: 'center' },
  pickStepText: { fontSize: 22, color: flColor.gray400 },
  pickQtyText: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  pickFoot: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 14, paddingBottom: 18, paddingHorizontal: 2 },
  pickFootText: { fontSize: 13, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  pickCal: { fontWeight: '600', color: flColor.cream100 },
});
