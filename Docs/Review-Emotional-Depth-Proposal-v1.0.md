# Making the Reviews Mean Something

## v1.0 | September 2026 · PROPOSAL, NOT A SPEC — for the PO to accept, cut, or send back

**The ask.** PO: *"I want to make weekly and monthly reviews more meaningful and emotionally pulling.
Not just numbers. How do we make that happen?"*

**Read first:** `Docs/Weekly-Review-Design-Brief-v1.0.md` — particularly §0, which bars most of the
obvious answers, and §9, which refuses to spec a monthly review until four questions are answered.
**This document answers those four.**

---

## §0 — Two things I proposed before reading the brief, and why they are dead

Stated up front because they are the first ideas anyone has, they feel right, and the brief killed both
on purpose.

| Idea | Verdict | Why |
|---|---|---|
| *"The most you've squatted since March"* | ❌ **BARRED** | §0: a comparison to another window. The database **deliberately stores no prior week**. Not an oversight — a design decision with a schema behind it. |
| *"Seven Mondays in a row"* | ❌ **BARRED** | §0 names "streak counter" explicitly, alongside rings, meters and grades. |

The bar exists for a reason worth restating: **the review must be safe to open after a bad week.** Every
comparison mechanism is a grade wearing a friendly face, and a grade turns the one surface that should
be unconditional into a thing you avoid when you are struggling. That is when it matters most.

Everything below works inside that rule. Where I want to bend it, §5 says so out loud and asks.

---

## §1 — The actual diagnosis

The screen is: Holt's line → four numbers → Heaviest → PRs → Honors.

The brief states the common week plainly: **3 sessions, some volume, no PR, no honor, one heaviest
lift.** Put those together and the ordinary review is *one sentence, four totals, and one lift.*

> **The emotional content lives in the optional sections, and they are usually empty.**
> Everything guaranteed to appear is quantitative.

So the review is at its richest on a big week — when the athlete already feels good — and at its
thinnest on the ordinary week, when a reason to keep going is worth more. That is the whole problem,
and it is not a styling problem. **The fix is to make the guaranteed content carry the meaning.**

---

## §2 — Move 1: lead with the thing that happened, not the sum

`top_lift` is the only item on the screen that is an *event* rather than a *total* — a real lift, a real
weight, a real number of reps. It is currently fifth, below four aggregates, under the label "Heaviest".

**Promote it to the hero.** Volume is unfeelable; 38,420 lb is not a memory. *"Back Squat — 225 × 5"* is.

Cost: layout only. No migration, no new data. This is the cheapest meaningful change available and I
would do it first regardless of what else is accepted.

⚠ **It is null on a cardio-only week.** The hero needs a second-choice: longest session (§3).

---

## §3 — Move 2: the snapshot is too thin to tell a story

This is the real constraint. The generator stores seven fields and none of them says *when*, *which
session*, or *what was new*. A design cannot narrate a week it cannot see.

Proposed additions to `weekly_review.data` (one migration, generator-side):

| Field | Why it earns a place |
|---|---|
| `top_lift.day` | *"Wednesday — Back Squat, 225 × 5"* is a memory. The same words without the day are a statistic. |
| `sessions[] {name, day, duration_sec}` | Lets the week be shown as **what you did**, not **how many times**. See the warning below. |
| `first_time[] {exercise}` | Exercises performed for the first time ever. **The single highest-value addition** — see §4. |
| `longest_session {name, day, duration_sec}` | The hero's fallback on a cardio-only week, and a real one: the long session is often the week's actual story. |

**Not proposed:** anything requiring RPE, readiness, or perceived effort. The app does not capture them
per set, and inventing a data-collection burden to feed a summary screen is the wrong trade.

### ⚠ The near-miss inside `sessions[]`, and why it is a near-miss

The tempting render is seven weekday slots with the trained ones filled. **Reject it.** Three filled
slots out of seven *is* a ring — it reads as 3/7 whatever the styling says, and §0 bars exactly that.

Render only the days that happened, as a list, with no empty slots and no denominator:

> Monday · Push
> Wednesday · Pull
> Saturday · Legs

Three lines that describe a week. Not three of seven.

---

## §4 — Move 3: firsts, because a first is a fact and not a grade

*"Your first time doing a Bulgarian split squat."*

This is the strongest line available inside §0's rule, and the reasoning matters because it looks like it
might be barred:

- It is not a comparison **between windows** — no prior week is loaded, no rate of change, no better/worse.
- It is a **statement of what happened**, which §0 explicitly permits.
- **PRs are already on this screen**, and a PR is a fact about the athlete's whole history. A first is
  the same kind of fact, softer, and — unlike a PR — **available on ordinary weeks.**

That last point is the one. PRs are rare; firsts are common, because people try new movements constantly.
It puts a non-numeric, emotionally real line on the ordinary week that currently has none.

---

## §5 — The one place I want to bend the rule, and I am asking rather than assuming

§0 bars comparison. §0 also permits *"what it sets up."*

That clause is currently unused, and it is the only sanctioned route to a forward-looking line. I would
like to use it, and the honest reading of where it stops is:

> **Holt may say what this week makes possible. He may not say how this week measured up.**

- ✅ *"That squat is asking for 235."* — states what it sets up.
- ❌ *"Your best week this month."* — a ranking.
- ❌ *"Two more sessions than usual."* — a comparison.

I read this as within §0 as written. **It is close enough to the line that it should be your call, not
mine.** If you say no, everything else in this document stands unchanged.

---

## §6 — The thin week

A zero-session week writes no row and is unreachable — the brief settled that. **A one-session week is
not covered anywhere**, and it is the case most likely to land badly.

The rule I would hold: **a one-session review reads exactly like a four-session one.** Same layout, same
hero, same voice, no acknowledgement that it was quiet, no encouragement to do more. The moment the
screen notices the week was small, it has graded it. Silence is the kindness.

---

## §7 — The monthly review: answering §9's four questions

§9 refuses to spec this until these are answered. Here are proposed answers.

### 1. What is it for, given the weekly exists?

**The weekly is about sessions. The monthly is about the body of work — and it belongs to Legacy.**

Not a trend chart, and not a longer weekly. A month is the first window where *accumulation* is visible:
movements that entered your training and stayed, honors earned, the shape of what you have been doing.

The differentiator I would build on: **the monthly review ends in the athlete's own words.** Legacy
already has reflection (`src/app/chapter/reflect.tsx`). A monthly review that poses one question and
stores the answer to the current chapter is worth more emotionally than any sentence Holt can compose —
because the athlete wrote it, and they will read it again in a year.

That also makes it structurally different from the weekly rather than a longer version of it, which is
exactly what §9.1 demands.

### 2. §9.1's hard question — where is the line on trend?

§9 says a monthly review is where §0's no-comparison rule gets its hardest test and someone has to draw
the line. Proposed line:

> **A review may state a FACT about the athlete's history. It may never state a RATE OF CHANGE against a
> prior window.**

- ✅ *"First month with a squat in every session."* — a fact, and a first.
- ✅ *"Eleven movements you had never done before June."* — an accumulation.
- ❌ *"Up 12% on last month."* — a rate of change. A grade.
- ❌ *"Your strongest month since March."* — a ranking.

Facts are durable and unconditional. Rates of change are a verdict on the person who lived them.

### 3. Does it snapshot, and when?

**Yes — same lazy pattern.** First app-open of a new month, `ensure_monthly_review()`, snapshotted and
frozen, no scheduler, no push. Consistency with the weekly is worth more than any gain from doing it
differently, and the lazy pattern is already proven.

### 4. Where does it live, and does it displace the weekly card?

**It displaces.** In the first week of a month the athlete sees **one** card — the monthly — and the
weekly review for that week remains reachable from Progress (P-2). Two cards stacked is the collision
§9.3 warns about, and the monthly is the rarer, larger thing; it should not have to compete for the slot
twelve times a year.

---

## §8 — What I would build, in order

| # | Change | Cost | Needs |
|---|---|---|---|
| 1 | `top_lift` becomes the hero; date range restyled | Layout only | Nothing |
| 2 | Snapshot gains `day`, `sessions[]`, `first_time[]`, `longest_session` | One migration + generator | — |
| 3 | Week rendered as days-that-happened, not a count | Layout | #2 |
| 4 | Firsts surfaced as a section, above PRs | Layout | #2 |
| 5 | Holt's tables gain phrases that name a first / a long session | `rulebook/review.ts` | #2 |
| 6 | *"What it sets up"* line | `rulebook/review.ts` | §5 approval |
| 7 | Monthly review | Migration, screen, Home card rule | §7 accepted |

1 is worth doing on its own. 2–5 are one coherent pass and where most of the value is. 6 needs a yes.
7 is a separate build.

---

## §9 — ANSWERED by the PO, 2026-09-03

All four settled. This document is no longer a proposal awaiting a decision; it is the brief.

**1 · May Holt say what a week sets up? → YES.**
The forward-looking line is in. He may name what the week makes possible — *"that squat is asking for
235."* He may never say how it measured up: no ranking, no comparison, no *"your best week this month"*.
The line, in one sentence: **he may say what the week makes possible, never how it measured up.**

**2 · What is the monthly review for? → A CHAPTER DISPATCH THAT ENDS IN THE ATHLETE'S OWN WORDS.**
It names what accumulated over the month, then asks one question and **stores the answer to the current
Legacy chapter**. That is what makes it structurally different from a longer weekly, which is exactly
what §9.1 of the design brief demanded before one could be specced. `src/app/chapter/reflect.tsx`
already exists and is where this hooks in.

**3 · The first-week-of-the-month collision? → THE MONTHLY DISPLACES THE WEEKLY CARD.**
One card on Home. That week's weekly review still exists and stays reachable from Progress (P-2); it
simply does not take the Home slot. The monthly is the rarer, larger thing and should not compete for
that space twelve times a year.

**4 · What counts as a "first"? → EVER.**
Measured against everything the athlete has ever logged. Rarer, cheaper (one lookup), and it stays
true — which is the whole reason it lands. ⚠ The rejected alternative is worth recording: a
chapter-scoped "first" would produce far more of them, but a lift done two years ago returning is not a
first, and calling it one makes the word softer every time it appears.

---

## §10 — What this unblocks

§8's build order stands unchanged, with item 6 (*"what it sets up"*) now approved and item 7 (monthly)
now specced enough to start:

1. `top_lift` becomes the hero — layout only, no dependency. **Do this first.**
2. The snapshot gains `day`, `sessions[]`, `first_time[]`, `longest_session` — one migration.
3–5. Days-that-happened, the firsts section, and Holt's new phrases — all ride on 2.
6. The "what it sets up" line — **approved**.
7. The monthly review — a migration, a screen, the Home card displacement rule, and the reflect hook.

⚠ **The weekly review is SNAPSHOTTED AND FROZEN** (`set_weekly_review_note` accepts a note only while
none exists). Every change above affects reviews generated AFTER it ships; already-written weeks keep
the prose they were born with, and that is correct — a review is a record of what that week was.
