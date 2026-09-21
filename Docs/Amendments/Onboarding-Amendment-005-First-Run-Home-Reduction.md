# Onboarding Amendment 005 — First-Run Home Reduction

**Status:** LOCKED
**Date:** 2026-09-20
**Owner:** Product
**Amends:** `Onboarding-Amendment-003` **ONB-A3-D7** and its §28 validation row · narrows
`Onboarding-First-Time-Journey-Architecture` **ONB-D17**
**Implemented by:** `domain/home/composition.ts` (`composeHome`), `app/(tabs)/index.tsx`

---

## 1. The request

> *"Everything but the days that the workouts are on."* … *"Let's overrule them with what we've built in
> this conversation."* — PO, 2026-09-20

The conversation that produced this amendment built a first-run Home carrying four things: the chapter
title with one line explaining it, one primary action, and three quiet rows. It carried neither Your
Circle nor the Train Together / Competitions row.

## 2. ⚠ This reverses part of a decision the PO made six weeks ago, deliberately

**ONB-A3-D7** (2026-08-02) says, in the PO's own words:

> *"Home is **full from the very first launch** — chapter, Your Circle, quick actions, Explore Forge —
> with the starting-point question living IN it as a card … rather than as a screen in front of it."*

That decision is not being discarded, and the sentence that follows it in A3-D7 is the reason:

> *"A full-screen takeover that will not let you past until you answer is a gate however gently it asks."*

**ONB-A5-D1 — The thing A3-D7 forbade was a GATE, and this amendment does not build one.** A3-D7 was
written against a proposal for a full-screen question standing in front of Home. Its remedy — put the
question in Home and show everything — solved that by making Home unavoidable-in-a-good-way. This
amendment keeps every word of that: there is no takeover, no screen in front of Home, nothing that must
be answered, and every destination stays one tap away on the tab bar. What changes is only **which
cards are drawn on Home before the first workout is logged**, which A3-D7 addressed as a consequence of
the takeover it was banning rather than as a question in its own right.

**⚠ The distinction is load-bearing and a future reader will be tempted to collapse it.** "Full Home"
and "no gate" were one sentence in A3-D7 because one change achieved both. They are separable, and this
amendment separates them: **no gate is permanent; full-Home-at-first-launch is not.**

## 3. Decisions

**ONB-A5-D2 — Before the first logged workout, Home omits Your Circle and the Quick Actions row.**
Both return permanently the moment `awaiting` goes false — that is, when the athlete's first chapter
holds its first workout, the same signal `fetchAwaitingChapter` already derives. Nothing else on Home
changes: the chapter title, the hero, the starting-point card, the mission/program tiles and Explore
Forge all render exactly as they do today.

The two omitted cards are the two whose content does not exist yet for this athlete. Your Circle on day
one reads *"No friends yet"*; Quick Actions offers training with people who are not there and
competitions that cannot be entered. **A card whose only content is its own absence is not teaching the
feature, it is spending the screen.** Explore Forge — which already names Friends and Squads as
destinations — is where a brand-new athlete learns those exist, and it is already first-run-only.

**ONB-A5-D3 — The reduction ends when the athlete ENGAGES, not when they have trained.** The cards
appear as soon as `composeHome`'s `settled` is true — that is, the athlete has logged a workout, chosen
a starting point, or has a program. There is no setting and no dismissal; it is derived from what they
have done.

⚠ **THIS CLAUSE WAS WRITTEN THE OTHER WAY ROUND FIRST, AND A TEST CAUGHT IT.** The first draft keyed
the cards to the first *workout*, on the reasoning that choosing a door is not the same as training.
That is true, and it is still not the right rule: `composition.test.mjs` asserts *"a chosen freestyle
athlete is composed exactly like one who has already trained — the two routes to settled must produce
one screen."* Keying these two cards to a different fact than everything else on Home would have
shipped **two different Homes for two athletes in the same state**, which is the exact inconsistency
that assertion exists to prevent.

The corrected rule is also the better story. **The stripped Home belongs to the moment of arrival** —
before any decision has been made — and the screen opens up the moment one has been. The social cards
now graduate alongside the mission tile and the quiet program link rather than on a schedule of their
own, and a test holds them together so a future edit cannot separate them quietly.

**ONB-A5-D4 — Chapter I gets one explanatory line, and it does not displace the locked copy.**
ONB-D17's anticipation copy — *"The first page of your Chapter is waiting to be written."* /
*"Your story begins with one workout."* — is unchanged and keeps its place on the hero. The new line
sits under the chapter TITLE and answers a different question: not *what happens next* but *what this
word means*. The shipped wording is **"Written by the workouts you do."**

**⚠ The biggest word on the first screen was the one nobody could explain**, which is the whole reason
this line exists. It is a definition, not encouragement, and it must not drift into encouragement.

**ONB-A5-D5 — The primary action says what it costs.** The Start Workout CTA carries a subtitle:
**"Build the workout as you go."** It answers the objection that actually stops a first tap — *do I
need a plan before I can press this?* — and it is true: the freestyle logger needs nothing set up.

⚠ **PO ruling, 2026-09-20:** an earlier draft read *"About 40 minutes · nothing to set up."* The
duration was rejected. A first workout is as long as it is, and a number invites someone to fail it.

**ONB-A5-D6 — Every Non-Behavior in ONB-D22 survives intact.** Nothing added here is a progress bar, a
countdown, a streak, a completion meter or a deficit. The reduction shows fewer things; it never shows
a thing that is missing.

## 4. What this does NOT change

- **No gate, ever.** ONB-A3-D7's core holds in full. Nothing stands in front of Home.
- **The Start Workout CTA is never disabled** (ONB-D17).
- **The starting-point card keeps all three of its states** and its "Or just train today" escape.
- **Explore Forge stays** (ONB-A2-D4a) — it is the first-run answer to "what else is in here", and
  removing it while also removing Quick Actions would leave a new athlete no route to Friends or Squads
  except the tab bar.
- **The tab bar is untouched.** Four tabs, always, from first launch.

## 5. Validation

- A brand-new athlete's Home, **on arrival and before answering anything**, shows: chapter title +
  explanatory line · hero · starting-point card · Explore Forge. **No Your Circle. No Quick Actions.**
- The moment they choose a starting point — or train, or hold a program — Your Circle and Quick
  Actions appear, together, and never leave again.
- ⚠ **They appear at exactly the same moment the mission tile does.** If one is on screen and the
  other is not, the rule has been split and this amendment has been broken.
- Nothing at any point covers Home or refuses to let the athlete past.
- The ONB-D17 anticipation copy still appears verbatim, in its own place.
- ⚠ **ONB-A3-D7's §28 validation row is superseded by this section** — that row reads *"A brand-new
  athlete's first Home shows the full screen — chapter, starting-point card, Your Circle, quick
  actions, Explore Forge — with no takeover at any point."* Its second clause stands; its first is
  replaced by the bullet above. A checklist that still demands the old shape would fail a correct
  build, which is how a superseded row becomes a bug report.
