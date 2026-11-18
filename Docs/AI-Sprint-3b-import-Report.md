# AI Sprint 3b — Lane D (import) report

Branch `ai/s3b-import` (worktree `C:\Users\isaia\ai-s3b-import-wt`), off `c543e3eb`, fast-forwarded onto `ai/s3b-gate`
(`f7311afd`) on the integrator's ask. Contract: `Docs/AI-Sprint-3b-Build-Notes.md` §0 lane D, §1.7, §1.8, §2.

## ▶ RESUME HERE
Lane D's build is done. What is left belongs to the integrator / PO:
1. Merge `ai/s3b-import` into `ai/s3b` after A and C.
2. PO pastes `supabase/apply/pending-0275.sql` (after 0274). Read §3 against the prediction in its header.
3. Deploy `workout-card-read` (one prompt line) — AFTER the OTA carrying this branch's client (see the old-client
   test below; it helps old phones too, so the order is a preference, not a hazard). `workout-tidy` and
   `program-photo-read` are unchanged from `c543e3eb`.
4. OTA for the client: the app-screen reader, the parser fixes, the IM-5 offer and the /admin card.

## IM-1 — import corpus
| Step | Score | How |
|---|---|---|
| Start (`1ef22ab36904`, offline) | 32/61 | — |
| Parser fixes, offline, $0 | 41/61 | app-screen reader, side-by-side sheet, same-as-above note, Pushdowns, "Row sets", x 50 reps, 2-rung ladders |
| Card-read "Rounds: N" line, re-recorded `d362a542f6af` | 55/61 | live |
| Two layout run-to-run variations absorbed in code | **57/61** | offline, $0 |

No case that passed at the start fails now. Gate output (verbatim, 2026-11-18):
```
✓ import-corpus [GRADED] gates workout-card-read, workout-tidy · prompt d362a542f6af · 61 case(s) · deterministic 4/4 · graded 57/61 (0.934) · floor: live 29 passed (0.475)
  · target 0.95 — at 0.934 (live 0.475)
GATE PASS workout-tidy
GATE PASS workout-card-read
```
The two cases the integrator named (live passed, offline failed before this branch):
- **squatober-2024-07** — the TIDY prompt's 11-17 ladder rule: the live tidy (57b5) wrote the bench's ramp itself;
  every tidy since writes `2. a. Bench Press` / `* same as above`. Fixed in the reader (`fcca4e23`): a "same as
  above" note under a bare lift takes the prescription above. Passes on `d362`.
- **squatober-2024-21** — CARD-READER run-to-run noise: the same prompt read "Push downs" once (`1ef22a`) and
  "Pushdowns" on 57b5, 3aa4 and 8daa. Fixed in the reader (`fcca4e23`): push/pull downs join. Passes on `d362`.
- On the re-record, squatober-11 and -14 (live passed) failed from LAYOUT run-to-run variation (the tidy prompt is
  byte-identical to `1ef22a`): the Cardio block written as a note under the chin-ups, "Cardio: KB or DB" as a heading.
  Both absorbed in the reader (`16039026`).

The 4 left: Squatober Day 2 (the SeeSaw's two-column order) and Day 16 (the stairway order) — the order is in the
picture, not the words; Day 10 (handwritten "x50" read as "x30" — the photo plainly says 50); Bridger W2A
("10-10-10-F": the app holds a count per set, not an F among counts — a data-model gap, not a read).

### Live runs (lane cap $5)
| Run | Estimate | Real |
|---|---|---|
| import-corpus re-record → `d362a542f6af` | $1.36 | **$0.74** (app screens no longer call the layout) |
| Old-client test: the current tidy prompt on the 32 new Bridger card reads | $0.46 | **$0.21** |
| **Total** | | **$0.95** |

### Old-client test (the card-read prompt change meets phones WITHOUT this branch)
Old client = `c543e3eb`'s `src` (extracted, read-only), graded on: the new card reads (`d362`) + the current tidy
prompt's answers to them (recorded live, $0.21) vs the old card reads (`1ef22a`). Bridger Logan screens: **9 → 19 of
32** — old phones get better too (the layout now sees the rounds). One lost (W1B: the layout wrote "F-F-F reps
(failure each set)"; fixed for new clients in `b107e6a7`). Non-app cards: 23 → 23 (swaps are run-to-run noise:
07/21 card noise up, 11/14 layout noise down). Recordings kept out of the repo (scratch); script described in
`b107e6a7`'s message.

## IM-5 — "Send this to Forge so we learn this format?"
- **0275 AUTHORED, NOT APPLIED.** `supabase/migrations/0275_import_misses.sql` + `supabase/apply/pending-0275.sql`
  (93/93 statements verbatim, checked by parse; §2 raises; §3 predicted: misses 0 · photo_debts 0 · bucket_public
  false · storage_policies 3 · purge_job_active true · anon_can_send false · authenticated_can_send true ·
  authenticated_can_read_table false). Live checked read-only first (Supabase MCP): `admin_guard()` / `is_app_admin()`
  source, `storage.protect_delete` trigger present, no `import_misses` / bucket yet. No existing function retyped.
- ⚠ Photo bytes: SQL cannot delete storage objects (0142). Rows go at 90 days; a photo's path is written to
  `import_miss_photo_debts` and the /admin card deletes it through the Storage API when an operator opens it. From day
  90 the bucket's select policy already refuses the photo to everyone.
- Client: `ImportMissOffer` on `src/app/program-import.tsx` (paste + photos; the photo checkbox on one-photo reads
  only — a multi-photo send is text only). `ImportMissesCard` on /admin → AI health.
- Old clients unaffected: nothing existing changes; the new client on a database without 0275 says "Sending isn't
  switched on yet — nothing was sent".

## Commits
- `1ad4a815` app-screen reader (`src/domain/program/circuit-card.ts`) + side-by-side sheet (`sideBySideTsv`)
- `fcca4e23` written-reader fixes + AI-check ladder rule + `LEGACY_FLOOR` 10
- `16039026` "* Cardio: lift N reps" note / "Cardio: KB or DB" heading; fixtures moved (card-rule counts the folder)
- `4889a709` card-read prompt "Rounds: N" line + `d362a542f6af` recordings
- `25ffd61a` this report (first cut)
- `b107e6a7` "F-F-F reps (…)" gloss
- `9b9fc47f` IM-5: 0275 + paste bundle, the offer, the /admin card
- (this commit) report

## Tests
`node --test` over all of `src`: 6912 tests, 6908 pass, **4 fail — the 4 known**, none in a file this branch touched:
`onboarding-missing-profile` (complete_onboarding vs 0066, CRLF checkout), `consent.test` (`crm-live.ts` → bug-plain),
`migration-0234` ×2. `scripts/evals` + `scripts/deploy-ai` tests: 60/60. `npx tsc --noEmit` = 0 (with the generated,
git-ignored `expo-env.d.ts` copied in — the worktree lacked it). eslint = 0 on every changed file (the pre-existing
`Buffer` no-undef at lines 25/35 of `src/data/__tests__/import-photo-read.test.mjs` is not this branch's).

## Files edited outside lane D's row
- `src/app/admin-ai.tsx` — one placement line `<ImportMissesCard />` + its import (allowed shared placement).
- `src/domain/workout/written-workout.ts`, `workout-ai-gate.ts` and their tests — the reader the import uses (the
  "import domain" in practice; no other lane listed them).
- `src/data/import-photo-read.ts` (the import's data module) and `src/domain/workout/__tests__/squatober-2024-week2.test.mjs`
  (the Day 10 test pinned the old "50 reps total" reading; now the corpus key, one set of 50).
- `src/components/forge/ImportMissOffer.tsx`, `src/data/import-miss-live.ts` — new files.
- NOT touched: model / request-body lines, `gate.mjs`, `runner.mjs`, `baselines.json`, `threshold` lines, form check.

## Decisions to surface
1. An app's screen that code reads line for line is NOT sent to the AI layout (`workout-tidy`): nothing for it to do,
   and the athlete is not charged for it. This narrows PO 09-30's "every photo gets the AI pass" to "every photo the
   code cannot read whole". Squatober cards, sheets and everything else get the AI pass exactly as before.
2. Squatober Day 10 "x 50 reps UNBROKEN" is now one set of 50 (the corpus key), not a 50-rep total.

## Open items
- Day 2 / Day 16 order and the "10-10-10-F" model gap (above). A per-set "F" in `repScheme` would need the logger.
- IM-5 multi-photo reads send text only (no photo); a per-photo send is a later step.
- The `rest` from a side-by-side sheet's "Note: Rest Periods = 1 Minute" is not carried (the table reader has no rest
  column); the lifts, sets and reps are.
- Master status doc (`Forge-Legacy-Master-Status.md`, main tree) not edited from this lane — the integrator's.
