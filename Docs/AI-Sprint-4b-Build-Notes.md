# AI Road to 10 — Sprint 4b "Holt remembers you": build notes + the shared contract

**Status:** 🔨 BUILDING 2026-11-18.
**Plan:** `Docs/AI-Sprint-4-Plan.md` (the map, §1 second table; PO decisions §5 = yes to all five) ·
`Docs/AI-Road-To-10-Plan-v1.0.md` CH-4 rows (C-G2). **Base:** `feat/build11` = GitHub `main` = `36749b02` (checked
2026-11-18). Integration branch `ai/s4b` (worktree `C:\Users\isaia\ai-s4b-int-wt`). **Builds on:**
`Docs/AI-Sprint-4a-Build-Notes.md` (branch `ai/s4a`, worktree `C:\Users\isaia\ai-s4a-int-wt`) — the caps flag, the
stream rule, the gate, byte-exact deploys, one release ask. Nothing here redesigns them.

This file is the ONE contract the lanes build against. A lane that needs to change it says so in its report; the
integrator decides. The code half of the contract is `src/domain/coach/holt-memory.ts` (caps name, fact kinds,
recap numbers, the stored-turn shape) — lanes add to it only as this file says.

## PO decisions (2026-11-18)

1. **Testing money: $5.43 left of the $30 cap.** Every live run prints its estimate first (`run.mjs --live --budget N`)
   and is logged with its real cost in the lane's report. Ask (through the integrator) before going over.
2. **Holt remembers by default, with an off switch.** Everything he keeps is visible and deletable in `/holt-memory`.
   Nothing medical is ever stored (the same filter as notes). Memory goes in Export My Data and the account wipe.
3. **Also fix the 38 ask-answers lines accepted in 4a** (`scripts/evals/baselines.json` → `ask-answers.accepted`).
   Quoted separately — ⛔ no live spend on it until the integrator says the PO approved the money.

Standing: AI is paid-only (Premium AI). The medical stop is never loosened. `@/` is type-only in domain code; bundled
function code is import-free. ⛔ Form check belongs to another session (same file list as 4a §0).

---

## 0. Lanes, owners, files

| Branch | Worktree | Owns (only this lane edits these) |
|---|---|---|
| `ai/s4b-memory` | `C:\Users\isaia\ai-s4b-memory-wt` | **Lane A — memory: rolling recap + long-term facts + the switch + 0278 + export.** `supabase/functions/coach-ask/**` · `supabase/apply/deploy-coach-ask.ts` + its build script · `src/domain/coach/ask-tools.ts`, `ask-wire.ts`, `ask-turn.ts`, `chat-history.ts` · `src/domain/coach/holt-memory.ts` (the contract module — A fills the bodies) · `src/domain/coach/holt-notes.ts` + `src/data/holt-notes-live.ts` · `src/data/holt-chats-live.ts` (summary + recap calls) · new `src/data/holt-memory-live.ts` (the switch, forget-everything) · `src/app/holt-memory.tsx` · Export: `src/data/export-live.ts`, `src/domain/settings/export-*.ts`, the export block of `src/app/account-settings.tsx` · `supabase/migrations/0278_*` + `supabase/apply/pending-0278.sql` · `scripts/evals/suites/memory.mjs` (new) + `chat-summary.mjs` · then (step 2, money-gated) the 38 ask-answers lines: the caps prompt rule + `baselines.json` + re-records. |
| `ai/s4b-chats` | `C:\Users\isaia\ai-s4b-chats-wt` | **Lane B — past chats: store, browse, search, reopen, continue + 0279.** new `src/domain/coach/past-chats.ts` (pure: stored shape, title, search text, merge/continue rules) · new `src/data/holt-past-chats-live.ts` · new `src/app/holt-chats.tsx` + `src/app/holt-chats/[id].tsx` (or one route with a param — B's call, the route `/holt-chats` is the contract) · `src/lib/coach-thread.ts` + `src/domain/coach/thread-lifecycle.ts` (the chat id + recap in the stored place) · `supabase/migrations/0279_*` + `supabase/apply/pending-0279.sql`. |

**CoachChatSheet.tsx is shared this time** (6.8k lines; both lanes need a mount). Rule: each lane's edit there is a
few lines calling ONE hook from its own file — A `useChatRecap(...)` (in `src/components/forge/useChatRecap.ts`,
A's), B `usePastChatSync(...)` + a "Past chats" header button (in `src/components/forge/usePastChatSync.ts`, B's).
List every line in the report; the integrator resolves.

**Shared files** (a one-line edit is allowed; list each in the report): `src/app/_layout.tsx` (a route line) ·
`src/domain/coach/holt-memory.ts` (append only, never rename) · `src/domain/ai/model-rates.ts` / model-config
defaults (if a new fn row is needed — it should not be).

### Migration numbers (verified free 2026-11-18 across `git log --all` and every worktree's working tree; highest used = `0277`)
**0278** memory (A) · **0279** past chats (B). Apply order 0278 → 0279. Each goes through the `migration` skill: read
any live function you touch first (`pg_get_functiondef`, Supabase MCP, read-only), ⛔ never retype one; RLS on;
revoke from `public` AND `anon`; `athlete_id … references auth.users(id) on delete cascade` (that IS the account
wipe — `delete_my_account()` deletes `auth.users`); a §3 verification block that predicts its own result. Lanes
AUTHOR; the PO pastes.

---

## 1. Shared interfaces

### 1.1 The capability flag — old phones never see memory
- A new app sends `caps: ['actions_v1', 'memory_v1']` (`HOLT_MEMORY_CAPS` in `holt-memory.ts`). `coach-ask` reads
  `earlier`, the `recap` mode and the facts half of `summarize` **only** with `memory_v1`.
- ⛔ **The system blocks and the tool list are byte-identical with and without `memory_v1`.** The recap travels in
  the MESSAGES (a bracketed context block ahead of the history), never in a system block — so the cached prefix, and
  every recording under the current prompt hashes (ask-safety, ask-answers, ask-actions), stays valid. Test: the
  prompt hash and tool names for `['actions_v1','memory_v1']` with no `earlier` equal `['actions_v1']`'s; an old body
  (no caps) still equals v28; `ask-wire-old-client` stays green.
- Old phones: summarize keeps its old reply shape; the only change they can see is the off switch (§1.4) — a person
  who turned memory off on a new phone is not remembered from an old one either.

### 1.2 In-chat memory — the rolling recap (CH-4, C-G2) — lane A
- The ask still carries the last `CHAT_HISTORY_TURNS` (8) spoken turns. Turns older than that are folded into ONE
  recap of this chat, ≤ `RECAP_MAX_CHARS` (600), kept in the thread's stored place (`ThreadPlace.recap =
  { text, through }`, `through` = how many spoken turns, counted from the start, it covers).
- When: after a reply finishes, if ≥ `RECAP_BATCH` (4) spoken turns have fallen out of the window and are not yet in
  the recap → fire-and-forget `recapChat(prior, turns)` → `coach-ask` `mode: 'recap'` (Haiku 5.5 — the summary
  model, `fn` row as summary uses), metered as action `'summary'` (0 credits, Premium AI only — no meter change).
  A failed or refused recap leaves the old one; the ask goes on without it. Never blocks a question.
- The recap is written from turns that already passed `askHistory`'s stop rule, and the server drops every sentence
  the medical guard catches before returning it (the summary's own rule). The ask sends it as `earlier` (≤ 800
  chars on the wire, server trims); the server runs the guard on it AGAIN before it reaches the model.
- The recap is part of THIS chat, so it runs even with memory switched off (it is the same words the window already
  sends), and it is stored only where the chat is (device thread; lane B's chat row).

### 1.3 Long-term facts — lane A
- Facts ARE `holt_notes` (0204): one line, 2–80 chars, cap 20 (unchanged — no trigger change), visible, editable,
  deletable at `/holt-memory`, already sent in every ask's brief (the brief's text does not change).
- `0278` adds `holt_notes.kind` (nullable; `schedule · gym · like · dislike · avoid · goal · other` — `FACT_KINDS`)
  so `/holt-memory` can group them.
- **Who keeps them:** the end-of-chat `summarize` call (Haiku, already runs, 0 credits) — with `memory_v1` it returns
  JSON `{summary, facts: [{kind, text}]}` given the notes already stored (no duplicates). The SERVER writes the facts
  as the athlete (their JWT, RLS), `source: 'chat'`, after every fact passes: `medicalRoute` + `scanReply` + the
  memory filter (`keepFact` in `holt-memory.ts`: no body part, symptom, condition, injury, medication, pregnancy,
  diagnosis or weight/body-shape words; an injury said in passing survives ONLY as "Avoid <movement>" with no reason).
  ⚠ What the athlete SAID, never what the model inferred — a fact the chat does not contain is a failure.
- No Confirm card (PO: remembers by default) — but never silent: `/holt-memory` marks new ones ("New · from a chat on
  <date>"), and the next time the sheet opens after a chat kept facts, ONE line: "Holt kept 2 things from your last
  chat · See" (→ `/holt-memory`). The in-chat `remember_note` card (4a) stays as is.
- Full (20): the server keeps what fits; `/holt-memory` says "Full — delete one to let Holt keep new things".

### 1.4 The switch — lane A (`0278`)
- `holt_memory_prefs (athlete_id pk default auth.uid() → auth.users on delete cascade, remembers boolean not null
  default true, updated_at)`, owner-only RLS. No row = ON (PO: by default).
- **OFF means Holt keeps nothing new and reads nothing old:** no summary, no facts (server checks the row in
  `summarize` — every app version), no past-chat rows saved (lane B checks `getRemembers()`), the app sends no notes
  in the brief, and `get_past_chats` answers that memory is off. What is already kept stays until deleted — the
  screen says so and offers **Forget everything** (notes + summaries + past chats, one confirm).
- The in-chat recap and the device thread are unaffected (§1.2).

### 1.5 Past chats (CH-4) — lane B (`0279`)
- `holt_chats (id uuid pk — made on the phone at the chat's first athlete line, athlete_id → auth.users on delete
  cascade, title varchar(80), turns jsonb, recap text ≤ 800, recap_through int, summary text ≤ 500 null, search_text
  text, turn_count int, started_at, updated_at)`. Owner-only select/insert/update/delete; anon + public revoked; a
  size check on `turns` (≤ 200 turns / ≤ 96 KB) and a trim trigger keeping the newest **100** chats per athlete
  (advisory lock per athlete, as 0204's cap).
- **What is stored** = `storedTurns(thread)` (`holt-memory.ts` shape, B's body in `past-chats.ts`): athlete + Holt
  lines and the app's bracketed card notes (as `summaryHistory` writes them) — ⛔ never a stopped line, never the
  reply to one, never a stop card's topic; run through `withoutStoppedTurns` like every history. Read back through
  the same filter (a chat stored before a stop was widened is read with TODAY's guard, C-I5).
- **Title** = the first athlete line, ≤ 60 chars, cut at a word (no model call). **Search** = `search_text` (lower-case
  words of every stored line) with `ilike` (or `pg_trgm` if the extension is already on — read-only check), newest
  first, 30 a page.
- **When it saves:** debounced upsert after each finished reply and on chat end, only when `getRemembers()` is true.
  The end-of-chat summary (A) comes back from `summarizeChat` (its return value — §1.6) and is written onto the row.
- **Browse** `/holt-chats` (from `/holt-memory` and a "Past chats" button in the chat sheet's header): search box,
  list (title, date, summary or first Holt line, turns), delete one. **Open** shows the transcript read-only with
  **Continue this chat** → the current chat ends as usual (summary, save), the stored turns + recap + chat id become
  the thread, the sheet opens on it; the next save updates the SAME row. Works on web (no native-only API).
- Device: sign-out and account delete already clear the thread? B verifies `clearThread` runs on both and adds it if
  not (that and the server cascade are the account wipe).

### 1.6 Cross-lane stubs (committed by the integrator so every lane compiles alone; the owner replaces the body, never the signature)
- A → B: `src/data/holt-memory-live.ts` `getRemembers(): Promise<boolean>` (no row / failure → `true`),
  `setRemembers(on)`, `forgetEverything()`; `src/data/holt-chats-live.ts` `summarizeChat(...)` now returns
  `Promise<{ summary: string | null; kept: number }>` (today's callers ignore it).
- B → A: `src/data/holt-past-chats-live.ts` `fetchExportChats(): Promise<ExportChat[]>`, `deleteAllPastChats():
  Promise<boolean>`; `PAST_CHATS_ROUTE = '/holt-chats'` in `holt-memory.ts`.
- `ThreadPlace` gains optional `chatId?: string` (B) and `recap?: { text: string; through: number }` (A);
  `readThreadPlace` keeps both when well-formed.

### 1.7 Export My Data + account wipe — lane A
- Export adds `holt-memory.csv` (kind, text, kept, source) · `holt-chat-summaries.csv` · `holt-chats.csv` (chat,
  started, who, text — from B's `fetchExportChats`). Any of them present ⇒ the ZIP path; the toast counts them.
- Account wipe = the cascade (both new tables reference `auth.users`); a migration test asserts it. The device thread
  (B, §1.5).

### 1.8 Safety — absolute (unchanged bars)
- Holt's code guard runs before every credit and every model call (as now), on the recap both ways, on every fact,
  and on everything a chat row stores.
- `ask-safety` (≥ 0.95, let-through ≤ 5) and `chat-safety` keep their absolute bars; import 57/61, Kitchen 36/36,
  ask-actions (0 actions on stops, right action ≥ 0.90) must not drop. With §1.1's byte-identical rule they need NO
  re-record for memory — the hash test proves it ($0). The step-2 prompt fix DOES change the prompt → full re-record.
- New `memory` suite (A): Haiku — facts kept from chats (right kind, the athlete's words, nothing invented, nothing
  medical, injuries only as "Avoid X") and recaps (keep the decisions/numbers the athlete gave, no medical sentence);
  Sonnet — a long chat where the answer is only in `earlier`. Bars: **0 medical facts or recap sentences (absolute)**,
  **0 invented facts (absolute)**, recall ≥ 0.85 (target, printed).

### 1.9 Telemetry
`holt_memory` {event: facts_kept | fact_deleted | switch_off | switch_on | forget_all, n?} and `holt_past_chat`
{event: opened | searched | continued | deleted} — names and counts only, never text (3a's allowlist rule).

---

## 2. Rules every lane follows (Sprints 0–4a)
- Work only in your worktree and branch. Edit only your files. Commit small, house style:
  `feat(area): one plain sentence of what the athlete gets (AI Road to 10 Sprint 4b, CH-4)`, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Before reporting: `node --test` on every touched area (known src failures: the 4 + form check's stale paste copy —
  name them), `npx tsc --noEmit` = 0, eslint = 0 on changed files (strict react-hooks: no sync setState in effects,
  no ref.current in render). Both themes (layout both, colour one), engraved icons only, VoiceOver labels.
- ⛔ No deploys, no OTA, no SQL applied, no push, no `git stash` of the whole tree. Read-only Supabase MCP is fine.
- ⛔ Live model calls only inside your cap: print the estimate, run, record the real cost. The key is
  `ANTHROPIC_API_KEY` in `C:\Users\isaia\OneDrive - qest4.com\ForgeLegacy\.env.local` — pass it via env, never print
  or commit it.
- An old phone must never misread a new response: prove it with an old-client test.
- Keep `Docs/AI-Sprint-4b-<lane>-Report.md` in your branch: commits, tests, costs, shared-file edits, open items, and a
  "▶ RESUME HERE" list so a usage pause costs time, not work.

## 3. Budget log (integrator)
Left at start: **$5.43** of $30. **PO 2026-11-18: cap raised to $37 (+$7) for the 38 fix** → ~$12.43 to spend.
| Run | Lane | Estimate | Real |
|---|---|---|---|
| memory suite (Haiku facts + recap, Sonnet `earlier`), 1 run + offline re-grade | A | ~$1.00 | $0.066 |
| chat-summary re-run (new summary prompt, Haiku) | A | ~$0.10 | $0.0013 |
| step 2 round 1 subset (148 ids, Sonnet) — 35/38 back, 23 gained lost → stopped | A | $0.87 | $0.93 |
| step 2 — the 38: subset (38 + 110 gained) + full re-record ask-answers / ask-safety / ask-actions | A | ~$10.35 | ✅ PO approved 11-18 (cap → $37) |

## 4. Integrator (this session)
- Merge B → A into `ai/s4b` (A last: its export reads B's chats and its screen links B's route), rebuild the
  `coach-ask` bundle, the full gate (`--changed 36749b02`), web port onto `ai/s4b-web` (off `web/squad-comment-preview` — see the log),
  ONE release ask: SQL `0278` → `0279` on the PO's clipboard · `coach-ask` byte-exact · OTA to build 11 only from a
  clean worktree with its own `npm ci`, fingerprint MATCH `4d98eb22` · ff `feat/build11` + GitHub `main` · web.
  Order: SQL → function (safe for old phones by §1.1) → OTA → web.

## 5. Log
- 2026-11-18 — `ai/s4b` + 2 lane worktrees off `36749b02`; contract written; stubs committed.
- 2026-11-18 — PO: yes to the $7 cap raise ($30 → $37) for the 38 ask-answers lines. Step 2 is unblocked once step 1 is done (subset first, full re-records only if the subset holds).
- 2026-11-18 — `ai/s4b-chats` merged (`8aa5b72b`): 0279 `holt_chats` (+ `preview` column, trigram index — pg_trgm 1.6 already on), `past-chats.ts` store rules, `/holt-chats` (search, Continue), sign-out clears the device thread. tsc 0, eslint 0, src 7161 / 5 known fails, web export built. Integrator rulings: `preview` column OK · Premium-AI-only OK (AI is pay-only) · telemetry prop is `kind` not `event` (`event` isn't in ALLOWED_PROP_KEYS) — lane A's `holt_memory` must use `kind` too. $0.
- 2026-11-18 — ⚠ Another session shipped a build-11 OTA + web (squad comment previews + who-trained-today faces): `feat/build11` → `0eac343b` (+2 squad commits on 36749b02); web from `web/squad-comment-preview` (= `ai/s4a-web` `ab9ba77b` + those 2); SQL `0280` APPLIED (next free 0281 — ours stay 0278/0279). ⛔ Release: merge `feat/build11` HEAD into `ai/s4b` before the OTA; base the 4b web port on `web/squad-comment-preview`, not `ai/s4a-web`.
- 2026-11-18 — lane A step 1 done (`cfd1e6dc`): memory_v1 byte-identical prompt proven, 0278 authored, memory 30/30 (0 medical, 0 invented), chat-summary 18/20, gate PASS. Step 2 round 1: subset 122/148 — 35 of 38 back, 23 of 110 gained lost (13 experience-in-words, 6 ranges, 2 goal/date, 2 limits). Remember-note card gated on the switch (`1e74058b`). Round 2 sent: narrower rule, grader unchanged, PASS = 35 kept + ≤ 3 gained lost; else revert both rule commits and ship with the 38 accepted. No third round.
- 2026-11-18 — step 2 round 2: memory grader `r-changed-mind` tightened ("replaces the earlier 3" is not invented; `9ce5224b`). Under the round-2 rule: subset 145/148 (36 of 38 back; A0265 + A1131 corpus/app causes; 1 gained lost A1033 → care rule), ask-safety 683/710 (0.962) let-through 2 (S0357, S0421), ask-actions 84/86 0 on stops, memory 30/30. Step-2 real $4.64 (lane A total $4.71). Integrator raised the step-2 split to \$11.20 (inside the PO's \$37) for the last 5 ask-answers shards (~\$6.2).
