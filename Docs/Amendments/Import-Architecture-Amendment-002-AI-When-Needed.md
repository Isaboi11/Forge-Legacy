# Import Architecture Amendment 002 — AI When Needed

**Status:** LOCKED · 2026-09-28 · PO-approved
**Amends:** `Docs/Architecture-Amendment-001-Import.md` §4.3 ("No AI interpretation. No inference.")
**Scope:** written workouts: the "Write a workout" screen (`src/app/workout-write.tsx`), which types, pastes or photographs a coach's card to post to a squad. Program import (CSV, sheets, program photos) is **unchanged** by this amendment.

## Why

PO, 2026-09-28: *"Yes I would say use AI when needed. For simple workouts it shouldn't be hard, but for workouts like this where it's more complicated it might be difficult. Make sure to build a fool proof plan of when to use ai and when not to."*

The code reader (`src/domain/workout/written-workout.ts`) reads all 19 Squatober cards the PO has sent. Each new card had needed a reader fix first, and a card written a new way will again. §4.3 forbade AI interpretation so that no number reaches an athlete that their coach did not write. This amendment lets AI in **without giving it that power**.

## The line: when AI is used, and when it is not

Decided by code, `whenToUseAi()` in `src/domain/workout/workout-ai-gate.ts`, never by the model:

| # | The card | AI? |
|---|---|---|
| 1 | Empty, or a rest day (no sets, reps, `x` or `%` anywhere) | **No** |
| 2 | The code reader read every line, found reps on every lift, and kept every % on the card | **No** |
| 3 | The only doubt is a name the exercise library doesn't know | **No.** That is spelling; the poster fixes it |
| 4 | Longer than 6,000 characters (`MAX_AI_CHARS`) | **No.** Post it in parts |
| 5 | Anything else: a line not read, a lift with no reps, a name with numbers caught in it, a % on the card that went nowhere, or sets and reps written but no lifts found | **Yes, offered** |

- **Typed or pasted:** case 5 shows "Fix it with AI". It never runs by itself.
- **Photo:** the poster already chose AI by choosing a photo, so a transcription that lands in case 5 is tidied straight away, with no second tap.
- **After AI has rewritten the box**, it is not offered again on its own rewrite. What is left is the poster's to check.

Proof: `workout-ai-gate.test.mjs` shows all 19 real cards land in case 1 or 2.

## What AI does, and what it is not allowed to do

AI (`supabase/functions/workout-tidy`, `claude-sonnet-5`) **rewrites the card's words into the reader's own layout**. That is the layout `rowsToWrittenText` writes, and the only one the reader knows perfectly. It does not produce sets, weights or rest. **The code reader still reads every number**, from AI's rewrite, exactly as it reads typing.

Four walls, in order:

1. **The prompt** says every number must be on the card. This is a request, not a guarantee.
2. **`checkAiRewrite()` on the device** throws the rewrite away, keeping the poster's words, if:
   - it wrote a number that isn't on the card (a rest may be restated: 2½ min = 2:30 = 150 s; lift labels and "1 set of" are the layout's own);
   - it lost a % that is on the card;
   - it named a lift that shares no word with the card (DB/Dumbbell, BB/Barbell, RDL/Romanian and similar count as the same);
   - it found no lifts in a card that has sets and reps.
3. **The poster sees the rewrite in the box**, marked "Tidied by AI. Check every number against the card", with **Undo**, and the live preview of exactly what the squad will get. The "Check these before posting" list still runs on it.
4. **Nothing is posted until the poster presses Use.**

⚠ **What wall 2 does not prove.** It checks by value: every number is from the card, and every % on the card survives. It does not check which lift each number sits on. If a card says 75% for the squat and 80% for the bench, a rewrite that swaps them passes. That is what wall 3 is for, and why the banner says to check every number.

## Access, cost, privacy

- **Premium AI only.** It is the `workout_tidy` action through `coach_ai_spend_credits`, which refuses anyone without Premium AI (0203). **1 credit** (migration `0232`).
- **Consent:** `ensureConsent('ai_sharing')` before anything is sent.
- **Limits:** 40 tidies per athlete per day. The same card tidied twice in a session is free the second time.
- **Cost:** roughly one to two cents per tidy (Sonnet 5; about 2.5k input tokens, mostly the cached prompt, and up to about 1k output).
- **Failures say what happened:** "not Premium AI", "out of credits", "couldn't reach AI" and "AI changed a number" are each their own message. An outage never reads as a verdict on the card.

## What stays locked

§4.3 still holds for **program import**: CSV, sheets and program photos. Those still transcribe only (`program-photo-read`), and `parseProgramTable` decides everything. Extending "AI when needed" there needs its own amendment.

## Files

- `src/domain/workout/workout-ai-gate.ts`: `whenToUseAi`, `checkAiRewrite`, `MAX_AI_CHARS`.
- `supabase/functions/workout-tidy/index.ts`: the function. Self-contained, so this file is the dashboard paste copy.
- `src/data/workout-tidy-live.ts`: the client; runs `checkAiRewrite` before offering anything.
- `src/app/workout-write.tsx`: the "Fix it with AI" button, auto-tidy on a photo, the banner and Undo.
- `supabase/migrations/0232_workout_tidy_action.sql` + `supabase/apply/pending-0232.sql`: the credit weight.
- Tests: `workout-ai-gate.test.mjs` (the line, and the check), `workout-tidy-prompt.test.mjs` (the prompt's example reads cleanly and passes the check), `workout-tidy-live.test.mjs` (the client).

## Order to go live

1. Paste `pending-0232.sql`. §3 should read `workout_tidy_credits = 1 · meal_photo_credits = 3 · tidies = 0`.
2. Deploy `workout-tidy` from the dashboard, pasting the whole `index.ts`.
3. Ship the app (web, and the build-9 OTA).

Until step 2, "Fix it with AI" answers "Couldn't reach AI just now". The rules path is untouched.
