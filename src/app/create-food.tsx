import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { localToday, MEAL_LABELS, MEAL_SLOTS, type MealSlot } from '@/domain/nutrition/day';
import {
  checkCalories,
  extrasPerHundred,
  FOOD_UNITS,
  labelServing,
  MORE_NUTRIENTS,
  perHundred,
  servingGrams,
  unitByKey,
  unitNeedsWeight,
  validateFood,
} from '@/domain/nutrition/create-food';
import { LABEL_FIELDS } from '@/domain/nutrition/label-read';
import { portionLabel, portionMacros } from '@/domain/nutrition/serving';
import { addEntries, createUserFood, fetchFoodByKey, updateUserFood } from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { labelScanAvailable, takeLabelScan } from '@/lib/label-scan';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';

/**
 * Create Food — built to `Create Food.dc.html`, wired to `user_foods` (0205) and its micronutrients
 * (0207). Also the Edit-food screen: `?food=<id>&mode=edit`.
 *
 * ⚠ **IT REPLACED A SHEET, LIKE FOOD DETAIL DID.** Log Food opened a six-field `CreateFoodSheet`; the
 * PO designed a screen with two entry modes, a unit picker, a calories-versus-macros check and ten more
 * nutrients, and a bottom sheet cannot hold that with a keyboard up. The sheet is retired.
 *
 * ⚠ **EVERY NUMBER IS CONVERTED IN ONE PLACE** (`domain/nutrition/create-food`, NUT-D4). A label states
 * ONE SERVING and the catalogue stores PER 100 g; this file positions fields and never divides.
 *
 * ⭐ **SCAN LABEL — `Scan Nutrition Label v2.dc.html` A1–A5.** The Scan label card opens the camera route
 * (`app/scan-label.tsx`); the read comes back through `takeLabelScan()` on focus and FILLS this same form —
 * there is no second "review" screen. A bronze dot means only "Forge isn't confident about this value"
 * (`domain/nutrition/label-read`), a miss is a plain blank, and editing a dotted field clears its dot:
 * the athlete has checked it. The card renders only where `labelScanAvailable()` — build 9+ on an
 * iPhone — so build 8 and the web keep the form exactly as it was, with nothing that apologises.
 */

/** What a scan left on the form. Counts are from the read; `doubts` shrinks as the athlete checks. */
interface ScanState {
  photoUri: string;
  partial: boolean;
  filled: number;
  /** How many had a dot when the scan landed. A dot cleared by checking becomes a filled value. */
  unsure: number;
  missing: number;
  /** Field keys with a dot. `serving` covers the amount and unit together. */
  doubts: Record<string, true>;
  /** The name was empty when the scan landed, so it is promoted to the next task (A3). Fixed for the
      scan — the layout must not jump while they type it. */
  askName: boolean;
}

type Fields = Record<string, string>;

const EMPTY: Fields = { name: '', brand: '', amount: '', unitWeight: '', cal: '', protein: '', carb: '', fat: '' };

export default function CreateFoodScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ meal?: string; date?: string; food?: string; mode?: string; from?: string }>();
  const { width } = useWindowDimensions();

  const iso = typeof params.date === 'string' && params.date ? params.date : localToday();
  const editId = params.mode === 'edit' && typeof params.food === 'string' && params.food ? params.food : null;
  const editing = editId != null;

  const [meal, setMeal] = useState<MealSlot>(
    (MEAL_SLOTS as readonly string[]).includes(String(params.meal)) ? (params.meal as MealSlot) : 'breakfast',
  );
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unitKey, setUnitKey] = useState('g');
  const [edited, setEdited] = useState<Fields | null>(null);
  const [scan, setScan] = useState<ScanState | null>(null);
  const [labelOpen, setLabelOpen] = useState(false);
  const canScan = !editing && labelScanAvailable();

  /* A scan lands here on the way back from the camera. Taken once, so a later focus cannot re-apply
     it over the athlete's edits. A rescan replaces every nutrient — misses become blanks — and keeps
     the name and brand they may already have typed. */
  useFocusEffect(
    useCallback(() => {
      const landed = takeLabelScan();
      if (!landed) return;
      const r = landed.read;
      const values: Fields = {};
      const doubts: Record<string, true> = {};
      for (const key of LABEL_FIELDS) {
        const v = r.fields[key];
        values[key] = v?.value ?? '';
        if (v && !v.sure) doubts[key] = true;
      }
      if (r.serving) {
        values.amount = r.serving.amount;
        values.unitWeight = r.serving.unitWeight;
        if (!r.serving.sure) doubts.serving = true;
        setUnitKey(r.serving.unitKey);
      }
      const base = edited ?? EMPTY;
      setEdited({ ...base, ...values });
      setScan({
        photoUri: landed.photoUri,
        partial: r.outcome === 'partial',
        filled: r.filled,
        unsure: r.unsure,
        missing: r.missing,
        doubts,
        askName: !base.name.trim(),
      });
      /* "More nutrients opens automatically when it holds a blank or a dot." */
      setMoreOpen(MORE_NUTRIENTS.some((n) => !values[n.key] || doubts[n.key]));
    }, [edited]),
  );

  const { data: existing } = useQuery(
    useCallback(() => (editId ? fetchFoodByKey(editId) : Promise.resolve(null)), [editId]),
    [editId],
  );

  /**
   * The form. Derived from the loaded food until the athlete touches it, never seeded by an effect —
   * a `setState` on load is the react-compiler lint error this codebase treats as a build break.
   *
   * ⚠ Editing shows the label BACK as a label. The row is per 100 g, so the fields are re-multiplied by
   * the stored serving's weight; showing the per-100 g figures in a form headed "per serving" is the
   * same three-times-wrong bug the conversion exists to prevent.
   */
  const loaded = useMemo<Fields | null>(() => {
    if (!existing) return null;
    const serving = existing.servings?.[0];
    const grams = serving?.grams ?? 100;
    const per = (v: number | null | undefined) => (v == null ? '' : String(Math.round(((v * grams) / 100) * 10) / 10));
    const out: Fields = {
      ...EMPTY,
      name: existing.name,
      brand: existing.brand ?? '',
      amount: String(Math.round(grams * 100) / 100),
      cal: per(existing.kcal100),
      protein: per(existing.protein100),
      carb: per(existing.carb100),
      fat: per(existing.fat100),
    };
    for (const { key } of MORE_NUTRIENTS) {
      const v = existing.micros?.[key];
      if (typeof v === 'number') out[key] = String(Math.round(((v * grams) / 100) * 10) / 10);
    }
    return out;
  }, [existing]);

  const f = edited ?? loaded ?? EMPTY;
  /** Touching a dotted field is checking it — the dot goes. */
  const checked = (key: string) => {
    if (!scan?.doubts[key]) return;
    const { [key]: _gone, ...rest } = scan.doubts;
    setScan({ ...scan, doubts: rest });
  };
  const set = (key: string) => (v: string) => setEdited({ ...f, [key]: v });
  const setNumber = (key: string) => (v: string) => {
    checked(key === 'amount' || key === 'unitWeight' ? 'serving' : key);
    setEdited({ ...f, [key]: v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 6) });
  };
  /* The serving amount alone keeps a label's fraction — "2/3" is what the package says. */
  const setAmount = (v: string) => {
    checked('serving');
    setEdited({ ...f, amount: v.replace(/[^0-9./ ]/g, '').replace(/\s+/g, ' ').slice(0, 8) });
  };
  const dot = (key: string) => (scan?.doubts[key] ? <CheckDot /> : undefined);
  const blank = scan ? '—' : '0';
  const moreToCheck = MORE_NUTRIENTS.filter((n) => scan?.doubts[n.key]).length;

  const unit = unitByKey(unitKey);
  const needsWeight = unitNeedsWeight(unit);
  const grams = servingGrams(f.amount, unit, f.unitWeight);
  const calories = checkCalories({ cal: f.cal, protein: f.protein, carb: f.carb, fat: f.fat });
  const validity = validateFood({
    name: f.name,
    brand: f.brand,
    amount: f.amount,
    unitKey,
    unitWeight: f.unitWeight,
    cal: f.cal,
    protein: f.protein,
    carb: f.carb,
    fat: f.fat,
  });

  const perLabel = grams != null && f.amount ? `per ${f.amount} ${unit.short}` : '';

  const build = () => {
    const g = grams as number;
    return {
      name: f.name.trim(),
      brand: f.brand.trim() || null,
      kcal100: perHundred(String(calories.calories), g),
      protein100: perHundred(f.protein, g),
      carb100: perHundred(f.carb, g),
      fat100: perHundred(f.fat, g),
      servings: [labelServing(f.amount, unit, g)],
      micros: extrasPerHundred(f, g),
    };
  };

  /** Create (or save), and optionally log one serving of it straight into the chosen meal. */
  const save = async (thenLog: boolean) => {
    if (!validity.ok || saving) return;
    setSaving(true);
    try {
      const input = build();
      const food = editing ? await updateUserFood(editId, input) : await createUserFood(input);
      if (!food) return;

      if (thenLog && !editing) {
        const serving = input.servings[0];
        const macros = portionMacros(food, { serving, quantity: 1 });
        await addEntries(iso, [
          {
            meal,
            source: 'custom',
            sourceKey: food.key,
            name: food.name,
            brand: food.brand,
            servingLabel: portionLabel({ serving, quantity: 1 }),
            quantity: 1,
            micros: input.micros,
            macros,
          },
        ]);
        showToast(`${food.name} added to ${MEAL_LABELS[meal]}`);
        router.dismissAll?.();
        router.replace('/nutrition');
        return;
      }

      showToast(editing ? 'Changes saved' : `${food.name} saved to My Foods`);
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const macroFields = MORE_NUTRIENTS.filter((n) => n.group === 'macro');
  const vitaminFields = MORE_NUTRIENTS.filter((n) => n.group === 'vitamin');

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
      <AppBar title="" transparent onBack={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, canScan && !scan && styles.titleWithScan, scan && styles.titleScanned]}>
          {editing ? 'Edit food' : 'Create food'}
        </Text>

        {/* A1 / A2 — the shortcut into the form, and the one line of context after a barcode miss */}
        {canScan && !scan ? (
          <>
            {params.from === 'barcode' ? (
              <View style={styles.missNote}>
                <Text style={styles.missTitle}>No barcode match</Text>
                <Text style={styles.missText}>You can still scan the Nutrition Facts label.</Text>
              </View>
            ) : null}
            <ScanCard onPress={() => router.push('/scan-label')} />
          </>
        ) : null}

        {/* A3 / A4 — what the scan did */}
        {scan ? <ScanSummary scan={scan} onView={() => setLabelOpen(true)} onRescan={() => router.push('/scan-label')} /> : null}

        {/* identity — after a scan the name is the next task, and the brand waits below More nutrients */}
        {scan?.askName ? (
          <>
            <Text style={styles.namePrompt}>Almost done — add a food name</Text>
            <View style={styles.nameRing}>
              <InputField
                accessibilityLabel="Name"
                placeholder="e.g. Honey oat cereal"
                value={f.name}
                onChange={set('name')}
                maxLength={60}
                autoFocus
              />
            </View>
          </>
        ) : (
          <View style={styles.group}>
            <InputField label="Name" placeholder="e.g. Overnight oats" value={f.name} onChange={set('name')} maxLength={60} />
            {scan ? null : (
              <InputField label="Brand (optional)" placeholder="e.g. Trader Joe’s" value={f.brand} onChange={set('brand')} maxLength={40} />
            )}
          </View>
        )}

        {/* serving */}
        <View style={[styles.sectionSolo, styles.labelWithDot, scan && styles.sectionScanned]}>
          <Text style={styles.sectionLabel}>Serving size</Text>
          {dot('serving')}
        </View>
        <View style={styles.servingRow}>
          <Text style={styles.servingLead}>1 serving =</Text>
          <View style={styles.servingAmount}>
            <InputField
              accessibilityLabel="Serving amount"
              placeholder="80"
              keyboardType="numbers-and-punctuation"
              value={f.amount}
              onChange={setAmount}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Serving unit"
            style={styles.unitButton}
            onPress={() => setUnitsOpen(true)}
          >
            <Text style={styles.unitText}>{unit.label}</Text>
            <Chevron />
          </Pressable>
        </View>

        {/*
          ⚠ NOT IN THE `.dc`, AND THE FOOD IS BROKEN WITHOUT IT. `portionMacros` returns ZEROS for a
          serving with no gram weight — on purpose, because inventing one is worse — so a food created
          as "1 serving = 1 piece" would log as 0 calories, every time, silently. A cup of oil and a cup
          of flour do not weigh the same and a "piece" weighs nothing anybody knows, so this asks instead
          of assuming a density. The three weight units never see it.
        */}
        {needsWeight ? (
          <View style={styles.weightRow}>
            <InputField
              label={`One ${unit.short} weighs about`}
              placeholder={unit.weightHint ?? '30'}
              keyboardType="decimal-pad"
              value={f.unitWeight}
              onChange={setNumber('unitWeight')}
              helper="Grams. Forge needs it to scale a portion — a cup of oil and a cup of flour are not the same weight."
            />
          </View>
        ) : null}

        {/* nutrition */}
        <View style={[styles.sectionRow, scan && styles.sectionScanned]}>
          <Text style={styles.sectionLabel}>Nutrition per serving</Text>
          {perLabel ? <Text style={styles.sectionNote}>{perLabel}</Text> : null}
        </View>
        <View style={styles.group}>
          <InputField
            label="Calories"
            labelAccessory={dot('cal')}
            placeholder={calories.placeholder}
            keyboardType="number-pad"
            value={f.cal}
            onChange={setNumber('cal')}
          />
          <View style={styles.macroRow}>
            <View style={styles.macroCell}>
              <InputField label="Protein g" labelAccessory={dot('protein')} placeholder={blank} keyboardType="decimal-pad" value={f.protein} onChange={setNumber('protein')} />
            </View>
            <View style={styles.macroCell}>
              <InputField label="Carbs g" labelAccessory={dot('carb')} placeholder={blank} keyboardType="decimal-pad" value={f.carb} onChange={setNumber('carb')} />
            </View>
            <View style={styles.macroCell}>
              <InputField label="Fat g" labelAccessory={dot('fat')} placeholder={blank} keyboardType="decimal-pad" value={f.fat} onChange={setNumber('fat')} />
            </View>
          </View>
          {calories.helper ? (
            <Text style={[styles.calHelper, calories.warn && styles.calWarn]}>{calories.helper}</Text>
          ) : null}
        </View>

        {/* more nutrients */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: moreOpen }}
          style={styles.moreToggle}
          onPress={() => setMoreOpen((v) => !v)}
        >
          <Text style={styles.sectionLabel}>More nutrients</Text>
          <View style={styles.moreRight}>
            {moreToCheck > 0 ? (
              <View style={styles.labelWithDot}>
                <CheckDot />
                <Text style={styles.toCheck}>{moreToCheck} to check</Text>
              </View>
            ) : null}
            <Chevron color={flColor.gray600} rotated={moreOpen} />
          </View>
        </Pressable>
        {moreOpen ? (
          <View style={styles.moreGrid}>
            {macroFields.map((n) => (
              <View key={n.key} style={styles.moreCell}>
                <InputField label={n.label} labelAccessory={dot(n.key)} placeholder={blank} keyboardType="decimal-pad" value={f[n.key] ?? ''} onChange={setNumber(n.key)} />
              </View>
            ))}
            <Text style={styles.vitaminLabel}>Vitamins &amp; minerals</Text>
            {vitaminFields.map((n) => (
              <View key={n.key} style={styles.moreCell}>
                <InputField label={n.label} labelAccessory={dot(n.key)} placeholder={blank} keyboardType="decimal-pad" value={f[n.key] ?? ''} onChange={setNumber(n.key)} />
              </View>
            ))}
            {/* An empty box is not a zero — `extrasPerHundred` drops it rather than claiming none. */}
            <Text style={styles.moreNote}>Leave anything the label doesn’t state blank. Blank means unknown, not zero.</Text>
          </View>
        ) : null}

        {/* A3 — "Brand sits below More nutrients" once a scan has filled the rest */}
        {scan ? (
          <View style={styles.brandAfter}>
            <InputField label="Brand (optional)" placeholder="e.g. Trader Joe’s" value={f.brand} onChange={set('brand')} maxLength={40} />
          </View>
        ) : null}
      </ScrollView>

      {/* commit */}
      <View style={styles.footer}>
        {validity.reason ? <Text style={styles.blocker}>{validity.reason}</Text> : null}
        {!editing ? (
          <Pressable accessibilityRole="button" style={styles.mealLine} onPress={() => setMealPickerOpen(true)}>
            <Text style={styles.mealLineLabel}>Adding to</Text>
            <Text style={styles.mealLineValue}>{MEAL_LABELS[meal]}</Text>
            <Chevron />
          </Pressable>
        ) : null}
        <Button variant="primary" fullWidth disabled={!validity.ok || saving} onPress={() => save(!editing)}>
          {editing
            ? 'Save changes'
            : calories.calories > 0
              ? `Create food · ${Math.round(calories.calories).toLocaleString('en-US')} cal`
              : 'Create food'}
        </Button>
        {!editing ? (
          <Pressable accessibilityRole="button" disabled={!validity.ok || saving} onPress={() => save(false)}>
            <Text style={[styles.saveOnly, (!validity.ok || saving) && styles.saveOnlyOff]}>Create without logging</Text>
          </Pressable>
        ) : null}
      </View>

      <BottomSheet open={unitsOpen} onClose={() => setUnitsOpen(false)} title="Unit">
        <View style={styles.sheetBody}>
          {FOOD_UNITS.map((u) => {
            const on = u.key === unitKey;
            return (
              <Pressable
                key={u.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={styles.sheetRow}
                onPress={() => {
                  checked('serving');
                  setUnitKey(u.key);
                  setUnitsOpen(false);
                }}
              >
                <Text style={[styles.sheetLabel, on && styles.sheetLabelOn]}>{u.label}</Text>
                {on ? <Check /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      {/* A5 — the photo, so values can be checked without picking the package back up */}
      <BottomSheet open={labelOpen} onClose={() => setLabelOpen(false)} title="Original label">
        <View style={styles.labelSheet}>
          <ScrollView
            style={styles.labelZoom}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {scan ? (
              <Image
                source={{ uri: scan.photoUri }}
                style={{ width: width - 40, height: LABEL_PHOTO_HEIGHT }}
                resizeMode="contain"
                accessibilityLabel="Captured label photo"
              />
            ) : null}
          </ScrollView>
          <Text style={styles.zoomHint}>Pinch to zoom</Text>
        </View>
      </BottomSheet>

      <BottomSheet open={mealPickerOpen} onClose={() => setMealPickerOpen(false)} title="Adding to">
        <View style={styles.sheetBody}>
          {MEAL_SLOTS.map((slot) => {
            const on = slot === meal;
            return (
              <Pressable
                key={slot}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={styles.sheetRow}
                onPress={() => {
                  setMeal(slot);
                  setMealPickerOpen(false);
                }}
              >
                <Text style={[styles.sheetLabel, on && styles.sheetLabelOn]}>{MEAL_LABELS[slot]}</Text>
                {on ? <Check /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

const LABEL_PHOTO_HEIGHT = 440;

/** "Forge isn't confident about this value." The only thing a bronze dot means on this screen. */
function CheckDot() {
  return <View accessible accessibilityLabel="Check this value" style={styles.checkDot} />;
}

/** A1 — shorter than a card, one-line subtitle: a shortcut into the form, not a mode. */
function ScanCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Scan label" onPress={onPress} style={styles.scanCard}>
      <View style={styles.scanIcon}>
        <EngravedIcon name="barcode-scan" size={18} />
      </View>
      <View style={styles.scanCopy}>
        <Text style={styles.scanTitle}>Scan label</Text>
        <Text style={styles.scanSub}>Fill from a Nutrition Facts photo</Text>
      </View>
      <EngravedIcon name="chevron-right" size={14} color={flColor.bronze400} />
    </Pressable>
  );
}

/** A3 / A4 — the strip under the title: the photo, what was found, Rescan. */
function ScanSummary({ scan, onView, onRescan }: { scan: ScanState; onView: () => void; onRescan: () => void }) {
  const checking = Object.keys(scan.doubts).length;
  const filled = scan.filled + (scan.unsure - checking);
  const needs = `${checking} ${checking === 1 ? 'needs' : 'need'} checking`;
  return (
    <View style={[styles.summary, scan.partial && styles.summaryPartial]}>
      <Pressable accessibilityRole="button" accessibilityLabel="View original label" onPress={onView} style={styles.thumb}>
        <Image source={{ uri: scan.photoUri }} style={styles.thumbImage} resizeMode="cover" />
      </Pressable>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryTitle}>{scan.partial ? 'Label partially scanned' : 'Label scanned'}</Text>
        {scan.partial ? (
          <Text style={styles.summaryLine}>
            {[`${filled} filled`, checking > 0 ? needs : null, scan.missing > 0 ? `${scan.missing} not found` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : (
          <View style={styles.labelWithDot}>
            <Text style={styles.summaryLine}>{checking > 0 ? `${filled} filled ·` : `${filled} filled`}</Text>
            {checking > 0 ? (
              <>
                <CheckDot />
                <Text style={styles.summaryLine}>{needs}</Text>
              </>
            ) : null}
          </View>
        )}
      </View>
      <Button variant="text" onPress={onRescan}>
        Rescan
      </Button>
    </View>
  );
}

function Chevron({ color = flColor.bronze400, rotated = false }: { color?: string; rotated?: boolean }) {
  return <EngravedIcon name={rotated ? 'chevron-up' : 'chevron-down'} size={14} color={color} />;
}

function Check() {
  return <EngravedIcon name="check" size={16} color={flColor.bronze400} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28 },

  title: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100, letterSpacing: -0.3, lineHeight: 34, paddingHorizontal: 2, paddingBottom: 20 },
  titleWithScan: { paddingBottom: 16 },
  titleScanned: { paddingBottom: 12 },

  /* A1 — the Scan label card */
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 22,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.charcoal700,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    boxShadow: `${flShadow.borderInset}, ${flShadow.card}`,
  },
  scanIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.md,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  scanCopy: { flex: 1, gap: 2 },
  scanTitle: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  scanSub: { fontSize: 12.5, color: flColor.gray600 },

  /* A2 — after a barcode miss */
  missNote: { gap: 3, paddingHorizontal: 2, paddingBottom: 10 },
  missTitle: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  missText: { fontSize: 12.5, lineHeight: 17.5, color: flColor.gray600 },

  /* A3 / A4 — the scan summary */
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: flRadius.md,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  summaryPartial: { marginBottom: 0 },
  thumb: { width: 34, height: 44, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: flColor.charcoal500, backgroundColor: flColor.charcoal700 },
  thumbImage: { width: '100%', height: '100%' },
  summaryCopy: { flex: 1, gap: 3 },
  summaryTitle: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  summaryLine: { fontSize: 12.5, lineHeight: 17.5, color: flColor.gray400 },
  namePrompt: { paddingTop: 18, paddingBottom: 8, paddingHorizontal: 2, fontSize: 14, fontWeight: '600', color: flColor.bronze300 },
  nameRing: { borderRadius: flRadius.md, boxShadow: `0 0 0 1.5px ${flColor.bronze400}, ${flShadow.glowSubtle}` },
  checkDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: flColor.bronze300 },
  labelWithDot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionScanned: { paddingTop: 18, paddingBottom: 10 },
  brandAfter: { paddingTop: 18 },
  group: { gap: 18 },

  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 30, paddingBottom: 12, paddingHorizontal: 2 },
  sectionLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray600 },
  sectionSolo: { paddingTop: 30, paddingBottom: 12, paddingHorizontal: 2 },
  sectionNote: { fontSize: 11.5, color: flColor.gray600 },

  servingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  servingLead: { fontSize: 15, fontWeight: '600', color: flColor.gray400 },
  servingAmount: { flex: 1, minWidth: 0 },
  unitButton: {
    flex: 1.15,
    minWidth: 0,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    borderWidth: 1.5,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.surfaceRecessed,
  },
  unitText: { flex: 1, fontSize: 15, color: flColor.cream100 },
  weightRow: { paddingTop: 14 },

  macroRow: { flexDirection: 'row', gap: 10 },
  macroCell: { flex: 1, minWidth: 0 },
  calHelper: { paddingHorizontal: 2, fontSize: 12, lineHeight: 17, color: flColor.gray600 },
  calWarn: { color: flColor.redMuted },

  moreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
  },
  moreRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toCheck: { fontSize: 12, color: flColor.gray400 },
  moreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 6 },
  moreCell: { width: '47.5%', minWidth: 0 },
  vitaminLabel: { width: '100%', fontSize: 10.5, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray600, paddingTop: 10, paddingHorizontal: 2 },
  moreNote: { width: '100%', paddingTop: 6, paddingHorizontal: 2, fontSize: 12, lineHeight: 17, color: flColor.gray600 },

  footer: {
    gap: 10,
    paddingTop: 14,
    paddingBottom: SCREEN_BOTTOM_GAP,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  blocker: { fontSize: 12, lineHeight: 17, color: flColor.gray400, textAlign: 'center' },
  mealLine: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4, paddingHorizontal: 2 },
  mealLineLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
  mealLineValue: { fontSize: 13.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze400 },
  saveOnly: { alignSelf: 'center', paddingVertical: 6, fontSize: 12.5, fontWeight: '600', color: flColor.gray600, textAlign: 'center' },
  saveOnlyOff: { opacity: 0.4 },

  sheetBody: { paddingBottom: 8 },
  labelSheet: { gap: 14, paddingBottom: 12 },
  labelZoom: {
    height: LABEL_PHOTO_HEIGHT,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  zoomHint: { fontSize: 12.5, color: flColor.gray600, textAlign: 'center' },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  sheetLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  sheetLabelOn: { color: flColor.bronze300 },
});
