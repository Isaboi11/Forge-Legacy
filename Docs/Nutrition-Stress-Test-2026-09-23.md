# Nutrition — Full Stress Test, 2026-09-23

**Status:** findings only, except four defects fixed during the pass (marked ✅ FIXED).
**Scope:** all seven nutrition screens, the data layer, the `food-search` Edge Function, migrations
`0205`–`0209`, and the architecture's own commitments.
**Basis:** line-by-line read of 7,096 lines across `src/app/*food*|*meal*|*nutrition*`,
`src/domain/nutrition/*`, `src/data/nutrition-live.ts`, `supabase/functions/food-search/`, plus
`Nutrition-Architecture-v1.0.md` §3 / §5 / §10 / §12 and NUT-D1…D9.
**Method:** every control traced to its handler; every handler traced to its write; every write traced
to its table. Personas walked as state combinations, not as vibes — the axes are listed in §9.

> **⚠ The headline finding is not a screen. It is that the whole tab is invisible to every tester.**
> `0206` gates Nutrition to two accounts. Nothing below has been used by anyone but the PO, so there is
> **zero field evidence** in this document. Everything here is derived from the code and the specs.

---

## 1. What is actually built

| Screen | Route | State |
|---|---|---|
| Nutrition Home | `/(tabs)/nutrition` | ✅ built to `.dc` |
| Log Food | `/log-food` | ✅ built to `.dc` |
| Food Detail | `/food-detail` | ✅ built to `.dc` + edit mode |
| Meal Detail | `/meal-detail` | ✅ built to `.dc` |
| Create / Edit Food | `/create-food` | ✅ built to `.dc`, minus scan-label |
| Nutrition Details (week) | `/nutrition-details` | ✅ built to `.dc` |
| Nutrition Targets | `/nutrition-targets` | ✅ built to `.dc` |

Seven screens, ~7,100 lines, 4,113 tests green. **Phase 1 is functionally complete** except barcode
scanning and label scanning, which both need build 9.

---

## 2. ⛔ Critical — fixed in this pass

### 2.1 ✅ FIXED — the diary filed dinner on tomorrow, every evening, west of Greenwich

Every nutrition surface derived "today" from `new Date().toISOString().slice(0, 10)`. **That is a UTC
date.** Eight call sites, across all seven screens and the data layer.

At 6:00 pm in California the app's `today` was already **the 23rd**. Consequences, all silent:

- Dinner logged into a day that had not started.
- The day strip read **"Today"** over tomorrow's date.
- `mealForNow()` uses `getHours()` — **local** — so the app picked "Dinner" and filed it on tomorrow.
  The two halves of the same tap disagreed with each other.
- Nutrition Details' last column was a day that did not exist; the "today is excluded from the average"
  rule excluded the wrong day, so the real current day was averaged in as if finished.
- `nutrition_targets.effective_from` was written a day early.

The rest of the app already builds day keys from **local** parts (`domain/admin/series.ts:76`,
`domain/squad/goal-state.ts:153`, `domain/settings/export-core.ts:149`). Nutrition was the outlier.

**Fix:** `toLocalIso(date)` and `localToday()` in `domain/nutrition/day.ts`, pure and tested; all eight
call sites moved. Three tests pin it, one of them TZ-independent so it holds on any CI machine.

> ⚠ **This shipped.** It was live on the web preview and on build 8 from the first Phase 1 pass until
> today. Any nutrition data the PO logged in an evening is filed one day late and will stay that way —
> nothing backfills it. Worth knowing before reading the week view as truth.

### 2.2 ✅ FIXED — "Set a daily target" could not be tapped

`src/app/(tabs)/nutrition.tsx` — the no-target invitation in the middle of the calorie ring sat inside
`<View style={styles.heroCentre} pointerEvents="none">`. In React Native `none` excludes the view **and
every child**, so the `Pressable` was inert.

This is the **first thing a brand-new nutrition athlete sees** — no target set, ring at zero, one
invitation to fix it, and it did nothing. **Fix:** `pointerEvents="box-none"`, which passes touches
through the wrapper while leaving children live.

### 2.3 ✅ FIXED (earlier today) — Food Detail double-counted the entry being edited

Re-opening a 300 cal breakfast and changing nothing read *"300 fewer left after this."*

### 2.4 ✅ FIXED (earlier today) — every write on Meal Detail failed silently

A refused delete left the row on screen and said nothing, so the athlete deletes it again.

---

## 3. ⛔ High — not fixed, needs a decision

### 3.1 Meal Plan is a dead button that sells an unbuilt feature

`(tabs)/nutrition.tsx:283`. Two paths, both wrong:

- **Free athlete** → `router.push('/subscription')` — routed to the **paywall** for a feature that does
  not exist. Phase 3 is the planner; nothing behind it today.
- **Premium athlete** → `showToast('Meal plans arrive with the planning phase')` — the exact defect
  class this codebase names by hand ("a button whose only behaviour is a coming-soon toast").

MA6 §4 places the planner in Premium, so the *placement* is settled. Driving a purchase against it today
is the problem, and a Premium subscriber tapping a Premium-tagged button to be told "not yet" is worse.

**Options:** (a) remove the button until Phase 3; (b) keep it, tag it **"Coming in Premium"**, and make
both tiers land on the same honest explainer with no purchase path. **(b) is the recommendation** — it
keeps the PO's "let them see it's Premium" decision without selling air.

### 3.2 A search that fails is indistinguishable from a food that does not exist

`searchFoods` returns `[]` on **any** error — offline, Edge Function down, `0206` 403, USDA rate limit
(the key is `DEMO_KEY`-capable at **30 requests/hour**). The athlete is told:

> *Nothing found for "chicken". Try a simpler word, or Create Food.*

…and sends themselves off to hand-type a food that is in the database. **Fix:** distinguish `error` from
`empty` and say "Couldn't reach the food database — check your connection."

### 3.3 Nutrition has no eating-disorder floor, while Coach Holt does

`domain/coach/medical-routing.ts` has `DISORDERED_EATING`, which matches *"eating only 800 calories"*
and stops the conversation. **That guard exists only in Holt's chat.** The nutrition tab — where the
behaviour actually happens — has none.

What the app will do today, without comment: accept a 1,200 kcal target, accept 600 kcal logged a day
for weeks, and render *"Avg 640 calories / day · 0 of 7 days in range"* in neutral analytics language,
then offer a **deficit** on the Targets screen on top of it.

Manual targets are floored at save (1,500 / 1,200), so the *target* cannot be extreme. **Sustained
logging far below it is completely unmonitored.** Given the PO asked about legal exposure two hours
before this audit, this is the gap I would close first. It does not need a model — a deterministic rule
("logged intake under the floor for N of the last 7 days → one quiet, non-clinical line pointing at
support") is enough and matches how the rest of Forge handles care.

### 3.4 Nutrition is a silo — **zero** doors in from anywhere else in the app

Grepped every `.tsx` outside the nutrition screens for a link to `/nutrition`, `/log-food` or
`/nutrition-details`: **no results.** The 5th tab is the only entrance.

Nothing connects:
- Finishing a workout → no prompt to log the meal after it.
- **Progress Hub's Body section owns the weigh-in — and a recommended target is built from bodyweight.**
  Logging a weight is the single event that most invalidates a target, and it does not mention Targets.
  (Targets now shows a review banner, but only if you go there.)
- Coach Holt is **nutrition-blind** — no reference to calories or macros anywhere in `domain/coach/`.
- The weekly review says nothing about food.
- Legacy / chapters never reference nutrition, though the architecture names a Chapter-goal link (Phase 2).

This is the single biggest reason the feature would under-perform against competitors even when it is
open. A food diary lives or dies on daily re-entry, and Forge currently provides one door and no reminders.

---

## 4. ⚠ Medium — real gaps against the architecture's own list

Architecture §3 names nine **"required basics."** Scored honestly:

| # | Required basic | State |
|---|---|---|
| 1 | Quick Add (calories/macros, no food) | ✅ built |
| 2 | copy yesterday / copy a meal | ✅ built |
| 3 | edit and delete an entry | ✅ built |
| 4 | log to another day | ◐ only by navigating the day strip first; Log Food has no day picker |
| 5 | food units (g/oz, ml/fl oz) | ◐ g/ml/oz/cup/tbsp/piece on Create Food; **no fl oz** anywhere |
| 6 | **"this looks wrong" on any food** | ❌ **not built** — no report path exists |
| 7 | visible source badge (USDA · Label · Community · Yours) | ◐ text line on Food Detail only; **search rows show no source at all** |
| 8 | **export covering nutrition** | ❌ **not built** — `export-core.ts` is workouts only |
| 9 | account deletion covering nutrition | ✅ by `on delete cascade` on all seven tables (0205) |

**Two hard misses (6, 8) and three partials.** #8 matters beyond tidiness: P-6 governs data rights and
the Privacy Policy nutrition section is already owed before Phase 1 ships.

### Other medium findings

- **No way to delete a custom food or a saved meal.** `user_foods` and `saved_meals` have no delete path
  in `nutrition-live.ts`. My Foods and My Meals are append-only junk drawers. A typo'd food is permanent.
- **Nutrition ignores the athlete's unit preference.** `useUnits()` is read on Targets and used *only* to
  pass to `LogWeightSheet`. Every string the screen renders is imperial — *"196 lb from your latest
  weigh-in"*, *"1.9 lb for you"*, *"1.0 lb / week"*. A kg athlete is shown pounds throughout. The `lb`
  literals live in `domain/nutrition/targets.ts` (`paceLabel`, `heldLine`, `methodRows`, `weightDrift`).
- **`setFavorite` swallows every error.** No `error` check at all; the star toggles optimistically and a
  failure is invisible.
- **`logNow` and `logSavedMeal` in Log Food have no error handling**, unlike Meal Detail's writes, which
  were fixed today. Same silent-failure class.
- **Logging a saved meal doesn't refresh the lists** (`setReloads` is missing where `logNow` has it).
- **USDA `DEMO_KEY` is 30 requests/hour.** `food-search` warns about it in a comment. If `FDC_API_KEY` is
  not set in production, search dies after 30 lookups an hour **across all testers** and presents as
  finding 3.2 — "nothing found".
- **Accessibility is thin.** 2–5 `accessibilityLabel`s per screen. The **calorie ring and all three macro
  rings on Home carry none** — a screen-reader user gets loose text nodes with no relationship and no
  sense that a ring exists. The week chart's bars are labelled (added this week); the rings are not.

---

## 5. Smaller things worth knowing

- **Nested `Pressable` on Log Food rows** — the "+" sits inside the row's own `Pressable`. Needs a device
  check that a "+" tap does not *also* navigate. Not verified; web and native differ here.
- **Search has no pagination** and no "load more"; you get one page and a `looksSane` filter on top.
- **No empty-state education anywhere.** A new athlete lands on a zeroed ring and four dashed rows. No
  first-run, no "here's how this works", no sample day.
- **Editing a food created in cups reopens in grams.** Honest (the stored weight is what is true) but it
  will read as the app forgetting.
- **Barcode is typed, not scanned** — correct for build 8, but a typed 13-digit barcode is a strange ask.
- **No streak, no habit reinforcement, no reminder** — nothing brings anyone back tomorrow.

---

## 6. What works genuinely well

These are not consolation prizes; they are places Forge is **better** than the category leaders.

1. **The honesty rules are real and enforced in code, not copy.** Under-18 refusal, the 1,500/1,200
   floors, the 1%-a-week cap, "a held target is never silent", "an unknown nutrient is absent, not zero",
   "an unlogged day is not a zero", "today is excluded from the average". Each is tested. **MyFitnessPal
   does none of this** — it will happily recommend 1,200 kcal to almost anyone and average a half-logged
   day into your week.
2. **"How we calculated this."** Seven rows tracing resting burn → activity → maintenance → deficit →
   each macro, naming the equation. No mainstream tracker shows its working. This is a genuine
   differentiator and it suits the brand.
3. **Targets are history, never overwritten**, and the history is *visible* on the screen. Last week stays
   judged by last week's target. MacroFactor is the only competitor that takes this seriously.
4. **The micronutrient coverage rule.** Refusing to sum fibre when only two of five foods report it is
   more rigorous than anything in the category.
5. **The diary is properly editable** — swipe to delete, hold to move, copy a meal to another day, save a
   plate as "Usual Breakfast". That is table stakes, and it is complete.
6. **Offline-safe writes.** Client-minted uuids mean a retry in a kitchen with bad signal cannot double-log.
7. **The visual work is well above category.** The ring, the week chart and the target card read as one
   designed product rather than a spreadsheet.

---

## 7. How it would rate against the competition

Scored on what a real user meets, assuming the tab were open and **with §2's fixes in**.

| | Forge | MyFitnessPal | Lose It | Cronometer | MacroFactor |
|---|---|---|---|---|---|
| Food database size | **4** | 9 | 8 | 7 | 8 |
| Speed to log a repeat meal | **7** | 7 | 8 | 6 | 8 |
| Barcode | **1** (build 9) | 9 | 9 | 8 | 8 |
| Editing / correcting | **8** | 7 | 7 | 7 | 8 |
| Target setting | **8** | 5 | 6 | 7 | **9** |
| Honesty / transparency | **9** | 3 | 4 | 7 | 8 |
| Analytics depth | **5** | 6 | 6 | **9** | 8 |
| Habit / retention loop | **2** | 8 | **9** | 5 | 7 |
| Integration with training | **1** | 5 | 4 | 5 | 6 |
| Visual craft | **8** | 5 | 7 | 4 | 7 |
| **Overall as a daily driver** | **5.5** | 7.5 | 7.5 | 7 | **8** |

**Read of that table:** Forge is already best-in-class on *judgement* and near-worst on *habit*. It is a
beautifully principled diary that nothing reminds you to open, with one door and no barcode. The two
lowest scores — retention loop and training integration — are also the two that Forge is uniquely
positioned to win, because no competitor has the workout data sitting in the same app.

**Nobody switches trackers for honesty. They switch for speed and for the thing their current app cannot
do.** Forge's "thing" is training × nutrition, and none of it is wired (§3.4).

---

## 8. What still needs designing and building

### Needs a design before it can be built
1. **Nutrition first-run / empty state** — the single highest-leverage missing screen. Nothing explains
   the tab, and the first impression is a zeroed ring.
2. **"This looks wrong"** report sheet — architecture §3, unbuilt.
3. **My Foods / My Meals management** — a list with delete and edit. Currently append-only.
4. **The training × nutrition surface** — post-workout logging prompt, and whatever Home shows about food.
   This is the retention answer and it does not exist in any `.dc`.
5. **A care line for sustained under-eating** (§3.3). Needs the PO's words, not mine.

### Buildable now, no design needed
6. Export covering nutrition (§4 #8).
7. Delete paths for custom foods and saved meals.
8. Unit-aware display (kg/lb) across nutrition.
9. Search error vs empty (§3.2).
10. Error handling on `logNow` / `logSavedMeal` / `setFavorite`.
11. Source badges in search rows.
12. Accessibility labels on the rings.

### Blocked
13. **Barcode scanning** and **scan-a-label** — both need build 9 (`expo-camera` is native).
14. Phase 2's training-day targets and weekly adjust; Phase 3's recipes/planner/grocery; Phase 4's photo
    logging and Holt nutrition — all sequenced in the architecture and not started.

### Operational, not code
15. **Confirm `FDC_API_KEY` is set in production.** If it is not, search is capped at 30/hour globally.
16. **Open `0206` to more testers** — nothing in this document can be validated until real people use it.

---

## 9. Persona axes walked

Not 1,000 individuals — the 1,000 collapse into these axes, and every combination was checked against
the code rather than imagined.

| Axis | Values walked |
|---|---|
| Access | on the `0206` allowlist · not on it · entitlement still loading |
| Tier | Free · Premium · Premium AI |
| Age | under 18 · 18 exactly · adult |
| Sex on profile | male · female · **`unspecified` (the schema default)** |
| Body data | no weigh-in ever · one weigh-in · weight moved since the target |
| Targets | none · manual · recommended · changed mid-week |
| Units | lb · kg |
| Timezone | UTC · **west of UTC in the evening** · crossing midnight mid-session |
| Diary state | empty · one meal · a full week · a week with gaps · today half-logged |
| Food source | USDA · Open Food Facts · FatSecret (dormant) · own food · Quick Add |
| Network | online · offline · Edge Function 403 · USDA rate-limited |
| Input | touch · screen reader · large text |
| Platform | web preview · build 8 iOS · build 8 Android |

The combinations that produced findings are named inline above. The ones that produced the most were
**`unspecified` sex** (schema default, and the equation has no neutral term — handled), **west of UTC in
the evening** (§2.1), and **no target yet** (§2.2).

---

## 10. Recommended order

1. **Ship §2's two fixes.** They are done and green; they need a deploy. *(The timezone one is live-wrong
   on the PO's phone right now.)*
2. **§3.1 Meal Plan** — decide (a) or (b). It is currently selling an unbuilt feature.
3. **§3.3 the care line** — smallest safety-relevant gap, and the PO is already thinking about exposure.
4. **§3.2 search error copy** and the §4 silent-failure cluster — an afternoon, all of it.
5. **Open `0206` wider.** Everything after this point should be driven by what testers actually do, not
   by this document.
6. **Design the first-run and the training × nutrition surface** — the two that decide whether anyone
   comes back tomorrow.
7. Build 9 for barcode + label scan.

---

*Prepared 2026-09-23. Findings §2.1–§2.4 fixed and green (tsc 0 · 4,113/4,113 · lint clean); everything
else is reported, not changed.*
