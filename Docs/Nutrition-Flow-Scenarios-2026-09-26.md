# Nutrition — Flow Scenarios, 2026-09-26

**Purpose:** find the bottleneck in the nutrition flow. Each scenario is a real person with a real goal, walked
tap-by-tap against **what the app does today** (code read 09-26, not a design). Where it breaks, the break is tagged
with a bottleneck code from §2.

**Goal (PO, 09-26):** easy to add recipes · easy to put meals together · easy to log food · easy to find the
label scan · easy to plan the week.

Legend: ✅ smooth · ⚠ works but slow or hidden · ⛔ can't be done.

---

## 1. Scenarios

### A. Planning the week

**A1 — The planning mom (PO's scenario).** Found 3 recipes online; knows most ingredients for two of them, has a
photo of the full ingredient list for the third. Doesn't know what to make for lunches. Wants a shopping list.
Snacks at the office all day.
- Getting to recipes: Nutrition tab has no Recipes button → Log Food → My Recipes filter → "Edit or add recipes". ⚠ **[DOOR]**
- Recipe from a link: "Paste a recipe" is disabled ("Soon"). She has to retype it. ⛔ **[IMPORT]**
- Recipe she half-knows: Enter manually. Ingredient search covers only a ~106-item starter list plus her own foods, not
  the full food database. "Gochujang" or "Trader Joe's everything seasoning" won't be found → scan its label or type
  it in by hand. ⚠ **[INGREDIENTS]**
- She doesn't know the amount of one ingredient: no "I'll fill this in later" and no saved draft. If she backs out, she
  loses the whole form. ⛔ **[DRAFTS]**
- Recipe from a photo: "Scan a recipe" appears only for Premium AI accounts. On other tiers she types every line. ⚠ **[TIER]**
- Lunches: "Ask Holt for a lunch" is Premium AI only. On Premium without AI, lunch slots stay empty because Forge
  ships no starter recipes (removed 09-24). ⛔ **[EMPTY-BOOK]** **[TIER]**
- Recipe saved but not in the plan: it's planned only if its allergens are "Confirmed" and "Use in my plans" is on.
  Otherwise it is silently left out. ⚠ **[HIDDEN-GATE]**
- Shopping list: Meal Plan → Grocery list. Merges duplicates, scales by household. ✅
- Office snacks: covered in C1.

**A2 — The Sunday batch-cooker.** Makes chicken, rice and broccoli once and wants it for lunch Monday to Friday.
- The plan repeats a meal only when it runs out of recipes, or automatically as leftovers (max 4 a week). There is no
  "repeat this Mon–Fri" action, so she has to "Choose my own" five times. ⚠ **[PLAN-EDIT]**

**A3 — The Thursday planner.** Plans next week on Thursday night so she can shop Friday.
- The plan is the current week only. There is no next week. ⛔ **[PLAN-SCOPE]**

**A4 — "Just give me a week."** A busy dad with no recipes who wants the app to decide.
- Premium AI: "Let Holt fill them" ✅.
- Premium: an empty week that says where recipes come from ⛔ **[EMPTY-BOOK]**.
- Free: the paywall. **[TIER]**

**A5 — The couple with different targets.** She's cutting and he's bulking. They eat the same dinners.
- Household size scales groceries, but everyone gets the same portion. His portion can't be larger in the plan. ⚠
  **[HOUSEHOLD]**
- Only one diary, so he'd need his own account. That's reasonable, but the plan isn't shared between accounts. ⛔

**A6 — The week that changed.** Wednesday dinner turned into takeout.
- Swapping the slot works ✅.
- But grocery checkmarks reset whenever the plan changes, so she loses her progress through the store. ⚠ **[GROCERY]**

**A7 — The late logger.** Ate the planned dinner and logs it the next morning from the plan.
- "Log meal" from the plan always writes to **today**, whatever day it was planned for. Dinner lands on the wrong day. ⛔ **[BUG]**

**A8 — Ate half the planned portion.**
- Plan "Log meal" logs the planned portion, with no adjustment on the way in. She has to log it, then go to Meal Detail
  and edit it. ⚠ **[PLAN-LOG]**

**A9 — The budget shopper.** A student with $60 a week.
- Setup asks for a budget and the plan shows "Estimated $X of your $60". The planner does not *choose* cheaper
  meals to fit it. The budget is a readout, not a steer. ⚠ **[BUDGET]**

**A10 — The meal-prep side dish.** The plan has her chicken recipe; she wants a bagged salad with it.
- Plan slots take recipes only. A saved meal or a single food can't go into a plan slot. ⛔ **[PLAN-EDIT]**

### B. Adding recipes

**B1 — The TikTok / Instagram recipe.** The most common real source, and it's usually a link or a caption.
- Paste is disabled ("Soon"). Screenshot it and use Scan (Premium AI only), or retype it. ⛔ **[IMPORT]**

**B2 — Grandma's handwritten card.**
- Scan a recipe picks from the photo library only. She has to take the photo in the Camera app first, then come
  back. ⚠ On any tier other than Premium AI, she types it all. **[TIER]**

**B3 — The cookbook page with 14 ingredients.**
- Scan reads it; unmatched lines go to a "Not matched" list where she picks, searches or drops each one. That's honest,
  but with a ~106-item ingredient list many lines will be unmatched. ⚠ **[INGREDIENTS]**

**B4 — "Salt to taste, a splash of milk."**
- Every own-food ingredient needs a gram weight or it's rejected. Vague amounts have no path except guessing grams. ⚠
  **[INGREDIENTS]**

**B5 — Interrupted halfway.** Kid needs something; she backs out.
- The form is gone. No draft is saved. ⛔ **[DRAFTS]**

**B6 — The tweak.** Her version uses Greek yogurt instead of sour cream.
- Edit the recipe → replace the ingredient ✅ (for her own recipes; not verified for Holt-made ones).

**B7 — A recipe from Holt's chat.**
- "See the recipe" opens a draft ✅. This is the smoothest recipe entry in the app today.

### C. Logging food

**C1 — Office snacks (A1's mom).** A donut at 10, almonds at 2, a coffee with creamer at 3.
- Log Food → search → "+" logs a default serving in one tap ✅. Recent → "+" repeats the last portion ✅.
- If the slot defaults to the wrong one she must change "Adding to ___" first. ⚠
- "Handful of almonds" has to be translated into grams or ounces. ⚠

**C2 — Forgot yesterday.**
- Log Food has no day picker. She has to go back to the tab, move the day strip, then log. ⚠ **[DAY]**

**C3 — Same day as yesterday.** A shift worker who eats the same thing every workday.
- Copy yesterday is per meal slot, so it takes four copies. There's no whole-day copy. ⚠ **[COPY]**

**C4 — Same breakfast every day.**
- Save as meal (Meal Detail) → My Meals filter → one tap logs it ✅.
- Creating a meal from scratch is a small footer link ("Create Meal") on Log Food. ⚠ **[DOOR]**

**C5 — Chipotle bowl.**
- FatSecret search covers chain restaurants ✅.
- A local taco truck needs Quick Add, which is a small footer link. ⚠ **[DOOR]**

**C6 — A glass of wine / two beers.**
- Normal search ✅. No special handling (fine for now).

**C7 — Dinner she cooked from a recipe, family of 4, she had 1½ servings.**
- Log Food → My Recipes → the Eaten sheet with ½-step portions ✅. This is good.

**C8 — The plate photo.** Snaps lunch at a work event.
- Meal photo is on Log Food, Premium AI only ✅ for that tier. Unmatched rows aren't logged. That's honest, but she
  has to notice them. ⚠

**C9 — The buffet plate.** Six small things.
- Search and add each one. There's no multi-select, and the screen reopens after each add? *(not verified)* ⚠

### D. Scanning

**D1 — "Where do I scan the nutrition facts?"** (the PO's own question)
- The tab's **Scan** button is the **barcode** scanner, not the label reader. The label scan lives in Log Food →
  Create Food → Scan label (3+ taps, behind a button that says "Create"). ⛔ **[DOOR]** **[FOUR-CAMERAS]**

**D2 — Barcode not in the database.**
- Barcode miss → Create Food with the barcode filled → Scan label ✅. This is the best path in the app; it just isn't
  findable on its own.

**D3 — Four cameras, four doors.** Barcode (tab + Log Food), label (inside Create Food), plate photo (Log Food icon,
AI only), recipe photo (My Recipes sheet, AI only). A user can't form one idea of "point the camera at food." ⚠
**[FOUR-CAMERAS]**

**D4 — On the web preview.** No camera paths at all. Label scan and barcode are absent. (Expected, but the PO tests on
web.)

### E. Shopping

**E1 — Splitting the shop with a spouse.**
- Share as text ✅. Her spouse can't check items off, so there's no shared list. ⚠ **[GROCERY]**

**E2 — Dinner party, one-off recipe.** Wants a list for one recipe that isn't in the plan.
- The grocery list comes only from the plan. ⛔ **[GROCERY]**

**E3 — Pantry.** Already has rice, oil and spices.
- Staples are pre-marked "have", and swipe marks "Have it" ✅.

### F. Tier and access

**F1 — Free user who wants to plan.** Meal Plan → paywall. That's fine if intended, but everything in A is invisible
to them. **[TIER]**

**F2 — Premium ($14.99) without AI.** Can plan, but can't scan a recipe, can't get lunch ideas, and starts with an empty
book. Pays for a planner that has nothing to plan. ⛔ **[EMPTY-BOOK]** **[TIER]**

**F3 — 16-year-old athlete.** Meal plan is blocked (under 18). Correct by policy; make sure the message is kind.

**F4 — Not on the 0206 allowlist.** The whole tab says "Not open yet." That's every tester except PO + claudetest.

---

## 2. Bottleneck tally

Ranked by how many scenarios hit it and how hard.

| # | Code | Bottleneck | Hits | Severity |
|---|---|---|---|---|
| 1 | **IMPORT / INGREDIENTS / DRAFTS** | **Getting a recipe in is the hardest thing in the tab.** No link/text paste; ingredient search is a ~106-item list, not the food database; no drafts; vague amounts rejected. | A1 B1 B3 B4 B5 | ⛔ |
| 2 | **EMPTY-BOOK + TIER** | **The planner has nothing to plan** unless you're Premium AI. No starter recipes since 09-24; lunch help and recipe scan are AI-only. | A1 A4 F2 | ⛔ |
| 3 | **DOOR / FOUR-CAMERAS** | **The tab has three buttons (Log, Scan=barcode, Plan).** Recipes, label scan, Create Meal, Quick Add and the grocery list are all 3–4 taps deep or footer links. Four camera features sit behind four different doors. | A1 C4 C5 D1 D3 | ⚠→⛔ |
| 4 | **PLAN-SCOPE / PLAN-EDIT** | Current week only; no "repeat Mon–Fri"; only recipes can go into slots. | A2 A3 A10 | ⛔ |
| 5 | **BUG / PLAN-LOG** | Logging from the plan writes to today and can't change the portion. | A7 A8 | ⛔ bug |
| 6 | **GROCERY** | Checkmarks reset on plan change; no one-recipe list; no shared list. | A6 E1 E2 | ⚠ |
| 7 | **DAY / COPY** | No day picker in Log Food; no whole-day copy. | C2 C3 | ⚠ |
| 8 | Smaller | Budget is a readout, not a steer (A9). One portion for the whole household (A5). Hidden allergen-confirm gate (A1). | — | ⚠ |

**The single bottleneck:** recipes. The plan, the grocery list and "help me with lunches" all depend on having
recipes, and adding one is the slowest, most gated step. Every planning scenario stalls at the same place: *"now type
in your recipe."*

---

## 3. What "easy" would look like (for discussion, not decided)

1. **One "Add" button on the tab** that opens a single sheet: *Log food · Scan a label · Scan a barcode · Snap a
   plate · Add a recipe · Plan my week.* Fixes DOOR and FOUR-CAMERAS in one move.
2. **Recipe in, three ways, all tiers where possible:** paste a link or text · photo (camera *and* library) · type it.
   Ingredient search uses the full food database, not the 106-item list. Autosave a draft. Allow "amount unknown —
   fill later."
3. **A starter book again**, or Holt lunch ideas on Premium, so the planner never opens empty. (The 40 removed recipes
   are waiting in `Starter-Recipes-Review.md` for your ✅/❌.)
4. **Plan editing:** next week, "repeat this across days", and put any saved meal or food in a slot.
5. **Plan → log:** log to the planned day, with a portion step on the way in.
6. **Grocery:** keep checkmarks across plan edits; "shop for this recipe"; shared list later (two-device rule applies).

---

*Prepared 2026-09-26 from a code read of `src/app/(tabs)/nutrition.tsx`, `log-food.tsx`, `my-recipes.tsx`,
`create-food.tsx`, `scan-label.tsx`, `meal-photo.tsx`, `meal-plan.tsx`, `grocery-list.tsx`, `data/nutrition-live.ts`,
`domain/nutrition/meal-planner.ts`. Nothing changed in code. C9 and B6 (Holt recipes) are marked unverified.*
