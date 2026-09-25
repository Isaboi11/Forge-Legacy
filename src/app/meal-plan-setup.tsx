import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { localToday } from '@/domain/nutrition/day';
import {
  ALLERGENS,
  COOK_TIMES,
  DIETS,
  MAX_HOUSEHOLD,
  MIN_HOUSEHOLD,
  PLAN_MEALS,
  addDislike,
  blockedNote,
  clampHousehold,
  draftFrom,
  parseBudget,
  prefsFrom,
  setupGate,
  toggleAllergen,
  toggleMeal,
  type SetupDraft,
} from '@/domain/nutrition/meal-plan-setup';
import { fetchMealPlanPrefs, fetchNutritionProfile, fetchTargetsOn, saveMealPlanPrefs } from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Meal Plan Setup — built to `Meal Plan Setup.dc.html` (Claude Design b029488a), wired to
 * `meal_plan_prefs` (0210). The first screen of Nutrition Phase 3: two steps, "Your food" then
 * "Your week", and the two doors it keeps shut.
 *
 * ⛔ **THE DOORS COME FIRST, AND ALONE.** Under 18 (even with a manual target — NUT-D5) and no calorie
 * target (a plan is fitted to the athlete's own number, NUT-A2-D3) each replace the whole form. The
 * rules are `setupGate` in `domain/nutrition/meal-plan-setup.ts`, tested; this file only places them.
 *
 * ⚠ **ALLERGIES ARE ANSWERED, NEVER DEFAULTED.** Neither option starts chosen and Continue stays shut
 * until one is (NUT-D6 makes them a hard constraint on every plan).
 *
 * "Build my week" saves, then opens Meal Plan — which sees the new answers and rebuilds the week
 * (`resolveWeek`). First time in, it REPLACES this screen so Back from the week goes to Nutrition, not
 * back into setup; reopened from "Edit setup", it simply returns. Every answer comes back as it was left
 * (`draftFrom`).
 */
export default function MealPlanSetupScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const scrollRef = useRef<ScrollView>(null);

  const [todayIso] = useState(() => localToday());
  const [reloads, setReloads] = useState(0);
  /* Back from Targets with a new number: re-read, so the "set a target" door opens without a restart. */
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));

  const profile = useQuery(fetchNutritionProfile, [reloads]);
  const target = useQuery(useCallback(() => fetchTargetsOn(todayIso), [todayIso]), [todayIso, reloads]);
  const saved = useQuery(fetchMealPlanPrefs, []);

  const [step, setStep] = useState<1 | 2>(1);
  /* Null until touched: the saved setup (or a fresh one) until the athlete changes something. */
  const [edits, setEdits] = useState<SetupDraft | null>(null);
  const [typing, setTyping] = useState('');
  const [budgetText, setBudgetText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loaded = profile.settled && target.settled && saved.settled;
  const d = edits ?? draftFrom(saved.data ?? null);
  const set = (patch: Partial<SetupDraft>) => setEdits({ ...d, ...patch });

  const gate = loaded ? setupGate(profile.data?.birthYear ?? null, target.data ?? null, todayIso) : null;
  const ready = loaded && gate == null;

  const note = blockedNote(step, d);
  const canGo = note === '' && !saving;
  const budget = budgetText ?? (d.weeklyBudgetUsd != null ? String(d.weeklyBudgetUsd) : '');

  const goStep = (next: 1 | 2) => {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const commitTyping = () => {
    const next = addDislike(d.dislikes, typing);
    if (next !== d.dislikes) set({ dislikes: next });
    setTyping('');
  };

  const submit = async () => {
    if (!canGo) return;
    if (step === 1) {
      goStep(2);
      return;
    }
    setSaving(true);
    try {
      await saveMealPlanPrefs(prefsFrom(d));
      showToast('Building your week');
      if (saved.data) router.back();
      else router.replace('/meal-plan');
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.46)' }} />
      <AppBar
        title=""
        transparent
        onBack={() => {
          if (ready && step === 2) goStep(1);
          else router.back();
        }}
      />

      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.identity}>
          <Text style={styles.eyebrow}>Nutrition</Text>
          <Text style={styles.title}>Your first plan.</Text>
          {ready ? <Text style={styles.lede}>Tell Forge how you eat. We’ll build the week around you.</Text> : null}
        </View>

        {gate?.kind === 'no-target' ? (
          <View style={styles.gateCard}>
            <Text style={styles.eyebrow}>One step first</Text>
            <Text style={styles.gateHeadline}>Set your daily target first</Text>
            <Text style={styles.gateBody}>
              Your plan is built around a daily calorie target. Once you’ve set one, come back and Forge will build
              your week around it.
            </Text>
            <View style={styles.gateActions}>
              <Button variant="primary" fullWidth onPress={() => router.push('/nutrition-targets')}>
                Set daily target
              </Button>
            </View>
          </View>
        ) : null}

        {gate?.kind === 'under-age' ? (
          <View style={styles.gateCard}>
            {gate.unlockYear ? <Text style={styles.eyebrow}>{`From ${gate.unlockYear}`}</Text> : null}
            <Text style={styles.gateHeadline}>Meal plans start at 18.</Text>
            <Text style={styles.gateBody}>
              A plan is built around a daily calorie target, and Forge doesn’t calculate those for anyone under 18.
              Bodies that are still growing need more than a formula.
            </Text>
            <View style={styles.gateActions}>
              <Button variant="secondary" fullWidth onPress={() => router.push('/nutrition-targets')}>
                Open Targets
              </Button>
              <View style={styles.gateFoot}>
                <Text style={styles.gateFootText}>{`Birth year ${profile.data?.birthYear ?? ''}.`}</Text>
                <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/nutrition-targets')}>
                  <Text style={styles.linkText}>Not right?</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {ready ? (
          <>
            {/* step header */}
            <View style={styles.stepHead}>
              <View style={styles.bars}>
                <View style={[styles.bar, styles.barOn]} />
                <View style={[styles.bar, step === 2 && styles.barOn]} />
              </View>
              <View style={styles.stepTitleRow}>
                <Text style={styles.stepTitle}>{step === 1 ? 'Your food' : 'Your week'}</Text>
                <Text style={styles.stepCount}>{`${step} of 2`}</Text>
              </View>
            </View>

            {step === 1 ? (
              <>
                <Text style={[styles.question, styles.questionFirst]}>How do you eat?</Text>
                <View style={styles.grid2} accessibilityRole="radiogroup">
                  {DIETS.map((o) => (
                    <Choice
                      key={o.key}
                      label={o.label}
                      on={d.diet === o.key}
                      role="radio"
                      onPress={() => set({ diet: o.key })}
                    />
                  ))}
                </View>

                <Text style={styles.question}>Allergies</Text>
                <View style={styles.grid2} accessibilityRole="radiogroup">
                  <Choice label="No allergies" on={d.allergyMode === 'none'} role="radio" onPress={() => set({ allergyMode: 'none' })} />
                  <Choice label="Add allergies" on={d.allergyMode === 'add'} role="radio" onPress={() => set({ allergyMode: 'add' })} />
                </View>
                {d.allergyMode === 'add' ? (
                  <>
                    <View style={styles.chipWrap}>
                      {ALLERGENS.map((a) => {
                        const on = d.allergens.includes(a.key);
                        return (
                          <Pressable
                            key={a.key}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            style={[styles.chip, on && styles.choiceOn]}
                            onPress={() => set({ allergens: toggleAllergen(d.allergens, a.key) })}
                          >
                            <Text style={[styles.choiceText, styles.chipText, on && styles.choiceTextOn]}>{a.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text style={styles.helper}>Meals with these are never included. Always check labels.</Text>
                  </>
                ) : null}

                <View style={styles.questionRow}>
                  <Text style={styles.questionInline}>Foods you don’t like</Text>
                  <Text style={styles.optional}>Optional</Text>
                </View>
                <InputField
                  value={typing}
                  onChange={(v) => {
                    /* A comma ends a tag, like return does — the `.dc` takes both. */
                    if (v.endsWith(',')) {
                      const next = addDislike(d.dislikes, v.slice(0, -1));
                      if (next !== d.dislikes) set({ dislikes: next });
                      setTyping('');
                    } else setTyping(v);
                  }}
                  onSubmitEditing={commitTyping}
                  submitBehavior="submit"
                  returnKeyType="done"
                  placeholder="Type a food, then return"
                  maxLength={30}
                  accessibilityLabel="Foods you don’t like"
                />
                {d.dislikes.length ? (
                  <View style={styles.tagWrap}>
                    {d.dislikes.map((food) => (
                      <Pressable
                        key={food}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${food}`}
                        style={styles.tag}
                        onPress={() => set({ dislikes: d.dislikes.filter((x) => x !== food) })}
                      >
                        <Text style={styles.tagText}>{food}</Text>
                        <View style={styles.tagX}>
                          <EngravedIcon name="close" size={11} color={flColor.gray400} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Text style={[styles.question, styles.questionFirst]}>Which meals do you want?</Text>
                <View style={styles.grid2}>
                  {PLAN_MEALS.map((m) => {
                    const on = d.meals.includes(m.key);
                    return (
                      <Pressable
                        key={m.key}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        style={[styles.choice, styles.mealChoice, on && styles.choiceOn]}
                        onPress={() => set({ meals: toggleMeal(d.meals, m.key) })}
                      >
                        <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{m.label}</Text>
                        <View style={[styles.box, on && styles.boxOn]}>
                          {on ? (
                            <EngravedIcon name="check" size={10} color={flColor.onBronze} />
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.question}>Time to cook</Text>
                <View style={styles.tabs} accessibilityRole="radiogroup">
                  {COOK_TIMES.map((t) => {
                    const on = d.cookMinutes === t.key;
                    return (
                      <Pressable
                        key={t.label}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        style={[styles.tab, on && styles.tabOn]}
                        onPress={() => set({ cookMinutes: t.key })}
                      >
                        <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.question}>Cooking for</Text>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fewer people"
                    disabled={d.household <= MIN_HOUSEHOLD}
                    style={styles.stepperButton}
                    onPress={() => set({ household: clampHousehold(d.household - 1) })}
                  >
                    <Glyph kind="minus" dim={d.household <= MIN_HOUSEHOLD} />
                  </Pressable>
                  <Text style={styles.stepperValue} accessibilityLiveRegion="polite">
                    {d.household}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="More people"
                    disabled={d.household >= MAX_HOUSEHOLD}
                    style={styles.stepperButton}
                    onPress={() => set({ household: clampHousehold(d.household + 1) })}
                  >
                    <Glyph kind="plus" dim={d.household >= MAX_HOUSEHOLD} />
                  </Pressable>
                </View>

                <View style={styles.questionRow}>
                  <Text style={styles.questionInline}>Weekly budget</Text>
                  <Text style={styles.optional}>Optional</Text>
                </View>
                <InputField
                  value={budget}
                  onChange={(v) => {
                    const parsed = parseBudget(v);
                    setBudgetText(parsed.text);
                    set({ weeklyBudgetUsd: parsed.value });
                  }}
                  placeholder="No budget"
                  keyboardType="number-pad"
                  maxLength={5}
                  accessibilityLabel="Weekly budget in dollars"
                  leadingIcon={<Text style={styles.dollar}>$</Text>}
                />
              </>
            )}
          </>
        ) : null}
      </ScrollView>

      {ready ? (
        <View style={styles.footer}>
          <Button variant="primary" fullWidth disabled={!canGo} onPress={submit}>
            {step === 1 ? 'Continue' : 'Build my week'}
          </Button>
          {note ? (
            <Text style={styles.ctaNote} accessibilityLiveRegion="polite">
              {note}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

function Choice({ label, on, role, onPress }: { label: string; on: boolean; role: 'radio'; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ checked: on }}
      style={[styles.choice, on && styles.choiceOn]}
      onPress={onPress}
    >
      <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Glyph({ kind, dim }: { kind: 'plus' | 'minus'; dim: boolean }) {
  return <EngravedIcon name={kind} size={16} color={dim ? flColor.charcoal500 : flColor.gray400} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28 },

  identity: { gap: 6, paddingHorizontal: 2, paddingTop: 2, paddingBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
  title: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100, letterSpacing: -0.3, lineHeight: 34 },
  lede: { marginTop: 4, fontSize: 14, lineHeight: 21, color: flColor.gray400 },

  gateCard: {
    gap: 14,
    marginTop: 18,
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 22,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  gateHeadline: { fontFamily: flFont.display, fontSize: 24, lineHeight: 29, color: flColor.cream100 },
  gateBody: { fontSize: 14, lineHeight: 22, color: flColor.gray400 },
  gateActions: { gap: 10, paddingTop: 8 },
  gateFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  gateFootText: { fontSize: 12.5, color: flColor.gray400 },
  linkText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400, paddingVertical: 10, paddingHorizontal: 4 },

  stepHead: { gap: 12, paddingTop: 30, paddingBottom: 4, paddingHorizontal: 2 },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: flColor.charcoal600 },
  barOn: { backgroundColor: flColor.bronze400 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  stepTitle: { fontFamily: flFont.display, fontSize: 21, letterSpacing: -0.2, color: flColor.cream100 },
  stepCount: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray400 },

  question: { paddingTop: 36, paddingBottom: 12, paddingHorizontal: 2, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  questionFirst: { paddingTop: 28 },
  questionRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 36, paddingBottom: 12, paddingHorizontal: 2 },
  questionInline: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  optional: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray400 },

  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    flexBasis: '48%',
    flexGrow: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  choiceOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  choiceText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  choiceTextOn: { color: flColor.bronze300 },
  mealChoice: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingHorizontal: 14 },
  box: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: flColor.charcoal500, alignItems: 'center', justifyContent: 'center' },
  boxOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronze400 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 14 },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  chipText: { fontSize: 13 },
  helper: { marginTop: 12, paddingHorizontal: 2, fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 12 },
  tag: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.charcoal700,
  },
  tagText: { fontSize: 13, fontWeight: '500', color: flColor.cream100 },
  tagX: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },

  tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: flRadius.pill, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600 },
  tab: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.pill, borderWidth: 1, borderColor: 'transparent' },
  tabOn: { backgroundColor: flColor.charcoal700, borderColor: flColor.charcoal500 },
  tabText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  tabTextOn: { color: flColor.cream100 },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 56,
    padding: 6,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  stepperButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.md },
  stepperValue: { flex: 1, textAlign: 'center', fontFamily: flFont.display, fontSize: 24, color: flColor.cream100 },

  dollar: { fontSize: 15, fontWeight: '600', color: flColor.gray400 },

  footer: {
    gap: 10,
    paddingTop: 14,
    paddingBottom: SCREEN_BOTTOM_GAP,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  ctaNote: { textAlign: 'center', fontSize: 12, lineHeight: 17, color: flColor.gray400 },
});
