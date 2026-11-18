# AI Road to 10 — Sprint 4a "Holt can do things": build notes + the shared contract

**Status:** 🔨 BUILDING 2026-11-18 · nothing live until the PO's one release "yes".
**Plan:** `Docs/AI-Sprint-4-Plan.md` (the map, §1 first table; PO decisions §5 = yes to all five) · `Docs/AI-Road-To-10-Plan-v1.0.md`
CH-3, NU-3, UX-3 rows. **Base:** `feat/build11` = GitHub `main` = `e1abd8ef` (checked 2026-11-18). Integration branch
`ai/s4a` (worktree `C:\Users\isaia\ai-s4a-int-wt`). **Builds on:** `Docs/AI-Sprint-3b-Build-Notes.md` (branch `ai/s3b`,
worktree `C:\Users\isaia\ai-s3b-int-wt`) and Sprints 1–2 notes (the meter, outcomes, timeouts, telemetry, byte-exact
deploys, the gate). Nothing here redesigns them.

This file is the ONE contract the lanes build against. A lane that needs to change it says so in its report; the
integrator decides. The code half of the contract is `src/domain/coach/holt-actions.ts` (names, inputs, card model,
executor shape) — lanes add to it only as this file says.

## PO decisions (2026-11-18)

1. **Testing cap $30 for 4a + 4b.** 4a split: lane A ≤ $16, lane B ≤ $2, lane C $0 (≈ $12 kept for 4b). Every live run
   prints its estimate first (`run.mjs --live --budget N`) and is logged with its real cost in the lane's report.
2. **Retire `coach-interpret`.** Everything typed goes to Holt's chat (`coach-ask`). Old phones keep working: the
   function stays deployed and UNCHANGED for them; only the new app stops calling it. Phone side first.
3. **Holt can act** — log food · propose a meal · swap today's exercise · start a workout · schedule a session ·
   build/edit a program · set targets. **Always a card with Confirm, then Undo. Nothing happens silently.** Numbers
   come from the app's own maths (`recommend()`, `portionMacros`, food data), never the model.
4. (4b — not now) memory on by default with an off switch.
5. **Merge `feat/holt-food-lookup`** (it is ONE commit, `095d8bf6`; the other 7 on that branch already shipped) into
   describe-a-meal.

Standing: AI is paid-only (Premium AI). The medical stop is never loosened. `@/` is type-only in domain code; bundled
function code is import-free. Form check belongs to another session.

---

## 0. Lanes, owners, files

| Branch | Worktree | Owns (only this lane edits these) |
|---|---|---|
| `ai/s4a-brain` | `C:\Users\isaia\ai-s4a-brain-wt` | **Lane A — CH-3 one brain + tools + status lines.** `supabase/functions/coach-ask/**` · `supabase/apply/deploy-coach-ask.ts` + its build script · `src/domain/coach/ask-tools.ts`, `ask-wire.ts`, `ask-stream.ts`, `ask-turn.ts`, `ask-outcome.ts` · `src/domain/coach/chat-core.ts` (routing) · `src/data/coach-ask-live.ts`, `src/data/coach-interpret-live.ts` · `src/components/forge/CoachChatSheet.tsx` (ALL of it except the card/status components lane C ships — A mounts them) · the `propose_program` / `propose_day` / `remember_note` / `open_door` definitions + their sheet handling · `supabase/migrations/0276_*` + `supabase/apply/pending-0276.sql` · `scripts/evals/suites/ask-actions.mjs` (new) + its cases · re-records of `ask-safety`, `chat-answers`, and `chat-safety` pointed at `coach-ask`. |
| `ai/s4a-meal` | `C:\Users\isaia\ai-s4a-meal-wt` | **Lane B — NU-3 describe-a-meal + the food-lookup merge.** `src/domain/coach/ask-food-tools.ts` (its tool defs, `resolveMealProposal`, the runner for `get_foods`) · `src/domain/nutrition/holt-meal.ts` · `src/data/holt-meal-live.ts` (the `log_food` / `propose_meal` executors + Undo) · new function `supabase/functions/meal-describe/**` + `supabase/apply/deploy-meal-describe.ts` · `src/app/describe-meal.tsx` (new) · `src/app/meal-photo.tsx` + `src/domain/nutrition/meal-photo-*.ts` (shared review only) · the Add sheet rows in `src/app/(tabs)/nutrition.tsx` · `src/domain/coach/kitchen.ts` (`FOOD_MACROS`, HF-D6) · `scripts/evals/suites/meal-describe.mjs` (new) · `Docs/Amendments/Nutrition-Architecture-Amendment-006-*.md` · `supabase/migrations/0277_*` (reserved, only if §1.6 truly needs SQL). |
| `ai/s4a-cards` | `C:\Users\isaia\ai-s4a-cards-wt` | **Lane C — UX-3 toolbox + the action cards + training executors.** `src/components/forge/HoltActionCard.tsx` (new: every action's card, incl. the meal card moved here from 095d8bf6's `MealCardView`) · `src/components/forge/HoltStatusLine.tsx` (new) · `src/components/forge/HoltToolbox.tsx` (new) + `CoachBubble.tsx` (long-press) · `src/domain/coach/holt-action-cards.ts` (new, pure: action → card model) · `src/domain/coach/holt-status.ts` (new, pure: status detail → the line) · `src/data/holt-actions-live.ts` (new: executors + Undo for `swap_exercise_today`, `start_workout`, `schedule_session`, `set_targets`). |

⛔ **Form check belongs to another session.** No lane edits `src/app/form-check.tsx`, `src/domain/coach/form-check*`,
`src/domain/coach/pose/**`, the form-check components or `supabase/functions/coach-form-check/**`. The toolbox's
"Check my form" only navigates to `/form-check` as it is.

**Shared files** (a one-line edit is allowed; list each in the report; the integrator resolves conflicts):
`src/domain/coach/holt-actions.ts` (the contract module — append only, never rename) · `src/app/_layout.tsx` (a route
or a provider line) · `src/domain/ai/model-rates.ts` / `model-config` defaults (B's new fn row).

### Migration numbers (verified free 2026-11-18 across `git log --all`; highest used = `0275` import misses)
**0276** typed build rides on Holt's chat (A) · **0277** reserved for B (§1.6). Apply order 0276 → 0277. Each goes
through the `migration` skill: read the live function's source first (`pg_get_functiondef`, Supabase MCP,
read-only), ⛔ never retype one; RLS on; revoke from `public` AND `anon`; a §3 verification block that predicts its own
result. Lanes AUTHOR; the PO pastes.

---

## 1. Shared interfaces

### 1.1 The capability flag — old phones never see a new tool
- A new app sends `caps: ['actions_v1']` in every `coach-ask` body. `coach-ask` offers the NEW tools (everything in
  §1.2 marked new) **only** when `caps` includes `actions_v1`. Without it the tool list, the prompt and every event
  are exactly today's (v28) — so an old phone never hears "tap to confirm" with no card under it.
- `ASK_TOOLS` + the action list must stay byte-stable per caps value (the cache prefix). Two prefixes, both cached.
- Test: an old-client body (no `caps`) gets v28's tool names, prompt hash and wire; `ask-wire-old-client` stays green.

### 1.2 The actions (names are the contract — `holt-actions.ts`)
Every action is forwarded to the app as today: `data: {"action":{"name","input"}}`. The function never performs one.

| Action | Defined by | Card + executor by | Confirm does | Undo does |
|---|---|---|---|---|
| `propose_program_edit` (exists) | A | A (as today) | applies the change | as today |
| `propose_program` / `propose_day` (new) | A | A (existing builder card) | runs the existing builder with the patch (missing questions as chips, the active-program guard), `coach-author` writes it — §1.4 | Start → put the previous active program back |
| `remember_note` (new; replaces interpret's `remember`) | A | C (card + executor, via `holt-notes-live.ts`) | saves the note | deletes it |
| `open_door` (new; replaces interpret's `door`) | A | C card (a button, no write) | navigates: import · pick · meal_plan · targets · form_check | — |
| `get_foods` (read, from 095d8bf6) | B | — | — | — |
| `log_food` (new) / `propose_meal` (095d8bf6) | B | C card, B executor | diary rows (Log) / a saved meal (Save) | deletes exactly those rows |
| `swap_exercise_today` (new) | A | C | today only: the running workout if one is open, else today's planned session as a one-day change | puts the original back |
| `start_workout` (new) | A | C | starts today's session / a named one / a template, and opens it | discards it if nothing is logged yet |
| `schedule_session` (new) | A | C | puts a session on a date the APP resolves from the words | removes it |
| `set_targets` (new) | A | C | writes targets computed by `recommend()` (`src/domain/nutrition/targets.ts`) from the athlete's own facts — the model sends only goal + pace as said | restores the previous targets |
| `offer_online_recipe_search` (exists) | A | A (as today) | — | — |

Rules for every card: (a) the model gives words, never a number it was not told (sets/reps the athlete typed are
fine; calories, macros, targets, weights never); (b) the card shows what WILL change, computed by the app, before
Confirm; (c) a card that cannot be computed (under-18 targets, an unweighed food — HF-D5, no program running) shows why
and has no Confirm; (d) Undo is offered after every write and undoes only that write (holtai-08's rule); (e) nothing
writes without a tap.

**Cross-lane stubs (committed by the integrator so every lane compiles alone; the owner replaces the body, never the
signature):** C — `holt-action-cards.ts` `cardFor(action, ctx)`, `holt-status.ts` `statusLine(status, detail)`,
`holt-actions-live.ts` `executorFor(name)`, `HoltActionCard` (props `HoltActionCardProps`), `HoltStatusLine`.
B — `ask-food-tools.ts` `FOOD_TOOLS`, `FOOD_ACTIONS`, `runFoodTool(name, input, ctx, seen)`, `checkFoodAction(name, input, seen)`
(the enriched input carries the foods whole to the device), plus `holt-meal.ts` `mealCard(...)` → `ActionCardModel`
and `holt-meal-live.ts` executors. The integrator wires B's meal card + executors into C's `cardFor` / `executorFor`,
and A's mounts onto C's components, at merge.

**Executor shape** (`holt-actions.ts`): `apply(input, ctx) → Promise<{ ok: true; undo: UndoToken; said: string } | { ok: false; reason }>`,
`undo(token) → Promise<boolean>`. Each executor has a test that a failed apply leaves nothing behind.

### 1.3 A refused or cut-off reply writes nothing — the stream rule
- The app HOLDS every `{action}` of a turn and shows its card only after a `done` whose `stop` is `end_turn` or
  `tool_use`. A `retract`, an `error`, a `done` with `stop: 'refusal' | 'max_tokens'`, a timeout, Stop, or the sheet
  closing drops every held action — no card, nothing written. Test this in A (stream → cards) and C (no card → no
  executor call).
- Server: an action whose free-text inputs (note text, a meal name, a food query, exercise words) trip `medicalRoute`
  or `scanReply` is NOT forwarded; the turn takes the stop path (retract) as the output scan does today.

### 1.4 One ask = one credit — `0276` (lane A)
- The build still runs on the device's builder and `coach-author` (its eval, 130/130, and the device's re-check stay
  as they are). The credit: `coach_ai_reserve`'s `typed_build` waiver today rides only on a paid `coach-interpret`
  turn. `0276` lets it also ride on a paid `coach-ask` turn **that opened a build** (the function marks its own
  reservation when it forwards `propose_program` / `propose_day`, service role). A chat that opened nothing never
  makes a later build free. `coach-interpret` turns keep riding (old phones). Read the live `coach_ai_reserve` first.
- Old phones are untouched: their interpret → author path is the same.

### 1.5 Status lines — lane A (server) + lane C (the line)
- The server keeps sending `{status: <a table line>}` (old phones). It ADDS `detail` when the tool's input is
  complete: `{status, detail: {tool, n?, lift?, food?, days?}}` — numbers, plus a lift/food name only when it is the
  athlete's own logged name or a catalogue name (never free model text), ≤ 30 chars.
- The app draws the line from `detail` with `holt-status.ts` templates: "Reading your last 6 bench sessions…",
  "Looking up chicken burrito…", "Checking 4 weeks of training…". Anything it can't template → the table line.

### 1.6 Describe a meal — lane B
- Type or dictate (the keyboard's mic) a meal → `meal-describe` (new function; the text goes through `medicalRoute`
  before the credit; Haiku 5.5 in-code default, a `coach_ai_model_config` row optional) → the SAME read shape as
  `meal-photo-read` (`MEAL_READ_SCHEMA`: names, search phrases, amounts — no field can hold a number) → the SAME
  review as Snap a plate (`meal-photo-match.ts`: every number from `food-search`) → Log. Meter: `p_action
  'meal_photo'` (1 credit, the same weight on purpose) and the soft floor like meal photo — only if the live
  `coach_ai_reserve` needs a change for a new `fn` (its floor list is by fn) author `0277`. New function ⇒ CORS like
  its siblings.
- Nutrition's Add sheet gets two labelled rows: **Snap a plate** (`/meal-photo`) and **Describe a meal**
  (`/describe-meal`). Route name `/describe-meal` is the contract (C's toolbox links it).
- From Holt's chat, "log 2 eggs and toast" goes `get_foods` → `log_food` (one card, the app's totals) — no
  `meal-describe` call, one ask credit.
- The food-lookup port: re-apply `095d8bf6`'s domain code onto today's tree (it is from 10-01; coach-ask has moved
  ~600 lines). Its tool defs live in `ask-food-tools.ts` (stub committed, import-free), which lane A imports in
  `coach-ask/index.ts` and inlines in its deploy build (`ask-tools.ts` itself may not import). HF-D1…D6 hold as locked.

### 1.7 Holt's toolbox — lane C
- Long-press Holt's coin (`CoachBubble`) → a sheet: **Ask** (the chat) · **Snap a plate** · **Describe a meal** ·
  **Check my form** · **Import a photo** (`/program-import`) · **What can I make** (the chat in Kitchen mode). Payers:
  every row ≤ 2 taps. Not entitled: the same rows with the app's existing upgrade path (no new paywall). Nutrition
  rows follow the nutrition access gate. Tap still opens the chat as today. Both themes (layout both, colour one),
  engraved icons only, VoiceOver labels, a hint that the long-press exists (accessibilityHint).

### 1.8 Safety — absolute (unchanged bars)
- Holt's code guard runs before every credit, every model call and every tool (as now), plus §1.3's action-input check.
- `ask-safety` ≥ 0.95 and must-stop let through ≤ 5 (live: 677/704, 5) — absolute. `chat-safety`'s cases now reach
  `coach-ask` (they were interpret's traffic): run them against `coach-ask` and hold the suite's own bar — absolute.
- New `ask-actions` suite (A): does Holt pick the right action with the right words, and never act on a stop line?
  Bar: 0 actions on any stop/medical case (absolute); right action ≥ 0.90 (target, printed).
- Import 57/61 and Kitchen 36/36 must not drop (offline replay, $0).

### 1.9 Telemetry
- `holt_ask_ended.tools` already records tool names. Add the action names forwarded and, on the app, `holt_action`
  {name, outcome: confirmed | undone | dismissed | failed} — names only, allowlisted keys (3a's rule).

---

## 2. Rules every lane follows (Sprints 0–3b)
- Work only in your worktree and branch. Edit only your files. Commit small, house style:
  `feat(area): one plain sentence of what the athlete gets (AI Road to 10 Sprint 4a, UNIT)`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Before reporting: `node --test` on every touched area (the 4 known src failures are allowed — name them), `npx tsc
  --noEmit` = 0 (or only the 4 known `/admin-ai` errors), eslint = 0 on changed files (strict react-hooks: no sync
  setState in effects, no ref.current in render).
- ⛔ No deploys, no OTA, no SQL applied, no push, no `git stash` of the whole tree. Read-only Supabase MCP is fine.
- ⛔ Live model calls only inside your cap: print the estimate, run, record the real cost. The key is
  `ANTHROPIC_API_KEY` in `C:\Users\isaia\OneDrive - qest4.com\ForgeLegacy\.env.local` — pass it via env, never print
  or commit it.
- An old phone must never misread a new response: prove it with an old-client test.
- Keep `Docs/AI-Sprint-4a-<lane>-Report.md` in your branch: commits, tests, costs, shared-file edits, open items, and a
  "▶ RESUME HERE" list so a usage pause costs time, not work.

## 3. Budget log (integrator)
| Run | Lane | Estimate | Real |
|---|---|---|---|
| meal-describe (33 cases, Haiku 5.5) | B | $0.06 | $0.0029 |

## 4. Integrator (this session)
- Merge C → B → A into `ai/s4a` (A last: it mounts C's components and registers B's tools), rebuild every bundle, the
  full gate, ONE release ask: SQL `0276` (+ `0277`) on the PO's clipboard · functions byte-exact (`coach-ask`,
  `meal-describe`, any rebuilt) · OTA to build 11 only from a clean worktree with its own `npm ci`, fingerprint MATCH
  `4d98eb22` · web on `ai/s1-web` · trunk if the main tree is clean. Order: SQL → functions (new `coach-ask` is safe
  for old phones by §1.1) → OTA → web.

## 5. Log
- 2026-11-18 — `ai/s4a` + 3 lane worktrees off `e1abd8ef`; contract written.
- 2026-11-18 — PO: `schedule_session` is OUT of 4a — built right after 4a with the calendar's upcoming days (CAL-D8, never built; Workout History's calendar shows past sessions only). `set_targets` for women / sex unspecified: the card sends them to the Targets screen (its pregnancy question can't be asked on a card).
- 2026-11-18 — `ai/s4a-cards` merged (`368e2e5f`): cards, toolbox, status line, executors for swap / start / targets / note / door. Targets Undo writes the earlier numbers as a new row (no DELETE policy on `nutrition_targets`); a first-ever target has no Undo.
- 2026-11-18 — `ai/s4a-meal` merged (`1eaa9394`): food-lookup port, `log_food`, `meal-describe` + `/describe-meal`, Add sheet rows, `0277` (meal-describe on the soft floor + its own ledger slug) AUTHORED. Eval 33/33, $0.0029. ⛔ Found: `medicalRoute` misses "made myself throw up" phrasings → sent to lane A.
- 2026-11-18 — integrator `8bea0a73`: B's meal card + executors wired into C's registry; AI health names `meal-describe`.
