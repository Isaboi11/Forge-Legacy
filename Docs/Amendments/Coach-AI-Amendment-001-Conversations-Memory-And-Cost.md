# Coach AI Amendment 001 — Conversations, Memory and Cost

**Status:** LOCKED 2026-09-21 on PO direction — CA-D1…CA-D12. CA-D7…CA-D9 were accepted by the PO the same
day and amend the pricing plan (§5). Two small items remain open (§7).
**Date:** 2026-09-21
**Owner:** Product
**Amends:** `Docs/Coach-Chat-Design-Brief-v1.0.md` §0, §7, §10 and §13 Q3 · `Docs/AI-Coach-Capability-Scope-v0.1.md` §1 A2, §3 ·
the Pricing Structure & Monetization Build Plan (model and credit weights only — CA-D7…CA-D9)
**Governs:** `supabase/functions/coach-interpret`, `supabase/functions/program-photo-read`,
`src/domain/coach/chat-core.ts` (`TYPING_ENABLED`), `src/domain/coach/thread-lifecycle.ts`, and the engine work in §4.

---

## 1. The request

> *"The coach needs to be very responsive and good, but also we can't have him eating tokens like crazy.
> If I start a conversation with a program that I want and that conversation ends, and then I send in a
> progress pic to analyze, those have nothing really to do with each other so it needs to not re-read the
> entire conversation."*
>
> *"For basic programs yes use the code, but if I want to tell it 'I want to run twice a week, and then
> lift the other three days. Help me build a program around that' — he should ask questions and be able to
> build like that. No matter which direction a user goes. Where they can say they have no idea what they
> want to do with those lifting days, to where they know every exercise."* — PO, 2026-09-21

> *"It should feel like a full blown AI. He should have a personality, he should be able to follow the
> user's requests (even if they say 'I want to run 1 mile a day and then lift on Wednesday and that's my
> program'), and should be able to be robust and helpful. It should feel as if they are typing directly
> into Claude or ChatGPT."* — PO, 2026-09-21

These requirements pull against each other. Holt has to be **cheap per request**, **as open and capable as
a general assistant**, and still **never make up training numbers**. Three rules meet all three:

1. **A request pays for its own job and nothing else** (CA-D1, CA-D2, CA-D5).
2. **The model runs the conversation, and the engine is a set of tools he calls** (CA-D10, CA-D11).
3. **The athlete's program is the athlete's.** Holt builds what they ask for, and says a concern once (CA-D12).

---

## 2. What is already true (not re-decided here)

| Fact | Where |
|---|---|
| The model never writes training. It turns words into a constraint set, and `assemble()` builds the program | Brief §0 |
| The system prompt is one stable, cached block, and everything that varies goes in the user turn. Cache reads cost ~0.1× input | `coach-interpret/index.ts` header |
| `coach-interpret` sends the open question and the fields already answered. It does **not** send a transcript | same |
| A credit is reserved **before** the model call | same, step 1 |
| Closing Holt ends the thread. Only a hand-off (e.g. to the Program Builder) keeps it | `thread-lifecycle.ts` (PO, 2026-08-26) |
| Nothing Holt builds is saved until it passes through the Program Builder | Brief §1 |
| Typing is hidden (`TYPING_ENABLED = false`) until the Edge Function answers | `chat-core.ts` |

---

## 3. Decisions

### CA-D1 — A conversation is one job, and a job never sees another job's words.

Every exchange with Holt belongs to exactly one **job**:

| Job | Ends when |
|---|---|
| `build-program` | The program is saved through the Builder, or discarded |
| `build-day` | The day is started, saved or discarded |
| `edit-program` | The edit is applied or discarded |
| `ask` | A question about training, an exercise, or the plan. Ends when the athlete closes Holt or starts a different job |
| `photo-read` | The read is returned |
| `form-check` | The read is returned |

A new job starts with **no transcript**. It gets the athlete brief from CA-D2 and nothing else. The PO's
example holds by construction: a progress photo read after a program conversation sends the photo, the
brief and the photo-read instructions. It sends **zero** words from the program conversation.

This replaces the Brief §13 Q3 recommendation (*"one rolling thread for v1"*), which the 2026-08-26
close-ends-the-thread decision had already overturned in practice. Switching jobs mid-sheet (*"actually,
can you look at this photo"*) closes the current job and opens the new one. The screen may show both, but
the model only receives the new one.

### CA-D2 — Holt remembers facts, not conversations.

Holt must not feel like he forgets you. Continuity comes from a short **athlete brief** that the app builds
from the database on every request, not from old transcripts:

1. **Profile:** experience per discipline, units, coaching intensity, equipment and environment, limitations.
2. **Now:** the active program (name, week N of M, this week's days), and the last few sessions (`recent-work.ts`).
3. **Holt's notes:** short facts saved when a job ends, one line each. Examples: *"Runs Tue/Thu, wants the
   long run on Sunday."* *"Hates lunges."* *"Left knee flares on deep squats."*

Rules:

- **The brief carries only what the job needs.** `photo-read` does not get the program's exercise list.
  `edit-program` does not get photo history. Amber-tier data (the body, photos) goes in only on an explicit,
  per-request ask, following `Coach-AI-Preflight-Gates-v0.1` Part 2.
- **Notes are visible, editable and deletable by the athlete.** This is the same principle as CL-D3: anything
  Holt acts on about a person must be something that person can see and undo. A hidden memory is also where
  a wrong fact would live forever.
- **Notes are capped** at 20 one-liners. When a new note would exceed the cap, the job proposes which one to
  replace. The brief stays a few hundred tokens for the life of the account.
- **Notes record what the athlete said, never what the model inferred.** *"Said Monday is their only long
  day"* is a note. *"Probably overtrained"* is not.

### CA-D3 — Holt interviews at whatever depth the athlete brings. The engine still builds.

A build conversation must work for someone who says *"I have no idea"* and for someone who lists every
exercise. Every part of a day is in one of four states, and the athlete can set each part independently:

| State | Athlete says | Who fills it |
|---|---|---|
| **Holt decides** | *"No idea"* / *"You pick"* | The engine, fully |
| **Focus given** | *"Upper body on Monday"*, *"I want a bigger bench"* | The engine, within that focus |
| **Exercises given** | *"Bench, rows, pull-ups, curls"* | The athlete's exercises, with sets, reps and progression from the rulebook |
| **Everything given** | *"Bench 5×5, rows 4×8…"* | The athlete, verbatim. The engine only validates it |

**This does not break Brief §0.** Athlete-supplied content is authored by the athlete, not the model, and
it is the same thing the Program Builder already allows by hand. The model still never invents a set, rep
or mile. It only turns what the athlete said into the constraint set.

**Where athlete content conflicts with a rule** (a heavy squat day the day before the key run, or a
limitation they told Holt about), Holt says so **once**, in one sentence, and offers the fix. If the
athlete keeps their version, it stays. The one exception is `MEDICAL_STOP`, which is never overridden.

### CA-D4 — Holt leads the conversation. The engine keeps the checklist.

*(Revised the same day by CA-D10: the first draft made the question order code. That reads as a form with
a voice, which is what the PO ruled out.)*

The model talks freely and decides what to ask and when, the way a person would. It is not a script. What
stops that from wandering is a tool: `what_is_missing(draft)` (`missingFor()` extended for §4) tells the
model what the program still needs before it can be built. The model decides how and when to cover it.

- **Ask only what changes the program.** Holt asks for what is missing and does not quiz the athlete for
  the sake of it.
- **"You pick" is always a valid answer**, and it moves that part to *Holt decides*.
- **If the athlete answers three things at once**, Holt takes all three and does not ask them again.
- **Question budget: 8.** After about eight questions Holt builds with defaults for whatever is still open
  and says which parts he chose. The athlete edits from the program card. Nobody gets stuck in an interview.
- **Offer taps where they help** (days, session length, "you pick") alongside the text box, never instead
  of it. A tap costs no model call.

### CA-D5 — Cost controls on every request.

| Control | Rule |
|---|---|
| **Cached instructions** | Unchanged: one stable system block per job type, with `cache_control`. Confirm with `coach_ai_cache_health()` before trusting any cost figure |
| **Structure travels in tool calls** | Holt replies in natural prose (CA-D10). Anything the app acts on, like a draft, an edit or a note, travels as a tool call. The app never has to parse a program out of a paragraph |
| **Turn summary inside a job** | When a job goes past 12 turns, the older turns are replaced by the job's current draft plus a one-paragraph summary. The model sees those and the last 4 turns |
| **Output caps per job type** | `ask` 600 tokens · build turns 500 · photo read 700 · form check 900. The caps are ceilings, not targets: Holt's voice is short anyway. They are starting values, to be tuned from logged use (CA-D6) |
| **Photos resized on the device** | Downscale to the size the model would reduce it to anyway before upload. There is no quality loss for the read, and the upload is cheaper and faster |
| **Progress comparison by text** | A new progress photo is compared against the **saved write-up** of the last read, not the old image. Sending both images is only on an explicit *"compare these two"* (see CA-D9) |
| **Retrieval, not generation** | Exercise questions answer from the 735 published coaching records, and "why does my plan look like this" answers from `rulebook/rationale.ts` (Capability Scope B1/B2) |

### CA-D6 — Every call is measured by job type from day one.

Each call logs job type, model, input tokens, cached input tokens, output tokens and credits charged. The
60-day tester run (pricing plan) reports **cost per job type**, not only cost per athlete. That is how the
CA-D5 caps and the CA-D4 question budget get tuned from data instead of guessed.

### CA-D10 — Holt is a real conversational AI with a personality, not a form with a voice.

Typing to Holt should feel like typing to Claude or ChatGPT. That means:

- **Free text in, natural replies out.** Any phrasing, typos, half-sentences, changing their mind
  mid-thought. *"I didn't catch that"* is no longer an acceptable answer to a clear sentence. It is only for
  input that is genuinely unclear, and then Holt asks what they meant in his own words.
- **Personality is `Holt-Voice-Amendment-001`, delivered by the model.** He is the coach you hired: warm,
  invested, encouraging without being cheesy, and pumped when you win. He is direct and specific, has
  opinions and says them, and can be funny. He remembers what was said earlier **in the same job** and
  refers back to it. That amendment's HV-D2 table is the style guide, so the AI and the scripted Holt sound
  like the same coach.
- **Holt answers the question that was asked,** including follow-ups, "why", "what if", "explain that
  simpler", and pushback. He changes his answer when the athlete gives him a good reason, and holds it when
  they don't.
- **Broad scope within training and the life around it.** Training, running, recovery, sleep, general
  nutrition, motivation, gym nerves, scheduling around work and kids, how the app works. He does not diagnose
  and does not prescribe diets or supplements (Capability Scope §2). Far off-topic requests get a short, in-character
  redirect (§7, item 1).
- **Streaming replies** (Brief §4.3), so the first words appear immediately. Responsiveness is felt as
  time-to-first-word, not total length.

### CA-D11 — The model orchestrates, and the engine is his toolbox.

This **amends Brief §0.** The model used to only fill a form for `assemble()`. Now it runs the whole
conversation and calls the engine as tools when it needs to:

| Tool | What it does |
|---|---|
| `build_program(spec)` | The rulebook builds the parts marked *Holt decides* or *focus given*, and places the athlete's own parts as given |
| `build_day(spec)` | The same, for one session |
| `edit_program(op)` | The existing `edit-ops.ts` operations (swap, sets/reps, cardio target, rebuild a day, reorder) |
| `check_program(draft)` | Validation, returning conflicts as sentences (§4.4) |
| `what_is_missing(draft)` | The CA-D4 checklist |
| `find_exercise(name)` | Resolves a spoken name to a catalogue key, or returns the close matches to ask about |
| `exercise_coaching(key)` · `plan_rationale(item)` | Retrieval from the 735 coaching records and `rationale.ts` |
| `training_history(query)` | The Capability Scope Tier C read, green-tier data only |
| `save_note(text)` | CA-D2 |

**The one rule that keeps this safe: every number in a saved program comes from the athlete or from the
engine, never from the model's own head.** Sets, reps, loads, paces and distances are either what the
athlete said or what a tool returned. Holt can *talk* about numbers freely, for example *"most people start
around 3×8"*, but a number only lands on a program card through a tool. Brief §0's guarantee, that a card is
a real object, survives unchanged.

`MEDICAL_STOP` and the acuity guard still run in code on the raw text, before and after the model. They are
not tools the model may choose not to call.

### CA-D12 — The athlete's program is the athlete's. Holt builds what they ask for.

*"I want to run 1 mile a day and then lift on Wednesday, and that's my program"* gets built. It does not
get refused and it does not get corrected into something else.

- **Build it as asked.** Seven runs of one mile plus a Wednesday lift. What the athlete did not specify
  (what the Wednesday lift contains) is either asked about once or filled by the engine, whichever the
  athlete prefers.
- **Say a concern once, then drop it.** For example: *"Running every day is fine at a mile. If your shins
  start talking, give me a rest day and I'll move things around."* Holt says it once in the conversation and
  does not repeat it on every turn or put it on the card.
- **Engine rules become advice for athlete-authored work, not walls.** The endurance floors (PAS-A7-D3),
  the 2–6 day clamp and the coherence rules keep governing what **Holt** builds on his own. They do not
  block what the **athlete** dictates. This is the same freedom the Program Builder already gives by hand.
- **Three walls remain, athlete-authored or not:** `MEDICAL_STOP` (acute symptoms stop the conversation);
  a stated limitation is never silently violated (Holt names the conflict and the athlete confirms it); and
  one active program at a time (Brief §12.1: replace or edit, never a silent second).

---

## 4. Engine work this amendment requires

These are **not built**. CA-D3 cannot ship without them.

1. **Hybrid weeks.** `CoachConstraints.goal` is a single goal today. A program is either an endurance plan
   (`assembleEndurance`) or a strength-family plan (`assemble`). *"Run twice, lift three days"* needs a week
   made of per-day intents:
   `days: { kind: 'run' | 'lift' | 'rest' | 'cardio', focus?, exercises?, detail? }[]`.
   Run days come from the endurance rulebook, lift days from the strength rulebook, and a new
   **interference rule set** places them. Examples: no heavy lower-body day the day before the key run, and
   the long run is not stacked against the heaviest leg session. Running without a race already has a
   route (`weeks` instead of `raceDate`). Today it only exists for a whole-program goal.
2. **Athlete-given exercises.** The constraint set can only **remove** exercises (`excludeExercises`).
   It needs `pinned` exercises per day, with optional sets and reps, that `assemble()` places before it
   fills the rest. Names resolve through the catalogue (`resolveKey`). A name that does not resolve is
   **asked back**, never silently dropped. Silent drops are the known Exercise Picker failure.
3. **`missingFor()` for hybrid and pinned days.** It needs to know which questions a run day, a lift day
   with a focus, and a fully specified day still need.
4. **Validation that explains.** `validate-program.ts` returns conflicts as sentences Holt can say (CA-D3),
   not only as pass/fail.
5. **Seven-day weeks and one-day weeks for athlete-authored programs.** `MIN_DAYS_PER_WEEK = 2` and
   `MAX_DAYS_PER_WEEK = 6` exist because the **Program Builder** cannot render outside that range. The PO's
   own example is seven days. The Builder has to accept 1–7 before CA-D12 can hold. Holt's *own* builds may
   keep 2–6.
6. **A tool loop in the Edge Function.** `coach-interpret` is a single parse call today. CA-D11 needs a
   tool-use loop with streaming. ⚠ **Brief §10 puts the engine on the client**, and a tool loop that
   round-trips to the phone for every tool call would be slow. `domain/coach` is pure TypeScript with relative
   imports and an injected catalogue, so it can be bundled into the Edge Function as-is. Recommended: run the
   engine tools server-side and send the finished draft to the client, which still opens it in the Builder.
7. **Per-job system prompts, each over 1,024 tokens,** so each one caches (see the note in `coach-interpret`).
   The Holt personality block is shared and comes first, so it caches across job types.

---

## 5. Pricing-plan changes — ✅ ACCEPTED by the PO, 2026-09-21

| # | Decision |
|---|---|
| **CA-D7** | **Model routing.** Haiku 4.5 for simple `ask` turns and `edit-program`. Sonnet 5 for `build-program`, `build-day`, `photo-read`, `form-check` and any `ask` that needs judgment (Capability Scope Tier D). The small jobs are the frequent ones and they are where speed is felt. The personality has to hold on both models, so CA-D10 is tested on Haiku specifically. ⚠ The plan's economics table was written for Sonnet-only and must be re-run |
| **CA-D8** | **Charge the outcome.** A `build-program` or `build-day` job costs 1 credit when the card is produced, and the conversation that gets there is free. An `ask` message stays at 1 credit. The CA-D4 question budget and the CA-D5 turn summary are what bound our cost on a free build conversation |
| **CA-D9** | **Photos:** a single read is 3 credits. A two-photo side-by-side comparison is 5 credits, offered only when the athlete asks |

---

## 6. What changes where

| File | Change |
|---|---|
| `Coach-Chat-Design-Brief-v1.0.md` §0 | *"Holt does not write programs"* → the model runs the conversation and calls the engine. Every number on a card comes from the athlete or a tool (CA-D11) |
| `Coach-Chat-Design-Brief-v1.0.md` §7 | Adds athlete-authored programs of any shape (CA-D12) and open conversation (CA-D10) |
| `Coach-Chat-Design-Brief-v1.0.md` §13 Q3 | Answered: per-job conversations (CA-D1) |
| `Coach-Chat-Design-Brief-v1.0.md` §10 | *"Conversations persist per athlete"* → jobs end on outcome; **notes** persist (CA-D2) |
| `AI-Coach-Capability-Scope-v0.1.md` §1 A2 | "Programs from a description" includes hybrid weeks and athlete-given exercises (CA-D3, §4) |
| `AI-Coach-Capability-Scope-v0.1.md` §3 D1 | Adds per-job-type logging (CA-D6) and the engine work in §4 before typing is enabled |
| Pricing plan | Model routing, per-outcome build credits, photo comparison price (CA-D7…CA-D9); economics table re-run |
| `src/domain/coach/constraints.ts` | 1–7 days for athlete-authored work (§4.5) |

---

## 7. Still open (small, do not block the build)

1. **How far off-topic Holt goes.** Recommendation: he answers anything about training, the body in
   general terms, and the life around training. For far off-topic asks (*"write my essay"*) he gives one
   in-character line and steers back. That keeps him a coach rather than a general chatbot the add-on pays
   for.
2. **Where the engine runs** (§4.6). Recommendation: server-side for the tool loop.

*Locked on PO direction, 2026-09-21. §4 is engine work not yet built, and typing stays off
(`TYPING_ENABLED = false`) until it is.*
