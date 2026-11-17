# AI Road to 10 — Sprint 2 "gates + sync": build notes + the shared contract

**Status:** 🔨 BUILDING 2026-11-17 · **Plan:** `Docs/AI-Road-To-10-Plan-v1.0.md` §2 PL-5/PL-6 · §3 CH-2 · §4 PB-2 · §6 IM-2 · §7 FC-1 · §8 UX-2/UX-4 · **Audit rows:** `Docs/QA/AI-Audit-2026-11-16.md`
**Base:** `feat/build11` @ `a6b88e79` (Sprint 1, OTA #25 — checked 2026-11-17: local = origin = GitHub `main`). Integration branch `ai/sprint2` (worktree `C:\Users\isaia\ai-s2-int-wt`).
**Builds on:** `Docs/AI-Sprint-1-Build-Notes.md` — the meter contract (reserve → model → settle, the response shape §1.2, the outcome names, timeouts §3, telemetry §4). Nothing here redesigns it; everything plugs into it.

This file is the ONE contract the four parallel branches build against. If a branch needs to change it, it says so in its
report and the integrator decides. Nothing here is live until the PO approves the release.

---

## 0. Branches, owners, files

| Branch | Worktree | Owns (only this branch edits these) |
|---|---|---|
| `ai/s2-gates` | `C:\Users\isaia\ai-s2-gates-wt` | **PL-5 + PL-6.** New `.claude/skills/deploy-ai/**` · new `scripts/deploy-ai/**` · new `scripts/evals/**` (runner, gate, record/replay, every suite EXCEPT the import corpus) · new `.github/workflows/**` · `supabase/migrations/0271_*` + `supabase/apply/pending-0271.sql` (+ its builder if any) · the drift card on `src/app/admin-ai.tsx` + its data module · `src/app/__tests__/rls-static.test.mjs` + `supabase/apply/check-rls.sql` (the definer-revoke half) · the bundle normaliser (§1.5) and the one-line hook into each `scripts/build-*-deploy.mjs` |
| `ai/s2-safety` | `C:\Users\isaia\ai-s2-safety-wt` | **CH-2 + FC-1 + C-I7.** `supabase/functions/coach-ask/**`, `coach-interpret/**`, `coach-form-check/**`, and the output-scan wiring in `coach-kitchen/**` · new `src/domain/ai/output-scan.ts` · `src/domain/coach/{chat-core,medical-routing,ask-*,holt-notes,form-check,form-check-view}.ts` + `src/domain/coach/pose/**` · `src/app/form-check.tsx` and the form-check components/data module (INCLUDING form check's thumbs, UX-4) · `src/components/forge/CoachChatSheet.tsx` (the rename + the retract event) · `src/data/coach-ask-live.ts` · the safety corpora under their `__tests__` |
| `ai/s2-builder` | `C:\Users\isaia\ai-s2-builder-wt` | **PB-2 + IM-2.** The builder domain: `src/domain/coach/{rulebook/**,candidates,day,assemble,prescribe,author*,validate-program,constraints,session-suggest,training-gaps}.ts` (whatever the day-fill paths are) · the exercise catalogue data + its muscle tags · the program-matrix test · `supabase/functions/coach-author/**` · **IM-2:** new `scripts/evals/corpus/import/**` (items + answer keys) and `scripts/evals/suites/import-corpus.mjs`, built to the §1.4 suite interface |
| `ai/s2-credits` | `C:\Users\isaia\ai-s2-credits-wt` | **UX-2 + UX-4 (not form check).** `supabase/migrations/0272_*` + `supabase/apply/pending-0272.sql` · new `src/domain/ai/credits*.ts` · new `src/components/forge/AiCreditsChip.tsx` and its placement on every AI screen · `src/components/forge/AiFeedback.tsx` (only if it must change) · thumbs on Kitchen, workout tidy, card read · new `Docs/Amendments/Monetization-Architecture-Amendment-012-*.md` · any copy that states a credit cost (one-line edits anywhere; list each in the report) |

**Integrator (this session):** merges, regenerates every bundle, the gate, the canary turn-on, the web + trunk port of
Sprint 1 + 2, the release ask, the docs. A branch never edits another branch's files; if it must, it says so in its
report instead (one-line placements of `AiCreditsChip` in `CoachChatSheet.tsx` / `form-check.tsx` are allowed — the
integrator resolves the conflict).

### Migration numbers (verified free 2026-11-17 across every ref, `git log --all` and every worktree; highest = `0270`)
**0271** gates (drift record) · **0272** credits (reweight + soft floor) · **0273** reserved for `ai/s2-safety`, only if
it truly needs SQL (say so in the report). Apply order: 0271 → 0272 → 0273. Each goes through the `migration` skill:
never retype a live function — read its live source first (`pg_get_functiondef` via the Supabase MCP, read-only), revoke
from `public` AND `anon`, and a §3 verification block that predicts its own result.

---

## 1. Shared interfaces

### 1.1 Output scanner (CH-2 · C-I1, C-D6) — owned by `ai/s2-safety`

`src/domain/ai/output-scan.ts`, pure and import-free (functions bundle it): `scanReply(text) →
{ hit: false } | { hit: true, kind: 'dose' | 'reassurance' | 'diagnosis' | 'clinical', match: string }`.
- Runs on Holt's FULL reply at stream end in `coach-ask`, and on every free-text field any AI function returns to a
  user (`coach-interpret`, `coach-kitchen`, `coach-form-check`).
- A hit: the turn is taken back and the medical stop card is shown instead. Settle with `p_outcome='guarded'`,
  `p_refund=true` (the Sprint 1 vocabulary — no new outcome). Non-streaming functions return the existing stop shape.
- Chat streams, so "taking it back" needs a wire event (proposed name `retract`, carrying `{ card: 'medical_stop' }`).
  ⚠ Old clients ignore unknown events and would keep the streamed words on screen: the CLIENT ships first (OTA), the
  server after. Prove the old-client behaviour with the `ask-wire-old-client` test style.
- The medical stop never gets looser. The scanner only ADDS stops. False positives on ordinary coaching ("that's
  normal soreness" after a hard leg day?) are judged against the corpus, and the corpus grows in BOTH directions:
  must-stop lines and must-pass lines, for what is typed AND what Holt says.

### 1.2 Form check (FC-1 · V-D3, V-D4, V-D6, P-D6, §1 age floor) — owned by `ai/s2-safety`
- Dense frames + rep tags, or make the "a third of a second apart" prompt line conditional on what was actually sent.
- Clinical words (valgus, kyphosis, …) blocked on the web client AND the server guard, one shared word list.
- 18+: `coach_ai_reserve` already returns `age_years` / `minor` (Sprint 1). Minor → refused before the model, settled
  `guarded` + refund. Unknown age → fail CLOSED (Sprint 0's rule for allergies/age) with a reason the app turns into
  "Add your birth year in Settings to use form check." Reason names: `under_18` · `age_unknown` (new; old clients show
  their generic failure).
- The 20-a-day cap is already built (Sprint 1) — keep it.
- Then `scripts/form-check-eval.mjs` re-runs (⛔ needs the PO's NEW testing key in `.env.local` — the September one is
  dead; PO OK'd $1–$3) and `coach-form-check` deploys, which also ships build 11's never-deployed body-tracking half.

### 1.3 Credits (UX-2, the §1 reweight) — owned by `ai/s2-credits`
- Weights (`coach_ai_config.action_credits`): form check 6→3 · recipe photo 3→2 · web search 3→2 · typed build 2→1 ·
  the AI tidy pass 0 (find which action key that is — the always-AI photo tidy, PO 09-30 — and prove a 0-weight action
  still reserves/settles and appears on the AI health page). Read the live table first; report old → new for every key.
- Soft floor: once the month's allowance is used, chats and meal photos still work, 5 a day, never a dead stop. Every
  other action still refuses at 0 with the reset date. The ledger marks a floor use (so AI health can count them).
  Keep `coach_ai_reserve`'s return shape (old functions read it by name); if a column must be added, prove every
  deployed caller still works.
- `AiCreditsChip`: balance on Holt's header and every AI screen; warning at ≤ 20; the reset date; the soft-floor state
  in plain words. Data from `coach_ai_balance()` (or its successor) — one read, cached, refreshed after each call.
- `Monetization-Architecture-Amendment-012`, dated, reversing the MA3-D16 table (and naming the soft floor).
- ⛔ AI stays paid-only: no account without `coach_ai` ever reaches a model through the floor.

### 1.4 Evals (PL-6) — owned by `ai/s2-gates`
- `node scripts/evals/run.mjs --suite <name> [--live --budget <usd>] [--record]`. Offline (default) replays recordings
  through the REAL code (prompt builders, parsers, guards) and costs $0. `--live` prints the cost estimate and refuses
  without `--budget`. ⛔ No branch runs `--live`; the integrator asks the PO.
- Suites: chat answers · chat safety · author · kitchen allergens · meal photo · import corpus (IM-2) · form check.
  A suite names the functions it gates and the prompt sources it hashes. A recording is keyed by that prompt hash: a
  changed prompt makes its recordings STALE, and a stale suite fails the gate ("re-record: ~$X live").
- **The suite interface (fixed now, so `ai/s2-builder` can write the import suite in parallel):**
  ```js
  // scripts/evals/suites/<name>.mjs — plain ESM, runs under node --experimental-strip-types
  export const suite = {
    name: 'import-corpus',
    functions: ['program-photo-read', 'workout-card-read'],     // the slugs this suite gates
    promptSources: [{ file: 'supabase/functions/workout-card-read/index.ts', exportName: 'SYSTEM' }], // hashed: text + model + tool defs
    model: 'claude-sonnet-5',
    cases: async () => [/* { id, input, expect } */],
    deterministic: async () => [/* { id, pass, notes } — checks that need no model (optional) */],
    grade: async (testCase, recorded) => ({ pass: true, score: 1, notes: '' }), // recorded = { reply, usage }; runs the REAL parser/guard
    callLive: async (testCase, { apiKey, signal }) => ({ reply: {}, usage: {} }), // only ever called by run.mjs --live --budget
    estimateUsd: (cases) => 0,
    threshold: { metric: 'pass_rate', min: 0.95 },
  };
  ```
  Recordings: `scripts/evals/recordings/<suite>/<promptHash12>/<caseId>.json` =
  `{ caseId, promptHash, model, recordedAt, reply, usage }`. Gate policy: recordings under the CURRENT hash → graded,
  must meet `threshold` · recordings only under an OLDER hash → **STALE = fail** · no recordings ever (bootstrap) →
  deterministic checks only, passes with a loud "UNRECORDED — record on the next live run (~$X)" warning.
- `node scripts/evals/gate.mjs <function-slug>` = the deploy gate (the `deploy-ai` skill calls it; CI calls it for every
  function whose source changed).
- Suites read their corpora from where the owning branch keeps them (e.g. the safety corpus under
  `src/domain/coach/__tests__/`); `ai/s2-gates` never edits those files — it imports them.
- IM-2 (`ai/s2-builder`): 60 real items (the 19 existing photos + whatever real material exists; list the gap for the PO as a ⬜ line),
  gate ≥ 95% structure-correct. Recording them is live → quote first; the integrator asks.

### 1.5 Deploys (PL-5) — owned by `ai/s2-gates`
- `deploy-ai` skill: build the bundle → run the function's tests + `gate.mjs` → deploy → read back and sha256-compare
  with the repo bundle → probe (OPTIONS 200, no-auth POST 401) → record the version (in the 0271 table). It asks the PO
  before each deploy.
- ⚠ Sprint 1 lesson: MCP deploys are retyped by the model; agents miscounted long `─` rules (3 of 12 needed a redeploy;
  `workout-card-read` v4 still differs on comment line 336). Two answers, build both:
  1. **Byte-exact (preferred):** the Supabase CLI / Management API with `SUPABASE_ACCESS_TOKEN`. ⛔ The PO must OK
     using that token (the integrator asks); until then nothing uses it, not even read-only.
  2. **MCP-safe bundles:** a normaliser in the bundle builders makes every bundle pure ASCII and collapses long comment
     rules (token-aware — via the TypeScript scanner — so string literals keep their meaning, e.g. `—` → `\u2014`).
     Retyping an ASCII file with no long runs is reliable; the read-back hash still decides.
- Nightly drift check: every function's deployed source vs the repo bundle (from `main`, which mirrors build 11),
  results stored by 0271 and flagged on `/admin-ai`. $0. Whatever secret it needs is a ⬜ PO line.

---

## 2. Rules (same as Sprint 1)

- ⛔ Never call a deployed AI function or the Anthropic API. Offline tests are free. One key serves every AI feature;
  draining it is an outage. Read-only Supabase MCP (list, get, SELECT) is fine; no deploy, no apply, no writes.
- ⛔ Never loosen the medical stop. Numbers never come from the model. No free AI.
- Paste bundles come from `scripts/build-*-deploy.mjs` — regenerate, never hand-edit.
- Keep each function's existing reason names and HTTP statuses (old phones). Ship the client before the server
  whenever an old client would break or mislead.
- `@/` is type-only in domain code (breaks `node --test`). No sync setState in effects (strict react-hooks lint).
- Commit in small, honest commits on your branch (`fix(...)`/`feat(...)` with the audit/plan ID). Never stash the
  whole tree. Never touch `package.json`/`package-lock.json`/`app.json`/`eas.json`/`targets/`/`modules/` (the build 11
  fingerprint) — if you think you must, stop and report.

## 3. The gate (every branch, then the integrator)

- `node --experimental-strip-types --test "src/**/*.test.mjs"` → exactly the 4 known failures (consent → bug-plain,
  migration-0234 ×2, onboarding-missing-profile), none added.
- `npx tsc --noEmit` → 0 · `npx eslint <changed files>` → 0.
- Plus each branch's own new tests (scripts/evals suites included).

## 4. ▶ RESUME HERE (if the session stopped — e.g. out of credits)

State at 2026-11-17: four branch agents launched off `ai/sprint2`'s first commit (this file). Nothing deployed,
applied, published or spent. Baseline on the base: see §6.

1. For each branch: `git -C C:/Users/isaia/ai-s2-<name>-wt log --oneline ai/sprint2..HEAD` and `git status --short`.
   An agent that stopped mid-way: read the diff; re-launch ONE agent for that branch with its §0 row, "continue from
   the commits already on your branch", and §2–§3.
2. All four done: check `feat/build11`'s CURRENT head; if it moved past `a6b88e79`, merge it into `ai/sprint2` first.
   Merge `-gates` → `-credits` → `-builder` → `-safety` into `ai/sprint2` (worktree `C:\Users\isaia\ai-s2-int-wt`),
   regenerate every bundle, run §3.
3. Leftovers: canary (PO set `AI_CANARY_SECRET`? a GET with the right `x-cron-secret` answers 405, a wrong/missing one
   401 — free) → set `ai_ops_config.canary_url`, one tick (~$0.0001) · web port on top of `forge-deploy-wt`'s
   `64d05437` + trunk port onto `feat/route-map`.
4. Ask the PO ONCE: live eval cost (form check, import corpus) · the `SUPABASE_ACCESS_TOKEN` OK · SQL 0271 → 0272
   (→ 0273) · function list + order (client first where §1.1 says so) · the OTA (build 11, from
   `C:/Users/isaia/forge-build11-wt`) · web. PO-only steps go as ⬜ lines in
   `Docs/App-Store-Submission-Checklist.md` → "💻 PO laptop work".

## 5. What each branch reports back

Files changed · tests added (count) · full-suite numbers from its worktree · tsc · eslint on changed files · anything it
could NOT do and why · any live cost it needs (with the estimate) · every PO action as a ⬜ line for the checklist.

## 6. Log

- 2026-11-17 — contract written; branches created off this commit. Baseline on `a6b88e79`: 6,649 tests · 6,645 pass · the 4 known failures (complete_onboarding 0066 body · AI consent → bug-plain · migration-0234 ×2).
- 2026-11-17 — Sprint 1 port DONE (agent): web `ai/s1-web` @ `913800bc` (on `64d05437`, in `C:\Users\isaia\ai-s0-web-wt`) and trunk `ai/s1-trunk` @ `dcbe8076` (on `69f42532`, in `C:\Users\isaia\ai-s0-trunk-wt`). 26 cherry-picks + 2 adaptations each. Web 6,091 → 6,415 tests, trunk 6,098 → 6,422, the same 5 known failures on both (those lines also fail the policy "Last updated" date test), tsc 0. Integrator decisions: (1) web AI health = a CRM page (`/admin?p=aihealth`) + the `/admin-ai` door the alert push opens — accepted, it is how web admin works; ⬜ not yet seen in a browser. (2) ⛔ `coach-form-check` deploys from build 11's bundle ONLY — the web/trunk bundle has no body-tracking half and would take pose off build 11 phones. (3) The `Buffer` lint error in `ai-calls-live.test.mjs` fixed on `ai/sprint2` (one import); take it into the ports with Sprint 2. (4) ⛔ The next web deploy builds from `ai/s1-web` (+ Sprint 2 on top), never from below `64d05437`.
- 2026-11-17 — `ai/s2-credits` DONE @ `c25fe771` (8 commits; 6,680 tests, the 4 known; tsc 0 with the gitignored `expo-env.d.ts` copied from build 11; eslint 0 on 19 files; 0272 run twice in PGlite against prod's md5-matched function sources, 20/20 §3 rows). Weights: form_check 6→3 · recipe_photo 3→2 · web 3→2; "typed build 2→1" = a WAIVER (`typed_build`: the author write rides free on the paid interpret turn that opened it, 30 min, once); the photo tidy = a WAIVER (`photo_tidy`) after the paid photo read (typed "Fix it with AI" stays 1 — a literal 0 would be free up to its 40-a-day cap). Floor: after the AI gate + consent, only on out_of_credits with allowance > 0; message (coach-ask + interpret turns) + meal_photo; 5 a day total, 0 credits, day from `profiles.tz` else UTC; a refunded floor use doesn't count. Reserve's shape unchanged. ⚠ Worst case ≈ $7.40/user/month (150 typed builds + 150 floor meal photos) vs the plan's ~$2 → PO decision. Integrator TODO after merge: (a) Holt's floor out-of-credits line in `ask-outcome.ts` (use `aiFloorUsedLine`); (b) `admin_ai_health` counts floor uses (`coach_ai_spend.waiver`) — on top of 0271; (c) stale weight comments in ask-turn.ts:74, pose-measure.ts:12, coach-ask/index.ts:53/272, coach-form-check/index.ts:9; (d) look at the chip on a 320pt phone. Contract §1.3's "MA3-D16" label is wrong (the table is CA-D8/D9 + the capability scope) — MA12 says so.
- 2026-11-17 — `ai/s2-gates` DONE @ `ca782455` (5 commits, 86 tests added; 6,670 / the 4 known; scripts 92 with 1 pre-existing CRLF-only failure `qa-to-ops-bugs.test.mjs`; 0271 52/52 in PGlite). Normaliser in all 9 builders (program-photo-read v22 = `same_after_normalize`, proving it). 0271: deploy record + drift table + /admin-ai "Deployed code" card + revokes 13 PUBLIC-open definers (push_register_token, is_trainer, athlete_respond/revoke_coach, 9 trainer_*; no signed-out caller anywhere, authenticated keeps its direct grant, §4 rolls back otherwise) + 80 no-op closes. Allowlisted anon-callable: report_client_error, request_testflight_invite, social_link_hit, survey_intake. Not ours: Ledger's arcade_ops_push / arcade_ops_snapshot are PUBLIC-open (PO line). Drift endpoint `GET /v1/projects/{ref}/functions/{slug}/body` (multipart, unconfirmed without the token; a non-multipart answer = `fetch_failed`). Whole-repo lint isn't clean (2,118, mostly design_reference/ + site/) → CI lints changed app files. Eval recording cost if approved: chat-safety ~$1.35 · chat-answers ~$2.22 · author ~$1.80 · kitchen ~$1.38 · form-check ~$0.50 · meal-photo $0 (no photos) ≈ $7.25. Integrator: a branch adding a test that reads a function's source must list it in `scripts/deploy-ai/functions.mjs`. The import-corpus gate FAILS for program-photo-read / workout-card-read until `ai/s2-builder` lands — on purpose.
- 2026-11-17 — merged `ai/s2-gates` (`55b137ab`) and `ai/s2-credits` (`33d5680d`) into `ai/sprint2`, no conflicts. Gate running.
- 2026-11-17 — ✅ PO accepted the ~$7.40 worst case ("Yeah keep it"): typed build stays 1, no cap. Recorded in MA12 §3.
