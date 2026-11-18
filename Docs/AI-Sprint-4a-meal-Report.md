# AI Road to 10 Sprint 4a — Lane B report (NU-3: describe-a-meal + the food-lookup merge)

**Branch:** `ai/s4a-meal` · **Worktree:** `C:\Users\isaia\ai-s4a-meal-wt` · **Base:** `6b539e15` (the integrator's stubs on
`e1abd8ef`) · **Contract:** `Docs/AI-Sprint-4a-Build-Notes.md` §1.2 (log_food / propose_meal rows), §1.6, cross-lane stubs.
Nothing deployed, no OTA, no SQL applied, nothing pushed.

## ▶ RESUME HERE
1. Nothing is left open in the lane. Next is the integrator's merge (below: "What the other lanes wire").
2. If `ai-failure.ts` / `ai-call.ts` conflict with another lane at merge: keep both lines (each lane adds one slug).
3. If the meal-describe prompt changes: `node scripts/build-meal-describe-deploy.mjs`, then re-record
   (`run.mjs --suite meal-describe --live --budget 0.25 --record`, ~$0.003).

## Commits (oldest first)
| Commit | What |
|---|---|
| `1f3cc960` | The 095d8bf6 port: `ask-food-tools.ts` (get_foods, log_food, propose_meal, checkFoodAction, FOOD_PROMPT), `holt-meal.ts` (+ `mealCard` → `ActionCardModel`), HF-D6 in `kitchen.ts`, Amendment 006 restored + port section, tests |
| `71fb8926` | `holt-meal-live.ts`: the log_food / propose_meal executors + Undo; a failed apply leaves nothing |
| `5fa497e5` | `meal-describe` function + `meal-describe.ts` + deploy copy + builder + deploy-ai map row + eval suite (unrecorded) + shared one-liners |
| `e3965e8f` | `0277` + `pending-0277.sql` (authored, NOT applied) + its test |
| `12281ae8` | meal-describe recorded live: 33/33 |
| `94b65d70` | `/describe-meal`, `MealReview.tsx` (shared review), `meal-describe-live.ts`, the Add sheet rows, the route line |
| (this) | report |

## What the other lanes / the integrator wire (exact exports)
- **Lane A (coach-ask, caps `actions_v1` only)** — `src/domain/coach/ask-food-tools.ts` (import-free; inline it in the
  deploy build): `FOOD_TOOLS` (get_foods), `FOOD_ACTIONS` (log_food, propose_meal), `FOOD_ACTION_NAMES`,
  `FOOD_PROMPT` (the prompt section for the caps prefix — byte-stable), `foodActionAck(name)` (the tool_result after a
  forwarded action), `runFoodTool(name, input, ctx: FoodToolCtx, seen)` (ctx = `{ authorization, supabaseUrl, anonKey,
  fetch }`; never throws), `checkFoodAction(name, input, seen)` → `{ ok, input }` (forward THIS input: the foods whole)
  or `{ ok: false, error }` (send back as an `is_error` tool_result; nothing to the athlete). One `seen = new Map()` per
  message, shared by both. §1.3's medical/scan check on the meal NAME is A's (the only free text in these actions).
- **Lane C / integrator (cards)** — `src/domain/nutrition/holt-meal.ts`: `mealCard({ name, input }, { hour? })` →
  `ActionCardModel | null` for `log_food` and `propose_meal` (null = drop it). propose_meal: Confirm "Log it",
  `secondary: { label: 'Save as a meal', key: SAVE_MEAL_KEY ('save') }`; an unweighed food → `confirmLabel: null` +
  `blocked`; FatSecret → `credit`. Wire into `cardFor` (it is sync; wrap it).
- **Integrator (executors)** — `src/data/holt-meal-live.ts`: `HOLT_MEAL_EXECUTORS` (`{ log_food, propose_meal }`), or
  `logFoodExecutor` / `proposeMealExecutor`. Into `executorFor(name)`. propose_meal's Save = `apply(input, { key: 'save' })`.
- **Lane C (toolbox)** — the route is `/describe-meal` (params `date?`, `meal?` like `/meal-photo`). Gate: Premium AI +
  nutrition access.

## Tests
- `node --test "src/**/*.test.mjs"`: **7022 tests, 7018 pass, 4 fail — the 4 known only**
  (`onboarding-missing-profile` complete_onboarding vs 0066; `consent.test` crm-live → bug-plain; `migration-0234` ×2).
  Baseline at `6b539e15`: 6965 / 6961 / 4.
- New: `holt-food-lookup.test.mjs` (16), `holt-meal-live.test.mjs` (7, real nutrition-live + in-memory DB),
  `meal-describe-source.test.mjs` (21), `migration-0277.test.mjs` (6), `meal-describe-live.test.mjs` (7).
- `scripts/evals` + `scripts/deploy-ai` tests: 51/51. `run.mjs --suite all` offline: meal-describe 33/33, import 57/61, Kitchen 36/36, ask-safety 677/704, author 130/130 — unchanged; chat-answers 949/1158 and chat-safety 638/704 fail their bars exactly as at base (they gate coach-interpret; this branch touches none of their sources or recordings — lane A re-points them at coach-ask). `npx tsc --noEmit` = 0. eslint = 0 on every changed file.
- 0277 rehearsed in PGlite (scratch install, not a dependency): 0272's `coach_ai_reserve` with CRLF; bundle run twice —
  §3 = the prediction both times; the definition after = before with one line (+17 chars); a stand-in with another
  slug list raised and changed nothing.

## Eval — `meal-describe` (Haiku 5.5, the function's own request)
| Run | Estimate | Real |
|---|---|---|
| `run.mjs --suite meal-describe --live --budget 0.25 --record` | $0.06 | **$0.0029** (33 cases; 29 sent, 4 medical stopped in code at $0) |

Result **33/33** (bar 0.90 printed; deterministic 6/6). 0 nutrition keys in any raw answer; every answer through the
real `readFromModelText` and the real output scan. First strict grade was 31/33: "200 g chicken" / "170 g yogurt" came
back `amount: 200, unit: 'g'`, which `sanitizeMealRead`'s `MAX_AMOUNT = 100` turns into the schema's grams-only form
(`amount: null, grams: 200`) — the review starts from exactly that weight (`initialPortion` → `gramsServing`), so the
grader accepts that form for a gram weight. Observation (not fixed): the model sometimes adds a database word not said
("greek yogurt plain nonfat", "sweet potato baked") — the athlete sees and can swap the match.

## 0277 — exists, and why
The LIVE `coach_ai_reserve` (read-only `pg_get_functiondef`, md5 `fe40ac39…`) maps an unknown `p_fn` to `'other'`, and the
soft floor is keyed by that slug (`v_cfg.floor_actions -> v_fn ? p_action`; live map has `meal-photo-read` only). Without
0277 a described meal is ledgered as `'other'` and an athlete out of credits can snap a plate at 0 credits but not
describe one. 0277 patches the function IN PLACE from its live definition (the one slug-list line; raises unless it
appears exactly once; checks the result differs by that line only), so it composes with lane A's 0276 in either order;
revokes public + anon; merges `"meal-describe": ["meal_photo"]` into floor_actions. No weight moves (meal_photo = 1).
**Not applied.** Before it is applied a deployed meal-describe still works (charged 1 credit), just ledgered as 'other'.

## Shared-file edits (one-liners, listed for the integrator)
- `src/domain/ai/ai-failure.ts` — `AiFunction` gains `'meal-describe'`.
- `src/domain/ai/ai-call.ts` — `AI_APP_TIMEOUT_MS['meal-describe'] = 45_000` (+ the table in `ai-call.test.mjs`).
- `src/domain/ai/__tests__/migration-0268.test.mjs` — its AiFunction-list check excludes `meal-describe` (0277's test pins it).
- `scripts/deploy-ai/functions.mjs` — the `meal-describe` row (builder, tests, suite `meal-describe`).
- `src/app/_layout.tsx` — `<Stack.Screen name="describe-meal" />`.
- `src/domain/consent/consent.ts` — `NUTRITION_ROUTES` gains `'describe-meal'` (integrator ask: the toolbox door asks the Nutrition consent first, as `/meal-photo`).
- NOT edited: `meter-server.ts` `UPSTREAM_ABORT_MS` — it is inlined in nine deployed bundles (and the self-contained
  workout-tidy / workout-card-read copies); one new row would move every hash. meal-describe keeps its own
  `MEAL_DESCRIBE_ABORT_MS = 30_000` in `meal-describe.ts`, and `meal-describe-source.test` runs the meter checks
  `meter-functions-source.test` runs on the others. `model-rates.ts` / model-config: no edit needed (Haiku 5.5 is already
  rated and known; the default is in-code).
- NOT edited: coach-ask, CoachChatSheet, form check.

## Open items
1. ⛔ **Safety gap found in the shared medical guard (not my file, not changed):** `medicalRoute` returns `clear` for
   "ate a whole pizza then made myself throw up", "I made myself sick after eating", "threw it up on purpose" ("purged"
   is caught). Every typed surface shares it. Needs the guard owner + the ask-safety / chat-safety re-run.
2. Admin AI health label: `ai-health-core.ts` `FN_LABEL` has no `'meal-describe'` (it shows the slug). One line, not mine.
3. Integrator release ask: SQL `0277` (after 0276) · deploy `meal-describe` from `supabase/apply/deploy-meal-describe.ts`
   (NEW function, verify_jwt ON, CORS answered) · the OTA carries `/describe-meal` and the Add sheet rows.
4. The meal card's look is lane C's `HoltActionCard`; 095d8bf6's `MealCardView` and the chat's `meal` turn / summary
   note were not ported (contract: the card lives in C, the hold rule in A).
