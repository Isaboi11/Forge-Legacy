# AI Sprint 3b — Lane A (PL-7 models) report

**Branch:** `ai/s3b-models` · **Worktree:** `C:\Users\isaia\ai-s3b-models-wt` · **Base:** `2a2eaedb` (contract) on `c543e3eb`.
**Contract:** `Docs/AI-Sprint-3b-Build-Notes.md` §0 lane A, §1.2, §2. Nothing deployed, applied, pushed or OTA'd.

## ▶ RESUME HERE

1. `git -C C:/Users/isaia/ai-s3b-models-wt log --oneline 2a2eaedb..HEAD` and `git status --short`.
2. Live runs are logged in §3 below — never re-run one that is already logged (recordings are committed).
3. Open steps are the ⬜ lines in §1.

## 1. Steps

- ✅ 1. The 11-17 comparison (`688907b5`) — see §2.
- ✅ 2. `src/domain/ai/model-request.ts` + `model-config.ts` + tests; model-call lines wired (list in §4).
- ✅ 3. 0274 authored (not applied), PGlite-run twice (§3 = prediction).
- ⬜ 3b. Switch SQL (step 1 / step 2 / revert) — after the live evals.
- ⬜ 4. Meter by the answering model — verify every settle path.
- ⬜ 5. Haiku 4.5 retirement — needs the live evals.
- ⬜ 6. PB-4 validator bullet.
- ⬜ 7. Bundles + `gate.mjs --changed c543e3eb`.

## 2. Was the 11-17 comparison run through the FIXED harness?

Yes for what it measured, but it did not measure coach-ask:
- Harness fix `9f34fbef` (11-17 22:34 UTC) and the per-model knobs `9402b2a5` (23:25 UTC) come before every comparison
  recording (23:07 UTC → 04:03 UTC on 11-18). Offline replay (`node scripts/evals/run.mjs --suite X --model M`)
  reproduces every number in the status doc exactly.
- ⚠ `chat-safety` and `chat-answers` send **coach-interpret's** request (its SYSTEM, JSON route reply). Their S5.5 win
  is a coach-interpret result. The PO's approved switch is **coach-ask** (the streaming chat: another SYSTEM, read
  tools, free text, output scan) — never evaluated. New suite `ask-safety` sends coach-ask's own request.
- Same-model noise (two Sonnet 5 chat-safety runs, same request): −11 / +15 cases. So "no case the base passed now
  fails" cannot be read case by case across models; the honest reading is the totals by failure kind (§5).

## 3. Live runs (cap $20)

| Run | Estimate | Real |
|---|---|---|

## 4. Files edited outside lane A's own files

## 5. Switch verdicts

## 6. Open items
