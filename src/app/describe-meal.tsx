import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { MealPicker, MealReview, MealSlotLine, mealReviewStyles } from '@/components/forge/MealReview';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flBorder, flColor, flRadius } from '@/constants/foundation';
import { diaryDayParam, localToday, MEAL_LABELS, MEAL_SLOTS, type MealSlot } from '@/domain/nutrition/day';
import { MEAL_DESCRIBE_MAX_CHARS, type MealDescribeStop } from '@/domain/nutrition/meal-describe';
import { mealDescribeError, type MealDescribeResult } from '@/domain/nutrition/meal-describe-result';
import { entriesFrom, loggable, mealTotals, readToast, type ReviewRow } from '@/domain/nutrition/meal-photo-match';
import {
  CARE_KICKER,
  CARE_STOP,
  CLINICIAN_STOP,
  CRISIS_KICKER,
  CRISIS_STOP,
  STOP_KICKER,
  stopCalls,
  URGENT_KICKER,
  URGENT_STOP,
} from '@/domain/coach/chat-core';
import { addEntries } from '@/data/nutrition-live';
import { matchMealItems } from '@/data/meal-photo-live';
import { readMealDescription } from '@/data/meal-describe-live';
import { useToast } from '@/hooks/useCeremony';
import { useNutritionAccess, usePremiumAi } from '@/lib/entitlement';
import { AI_DECLINED_LINE } from '@/domain/consent/consent';
import { withNotCharged } from '@/domain/ai/ai-call';
import { AiStatus } from '@/components/forge/AiStatus';
import { aiFailed, aiProblem, type AiStatus as AiStatusModel } from '@/domain/ai/ai-status';
import { useCloseSignal } from '@/lib/useCloseSignal';
import { SCREEN_BOTTOM_GAP, useBarBottom } from '@/lib/screen-insets';
import { finishFoodLog } from '@/lib/food-return';
import { errorMessage } from '@/lib/useQuery';
import { AiFeedback } from '@/components/forge/AiFeedback';
import { AiCreditsChip } from '@/components/forge/AiCreditsChip';
import { uuid } from '@/lib/app-session';
import { useAuth } from '@/lib/auth';
import { aiCreditsNow } from '@/data/ai-credits-live';
import { aiFloorUsedLine } from '@/domain/ai/credits';

/**
 * Describe a Meal — type it, or say it with the keyboard's mic, and log it (AI Road to 10 Sprint 4a §1.6, NU-3).
 * Route `/describe-meal` is the contract name (Nutrition's Add sheet and Holt's toolbox link it).
 *
 * ══ THE FLOW ══
 *
 *   start → the words (a text box; dictation is the keyboard's own mic — no recording, nothing kept)
 *         → reading (`meal-describe`: food names, search phrases and the athlete's amounts, never a calorie — NUT-D4)
 *         → matching (`food-search` per item; `meal-photo-match.ts` keeps only certain matches)
 *         → the SAME review as Snap a plate (`MealReview`): every row editable, rows can be added
 *         → Log → `addEntries`, the one diary write path, to the chosen meal on the diary's day.
 *
 * ⛔ A MEDICAL LINE STOPS BEFORE ANYTHING IS SENT — `readMealDescription` runs `medicalRoute` on the words first, and the
 * stop copy is the chat's own (crisis → 988, an emergency → 911, disordered eating → a person who can help, anything
 * clinical → their doctor). No credit, no model.
 *
 * ⚠ EVERY CALORIE ON THIS SCREEN IS DATABASE FOOD × PORTION — the review's rule, unchanged.
 *
 * ⚠ GATED AS SNAP A PLATE IS: Premium AI + Nutrition. The function refuses without either (403 / 0203's meter); the
 * doors show only for athletes with both; this screen still says why if it is reached some other way.
 */

type Stage =
  | { step: 'start' }
  | { step: 'reading' }
  | { step: 'matching' }
  | { step: 'review' }
  | { step: 'problem'; status: AiStatusModel }
  | { step: 'stop'; route: MealDescribeStop };

/** The kit's working line, said as it happens — the meal photo's two steps, in words. */
const progress = (step: 'reading' | 'matching'): AiStatusModel => ({
  kind: 'working',
  headline: step === 'reading' ? 'Reading your meal…' : 'Finding the foods…',
  steps: [
    { label: 'Read what you wrote', state: step === 'reading' ? 'now' : 'done' },
    { label: 'Find the foods', state: step === 'reading' ? 'waiting' : 'now' },
  ],
});

const STOPS: Record<MealDescribeStop, { kicker: string; text: string }> = {
  crisis: { kicker: CRISIS_KICKER, text: CRISIS_STOP },
  urgent: { kicker: URGENT_KICKER, text: URGENT_STOP },
  care: { kicker: CARE_KICKER, text: CARE_STOP },
  medical: { kicker: STOP_KICKER, text: CLINICIAN_STOP },
};

export default function DescribeMealScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const premiumAi = usePremiumAi();
  const nutritionAccess = useNutritionAccess();
  const { session } = useAuth();
  /* Leaving mid-read stops the read (Sprint 1, P-G3). */
  const closeSignal = useCloseSignal();

  /* A link's date is checked, not trusted (QA 09-26 N-19). */
  const iso = diaryDayParam(params.date, localToday());
  const [meal, setMeal] = useState<MealSlot>(() =>
    (MEAL_SLOTS as readonly string[]).includes(String(params.meal)) ? (params.meal as MealSlot) : 'lunch',
  );
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [text, setText] = useState('');
  const [stage, setStage] = useState<Stage>({ step: 'start' });
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [searchFailed, setSearchFailed] = useState(0);
  const [logging, setLogging] = useState(false);
  /** This read, for "Was this helpful?" (0269). */
  const [readRef, setReadRef] = useState<string | null>(null);
  /* ⚠ ONE READ AT A TIME, HELD BY A REF — a fast double tap would otherwise pay for two reads. */
  const busy = useRef(false);

  const barBottom = useBarBottom(SCREEN_BOTTOM_GAP);
  const today = localToday();
  const gatedOut = !premiumAi || !nutritionAccess;
  const tooLong = text.length > MEAL_DESCRIBE_MAX_CHARS;

  /** A result that is not a read → what the screen says (the UX-1 kit; "Not charged." on its own line when refunded). */
  const problemFor = (r: Exclude<MealDescribeResult, { kind: 'ok' } | { kind: 'stop' }> & { refunded?: boolean }): AiStatusModel => {
    if (r.kind === 'offline') return { kind: 'offline', headline: 'Couldn’t reach Forge.', detail: 'Check your connection and try again.', canRetry: true };
    if (r.kind === 'out_of_credits') {
      /* With the soft floor (0272/0277), a refusal for credits means TODAY's are used — said so, with tomorrow. */
      const floor = aiFloorUsedLine(aiCreditsNow(session?.user.id ?? null));
      return aiProblem(floor ? `${floor} You can still search for the food.` : mealDescribeError(r), { outOfCredits: true });
    }
    const retry = r.kind === 'unavailable' || r.kind === 'unreadable';
    return aiFailed(withNotCharged(mealDescribeError(r), r.refunded), r.refunded, retry);
  };

  const send = async () => {
    if (busy.current || gatedOut || tooLong) return;
    busy.current = true;
    try {
      setStage({ step: 'reading' });
      const r = await readMealDescription(text, closeSignal());
      if (r.kind === 'no_consent') {
        setStage({ step: 'problem', status: aiFailed(AI_DECLINED_LINE, false, false) });
        return;
      }
      if (r.kind === 'stop') {
        setStage({ step: 'stop', route: r.route });
        return;
      }
      if (r.kind !== 'ok') {
        setStage({ step: 'problem', status: problemFor(r) });
        return;
      }
      setReadRef(uuid());
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
      if (!finishFoodLog(router)) {
        router.dismissAll?.();
        router.replace('/nutrition');
      }
    } catch (e) {
      /* A refused write is said, and the rows stay for another try (N-D5). */
      showToast(errorMessage(e));
    } finally {
      setLogging(false);
    }
  };

  const totals = mealTotals(rows);
  const toLog = rows.filter(loggable).length;
  const writing = stage.step === 'start' || stage.step === 'problem';
  const stop = stage.step === 'stop' ? STOPS[stage.route] : null;

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
      <AppBar title="Describe a Meal" transparent onBack={() => router.back()} actions={<AiCreditsChip />} />

      <MealSlotLine meal={meal} iso={iso} today={today} onPress={() => setMealPickerOpen(true)} />

      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {writing ? (
          <View style={mealReviewStyles.intro}>
            {stage.step === 'start' ? (
              <>
                <Text style={mealReviewStyles.introTitle}>Say what you ate, check the list, log it.</Text>
                <Text style={mealReviewStyles.introBody}>
                  Name each food and how much — “2 eggs, toast with butter and a coffee”, or a restaurant order. The
                  calories come from the food database, not from what you wrote, and nothing is logged until you’ve
                  checked every item.
                </Text>
              </>
            ) : (
              <AiStatus status={stage.status} onRetry={send} />
            )}
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              editable={!gatedOut}
              placeholder="2 scrambled eggs, a slice of toast with butter, black coffee"
              placeholderTextColor={flColor.gray600}
              style={styles.box}
              textAlignVertical="top"
              autoCapitalize="sentences"
              accessibilityLabel="Describe what you ate"
              accessibilityHint="Type it, or use the microphone on your keyboard to say it"
            />
            <View style={styles.boxFoot}>
              <EngravedIcon name="microphone" size={14} color={flColor.gray600} />
              <Text style={styles.boxHint}>Tap the mic on your keyboard to say it.</Text>
              {text.length > MEAL_DESCRIBE_MAX_CHARS - 100 ? (
                <Text style={[styles.count, tooLong && styles.countOver]}>{`${text.length}/${MEAL_DESCRIBE_MAX_CHARS}`}</Text>
              ) : null}
            </View>
            <Text style={mealReviewStyles.introFine}>Uses 1 Premium AI credit. What you write isn’t saved.</Text>
            {gatedOut ? (
              <Text style={mealReviewStyles.problem}>Describing a meal is part of Premium AI. You can still search for the food.</Text>
            ) : null}
          </View>
        ) : null}

        {/* UX-1: the one AI look — the two steps as they happen. */}
        {stage.step === 'reading' || stage.step === 'matching' ? <AiStatus status={progress(stage.step)} style={mealReviewStyles.aiStatus} /> : null}

        {stop ? (
          <View style={styles.stop} accessibilityRole="summary">
            <Text style={styles.stopKicker}>{stop.kicker}</Text>
            <Text style={styles.stopText}>{stop.text}</Text>
            {stopCalls(stop.kicker).map((c) => (
              <Button key={c.url} variant="secondary" fullWidth onPress={() => void Linking.openURL(c.url)}>
                {c.label}
              </Button>
            ))}
            <Text style={mealReviewStyles.introFine}>Nothing was sent and no credit was used.</Text>
          </View>
        ) : null}

        {stage.step === 'review' ? (
          <MealReview
            rows={rows}
            onRowsChange={setRows}
            totals={totals}
            searchFailed={searchFailed}
            from="words"
            feedback={readRef ? <AiFeedback feature="meal_photo" aiRef={readRef} style={mealReviewStyles.feedback} /> : null}
          />
        ) : null}
      </ScrollView>

      <View style={[mealReviewStyles.footer, { paddingBottom: barBottom }]}>
        {stage.step === 'review' ? (
          <>
            <Button variant="primary" fullWidth disabled={!toLog || logging} onPress={logMeal}>
              {logging ? 'Logging…' : toLog ? `Log ${toLog} to ${MEAL_LABELS[meal]}` : 'Nothing to log yet'}
            </Button>
            <Pressable accessibilityRole="button" style={mealReviewStyles.footerButton} onPress={() => setStage({ step: 'start' })}>
              <Text style={mealReviewStyles.footerAction}>Change what I wrote</Text>
            </Pressable>
          </>
        ) : stage.step === 'reading' || stage.step === 'matching' ? null : stage.step === 'stop' ? (
          <Pressable accessibilityRole="button" style={mealReviewStyles.footerButton} onPress={() => router.back()}>
            <Text style={mealReviewStyles.footerAction}>Back</Text>
          </Pressable>
        ) : (
          <>
            <Button
              variant="primary"
              fullWidth
              disabled={gatedOut || tooLong || text.trim().length < 2}
              icon={<EngravedIcon name="send" size={18} />}
              onPress={send}
            >
              Send
            </Button>
            <Pressable accessibilityRole="button" style={mealReviewStyles.footerButton} onPress={() => router.back()}>
              <Text style={mealReviewStyles.footerAction}>Search instead</Text>
            </Pressable>
          </>
        )}
      </View>

      <MealPicker open={mealPickerOpen} meal={meal} onPick={setMeal} onClose={() => setMealPickerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 },

  box: {
    minHeight: 120,
    maxHeight: 220,
    overflow: 'hidden',
    fontSize: 16,
    lineHeight: 22,
    color: flColor.cream100,
    backgroundColor: flColor.charcoal800,
    borderRadius: flRadius.md,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    ...flBorder.subtle,
  },
  boxFoot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boxHint: { flex: 1, fontSize: 12, color: flColor.gray600 },
  count: { fontSize: 12, color: flColor.gray600 },
  countOver: { color: flColor.bronzeInk },

  stop: { gap: 12, paddingTop: 20 },
  stopKicker: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronzeInk },
  stopText: { fontSize: 15, lineHeight: 22, color: flColor.cream100 },
});
