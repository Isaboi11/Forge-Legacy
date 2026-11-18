import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { MealPicker, MealReview, MealSlotLine, mealReviewStyles } from '@/components/forge/MealReview';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor } from '@/constants/foundation';
import { diaryDayParam, localToday, MEAL_LABELS, MEAL_SLOTS, type MealSlot } from '@/domain/nutrition/day';
import { mealPhotoError } from '@/domain/nutrition/meal-photo-read';
import { entriesFrom, loggable, mealTotals, readToast, type ReviewRow } from '@/domain/nutrition/meal-photo-match';
import { addEntries } from '@/data/nutrition-live';
import { matchMealItems, readMealPhoto } from '@/data/meal-photo-live';
import { useToast } from '@/hooks/useCeremony';
import { useNutritionAccess, usePremiumAi } from '@/lib/entitlement';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { ensureConsent } from '@/lib/consent';
import { AI_DECLINED_LINE } from '@/domain/consent/consent';
import { withNotCharged } from '@/domain/ai/ai-call';
import { AiStatus } from '@/components/forge/AiStatus';
import { aiFailed, mealPhotoProgress } from '@/domain/ai/ai-status';
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
 * The review is `components/forge/MealReview.tsx`, shared with Describe a meal (`describe-meal.tsx`, AI Road to 10
 * Sprint 4a §1.6) — moved there unchanged.
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
  const { session } = useAuth();
  /* Leaving mid-read stops the read (Sprint 1, P-G3): nobody is left to check the list. */
  const closeSignal = useCloseSignal();

  /* A link's date is checked, not trusted (QA 09-26 N-19). */
  const iso = diaryDayParam(params.date, localToday());
  const [meal, setMeal] = useState<MealSlot>(() =>
    (MEAL_SLOTS as readonly string[]).includes(String(params.meal)) ? (params.meal as MealSlot) : 'lunch',
  );
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [stage, setStage] = useState<Stage>({ step: 'start' });
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [searchFailed, setSearchFailed] = useState(0);
  const [logging, setLogging] = useState(false);
  /** This read, for "Was this helpful?" (0269) — made once when the model's answer arrives. */
  const [readRef, setReadRef] = useState<string | null>(null);
  /* ⚠ ONE READ AT A TIME, HELD BY A REF — a fast double tap would otherwise pay for two reads before the
     busy state renders (the same guard as `my-recipes.tsx` and `program-import.tsx`). */
  const busy = useRef(false);

  const barBottom = useBarBottom(SCREEN_BOTTOM_GAP);
  const today = localToday();

  const takePhoto = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      /* Asked BEFORE the camera, so nobody takes a photo that then cannot be sent (MHMDA consent). A "Not now" is
         said, never silent (AI audit 11-16, N-D5): the screen used to sit there as if the tap hadn't landed. On the
         review it's a toast, so the rows already checked stay on screen. */
      if (!(await ensureConsent('ai_sharing'))) {
        if (stage.step === 'review') showToast(AI_DECLINED_LINE);
        else setStage({ step: 'problem', text: AI_DECLINED_LINE });
        return;
      }
      const asset = await pick({
        kind: 'images',
        title: 'Photo of your meal',
        hint: 'From above, with the whole plate in the frame. The photo isn’t saved.',
      });
      if (!asset) return;
      setStage({ step: 'reading' });
      const r = await readMealPhoto(asset.uri, closeSignal());
      if (r.kind === 'no_consent') {
        setStage({ step: 'problem', text: AI_DECLINED_LINE });
        return;
      }
      if (r.kind !== 'ok') {
        /* "Not charged." when the server gave the credit back (Sprint 1 contract §1.2). With a soft floor (0272), a
           meal photo refused for credits means TODAY's are used, not the month's — said so, with tomorrow. */
        const floor = r.kind === 'out_of_credits' ? aiFloorUsedLine(aiCreditsNow(session?.user.id ?? null)) : null;
        setStage({ step: 'problem', text: floor ? withNotCharged(`${floor} You can still search for the food.`, r.refunded) : withNotCharged(mealPhotoError(r), r.refunded) });
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
      /* Back to the diary, as Food Detail does — or to Workout Complete if that is where Log Food was opened (H32). */
      if (!finishFoodLog(router)) {
        router.dismissAll?.();
        router.replace('/nutrition');
      }
    } catch (e) {
      /* A refused write is said, and the rows stay for another try (AI audit 11-16, N-D5) — as Food Detail does.
         It used to be an unhandled rejection: the button came back and nothing said the meal wasn't logged. */
      showToast(errorMessage(e));
    } finally {
      setLogging(false);
    }
  };

  const totals = mealTotals(rows);
  const toLog = rows.filter(loggable).length;
  const gatedOut = !premiumAi || !nutritionAccess;

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
      <AppBar title="Log from Photo" transparent onBack={() => router.back()} actions={<AiCreditsChip />} />

      <MealSlotLine meal={meal} iso={iso} today={today} onPress={() => setMealPickerOpen(true)} />

      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {stage.step === 'start' ? (
          <View style={mealReviewStyles.intro}>
            <Text style={mealReviewStyles.introTitle}>Snap the plate, check the list, log it.</Text>
            <Text style={mealReviewStyles.introBody}>
              Forge names the foods it can see and estimates the portions. The calories come from the food
              database, not the photo, and nothing is logged until you’ve checked every item.
            </Text>
            <Text style={mealReviewStyles.introFine}>Uses Premium AI credits. The photo isn’t saved.</Text>
            {gatedOut ? (
              <Text style={mealReviewStyles.problem}>Logging a meal from a photo is part of Premium AI. You can still search for the food.</Text>
            ) : null}
          </View>
        ) : null}

        {/* UX-1: the one AI look — the two steps as they happen, and a failure with "Not charged." on its own line. */}
        {stage.step === 'reading' || stage.step === 'matching' ? <AiStatus status={mealPhotoProgress(stage.step)} style={mealReviewStyles.aiStatus} /> : null}

        {stage.step === 'problem' ? (
          <View style={mealReviewStyles.intro}>
            <AiStatus status={aiFailed(stage.text, false, false)} />
          </View>
        ) : null}

        {stage.step === 'review' ? (
          <MealReview
            rows={rows}
            onRowsChange={setRows}
            totals={totals}
            searchFailed={searchFailed}
            from="photo"
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
            <Pressable accessibilityRole="button" style={mealReviewStyles.footerButton} onPress={takePhoto}>
              <Text style={mealReviewStyles.footerAction}>Take another photo</Text>
            </Pressable>
          </>
        ) : stage.step === 'reading' || stage.step === 'matching' ? null : (
          <>
            <Button variant="primary" fullWidth disabled={gatedOut} icon={<EngravedIcon name="camera" size={18} />} onPress={takePhoto}>
              {stage.step === 'problem' ? 'Try another photo' : 'Take or choose a photo'}
            </Button>
            <Pressable accessibilityRole="button" style={mealReviewStyles.footerButton} onPress={() => router.back()}>
              <Text style={mealReviewStyles.footerAction}>Search instead</Text>
            </Pressable>
          </>
        )}
      </View>

      <MealPicker open={mealPickerOpen} meal={meal} onPick={setMeal} onClose={() => setMealPickerOpen(false)} />

      {mediaPickerSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 },
});
