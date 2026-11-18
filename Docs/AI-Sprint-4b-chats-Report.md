# AI Road to 10 — Sprint 4b, lane B "past chats" (CH-4) — report

**Branch** `ai/s4b-chats` · worktree `C:\Users\isaia\ai-s4b-chats-wt` · base `51f85e75` · **$0 lane** (no live model calls).
Contract: `Docs/AI-Sprint-4b-Build-Notes.md` §1.5 / §1.6 (B side) / §1.9.

## ▶ RESUME HERE
1. Nothing is half-built. Lane B is complete on its side; what is left is integration (below) and the PO's paste of 0279.
2. Integrator: merge B before A (A's export calls `fetchExportChats`, A's `/holt-memory` should link `/holt-chats`).
3. Integrator: if lane A rewrites the sheet's `whenThreadEnds` effect, its callback must still **return** `summarizeChat(...)`'s
   promise (or a `.then` that returns the `SummarizeResult`) — that is how the summary reaches the past-chat row.
4. After 0279 is pasted: read §3 against the prediction in `supabase/apply/pending-0279.sql`'s header.

## Commits (oldest first)
1. `a66a2efa` `feat(db)` — 0279 + `pending-0279.sql` + `src/app/__tests__/holt-chats-migration.test.mjs`.
2. `572e4c26` `feat(coach)` — `src/domain/coach/past-chats.ts` + `past-chats-store.ts` + their tests.
3. `5334ec9e` `feat(coach)` — `src/lib/coach-thread.ts`, `src/domain/coach/thread-lifecycle.ts`, sign-out clear in `src/lib/auth.tsx`, `src/lib/__tests__/past-chats-thread.test.mjs`.
4. `001006a6` `feat(coach)` — `src/data/holt-past-chats-live.ts`, `src/components/forge/usePastChatSync.ts`, `src/app/holt-chats.tsx`, the sheet mount + header button, the route line.
5. `docs(ai)` — this report.

## What was built
- **0279 `holt_chats`** — id uuid pk (made on the phone; `gen_random_uuid()` default only as a fallback), `athlete_id` default
  `auth.uid()` → `auth.users` ON DELETE CASCADE, `title varchar(80)`, `turns jsonb`, `preview varchar(160)` (**added** — see
  contract changes), `recap text` (≤ 800 check), `recap_through int`, `summary varchar(500)`, `search_text`, `turn_count`,
  `started_at`, `updated_at` (server clock, trigger `holt_chats_touch`). Checks: ≤ 200 turns and `octet_length(turns::text)` ≤
  98304. Owner-only select/insert/update/delete; `revoke all … from public, anon`; trim trigger `holt_chats_keep_hundred` (newest
  100, `pg_advisory_xact_lock` per athlete, invoker). Index `(athlete_id, updated_at desc)`; trigram GIN on `search_text` —
  **pg_trgm 1.6 is installed in `public`** (read-only `SELECT`, 2026-11-18), and the index is guarded on the extension anyway.
  Paste copy with §2 (raises) and §3 (predicted: `table_exists true · rls_on true · policies 4 · triggers 2 ·
  cascades_with_account true · size_check true · trigram_index true · anon_can_select false · authenticated_can_select true ·
  rows 0`). **Not applied.**
- **`past-chats.ts` (pure)** — `storedTurns(thread)`: athlete + Holt lines + `summaryHistory`'s bracketed notes (text pinned
  identical by test); ⛔ a `stopped` line, the `stop` card and everything after them up to the athlete's next line are dropped,
  then `withoutStoppedTurns` runs with notes counted in Holt's column (`guardStored` — with `note` as its own role the guard
  would reset at a note and keep the Holt line after it); Holt's lines before the first athlete line (greeting/intro) and
  replies still streaming are not stored. `chatTitle` (60 at a word), `chatPreview`, `searchText` (lower-case words, each once),
  `searchTerms` + `ilikePattern`, `fitTurns` (≤ 200 turns, under 92 KB measured with a per-turn allowance for `jsonb::text`'s
  spacing, oldest first, starting on an athlete line), `readBack` (shape check + today's guard), `guardProse` (recap/summary
  sentence filter), `threadFrom` / `mergeContinued` (continue), `pastChatRow`, `rowSignature`.
- **`past-chats-store.ts`** (injected client, node-tested) + **`src/data/holt-past-chats-live.ts`** — `listPastChats({query,page})`
  (30 a page, newest first, one `ilike` per word, `{ ok:false }` on failure — never an empty list), `getPastChat(id)`,
  `savePastChat` (upsert on id; checks `getRemembers()` every save; `'off'` / `'unavailable'` before 0279 / `'failed'`),
  `writePastChatSummary`, `deletePastChat`, `deleteAllPastChats`, `fetchExportChats` (oldest first, one line per stored turn,
  through today's guard, `[]` on failure). A deleted id is remembered for the app's life and never saved back (the chat on the
  phone may be the one just deleted); `deleteAllPastChats` also forgets the chat currently on the phone.
- **Device thread** — `coach-thread.ts`: chat id minted at the first athlete line (`ensureChatId`, also in `saveThread`), held
  with the place and merged into every place written (`withHeldPlace`), restored only with a restored thread, cleared by
  `clearThread`; `afterThreadEnds(fn)` (second slot beside `whenThreadEnds`) gets `{ turns, place, outcome }` where `outcome` is
  whatever the summariser returned (never rejects); `continueThread(turns, place)`. `ThreadPlace` gained optional
  `continued?: { head: StoredTurn-shaped[] }` (B's file).
- **`usePastChatSync(thread, enabled)`** — debounced (1.5 s) upsert after each finished reply (never while a reply streams),
  serial save chain (an in-flight save can't land after the final one), one last save on chat end, then the summary from the
  outcome written onto the row. `continuePastChat(chat)`, `trackPastChat(kind, count?)`.
- **`/holt-chats`** (one route, `?id=` for the transcript) — search box (350 ms settle), list (title, date, summary or Holt's
  first answer, line count, Delete behind a ConfirmSheet), "Show older chats" paging, loading / **failed (Try again — never drawn
  as empty)** / empty (with and without a query; Premium-AI wording for non-Premium) states, a line when "Holt remembers" is off.
  Transcript: read-only bubbles (You / Holt), app notes as small italic lines, the summary when there is one, **Continue this
  chat** (ends the phone's chat as usual, writes this one as the thread, `openCoach()` + `router.navigate('/')`), Delete.
  Not found = "This chat isn't here any more" (deleted or trimmed). Role tokens only, `ScreenBackground`, engraved icons
  (`search`, `chevron-right`, `trash`, `history`), VoiceOver labels on every control and line. No native-only API.
- **Account wipe, device half** — verified: `resetFirstRunFlags` (device handover) already ran `clearThread`; plain **sign-out did
  not**. Added `await clearThread()` to `signOut` in `src/lib/auth.tsx` (Delete Account comes through `signOut`) — silent, never
  `endThread`. Test pins both. Server half = the cascade (asserted in the migration test and §2).
- **Telemetry** — `track('holt_past_chat', { kind: 'opened' | 'searched' | 'continued' | 'deleted', count? })`.

## How "Continue this chat" works (for the integrator)
The stored turns become `me` / `holt` turns (notes are NOT turned into `saved` turns — that turn draws a check mark, which would
contradict "that did not work"). The place carries `chatId`, the row's `recap`, and `continued.head` = the stored chat. Every
later save writes `mergeContinued(head, storedTurns(thread))` — the head (notes included) + only what was said since, aligned
even when the device trimmed the oldest turns — so the row never loses its start and nothing is written twice. If the chat on
the phone already IS that chat (handed off to look), nothing is ended or rewritten.

## Tests
- New: `src/domain/coach/__tests__/past-chats.test.mjs` (19, incl. ⛔ "I'm 20 weeks pregnant" — marked and unmarked — never in
  the row, title, search words or preview; after-continue stops; today's-guard read-back), `past-chats-store.test.mjs` (10),
  `src/app/__tests__/holt-chats-migration.test.mjs` (10, incl. the cascade), `src/lib/__tests__/past-chats-thread.test.mjs` (7).
- `node --test "src/**/__tests__/*.test.mjs"`: 7161 tests, **5 failures, all pre-existing / known**: `onboarding-missing-profile`
  (1), `consent` (crm-live `bug-plain`, 1), `migration-0234` (2) = the known 4, + form check's stale paste copy
  `coach-form-check-source` (1). (Two keyboard tests caught my transcript ScrollView first — fixed.)
- `npx tsc --noEmit` = 0. `eslint` = 0 on every changed file.
- Web: `npx expo export --platform web --clear` into the session scratch dir — **exit 0**, `holt-chats.html` emitted, the
  bundle contains `holt_past_chat`. (Run before a last small edit to the list's search bookkeeping in `holt-chats.tsx`; tsc and
  eslint were re-run clean after it, the export was not.)

## Shared-file edits (every line)
- `src/components/forge/CoachChatSheet.tsx` (lane A shares it):
  1. imports (after the `thread-lifecycle` import): `import { PAST_CHATS_ROUTE } from '@/domain/coach/holt-memory';` and
     `import { usePastChatSync } from '@/components/forge/usePastChatSync';`
  2. in the `whenThreadEnds` effect: `void summarizeChat(summaryHistory(turns))` → `summarizeChat(summaryHistory(turns)) //
     returned, not voided: its summary goes onto the past chat (4b §1.6)` (the outcome is the summary's only way to the row).
  3. after the `saveThread` effect: a comment + `usePastChatSync(thread, premiumAi);`
  4. header, before CLOSE: `{premiumAi ? <HeaderAction label="PAST CHATS" onPress={() => { handOff(); router.push(PAST_CHATS_ROUTE …); }}
     accessibilityLabel="Past chats" icon="history" bare={compact} /> : null}` — a hand-off, so the chat survives looking.
- `src/app/_layout.tsx`: `<Stack.Screen name="holt-chats" />` after `holt-memory`.
- `src/lib/auth.tsx` (no lane owns it): `import { clearThread } from './coach-thread';` + `await clearThread();` (with a comment)
  in `signOut`, after the push-token release.
- `src/domain/coach/holt-memory.ts`: **not edited** (used `StoredTurn`, `PAST_CHATS_ROUTE` as stubbed).

## Contract changes / decisions (integrator decides)
- **`holt_chats.preview varchar(160)`** added (Holt's first answer) so the list never reads transcripts (30 × up to 96 KB).
- **Telemetry key is `kind`, not `event`**: `event` is not in `ALLOWED_PROP_KEYS` (`props-core.ts`) and would be dropped
  silently. Lane A's `holt_memory` has the same problem.
- **Past chats save only with Premium AI** (`usePastChatSync(thread, premiumAi)`; the header button too) — "Holt remembers" is
  the Premium AI half of him. The list/transcript/delete work for anyone with rows.
- **Stored chats start at the athlete's first line** (the greeting/intro before it is not kept).
- `ThreadPlace.continued` added (B's file, optional; `readThreadPlace` keeps it only with a chat id).
- `fetchExportChats` returns `[]` on failure (signature is fixed) — lane A's export cannot tell "none" from "failed".

## Open items
- Lane A: link `/holt-chats` from `/holt-memory` (A's screen); keep the summariser's return value flowing (RESUME 3).
- A chat longer than the device's 100-turn trim that is reopened after an app relaunch (hand-off) re-saves from the trimmed
  thread, so the row can lose its oldest turns. Rare; continued chats are protected by `mergeContinued`.
- Not device-tested (no build in this lane): Continue's open-over-Home path and the header's 3rd action on a 320 pt phone
  (`bare` when compact, like the others).
- `git commit` prints `failed to delete …/.git/worktrees/<name>: Permission denied` (auto-gc worktree prune on the main repo) —
  harmless, not from this lane; commits land.
