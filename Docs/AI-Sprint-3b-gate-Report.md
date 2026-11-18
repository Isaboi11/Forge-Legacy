# AI Sprint 3b — lane `ai/s3b-gate` report (gate policy, §1.1)

**Date:** 2026-11-18 · **Branch:** `ai/s3b-gate` (worktree `C:\Users\isaia\ai-s3b-gate-wt`) off `2a2eaedb`
**Cost:** $0. Offline only, no `--live`. No deploys, no push, no SQL. Supabase MCP used read-only (`get_edge_function`
for workout-tidy, workout-card-read, coach-kitchen) to check which prompt and filter are live.

## What shipped (commits)

1. `427f306c` feat(evals): the deploy gate can hold a suite to "no worse than live" (`scripts/evals/lib/runner.mjs`,
   `scripts/evals/gate.mjs`, tests in `scripts/evals/__tests__/evals.test.mjs`).
2. `ed280216` feat(evals): workout tidy and Kitchen are gated "no worse than live". Adds `scripts/evals/baselines.json`,
   puts `floor: 'live'` on `import-corpus` + `kitchen-allergens`, and adds a test that only those two suites carry it.
3. This report.

## The policy (runner.mjs)

- `threshold.floor: 'live'` is the only floor allowed (`validateSuite` throws on anything else).
- A suite with the floor passes only when all three hold: (a) every deterministic check passes, (b) its metric is at
  least the baseline metric, (c) every id in the baseline's `passedCaseIds` still passes. A baseline case with no
  recording under the current prompt counts as a regression. A baseline case that is no longer in the suite fails
  with "re-baseline it".
- The absolute `min` still prints as a target: `target 0.95 — at 0.525 (live 0.475)`.
- It fails when the baseline is missing, has no metric, has no passedCaseIds, or uses another metric. It also fails
  when the suite is UNRECORDED, because the deterministic checks alone can't show "no worse than live". STALE fails,
  as before.
- Suites without the floor behave exactly as before. `chat-safety` and every other suite keep absolute bars.

## Baselines (`scripts/evals/baselines.json`)

Both come from real 11-17 recordings, checked against the deployed code on 11-18:

| Suite | Recordings | Why that is live | Live score |
|---|---|---|---|
| import-corpus | `57b5a3c1dbf0` (Sonnet 5, 11-17 20:08–20:16Z, commit `5a4f4674`) | Recomputing the hash with the **deployed** workout-tidy v7 SYSTEM (read back; it is the prompt before the ladder rule `55e50a74`) plus workout-card-read v4's SYSTEM (= the repo's) gives exactly `57b5a3c1dbf0…`. Graded by this branch's import parser, which is the same as OTA `01a1ed15` (`cb1bde15`; no import-path diff). | **29/61** |
| kitchen-allergens | `18d37664f223` (Sonnet 5, 11-17 23:37–23:44Z, commit `7eab97f3`) | Live coach-kitchen v11 is byte-identical to `supabase/apply/deploy-coach-kitchen.ts` at `e39c4a24^`. SYSTEM, MODEL, schema, cap and knobs are the same as the branch, so these recordings are live's model answers. Graded with v11's allergen filter (`kitchen-dishes.ts` at `e39c4a24^`, before the dish-name rule). | **31/36** |

Both match the PO's numbers (29/61, 31/36). The other recording folders are not live: `1ef22ab36904` is the tidy
candidate (32/61), `8daa2856c0dc` is the reverted rounds prompt (26/61), the Sonnet 5.5 / Haiku 5.5 folders are
model trials, and `9b3b6fbc218f` used the old kitchen harness (it did not send coach-kitchen's own request).

**How to re-derive.** Grade a recording folder case by case with the suite's own `grade()`. For Kitchen, use a copy
of the tree with `kitchen-dishes.ts` from the deployed commit. Then write `metric = passed / cases` and the passing
ids. Never hand-edit a number.

## Gate outputs (2026-11-18, verbatim)

```
$ node scripts/evals/gate.mjs workout-tidy        (exit 1)
✕ import-corpus [GRADED] gates workout-card-read, workout-tidy · prompt 1ef22ab36904 · 61 case(s) · deterministic 4/4 · graded 32/61 (0.525) · floor: live 29 passed (0.475)
  · target 0.95 — at 0.525 (live 0.475)
  · 2 case(s) live passes now fail: squatober-2024-07: w1d1: Bench Press: 1 sets, key 5 | squatober-2024-21: w1d1: name "Cable Triceps Push Downs" is not "Cable/or Band Triceps Pushdowns"
GATE FAIL workout-tidy

$ node scripts/evals/gate.mjs coach-kitchen       (exit 0)
✓ kitchen-allergens [GRADED] gates coach-kitchen · prompt 18d37664f223 · 36 case(s) · deterministic 10/10 · graded 34/36 (0.944) · floor: live 31 passed (0.861)
  · target 1 — at 0.944 (live 0.861)
GATE PASS coach-kitchen
```

## Tests

- `node --test scripts/evals/__tests__/*.test.mjs scripts/evals/corpus/import/*.test.mjs scripts/deploy-ai/__tests__/*.test.mjs`
  → 60/60 pass. New tests cover: pass below the bar, equal to live, fail by metric, fail by a regressed case even
  when the metric rose, an unrecorded regressed case, a dropped case, a missing or malformed baseline, UNRECORDED,
  a failed deterministic check, GATE PASS/FAIL through `gateSlug`, and the real baselines file (floor on the two
  suites only, ids are real cases, the recordings exist under the named hash, 29 and 31).
- `npx tsc --noEmit` → 0. `eslint` on the 6 changed files → 0.

## Shared-file edits

- `scripts/evals/corpus/import/import-corpus.test.mjs` (lane D's folder): one assertion now expects
  `floor: 'live'` in the suite threshold.
- `scripts/evals/suites/import-corpus.mjs` + `kitchen-allergens.mjs`: the threshold line plus one comment line each.

## Open items / blockers

1. ⛔ **workout-tidy does not pass "no worse than live" today.** It scores 32/61 against live's 29, but two cases
   live passes fail on the candidate's one recording:
   - `squatober-2024-07`: the card read matches live apart from spacing. The candidate tidy left Bench Press as
     `* same as above` with no sets, where live wrote out the ladder. This is a tidy-output difference: either the
     ladder prompt or run-to-run variation.
   - `squatober-2024-21`: the **card read** (same prompt in both runs) came back "Push downs" with the 4x20 on its
     own line. That is the photo read varying from run to run, not the tidy prompt.

   Each case has one recording, so this can't be fixed offline without loosening the grader (not done). Options for
   the PO / integrator: re-record the candidate (`import-corpus` estimate ~$1.36, lane D's $5) and re-gate, or the
   PO accepts these two by name. If lane D's parser work (IM-1) changes how these recordings grade, re-derive the
   import baseline in the same commit.
2. coach-kitchen passes and can deploy byte-exact (§4) on the PO's yes. FYI: the phone's own `dishCards` already
   reads dish names, since OTA `01a1ed15`. So the deploy mostly brings the server's filter in line with the app's.
3. Not edited (outside this lane): `.claude/skills/deploy-ai/SKILL.md` §3 still describes only STALE/UNRECORDED.
   It should get one line on `floor: 'live'` and `baselines.json`.
4. Each commit printed `failed to delete …/.git/worktrees/<name>: Permission denied` for 7 stale worktree entries
   (b11b, forge-care-wt, forge-deploy-wt, forge-s3a-ota-wt, forge-textfix-wt, forge-webpay-wt, ota-verify-wt). Git
   tried to prune them on its own and nothing was deleted. Worth a look in the main tree.

## ▶ RESUME HERE

- Merge `ai/s3b-gate` into `ai/s3b` first (contract §0).
- coach-kitchen: gate PASS. Deploy per §4 once the PO says yes.
- workout-tidy: blocked by item 1. Decide re-record or a named waiver. Then re-run `node scripts/evals/gate.mjs workout-tidy`.
