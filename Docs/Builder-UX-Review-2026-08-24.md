# The three builders — a walkthrough review

**Type:** UX review · **Date:** 2026-08-24 · **Scope:** Program Builder, Workout (day template) Builder,
Week Builder, and the Templates hub that fronts them.

**Method:** every screen, route, sheet and draft-model function read end to end, plus the 58 tests in
`src/lib/__tests__/program-draft-model.test.mjs` (all passing). Claims below cite the line that proves
them. Nothing here is inferred from a screenshot.

---

## ✅ ACTED ON THE SAME DAY — read this before the findings

The PO answered all three open questions on 2026-08-24, and the work is in the tree. **The findings below
are left in their original wording on purpose**, because they are the record of *why* each change was
made; where one is now out of date the fix is named beside it.

| Finding | Then | Now |
|---|---|---|
| §3 Week template → program week | Impossible | ✅ **BUILT.** `weekTemplateIntoWeek` + `weekFit` (`program-draft-model.ts`), "Use a saved week" in the Week sheet, `WeekTemplateSheet`, and a confirmation that states the day-count cost in numbers. **10 new tests.** |
| §4.1 Customize → Repeat loses varied weeks | Silent | ✅ **FIXED.** `requestRepeat` confirms when any week past the first holds work, worded honestly — set aside now, discarded only on Save. |
| §6.1 Templates walkthrough contradicts the screen | Wrong copy | ✅ **FIXED.** Both steps rewritten; the second now names both sizes and the new week-into-program move. |

**Still open (PO has not been asked):** §6.2 the `week-builder` tour, §5 the `display: none` CTA, §4.3 a
template picker in the standalone Workout Builder.

**Gates:** `tsc` — 0 errors in any file touched here · `eslint` clean on all three · **2782/2782 tests
pass**. No migration, and nothing deployed yet.

⚠ **The day-count seam is the part to test by hand.** A 5-day week template dropped into a 3-day program
drops two days, and a 3-day one into a 4-day program leaves a day blank. Both are stated before the
athlete commits and both are unit-tested, but only a person can say whether the sentence reads clearly at
the moment of choosing.

---

## The short answers

| Question | Answer |
|---|---|
| Can I add a **day template** into a program day? | **Yes.** Yours and Forge's, one search over both, replace-or-add if the day has content. |
| Can I add a **week template** into a program week? | **Was no** — there was no mechanism, not just no button. **Now yes**, built the same day; see the box above. |
| Is it confusing? | **Mostly no** — with three specific exceptions, below. |
| Is it easy to navigate? | **Yes.** Three doors, each beside the thing it creates. |
| Is it too hard? | **No.** One real cliff: the Repeat/Customize choice. |
| Should we have walkthroughs? | **They already exist** — and two of them are now wrong. |

---

## 1 · What the three builders actually are

This is the thing worth stating first, because the file layout hides it:

- **Build a Program** → `/program-builder`
- **Build a Week** → `/program-builder?mode=week` — **the same screen**, with the length control, the
  spreadsheet import and the Repeat/Customize block removed (`program-builder.tsx:1887, 1940, 1955`)
- **Build a Template** → `/workout-builder` — **a genuinely different screen** (W-25), one day, no weeks,
  no day letters

So there are **two** builder screens, not three, and the one that looks like it should be shared (week vs
day) is the one that is not.

**This is the right call and it is well executed.** Week mode is signposted properly: the AppBar reads
"New Week", the save button reads "Save Week", and a context banner says *"One week you can run again
whenever you want"* — written specifically to explain the missing length control
(`program-builder.tsx:1835-1846`). `workout-builder.tsx`'s header argues its own separation
convincingly: a program day is a day *of something*, and lifting that view over would drag program
semantics into a thing that is not a program.

---

## 2 · Day template → program day: **yes, and it is the best-designed part**

`Use a template` sits at the **bottom** of the day editor, below the three sections, deliberately — so
the exercise-by-exercise path stays the default reading and this reads as the shortcut it is
(`program-builder.tsx:2412`). The sheet searches **your templates and Forge's starters together**, on the
stated reasoning that "where's my push day" is genuinely answered by either library, and making the
athlete pick a tab first would ask them to know the answer before they can look (`:1640-1670`).

Two details that are easy to miss and both correct:

- An **empty** day just takes the template. A day **with content** asks replace-or-add, because replacing
  is destructive and building a day out of two shapes is a real intention (`:1673-1690`).
- The sheet says, in the sheet: *"nothing is linked, so editing the day never touches the template."*
  That is the single question anyone has about template insertion, answered before it is asked.

**No change recommended.**

---

## 3 · Week template → program week: **no, and this is the headline**

`WeekSheet` offers exactly two things: **copy a week already built in this same draft**, and **start
empty / clear** (`program-builder.tsx:1274-1310`). Saved week templates are not offered.

It is not a missing button. `src/lib/program-draft-model.ts` has `templateIntoDay` and `copyWeek`
(within-draft) and **no `weekTemplateIntoWeek`**. `fetchWeekTemplate` is called in exactly one place — to
load a week *for editing* (`:590`). There is no code path from a saved week into week N of a program.

### ⚠ But before treating it as a gap — the amendment already decided a different model

`Docs/Amendments/Program-Architecture-Amendment-002-Short-Programs-And-Completion.md`, **PA2-D8**:

> Re-running a Finished program is a new program. […] **This is what makes a week template worth having:
> the same week, run four times, is four honest records.**

And §5 is headed *"What this amendment deliberately does NOT change"*, recorded — in its own words — "so
that absence reads as decision rather than oversight."

So a week template is designed as **a thing you re-run**, each run its own record, not **a block you
compose with**. `Start This Week` builds a fresh one-week program and ends whatever was active
(`week-template/[id].tsx:70-84`). `Docs/Week-Template-Detail-Spec-W29.md` never mentions composition
either.

**So this is an unmade decision, not a broken one.** The honest framing for the PO is:

> A week template today is a *run-again* shape. It is not a *building block*. Nothing is broken; the
> second idea was never built, and one document argues for the first.

### What makes it feel like a gap anyway

The **asymmetry is not explained anywhere the athlete can see it.** Day templates drop into days.
Week templates do not drop into weeks. Both live on the same hub, under headings one line apart
("Your Weeks", then the day templates). An athlete who has just filled Day A from a template and then
opens Week 3 will look for the same move, and the Week sheet's copy — *"Copy a week you've already built
into this one, or start from scratch"* — reads as an exhaustive list of the options, which it is.

**Recommendation — pick one:**

1. **Build it.** The pieces exist: `draftFromStructure` already turns a saved week into days
   (`program-draft-model.ts:661`), so the work is a sheet plus a `weekTemplateIntoWeek` that writes those
   days into `weekPlans[n]`. Roughly the size of `templateIntoDay`.
2. **Say it.** One line in the Week sheet — *"Saved weeks run on their own; use Copy to reuse a week from
   this program."* Costs nothing and closes the question.

Doing neither leaves the athlete to discover the asymmetry by failing to find it.

---

## 4 · Where it is genuinely confusing

### 4.1 ⛔ Customize → Repeat silently discards every varied week, at save

The Repeat/Customize toggle is the most consequential control in the builder — its own tour step says
so: *"This choice changes everything below."* Switching **Repeat → Customize** is handled beautifully:
week 1 is **seeded** from the repeating week, on the explicit reasoning that an athlete who built a week
and then chose customize means "…and now let me vary it", not "throw that away"
(`program-draft-model.ts:387-398`).

The reverse is not handled at all.

- `onRepeat={() => mutate(setRepeatMode)}` — **no confirmation** (`program-builder.tsx:1025`)
- `setRepeatMode` just sets `vary: false`; the built weeks vanish from the screen (`activeDays` reads
  `d.days` when not varying, `:134`)
- and then `draftToStructure` writes **`weekPlans: d.vary ? d.weekPlans : null`** (`:583-592`)

So: build eight varied weeks → tap "Repeat the same week" out of curiosity → the screen shows one week
again → Save → **the eight weeks are gone.** The draft is cleared after save, so there is no undo.

This is inconsistent with the builder's own standard: **reducing the week count confirms** with
*"Weeks N–M will be removed… This can't be undone"* (`:704-723`). The control that destroys more
destroys it more quietly.

**Fix (small):** confirm on Repeat when any week beyond the first holds content — the `pendingResize`
sheet already exists and `weekBuilt` already answers the question. Until saved, flipping back genuinely
restores everything, so the confirmation can honestly say "your other weeks are kept until you save".

### 4.2 The same screen saves into two different worlds

`Save Program` → `/program/[id]` (Programs). `Save Week` → `/week-template/[id]` (Templates)
(`program-builder.tsx:827-831`). Same screen, same button position, two destinations in two different
tabs. It is correct — a week *is* a template — but it is the one place where "which builder am I in"
has a consequence the athlete only discovers on landing. The context banner mitigates it; worth watching
in testing rather than changing now.

### 4.3 You cannot start a day template from a template

The program builder's day editor can fill a day from a saved template. The **standalone template
builder cannot** — `workout-builder.tsx` has no template picker at all (grep for `fetchTemplates`:
nothing). To make a variant of an existing template you must go to its detail screen and **Duplicate**,
then edit — a different verb, in a different place, that a person looking at an empty builder will not
think of.

Minor, but it is the same shape as 3: the shortcut exists in one builder and not its sibling.

---

## 5 · Navigation: this part is fine

All three doors sit on the **Workouts** tab, each beside what it creates — "Build a Program" under Your
Programs (`(tabs)/workouts.tsx:328`), "Build a Template" and "Build a Week" under Your Templates
(`:391, :395`). The comments record that both were moved there after exactly the confusion you would
predict: Build a Week used to be reachable only from the Templates hub, "so an athlete looking for it on
the tab that lists their templates found the one-session builder and reasonably concluded weeks were not
built yet."

Detail screens are consistent across all three artifacts: **Start** (primary, bronze) · **Edit** ·
**Duplicate** · **Delete behind the overflow**. W-27's rule that a destructive action is never one tap
from the primary one is followed on every one.

One dead control worth knowing about: the "Build your own program" CTA in the Discover empty state is
`display: none` (`(tabs)/workouts.tsx:426`, `styles.hidden` at `:781`) — deliberate ("authorship is not
discovery"), but it is code pretending to be a control. Delete it or restore it.

---

## 6 · Walkthroughs: they exist, and two are now wrong

| Surface | Tour | State |
|---|---|---|
| Program Builder | `program-builder`, 5 steps | Good — the structure step is the best copy in the file |
| Day editor (in-program) | `day-builder` | Good |
| Templates hub | `templates`, 2 steps | ⛔ **Wrong — contradicts the screen** |
| Program builder in **week mode** | inherits `program-builder` | ⚠ First step describes a control that isn't there |
| **Workout Builder (W-25)** | none | Gap — the one authoring screen with no walkthrough |
| Forge templates, all 3 detail screens | none | Fine — they are read-and-act screens |

### 6.1 ⛔ The Templates tour tells the athlete a feature does not exist

`tour-plan.ts:607-613`, step `tp-new`, anchored to `templates-new`:

> **"New ones come from training.** There's no blank template to fill in. Start a freestyle workout,
> build it as you go, and keep it when you're done."

The anchor `templates-new` wraps **"Build a template"** and **"Build a week"** — the two buttons that do
exactly what the copy says is impossible (`templates.tsx:379-391`). This was true before W-25 shipped and
the copy was never revisited. It is the worst kind of stale walkthrough: not merely unhelpful, actively
talking the athlete out of the feature it is pointing at.

The first step is stale too — *"Each of these is a workout you finished and kept"* — now only half true.

### 6.2 ⚠ Week mode inherits the program tour

`<ScreenTour screenKey="program-builder" ready={!openDay && !weekView} />` fires in week mode.
`ScreenTour` drops steps whose anchor is not mounted (`ScreenTour.tsx:74`), so `pb-structure` and
`pb-import` correctly disappear. But `pb-details` survives — and its body reads *"How many weeks it runs
and how many days a week you train"* on a screen with **no weeks control**.

**Recommendation:** a `week-builder` tour key, 3 steps — what a week template *is*, how it differs from a
program, and that Start replaces your active program. That last fact is the one with a consequence, and
today the athlete meets it in a confirmation sheet rather than in the walkthrough.

### 6.3 Should there be more?

**No new tours beyond `week-builder`.** The program builder's own tour is strong, and the detail screens
explain themselves. The gap that matters is not coverage, it is **maintenance**: the Templates tour went
wrong because a feature shipped and its walkthrough did not ship with it.

---

## 7 · What to do, in order

1. ✅ **Fix the Templates tour copy.** — **DONE.** It was arguing against a shipped feature.
2. ✅ **Confirm before Customize → Repeat.** — **DONE.**
3. ✅ **Decide on week-into-program.** — **DONE: BUILT.** PO chose to build rather than explain.
   PA2-D8 is not contradicted: a week template is still a thing you re-run on its own; it is now *also* a
   block you can compose with, and the two do not conflict. See §8.
4. **Add a `week-builder` tour**, and stop `pb-details` describing a control week mode does not have.
5. **Delete or restore** the `display: none` program CTA.
6. *(Optional)* A template picker in the standalone Workout Builder, for parity with the day editor.

4, 5 and 6 remain. None is architectural.

---

## 8 · How week-into-program was built

**The rule: it REPLACES the week, and there is no append.** `templateIntoDay` offers append because a day
can honestly be built from two shapes stacked. A week cannot — appending would mean "add days to the end",
and the end is fixed by `daysPerWeek`. So the only honest question is what the replacement *costs*.

**That cost is arithmetic, not opinion, so it is computed and stated.** `weekFit(draft, sourceDays)`
returns `{ taken, dropped, emptied }`, and it is surfaced twice: on each row of the chooser (*"fits
exactly"* / *"2 days won't fit"* / *"leaves 1 day empty"*), so a choice between saved weeks can be made
before tapping one; and in the confirmation, as a sentence with the reason in it — *"This week has 5 days
and your program trains 3 — only the first 3 come in."* A bare "2 days won't fit" reads as a bug in the
import rather than as two day counts that were authored independently.

**Position owns the letter; the template owns everything else.** Slot 0 stays `A` however the template
named it, because `lockedCells` and the schedule both address days by position. The day NAME travels,
because that is content rather than address.

**A shorter week empties the days it does not reach.** Leaving day D holding whatever was there would
produce a hybrid week nobody authored and with no visible seam — the worse of the two failures, and the
one found weeks later.

**It asks nothing when there is nothing to say:** an empty target week plus an exact day-count match
applies silently. Every other combination confirms.

**It also works in Repeat mode**, filling the one week that exists — the index is ignored there. That path
has no UI yet; the Week sheet is reachable only in Customize mode. Wiring an entry point for Repeat mode
is a one-`Pressable` follow-up if it is wanted.

⚠ **What it deliberately does NOT do: change `daysPerWeek` to make a template fit.** That value governs
every week in the program, so importing one week would silently restructure all of them. The confirmation
names the mismatch instead and leaves the decision with the athlete.
