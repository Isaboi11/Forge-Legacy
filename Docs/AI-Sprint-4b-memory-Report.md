# AI Road to 10 — Sprint 4b, lane A "memory" (CH-4) — report

**Branch** `ai/s4b-memory` · worktree `C:\Users\isaia\ai-s4b-memory-wt` · base `51f85e75` (feat/build11 `36749b02` + the
integrator's stubs). **Contract** `Docs/AI-Sprint-4b-Build-Notes.md` (Lane A row, §1.1–1.4, §1.7, §1.8 memory) +
`src/domain/coach/holt-memory.ts`. Nothing deployed, applied, published or pushed. SQL authored only.

## ▶ RESUME HERE
1. ✅ Step 1 built and committed (below). Gate `node scripts/evals/gate.mjs coach-ask` = PASS on the step-1 commits.
2. Step 2 (the 38) — the narrowed rule is the LAST commit, on its own, so it can be held back. ⛔ Not run live (PO money).
   When the integrator says the money is approved, run §Step 2 "Run plan" in order. Until then the step-2 commit makes
   ask-safety / ask-actions / ask-answers / memory STALE (it changes SYSTEM_V1) — hold it back or re-record.
3. Integrator: merge B first (A's export reads `fetchExportChats`, Forget everything calls `deleteAllPastChats`, the
   screen links `/holt-chats`), then resolve the CoachChatSheet lines below.

## Commits
See the final list in the lane's hand-off; each is `feat|fix(area): … (AI Road to 10 Sprint 4b, CH-4)`.

## What was built

**§1.1 caps `memory_v1`** — `HOLT_MEMORY_CAPS`; the app sends `caps: ['actions_v1','memory_v1']` (coach-ask-live,
holt-chats-live `MEMORY_CAPS`). coach-ask reads `earlier`, `mode: 'recap'` and the facts half of `summarize` only with
it. ⛔ System blocks and tool lists are untouched: the recap rides in the messages (`withEarlier` — it takes the opener
placeholder's place, or leads the first user turn). **Proof** (`coach-ask-memory.test.mjs`): caps `[actions_v1,
memory_v1]` with no `earlier` sends the WHOLE request byte-identical to `[actions_v1]`'s (system sha, tool names, tool
bytes, messages); with `earlier` only messages[0] differs; no caps (or memory_v1 alone, or a stray `earlier`) is v28
(the frozen tool list + pinned SYSTEM sha `b3cb1ee8…`); a 4a body's `earlier` is ignored. `ask-wire-old-client` green.
Offline: ask-safety `81f53462bb3b` 685/710, ask-actions `ca61e0796507` 83/86, ask-answers `5a55ed59584e` 1021/1158 —
the 4a hashes, still GRADED, no re-record.

**§1.2 rolling recap** — `mode: 'recap'` (Haiku 5.5 via the `coach-ask:summary` config row, metered `p_action
'summary'`, 0 credits, Premium AI gate; a 4a body asking for it is the old 400). History through
`withoutStoppedTurns` (+ the minor's guard for a profile minor), the prior recap and the reply cleaned sentence by
sentence (`cleanRecap` + `memoryStops`), ≤ 600; returned only, never stored server-side. `earlier` on an ask (≤ 800,
guarded again). Client: pure `planRecap` / `liveRecap` / `earlierFor` in chat-history.ts (fold once ≥ 4 spoken turns
fell out of the 8-turn window uncovered; never mid-stream; a recap is void when the thread has fewer turns than it
covers), `recapChat` in holt-chats-live.ts, `useChatRecap` (src/components/forge/useChatRecap.ts) — restores
`ThreadPlace.recap`, folds fire-and-forget, a failure keeps the old one and is not retried for the same turns, a new
chat never inherits an old recap (first-line key). Runs with memory off (it is this chat).

**§1.3 long-term facts** — summarize + memory_v1: ONE Haiku call, `SUMMARY_SYSTEM_V1` (4a's summary rules verbatim +
the facts section), structured output `MEMORY_SUMMARY_SCHEMA` `{summary, facts:[{kind,text}]}`, user turn
`memorySummaryTurn` (what is already kept, then the chat), max_tokens 600. The server writes the facts as the athlete
(JWT/RLS), `source 'chat'`, `kind`, one insert at a time, after `factsToKeep`: `keepFact` (one line 2–80; unknown kind →
other; ⛔ any body part / symptom / injury / condition / mental health / medication / supplement / pregnancy / diagnosis /
weight / shape word ⇒ dropped, training phrases like "leg day", "shoulder press", "hip thrusts" allowed; an avoid with a
reason ⇒ dropped; a one-off ("this week", "today", "for now") ⇒ dropped) + `memoryStops` (guard + discomfort + scan +
the same word lists) + duplicates by subject (`factSubject`: "Avoid burpees" = "Hates burpees") + ≤ 5 per chat + the
cap (20 − kept). Before 0278: no `kind` column → kept without it. Unreadable note list → no facts (summary still saves).
Reply adds `summary` + `kept` for memory_v1 only; old phones get `{ok, saved, reason?}` and 4a's prompt, byte for byte.
`summarizeChat` returns `{summary, kept}`; a kept > 0 stores a one-shot notice → "Holt kept N things from your last
chat · See" (`HoltKeptLine`) on the next sheet open.

**§1.4 the switch** — `0278`: `holt_notes.kind` (nullable, checked against FACT_KINDS) + `holt_memory_prefs`
(athlete_id pk → auth.users ON DELETE CASCADE, remembers default true, owner-only RLS ×4, revoked public + anon).
Server (every app version): summarize reads the row first — off ⇒ `memory_off`, unreadable (not "no table") ⇒
`memory_unknown`, nothing reserved/called/kept; `get_past_chats` answers `PAST_CHATS_MEMORY_OFF` and reads nothing.
App: `holt-memory-live.ts` (`getRemembers` 60 s cache, failure ⇒ on; `setRemembers` upsert; `forgetEverything` deletes
notes + summaries + lane B's `deleteAllPastChats`); `fetchBriefNotes` (no notes in the brief or the builder when off);
summarizeChat not sent when off.

**/holt-memory** — the switch (SettingsToggle, honest copy both ways), facts grouped by kind with "New · from a chat on
<date>" (until the screen is next seen; per-device `fl_holt_memory_seen_v1`) / "From a chat on <date>", "Full — delete
one to let Holt keep new things." at 20, Recent conversations (as before), a "Past chats" row → `PAST_CHATS_ROUTE`,
Forget everything with one ConfirmSheet. Role tokens only (both themes, no literal colour), engraved icons (history,
chevron-right, trash, book, close), VoiceOver labels/hints, headings marked. Pure rules in
`src/domain/coach/holt-memory-screen.ts`.

**§1.7 export** — `fetchExportHolt` (notes with kind, falling back before 0278; summaries; `fetchExportChats`),
`export-holt.ts` → `holt-memory.csv` / `holt-chat-summaries.csv` / `holt-chats.csv` (only those with rows); any ⇒ ZIP;
the toast adds " · N things Holt kept · M chats with Holt". Account wipe: the cascade, asserted by
`migration-0278.test.mjs` and by §2 of the paste (and proven in PGlite).

**0278** — `supabase/migrations/0278_holt_remembers_you.sql` + `supabase/apply/pending-0278.sql` (§1 verbatim, §2
raises, §3 predicted from the live DB read 11-18: no kind column, no prefs table, 0 notes). Run twice in PGlite: §3 =
the prediction both times; a bad kind refused; deleting the auth row took the prefs row and the notes. No function
created or changed (none touched → no `pg_get_functiondef` needed).

**Bundle** — `supabase/apply/deploy-coach-ask.ts` rebuilt from source (`node scripts/build-coach-ask-deploy.mjs`);
`coach-ask-source` green. Private regexes in holt-memory.ts prefixed `FACT_` (two collided with medical-routing's).

## Tests
- src `node --test "src/**/__tests__/*.test.mjs"`: **7176 tests, 7171 pass, 5 fail**; failures = the 4 known (consent crm-live/
  bug-plain, migration-0234 ×2, onboarding complete_onboarding) + form check's stale paste copy `coach-form-check-source`
  — the same 5 as base `51f85e75` (7115 / 5 fail). (One run caught ask-outcome's pin on the sheet's stream options —
  `earlier` now sits after `signal`.)
- New: coach-ask-memory (17), holt-memory (13), chat-recap (9), migration-0278 (6), holt-memory-live (6), export-holt
  (5), holt-chats-live +4, holt-notes +1, scripts/evals memory-suite (6). Pins updated: coach-ask-source (body.history 3
  reads), holt-actions-mount (caps line).
- `npx tsc --noEmit` 0. eslint 0 on every changed file (the one `jsr:` import/no-unresolved in coach-ask/index.ts is
  pre-existing on base).
- `scripts/evals/__tests__` 36/36 + 6.

## Live runs (cap $1.20)
| Run | Estimate | Real |
|---|---|---|
| memory (30 cases: 16 fact + 8 recap Haiku 5.5, 6 earlier Sonnet 5.5), `0c5c7766f567` | $0.11 (runner measured $0.10 — it prices Haiku cases at Sonnet) | **$0.066** |
| chat-summary (20, Haiku 5.5, the memory summary), `0d5d0b3d13ae` | $0.06 | **$0.0013** |
| **Total** | | **$0.067** |

## Eval results vs bars
- **memory 30/30 (mean recall 1.000)**, 0 medical kept (absolute ✓), 0 invented (absolute ✓). First grade was 28/30
  with 2 invented: "Hotel gym with dumbbells only this week" (a one-off) and "Avoid burpees" beside a kept "Hates
  burpees" → fixed in code (one-off filter, subject dedupe), re-graded on the same recordings (the fix is server code,
  not prompt). Model proposals the filter dropped: none medical were proposed in this run.
- **chat-summary 18/20 (0.90 ≥ 0.85)**. Fails: `home-equipment` = grader artefact (THIRD_PERSON matches "they" =
  the dumbbells); `pr-celebration` = the existing guard stops "You hit a 315 deadlift today and set your next goal at
  365." (`medicalRoute` → care — pre-existing over-stop, not this lane's; the same sentence would be dropped from 4a's
  summary too).
- Gate `coach-ask` (step-1 tree): PASS — ask-safety, ask-actions, ask-answers (38 still accepted), chat-summary, memory.

## Shared-file / cross-lane edits
- **CoachChatSheet.tsx (shared with B) — 10 lines:** 2 imports (`useChatRecap`, `HoltKeptLine`); `fetchNotes` →
  `fetchBriefNotes` (import + the one call in `loadNotes`); `const chatRecap = useChatRecap(thread, { enabled:
  premiumAi });` (after `thread`'s useState); the save effect `void saveThread(thread, { mode, constraints,
  ...(chatRecap.recap ? { recap: chatRecap.recap } : {}) }); }, [thread, mode, constraints, chatRecap.recap]);` (⚠ B
  adds `chatId` on the same line — merge both); `earlier: chatRecap.earlier,` in `streamCoachAsk`'s options; the kept
  line as the first child of the thread ScrollView (`{chatRecap.kept ? <HoltKeptLine … onSee={() => { … handOff();
  router.push('/holt-memory'); }} /> : null}`). Pinned by chat-recap.test.mjs (8 `chatRecap.` uses).
- `src/data/coach-ask-live.ts` (no 4b owner): caps + `earlier` option. `src/data/holt-training-live.ts` (no owner):
  `fetchBriefNotes`. `scripts/deploy-ai/functions.mjs`: coach-ask tests += 3, suites += memory.
  `scripts/evals/suites/ask-actions.mjs`: `capsRounds` takes `earlier` (absent = the 4a request; no hashed constant
  changed). Tests: coach-ask-harness (per-table rows/errors), coach-ask-source, holt-actions-mount pins.
- For lane B: `useChatRecap().restore(recap)` hands a continued chat's recap to the sheet (B's Continue path) — the
  hook only reads the stored place when the sheet mounts.

## Contract deviations / open items
1. Telemetry keys: `holt_memory` uses the analytics allowlist's own `kind` (event) + `count` (n) — `event`/`n` are not
   allowlisted keys. Lane B's `holt_past_chat` will need the same.
2. The 4a in-chat `remember_note` card still saves on Confirm when memory is off (lane C's executor). The athlete tapped
   it, but the switch copy says "keeps nothing new" — integrator: gate that executor on `getRemembers()` or soften copy.
3. `memory_unknown`: a prefs read that fails for a reason other than "no table" keeps nothing (privacy first).
4. Old phones' summary (4a path) still keeps guard-clear body sentences like "…takes creatine" — unchanged on purpose
   (byte-for-byte old path); the memory path drops them.
5. `medicalRoute` stops "…set your next goal at 365." as care (chat-summary pr-celebration) — a guard over-stop for
   whoever owns medical-routing.
6. `forgetEverything()` returns false until lane B's `deleteAllPastChats` lands (stub).

## Step 2 — the 38 accepted ask-answers lines ($0, offline)
(filled in by the step-2 commit)
