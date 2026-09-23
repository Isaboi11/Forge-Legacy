import { useCallback, useMemo, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { localToday, MEAL_LABELS, MEAL_SLOTS, shiftDay, totals, type LogEntry, type MealSlot } from '@/domain/nutrition/day';
import {
  canEditPortion,
  countLabel,
  dayChoices,
  defaultSavedMealName,
  defaultTargetDay,
  entryMacroLine,
  entrySubtitle,
  isSameSpot,
  mealBreakdown,
  mealDateLabel,
  moveButtonLabel,
  saveMealHelper,
  slotChoices,
  type MoveMode,
} from '@/domain/nutrition/meal';
import {
  clearMeal,
  copyMealFrom,
  copyMealTo,
  fetchDay,
  moveEntry,
  removeEntry,
  saveMealFromDay,
} from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { consumeMealHint } from '@/lib/meal-hint';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Meal Detail — built to `Meal Detail.dc.html`, wired to the real diary (0205).
 *
 * ⚠ **THIS IS WHERE A LOG STOPS BEING WRITE-ONLY.** Until it existed, tapping a meal on Nutrition Home
 * went back to the search to add MORE; there was no way to see what was in Breakfast, fix a portion, or
 * undo a mis-tap. `removeEntry`, `updateEntry` and `saveMealFromDay` had been sitting in `nutrition-live`
 * with no caller since Phase 1's first pass, and Log Food's "My Meals" filter told the athlete to *"log a
 * meal, then save it from Nutrition Home"* — a promise nothing in the app kept. Architecture §3 lists
 * edit, delete and copy among Phase 1's *required basics*; this screen is all three.
 *
 * Faithful to the `.dc`: the bronze date eyebrow over the serif meal name; the 48px calorie figure with
 * protein/carbs/fat stacked beside it, the whole block a button into the full breakdown; the "3 foods"
 * header with the gesture hint beside it for the first two opens; one card of rows, each swiping left to
 * reveal Delete and long-pressing into its own actions; an empty state that offers a copy; and the
 * Save as meal / + Add food pair under a fade.
 *
 * ⚠ **EVERY FIGURE COMES FROM `domain/nutrition`** (NUT-D4). This file positions numbers and never
 * computes one — `mealBreakdown` decides which nutrients can honestly be shown, `totals` sums the plate.
 */

/** How far a row slides to uncover Delete. The `.dc`'s number. */
const SWIPE = 88;

type SheetKind = 'entry' | 'meal' | 'move' | 'copy' | 'breakdown' | 'save' | 'clear';

export default function MealDetailScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();

  /* Minted once per mount, like Nutrition Home: a session that crosses midnight keeps showing the day
     the athlete opened, rather than silently re-labelling it. */
  const [todayIso] = useState(() => localToday());
  const iso = typeof params.date === 'string' && params.date ? params.date : todayIso;
  const meal: MealSlot = (MEAL_SLOTS as readonly string[]).includes(String(params.meal))
    ? (params.meal as MealSlot)
    : 'breakfast';

  const [reloads, setReloads] = useState(0);
  const { data: day } = useQuery(useCallback(() => fetchDay(iso), [iso]), [iso, reloads]);
  /* Coming back from Food Detail with a changed portion has to show the changed portion. */
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));

  /* One read, one write, no race — see `meal-hint`. */
  const { data: showHint } = useQuery(consumeMealHint, []);

  const entries = useMemo(() => (day?.entries ?? []).filter((e) => e.meal === meal), [day, meal]);
  const sum = useMemo(() => totals(entries), [entries]);
  const breakdown = useMemo(() => mealBreakdown(entries), [entries]);

  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetDay, setTargetDay] = useState(iso);
  const [targetSlot, setTargetSlot] = useState<MealSlot>(meal);
  const [saveName, setSaveName] = useState(() => defaultSavedMealName(meal));
  const [busy, setBusy] = useState(false);

  const targetEntry = entries.find((e) => e.id === targetId) ?? null;
  const mode: MoveMode = sheet === 'copy' ? 'copy' : 'move';
  const sameSpot = isSameSpot(iso, meal, targetDay, targetSlot);
  const days = useMemo(() => dayChoices(iso, todayIso), [iso, todayIso]);
  const slots = useMemo(() => slotChoices(meal, iso, targetDay), [meal, iso, targetDay]);
  const targetDayLabel = days.find((d) => d.iso === targetDay)?.label ?? targetDay;

  const reload = () => setReloads((n) => n + 1);
  const closeSheet = () => setSheet(null);

  const openMove = (kind: MoveMode) => {
    setTargetDay(defaultTargetDay(iso, kind));
    setTargetSlot(meal);
    setSheet(kind === 'copy' ? 'copy' : 'move');
  };

  const deleteEntry = async (entry: LogEntry) => {
    setSheet(null);
    try {
      await removeEntry(entry.id);
      reload();
      showToast(`Removed ${entry.name}`);
    } catch (e) {
      /* Every write on this screen fails LOUDLY. A diary that quietly refuses a delete leaves the row
         on screen and says nothing, so the athlete deletes it again, and again. */
      showToast(errorMessage(e));
      reload();
    }
  };

  const editPortion = (entry: LogEntry) => {
    setSheet(null);
    router.push({
      pathname: '/food-detail',
      params: {
        key: String(entry.sourceKey),
        date: iso,
        meal,
        entry: entry.id,
        amount: String(entry.quantity),
        grams: entry.grams != null ? String(entry.grams) : '',
      },
    });
  };

  const confirmMove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === 'copy') {
        const copied = await copyMealTo({ iso, meal }, { iso: targetDay, meal: targetSlot });
        showToast(
          copied.length
            ? `${MEAL_LABELS[meal]} copied to ${targetDayLabel} · ${MEAL_LABELS[targetSlot]}`
            : 'Nothing to copy',
        );
      } else {
        if (sameSpot || !targetEntry) return;
        await moveEntry(targetEntry.id, { iso: targetDay, meal: targetSlot }, targetEntry);
        showToast(`Moved to ${targetDayLabel} · ${MEAL_LABELS[targetSlot]}`);
      }
      setSheet(null);
      reload();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmSave = async () => {
    const name = saveName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await saveMealFromDay(name, iso, meal);
      setSheet(null);
      showToast(`“${name}” saved to My Meals`);
    } catch (e) {
      /* The sheet stays OPEN on a failure — the name is still typed, and closing it would throw the
         athlete's work away along with the error. */
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /**
   * The empty state promises "or copy a meal from another day", and a promise with nothing behind it is
   * the defect class this codebase keeps finding. It is the same one-tap copy the empty card on
   * Nutrition Home offers, aimed at the meal already on screen.
   */
  const copyYesterday = async () => {
    if (busy) return;
    setSheet(null);
    setBusy(true);
    try {
      const copied = await copyMealFrom(shiftDay(iso, -1), iso, meal);
      if (!copied.length) {
        showToast(`Nothing in ${MEAL_LABELS[meal]} the day before to copy`);
        return;
      }
      reload();
      showToast(`Copied ${countLabel(copied.length)}`);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doClearMeal = async () => {
    setSheet(null);
    try {
      await clearMeal(iso, meal);
      reload();
      showToast(`${MEAL_LABELS[meal]} cleared`);
    } catch (e) {
      showToast(errorMessage(e));
      reload();
    }
  };

  const sheetTitle =
    sheet === 'entry'
      ? (targetEntry?.name ?? '')
      : sheet === 'meal'
        ? MEAL_LABELS[meal]
        : sheet === 'move'
          ? 'Move to'
          : sheet === 'copy'
            ? `Copy ${MEAL_LABELS[meal]} to`
            : sheet === 'breakdown'
              ? `${MEAL_LABELS[meal]} nutrition`
              : sheet === 'save'
                ? 'Save as meal'
                : sheet === 'clear'
                  ? `Clear ${MEAL_LABELS[meal]}?`
                  : '';

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />

      <AppBar
        title=""
        transparent
        onBack={() => router.back()}
        actions={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Meal options"
            hitSlop={8}
            style={styles.moreButton}
            onPress={() => setSheet('meal')}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill={flColor.gray400}>
              <Path d="M12 3.3a1.7 1.7 0 110 3.4 1.7 1.7 0 010-3.4zm0 7a1.7 1.7 0 110 3.4 1.7 1.7 0 010-3.4zm0 7a1.7 1.7 0 110 3.4 1.7 1.7 0 010-3.4z" />
            </Svg>
          </Pressable>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Text style={styles.eyebrow}>{mealDateLabel(iso, todayIso)}</Text>
          <Text style={styles.mealName}>{MEAL_LABELS[meal]}</Text>
        </View>

        {/* totals — the whole block opens the full breakdown */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${MEAL_LABELS[meal]} nutrition: ${sum.kcal} calories. Open full breakdown.`}
          disabled={entries.length === 0}
          style={styles.totalsRow}
          onPress={() => setSheet('breakdown')}
        >
          <View>
            <Text style={styles.totalCal}>{sum.kcal.toLocaleString('en-US')}</Text>
            <Text style={styles.totalCalLabel}>Calories</Text>
          </View>
          <View style={styles.totalsMacros}>
            <TotalMacro label="Protein" value={sum.protein} />
            <TotalMacro label="Carbs" value={sum.carb} />
            <TotalMacro label="Fat" value={sum.fat} />
            {entries.length ? (
              <Svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke={flColor.gray600}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={styles.totalsChevron}
              >
                <Path d="M9 6l6 6-6 6" />
              </Svg>
            ) : null}
          </View>
        </Pressable>

        {/* the list */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionLabel}>{countLabel(entries.length)}</Text>
          {showHint && entries.length ? <Text style={styles.hint}>Swipe to delete · hold for more</Text> : null}
        </View>

        {entries.length ? (
          <View style={styles.card}>
            {entries.map((entry, i) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                first={i === 0}
                onOpen={() => {
                  /* A Quick Add has no food to reopen, so a tap offers what it CAN do instead of
                     pushing a screen that would have nothing to show. */
                  if (canEditPortion(entry)) {
                    editPortion(entry);
                    return;
                  }
                  setTargetId(entry.id);
                  setSheet('entry');
                }}
                onActions={() => {
                  setTargetId(entry.id);
                  setSheet('entry');
                }}
                onDelete={() => deleteEntry(entry)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{`Nothing in ${MEAL_LABELS[meal]} yet`}</Text>
            <Text style={styles.emptyMessage}>Add a food, or copy a meal from another day.</Text>
            <Pressable accessibilityRole="button" hitSlop={8} disabled={busy} onPress={copyYesterday}>
              <Text style={styles.emptyAction}>Copy yesterday</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* the pair under the fade */}
      <View style={styles.footer} pointerEvents="box-none">
        <LinearGradient
          colors={['rgba(10,10,12,0)', 'rgba(10,10,12,0.92)', 'rgba(10,10,12,0.98)']}
          locations={[0, 0.26, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.footerRow}>
          {entries.length ? (
            <View style={styles.footerHalf}>
              <Button
                variant="secondary"
                fullWidth
                onPress={() => {
                  setSaveName(defaultSavedMealName(meal));
                  setSheet('save');
                }}
              >
                Save as meal
              </Button>
            </View>
          ) : null}
          <View style={styles.footerHalf}>
            <Button
              variant="primary"
              fullWidth
              onPress={() => router.push({ pathname: '/log-food', params: { date: iso, meal } })}
            >
              + Add food
            </Button>
          </View>
        </View>
      </View>

      <BottomSheet open={sheet != null} onClose={closeSheet} title={sheetTitle} scroll={sheet === 'breakdown'}>
        {/* one row's actions, or the meal's */}
        {sheet === 'entry' || sheet === 'meal' ? (
          <View style={styles.actionList}>
            {(sheet === 'meal'
              ? /* An empty meal has nothing to copy out, save or clear — the one useful thing is to
                   bring yesterday's in, which is what its empty state offers too. */
                entries.length === 0
                ? [{ label: 'Copy yesterday', note: '', danger: false, run: copyYesterday }]
                : [
                    { label: 'Copy to another day or meal', note: '', danger: false, run: () => openMove('copy') },
                    {
                      label: 'Save as meal',
                      note: '',
                      danger: false,
                      run: () => {
                        setSaveName(defaultSavedMealName(meal));
                        setSheet('save');
                      },
                    },
                    {
                      label: 'Clear meal',
                      note: countLabel(entries.length),
                      danger: true,
                      run: () => setSheet('clear'),
                    },
                  ]
              : targetEntry
                ? [
                    /* A Quick Add has no food behind it to re-multiply (0205: `source_key` is null), so
                       there is nothing for Food Detail to open. Move and Delete still apply. */
                    ...(canEditPortion(targetEntry)
                      ? [
                          {
                            label: 'Edit portion',
                            note: targetEntry.servingLabel ?? '',
                            danger: false,
                            run: () => editPortion(targetEntry),
                          },
                        ]
                      : []),
                    { label: 'Move to…', note: '', danger: false, run: () => openMove('move') },
                    { label: 'Delete', note: '', danger: true, run: () => deleteEntry(targetEntry) },
                  ]
                : []
            ).map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                style={styles.actionRow}
                onPress={action.run}
              >
                <Text style={[styles.actionLabel, action.danger && styles.actionDanger]}>{action.label}</Text>
                {action.note ? <Text style={styles.actionNote}>{action.note}</Text> : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* move one row, or copy the whole meal */}
        {sheet === 'move' || sheet === 'copy' ? (
          <View style={styles.moveBody}>
            <View style={styles.dayPills}>
              {days.map((d) => {
                const on = d.iso === targetDay;
                return (
                  <Pressable
                    key={d.iso}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.dayPill, on && styles.dayPillOn]}
                    onPress={() => setTargetDay(d.iso)}
                  >
                    <Text style={[styles.dayPillText, on && styles.dayPillTextOn]} numberOfLines={1}>
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View>
              {slots.map((s) => {
                const on = s.meal === targetSlot;
                return (
                  <Pressable
                    key={s.meal}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={styles.slotRow}
                    onPress={() => setTargetSlot(s.meal)}
                  >
                    <Text style={[styles.slotLabel, on && styles.slotLabelOn]}>{s.label}</Text>
                    {s.note ? <Text style={styles.slotNote}>{s.note}</Text> : null}
                    {on ? (
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M5 12.5l4.5 4.5L19 7.5" />
                      </Svg>
                    ) : (
                      <View style={styles.slotCheckGap} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Button
              variant="primary"
              fullWidth
              disabled={busy || (mode === 'move' && sameSpot)}
              onPress={confirmMove}
            >
              {moveButtonLabel(mode, targetDayLabel, targetSlot, sameSpot)}
            </Button>
          </View>
        ) : null}

        {/* the full plate */}
        {sheet === 'breakdown' ? (
          <View style={styles.breakdownBody}>
            {breakdown.rows.map((row) => (
              <View key={row.key} style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, row.indent && styles.breakdownIndent]}>{row.label}</Text>
                <Text style={styles.breakdownValue}>{row.value}</Text>
              </View>
            ))}
            {breakdown.partial ? (
              <Text style={styles.breakdownNote}>
                Some foods in this meal don’t carry fibre, sugar, saturated fat, sodium or cholesterol, so
                those totals are left out rather than shown short.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* "Usual Breakfast" */}
        {sheet === 'save' ? (
          <View style={styles.saveBody}>
            <InputField
              label="Meal name"
              value={saveName}
              onChange={setSaveName}
              maxLength={40}
              helper={saveMealHelper(entries)}
            />
            <Button variant="primary" fullWidth disabled={!saveName.trim() || busy} onPress={confirmSave}>
              Save to My Meals
            </Button>
          </View>
        ) : null}

        {/*
          ⚠ A STEP OF THIS SHEET, NOT A SECOND ONE. The `.dc`'s "Clear meal" empties the plate on one
          tap; a single row is a swipe the athlete can see mid-way through, but clearing is several rows
          at once, from inside a menu, with nothing to undo it — so it asks first.

          ⚠ AND IT ASKS **HERE** RATHER THAN IN `ConfirmSheet`, WHICH WOULD HAVE BEEN SILENTLY DEAD ON
          iOS: iOS refuses to present a second view controller while one is still on screen (the trap
          `BottomSheet`'s own `onDismiss` documents, and the reason `useMediaPicker` waits for it). This
          sheet is already up, so a confirmation raised in the same tick would never appear and "Clear
          meal" would read as a button that does nothing.
        */}
        {sheet === 'clear' ? (
          <View style={styles.saveBody}>
            <Text style={styles.confirmBody}>
              {`This removes ${countLabel(entries.length)} from ${mealDateLabel(iso, todayIso)}. It can't be undone.`}
            </Text>
            <Button variant="destructive" fullWidth onPress={doClearMeal}>
              {`Clear ${MEAL_LABELS[meal]}`}
            </Button>
            <Button variant="secondary" fullWidth onPress={() => setSheet('meal')}>
              Keep it
            </Button>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

function TotalMacro({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.totalMacro}>
      <Text style={styles.totalMacroValue}>{`${Math.round(value)} g`}</Text>
      <Text style={styles.totalMacroLabel}>{label}</Text>
    </View>
  );
}

/**
 * One diary row: tap to change the portion, swipe left for Delete, hold for everything else.
 *
 * ⚠ **THE PAN CLAIMS ONLY A HORIZONTAL DRAG**, the same discipline `useSheetDrag` documents. A responder
 * that took any movement would eat the ScrollView's vertical drag and the list would stop scrolling —
 * and a responder on the Pressable itself would eat the tap. So the gesture sits on the wrapper, guarded
 * on `dx`, and the press and the long-press stay with the Pressable inside it.
 *
 * ⚠ `useState(() => new Animated.Value(0))`, never `useRef(...).current`: the react-compiler lint ERRORS
 * on a ref read during render, and this value is read during render.
 */
function EntryRow({
  entry,
  first,
  onOpen,
  onActions,
  onDelete,
}: {
  entry: LogEntry;
  first: boolean;
  onOpen: () => void;
  onActions: () => void;
  onDelete: () => void;
}) {
  const [tx] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState(false);

  const settle = useMemo(
    () => (next: boolean) => {
      setOpen(next);
      Animated.spring(tx, {
        toValue: next ? -SWIPE : 0,
        stiffness: 320,
        damping: 30,
        overshootClamping: true,
        useNativeDriver: true,
      }).start();
    },
    [tx],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderMove: (_e, g) => {
          const base = open ? -SWIPE : 0;
          /* A little past the button and no further: rubber-banding past the row's own width reads as
             a broken layout rather than a gesture with somewhere left to go. */
          tx.setValue(Math.max(-SWIPE - 16, Math.min(0, base + g.dx)));
        },
        onPanResponderRelease: (_e, g) => settle((open ? -SWIPE : 0) + g.dx < -SWIPE / 2),
        onPanResponderTerminate: () => settle(open),
      }),
    [open, settle, tx],
  );

  return (
    <View style={[styles.rowWrap, !first && styles.rowDivider]} {...pan.panHandlers}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${entry.name}`}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'yes' : 'no-hide-descendants'}
        style={styles.deletePlate}
        onPress={onDelete}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>

      <Animated.View style={{ transform: [{ translateX: tx }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${entry.name}, ${entrySubtitle(entry)}, ${Math.round(entry.kcal)} calories`}
          accessibilityHint="Opens the portion. Hold for more actions."
          style={styles.row}
          onPress={() => (open ? settle(false) : onOpen())}
          onLongPress={() => {
            settle(false);
            onActions();
          }}
          delayLongPress={480}
        >
          <View style={styles.rowLine}>
            <Text style={styles.rowName} numberOfLines={1}>
              {entry.name}
            </Text>
            <Text style={styles.rowCal}>{Math.round(entry.kcal)}</Text>
          </View>
          <View style={styles.rowLine}>
            <Text style={styles.rowSub} numberOfLines={1}>
              {entrySubtitle(entry)}
            </Text>
            <Text style={styles.rowMacros}>{entryMacroLine(entry)}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 140 },
  moreButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  identity: { gap: 6, paddingHorizontal: 2, paddingBottom: 22 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
  mealName: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100, letterSpacing: -0.3, lineHeight: 34 },

  totalsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 2,
    paddingBottom: 26,
  },
  totalCal: { fontFamily: flFont.display, fontSize: 48, color: flColor.cream100, letterSpacing: -0.8, lineHeight: 48 },
  totalCalLabel: { marginTop: 8, fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
  totalsMacros: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingBottom: 1 },
  totalMacro: { alignItems: 'flex-end', gap: 5 },
  totalMacroValue: { fontSize: 17, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  totalMacroLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },
  totalsChevron: { marginBottom: 17, marginLeft: 2 },

  listHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2, paddingBottom: 12 },
  sectionLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray600 },
  hint: { fontSize: 11.5, color: flColor.gray600 },

  card: {
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
    overflow: 'hidden',
  },
  rowWrap: { position: 'relative' },
  rowDivider: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  deletePlate: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SWIPE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.destructiveFill,
    borderLeftWidth: 1,
    borderLeftColor: flColor.destructiveBorder,
  },
  deleteText: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.redMuted },
  row: { gap: 5, paddingVertical: 15, paddingHorizontal: 18, backgroundColor: flColor.charcoal800 },
  rowLine: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  rowName: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  rowCal: { fontSize: 15, fontWeight: '700', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  rowSub: { flex: 1, minWidth: 0, fontSize: 12.5, color: flColor.gray600 },
  rowMacros: { fontSize: 12, color: flColor.gray600, fontVariant: ['tabular-nums'] },

  empty: { alignItems: 'center', gap: 8, paddingTop: 36, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 19, color: flColor.cream100, textAlign: 'center' },
  emptyMessage: { fontSize: 13.5, lineHeight: 20, color: flColor.gray600, textAlign: 'center' },
  emptyAction: { paddingTop: 6, fontSize: 12.5, fontWeight: '600', letterSpacing: 0.4, color: flColor.bronze400 },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  footerRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: SCREEN_BOTTOM_GAP },
  footerHalf: { flex: 1, minWidth: 0 },

  actionList: { paddingBottom: 8 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  actionDanger: { color: flColor.redMuted },
  actionNote: { fontSize: 13, color: flColor.gray600 },

  moveBody: { gap: 16, paddingBottom: 8 },
  dayPills: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
  },
  dayPill: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.pill },
  dayPillOn: { backgroundColor: flColor.bronzeTint },
  dayPillText: { fontSize: 11.5, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.gray600 },
  dayPillTextOn: { color: flColor.bronze300 },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  slotLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  slotLabelOn: { color: flColor.bronze300 },
  slotNote: { fontSize: 12.5, color: flColor.gray600 },
  slotCheckGap: { width: 16 },

  breakdownBody: { paddingBottom: 12 },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  breakdownLabel: { fontSize: 14, color: flColor.gray400 },
  breakdownIndent: { paddingLeft: 14, color: flColor.gray600 },
  breakdownValue: { fontSize: 14, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  breakdownNote: { paddingTop: 14, paddingHorizontal: 4, fontSize: 12, lineHeight: 18, color: flColor.gray600 },

  saveBody: { gap: 18, paddingBottom: 8 },
  confirmBody: { fontSize: 14, lineHeight: 21, color: flColor.gray400, paddingHorizontal: 4 },
});
