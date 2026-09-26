# Holt in Kitchen Mode: the Nutrition face of Coach Holt. Direction v1.0

**Status:** 🔒 LOCKED 2026-09-25. PO: *"same holt in kitchen mode"*, then *"I agree with you"* to all four §6 decisions,
with two changes: recipe **links are in** (Q2) and the kitchen look is **Holt wearing a chef's hat** (Q4). §7 step 2 built.
**Product:** Premium AI (`coach_ai`), metered through `coach_ai_spend_credits`. Inside the Nutrition preview
allowlist (0206) until App Store approval.
**Part of:** `Coach-Holt-Everywhere-v1.0.md` (one chat, one action catalogue, the five rules).
**Reads with:** `Holt-Kitchen-Scope-v1.0.md` (What can I make?, LOCKED) · `Nutrition-Architecture-v1.0` NUT-D4
(the model never writes a number), NUT-D5 (floors, nothing recommended under 18), NUT-D6 (allergens), §7
(Targets) · Nutrition Amendments 001 (facts not verdicts), 002 (meal plans, LOCKED), 003 (training link) ·
`domain/coach/medical-routing.ts` · Decision Queue #36 (Holt's four safety fixes).

PO: *"I want there to still be access to coach holt on the nutrition page, but instead I want him to be chef
holt … hand him recipes to save into the meals, tell him what ingredients you have so he can make you a meal,
tell him what your lifestyle is like and what the goal is and he can come up with macros for you. Everything
that we can legally do that a nutrition coach can do."*

---

## 1. What "Kitchen Mode" means

**Same Holt, same chat, same memory.** Not a second character and not a second chatbot.

- **The same conversation and the same `holt_notes`.** He already knows the athlete's training, so a
  question like *"what should I eat before tomorrow's leg day?"* uses both sides with no extra setup.
- **Opened from Nutrition,** Holt's chat opens in Kitchen Mode. It has a kitchen header ("Holt · Kitchen"),
  and the starter chips are kitchen ones: **What can I make? · Save a recipe · Set my macros · Plan my week**.
  Opened from anywhere else, it's the normal chat. Asking a food question there still works.
- **The voice stays his.** It's the same register and rules (`rulebook/`, Holt-Voice-Amendment-001), with
  kitchen words: a coach who cooks, not a TV chef.
- **His mark wears a chef's hat** in Kitchen Mode (PO, §6 Q4): `coach-holt-kitchen.png` (Forge) and
  `coach-holt-kitchen-paper.png` (Alabaster, **the same dark coin**, because the PO's sheet calls the flat light
  version "too flat and loses identity"). Cut from the **PO's approved mockup** (2026-09-25: ivory toque, jaw
  line, narrower torso, smaller chat bubble) by `scripts/artwork/holt-chef-hat.py`, which also removes the sheet's
  annotation lines. It reads at 52 px and 36 px. `HoltMark` takes a `kitchen` prop. Everywhere else he wears no hat.
- **Name on screen:** *Holt* with a *Kitchen* label. "Chef" is fine in copy. ⛔ **Never "nutritionist" or
  "dietitian"** in copy, store text or marketing, because several US states restrict those titles.

## 2. What Holt does in the kitchen

Every item follows the Everywhere rules: a named action with typed fields, a confirm card before anything
changes, and **every number computed by the app**.

| # | You say | Holt does | Status |
|---|---|---|---|
| K1 | "I have chicken, rice, spinach" / nothing (reads the grocery list) | 3 varied options → Log it / Save | ✅ scoped, LOCKED (`Holt-Kitchen-Scope`) |
| K2 | pastes a recipe, a **link**, a screenshot, or a photo of a cookbook page or recipe card | turns it into ingredients + steps, which are matched to USDA and saved to **My Recipes** (`source = 'import'`), confirm first | **new** |
| K3 | "make this dairy-free / higher protein / for 4 / under 20 min" | rewrites a saved recipe; numbers recomputed; saved as a copy | new (Everywhere §2 "Recipes") |
| K4 | "I sit at a desk, lift 4 days, want to lose 10 lb by spring" | **the macro interview**: asks what the Targets screen needs, fills its inputs, and shows the app's Mifflin-St Jeor result with the floors applied → **Use these targets** | **new, needs §4** |
| K5 | "why is my target 2,610?" / "lose a bit faster" | explains the maths in plain words; proposes a change inside the floors and the 1%-a-week cap, with a confirm | Everywhere §2 "Targets" |
| K6 | "I have 400 cal and 40 g protein left, snack?" | 2–3 snack ideas that fit what's left (from the diary), same engine as K1 | new, small |
| K7 | "I'm at Chipotle" / "airport, what's decent?" | picks from restaurant data (FatSecret, live) against what's left; **Log it** | new |
| K8 | "what should I eat before tomorrow's long run?" | meal timing and carb ideas tied to the planned session. General sports-nutrition guidance, with no numbers of his own | NUT-A3-D3 extends |
| K9 | "Sunday meal prep for the week" | batch-cook plan: what to cook, in what order, how to portion it, plus the grocery list | Amendment 002 planner + a prep view (new) |
| K10 | "$60 this week" / "15-minute lunches" | planner constraints | ✅ NUT-A2-D7 |
| K11 | "cook for my family, my portion hits my macros" | a household-sized recipe with the athlete's own portion computed | new |
| K12 | "use what goes off first" / "I have leftover rice" | K1 ranked by freshness (the Kitchen §1b 7-day rule) and leftovers | K1 extends |
| K13 | "walk me through it" | **Cook mode**: one step per screen, timers, keep-awake, ask mid-cook ("is it done?"). Safe temperatures from USDA FSIS | new |
| K14 | "what's this label mean?" / "which of these two is better for me?" | explains a label or compares two foods from their matched data. Facts, no verdict on the athlete | new, small |
| K15 | Sunday: "how did my week go?" | **weekly check-in**: facts from the diary + weigh-in trend + training (NUT-A1-D2), then the §7.3 weekly adjust offered as a confirm | NUT-A1 + §7.3 |
| K16 | "help me drink more water / eat more veg" | habit coaching: sets a check-in via the reminders system | Check-ins scope |

**v2 (not now):** a photo of your fridge (Kitchen §7) · "what should I buy to make X" · posting a recipe to your
squad (drafted by Holt, **you** send it, Everywhere rule 4).

## 3. Where he stops (all enforced in code, before the model call)

These are the lines between a general nutrition coach and medical nutrition therapy. Each one goes to the
standard *"talk to a doctor or registered dietitian"* response. No recipe, no target, no credit spent.

| Stop | Already enforced by |
|---|---|
| Any condition: diabetes, kidney, heart, blood pressure, PCOS, IBS, GERD, celiac, "my doctor/dietitian said…" | `medicalRoute` + NUT-A2-D4 |
| Pregnancy, postpartum, breastfeeding | NUT-A2-D4 |
| GLP-1 or any medication; lab results or blood work | NUT-A2-D4 (medication) · **new pattern: labs** |
| Signs of disordered eating, in the conversation or the diary | `DISORDERED_EATING` + the under-eating response (owed before Nutrition opens) |
| Under 18: recipes yes, targets and "fits your target" no | NUT-D5 |
| Below the floor, "as low as possible", crash / detox / cleanse / "cure" | NUT-D5 + **new pattern: cleanse/detox/cure** |
| Supplement, drug or caffeine **amounts** | PO 09-22 legal-caution rule |
| Diagnosing an allergy or intolerance ("am I lactose intolerant?") | **new pattern** |

Plus the standing rules: allergens filtered by the library and never by the model (NUT-D6), and every recipe
and plan carries the "check labels" line. The Terms clause *"targets, meal plans and food data are estimates,
not medical or dietary advice"* (Mock Legal Review 2026-09-25 item 9) must be live before Kitchen Mode opens.

## 4. The macro interview needs one amendment (K4, K5)

**The tension:** NUT-A1-D3 and NUT-A2-D1 say *"Holt does not set calorie or macro targets; that is the Targets
screen's job."* The PO now asks Holt to *"come up with macros for you"*, and Everywhere §2 already lists
*"proposes a change inside the floors"*.

**Proposed resolution (Nutrition Amendment 005, to write on the PO's yes):** Holt becomes **a way to fill in
the Targets screen**, not a second source of targets.

1. Holt asks the questions the Targets screen asks (activity, training days, goal direction, rate, birth
   year, height), in conversation, one or two at a time.
2. His output is **structure only**: the Targets screen's own input fields. No kcal or gram values. Any
   number the model writes is discarded (NUT-A2-D2 pattern).
3. **The app computes the result** with the same code the Targets screen uses (§7.2, with NUT-D5 floors, the
   under-18 gate and the 1%-a-week cap), and shows it on a confirm card that says where every number came from.
   **Use these targets** writes it through the same path as the screen.
4. Holt explains the result in words and names any clamp (*"that rate would go under your floor, so it's
   set to 1% a week"*). He never argues a floor down.

So the athlete gets *"Holt set up my macros"*, and every number is still the Targets code's. The amendment
narrows D3 for this one path and leaves the rest of D3 unchanged (no *"eat 180 g of protein"* in prose, no
supplements).

## 5. How it's built (no new engine)

- **Kitchen Mode is a context flag** on the chat (`mode: 'kitchen'`): header, starter chips, and which
  catalogue actions are offered first. Not a new function.
- **Content functions:** `coach-kitchen` (K1, K3, K6, K11, K12) and a new **`coach-recipe-import`** (K2:
  text or image in → structured recipe out; image ≈ one vision call, ~1–2¢). K7 reuses `food-search`.
- **Everything else is catalogue actions** on `coach-interpret`: `set_targets_inputs` (K4/K5),
  `plan_week` / `swap_meal` (002), `log_food`, `grocery_edit`, `start_cook_mode`, `set_checkin`.
- **Cook mode** (K13) is a screen that reuses the Recipe view, with `expo-keep-awake` and local timers.
  ⚠ Check whether `expo-keep-awake` is already in the build-8 binary. If it isn't, K13 waits for build 9.
- **Links (K2, PO 2026-09-25):** `coach-recipe-import` fetches **only the one page the athlete pasted, only
  when they tap Save**. There is no crawling, no following links and no caching of other people's pages.
  It reads the page's own `schema.org/Recipe` data first (most recipe sites publish it for search engines),
  and falls back to the page text only if that's missing. Ingredients and amounts are kept. The **steps are
  rewritten in Holt's words**, because an ingredient list is a fact but a site's step prose is its writing.
  The saved recipe shows *"From example.com"* with the link, and the numbers are the app's (USDA match),
  never the site's. It gets the CORS block like every Edge Function called from web.
- **Copyright:** every import (text, photo, link) is the athlete's own private copy for personal use. It is
  never shared, never shown to others, never used as Forge content, and never posted to a squad. This
  narrows Kitchen §4 ("nothing is fetched from recipe websites"), which still holds for everything Holt
  writes himself: he never pulls a website to make his own suggestions.

## 6. Decisions (🔒 LOCKED 2026-09-25)

1. **v1 set:** K2 recipe import, K4/K5 macro interview, K6 what fits my remaining macros, K7 eating out,
   K13 cook mode. Then K8, K9, K15. Then the rest.
2. **Recipe links: YES** (PO: *"Website link is good too"*). Handled as described in §5 "Links".
3. **Amendment 005: YES.** `Docs/Amendments/Nutrition-Architecture-Amendment-005-Holt-Sets-Up-Targets.md` 🔒.
4. **Kitchen look:** the "Holt · Kitchen" header, **and Holt's mark wearing a chef's hat** (PO: *"Header and then
   do coach holt with a chef hat"*). Art from the PO's mockup, 2026-09-25 (§1). ⏳ Not yet seen by the PO in the app.

## 7. Order

1. Prerequisites (unchanged): Holt's four safety fixes + the under-eating response + the Terms nutrition clause
2. Kitchen Mode flag + header + chips (routes to what already works) — ✅ **BUILT 2026-09-25**, not deployed: the Holt bubble on `/nutrition` wears the hat (`CoachBubble` `KITCHEN_SURFACE`, no training lines there); the sheet reads IN THE KITCHEN and opens on Kitchen Home (`KITCHEN_CARDS`: What can I make? → composer with coach-ask, or My Recipes without typing · Set my macros → Targets · Plan my week → Meal Plan; rows: Save a recipe → My Recipes · Grocery list). 4,418/4,418 tests, web export clean. Not yet seen rendered.
3. K1 (the locked Kitchen scope, built first) — ✅ **BUILT 2026-09-25**: `coach-kitchen` Edge Function (structured output, no nutrition field; code guard before the credit), `kitchen-dishes.ts` (guard, forced spread, no repeats, USDA safe temps, allergen words), `kitchen-cards.ts` (the app's numbers via `draftFromRead`; an allergen dish is dropped), the dishes card in chat with **Log it** (only when every line matched) and **See the recipe** → My Recipes unsaved (`?draft=1`), More ideas / Quicker / More protein / Different style, 30-day memory in `kitchen_suggestions`. ⏳ Needs the PO to paste `pending-0222.sql` then deploy `deploy-coach-kitchen.ts`; until then the app falls back to coach-ask. Not yet run against the live model
4. K4/K5 after Amendment 005 · K2 recipe import · K6 snacks · K7 eating out
5. K13 cook mode · K8 training fuel · K9 meal prep · K15 weekly check-in
6. K3, K11, K12, K14, K16
2b. ✅ **Stress-test fixes, 2026-09-25** (`Docs/Chef-Holt-Stress-Test-2026-09-25.md`): kitchen routing to `coach-ask`, kitchen guard families, doctor/dietitian stop copy, pantry + "left today" context, door buttons. Routing wrong turns 92% → 1%. `coach-ask` prompt update awaits a PO paste. ⛔ Repetition from a six-recipe book stays until step 3 (`coach-kitchen`).
7. Eval before opening each: the Kitchen eval (zero allergen misses, zero model-written numbers) + a stop-rule
   corpus for every §3 row, with a benign-corpus false-stop count.

## Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-25 | Created. PO chose "same Holt in kitchen mode". K1–K16, stop list, Amendment 005 proposed, 4 decisions open. |
| 1.1 | 2026-09-25 | 🔒 LOCKED. All four decisions taken. Links in (§5), chef's-hat mark struck (§1), Amendment 005 written. |
