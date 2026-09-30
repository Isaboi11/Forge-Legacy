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
  - **Amended 2026-09-30 (PO): every photo gets the AI pass, case 2 included.** PO: *"I thought we were having ai read it to make sure it gets it right?"* Season 12 Day 1 came back from the photo as a table whose cells already carried their words; the reader read it "clean" (case 2) as **one** squat set where the card has nine, so AI was never asked. A photo in case 2 is now tidied too, quietly: AI's layout replaces the reading only if it passes `checkAiRewrite` **and** itself reads as case 2; otherwise the code reading stands and no error is shown. One extra credit per photo. Typed and pasted workouts are unchanged.
  - **Live proof, the PO's own photo, 2026-09-30** (4 AI layouts, about 6¢ in all): every set, rep, % and rest right in 4 of 4, and all four accepted by `checkAiRewrite`. From today's table photo read the workout's title is lost (a table has no row for it); from a whole-card read (a prompt tried in the test, **not deployed**) nothing was lost.
  - **Amended 2026-09-30 (PO: "yes I want the title"): a card is photographed through its own function, `workout-card-read`, which copies the card line by line** — name, warm-up, every lift, the rests, the margin notes, the recovery. `program-photo-read` is untouched and still reads tables, rows only, for program import. ⚠ What this gives up, knowingly: the table read's guard is structural (a line with no tab is dropped, so it cannot carry a sentence); a card's lines are sentences. In its place, in code: the answer must contain sets and reps written as sets and reps or it is refused as "not a workout" (`cleanCardTranscript`, on the device, and the same rule in the function), it is capped at 120 lines / 6,000 characters, and it is never posted as it stands — it goes into the poster's own box, through the AI layout, `checkAiRewrite` and the code reader. It meters as `photo_import` (no migration). Until the function is deployed the app falls back to the table read.
- **Case 5 also covers** (2026-09-30): a lift whose note holds a list of percentages (`setsLeftInNote`), and a lift that disagrees with the card's own tally, "9 total sets, 27 total reps" (`tallyMismatch`). Both also show under "Check these before posting".
- **After AI has rewritten the box**, it is not offered again on its own rewrite. What is left is the poster's to check.

Proof: `workout-ai-gate.test.mjs` shows all 19 real cards land in case 1 or 2.

## What AI does, and what it is not allowed to do

AI (`supabase/functions/workout-tidy`, `claude-sonnet-5`) **rewrites the card's words into the reader's own layout**. That is the layout `rowsToWrittenText` writes, and the only one the reader knows perfectly. It does not produce sets, weights or rest. **The code reader still reads every number**, from AI's rewrite, exactly as it reads typing.

Four walls, in order:

1. **The prompt** says every number must be on the card. This is a request, not a guarantee.
2. **`checkAiRewrite()` on the device** throws the rewrite away, keeping the poster's words, if:
   - it wrote a number that isn't on the card (a rest may be restated: 2½ min = 2:30 = 150 s; lift labels and "1 set of" are the layout's own);
   - it lost a % that is on the card;
   - it named a lift that shares no word with the card (DB/Dumbbell, BB/Barbell, RDL/Romanian and similar count as the same; since 2026-09-30 a handwritten "DEAD lift" counts for "Deadlift", which had been rejecting faithful rewrites);
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

> **Amended 2026-09-30 (PO): PHOTOS in every import door now use the card reader and the AI check.** PO: *"shouldn't this be the same card reader as when I put it in the workout tab in build a program? that should be going through ai as well so we know it works"* → *"yes"*. The same photo of Season 12 Day 1, read by the old path, gave Back Squat 9 × 0 with every percentage dropped, Bench 1 set, and the warm-up, recovery and a rest line as exercises.
>
> - **One reader, `readImportPhoto`** (`src/data/import-photo-read.ts`), for Build a Program's pictures, Build a Template's picture, Home's "Paste a workout", the builders' import sheet and a picture sent to Holt: the whole-card read (table read until `workout-card-read` is deployed) → for ONE workout, the AI layout (`workout-tidy`, guarded by `checkAiRewrite` exactly as above) → the written reader → the import preview (`writtenToWeeks`), with anything to check listed above it.
> - **A sheet of several days or weeks is still the table reader's** (`isMultiDaySheet`: two different Day/Week values in the table, or two different day or week headings). ⚠ Not "does `parseProgramTable` see two days" — it reads the single Squatober card as two.
> - **What sets × reps cannot say now reaches the program and the template**: a per-set ramp, percentages, the rest between sets and a superset ride in `ParsedItem.rx` into the draft, the saved template (`prescriptionOfRow`) and the program (`ProgramExercise.restSec` / `restScheme`, which `sessionSetsFor` puts on each set). The builders show them in a line under the name; re-counting a row by hand makes it plain sets × reps (`withoutScheme`).
> - **Typed and pasted text is unchanged**: `parseProgramTable`, no AI.
> - Cost: one card read and one AI layout per photo (about one extra credit per photo).

## Files

- `src/domain/workout/workout-ai-gate.ts`: `whenToUseAi`, `checkAiRewrite`, `MAX_AI_CHARS`.
- `supabase/functions/workout-tidy/index.ts`: the function. Self-contained, so this file is the dashboard paste copy.
- `src/data/workout-tidy-live.ts`: the client; runs `checkAiRewrite` before offering anything.
- `src/app/workout-write.tsx`: the "Fix it with AI" button, auto-tidy on a photo, the banner and Undo.
- `supabase/migrations/0232_workout_tidy_action.sql` + `supabase/apply/pending-0232.sql`: the credit weight.
- `supabase/functions/workout-card-read/index.ts` (self-contained, the dashboard paste copy), `src/data/workout-card-read-live.ts`, `src/domain/workout/card-transcript.ts`: the card photo read (2026-09-30).
- Tests: `squatober-2026-day1.test.mjs` (the PO's photo, end to end, on the live prompts' real answers), `card-transcript.test.mjs`, `workout-card-read-live.test.mjs`, and `workout-ai-gate.test.mjs` (the line, and the check), `workout-tidy-prompt.test.mjs` (the prompt's example reads cleanly and passes the check), `workout-tidy-live.test.mjs` (the client).

## Order to go live

1. Paste `pending-0232.sql`. §3 should read `workout_tidy_credits = 1 · meal_photo_credits = 3 · tidies = 0`.
2. Deploy `workout-tidy` from the dashboard, pasting the whole `index.ts`.
3. Ship the app (web, and the build-9 OTA).

Until step 2, "Fix it with AI" answers "Couldn't reach AI just now". The rules path is untouched.
