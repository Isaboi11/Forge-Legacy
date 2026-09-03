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

## §9 — Open questions for the PO

1. **§5** — may Holt say what a week sets up? This is the only place I am asking to move the line.
2. **§7.1** — is the monthly review a Legacy chapter dispatch that ends in the athlete's own words, or
   something else?
3. **§7.4** — displace the weekly card in week one of a month, confirmed?
4. **Firsts** — is "first time ever" computed against all logged history, or since the current chapter
   began? Chapter-scoped is more meaningful and more expensive.
