# AI Sprint 3b — Lane D (import) report

Branch `ai/s3b-import` (worktree `C:\Users\isaia\ai-s3b-import-wt`), off `c543e3eb`, fast-forwarded onto `ai/s3b-gate`
(`f7311afd`) on the integrator's ask. Contract: `Docs/AI-Sprint-3b-Build-Notes.md` §0 lane D, §1.7, §1.8, §2.

## ▶ RESUME HERE
1. IM-5 client: the "Send this to Forge so we learn this format?" offer on the import screen (in progress).
2. IM-5 `/admin` "Import misses" card + its one-line placement.
3. `pending-0275.sql` paste bundle (migration `0275_import_misses.sql` is written).
4. Final test sweep, update this report, hand back.

## IM-1 — import corpus
| Step | Score | How |
|---|---|---|
| Start (`1ef22ab36904`, offline) | 32/61 | — |
| Parser fixes, offline, $0 | 41/61 | app-screen reader, side-by-side sheet, same-as-above note, Pushdowns, "Row sets", x 50 reps, 2-rung ladders |
| Card-read "Rounds: N" line + re-record `d362a542f6af` | 55/61 | live, $0.74 |
| Two layout run-to-run variations absorbed in code | **57/61** | offline, $0 |

No case that passed at the start fails now; `gate.mjs workout-tidy` and `gate.mjs workout-card-read` PASS
(every case live passed still passes). The 4 left: Squatober Day 2 and Day 16 (set ORDER is in the picture's layout,
not the words), Day 10 (handwritten "x50" read "x30" by the card reader), Bridger W2A ("10-10-10-F": the app holds a
count per set, not an F among counts — a data-model gap).

### Live runs
| Run | Estimate | Real |
|---|---|---|
| import-corpus re-record, `d362a542f6af` | $1.36 | **$0.74** |

Total lane D live spend: **$0.74** of $5.

## Commits
- `1ad4a815` app-screen reader (`src/domain/program/circuit-card.ts`) + side-by-side sheet (`sideBySideTsv`)
- `fcca4e23` written-reader fixes + AI-check ladder rule + `LEGACY_FLOOR` 10
- `16039026` "* Cardio: lift N reps" note / "Cardio: KB or DB" heading
- `4889a709` card-read prompt "Rounds: N" line + `d362a542f6af` recordings

## Decision to surface
An app's screen that code reads line for line is NOT sent to the AI layout (`workout-tidy`): nothing for it to do,
and the athlete is not charged for it. This narrows PO 09-30's "every photo gets the AI pass" to "every photo the
code cannot read whole". Squatober cards, sheets and anything else still get the AI pass exactly as before.
