# AI Road to 10 — the plan to take every AI category to 10/10 (v1.0)

**Status:** PROPOSED 2026-11-16 · **Owner:** PO · **Built by:** Claude sessions as the dev team.
**Starts from:** `Docs/QA/AI-Audit-2026-11-16.md` (overall 5.8, ~6 after `0267`). Every audit ID (C-/B-/N-/V-/P-Dn)
is referenced here so nothing from the audit is lost.

**PO brief (11-16):** *"Make a full plan to get every one of those up to 10. Every category. Don't worry about anything
we've already locked in. If it makes it better let's create a plan for it. I want it to be amazing. Be my full dev
team."*

**Two rules this plan keeps anyway** (they ARE what makes it good, not limits on it):
1. **Holt never makes up a number.** Weights, calories and macros always come from the app's maths and data.
2. **The medical stop is code and never gets looser.** This plan only adds checks (it scans Holt's replies too).

And one ruling: **AI is for paying users only (PO 11-16).** Nothing here gives AI away.

---

## 0. What "10" means — measured, not felt

A category is a 10 only when **every gate in its row passes**, checked by an eval or by live data. No gate, no 10.

| Category | Now | The 10 gates (all must pass) |
|---|:---:|---|
| **Holt chat** | 6.5 | ① ≥ 95% grounded-correct on the answers eval (uses your real log, right numbers) ② 100% on the safety corpus, both what you type and what Holt says ③ first words in < 1.5 s (p50), < 4 s (p95) ④ < 1% of asks fail, and 0 credits lost on a failure ⑤ ≥ 85% thumbs-up from paying users ⑥ handles photos, voice, actions and long memory |
| **Holt program builder** | 6 | ① 100% of ~1,800 matrix builds inside per-muscle weekly volume bands ② 0 redundancy flags (no front squat + RDL at 12–15 after squat + deadlift) ③ every session has warm-up, rest and effort targets ④ the plan adapts: replayed real histories trigger the right stall / deload / next-block actions ⑤ an outside certified coach rates a 20-program sample ≥ 9/10 |
| **Nutrition** | 6 | ① 0 allergen leaks on a 200-case red-team set ② food search p95 < 800 ms, ≥ 1 good result on 99% of a 500 common-food list ③ photo log within ±20% kcal (median) on 40 weighed plates ④ log a typical meal in ≤ 3 taps or one sentence ⑤ adaptive TDEE within ±150 kcal after 3 weeks (replayed data) ⑥ a registered dietitian signs off targets, floors and copy |
| **Photo import** | 6 | ① ≥ 95% structure-correct first try on a 60-item real corpus (photos, screenshots, handwritten, multi-week, Instagram, scanned PDF, CSV) ② 0 credits kept on a refused or failed read ③ < 10 s per photo (median) ④ every number visible and editable before saving |
| **Form check** | 5 | ① rep count exact on ≥ 95% of 60 real clips ② Holt's mark lands on the exact body part ≥ 90% (today 6/18) ③ a coach rates "the fix is right and useful" ≥ 80% ④ measured depth / range / tempo shown per rep ⑤ bar path on barbell lifts ⑥ 0 medical-adjacent outputs on the red-team set ⑦ bystanders cropped out |
| **AI platform** | 5 (6 after `0267`) | ① 0 public tables without row security (checked in CI) ② every AI failure captured, PO alerted within 15 min ③ deployed code == repo (checked daily) ④ every model or prompt change passes its eval gate before deploy ⑤ the cost ledger is within 5% of the Anthropic invoice ⑥ credits refunded on every failure ⑦ consent and age checked on the server |
| **UX for a paying user** (cross-cutting) | 6 | ① one consistent AI state kit (working / progress / failed / refunded / out of credits) on every AI feature ② balance always visible, warning at 20, never a dead stop (soft floor) ③ every AI tool reachable in ≤ 2 taps from Holt's coin ④ VoiceOver reads every AI reply |

---

## 1. Locked decisions this plan reverses (each gets a dated amendment when its unit ships)

| Locked today | Change | Why it's better |
|---|---|---|
| **CA-D11 in practice: two brains split by a regex** (coach-ask answers, coach-interpret does everything else) | **One brain:** every typed line goes to `coach-ask`; building, editing, remembering and logging become tools (C-G1) | "Show me my bench progress" stops getting an answer with no data behind it |
| **CA-D1/CA-D5: 8-turn chat window** | Rolling summary of older turns + long-term memory | Holt stops forgetting the start of a conversation |
| **CW-D10 + author prompt: "NEVER add a warm-up"** | Warm-ups on every build (PAS-D9 wins) (B-D5) | Every serious program has them |
| **Author prompt: "never RPE"** | RIR (reps in reserve) targets per exercise and week (B-G2) | The standard way good programs set effort |
| **TG-D2/TG-D3: stalls only when asked, no action** | After 3 stalled sessions Holt offers one tap: swap variation / reset 10% / add a set (B-G1) | Plans that adapt, like Juggernaut and RP |
| **Fixed-calendar deloads only** | Fatigue-triggered deloads too (performance + effort drift) | Deload when the body needs it |
| **CL-D11: avoidance captured but unread** | Ship the visible, reversible "Holt avoids these" list (CL-D3's precondition), then the builder reads it | Holt stops suggesting what you keep swapping away |
| **No refunds on failure** (`coach-interpret/index.ts:524`) | Every failed or refused call gives the credits back (P-D2) | Trust: you only pay for answers |
| **Credit weights (MA3-D16 table)** | Weigh by real cost: form check 6→3, recipe photo 3→2, web search 3→2, typed build 2→1. The AI tidy pass costs 0 (PO's "every photo gets AI" stays). Soft floor after 150 | Same money, much more use; nobody hits a dead stop |
| **Free Holt program counted when built** | Counted when kept (Start / Save) (B-D1) | "Ask me again" stops eating it |
| **`.dc` macro split: protein 0.9 × total bodyweight, carbs = leftover** | Protein on goal or adjusted weight, carb floor, fat flexes (N-D4) | No more 0 g carb targets |
| **NUT-D4 photo exception covers photos only** | Also covers a typed or spoken meal ("2 eggs and toast") (N-G4) | The fastest logging there is |
| **HF-D2: Holt may say food numbers in his own words** | Numbers only on the meal card (checked maths) | Nothing unverified ever shown |
| **Form check: no age floor** (Plan §9.4 open) | 18+ (legal caution, same spirit as the medical rule) | Liability |
| **Amendment 003 open item #5: a typed program repeats one week** | Typed programs get the rulebook's weekly wave + deload (B-G4) | Typed programs become real blocks |
| **Paste deploys from the dashboard** | Deploy through the Supabase CLI/MCP from a clean tree, with a drift check (each deploy still needs the PO's yes) | No more 7-week-stale functions |

---

## 2. Foundation first — the platform (5 → 10)

Everything else depends on this: no feature reaches 10 if failures are invisible, credits are lost, or a model change
can't be tested. **Do this first.**

### PL-1 · Security (S, days 1–2)
- ✅ Apply `0267` (`coach_ai_config` row security) — P-D1. Applied 11-17, §3 matched, 0 public tables without RLS.
- ✅ `coach_ai_record_usage` refuses accounts without AI and clamps values (or binds to a reservation id) — P-D7.
  11-17: `0268` applied (Sprint 1).
- ✅ Strip Anthropic error text from every client response — P-D8. 11-17: 11 functions live; form check waits (see PL-2).
- ✅ Server-side consent check in every AI function (`health_consents`) — P-G9. 11-17: in `coach_ai_reserve` (`0268`).
- ✅ Server-side age: every function derives age from the profile and passes it into the prompt; minors get the
  minor path everywhere, not just the kitchen — P-G8. 11-17: `coach_ai_reserve` returns it; in the user turn.
- ✅ `recipe-link-read`: check the resolved IP, not just the hostname — P-G7. 11-17: v3 live.
- ⬜ Delete the orphan `recipe-phot-read` — P-D10. **PO (dashboard)** — on the checklist.
- ✅ CI test: every public table has row security on; every SECURITY DEFINER function revokes `public`.
  11-17: ✅ the row-security half (`src/app/__tests__/rls-static.test.mjs` + `supabase/apply/check-rls.sql`; live: 145
  tables, 0 off). ✅ The definer-revoke half: Sprint 2 (`0271`). 11-17 (Sprint 2): the definer-revoke half too (`rls-static` + `check-rls.sql`); `0271` closed the 13 that were open.

### PL-2 · Money is always right (M, week 1)
- ✅ **Refunds:** `coach_ai_refund(reservation)` compensating entry. Called on every upstream failure, timeout,
  refusal and "not a program". The `uncharged` label becomes true — P-D2, V-D5. 11-17: built as reserve → model →
  settle (`0268`; a refund gives the credits back to the reservation's period); live on 11 functions; form check waits.
- ✅ Quote → model → spend (form check's pattern) wherever a read can be refused. 11-17: the same reserve/settle.
- ✅ Per-model rate map (`model → in / out / cache read / cache write`), backfill `cost_usd`, reconcile against the
  Anthropic invoice monthly — P-D5. 11-17: `0268` re-priced 9,307 rows, $34.72 → $19.93. ⬜ The monthly
  reconcile is a habit, not code.
- ✅ Meter the admin tools (bug-plain, social-plan) on their own ledger line — P-G10. 11-17: bug-plain v3,
  social-plan v2.
- ✅ Daily caps on every function (form check has none) — P-D6. 11-17: form check's 20 a day is built; the
  `coach-form-check` deploy waits on the PO's new Anthropic test key and the eval (PO OK'd $1–$3). 11-17 (Sprint 2): `coach-form-check` v24 live with the 20-a-day cap.
- ✅ **Credit reweight + soft floor** (see table in §1). After 150: 5 chats or meal photos a day, never a dead stop.
  Worst case about $2 a month per AI user. 11-17 (Sprint 2): `0272` applied + Monetization Amendment 012 (typed build + photo tidy as waivers; PO accepted the ~$7.40 worst case).

### PL-3 · Reliability (S–M, week 1)
- ✅ 60–90 s client timeouts on every AI call (AbortController); abort when the screen closes — P-G3, C-D2.
  11-17: OTA #25 `01a1e99b` to build 11 (`src/lib/ai-invoke.ts`). ⬜ Not on web or trunk yet.
- ✅ Server: retry once on 429 / 529 / 5xx before anything has streamed — C-I2. 11-17: coach-ask v26 (and Sonnet is
  forced when web search is on).
- ✅ Keep-alive / status events during long tool rounds ("Checking your bench log…") — C-G5. 11-17: coach-ask v26.
- ✅ Every failure shows the shared AI state (see UX-1) with "Not charged" when refunded. 11-17: OTA #25 (the full
  UX-1 kit is still Sprint 3).

### PL-4 · Observability (M, week 1–2)
- ✅ Every AI data module reports failures to Sentry + `client_errors` with the function, model, latency and the
  error kind — P-G1. 11-17: OTA #25 (`client_errors` name `ai.<fn>.<kind>`).
- ✅ `/admin` → **AI health** page: calls, failures, p50/p95 latency, credits, real cost per function, per day.
  11-17: `0269` + OTA #25 (`/admin-ai`). ⬜ Not on the web CRM until the web port.
- 🔨 Daily canary (one tiny call per model) + alert to the PO (push to admin) when it fails, when the failure rate
  passes 5%, or when the key is near empty. 11-17: ✅ the hourly alert is live (`0269`); `ai-canary` v1 is deployed
  but OFF until the PO sets `AI_CANARY_SECRET` (checklist), then Claude sets `canary_url`. 11-17: `canary_url` set; it waits only on the PO's `AI_CANARY_SECRET`.
- ⬜ Anthropic Console: spend alert + separate keys/workspaces for **app**, **admin tools** and **evals** — P-G2.
  **PO (Console).**
- ✅ Thumbs up / down on every AI output → `ai_feedback` table (the quality signal every later gate uses). 11-17:
  `0269` + OTA #25 on Holt's chat, meal photo, meal plan and photo import; the rest is UX-4.

### PL-5 · Deploys you can trust (M, week 2)
- ✅ One `deploy-ai` skill: build the bundle → run the function's tests → deploy (CLI or MCP) → probe (OPTIONS 200,
  no-auth 401) → record the version. Still asks the PO before each deploy — P-G5. 11-17 (Sprint 2): `.claude/skills/deploy-ai` + `scripts/deploy-ai`; the byte-exact Management API path proven on 5 functions.
- ✅ Nightly drift check: deployed source vs repo for every function; anything different is flagged in `/admin`. 11-17 (Sprint 2): `0271` + `drift.mjs` + `.github/workflows/drift.yml` + the /admin-ai card. ⬜ It needs the PO's GitHub secret to run.
- ✅ Catch up the three stale functions now: ✅ `food-search` v34 (N-D3) and ✅ `program-photo-read` v21 (P-D3) on 11-17; ⬜ `coach-form-check`
  (after FC-1). ✅ `coach-form-check` v24 (11-17 (Sprint 2)).
- 🔨 **Trunk ← build 11 merge** of the AI-relevant drift: Holt allowance fixes `78ee55ae` + `ca5f088e`, Meal Plan
  B13 `1ba2fee4`, the pose engine, clinical words (V-D6). Web runs trunk, so this matters. 11-17: web ✅ (`index-2fe9f7a4…` carries Sprint 0–2); trunk branch `ai/s1-trunk` ready — the `feat/route-map` fast-forward waits on a clean main tree.

### PL-6 · Evals as the gate (M, week 2)
- ✅ `scripts/evals/` — one runner, one suite per feature: chat answers, chat safety, author, kitchen allergens,
  meal photo, import corpus, form check. Each run states its cost before spending
  (live AI tests spend real money and share one key; a 09-21 run drained it). 11-17 (Sprint 2): runner + 7 suites + `gate.mjs`.
- ✅ **Record once, replay free:** live answers are saved, and CI replays them offline through the real code on
  every push. 11-17 (Sprint 2): Kitchen 36/36 and the import baseline recorded. ⬜ Author/chat recordings set aside until the harness calls the model like the functions (thinking off, cache, the code stop).
- ✅ GitHub Actions: `tsc`, lint, all `node --test` suites, offline evals, RLS check — C-I6. 11-17 (Sprint 2): `.github/workflows/ci.yml` (the all-suites step is a scoreboard; the changed-functions gate enforces).
- ✅ No model or prompt change deploys unless its suite passes. This is the gate. 11-17 (Sprint 2): `gate.mjs` in the deploy skill and in CI. 11-18 (Sprint 3b): import + Kitchen gate on "no worse than live" (metric ≥ live AND no live-passed case fails, PO 11-18); the safety suites stay absolute; chat-safety now gates `coach-interpret` only, `coach-ask` is gated by its own ask-safety.

### PL-7 · Models (M, week 2–3, after PL-6)
- ◐ Model ID + rates move into config (read at runtime), so one change can canary one function — P-G6. 11-18 (Sprint 3b): `0274` (model per function) → `switch-models-step1-canary.sql` authored and given to the PO, ⬜ NOT YET APPLIED.
- ◐ **Sonnet 5 → Sonnet 5.5** everywhere it stays on Sonnet. ⚠ Every function sends `thinking: {type:'disabled'}`,
  which Sonnet 5.5 rejects. Switch to `between_tools` or a low effort, then pass the evals. 11-18 (Sprint 3b): `coach-ask` v28 — Sonnet 5.5 is its default for everyone (PO 11-18; ask-safety 677/704 = 0.962 vs Sonnet 5's 0.889). ⛔ `coach-interpret` held (fails its bars on every model; PO: leave live as-is).
- ◐ **Haiku 5.5** for the simple jobs if the evals hold: chat summaries, photo tidy, card transcription, naming foods
  in a meal photo, typed-meal parsing. Remove Haiku 4.5 (it costs more than Sonnet here). 11-18 (Sprint 3b): ✅ Haiku 4.5 retired everywhere it was selectable; `coach-author` + Kitchen tie on Haiku 5.5 at ~1/20 the cost → step 1 puts them on Haiku 5.5 for operators only, step 2 everyone after watching (⬜ waits on `0274`).
- ◐ **Try Opus 5.5 for program writing** (`coach-author`). Programs are rare and high-value, so ~10¢ a program may be
  worth it if the coach-review score rises. Decide by eval. 11-18 (Sprint 3b): decided by eval — `coach-author` goes to Haiku 5.5 (the tie above).

**Platform score path:** 6 after `0267` → 8 after PL-2/3/4 → 9 after PL-5/6 → **10** once all seven gates pass for 30 days.

---

## 3. Holt chat (6.5 → 10)

**The 10:** it feels like ChatGPT that knows your training. It reads your log, sees your photos, hears you, does
things for you with your OK, remembers you, and is never wrong about your numbers.

### CH-1 · Fix what's broken (S, week 1)
- ✅ Out-of-credits copy for payers: balance + reset date, not "the one block I write for free" — C-D1. (11-17, OTA #24)
- ✅ Tappable, selectable web-search links — C-D3. (11-17, OTA #24)
- ✅ Refusal and cut-off replies get their own copy (never the outage card) — C-D4. (11-17, OTA #24)
- ✅ Correct offline copy + a "Try again" chip — C-D5. (11-17, OTA #24)
- ✅ Force Sonnet whenever web search is on — C-D8. (11-17, coach-ask v26, Sprint 1)
- ✅ Rename the shadowed `askHolt`; fix stale headers — C-I7. 11-17 (Sprint 2): `streamCoachAsk`.
- ⬜ **Crisis / urgent copy:** legal sign-off, then non-US numbers by region — C-PO2. **PO + legal.**

### CH-2 · Safety in depth (M, week 2)
- ✅ **Output scanner:** at stream end, check Holt's reply for dose amounts, reassurance ("that's normal", "probably
  fine") and diagnosis words; on a hit, take the turn back with the stop card. Same for every function's text — C-I1, C-D6. 11-17 (Sprint 2): `output-scan.ts`; coach-ask `retract` + interpret, Kitchen, form check; strict (PO).
- ✅ Notes filtered in coach-ask like coach-interpret — C-D7. Workout notes filtered in `get_workout_detail` — C-I5. 11-17 (Sprint 2).
- ✅ User-written and friend-written text delimited as data, never "app content" — C-I4. 11-17 (Sprint 2).
- ✅ Safety corpus grows with every new phrasing, both directions (what's typed, what's said back). 11-17 (Sprint 2): two-way corpus; + the PO's two false-positive fixes ("bench numbers", band dislocates).

### CH-3 · One brain (L, weeks 3–5)
- ⬜ Every typed or spoken line goes to `coach-ask`. `coach-interpret` retires.
- ⬜ New action tools, each confirmed on the phone with Undo: `propose_program` · `propose_day` ·
  `propose_program_edit` (exists) · `remember_note` · `propose_meal` / `log_food` (from the food-lookup branch) ·
  `schedule_session` · `start_workout` · `swap_exercise_today` · `set_targets` (numbers from `recommend()`).
- ⬜ `coach-author` becomes the tool the builder tools call, so one ask = one credit — C-G1.
- ⬜ Status events while tools run ("Reading your last 6 bench sessions…").

### CH-4 · Memory (M, week 4)
- ⬜ Rolling summary of older turns inside a chat (no 8-turn cliff) — C-G2.
- ⬜ Long-term facts Holt keeps (schedule, gym, injuries said in passing, likes and dislikes), shown and editable in
  `/holt-memory`; nothing medical is ever stored (same filter as notes).
- ⬜ Browsable past chats with search; reopen and continue.

### CH-5 · Eyes and ears (M, weeks 4–6)
- ⬜ **Photos in chat:** "what's this machine", "is this a good lunch for my cut", "read this program", a still from
  a set. One image path through `coach-ask` — C-G3.
- ⬜ **Voice mode:** hold to talk (mic exists since build 9), Holt answers out loud (TTS, expo-speech is in the
  build-10 deps), hands-free between sets. Native piece → build 12 if not already linked.

### CH-6 · Chat basics, done properly (S–M, week 3)
- ✅ Copy, stop, regenerate, edit-and-resend — C-G4. (11-17, Sprint 3a, OTA `01a1ed15`; thumbs up/down shipped in Sprint 1. Stop is charged after the first word.)
- ✅ Credit chip in the header ✅ (Sprint 2); ✅ web search shows its cost before you tap — C-G6. 11-18 (Sprint 3b): "· 2 credits", read from the server's `coach_ai_quote`.
- ✅ VoiceOver reads Holt's finished reply — C-G8. (11-17, Sprint 3a)
- ✅ Telemetry: ask sent / first word / ended + how it ended ✅ (11-17, Sprint 3a; allowlisted keys only); ✅ tools used — C-G7. 11-18 (Sprint 3b): chat telemetry records tool names.

### CH-7 · Proactive Holt (M–L, weeks 6–8)
- ⬜ **Weekly check-in** (MA8, Premium AI): one message Monday morning, in the app only (never a promo push). Reads
  the week, names one win and at most two changes, each with a one-tap action.
- ⬜ **Moments:** a PR, a finished block, a stall, a missed week, a big food-target miss streak — Holt says one line
  where you are, with a one-tap action. Built on the Feature-Discovery v2 design (moments as a derived read).

### CH-8 · Quality gate (ongoing)
- ⬜ Answers eval: 300 real-style questions over seeded athlete histories, graded on "used the right data, numbers
  right, followed the voice". Target ≥ 95%.
- ⬜ Latency budget enforced in the eval (p50 first token < 1.5 s).

**Chat score path:** 6.5 → 7.5 (CH-1/2 + platform) → 8.5 (CH-3/6) → 9.5 (CH-4/5) → **10** (CH-7 + gates met).

---

## 4. Holt program builder (6 → 10)

**The 10:** every program is one a good strength coach would sign — right volume per muscle, warm-ups, rest, effort
targets, smart exercise choice — and it changes when your training does.

### PB-1 · Fix the defects (S, week 1)
- ✅ 4-day muscle builds: rotate only what leads; chest stops at 3–7 sets a week — B-D2. (11-17, OTA #24)
- ✅ Free program counted on keep — B-D1. Day allowance charged after the build succeeds — B-D4. (11-17, OTA #24)
- ✅ AI sets clamped to the prompt's 6; session volume checked — B-D9. (11-17, OTA #24)
- ✅ Wizard builds races like the chat (`buildAnyway`) — B-D10. (11-17, OTA #24)
- ✅ Typed race lift days obey the leg-day rules and deloads — B-D3. (11-17, OTA #24)
- ✅ 30 s timeout on `coach-author`, falling back to the rulebook, with a refund — B-D8. (11-17, OTA #24)

### PB-2 · A per-muscle volume model (M, week 2–3)
- ✅ Every exercise credits its primary and secondary muscles (from the catalogue; the coherence rules fix the 23
  mis-tagged rows). 11-17 (Sprint 2): 56 + 38 catalogue fixes; RDL / stiff-leg / good morning hamstrings-primary (PO).
- ✅ Weekly set bands per goal × level × muscle as a rulebook TABLE (no per-goal code branch). 11-17 (Sprint 2): `rulebook/volume.ts`; deviations PO-approved.
- ✅ The matrix test asserts every one of ~1,800 builds lands inside the bands — B-G3. 11-17 (Sprint 2): 4,320 builds, 2,989 outside → 0.
- ✅ Merge the two day-fill strategies into one ranked collector, so fixes land once. 11-17 (Sprint 2): `collectRanked`.

### PB-3 · Complete sessions (M, week 3)
- ⬜ **Warm-up** on every build: 1–3 pattern-prep moves from the Mobility catalogue + ramp sets on the first heavy lift — B-D5.
- ✅ **Rest** by role × goal (e.g. strength primary 3 min, hypertrophy accessory 60–90 s) into `restSec` — B-D6. (11-17, OTA #24)
- ⬜ **RIR targets** by role and week (wave toward the deload) — B-G2.
- ⬜ **Better selection:** barbell compounds keep the strength range; a second same-pattern slot prefers a machine
  or one-sided lift; no "same movement family twice" — B-D7.

### PB-4 · Typed programs become real blocks (S–M, week 3)
- ⬜ The model-written week runs through the weekly wave + deload — B-G4.
- ✅ The validator checks typed builds against the same volume bands. 11-18 (Sprint 3b): the PB-4 validator checks weekly sets per muscle.

### PB-5 · The plan adapts (L, weeks 5–8)
- ⬜ **Autoregulation:** the logged effort (first-set ask + RIR) adjusts the next set and session load.
- ⬜ **Readiness (optional, 1 tap):** "How do you feel?" → today's volume ±.
- ⬜ **Stalls:** 3 stalled sessions → one-tap swap / reset 10% / add a set — B-G1.
- ⬜ **Fatigue deload:** performance down across lifts + effort drifting harder → offer the deload early.
- ⬜ **Misses:** skipped sessions re-flow the week instead of vanishing; the builder reads skips and session length.
- ⬜ **Next block:** when a program ends, Holt builds the next one from this one's results (top sets, e1RM change,
  what you swapped, what you liked).
- ⬜ **Avoidance list:** visible, reversible "Holt avoids these"; the builder reads it (CL-D3's precondition met).
- ⬜ Favorites boost ranking (already plumbed through `learned`).

### PB-6 · More you can ask for (L, weeks 8–12)
- ⬜ %1RM blocks and meet peaking; conditioning intervals with machine targets (rower pace) — B-G6.
- ⬜ Sport-specific goals as rulebook tables.
- ⬜ Finer limitations (joint-based: shoulder, knee, low back, wrist), each a table, each tested.
- ⬜ Age and sex considerations where the evidence supports them (the 09 evaluation doc first).

### PB-7 · Prove it (ongoing)
- ⬜ Coach rubric in the test suite: volume bands, push/pull balance, redundancy, warm-up / rest / RIR present.
- ⬜ Replay 20 real training histories through PB-5 and check every action fired correctly.
- ⬜ **Hire a certified strength coach for one review** of a 20-program sample (a few hours). Target ≥ 9/10. **PO.**

**Builder score path:** 6 → 7 (PB-1) → 8.5 (PB-2/3/4) → 9.5 (PB-5) → **10** (PB-6/7 + coach review).

---

## 5. Nutrition (6 → 10)

**The 10:** MacroFactor-grade coaching, Cal AI-grade logging speed and Cronometer-grade data trust, with zero
allergen risk.

### NU-1 · Safety (S, days 1–3)
- ⬜ Kitchen: any unmatched ingredient line with a quantity → dish dropped when the athlete avoids anything; wider
  allergen and diet word lists — N-D1.
- ✅ Allergies, diet and age fail **closed** on a failed read — N-D2. (11-17, OTA #24)
- ✅ Pregnancy / breastfeeding question before any recommended deficit — N-G2. (11-17, OTA #24)
- ✅ Macro split: protein on goal / adjusted weight (capped), carb floor, fat flexes — N-D4. Holt's target setup (11-17, OTA #24)
  inherits it.
- ✅ Meal photo: declined consent says so; a failed save says so — N-D5. (11-17, OTA #24)
- ⬜ **Registered dietitian review** of targets, floors, the under-18 rule and the care line (a few hours). **PO.**

### NU-2 · Data you can trust (M–L, weeks 1–4)
- ✅ Redeploy `food-search` + bump `SERVINGS_SINCE` — N-D3. (11-17, OTA #24)
- ◐ Read weights from names and serving text ("- 2 oz", "85 g", "1 cup (240 ml)") ✅ (11-17, Sprint 3a, `food-search` v35 byte-exact, `SERVINGS_SINCE` 11-17 22:00Z); ⬜ count servings ("1 Big Mac") — N-D6. Log Food also searches your own foods while you type (Sprint 3a).
- ⬜ Open Food Facts: read search servings; keep OFF in its own table (licence) — N-G5, N-PO4.
- ⬜ **Import USDA's bulk data into Postgres** with trigram search (fast, never down, no quota). Live USDA becomes the
  fallback — N-G1.
- ⬜ Search locally while typing; call vendors on pause or submit; per-user rate limit.
- ⬜ Move `fdcFood` / `fsFood` / `tidy` into `src/domain` with real behaviour tests.
- ⬜ Confirm the real FatSecret ceiling before scale — N-PO6.
- ⬜ More micronutrients from USDA (fibre, potassium, iron, calcium, vitamin D, B12…) — N-G8.

### NU-3 · Logging speed (M, weeks 3–5)
- ⬜ **"Describe what I ate"** by typing or voice: a cheap model names foods + amounts, the database supplies every
  number, review before logging (same path as meal photo) — N-G4.
- ⬜ **Snap a plate** as a labelled button in Nutrition's Add sheet (not just an icon in Log Food).
- ⬜ Offline meal photos: snap now, read when back online.
- ⬜ Smart repeats: "your usual breakfast?" by time of day.
- ⬜ Log from Holt's chat (the food-lookup branch's `propose_meal` + Log) — Amendment 006 locked, HF-D2 numbers on the card only.

### NU-4 · Coaching that adapts (M–L, weeks 5–8)
- ⬜ **Adaptive TDEE:** estimated from the weight trend + logged intake (deterministic), shown with its confidence — N-G3.
- ⬜ **Weekly nutrition check-in** (Premium AI): targets adjust from the TDEE; Holt writes the note, the maths sets
  the numbers.
- ⬜ Training-day vs rest-day targets (the columns already exist); lift-day protein timing; race carb-up — Amendment 003 D3.
- ⬜ In-app reminders Holt sets with you (never promo pushes) — Amendment 003 D4.

### NU-5 · Kitchen + plan (M, weeks 4–6)
- ⬜ Dishes always fully matched, or flagged "Holt couldn't check this ingredient" and never shown to an allergic athlete.
- ⬜ Holt fills the week; the grocery list follows; pantry-aware suggestions.

### NU-6 · Prove it (ongoing)
- ⬜ 200-case allergen red-team set (replayed offline) — 0 leaks.
- ⬜ 40 weighed plates for the photo eval; 100 typed meals for describe-what-I-ate.
- ⬜ 500 common foods for search coverage + latency.
- ⬜ AI analytics events: photo read, matched, edited, logged; kitchen card tap — N-G7.

**Nutrition score path:** 6 → 7 (NU-1 + N-D3) → 8.5 (NU-2/3) → 9.5 (NU-4/5) → **10** (gates + dietitian sign-off).

---

## 6. Photo import (6 → 10)

**The 10:** any program from anywhere comes in right the first time, structure intact, and you never pay for a
miss.

### IM-1 · Fix it (S, week 1)
- ◐ The card reader accepts `×`/`X`, time ("30s", "1:30"), distance ("5 km") and Sets/Reps column headers; better,
  accepts any text where the code reader finds an exercise row — V-D1. 11-18 (Sprint 3b): EVERY photo goes through the AI layout (PO 11-18: "the photo upload feature should only be ai"); on app screens the AI's layout is held to the code's reading. Corpus 32 → 57 of 61 (`program-photo-read` v23, `workout-card-read` v5, `workout-tidy` v8). ⬜ 4 cases left: Squatober Days 2/16 set order, Day 10 "x50" read as x30, Bridger W2A per-set F.
- ✅ Multi-week tables detected on the card path — V-D2. (11-17, OTA #24)
- ⬜ Refund on "not a program" and on outage; no double charge — V-D5.
- ✅ Copy stops promising photos to people without Premium AI — V-D7. (11-17, OTA #24)

### IM-2 · A real corpus (M, week 2)
- ✅ 60 real items: the 19 existing photos re-read by the card reader (~25¢), plus Instagram graphics, handwritten
  cards, coach PDFs, multi-week sheets, timers, screenshots of other apps. Real answers saved, replayed free — V-D8. 11-17 (Sprint 2): 61 graded items (binaries outside git), recorded ($0.89).
- ⬜ Gate: ≥ 95% structure-correct. Baseline 11-17: 20/61 = 33%. 11-18 (Sprint 3b): 57/61; the deploy gate for import is now "no worse than live" (PO 11-18, see PL-6).

### IM-3 · More ways in (M–L, weeks 4–8)
- ⬜ **CSV history import from Strong and Hevy** (biggest switching win: your history comes with you) — V-G8.
- ⬜ Scanned PDFs read page by page through the card reader — V-G6.
- ⬜ Instagram carousel: several images → one program.
- ⬜ Share sheet: "Share to Forge" from Photos / Instagram / Files (native → build 12).

### IM-4 · The experience (S–M, week 3)
- ⬜ Step-by-step progress per photo; side-by-side photo vs what was read; low-confidence cells highlighted.
- ⬜ Cheaper and faster: Haiku 5.5 for transcription if the corpus holds (PL-7) — V-I1.

### IM-5 · Import learns new formats (S–M, week 3) — PO 2026-11-17
PO: *"If it's a new format we haven't seen and we're not confident … it would go to me or to Claude and be able to adapt
… then saving that format moving forward. I wouldn't want the paste feature not good on any tier level."*
- ⬜ **Answer now, never wait on a human.** The import always returns at once; anything it wasn't sure of (the paste
  reader's `skipped` lines, unmatched exercise names, a low-confidence photo cell — IM-4) is highlighted to fix.
- ◐ **Opt-in send.** When a read is unsure, the import offers *"Send this to Forge so we learn this format?"* — the
  person's choice each time (pastes and photos can hold personal details; health-data consent rules apply). It sends
  the raw input plus what they corrected by hand. Nothing is sent without that tap. 11-18 (Sprint 3b): ◐ the offer
  shipped (OTA `01a1ef23` + web); it works once `0275` (import misses) is applied — ⬜ authored, NOT YET APPLIED. ⬜ A multi-photo import sends text only.
- ◐ **Review queue on `/admin`** ("Import misses"): new items, the format kind, what was skipped, what they fixed.
  Operators-only; kept for a fixed period, then deleted. 11-18 (Sprint 3b): the "Import misses" card shipped; works once `0275` is applied.
- ⬜ **The learning step:** Claude works the queue (weekly, or when the PO says "check the import queue"), adds a rule
  to the **paste reader** (code, so Free, Premium and AI all get better, not just photo AI) and/or an example to the
  card reader, and adds the item to the IM-2 corpus so the format stays tested forever. Ships by OTA. No model
  "learns on its own"; every change passes the corpus gate.
- ⬜ (Optional) tell the person when their format is learned.
- Gate: an unsure-read rate that falls month on month; every queue item resolved (rule + corpus case) or answered.

**Import score path:** 6 → 7.5 (IM-1) → 9 (IM-2/4) → **10** (IM-3 + IM-5 + gates).

---

## 7. Form check (5 → 10)

**The 10:** you film a set and get measured, rep-by-rep feedback a coach would agree with: marks on the right
joint, depth and range in numbers, bar path, and one clear fix.

### FC-1 · Get the phone and server in sync (S–M, week 1–2)
- ✅ Send dense frames + rep tags (not 10 hand-picked moments), or make the "a third of a second apart" line
  conditional — V-D4. 11-17 (Sprint 2): 40 frames stay (PO 09-29 — a 12-frame run measured worse); the spacing line is built from the times sent; rep tags via body tracking.
- ✅ Clinical words (valgus, kyphosis…) blocked on web + server — V-D6. 11-17 (Sprint 2).
- ✅ Daily cap — P-D6. 18+ age floor (§1). 11-17 (Sprint 2): unknown age fails closed; the screen asks for the birth year.
- ✅ Re-run the eval (quote ~$0.5–1 first), then deploy build 11's server half — V-D3, V-G2. 11-17 (Sprint 2): three live runs $2.04 (Sprint 2 / 12 frames / live v23); deployed v24 — a trade vs live (more specific, better reps, more invented second fixes) → one-fix trial in Sprint 3.

### FC-2 · Prove body tracking on a phone (M, week 2–3)
- ⬜ First device test on build 11 (Launch QA 312) — V-G1.
- ⬜ Save real pose data as fixtures; the pose tests stop being synthetic-only.
- ⬜ Eval with tracking: target mark on the exact body part ≥ 16/18 now, ≥ 90% at 10.

### FC-3 · Measured feedback (M, weeks 3–5)
- ⬜ Show the measured reps, depth, range of motion and tempo per rep (already saved, never shown) — V-I4.
- ⬜ Per-rep strip; "Finding your reps…" step — V-I3.
- ⬜ Compare with your last check on the same lift.

### FC-4 · Doors (S–M, week 3)
- ⬜ "Check my form" on the set row (06e) and an optional prompt after a primary lift's set — V-G3.

### FC-5 · Privacy (M, week 4)
- ⬜ Crop every frame to the athlete's tracked box before it leaves the phone (no bystanders) — V-G5.
- ⬜ Written retention rule for saved frames.

### FC-6 · Build 12 native (L, weeks 6–10)
- ⬜ **Bar path** for barbell lifts (track the bar end / plate through the set).
- ⬜ **Live mode:** on-device rep counting and simple cues during the set (no AI cost), Holt's read after.

### FC-7 · Prove it (ongoing)
- ⬜ 60 clips across 10 lifts, graded by rubric + one certified-coach grading pass. **PO (clips + coach).**

**Form check score path:** 5 → 6.5 (FC-1) → 8 (FC-2/3/4) → 9 (FC-5) → **10** (FC-6 + gates).

---

## 8. UX for a paying user (6 → 10, cross-cutting)

- ◐ **UX-1 · AI state kit:** one component for working / step progress / failed / "Not charged" / out of credits /
  offline-queued, used by every AI feature. One voice, one look, both themes. 11-17 (Sprint 3a): import + meal photo. 11-18 (Sprint 3b): + workout write (card read + tidy), Holt's chat failures, Kitchen failures.
- ✅ **UX-2 · Credits you can see:** a chip in Holt's header and on every AI screen; warning at 20; reset date; soft
  floor instead of a wall (PL-2). 11-17 (Sprint 2).
- ⬜ **UX-3 · Holt's toolbox:** long-press Holt's coin (or a row in his chat) → Ask · Snap a plate · Describe a meal ·
  Check my form · Import a photo · What can I make. Every AI tool ≤ 2 taps away for payers.
- ✅ **UX-4 · Feedback everywhere:** thumbs up/down on every AI output feeds `ai_feedback` (PL-4). 11-17: 4 screens
  (Holt's chat, meal photo, meal plan, photo import); form check, Kitchen, workout tidy and card read still to go. 11-17 (Sprint 2): + form check, Kitchen, card read, tidy.
- ⬜ **UX-5 · Accessibility:** VoiceOver on every reply and result, Dynamic Type, reduced motion.

---

## 9. The order — sprints

Each sprint is about a week of dev-team sessions. Every unit ships as an OTA to build 11 + web, or as SQL the PO
pastes. Native work batches into build 12. Each unit records its row here (✅ + date) and in the status doc.

| Sprint | Theme | Units | Scores after (chat · builder · nutrition · import · form · platform) |
|---|---|---|---|
| **0** (days 1–3) | Stop the bleeding | `0267` · NU-1 allergy + fail-closed · CH-1 · PB-1 defects · IM-1 · N-D3 / P-D3 redeploys · crisis copy to legal | 7 · 7 · 7 · 7.5 · 5 · 6.5 |
| **1** | Foundation | PL-2 refunds + rate map · PL-3 timeouts / retry · PL-4 telemetry + AI health + alerts · trunk ← build 11 merge | 7.5 · 7 · 7 · 7.5 · 5.5 · 8 |
| **2** ✅ 11-17 | Gates + sync | PL-5 deploy skill + drift check · PL-6 evals + CI · FC-1 · CH-2 safety · PB-2 volume model · IM-2 corpus · credit reweight + soft floor (UX-2) | 8 · 8 · 7.5 · 9 · 6.5 · 9 |
| **3** ◐ 3a 11-17 · 3b 11-18 | Better outputs | PL-7 models · PB-3 warm-ups / rest / RIR / selection · PB-4 typed blocks · CH-6 basics · NU-2 data (part) · FC-2 device test · UX-1 state kit · IM-4 + IM-5 import learns new formats | 8.5 · 8.5 · 8 · 9 · 7.5 · 9 |
| **4–5** | One brain + memory | CH-3 one brain + tools · CH-4 memory · NU-3 describe-a-meal + log from chat · FC-3 measured feedback · FC-4 doors · UX-3 toolbox | 9.5 · 8.5 · 8.5 · 9 · 8 · 9.5 |
| **6–8** | It adapts | PB-5 adaptive plan · NU-4 adaptive TDEE + check-in · CH-7 proactive Holt · CH-5 photos + voice · NU-2 USDA bulk · IM-3 CSV + scanned PDF · FC-5 crop | 10 · 9.5 · 9.5 · 10 · 9 · 10 |
| **Build 12** (native, in parallel from sprint 4) | Native | bar path · live rep counting · voice replies (if not linked) · share sheet | — · — · — · — · 10 · — |
| **9–12** | The last mile | PB-6 more goals · NU-5 kitchen + plan · expert reviews (coach, dietitian) · every gate measured for 30 days | 10 · 10 · 10 · 10 · 10 · 10 |

**Roughly 12 weeks to straight 10s**, if the PO can turn around approvals, pastes and device tests within a day or two.

---

## 10. What only the PO (or an outside expert) can do

| Who | What | When |
|---|---|---|
| PO | Paste `0267`; approve each deploy and OTA; Console spend alert + separate keys | Sprint 0–1 |
| PO | Device tests: form check with body tracking, voice mode, the first refund | Sprints 2–5 |
| PO | Film 40 more form-check clips across 10 lifts; weigh and photograph 40 plates | Sprints 2–3 |
| PO | Approve each amendment in §1 as its unit ships | Rolling |
| **Lawyer** | Crisis / urgent copy (live today, marked DRAFT); international numbers; the form-check age floor; OFF data licence | Sprint 0–1 |
| **Registered dietitian** | Targets, floors, the macro split, the under-18 rule, pregnancy copy (a few hours) | Sprint 1–2 |
| **Certified strength coach** | Review a 20-program sample + 30 form-check reads (a few hours) | Sprint 3 and Sprint 9 |

---

## 11. What it costs

- **Live eval budget for the whole plan:** about **$25–40** of AI time (author ~$1.45 a run, form check ~$1, chat
  answers ~$2–4, meal photos ~$0.50, import corpus ~$0.50; each run re-quoted first). Replays are free.
- **Per paying user at 10/10:** ~$0.50–1.50 a month typical, ~$3 worst case with the soft floor, voice and photos in
  chat. That's against ~$17 net from $19.99 after Apple's 15%, or ~$6.80 from the $7.99 Tester AI plan. Haiku 5.5 on
  the simple jobs pulls this down.
- **Experts:** a few hours each of lawyer, dietitian and coach time.

---

## 12. Risks and how we hold them

- **A model upgrade quietly gets worse** → nothing deploys without its eval suite (PL-6); canary one function first.
- **Bigger Holt = more ways to say something unsafe** → output scanner (CH-2), safety corpus both directions, the
  medical stop stays code.
- **"One brain" is a big change** → ship behind a flag for the PO first, keep coach-interpret one release as fallback,
  compare on the answers eval.
- **Adaptive features make the wrong call** → every adaptation is a suggestion with one tap and Undo, never silent;
  replay real histories before release.
- **Parallel sessions and branch drift** → one OTA lane (build 11), trunk merged weekly, the nightly drift check.
- **Spend** → separate keys, spend alerts, daily caps, canary.
