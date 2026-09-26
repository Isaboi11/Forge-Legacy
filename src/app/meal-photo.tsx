import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flBorder, flColor, flFont, flRadius } from '@/constants/foundation';
import { dayLabel, localToday, MEAL_LABELS, MEAL_SLOTS, type MealSlot } from '@/domain/nutrition/day';
import { mealPhotoError } from '@/domain/nutrition/meal-photo-read';
import {
  entriesFrom,
  loggable,
  mealTotals,
  readToast,
  rowMacros,
  unmatchedNote,
  withFood,
  withPortion,
  type ReviewRow,
} from '@/domain/nutrition/meal-photo-match';
import { looksSane, portionLabel, portionMacros, servingOptions, SOURCE_LABEL, type CatalogFood, type Portion, type Serving } from '@/domain/nutrition/serving';
import { addEntries, searchFoods } from '@/data/nutrition-live';
import { matchMealItems, readMealPhoto } from '@/data/meal-photo-live';
import { useToast } from '@/hooks/useCeremony';
import { useNutritionAccess, usePremiumAi } from '@/lib/entitlement';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { ensureConsent } from '@/lib/consent';
import { AI_DECLINED_LINE } from '@/domain/consent/consent';
import { SCREEN_BOTTOM_GAP, useBarBottom } from '@/lib/screen-insets';

/**
 * Log from a Photo — Nutrition Architecture §2 "Log a meal from a photo" (Premium AI, credits).
 *
 * PO, 2026-09-25: *"let's build the photo food logging."* No `.dc` exists for this screen, so it is drawn
 * in Log Food's own language (`Log Food.dc.html`): the "ADDING TO Lunch ⌄" line, flat rows of
 * "name / meta" with the number on the right, quiet uppercase actions, one primary button at the foot.
 *
 * ══ THE FLOW ══
 *
 *   start → the photo (camera or library, through `useMediaPicker` — the ONE capture path)
 *         → reading (`meal-photo-read`: food names + estimated portions, never a calorie — NUT-D4)
 *         → matching (`food-search` per item; `meal-photo-match.ts` keeps only certain matches)
 *         → review: every row editable (portion, swap the food, remove), rows can be added
 *         → Log → `addEntries`, the one diary write path, to the chosen meal on the diary's day.
 *
 * ⚠ EVERY CALORIE ON THIS SCREEN IS DATABASE FOOD × PORTION. A row with no match shows no calories and is
 * not logged; the screen says so above the button. The portion is the photo's estimate until the athlete
 * touches it, and the row says "estimated" until then.
 *
 * ⚠ THE PHOTO IS NOT KEPT (NUT-D7) — sent to the read once, never uploaded to storage. The start state says so.
 *
 * ⚠ GATED TWICE, SERVER FIRST. The function refuses without Nutrition access (403) and without Premium AI
 * (0203's meter). The door on Log Food shows only for athletes with both; this screen still renders the
 * refusal honestly if it is reached some other way.
 */

type Stage =
  | { step: 'start' }
  | { step: 'reading' }
  | { step: 'matching' }
  | { step: 'review' }
  | { step: 'problem'; text: string };

export default function MealPhotoScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const { pick, mediaPickerSheet } = useMediaPicker();
  const premiumAi = usePremiumAi();
  const nutritionAccess = useNutritionAccess();

  const iso = typeof params.date === 'string' ? params.date : localToday();
  const [meal, setMeal] = useState<MealSlot>(() =>
    (MEAL_SLOTS as readonly string[]).includes(String(params.meal)) ? (params.meal as MealSlot) : 'lunch',
  );
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [stage, setStage] = useState<Stage>({ step: 'start' });
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [searchFailed, setSearchFailed] = useState(0);
  /** The row being edited, by id; `'new'` is the Add-a-food sheet. */
  const [editing, setEditing] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);
  const [addCount, setAddCount] = useState(0);
  /* ⚠ ONE READ AT A TIME, HELD BY A REF — a fast double tap would otherwise pay for two reads before the
     busy state renders (the same guard as `my-recipes.tsx` and `program-import.tsx`). */
  const busy = useRef(false);

  const barBottom = useBarBottom(SCREEN_BOTTOM_GAP);
  const today = localToday();

  const takePhoto = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      /* Asked BEFORE the camera, so nobody takes a photo that then cannot be sent (MHMDA consent). */
      if (!(await ensureConsent('ai_sharing'))) return;
      const asset = await pick({
        kind: 'images',
        title: 'Photo of your meal',
        hint: 'From above, with the whole plate in the frame. The photo isn’t saved.',
      });
      if (!asset) return;
      setStage({ step: 'reading' });
      const r = await readMealPhoto(asset.uri);
      if (r.kind === 'no_consent') {
        setStage({ step: 'problem', text: AI_DECLINED_LINE });
        return;
      }
      if (r.kind !== 'ok') {
        setStage({ step: 'problem', text: mealPhotoError(r) });
        return;
      }
      setStage({ step: 'matching' });
      const matched = await matchMealItems(r.read.items);
      setRows(matched.rows);
      setSearchFailed(matched.failed);
      setStage({ step: 'review' });
      showToast(readToast(matched.rows));
    } finally {
      busy.current = false;
    }
  };

  const logMeal = async () => {
    const entries = entriesFrom(rows, meal);
    if (!entries.length || logging) return;
    setLogging(true);
    try {
      await addEntries(iso, entries);
      const kcal = mealTotals(rows).kcal;
      showToast(`${entries.length} ${entries.length === 1 ? 'food' : 'foods'} · ${kcal} cal added to ${MEAL_LABELS[meal]}`);
      /* Back to the diary, as Food Detail does: the athlete came to log a meal and has logged it. */
      router.dismissAll?.();
      router.replace('/nutrition');
    } finally {
      setLogging(false);
    }
  };

  const totals = mealTotals(rows);
  const toLog = rows.filter(loggable).length;
  const note = unmatchedNote(rows);
  const editRow = editing && editing !== 'new' ? rows.find((r) => r.id === editing) ?? null : null;
  const gatedOut = !premiumAi || !nutritionAccess;

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
      <AppBar title="Log from Photo" transparent onBack={() => router.back()} />

      <Pressable accessibilityRole="button" style={styles.mealLine} onPress={() => setMealPickerOpen(true)}>
        <Text style={styles.mealLineLabel}>Adding to</Text>
        <Text style={styles.mealLineValue}>{MEAL_LABELS[meal]}</Text>
        <EngravedIcon name="chevron-down" size={13} color={flColor.bronze400} />
        {iso !== today ? <Text style={styles.mealLineDay}>{dayLabel(iso, today)}</Text> : null}
      </Pressable>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {stage.step === 'start' ? (
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Snap the plate, check the list, log it.</Text>
            <Text style={styles.introBody}>
              Forge names the foods it can see and estimates the portions. The calories come from the food
              database, not the photo, and nothing is logged until you’ve checked every item.
            </Text>
            <Text style={styles.introFine}>Uses Premium AI credits. The photo isn’t saved.</Text>
            {gatedOut ? (
              <Text style={styles.problem}>Logging a meal from a photo is part of Premium AI. You can still search for the food.</Text>
            ) : null}
          </View>
        ) : null}

        {stage.step === 'reading' || stage.step === 'matching' ? (
          <View style={styles.working}>
            <ActivityIndicator color={flColor.bronze400} />
            <Text style={styles.workingText}>{stage.step === 'reading' ? 'Looking at your meal…' : 'Finding the foods…'}</Text>
          </View>
        ) : null}

        {stage.step === 'problem' ? (
          <View style={styles.intro}>
            <Text style={styles.problem}>{stage.text}</Text>
          </View>
        ) : null}

        {stage.step === 'review' ? (
          <>
            <View style={styles.totals}>
              <Text style={styles.totalKcal}>{totals.kcal}</Text>
              <Text style={styles.totalLabel}>cal</Text>
              <Text style={styles.totalMacros}>{`${totals.protein}P · ${totals.carb}C · ${totals.fat}F`}</Text>
            </View>
            <Text style={styles.sectionLabel}>{`${rows.length} ${rows.length === 1 ? 'item' : 'items'} · tap to change`}</Text>

            {rows.map((row) => (
              <ReviewRowView key={row.id} row={row} onPress={() => setEditing(row.id)} />
            ))}

            <Pressable accessibilityRole="button" style={styles.more} onPress={() => setEditing('new')}>
              <Text style={styles.footerAction}>Add a food</Text>
            </Pressable>

            {note ? <Text style={styles.note}>{note}</Text> : null}
            {searchFailed ? (
              <Text style={styles.note}>
                {`Couldn’t reach food search for ${searchFailed === 1 ? 'one item' : `${searchFailed} items`}. Tap to search again.`}
              </Text>
            ) : null}
            <Text style={styles.fine}>Portions are estimates from the photo. Calories come from the matched food.</Text>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: barBottom }]}>
        {stage.step === 'review' ? (
          <>
            <Button variant="primary" fullWidth disabled={!toLog || logging} onPress={logMeal}>
              {logging ? 'Logging…' : toLog ? `Log ${toLog} to ${MEAL_LABELS[meal]}` : 'Nothing to log yet'}
            </Button>
            <Pressable accessibilityRole="button" style={styles.footerButton} onPress={takePhoto}>
              <Text style={styles.footerAction}>Take another photo</Text>
            </Pressable>
          </>
        ) : stage.step === 'reading' || stage.step === 'matching' ? null : (
          <>
            <Button variant="primary" fullWidth disabled={gatedOut} icon={<EngravedIcon name="camera" size={18} />} onPress={takePhoto}>
              {stage.step === 'problem' ? 'Try another photo' : 'Take or choose a photo'}
            </Button>
            <Pressable accessibilityRole="button" style={styles.footerButton} onPress={() => router.back()}>
              <Text style={styles.footerAction}>Search instead</Text>
            </Pressable>
          </>
        )}
      </View>

      <MealPicker open={mealPickerOpen} meal={meal} onPick={setMeal} onClose={() => setMealPickerOpen(false)} />

      {/* Keyed by the row, so the sheet's draft starts from THAT row every time it opens. */}
      <RowSheet
        key={editing === 'new' ? `new-${addCount}` : (editRow?.id ?? 'none')}
        open={editing != null && (editing === 'new' || editRow != null)}
        row={editRow}
        onClose={() => setEditing(null)}
        onSave={(next) => {
          if (editing === 'new') {
            setRows((prev) => [...prev, { ...next, id: `a${addCount}`, seen: next.food?.name ?? '' }]);
            setAddCount((n) => n + 1);
          } else {
            setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)));
          }
          setEditing(null);
        }}
        onRemove={() => {
          if (editRow) setRows((prev) => prev.filter((r) => r.id !== editRow.id));
          setEditing(null);
        }}
      />

      {mediaPickerSheet}
    </View>
  );
}

/* ── a row ───────────────────────────────────────────────────────────────── */

function ReviewRowView({ row, onPress }: { row: ReviewRow; onPress: () => void }) {
  const m = rowMacros(row);
  const ok = loggable(row);
  const seenDiffers = row.item != null && row.food != null && row.food.name.toLowerCase() !== row.seen.toLowerCase();
  const meta = ok
    ? [portionLabel(row.portion!), row.estimated ? 'estimated' : null, SOURCE_LABEL[row.food!.source]].filter(Boolean).join(' · ')
    : row.food
      ? 'Set a portion'
      : 'No match yet — tap to pick a food';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Change ${row.food?.name ?? row.seen}`} style={styles.row} onPress={onPress}>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {row.food?.name ?? row.seen}
        </Text>
        {seenDiffers ? (
          <Text style={styles.rowSeen} numberOfLines={1}>{`Seen: ${row.seen}`}</Text>
        ) : null}
        <Text style={[styles.rowMeta, !ok && styles.rowMetaWarn]} numberOfLines={1}>
          {meta}
        </Text>
        {row.item?.confidence === 'low' && ok ? <Text style={styles.rowCheck}>Not sure about this one — check it</Text> : null}
      </View>
      <Text style={styles.rowKcal}>{ok ? `${m.kcal}` : '—'}</Text>
    </Pressable>
  );
}

/* ── the edit / add sheet ────────────────────────────────────────────────── */

function RowSheet({
  open,
  row,
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean;
  /** Null = adding a food by hand. */
  row: ReviewRow | null;
  onClose: () => void;
  onSave: (row: ReviewRow) => void;
  onRemove: () => void;
}) {
  const adding = row == null;
  const [draft, setDraft] = useState<ReviewRow>(
    () => row ?? { id: 'new', seen: '', item: null, food: null, portion: null, estimated: false, candidates: [] },
  );
  const [swapping, setSwapping] = useState(() => row == null || row.food == null);
  const [query, setQuery] = useState(() => (row?.item ? row.item.search : ''));
  const [qty, setQty] = useState(() => (row?.portion ? String(row.portion.quantity) : '1'));
  /* Keyed by its query, as Log Food's search is — a stale reply can never land on a newer query. */
  const [search, setSearch] = useState<{ q: string; foods: CatalogFood[]; failed: boolean }>({ q: '', foods: [], failed: false });

  useEffect(() => {
    const q = query.trim();
    if (!swapping || q.length < 2) return;
    let live = true;
    const timer = setTimeout(async () => {
      const found = await searchFoods(q);
      if (live) setSearch({ q, foods: found.foods.filter(looksSane), failed: found.failed });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, swapping]);

  const trimmed = query.trim();
  const results = trimmed.length >= 2 && search.q === trimmed ? search.foods : trimmed.length < 2 ? draft.candidates : null;
  const searching = trimmed.length >= 2 && search.q !== trimmed;

  const food = draft.food;
  const options: Serving[] = food ? servingOptions(food) : [];
  const current = draft.portion?.serving ?? null;
  const chips = current && !options.some((s) => s.label === current.label) ? [current, ...options] : options;
  const preview = food && draft.portion ? portionMacros(food, draft.portion) : null;

  const choose = (f: CatalogFood) => {
    const next = withFood(draft, f);
    setDraft(next);
    setQty(next.portion ? String(next.portion.quantity) : '1');
    setSwapping(false);
  };

  const setServing = (serving: Serving) => {
    const q = Number(qty) > 0 ? Number(qty) : 1;
    setDraft(withPortion(draft, { serving, quantity: q } satisfies Portion));
  };

  const setQuantity = (text: string) => {
    setQty(text);
    const q = Number(text);
    if (draft.portion && q > 0) setDraft(withPortion(draft, { serving: draft.portion.serving, quantity: q }));
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={adding ? 'Add a food' : draft.seen || 'Change food'} scroll>
      <View style={styles.sheetBody}>
        {food && !swapping ? (
          <View style={styles.sheetFood}>
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{food.name}</Text>
              <Text style={styles.rowMeta}>{[food.brand, SOURCE_LABEL[food.source]].filter(Boolean).join(' · ')}</Text>
            </View>
            <Pressable accessibilityRole="button" hitSlop={6} onPress={() => setSwapping(true)}>
              <Text style={styles.footerAction}>Swap</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <InputField
              value={query}
              onChange={setQuery}
              placeholder="Search foods, brands, meals"
              autoCorrect={false}
              returnKeyType="search"
              leadingIcon={<EngravedIcon name="search" size={18} color={flColor.gray600} />}
            />
            {searching ? <Text style={styles.status}>Searching…</Text> : null}
            {(results ?? []).map((f) => (
              <Pressable key={f.key} accessibilityRole="button" style={styles.row} onPress={() => choose(f)}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {[f.kcal100 != null ? `${Math.round(f.kcal100)} cal / 100 g` : null, f.brand, SOURCE_LABEL[f.source]].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </Pressable>
            ))}
            {!searching && results != null && results.length === 0 && trimmed.length >= 2 ? (
              <Text style={styles.status}>
                {search.failed ? 'Couldn’t connect to food search. Check your signal and try again.' : `Nothing found for "${trimmed}". Try a simpler word.`}
              </Text>
            ) : null}
          </>
        )}

        {food && !swapping ? (
          <>
            <Text style={styles.fieldLabel}>Portion{draft.estimated ? ' · estimated from the photo' : ''}</Text>
            <View style={styles.servingWrap}>
              {chips.map((s) => (
                <Pressable
                  key={s.label}
                  accessibilityRole="button"
                  style={[styles.choice, current?.label === s.label && styles.choiceOn]}
                  onPress={() => setServing(s)}
                >
                  <Text style={[styles.choiceText, current?.label === s.label && styles.choiceTextOn]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.qtyRow}>
              <Text style={styles.fieldLabel}>Amount</Text>
              <TextInput
                value={qty}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                style={styles.numberInput}
                accessibilityLabel="Amount"
                selectTextOnFocus
              />
            </View>
            {preview ? (
              <View style={styles.previewRow}>
                <Text style={styles.previewKcal}>{preview.kcal}</Text>
                <Text style={styles.previewLabel}>cal</Text>
                <Text style={styles.previewMacros}>{`${preview.protein}P · ${preview.carb}C · ${preview.fat}F`}</Text>
              </View>
            ) : (
              <Text style={styles.status}>Pick a portion that has a weight.</Text>
            )}
            {food.attribution ? <Text style={styles.fine}>{food.attribution}</Text> : null}
            <Button variant="primary" fullWidth disabled={!loggable(draft)} onPress={() => onSave(draft)}>
              {adding ? 'Add to the meal' : 'Done'}
            </Button>
          </>
        ) : null}

        {!adding ? (
          <Pressable accessibilityRole="button" style={styles.more} onPress={onRemove}>
            <Text style={styles.removeAction}>Remove from the meal</Text>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },

  mealLine: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 4, paddingVertical: 4, paddingHorizontal: 2 },
  mealLineLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
  mealLineValue: { fontSize: 13.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze400 },
  mealLineDay: { fontSize: 12.5, color: flColor.gray600, marginLeft: 4 },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 },

  intro: { gap: 12, paddingTop: 20 },
  introTitle: { fontFamily: flFont.display, fontSize: 24, lineHeight: 30, color: flColor.cream100 },
  introBody: { fontSize: 14, lineHeight: 21, color: flColor.gray400 },
  introFine: { fontSize: 12.5, color: flColor.gray600 },
  problem: { fontSize: 14, lineHeight: 21, color: flColor.cream100, paddingTop: 8 },

  working: { alignItems: 'center', gap: 14, paddingVertical: 48 },
  workingText: { fontSize: 13.5, color: flColor.gray400 },

  totals: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingBottom: 6 },
  totalKcal: { fontFamily: flFont.display, fontSize: 40, color: flColor.cream100 },
  totalLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  totalMacros: { flex: 1, textAlign: 'right', fontSize: 13, color: flColor.gray400 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600, paddingTop: 10, paddingBottom: 2 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  rowName: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  rowSeen: { fontSize: 12, color: flColor.gray400 },
  rowMeta: { fontSize: 12.5, color: flColor.gray600 },
  rowMetaWarn: { color: flColor.bronze400 },
  rowCheck: { fontSize: 12, color: flColor.bronze400 },
  rowKcal: { fontSize: 15, fontWeight: '600', color: flColor.cream100, minWidth: 44, textAlign: 'right' },

  more: { alignItems: 'center', paddingVertical: 16 },
  note: { fontSize: 13, lineHeight: 19, color: flColor.gray400, paddingTop: 4 },
  fine: { fontSize: 11.5, lineHeight: 16, color: flColor.gray600, paddingTop: 10 },
  status: { fontSize: 12.5, color: flColor.gray600, paddingVertical: 10 },

  footer: {
    gap: 4,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  footerAction: { fontSize: 12, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.gray400 },
  footerButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  removeAction: { fontSize: 12, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.gray600 },

  sheetBody: { gap: 12, paddingBottom: 8 },
  sheetFood: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fieldLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.gray600 },
  servingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal800, ...flBorder.subtle },
  choiceOn: { backgroundColor: flColor.bronzeDark, borderColor: flColor.bronzeBorder },
  choiceText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  choiceTextOn: { color: flColor.bronze300 },
  qtyRow: { gap: 6 },
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
  previewRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 4 },
  previewKcal: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100 },
  previewLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  previewMacros: { flex: 1, textAlign: 'right', fontSize: 12.5, color: flColor.gray400 },
});
