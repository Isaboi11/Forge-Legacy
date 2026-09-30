/**
 * ══ HOLT IN KITCHEN MODE — what the chat does differently when he is opened from Nutrition ══
 *
 * `Docs/Holt-Kitchen-Mode-v1.0.md` · the fixes from `Docs/Chef-Holt-Stress-Test-2026-09-25.md`.
 *
 * The stress test put 3,137 simulated kitchen messages through the chat's routing and 1,751 of them reached
 * `coach-interpret` — the TRAINING parser, which has no recipe book, no food diary and no rule against
 * writing its own calorie numbers. "Swap the rice for quinoa" became a program edit; "make me a cut" a
 * program build. So in the kitchen every typed line goes to `coach-ask` (recipe book, diary, NUT-D4 rules)
 * unless it is plainly about training, which keeps the one path that already worked (100% in the run).
 *
 * ⚠ Relative imports only — `@/` is type-only in domain code (`node --test` cannot resolve it).
 */
import { greetReturning, type Turn } from './chat-core.ts';
import { isCrashCut, medicalRoute, MINOR_AGE, NUTRITION_MEDICAL } from './medical-routing.ts';

/*
 * Two strengths each way (stress test 2026-09-25). "Program / workout / routine" is plainly training unless a
 * plainly-food word is there too ("post-workout meal"). The gym's own words — lift, sets, split, bench — lose
 * to ANY food cue, including the body-goal words a macro question is made of: "I'm 5'10, 140, lift 4 days,
 * want to gain muscle" is the macro interview, and "my sauce split" is cooking.
 */
const STRONG_TRAINING = /\b(program|programs|workout|workouts|routine|train|training|exercise|exercises)\b/i;
const STRONG_FOOD =
  /\b(meal|meals|food|foods|recipe|recipes|eat|eating|ate|cook|cooking|bake|baking|grocer\w*|diet|macros?|calorie\w*|cals?|protein|carbs?|fats?|snack\w*|breakfast|lunch|dinner|fridge|pantry|kitchen|ingredient\w*|hungry|shake|smoothie|sauce|oven|stove|air\s*fryer|fry|grill|boil|marinade|chicken|beef|turkey|pork|steak|salmon|tuna|shrimp|fish|eggs?|tofu|tempeh|beans|lentils|chickpeas|rice|pasta|potato(es)?|oats|bread|tortillas?|quinoa|cheese|milk|yogurt|butter|oil|onions?|garlic|veggies|vegetables|fruit|in\s+(that|it|the\s+recipe))\b/i;
const WEAK_TRAINING =
  /\b(lift|lifts|lifting|bench|squat|squats|deadlift|deadlifts|press|curls?|sets\b|\d+\s*x\s*\d+|reps?|split|cardio|mobility|stretch(es|ing)?|leg\s+day|push\s+day|pull\s+day|swap\s+\w+\s+for)\b/i;
const WEAK_FOOD =
  /(\b(cut|cutting|bulk|bulking|lean\s+(out|bulk)|maintain|deficit|surplus|tdee|bmr|lose\s+(\d+\s*)?(lbs?|pounds|weight|fat)|gain\s+(muscle|weight)|desk\s+job|night\s+shifts?)\b|\d\s*'\s*\d|\b\d{2,3}\s*(lbs?|pounds|kg)\b)/i;

/** In the kitchen, is this line for the training side of Holt? Everything else goes to `coach-ask`. */
export function kitchenWantsTraining(text: string): boolean {
  const t = (text ?? '').trim();
  if (STRONG_FOOD.test(t)) return false;
  if (STRONG_TRAINING.test(t)) return true;
  return WEAK_TRAINING.test(t) && !WEAK_FOOD.test(t);
}

/**
 * The first time someone meets Holt FROM the kitchen. Same length as `INTRO` on purpose — the sheet's
 * intro effect counts beats, and a different length would be a second thing to keep in step.
 */
export const KITCHEN_INTRO: string[] = [
  "I'm Holt. Out here I'm your coach; in here I'm your cook.",
  /* kitchen-08 (QA 09-26): "paste a recipe" here read as "paste it to me", and a recipe pasted into the chat
     is never saved. Saving lives in My Recipes, so he says so. */
  "Tell me what's in the fridge, or ask what fits the rest of your day. Recipes you want to keep go in My Recipes. The numbers always come from the app's food data, never a guess of mine.",
  'Allergies and anything medical stay with you and your doctor. Everything else, start wherever you like.',
];

/** "What can I make?" drops this into the composer, unsent. The mic stays up while it is all that is there. */
export const KITCHEN_MAKE_SEED = 'What can I make with ';

/** When a kitchen line was not understood: kitchen words, kitchen doors — never the training openers. */
export const KITCHEN_UNCLEAR = "I'm here. Tell me what you've got, or pick one of these.";
export const KITCHEN_UNCLEAR_DOORS: readonly { label: string; goTo: string }[] = [
  { label: 'Set my macros', goTo: '/nutrition-targets' },
  { label: 'Plan my week', goTo: '/meal-plan' },
  { label: 'Save a recipe', goTo: '/my-recipes' },
];

/*
 * ══ STOP COPY THAT FITS THE QUESTION ══
 *
 * `MEDICAL_STOP` says *"That's a physio's job"* — right for a knee, wrong for "I'm diabetic, what can I eat?"
 * (55 stress-test lines). Food and conditions go to a doctor or a registered dietitian; an injury still goes
 * to the physio line. Holt never calls himself a nutritionist or dietitian (Kitchen Mode §1).
 */
export const DIETITIAN_STOP =
  "That one's for your doctor or a registered dietitian, not a coach. Once they've set the plan, I'm glad to help you cook to it.";
export const KITCHEN_CARE_STOP =
  "I can't help with that one safely. A doctor or a registered dietitian is the right person for it, and I'd want them in your corner. I'm still here for recipes and cooking whenever you want.";

const NUTRITION_WORDS = /\b(eat|eating|ate|food|diet|meal|macros?|calorie\w*|protein|carbs?|recipe|cook|allerg\w*|intoleran\w*)\b/i;

/** Which medical stop to show: the dietitian line for food and conditions, the physio line for an injury. */
export function medicalStopIsDietitian(text: string, kitchen: boolean): boolean {
  const t = text ?? '';
  /* An injury is the physio's — unless the "doctor" in it is about food ("my doctor said low sodium"). */
  if (medicalRoute(t) === 'acute' && !/\b(diet\w*|sodium|salt|sugar|meal|food|recipe|nutrition\w*)\b/i.test(t)) return false;
  return kitchen || NUTRITION_MEDICAL.test(t) || NUTRITION_WORDS.test(t);
}

/**
 * What the kitchen tells `coach-ask`, carried in the `nutrition` context field the function already accepts
 * (so no function redeploy is needed). ≤ `ASK_NUTRITION_CHARS` (500). The diary summary is unchanged facts
 * (NUT-A1-D4); the pantry is the athlete's own grocery list — bought or already at home this week.
 */
export function kitchenContext(summary: string | null, pantry: readonly string[], max = 500, left: string | null = null): string {
  const head = 'Opened from the Nutrition tab (kitchen): lead with food and cooking.';
  const logged = `${left ? ` ${left}` : ''}${summary ? ` Food logged: ${summary}` : ''}`;
  let items = '';
  if (pantry.length) {
    const names: string[] = [];
    for (const n of pantry) {
      const next = [...names, n].join(', ');
      if (head.length + logged.length + ' On hand this week (their grocery list): '.length + next.length + 1 > max) break;
      names.push(n);
    }
    if (names.length) items = ` On hand this week (their grocery list): ${names.join(', ')}.`;
  }
  return `${head}${logged}${items}`.slice(0, max);
}

/*
 * ══ COMING BACK TO THE KITCHEN ══ — `greetReturning`'s second line is sometimes about training ("Weekend
 * training. That's commitment."). In the kitchen the greeting keeps his hello and swaps that line; the chips
 * turn is untouched, so it is still the Home turn `isHomeTurn` draws the kitchen doors in place of.
 */
const KITCHEN_SECOND = [
  'What are we cooking?',
  "Hungry now, or planning ahead?",
  "What's in the fridge today?",
  'What are we making?',
  "Tell me what you've got and I'll tell you what to make.",
];

export function greetKitchen(firstName: string | null | undefined, now: Date = new Date(), roll: () => number = Math.random): Turn[] {
  const turns = greetReturning(firstName, now, roll);
  return turns.map((t, i) => (i === 1 && t.kind === 'holt' ? { ...t, text: KITCHEN_SECOND[Math.floor(roll() * KITCHEN_SECOND.length) % KITCHEN_SECOND.length] } : t));
}

/*
 * ══ A DOOR UNDER THE ANSWER ══ (live check 2026-09-25, 87 real replies). Asked to plan a week or set macros,
 * `coach-ask` answers "I don't build meal plans" / "I don't set calorie targets" — its prompt predates
 * Amendments 002 and 005 — and the athlete is left with words and no way on. The app knows where each of
 * these is done, so it puts the door under whatever he said. Tapping it is the athlete's choice.
 */
const DOORS: readonly { re: RegExp; label: string; goTo: string }[] = [
  { re: /\b(meal\s*plan\w*|plan\s+(my|the|out)\s+(week|meals|food|eating)|meal\s*prep|week\s+of\s+(meals|eating)|day\s+of\s+eating)\b/i, label: 'Plan my week', goTo: '/meal-plan' },
  { re: /\b(macros?|calorie\s+target|target|tdee|how\s+(many|much)\s+(calories|cals|protein)\s+should|(cut|bulk|lean\s+out)\b|(lose|drop)\s+\d+\s*(lbs?|pounds|kg))/i, label: 'Set my macros', goTo: '/nutrition-targets' },
  { re: /(https?:\/\/|\b(save|import|add)\b[^.?!]{0,30}\brecipes?\b|\brecipe\b[^.?!]{0,20}\b(save|import)\b)/i, label: 'Save a recipe', goTo: '/my-recipes' },
  { re: /\b(grocery|groceries|shopping\s+list|what('?s| is)\s+left\s+to\s+buy)\b/i, label: 'Grocery list', goTo: '/grocery-list' },
  /* kitchen-08: "log it for me" — Holt can't write the diary, so the door to where it's done goes under him. */
  { re: /\b(log|track)\s+(it|this|that|these|those|my|the|what\s+i\s+(ate|had)|food|a\s+meal)\b|\badd\s+[^.?!]{0,30}\bto\s+my\s+(diary|food\s+log|log)\b/i, label: 'Log food', goTo: '/log-food' },
];

/*
 * ══ NO DOOR UNDER A REFUSAL ══ (kitchen-04, QA 09-26). Holt declined "im 16 give me a cutting meal plan" and
 * "30 pounds in 2 weeks", then a "Plan my week" / "Set my macros" door led straight to the thing refused. When
 * the athlete is a minor (in this message or earlier in the chat), the ask is a crash rate, or his answer
 * sends them to a professional, the doors stay down. Under 18 gets no targets (NUT-D5); a crash cut is past
 * the safe floor either way.
 */
const FAST_LOSS =
  /\b(lose|losing|drop|dropping|shed|shedding|cut|cutting)\b[^.?!]{0,30}\b(fast|quick(ly)?|asap|rapid(ly)?|overnight|by\s+(tomorrow|next\s+week|the\s+weekend)|in\s+(a|one|two|1|2|3|three)\s+(days?|weeks?))\b/i;
const REFERRED =
  /\b(doctor|dietitian|dietician|physician|pediatrician|paediatrician|physio\w*|healthcare|health\s+care)\b|\b(can'?t|cannot|won'?t|not\s+going\s+to|not\s+able\s+to)\s+(help|build|set|give|make|do|plan)\b/i;

export function kitchenDoorsFor(text: string, reply = '', earlier: readonly string[] = []): { label: string; goTo: string }[] {
  const t = (text ?? '').replace(/[‘’ʼ]/g, "'");
  if ([t, ...earlier].some((s) => MINOR_AGE.test((s ?? '').replace(/[‘’ʼ]/g, "'")))) return [];
  if (isCrashCut(t) || FAST_LOSS.test(t) || REFERRED.test(reply ?? '')) return [];
  return DOORS.filter((d) => d.re.test(t)).map(({ label, goTo }) => ({ label, goTo })).slice(0, 2);
}

/*
 * ══ HE SAID HE'D LOOK ONLINE — THE CHIP HAS TO BE THERE ══ (kitchen-07, QA 09-26). The prompt tells him to
 * call `offer_online_recipe_search` with the offer, and in 2 of 3 replies he only said it, leaving another
 * paid message as the only way on. When his words make the offer and no tool call came, the app adds the chip.
 */
const OFFERS_ONLINE =
  /\b((look|search|check|hunt|find\s+(you\s+)?(one|some(thing)?|a\s+recipe|recipes))\s+(for\s+(one|some|it|that|a\s+recipe|recipes)\s+)?online|online\s+(search|for\s+(one|a\s+recipe|recipes)))\b/i;
export function replyOffersOnline(reply: string): boolean {
  return OFFERS_ONLINE.test(reply ?? '');
}

/*
 * ══ THE KITCHEN'S NEW CHAT MENU ══ (kitchen-13, QA 09-26). It offered "Build something" and "Training
 * question" in the kitchen. These are the Kitchen Home doors instead — each goes where the card does.
 */
export const KITCHEN_MENU: readonly { label: string; goTo?: string; ask?: string }[] = [
  { label: 'What can I make?', ask: KITCHEN_MAKE_SEED, goTo: '/my-recipes' },
  { label: 'Log food', goTo: '/log-food' },
  { label: 'Grocery list', goTo: '/grocery-list' },
];

/** What's left today, from the app's own totals — so Holt quotes it rather than doing the subtraction. */
export function leftTodayLine(eaten: { kcal: number; protein: number }, target: { kcal: number; protein: number } | null): string | null {
  if (!target || !(target.kcal > 0)) return null;
  const kcal = Math.round(target.kcal - eaten.kcal);
  const protein = Math.round(target.protein - eaten.protein);
  const fmt = (n: number) => n.toLocaleString('en-US');
  return `Left today (the app's numbers — quote these, don't recalculate): ${kcal >= 0 ? `${fmt(kcal)} kcal` : `${fmt(-kcal)} kcal over`}, ${protein >= 0 ? `${protein} g protein` : 'protein met'}.`;
}
