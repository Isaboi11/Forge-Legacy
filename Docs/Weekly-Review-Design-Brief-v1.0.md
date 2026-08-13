# Your Week — Weekly Review Design Brief

## v1.0 | August 2026 · FOR CLAUDE DESIGN

**Status:** DESIGN BRIEF for a feature that is **built, shipped and wired**. Migration `0140`, commit
`cd1d9b3` *"the weekly review, and it arrives on Home"*. Two surfaces exist and work today; this document
describes what to design a better face for, not a thing to invent.

**There is no monthly review.** Nothing in the codebase, the database, or the migrations implements one —
the only mention is a pricing line in `Forge-Legacy-Master-Status.md` that calls it *"in build"*. §9 says
what one would have to answer before it could be designed. Do not design a monthly surface off this brief
without reading §9 first.

**Read first:** `FORGE_LEGACY_PRODUCT_DNA.md` (voice, §8/§10), `Forge-Legacy-Design-System-v1.0.md`
(tokens), `src/app/squad-recap/[id].tsx` (the sibling surface this one deliberately rhymes with).

---

## §0 — The one thing to understand before designing anything

**It is a review, not a scoreboard.**

A weekly summary is the easiest surface in the app to turn into a grade, and a grade is what
`Active-Workout-Flow-Spec-W9-W16` §6.2 and Product DNA §8/§10 both bar. The rule the whole feature is
built around:

> **It states what happened and, where there is one, what it sets up. It never grades the week and never
> compares it to another one.**

- ✅ *"Four sessions and a PR on the bench. That is a week that moves things."*
- ❌ *"Down two sessions from last week."* — a comparison. **The database deliberately stores no prior
  week to compare against.** There is no field for it. It is not an oversight.
- ❌ *"Only two sessions."* — "only" is a judgement.
- ❌ Any ring, meter, percentage, streak counter, grade letter, or ✓/✗ against a target.

**And a bad week does not exist here.** A week with no workouts writes no row at all — the Home card never
appears and the screen is never reached. There is no "0 sessions, keep going!" state to design, because
`ensure_weekly_review()` returns `null` specifically to make one impossible. *Silence beats zero.*

---

## §1 — What exists today

| Surface | File | What it is |
|---|---|---|
| **The Home card** | `src/components/forge/WeeklyReviewCard.tsx` | Appears on Home the first time the athlete opens the app in a new week. Holt's mark, his one line, three stats, **View review** / **Skip** |
| **Your Week** | `src/app/weekly-review/[week].tsx` | Full screen the card opens. Date range, Holt's line, a 4-stat strip, then Heaviest / Personal records / Honors sections |
| **The generator** | `supabase/migrations/0140_athlete_weekly_review.sql` | Writes the snapshot lazily on first app-open of a new week. No scheduler, no cron, no push |
| **Holt's sentence** | `src/domain/coach/rulebook/review.ts` | Three phrase tables composed into 2–3 sentences, chosen **by the numbers**, written once and frozen |
| **Sibling: squad recap** | `src/app/squad-recap/[id].tsx` | The same idea one level up (a squad's week). **These two must not look like two different products.** |

### The mechanics that constrain the design

1. **Lazy, no scheduler.** The row is written the first time the athlete opens the app in a new week.
   By the time it exists they are *already in the app* — so **a push notification can never announce it**.
   That is exactly why the PO asked for a Home card: it needs no permission, no token, no infrastructure.
2. **Snapshotted, never recomputed.** The numbers are frozen at generation. Deleting a workout later does
   not rewrite last week's review. It is a record of what that week *was*.
3. **Holt's sentence is composed once and stored.** `set_weekly_review_note` accepts a note only while
   none exists, so the prose cannot re-word itself on a later read. Design accordingly: **the same review
   opened twice reads identically.**
4. **The window is the week that just closed**, bucketed in the athlete's own timezone (`profiles.tz`),
   never the week in progress.

---

## §2 — The exact data the design has to hold

`WeeklyReviewData`, from `src/domain/coach/rulebook/review.ts`:

| Field | Type | Realistic range | Notes |
|---|---|---|---|
| `workouts` | number | 1–9 | Never 0 — a 0 week writes no row |
| `days_trained` | number | 1–7 | ≤ `workouts` (two-a-days exist) |
| `volume_lb` | number | 0 – ~120,000 | **Can legitimately be 0** — a week of bodyweight or cardio only |
| `duration_sec` | number | ~600 – ~40,000 | Rendered `h:mm:ss` past an hour, else `m:ss` |
| `prs` | `{exercise, value}[]` | **usually `[]`**, occasionally 1–4 | `value` can be `null` |
| `honors` | `{honor}[]` | **usually `[]`**, occasionally 1–3 | Display names, can be long |
| `top_lift` | `{name, weight, reps}` \| `null` | `null` on a cardio-only week | `weight`/`reps` individually nullable |

**Design for the common case, which is plainer than it looks:** most weeks are *3 sessions, some volume,
no PR, no honor, one heaviest lift*. A layout that only looks good with a PR row and two honors will look
broken most weeks. Show it at its emptiest first.

`weekStart` / `weekEnd` are ISO dates (`2026-08-03` / `2026-08-09`) — currently rendered raw as
`2026-08-03 — 2026-08-09`, which is one of the weaker details on the screen and is fair game.

---

## §3 — Screen inventory and states

### S-1 · The Home card

Sits **below** the hero (unfinished workout / today's session) and never outranks it. What somebody opened
the app to do comes first; a summary of last week can wait four inches.

| State | What it shows |
|---|---|
| **Entitled** (today: everyone) | Eyebrow `YOUR WEEK` · title *"Holt looked at your week"* · **his line only** · three stats (`4 sessions` · `38,420` · `4:52:10`) · **View review** + **Skip** |
| **Locked** (paid tier lands later) | Same frame, title *"Your week is ready"*, body *"4 sessions last week. Holt's read on it comes with the paid tier."* · **See what you get** + **Skip** |
| **Skipped** | ⚠ **AMENDED 001** — card is retired for **this week**, and the dismissal survives a relaunch. Was "this session only" |
| **No review** | **Nothing renders.** No placeholder, no "check back Monday" |

Two rules that are decisions, not accidents:

- **The card carries Holt's sentence, not the numbers.** If the card showed the full week there would be
  nothing left to open. The three stats are a teaser, not a summary.
- **Skip is real, and it is for this week only.** It dismisses *this* card — it is not a preference, does
  not disable the feature, and next week's review still arrives. ⚠ **AMENDED 001:** it is now **stored**
  device-locally, keyed to `week_start`. The original rule held it in memory because "not now" expiring on
  the next launch read as honest; on the web preview "the next launch" is a page refresh, so it expired
  before the athlete had left the screen. **Reading the review retires the card too** — see
  `Docs/Amendments/Weekly-Review-Amendment-001-Card-Retirement.md`.
- **Locked shows as locked, never hidden.** An athlete who cannot see the feature exists has no reason to
  want it — and hiding it would also make their week look like it did not happen.

### S-2 · Your Week (`/weekly-review/[week]`)

Order, top to bottom, and the order is deliberate: **Holt first, numbers underneath.** The numbers are
evidence for what he said, the same way the Active Workout puts an instruction above the history it came
from.

1. App bar — *Your Week*, serif, back arrow
2. Date range, bronze-grey uppercase micro-label
3. **Holt block** — his mark (bronze medallion) + his 2–3 sentences
4. **Stat strip** — Sessions · Days · Volume · Under iron
5. **Heaviest** — one row: lift name / `225 lb × 5` *(omitted if `top_lift` is null)*
6. **Personal records** — one row each *(omitted if empty — which is most weeks)*
7. **Honors** — one row each *(omitted if empty)*

| State | What it shows |
|---|---|
| **Loaded** | The above |
| **Loading** | Bronze spinner, centred |
| **Unreachable empty** | *"Nothing to review yet / Reviews arrive the week after you train. Log a session and this fills in."* — only reachable by a deep link, since the card is the only door |

---

## §4 — The copy, which is generated and must be designed for as generated

Holt's note is **not written per athlete**. It is three tables, selected by the numbers, in a fixed
three-beat shape: **opener → the least ordinary true thing → forward-looking close.**

**Beat 1 — the opener**, chosen by week *shape*. ⚠ The bands describe **frequency only** and rank nothing.
`steady` is not "mediocre" — it is the most common real week and what most training is made of.

| Shape | Sessions | Example openers |
|---|---|---|
| `single` | 1 | *"One session in the book." / "You got one in."* |
| `steady` | 2–3 | *"3 sessions this week." / "You trained 3 times."* |
| `full` | 4–5 | *"4 sessions — a full week." / "5 times in, across 4 days."* |
| `heavy` | 6+ | *"6 sessions. That is a heavy week."* |

**Beat 2 — one fact, and only one.** Ordered by what is **rarest**, not biggest: honor → single PR →
multiple PRs → heaviest set. Three facts in a row is a report, not a coach. On a plain week this beat is
the heaviest lift; on the plainest week it is **absent entirely and the note is two sentences.**

**Beat 3 — the close**, forward-looking, never a verdict:

| Shape | Example closes |
|---|---|
| `single` | *"Same again this week and it starts to be a habit."* |
| `steady` | *"Keep it there." / "That is the rhythm — hold it."* |
| `full` | *"That is a week that moves things."* |
| `heavy` | *"Make sure the rest matches the work." / "Recovery earns that back."* |

### Real composed notes to design against

- *"3 sessions this week. Heaviest was Barbell Back Squat at 315 lb. Keep it there."* ← **the typical one**
- *"You trained 2 times. Same again this week."* ← two sentences, no middle beat, **shortest possible**
- *"5 times in, across 4 days. You earned Iron Discipline along the way. Hold that and the numbers follow."*
- *"6 sessions. That is a heavy week. 3 personal records in it. Recovery earns that back."* ← **longest**

**Layout must survive ~45 to ~180 characters** with no visual gap at the short end. Holt never uses an
exclamation mark, never says "Great!", and never compliments a tap — no design element should imply
applause the copy refuses to give.

---

## §5 — What is currently on screen (the baseline to beat)

Not a spec to reproduce — the shipped state, so you know what "better" is measured against.

**Home card:** `charcoal900` fill, `bronzeBorderSubtle` hairline, `flRadius.xl`. Holt's mark at
`BUBBLE_SIZE × 0.72`. Eyebrow 10pt/700/1.6 tracking uppercase `bronze400`; title 18pt display 600
`cream100`; note 13.5/20 `gray400`; stats 12.5/600 `gray600` in a wrapping row; primary action a bronze
pill (`bronzeTint` fill, `bronzeBorder`, `bronze300` text), Skip as bare `gray600` text.

**Your Week:** slate screen background at 30% flat overlay, serif `AppBar`. Section labels 10.5/700/1.5
uppercase `bronze400`. Cards `charcoal900` on `charcoal700` hairline at `flRadius.lg`, rows 13pt vertical
padding with a top divider between siblings. Stat numbers 21pt display 600 `cream100` over 10.5 uppercase
`gray600` labels, in a flex-wrap strip with 22pt gaps.

**The squad recap next door** uses a centred hero disc with `glowSubtle`, a 24pt display title, a bronze
date range and a **boxed, divided stat strip** on `charcoal800`. Your Week uses a bare, gapped strip
instead. **They should read as one family — reconciling those two strips is fair game and probably
wanted.**

---

## §6 — Hard rules (a design that breaks one of these is wrong, not different)

1. **No comparison to any other week.** No arrows, no deltas, no "vs last week", no sparkline of prior
   weeks. The data does not exist and must not be invented.
2. **No grade, score, ring, percentage, or target completion.** Nothing that implies the week could have
   been failed.
3. **No empty state on Home.** Zero-workout weeks render nothing at all.
4. **Holt's line stays above the numbers**, with his mark on it. A summary with no author reads as a
   generated report; the same words beside the medallion read as somebody having looked.
5. **The card teases, the screen tells.** Do not move the full stat set onto the card.
6. **Skip stays visible and stays weaker than View.** It is a real, respected action — not a dismissal X
   hidden in a corner, and not a button that competes.
7. **Locked is a state of this card, not a different card.** Same frame, same position, same mark.
8. **No celebration ceremony.** Honors have their own ceremony surface; this is a quiet weekly read.

---

## §7 — Open questions worth a designer's opinion

1. **The date range is raw ISO** (`2026-08-03 — 2026-08-09`). It is the weakest line on the screen.
2. **The Volume stat carries no unit.** `fmtVolume` returns `38,420` with no `lb`, so the app's unit
   converter passes it through untouched — a kg athlete sees a pounds number with nothing labelling it.
   Whatever the fix, the design has to make room for a unit or a suffix.
3. **The Home card's stats and note are not unit-converted**, while the screen's are. Same numbers, two
   answers, one tap apart.
4. **The three teaser stats on the card are unlabelled** (`4 sessions` · `38,420` · `4:52:10`) — the
   middle two are only guessable from context.
5. **Where does an old review live?** Reviews are permanent rows, but the only door is this week's card.
   Nothing lists past weeks. If a history surface is wanted, it belongs to Progress (P-2), not here.

---

## §8 — Deliverable

Per house convention, a `.dc.html` per surface, self-contained, dark-only, built on `--fl-*` tokens:

- `Weekly Review Card.dc.html` — the Home card in **all four states** (entitled, locked, skipped/absent,
  long note), shown in Home context so its weight against the hero is judgeable.
- `Your Week.dc.html` — the full screen in **at least two states**: the plain week (no PRs, no honors,
  two-sentence note) and the loaded week (heaviest + 2 PRs + 1 honor).

Show the plain week first in both. It is what most athletes will actually see.

---

## §9 — The monthly review does not exist

There is **no monthly review** in the app: no migration, no table, no RPC, no screen, no component, no
copy tables. It is named once, in a pricing bullet, as *"in build"*.

It is also **not a copy-paste of the weekly one**, and these are the questions that have to be answered
before anything can be designed:

1. **What is it for, given the weekly one exists?** Four weekly reviews already told the athlete what
   happened. A monthly review that just sums them is a longer version of something they have read four
   times. The likely honest answer is that a month is the first window where **trend** is legible — but
   trend is a comparison, and §0 bars comparison-as-grade. **A monthly review is where that rule gets its
   hardest test, and someone has to decide the line before it is drawn.**
2. **Does it snapshot, and when?** Same lazy pattern (first open of a new month) or something else?
3. **Where does it live?** Another Home card competing with the weekly one, or a Progress (P-2) surface?
   Two cards stacked on Home in the first week of a month is a real collision.
4. **Does it displace the first weekly card of the month, or sit beside it?**

Bring me those four answers and I will spec it the same way this one is specced. Until then, this brief
covers the weekly review only.
