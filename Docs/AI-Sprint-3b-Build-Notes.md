# AI Road to 10 — Sprint 3b: build notes + the shared contract

**Status:** 🔨 BUILDING 2026-11-18 · nothing live until the PO's one release "yes" (except §4's early ship, approved).
**Plan:** `Docs/AI-Sprint-3-Plan.md` (the map) · `Docs/AI-Road-To-10-Plan-v1.0.md` §9 · audit rows `Docs/QA/AI-Audit-2026-11-16.md`.
**Base:** `feat/build11` = GitHub `main` = `c543e3eb` (checked 2026-11-18). Integration branch `ai/s3b`
(worktree `C:\Users\isaia\ai-s3b-int-wt`). 3a is shipped (OTA `01a1ed15`); its log is in the status doc, Recently Completed.
**Builds on:** `Docs/AI-Sprint-1-Build-Notes.md` (the meter: reserve → model → settle, outcomes, timeouts, telemetry) and
`Docs/AI-Sprint-2-Build-Notes.md` on `ai/sprint2` (deploy record, byte-exact deploys, evals + gate). Nothing here redesigns them.

This file is the ONE contract the lanes build against. A lane that needs to change it says so in its report; the
integrator decides.

## PO decisions (2026-11-18, this session)

1. **Testing cap $25** for the rest of Sprint 3. Split: lane A ≤ $20, lane D ≤ $5, lane C $0. Each live run prints its
   estimate first (`run.mjs --live --budget N`) and is logged with its real cost in the lane's report.
2. **Gate = "no worse than live"** for workout tidy and Kitchen (they beat live: tidy 29 → 32 of 61, Kitchen 31 → 34 of
   36). The 95% / 100% bars stay as targets that are printed, not blockers. Ship both now (§4).
3. **Model switches by the rule** (as good on its eval AND the same or lower price), canary first: Holt's chat
   (`coach-ask`) → Sonnet 5.5 · program writer (`coach-author`) + Kitchen (`coach-kitchen`) → Haiku 5.5 · import stays.
4. **3 lanes in parallel** + the integrator.

Standing (PO 11-17): no warm-up on every program · reps-in-reserve targets NOT built (undecided) · the rest timer is
already opt-out-that-sticks (`src/lib/rest-timer-pref.ts`) — nothing to build. AI is paid-only. The medical stop is
never loosened. Numbers never come from the model.

---

## 0. Lanes, owners, files

| Branch | Worktree | Owns (only this lane edits these) |
|---|---|---|
| `ai/s3b-gate` | `C:\Users\isaia\ai-s3b-gate-wt` | **Gate policy only (§1.1), short.** `scripts/evals/gate.mjs`, `scripts/evals/lib/runner.mjs`, new `scripts/evals/baselines.json`, the suites' `threshold` lines, their tests. Merged first. |
| `ai/s3b-models` | `C:\Users\isaia\ai-s3b-models-wt` | **Lane A — PL-7 models.** `supabase/migrations/0274_*` + `supabase/apply/pending-0274.sql` (+ the switch steps) · new `src/domain/ai/model-request.ts` · `src/domain/ai/model-rates.ts` · the **model-call lines** (model choice + request body) in every AI function · `scripts/evals/**` except the gate files and the import corpus · `scripts/deploy-ai/**` · the PB-4 validator bullet (`src/domain/coach/validate-program.ts`). |
| `ai/s3b-chat` | `C:\Users\isaia\ai-s3b-chat-wt` | **Lane C — CH-6 rest + UX-1 + Kitchen.** `supabase/functions/coach-ask/**` and `coach-kitchen/**` (except the model-call lines) · `src/components/forge/CoachChatSheet.tsx` + the chat data modules (`src/data/coach-ask-live.ts`, `src/domain/coach/chat-*.ts`) · the chat telemetry allowlist · the UX-1 kit from 3a and its placement on Kitchen, workout tidy, card read, Holt's chat · `supabase/migrations/0276_*` (reserved, only if §1.3 truly needs SQL). |
| `ai/s3b-import` | `C:\Users\isaia\ai-s3b-import-wt` | **Lane D — IM-5 + IM-1 + tidy.** `supabase/migrations/0275_*` + `pending-0275.sql` · the import domain + `src/app/program-import.tsx` + its data modules · `supabase/functions/workout-tidy/**`, `program-photo-read/**`, `workout-card-read/**` (except the model-call lines) · `scripts/evals/corpus/import/**` + `scripts/evals/suites/import-corpus.mjs` · a new `/admin` "Import misses" card (new file + a one-line placement). |

⛔ **Form check belongs to another session** (steps 2–5 of "see it in your video"). No lane edits `src/app/form-check.tsx`,
`src/domain/coach/form-check*`, `src/domain/coach/pose/**`, the form-check components or `supabase/functions/coach-form-check/**`.
Lane A may READ coach-form-check to list its request fields; any change it needs goes in its report.

Shared files (a one-line edit is allowed; list each one in the report; the integrator resolves conflicts):
`supabase/functions/*/index.ts` model-call lines (A) vs the rest (C/D) · `src/app/admin*.tsx` placements.

### Migration numbers (verified free 2026-11-18 across `git log --all`; highest used = `0273` found-via)
**0274** model + effort per function (A) · **0275** import misses (D) · **0276** reserved for C. Apply order 0274 → 0275 → 0276.
Each goes through the `migration` skill: read any live function's source first (`pg_get_functiondef`, Supabase MCP,
read-only), never retype one; RLS on; revoke from `public` AND `anon` (Supabase grants new functions to anon directly);
a §3 verification block that predicts its own result. Lanes AUTHOR migrations; the PO pastes them.

---

## 1. Shared interfaces

### 1.1 Gate policy — `ai/s3b-gate`
- A suite's `threshold` may carry `floor: 'live'`. Such a suite passes when (a) every deterministic check passes,
  (b) its metric ≥ the live baseline's metric, and (c) **no case the live baseline passed now fails** (no regressions
  hidden by gains). The absolute `min` is still printed as a target: `target 0.95 — at 0.525 (live 0.475)`.
- Live baselines in `scripts/evals/baselines.json`: `{ "<suite>": { metric, passedCaseIds[], recordedAt, promptHash, source } }`,
  built from the recordings that graded the live functions on 11-17 (tidy/import 29/61, Kitchen 31/36). If those
  recordings can't be found, say so — never invent a baseline.
- `floor: 'live'` goes on `import-corpus` and `kitchen-allergens` only. `chat-safety` and anything gating the medical
  stop keep absolute bars, no floor.

### 1.2 Model config — lane A (`0274`)
- Per function: `model`, `effort`, `canary_model`, `canary` (who gets it: `operators` | a percentage). Stored server-side
  (in `coach_ai_config` or a new table), RLS on, no anon/authenticated grants; functions read it with the service role,
  cache ~60 s, and **fall back to the in-code default if the read fails** (never a dead function).
- `src/domain/ai/model-request.ts`, pure and import-free (functions bundle it): `requestFields(model, { thinkingOff, effort })`
  → only the fields that model accepts. Known (plan §6): Sonnet 5 / Haiku accept `thinking: {type:'disabled'}`;
  Sonnet 5.5 rejects it (400), and thinking-off there is `{type:'between_tools'}` at effort ≤ high; Opus 5.5 can only
  lower effort. **Load the `claude-api` skill and confirm every model's fields before coding.** A test asserts no
  model is sent a field it rejects. Refusal fallback (`fallbacks: "default"` or whatever the API really names it) on.
- The meter settles by the model that actually answered (the response's `model`), priced from `model-rates.ts`, and the
  ledger/telemetry records it.
- Retire Haiku 4.5 wherever it is still selectable (`coach-interpret`, `coach-ask`, `ai-canary`): only where an eval proves
  Haiku 5.5 as good. `coach-interpret` has no suite — build a small offline one or leave it and say so.
- Switches (§PO 3): written as SQL steps the PO pastes — step 1 operators-only canary, step 2 everyone — plus a revert line.
  Before writing them, confirm the 11-17 comparison ran through the FIXED harness (the functions' own request). If it
  didn't, re-run within the $20.

### 1.3 Web search cost before the tap — lane C
- The chat shows what a web search costs ("Web search · 2 credits") before it is sent, from the server's real
  `action_credits` (never a number typed into the app). Check `coach_ai_credits()` (0272) first; only if no existing
  read returns it, author `0276`. Old clients unaffected.

### 1.4 Chat telemetry: tools — lane C
- The chat's ended event adds `tools`: tool NAMES only, allowlisted keys (3a's rule). No arguments, no text.

### 1.5 UX-1 rollout — lane C
- 3a's one AI status look (working / steps / failed / Not charged / out of credits / offline) on Kitchen, workout tidy,
  card read and Holt's chat failure states. Both themes: layout both, colour one. Engraved icons only. Not form check.

### 1.6 Kitchen 36/36 — lane C
- Kitchen's last 2 offline failures ("creamy" on dairy-free dishes). Find what is real: a leak gets fixed in the
  server's allergen filter; a grader that is wrong is said so in the report (never loosen it yourself). Allergies fail CLOSED.

### 1.7 IM-5 "Send this to Forge so we learn this format?" — lane D (`0275`)
- On an unsure read the import screen offers the question, opt-in EVERY time, plain words on what is sent.
- Stores: the paste text or photo, what was read, the app version, the account. Kept 90 days (a purge job), RLS:
  an athlete inserts their own row only; operators read through a definer function. A photo goes to a PRIVATE bucket
  (these can hold health details — unlike the public photo buckets).
- `/admin` "Import misses": the list, the photo/text beside what was read, "Copy for Claude".

### 1.8 IM-1 — lane D
- Raise 32/61 with offline parser fixes ($0). A prompt change needs a re-record inside the $5 and must not regress a
  case live passes (§1.1). The 11-17 lesson: the rounds/finisher prompt turned warm-up stretch circuits into lifts.

---

## 2. Rules every lane follows (Sprints 0–3a)
- Work only in your worktree and branch. Edit only your files. Commit small, house style:
  `fix(area): one plain sentence of what the athlete gets (AI Road to 10 Sprint 3b, UNIT)`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Before reporting: `node --test` on every touched area (the 4 known src failures are allowed — name them), `npx tsc --noEmit`
  = 0, eslint = 0 on changed files (strict react-hooks: no sync setState in effects, no ref.current in render).
- ⛔ No deploys, no OTA, no SQL applied, no push, no `git stash` of the whole tree. Read-only Supabase MCP is fine.
- ⛔ Live model calls only inside your cap: print the estimate, run, record the real cost. The key is
  `ANTHROPIC_API_KEY` in `C:\Users\isaia\OneDrive - qest4.com\ForgeLegacy\.env.local` — pass it via env, never print or commit it.
- An old phone must never misread a new response: client first, and prove it with an old-client test.
- `@/` imports are type-only in domain code; bundled function code is import-free.
- Keep `Docs/AI-Sprint-3b-<lane>-Report.md` in your branch: what shipped (commit list), tests, costs, shared-file edits,
  open items, and a "▶ RESUME HERE" list so a usage pause costs time, not work.

## 3. Budget log (integrator)
| Run | Lane | Estimate | Real |
|---|---|---|---|

## 4. Integrator (this session)
- Early ship (PO 11-18): once `ai/s3b-gate` merges and `workout-tidy` + `coach-kitchen` pass it, deploy both byte-exact
  (`node scripts/deploy-ai/deploy.mjs <slug> --method mgmt_api --po-approved "…" --by "…"`) and read back `same`.
- Then merge A → C → D into `ai/s3b`, rebuild every bundle, the full gate, ONE release ask (SQL 0274/0275/0276 · functions ·
  OTA from a clean worktree with its own `npm ci`, fingerprint MATCH `4d98eb22` · web on `ai/s1-web` · trunk if the
  main tree is clean).

## 5. Log
- 2026-11-18 — branches + worktrees made off `c543e3eb`; contract written.
- 2026-11-18 — `ai/s3b-gate` merged (`427f306c` `ed280216` `f7311afd`). ✅ **coach-kitchen v12 DEPLOYED** byte-exact (mgmt_api, read back `same`, probes 200/401, `ai_deploy_log` v12; gate 34/36 vs live 31/36, no case regressed). ⛔ workout-tidy held: 32/61 vs live 29 but 2 cases live passes now fail (squatober-2024-07, -21) → lane D re-records (~$1.36 of its $5) and re-gates.
