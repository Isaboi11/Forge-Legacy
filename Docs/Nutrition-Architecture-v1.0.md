# Forge Legacy — Nutrition Architecture v1.0

**Status:** 🔒 LOCKED for the decisions marked LOCKED (NUT-D1 … NUT-D8). Everything else is the build
architecture, refined phase by phase as each phase proves its assumptions (§12).
**Date:** 2026-09-21
**Decided by:** PO, 2026-09-21, on the Nutrition Architecture & Feasibility Review
(claude.ai artifact `5gyBi82ksty2ayLgujyvSr`). PO answers, verbatim: *"I agree."* · tab *"goes to the
farthest right"* · out-of-scope lines: *"remove"* · grocery: *"just estimates for now"* · safety policy:
*"Okay"* · FatSecret: *"Okay"* · Free-user surfacing: *"V1 will be simple enough and then we keep
building on top."*
**Satisfies:** `Monetization-Architecture-Amendment-006` §6 checklist row 7 (*"Nutrition architecture
(unwritten) — must place every feature per §4 and the split rule in §1"*).
**Amends:** `Community-Architecture-Amendment-002-Fifth-Tab.md` Decision 1 (the 5th slot — NUT-D1) ·
`Forge-Legacy-Master-PRD.md` + `FORGE_LEGACY_PRD.md` §3 "not for" · `Calendar-System-Architecture-v1.0.md`
Non-Behaviors · `Forge-Design-Blueprint-v1.0.md` "not for" · `Marketing/Landing-Page-Design-Brief.md` FAQ
(NUT-D2) · `Monetization-Architecture-Amendment-006` §4 grocery note (NUT-D3).
**Privacy:** `Amendments/P-6-Amendment-002-Nutrition-Data.md` (2026-09-21).
**Still owed (not amended here):** a Coach-AI amendment for Holt's
nutrition scope (`Coach-Chat-Design-Brief-v1.0` §201 lists nutrition as an "I don't know" topic;
`Coach-AI-Amendment-001` §173 "does not prescribe diets") — both before Phase 4 (§12).

> **The one-line thesis.** Nutrition is built the Forge way: a small deterministic engine owns every
> number, a Forge-authored library is the product (recipes, as the rulebook is for Holt), and the model
> sits at the edges, metered. **The model never writes a number the athlete sees.**

---

## 1. Locked decisions

| ID | Decision |
|---|---|
| **NUT-D1** | **Nutrition is the 5th bottom-navigation tab, farthest right:** Home · Workouts · Legacy · Squads · **Nutrition**. Legacy keeps the emphasised centre tile. This takes the slot `Community-Architecture-Amendment-002` Decision 1 reserved for Communities (shelved; `src/deferred/community.tsx`). **Communities has no tab.** If it is re-enabled, where it lives is a new decision — a sixth tab is not assumed. |
| **NUT-D2** | **Forge does nutrition.** Every "not a nutrition tracker / no meal planning / isn't going to" line is retired (banners applied 2026-09-21, see §13). |
| **NUT-D3** | **Grocery V1 is estimates only.** No retailer API, no live prices, no cart handoff. Prices are estimated from USDA ERS food-at-home price data and always labelled as estimates. The athlete may name a preferred store; it is a label on the list, not a price source. MA6 §4's Kroger + Instacart note becomes the *later* path (§9.3), not Phase 1. |
| **NUT-D4** | **Numbers are deterministic.** Targets, totals, plan fitting, grocery quantities and cost estimates are pure domain code. A model may parse language into a constraint patch and write an explanation; any number it emits is discarded. |
| **NUT-D5** | **The safety floor is code, not prompt** (§10): no recommended target below 1,500 kcal (male) / 1,200 kcal (female), no recommended deficit steeper than ~1% of bodyweight per week, and **no recommended targets for anyone under 18** (manual targets only, with the same floors). The athlete always owns their targets; Forge never silently changes one. |
| **NUT-D6** | **Allergens are hard constraints**, and only Forge-tagged recipes can guarantee them. Generated plans draw **only** from the Forge recipe library (and the athlete's own recipes, which they tag). Unknown allergen status counts as excluded. |
| **NUT-D7** | **Nutrition is private by schema.** Owner-only RLS on every nutrition table, no visibility setting to get wrong, meal photos in a **new private bucket** (never the public photo buckets). Nothing reaches a squad unless the athlete posts it, and a post never carries calories, weight, targets or adherence. |
| **NUT-D8** | **V1 does not upsell.** Free athletes simply don't see Premium nutrition surfaces (Meal Plan, Grocery List) on Nutrition Home — no locked tiles, no new paywall moment. MA6-D9's two paywall moments stand. How Free athletes discover planning is decided later, from use. |
| **NUT-D9** | **Phase 1 ships behind a PREVIEW ALLOWLIST** *(added 2026-09-22, PO: “it's not done yet so I don't want people using it. Me and the claudetest account.”)*. Migration `0206` adds `nutrition_preview` — an allowlist table with RLS on and **zero policies**, same posture as `app_admins` — and `has_nutrition_access()` is consulted by **all 17** nutrition RLS policies and by the `food-search` Edge Function (403). The tab is hidden for everyone else and `/nutrition` shows a closed door. ⚠ **Deliberately NOT an `athlete_entitlement` column and NOT `app_admins`**: `coach_ai` has a self-serve setter (0203 §4) which is the opposite of what was asked, and “may preview an unfinished feature” is not “may read every athlete's metrics”. There is no self-serve grant — the roster is written by hand in the SQL editor. Seeded: `isaiahaltamirano@gmail.com`, `claudetest@test.com`. **Lift the gate (not the table) when Nutrition ships publicly.** |

---

## 2. Plan placement (restates MA6 §4 — MA6 governs)

| Feature | Free | Premium | Premium AI |
|---|---|---|---|
| Food logging, search, barcode, Quick Add, recents/favourites, custom foods, saved meals | ✓ | ✓ | ✓ |
| Calorie + macro targets | **Fixed** — one target, manual or recommended once | **Follow the training day** | same |
| Weekly adjust suggestion (§7.3) | — | ✓ | ✓ |
| Recipes · rules-based meal planner · swaps | — | ✓ | + AI-built / language-edited plans |
| Grocery list + estimated budget | — | ✓ | + pantry-aware |
| Holt AI nutrition questions | — | — | ✓ (credits) |
| Log a meal from a photo | — | — | ✓ (credits) |

**"Fixed" is defined here:** a Free target does not vary by training day. It may still be a Forge
recommendation. **MA6-D8 holds:** barcode is free because the barcode path is free data (§4).

---

## 3. Product scope rules

- **Judgement test:** can a normal Forge athlete manage their nutrition without another app? Not
  "do we match MyFitnessPal".
- **Ask at the moment of need.** Logging asks nothing. Recommended targets ask birth year, height,
  activity (sex and weight Forge already has, §8). The first Meal Plan asks diet, allergies, dislikes,
  time cap, household. The first Grocery List asks store and budget. Kitchen defaults to "a standard
  kitchen", editable.
- **Plans are batch-cook by default**: ~2 breakfasts, 1–2 lunches cooked once, 4–5 dinners with
  leftovers. Not seven unique days.
- **Budget copy is always an estimate:** "≈ $112 at average US prices" — never "fits $125 at Walmart".
- **Required basics** the master plan did not name: Quick Add (calories/macros, no food), copy yesterday /
  copy a meal, edit and delete an entry, log to another day, food units (g/oz, ml/fl oz), "this looks
  wrong" on any food, a visible source badge (USDA · Label · Community · Yours), export and account
  deletion covering nutrition.
- **Nutrition Home:** "Today" + See Details → · calorie ring (consumed and **remaining**) · three macro
  indicators (rings or bars — the `.dc` decides) · **+ LOG FOOD** · quick actions · Today's Meals.
  Barcode lives **inside** the Log Food search field. Over target never turns the screen red.
- **Imagery:** typographic category marks for logged foods in V1; photos only for Forge's own recipes and
  (credited) Open Food Facts packaged goods.

---

## 4. Food data

| Role | Source | Why | Rules |
|---|---|---|---|
| **Primary** (generic + branded + barcode) | **USDA FoodData Central**, bulk dump copied into Postgres | CC0 public domain — a log entry may keep its own numbers forever | Refresh quarterly. Keep ~25 nutrients. Never proxy the live API (1,000 req/hr). |
| **Barcode fallback** | **Open Food Facts**, looked up live from the device | Large coverage, product photos | **ODbL share-alike** — separate table, never merged; badge "Community data"; CC-BY-SA credit on images. 15 reads/min per IP, so device-side only. |
| **Restaurants / branded misses** | **FatSecret Premier Free**, via an Edge Function | $0, unlimited, restaurants | ✅ **FatSecret confirmed in writing (2026-09-22, `Docs/Legal/FatSecret-Storage-Permission-2026-09-22.md`) that a diary entry may keep its calories and macros permanently.** Micronutrients were not named — re-read those by `food_id`. Everything *else* from FatSecret (search results, food detail) still follows the 24h rule: cache IDs, not data. Attribution "Powered by fatsecret". Free only under US$1M revenue — a cliff at roughly 40k MAU. **FatSecret is in Phase 1** (restaurants + branded misses). |
| **Upgrade path** | Chomp Premium (~$300/mo + $0.001/MAU, indefinite storage) · Edamam | If FatSecret is refused or the cliff arrives | Evaluate then, not now. |
| **Not chosen** | Spoonacular (1-hour cache), Nutritionix (~$1,850/mo, no free tier) | Cost and caching terms | — |

**Every stored number records its source and licence**, so a vendor can be removed without breaking a
single athlete's history. All external sources sit behind one `FoodSource` interface.

---

## 5. Architecture

- **Backend:** Supabase only. Pure logic in `src/domain/nutrition/**` (relative `.ts` imports, `node --test`);
  I/O in `src/data/nutrition-*-live.ts`. External APIs only through Edge Functions.
- **Search:** local-first — own foods and recents → popular generics → branded → external. `pg_trgm` +
  full-text with Forge ranking; debounced; never a paid call per keystroke.
- **State:** the current day's log lives in one provider (as `useWorkoutSession` is global) with
  **optimistic writes** — the ring moves on tap.
- **Offline:** every log entry has a **client-generated UUID primary key** from day one, so a replay is
  an upsert. (The workout pending-save queue has no idempotency key; do not repeat that.)
- **Barcode:** `expo-camera` is a native module → **a new binary**; it cannot ship over the air to the
  current build. The web preview needs manual UPC entry. Verify web scanning against the SDK 56 docs.
- **AI:** one meter. New `coach_ai_config` weights (`nutrition_ask`, `meal_photo`, `plan_ai`) through
  `coach_ai_spend_credits` (0203 gate). Haiku 4.5 for simple asks, Sonnet 5 for plan patches and photos
  (CA-D7). No model call outside the meter, ever.
- **Analytics:** `app_events` + `track()` through the props allowlist. Event types only — no food names.

### 5.1 Schema shape (not a migration)

| Table | Holds | Note |
|---|---|---|
| `food_catalog` | FDC copy: foods, GTIN, portions, kept nutrients | ~1 GB with indexes |
| `food_catalog_off` | Open Food Facts records looked up | ODbL, separate by rule |
| `user_foods` | custom foods / label entries | owner-only |
| `food_log_entries` | uuid, day, meal slot, source + source id, quantity, serving, kcal/P/C/F, micros jsonb | **nutrient snapshot** so history never moves |
| `saved_meals` + items | "Usual Breakfast" | logs N entries in one RPC |
| `nutrition_targets` | kcal/macros, method, training-day variant, `effective_from` | history rows — never overwritten |
| `nutrition_prefs` | diet, allergen ids, dislikes, kitchen ids, time cap, household, budget, store | `home_gym_equipment` pattern: ids not labels, `null` ≠ `{}` |
| `recipes` + ingredients | Forge library + user recipes | allergen/diet/equipment/time/aisle tags |
| `meal_plans` + slots | week → day → slot → recipe × servings, locked flag | a swap re-solves one slot |
| grocery list | **derived, not stored** + `grocery_checks` | the notification-feed idiom (0054) |

---

## 6. Meal-plan pipeline

| Step | Owner | What |
|---|---|---|
| 1 · Hard filter | deterministic | allergens (unknown = excluded), diet, refused foods, owned equipment, time cap. Nothing downstream can re-admit a filtered recipe. |
| 2 · Score | deterministic | favourites, soft dislikes, variety, estimated cost, ingredient overlap |
| 3 · Solve | deterministic | recipes + portion multipliers (0.5 steps) per slot: each day ±5% kcal, protein ≥ target −5%, week's estimate ≤ budget; batch cooking modelled. Greedy + local search, on device, milliseconds. |
| 4 · Validate | deterministic | recompute every total from ingredients; say plainly when a day can't fit ("Tuesday is 140 kcal short — add a snack?") |
| 5 · Swap / regenerate | deterministic | re-solve a slot or day with the rest locked |
| 6 · Grocery | deterministic | Σ ingredients × servings × household → purchase units (package-size table) → aisles |
| 7 · Language | model, Premium AI | parse "no fish, quicker lunches" / "I have chicken, eggs and rice" into a constraint patch → re-run 1–6; write the one-line explanation |

Steps 1–6 are the Premium planner ($0 per use). Step 7 is MA6's "AI-built plans" and "pantry-aware".
**The recipe library (150–250 tagged recipes to start) is the long pole** — content work on the scale of
the program catalogue.

---

## 7. Targets

7.1 **Manual:** kcal + P/C/F, with the §10 floors.
7.2 **Recommended:** Mifflin-St Jeor from sex, weight (`body_entries`), height, birth year, activity;
adjusted for the Chapter goal's direction and a chosen rate, clamped by NUT-D5. Always shown as a
recommendation, always editable.
7.3 **Weekly adjust (Premium):** estimate actual expenditure from logged intake against the weigh-in trend,
propose a new target, the athlete accepts or ignores. Never applied silently.
7.4 **Training-day targets (Premium):** training and rest variants, keyed off the day's planned/logged
session.

---

## 8. Reuse — no parallel systems

| Existing | Nutrition uses it for |
|---|---|
| Goals: `metric_kind = body_weight`, `syncBodyGoals()`, one primary per Chapter | the goal — read, never re-asked; no nutrition goal type |
| `body_entries`, `LogWeightSheet`, body-metrics toggle (off by default) | weight and trend; Nutrition setup offers to turn body metrics on |
| `profiles.sex` (onboarding) | recommended targets. **Birth year, height, activity are new columns, asked in Nutrition setup — never in onboarding** (Onboarding-007 is held) |
| `useUnits` (lb canonical), `app_prefs` | food units; grams canonical |
| home-gym equipment pattern | kitchen equipment |
| `squad_posts` types (0192), share cards | new meal / recipe post types (Phase 4) |
| Honor catalogue (rows) | nutrition honours reward consistent logging or cooking — **never a deficit or an "under target" streak** |
| `push_outbox`, `notif_prefs` | no nutrition pushes in V1 |
| `coach_ai_config` / `coach_ai_spend_credits` | every model call |
| `app_events`, `/admin` | adoption card |

---

## 9. Grocery and stores

9.1 **V1 (NUT-D3):** derived list, grouped by aisle, quantities in purchase units, household-scaled,
estimated total from USDA ERS prices, labelled "estimate". Preferred store is a label.
9.2 **Finding stores is easy; store prices are not.** Locating nearby stores is a solved maps/places
lookup. Live per-store prices are the hard part: there is no API across grocers, and scraping retailer
sites breaks their terms.
9.3 **Later path, in order:** (a) **Kroger's public API** — real store-level prices and product search, but
only for Kroger-family chains (Kroger, Ralphs, Fred Meyer, King Soopers, Harris Teeter, etc.);
(b) **Instacart's developer platform** — hand the list to a cart at many retailers (affiliate revenue,
not a cost); Instacart does the pricing; (c) Walmart has no open grocery-pricing API for this use
[unverified — re-check when this phase opens]. Each is a separate decision when Phase 1–3 are live.

---

## 10. Safety

- NUT-D5 floors in code, unit-tested; a manual target below a floor is allowed only with a plain,
  non-alarming note — the athlete owns it.
- Collect **birth year**; under 18 → no recommended targets, no deficit rates, no weekly adjust.
- `medical-routing.ts` `DISORDERED_EATING` stays; it is **tuned** for nutrition context ("I only ate 700
  cal today, what should I eat?") with real sentences through `node --test`, the way the guard was proven.
- No "under target" streaks, no deficit honours, no red over-target states, no weight in any share.
- Targets are "estimates, not medical advice"; allergies carry a "check labels" line on every list.
- Food sanity check: energy ≈ 4P + 4C + 9F ± 15% — failing records are hidden from search.

---

## 11. Cost (monthly, incremental; assumptions in the review artifact)

| | 1k MAU | 10k MAU | 100k MAU |
|---|---|---|---|
| Food data + barcode | $0 | $0 | $0 – ~$2k (FatSecret cliff) |
| Rules planner, swaps, grocery | $0 | $0 | $0 |
| AI (typical → credit-capped worst) | $45 → $95 | $440 → $960 | $4.4k → $9.6k |
| Images, photo storage, DB | ≈ $0 | ≈ $10 | ~$50 – $300 |

Main risks: the FatSecret $1M cliff; licences that forbid keeping numbers (forces re-query on every
history view); model-written weeks; paid search-as-you-type; any model call outside the meter.

---

## 12. Phases

| Phase | Scope | Size | Prove before the next |
|---|---|---|---|
| **0 · Decisions + docs** | this doc; banners (done); P-6 addendum; safety policy tests spec; `.dc` for Nutrition Home, Log, Food Detail; FatSecret written answer | S | FDC search: top-3 hit ≥ 85% on 200 real queries · 100 real pantry barcodes via FDC + OFF ≥ 80% |
| **1 · Tracking** (Free) | tab, Home, search, Food Detail, log/edit/delete/copy, Quick Add, recents/favourites, custom foods, saved meals, manual targets, basic week view, barcode (new binary), offline-safe log | L | a typical day logs in < 2 min · testers still logging at day 14 · FatSecret go/no-go |
| **2 · Targets that know you** | recommended targets + floors, training-day targets, weekly adjust, See Details, Chapter goal link | M | adjust tracks real weigh-in trends · no recommendation under a floor |
| **3 · Plan and shop** (Premium) | recipe library, user recipes, planner, swaps/locks/excludes, derived grocery list, estimated budget | L–XL (mostly content) | 10 testers follow a plan for a week · list checked in a real shop |
| **4 · Forge intelligence** (Premium AI) | Holt nutrition asks + plan patches, pantry-aware, photo logging, training × nutrition observations, meal/recipe posts, retailer path (§9.3) if chosen | M–L | measured cost per Premium AI user under MA6-D4 · zero model-written numbers in an eval set. Needs: Coach-AI amendment, `TYPING_ENABLED`, Decision Queue #36 safety defects closed |

---

## 13. Application checklist

| # | Document / surface | Change | Status |
|---|---|---|---|
| 1 | `Community-Architecture-Amendment-002-Fifth-Tab.md` | Banner at Decision 1 → NUT-D1 | ✅ 2026-09-21 |
| 2 | `Forge-Legacy-Master-PRD.md` · `FORGE_LEGACY_PRD.md` §3 | Banner on the "not a nutrition tracker" line → NUT-D2 | ✅ 2026-09-21 |
| 3 | `Calendar-System-Architecture-v1.0.md` Non-Behaviors | Banner on "No meal planning" → NUT-D2 | ✅ 2026-09-21 |
| 4 | `Forge-Design-Blueprint-v1.0.md` "not for" | Banner → NUT-D2 | ✅ 2026-09-21 |
| 5 | `Marketing/Landing-Page-Design-Brief.md` FAQ + `site/index.html` | "Does it track calories?" answer rewritten | ✅ file edited · ☐ **landing site redeploy** |
| 6 | `Monetization-Architecture-Amendment-006` §4 grocery note, §6 row 7 | Grocery note → NUT-D3; row 7 → this doc | ✅ 2026-09-21 |
| 7 | FatSecret | Written answer on keeping log totals past 24h | ✅ **Approved 2026-09-22** — PO reports FatSecret replied "good to go" to storing a logged food's calories + macros permanently in the athlete's diary. Reply saved verbatim: `Docs/Legal/FatSecret-Storage-Permission-2026-09-22.md` (calories + macros only; attribution required). |
| 8 | `P-6-Privacy-Architecture.md` | Nutrition addendum (NUT-D7) | ✅ `P-6-Amendment-002-Nutrition-Data.md` 2026-09-21 (Privacy Policy section still owed before Phase 1) |
| 9 | Coach-AI amendment | Holt's nutrition scope | ☐ before Phase 4 |
| 10 | `src/components/app-tabs.tsx` | 5th tab | ☐ Phase 1 |

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-21 | Written from the Feasibility Review; NUT-D1…D8 locked by the PO the same day. |
| 1.1 | 2026-09-22 | **NUT-D9** — Phase 1 is a preview behind an allowlist (`0206`); the PO and `claudetest` only. No other decision changed. |
