# Coach Holt — Chat Surface Design Brief

## v1.0 | August 2026 · FOR CLAUDE DESIGN

**Status:** DESIGN BRIEF. No chat surface exists yet. The engine underneath it is **built, shipped and
tested** — this document describes what to design a face for, not a thing to invent.

**Read first:** `FORGE_LEGACY_PRODUCT_DNA.md` (voice, the seven-question test), `Forge-Legacy-Design-System-v1.0.md` (tokens),
`Docs/Endurance-Programming-Standard-v1.0.md` (what Holt knows about running).

---

## §0 — The one thing to understand before designing anything

**Holt does not write programs. He calls a machine that does.**

This is not an implementation detail; it is the constraint that shapes the entire surface. When an
athlete says *"build me a marathon plan"*, the model's job is to turn that sentence into a small set of
values — goal, days, date, current mileage — and hand them to `assemble()`. The program that comes back
is produced by the same deterministic rulebook the free wizard uses. The model never authors a set, a
rep, or a mile.

Three consequences for design:

1. **Every answer is one of two things**: conversation (text), or a **card representing a real object** —
   a program, a single day, an edit, a refusal. There is no third category, and no free-form "here is a
   plan" written as prose. If Holt shows you a program, it is a program that exists.
2. **A card is always actionable**, because the object behind it is real. A program card opens the
   builder. A day card starts the workout. An edit card applies or discards.
3. **Holt cannot lie about training**, because he is not the one doing the training arithmetic. He *can*
   be wrong in conversation, which is why the design must never let conversational text look like a
   prescription.

---

## §1 — What already exists (do not redesign these)

| Surface | Route | What it is |
|---|---|---|
| **The wizard** | `/coach` | The free tier. One question per card, an acknowledgement beat between answers, a reveal that opens with `BUILT BY HOLT`, ending at a **Final touches** button that hands the draft to the Program Builder |
| **The bubble** | global | A 52pt bronze circle, bottom-right, on the four tab surfaces only. Currently pushes `/coach` |
| **Ask Holt** | sheet on `/program/[id]` | Swap a movement · change sets and reps · change a cardio target · rebuild a day. Each with a scope choice: *this week* or *the rest of the block* |
| **The Program Builder** | `/program-builder` | The review screen. **Nothing Holt builds is ever saved without passing through it.** |

**The chat replaces none of them.** It is a fifth surface that can *reach* all four. The wizard stays as
the free tier and as the path for anyone who would rather tap than type.

---

## §2 — The free / paid line, which the design must make legible without being grubby

| | Free | Paid |
|---|---|---|
| Build a program (any goal, level, equipment, limitation) | ✅ wizard | ✅ and you can just say it |
| Build a single day | ✅ wizard | ✅ |
| Edit a live program safely | ✅ Ask Holt sheet | ✅ in words |
| Explain an exercise | ✅ 735 published records | ✅ |
| **Ask anything, in your own words** | ❌ | ✅ |

**The pitch is not "it builds programs" — the free one does that.** It is *"you can just talk to it."*

✅ **DECIDED 2026-08-09 — there is no wall, and the chat is unlimited.** The line above still describes
where the paid tier eventually sits, but not today: **v1 makes no model call.** A conversation costs
nothing to serve, so there is no marginal cost to recover and nothing to meter — and what it currently
offers is the same locked question set the free wizard asks two screens away. Metering that would be
charging for a nicer way through something already free.

The wall is built and switched off (`FREE_EXCHANGES = null`), with its copy kept intact. **It gets turned
on the day `interpret()` calls a model and each exchange costs real money** — and at that point the unit
is worth reconsidering: *programs built* charges for the outcome, *messages sent* charges for thinking
out loud.

---

## §3 — Screen inventory

**S-1 · Chat (the main surface).** Full screen. Presented as `fullScreenModal` like `/coach`.

**S-2 · First-run.** What a brand-new athlete sees before the first message. Not an empty state — a
deliberate introduction (§5.1).

**S-3 · The upgrade wall.** Reached when a free athlete runs out of exchanges.

**S-4 · History / past conversations.** ⚠ **May not be needed for v1** — see §13.

Everything else is an existing screen Holt hands off to.

---

## §4 — Anatomy of the conversation

### 4.1 The three voices on screen

1. **The athlete** — right-aligned, plain. What they typed.
2. **Holt, speaking** — left-aligned text. Conversation, questions, reasoning, refusals.
3. **Holt, showing** — a **card**. A real object. Never mixed into a text bubble.

A single Holt turn may be *text then card* ("Here's what I'd do, and why:" + program card). It is never
card-then-text, and never two cards in one turn.

### 4.2 The turn cycle

```
athlete types → send → Holt thinking → Holt speaking (streamed) → [optional card] → rest
```

**Thinking is a real state and needs a design.** The model call takes 1–4 seconds, and when Holt is
building a program it also runs the engine. Two distinct waits:

- **Thinking** — composing a reply. Short.
- **Building** — the engine is assembling ~17 weeks of training. Worth its own treatment; this is the
  moment the product is doing the thing it exists for, and a generic spinner wastes it.

### 4.3 Streaming

Holt's text arrives token by token. Design should assume this and decide how a card behaves when the text
above it is still arriving — the recommendation is the **card appears complete, after the text finishes**,
because a half-drawn program is unreadable and slightly alarming.

---

## §5 — Every message type

This is the core inventory. Each is a distinct design object.

### 5.1 First-run introduction

Shown once, before any message. Holt introduces himself with **some emotion** — the PO's word. This is
the moment that decides whether the athlete types anything at all.

Content: who he is, that he builds real programs rather than picking templates, and one concrete
invitation. Ends with **suggested openers** (§5.2).

### 5.2 Suggested openers (chips)

3–4 tappable prompts, because a blank text field is the hardest thing in software to answer. They must
be **real things Holt can actually do**, and they should differ by what the app already knows:

- No program yet → *"Build me a program"* · *"What should I train today?"* · *"I've got 45 minutes and dumbbells"*
- Mid-program → *"Change Thursday's session"* · *"My shoulder's off this week"* · *"Should I add a day?"*
- Post-graduation → *"What's next?"*

### 5.3 Holt asking a question

Holt often needs one more fact. **He asks one thing at a time**, exactly as the wizard does — a model
that fires five questions in a paragraph is the thing this product is meant to be better than.

May carry **quick-reply chips** for a closed question (*3 · 4 · 5 · 6 days*). Typing instead must always
work.

### 5.4 The program card ⭐

The most important object on the surface. Produced by the engine, so every value on it is real.

Must carry: **name · weeks · days per week · goal · the reason it looks like this.**

For a race plan, also: **the race, the date, peak weekly volume, the longest run.**

Two actions: **Final touches** (→ Program Builder, the only path to saving) and something quieter for
*not this*. Tapping the card itself should preview the weeks.

⚠ **It is not saved yet, and the card must say so.** A card that looks like a saved program and is not is
the single worst thing this surface could do.

### 5.5 The day card

One workout. Exercise names, sets × reps, and where per-side applies (*"3 × 10 per leg"*). Actions:
**Start it** (→ live workout) or **Send to the builder**.

### 5.6 The edit card

A proposed change to a program already running. Must show **before → after**, plainly, and the **scope**
(*just this week* / *the rest of the block*). Actions: **Apply** · **Not that**.

The safe-mutation layer decides what is legal; the card only ever proposes something already legal.

### 5.7 The refusal ⭐

**Design this as carefully as the program card.** Holt refuses often and on purpose:

- *A marathon in 4 weeks from nothing.*
- *Changing a session you already trained.*
- *Adding or removing weeks from a live program.*
- *A running goal for someone who cannot run.*

**Every refusal carries the alternative.** *"A marathon needs about 16 weeks and you've got 7. That's a
half marathon build — and it's the right way to get to the marathon later, not a consolation. Want me to
build that instead?"*

A refusal is **not an error**. It must not look like one. It is Holt being a good coach, and the design
should carry that confidence — it is arguably the most characterful thing he does.

### 5.8 The exercise explainer

735 exercises have published coaching content — setup, cues, common mistakes. When Holt explains one, the
card should be **a pointer into the real exercise page**, not a re-write of it.

### 5.9 The honest "I don't know"

Holt's knowledge has edges and they are documented ones: cycling as a goal, heart-rate zones, ultra
distances, nutrition, injury diagnosis. He says so plainly and does not improvise.

⚠ **Anything medical stops.** Not hedged, not caveated — a clear, short handoff to a professional.

---

## §6 — Every state

| State | What it is | Notes |
|---|---|---|
| **First run** | Never messaged | §5.1 |
| **Idle** | Conversation on screen, nothing pending | |
| **Composing** | Athlete typing | Send disabled while empty |
| **Thinking** | Waiting on the model | 1–4s |
| **Building** | Engine assembling | Deserves its own moment |
| **Streaming** | Text arriving | Stop control? See §13 |
| **Refusal** | §5.7 | Not an error |
| **Rate-limited** | Free tier exhausted | → S-3 |
| **Offline** | No connection | The message must be preserved, never lost |
| **Model error** | The call failed | Distinct from a refusal, and must say so |
| **Empty history** | Cleared | |

**Offline and error must be visibly different from a refusal.** One is Holt deciding; the other is the app
failing. Conflating them makes Holt look arbitrary.

---

## §7 — What Holt can do

**Build:** a program (strength · muscle · weight loss · conditioning · mobility · 5k · 10k · half ·
marathon · triathlon) · a single day.

**Change a live program:** swap a movement · change sets/reps · change a cardio target · rebuild one day
· reorder two days within a week.

**Answer:** how to do an exercise · why the plan looks like it does · what's next · progression on a lift
(from your last two sessions).

**Refuse:** see §5.7.

**Constraints he always respects:** your equipment · your session length · your limitations (shoulders,
knees, lower back, no jumping, no overhead, no barbell, no running) · your experience, per discipline.

---

## §8 — Voice

Holt is a **coach**, not an assistant.

| He is | He is not |
|---|---|
| Direct. Short sentences. | Chatty, or padded with encouragement |
| Willing to say no, and to say why | Apologetic about saying no |
| Specific — *"Thursday's run drops to 4 miles"* | Vague — *"I've adjusted your week"* |
| Interested in what you can sustain | Impressed by what you can survive |

**Never:** exclamation marks as enthusiasm · "Great question!" · emoji · calling the athlete "champ" ·
motivational filler · shame about a missed session (**anti-shame is a locked product principle**).

**Reference voice** — the shipped copy:
- *"Be honest — I'd rather build three you'll hit than five you won't."*
- *"Easy means easy. This is where the base is built."*
- *"Run 60s / walk 90s × 8 · the walk is the session."*
- *"You already did Tuesday — that's part of your record now. Want me to change next Tuesday instead?"*

---

## §9 — Entry and exit

**In:** the bubble (four tab surfaces) · Ask Holt on a program · possibly an empty-state on Workouts.

**Out — and each is a real navigation:**
- Program card → **Program Builder** (`/program-builder`)
- Day card → **live workout** (`/workout`) or the workout builder
- Exercise card → **exercise detail** (`/exercise/[id]`)
- Edit applied → back to **Program Detail**

**Coming back matters.** An athlete who goes to the builder and returns should find the conversation
where they left it, with the outcome reflected — *"Saved. That's your block."*

---

## §10 — Data and persistence

- Conversations persist per athlete. **How long is an open question** (§13).
- A program built in chat is **not saved** until the athlete passes it through the Builder.
- The API key lives in a **Supabase Edge Function secret** and never reaches the client bundle.
- Rate limiting is per athlete, server-side.
- ⚠ **The engine runs client-side, the model runs server-side.** The model returns a *constraint object*;
  the app assembles the program locally. Design should not assume the program arrives from the network.

---

## §11 — Constraints

- **Dark only.** V1 has no light theme.
- **Tokens only** — `--fl-*` / `flColor`, `flFont`, `flRadius`, `flShadow`. No new raw hex.
- **Bronze is Holt.** The established rule: *white = information · muted grey = explanation · bronze =
  Holt, decision, selection.* Bronze is not a highlight colour to be spent freely.
- **Reuse** the wizard's card, chip and button language — the two surfaces are the same coach.
- Must survive: a 280-character message · a 24-week program card · a one-word reply · a very long
  exercise name.
- Keyboard is up most of the time. **The composer must never be covered**, and the last message must stay
  visible above it.
- Accessibility: every card action reachable by label; streamed text must not spam a screen reader.

---

## §12 — Edge cases worth designing for

1. Athlete asks for a program **while one is already running** → Holt should ask whether to replace or
   edit, never silently start a second (one-active-program is an invariant).
2. Athlete asks something **completely unrelated** to training.
3. Athlete describes an **injury** → §5.9, stop.
4. **Very long conversation** → what happens at 100 messages.
5. Athlete asks Holt to **change a session they already trained** → the warmest refusal in the app.
6. Athlete sends **five messages while Holt is thinking**.
7. The model produces a constraint set the engine then **refuses** — Holt must own that, not blame it.
8. Athlete asks **"why?"** about any part of a plan → he can answer; the rulebook records reasons.

---

## §13 — Open decisions (PO, before or during design)

| # | Question | Notes |
|---|---|---|
| 1 | ~~How many free exchanges before the wall?~~ | ✅ **DECIDED 2026-08-09 — NONE. The chat is unlimited.** v1 makes no model call, so a conversation costs nothing to serve and there is no marginal cost to meter. Charging would be a toll booth on a free road — the same questions the free wizard asks two screens away. **Revisit the day `interpret()` calls a model**, and consider metering *programs built* rather than messages sent (PROMPT §14.6): it charges for the outcome rather than for thinking out loud |
| 2 | Does the chat **replace the wizard** eventually, or stand beside it permanently? | Recommendation: beside — tapping beats typing for a lot of people |
| 3 | **Conversation history** — one rolling thread, or separate conversations? | Recommendation: one thread for v1 |
| 4 | Can the athlete **stop** Holt mid-answer? | |
| 5 | Does Holt ever **start** a conversation? (the PO's *"asks questions halfway through a program"* idea) | Powerful, and easy to make annoying |
| 6 | **Voice input?** | The gym is the use case |
| 7 | Does chat get its own **tab**, or stay a bubble? | |

---

## §14 — What to deliver

Per `Component-Design-Specs` convention, `<Name>.dc.html` is ground truth:

1. **`CoachChat.dc.html`** — the main surface, with every state in §6.
2. **`CoachChatFirstRun.dc.html`** — §5.1 + openers.
3. **`CoachChatUpgrade.dc.html`** — §3 S-3.
4. **Message component specs** — athlete bubble · Holt text · program card · day card · edit card ·
   refusal · exercise pointer · thinking · building.
5. **The composer** — empty, typing, disabled, offline.

**If two things get the most attention, make them the program card (§5.4) and the refusal (§5.7).** The
first is what the product is for. The second is what makes it a coach rather than a generator.
