# Monetization Architecture Amendment 009 — Conversion Nudges

**Status:** LOCKED (MA9-D1 to MA9-D5) · one decision open for the PO (§5)
**Date:** 2026-09-30
**Owner:** Product (PO request 2026-09-30)
**Amends:** `Docs/Coach-Holt-Exploration-Nudges-Plan.md` (a ninth nudge; one eligibility rule)
**Leaves unchanged:** MA6-D9 (two paywall moments), MA6-D11 (trial language), MA8-D5 (discovery nudges on every plan), M-7 §12
**Implemented by:** `src/domain/coach/nudges.ts`, `src/data/nudge-live.ts`, `src/components/forge/CoachBubble.tsx`, `src/app/weekly-review/[week].tsx` — commit `f7318d18` on `feat/upgrade-nudges`. No migration.

---

## 1. The request

> *"How can we implement nudges to have more conversion to the higher tier levels? Without being
> annoying."* — PO, 2026-09-30

The worry behind it: the 81 Forge day templates are free, so a free athlete could cycle them forever and
never feel a reason to move up. The PO kept the templates free and asked for nudges instead, and approved
building the first two: one when somebody keeps running the same workout, one at the end of the weekly
review.

## 2. What the locked rules already say

Three rules decide the shape of this, and the first proposal made in conversation broke two of them.

* **MA6-D9 — "Two paywall moments, and only two."** Once at the end of onboarding, and at a limit. A
  nudge that opens the plan screen would be a third.
* **The nudge catalogue's own rule** (`nudges.ts`, from the Exploration Nudges Plan §3): *"Nothing behind
  the paywall. An invitation to spend money is not an invitation to explore, and it would poison a
  channel whose only asset is that it has never sold anything."* Holt's coin is the same object that
  carries the coaching during a workout; teaching people to ignore it costs the coaching too.
* **MA6-D11 — trial language is allowed on the plan screen and the website only.** "Try it free for 7
  days" may not appear in a nudge.

So the conversation's "every nudge says try it free for 7 days" and "ask for the upgrade" are **not
built**. What is built converts a different way, and stays inside all three rules.

## 3. The decisions

**MA9-D1 — A nudge invites people to the feature, never to a plan.** The free plan already includes one
Holt program and two Holt days a month. A nudge sends a free athlete to use that. They feel what a
planned week is like, and the upgrade screen appears where MA6-D9 already puts it: at the limit, when
they want the next one. Once a free athlete's included Holt program is used, both "want me to build you a
plan?" nudges go silent, because following them would now land on the upgrade screen. The existing
`program` nudge is held to the same rule.

**MA9-D2 — A ninth nudge, `plan`, fires on evidence.** When an athlete with no active program has run
the same workout three times in 60 days outside a program, Holt names it: *"You've run Push Day A 4
times. Want me to build a plan around it that moves week to week?"* It leads to the same place as the
`program` nudge (`/coach`). It is first in the catalogue, because it is the only nudge triggered by
something the athlete just did rather than by something absent. The count is by workout name, from the
athlete's own saved sessions, because a Forge template has no database row to count against. Sessions
the app named itself ("Freestyle Workout") never count.

`plan` and `program` are one question. An answer to either is an answer to both: accepted once, or
refused twice, and neither asks again.

**MA9-D3 — The weekly review ends with one line.** For an athlete with no active program: *"Want me to
plan next week for you?"* and a link, **Build my plan**. No card, no button that competes, and no
"Not now" — leaving the page is the no. It is the same question as MA9-D2 and obeys the same answers,
and it does not appear in a week where the coin already asked. It says nothing about the week itself, so
the review's hard rules (no comparison, no grade) are untouched.

**MA9-D4 — The cadence is the existing one, unchanged.** Nothing until three sessions. One nudge a week
across the whole catalogue. A refusal rests for 21 days; two refusals end it. Never during a workout,
a ceremony or the tour. "Tips from Holt" off also hides the weekly review line.

**MA9-D5 — Every nudge is counted.** `nudge_shown`, `nudge_accepted` and `nudge_dismissed` are recorded
with the nudge's id (never its wording). This is what will let the CRM say which invitations people
follow.

## 4. What is not built

* **A CRM view of nudge results.** The events are being recorded; showing "shown → accepted → upgraded
  within 14 days" per nudge needs one small admin function and a migration.
* **The other two nudges discussed** — Holt days used up, and a food-logging streak. Both need a line
  that names the paid plan, so both wait on §5.
* **A free taste of Holt AI** (a few free AI messages). It costs money per use and is its own decision.

## 5. Open for the PO

**When a free athlete has used the included Holt program, may Holt say so and offer Premium?**

Today the answer is no: the nudge goes silent (MA9-D1), and the athlete meets the upgrade screen only
when they try to build another program themselves. That is the rule as locked.

Saying yes would mean a line like *"You've run Push Day A 4 times. Building on it is part of Premium.
Want to see it?"* opening the plan screen. It would reach exactly the people most likely to convert, and
it would be the first time Holt's coin sold anything. It needs MA6-D9 changed from two paywall moments to
three and the nudge catalogue's rule rewritten, and the plan screen (not the nudge) would carry the
"7 days free" wording.

Recommendation: leave it as built for now, watch the counts from MA9-D5 for a few weeks, and decide with
numbers.

## 6. What did not change

| Document | Status |
| --- | --- |
| MA6-D9 (two paywall moments) | Unchanged. Neither nudge opens M-7 or P-8. |
| MA6-D11 (trial language) | Unchanged. No nudge mentions a trial or a price. |
| MA8-D5 (discovery nudges on every plan) | Unchanged. Both nudges show on every plan. |
| M-7 §12 non-behaviours | Unchanged. |
| MA3: the 81 Forge templates are free and never count | Unchanged (PO 09-30: keep them free). |
| Weekly Review Design Brief §6 hard rules | Unchanged. |
