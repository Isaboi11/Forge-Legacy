# AI Road to 10 — Sprint 1 "the foundation": build notes + the shared contract

**Status:** 🔨 BUILDING 2026-11-17 · **Plan:** `Docs/AI-Road-To-10-Plan-v1.0.md` §2 PL-1…PL-4 · **Audit rows:** `Docs/QA/AI-Audit-2026-11-16.md`
**Base:** `feat/build11` @ `b87a2511` (Sprint 0, OTA #24). Integration branch `ai/sprint1` (worktree `C:\Users\isaia\ai-s1-int-wt`).

This file is the ONE contract the four parallel branches build against. If a branch needs to change it, it says so in
its report and the integrator decides. Nothing here is live until the PO approves the release.

---

## 0. Branches, owners, files

| Branch | Worktree | Owns (only this branch edits these) |
|---|---|---|
| `ai/s1-money` | `C:\Users\isaia\ai-s1-money-wt` | `supabase/migrations/0268_*` + `supabase/apply/pending-0268.sql` · every metered function EXCEPT coach-ask: `coach-interpret`, `coach-author`, `coach-kitchen`, `coach-form-check`, `meal-photo-read`, `recipe-photo-read`, `program-photo-read`, `workout-card-read`, `workout-tidy` · `bug-plain`, `social-plan` · their `supabase/apply/deploy-*.ts` + `scripts/build-*-deploy.mjs` · `src/domain/ai/meter-server.ts` (if it wants a shared, import-free server helper) |
| `ai/s1-ask` | `C:\Users\isaia\ai-s1-ask-wt` | `supabase/functions/coach-ask/**` + its bundle/builder · `src/domain/coach/ask-wire.ts` (status events) · `src/data/coach-ask-live.ts`, `src/data/holt-chats-live.ts` · the chat sheet's waiting/failed state |
| `ai/s1-client` | `C:\Users\isaia\ai-s1-client-wt` | every NON-chat AI data module in `src/data/*-live.ts` (timeouts + telemetry + `refunded`) · the non-chat AI screens' failed / "Not charged" / consent states · `supabase/migrations/0270_*` (atomic Holt keep) + its client wiring · `supabase/functions/recipe-link-read/**` (SSRF) |
| `ai/s1-observe` | `C:\Users\isaia\ai-s1-observe-wt` | `supabase/migrations/0269_*` · new `supabase/functions/ai-canary/**` · `/admin` AI health page · `ai_feedback` + the thumbs component and its placement · the RLS static test |

Migration numbers are ASSIGNED (verified free 2026-11-17 across trunk, the build-11 lane, every worktree and `git log
--all`; the highest anywhere was `0267`, uncommitted in the main tree): **0268** money · **0269** observe (depends on
0268's columns) · **0270** client/keep. Apply in that order.

`0267` (applied 11-17) is committed on this branch so the RLS test can see `coach_ai_config`'s lockdown.

---

## 1. The meter: reserve → model → settle (replaces spend_credits + record_usage in every function we redeploy)

### `coach_ai_reserve(p_action text)` → one row

| column | type | meaning |
|---|---|---|
| `allowed` | boolean | true = a reservation was made and the credits are held |
| `reason` | text | `'ok'` · `'not_entitled'` · `'no_consent'` · `'out_of_credits'` |
| `reservation_id` | uuid | null unless allowed. ⛔ **NEVER sent to the client** (see §1.3) |
| `credits_spent` | int | the action's weight |
| `remaining` | int | balance AFTER this reservation |
| `allowance` | int | this month's allowance (0 when not entitled) |
| `age_years` | int | server-derived from `profiles.birth_year` (this year − birth year), null when unknown |
| `minor` | boolean | the app's own rule (`isUnderAge` in `src/domain/nutrition/kitchen-rules.ts`: the year you turn 18 is still under 18). Null birth year → see that function and match it exactly |

Order inside: no auth → raise 28000 · no live `coach_ai` → `not_entitled` (no rows written) · latest
`health_consents` row with `kind='ai_sharing'` is not `granted` → `no_consent` (no rows written; any policy version
counts — re-asking for the 09-28 version is PO decision P-D9) · then the EXISTING `coach_ai_spend_credits(p_action)`
(called, not copied — never retype a live function) · unknown action still raises 22023 · allowed → insert the
reservation row → return it.

### `coach_ai_settle(...)` → one row

```
coach_ai_settle(
  p_reservation uuid, p_outcome text, p_model text,
  p_input_tokens int, p_output_tokens int, p_cache_read_input_tokens int, p_cache_creation_input_tokens int,
  p_latency_ms int, p_refund boolean
) returns table(settled boolean, refunded boolean, cost_usd numeric, remaining int)
```

- Only the caller's own reservation, not yet settled, reserved in the last 30 min. Anything else → `settled=false`, no
  write (idempotent; a second settle is a no-op).
- `p_refund=true` → `coach_ai_period.spent -= credits` (floor 0) on THE RESERVATION'S period row; `refunded=true`.
- Always writes ONE `coach_ai_spend` row: action, credits = the reserved credits, model, tokens (clamped 0…5,000,000),
  `cost_usd` from the per-model rate map (§2), `uncharged = p_refund`, plus new columns `outcome`, `latency_ms`
  (clamped 0…600,000), `reservation_id`.
- `p_outcome` vocabulary (anything else is stored as `'other'`): `ok` · `upstream_error` · `upstream_unreachable` ·
  `timeout` · `refusal` · `truncated` · `not_a_program` · `unreadable` · `bad_output` · `cancelled`.

### 1.1 When a function refunds (P-D2, V-D5)

Refund (`p_refund=true`) on EVERY one of these, after a reservation succeeded:
upstream fetch threw · upstream non-2xx · our own upstream timeout fired · `stop_reason` refusal · `max_tokens` cut-off
where the answer is unusable · the model said "not a program / not a workout / no food" · the output failed to parse
or failed the server-side guard. A readable, delivered answer is `p_refund=false, p_outcome='ok'`.

Form check moves from quote → model → spend to **reserve → model → settle(refund if unreadable)**. Same promise ("an
unreadable clip costs nothing") without the month-end race the quote had (P-D6).

### 1.2 What the function returns to the app

- Failure: `{ ok: false, reason, refunded?: true, remaining? }`. Keep every function's EXISTING reason names and HTTP
  statuses, so old phones keep working. A server-side timeout is reported as the existing `'upstream_error'` reason
  plus `upstream: 'timeout'`. New reason: `'no_consent'` (old clients never reach it — they ask consent first).
- `refunded: true` whenever settle refunded. The app shows **"Not charged."** (the copy form check already uses).
- ⛔ Never any upstream text: no `detail`, no Anthropic error body, no status line (P-D8).
- Success: unchanged, plus `remaining` where it was already sent.

### 1.3 Why a user can't refund themselves

Functions run as the caller (anon key + JWT, no service key — unchanged). `coach_ai_reservation` has RLS on, no
policies, no grants: nobody can read an id. The id lives only inside the function's memory between reserve and settle.
A user calling `coach_ai_reserve` + `coach_ai_settle(refund)` directly nets zero credits and never reaches a model.
Settle happens BEFORE the answer is returned, so a client can't take the answer and then race a refund.

### 1.4 `coach_ai_record_usage` (old path, kept for old deployed functions) — P-D7

Same signature, hardened: requires a live `coach_ai`; `p_action` must be a key of `action_credits` (else 22023);
`p_credits` clamped to 0…that action's weight; tokens clamped; cost from the rate map. Once every function is
redeployed on reserve/settle, a later migration revokes it from `authenticated` (not this sprint — a deployed old
function would 42501).

---

## 2. Cost: per-model rate map + backfill (P-D5)

`coach_ai_config.model_rates jsonb`, USD per million tokens — Anthropic list prices (cached table 2026-11-03; check the
pricing page before the first monthly reconcile against the invoice):

| model key | input | output | cache read | cache write (5 min) |
|---|---:|---:|---:|---:|
| `claude-sonnet-5` | 2.00 | 10.00 | 0.20 | 2.50 |
| `claude-sonnet-5-5` | 2.00 | 10.00 | 0.10 | 2.50 |
| `claude-haiku-4-5` | 1.00 | 5.00 | 0.10 | 1.25 |
| `claude-haiku-5-5` | 0.10 | 0.50 | 0.01 | 0.125 |
| `claude-opus-5-5` | 4.00 | 20.00 | 0.20 | 5.00 |
| `claude-opus-5` | 5.00 | 25.00 | 0.50 | 6.25 |
| `default` | 2.00 | 10.00 | 0.20 | 2.50 |

Lookup: exact key → else the LONGEST key that is a prefix of the model (`claude-haiku-4-5-20251001` →
`claude-haiku-4-5`) → else `default`. One SQL function does it (`coach_ai_rate_cost(model, in, out, read, write)`),
used by settle, record_usage and the backfill. Backfill: copy today's `cost_usd` into a new `cost_usd_legacy` once
(only where null), then recompute `cost_usd` for every row. Live data 11-17: `claude-sonnet-5` 8,241 rows ·
`claude-haiku-4-5-20251001` 1,059 · `claude-haiku-4-5` 7. Expected: total drops ~1.74× ($34.71 → ~$19.93, audit P-D5).

Admin tools (P-G10): `coach_ai_record_admin_usage(p_action, p_model, tokens…, p_latency_ms, p_outcome)` — `is_app_admin()`
only, action ∈ `admin_bug_plain` · `admin_social_plan`, credits 0, its own ledger line. Never touches anyone's balance.

---

## 3. Timeouts — the server always answers before the app gives up (PL-3, P-G3)

The client's timeout is the outer wall; the function's own upstream abort sits **≥ 10 s inside it**, so a slow model
ends as a refunded `upstream_error` the app can show, never as a charge for an answer nobody saw.

| function | app timeout | server upstream abort |
|---|---:|---:|
| meal-photo-read · recipe-photo-read · program-photo-read · workout-card-read · coach-form-check | 90 s | 75 s |
| coach-kitchen · coach-interpret · workout-tidy | 60 s | 45 s |
| coach-author | 30 s (Sprint 0, B-D8 → rulebook) | 25 s |
| recipe-link-read (no model) | 30 s | its own 8 s fetch cap |
| coach-ask | Sprint 0's | B decides; same rule |

Use `supabase.functions.invoke(name, { body, timeout })` (functions-js 2.110.7 supports `timeout` and `signal`). Abort on
screen close wherever a screen can close mid-call.

---

## 4. Telemetry — every AI failure is seen (PL-4, P-G1)

Client: `src/domain/ai/ai-failure.ts` (pure) + `src/lib/ai-telemetry.ts` → `reportAiFailure({ fn, kind, reason,
status, model, latencyMs, refunded })`. Goes through `reportError` as `source: 'manual'`, so it lands in
`client_errors` AND Sentry (build 11) with the existing de-dup. `name` = `ai.<fn>.<kind>` (no spaces — it is the
grouping column). Report only real failures (`isReportableAiFailure`): not out-of-credits, not-entitled, daily limit,
or a user's own cancel.

Server: `coach_ai_spend.outcome` + `latency_ms` (§1) are what the AI health page reads.

---

## 5. What each branch reports back

Files changed · tests added (count) · the full-suite numbers from its worktree · tsc · eslint on changed files ·
anything it could NOT do and why · every PO action (SQL paste, deploy, dashboard) as a ⬜ line for the checklist.
No branch deploys, applies SQL, publishes, or calls a deployed AI function or Anthropic.
