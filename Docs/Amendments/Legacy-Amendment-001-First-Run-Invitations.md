# Legacy Amendment 001 — First-Run Invitations

**Status:** LOCKED
**Date:** 2026-09-20
**Owner:** Product
**Amends:** `Legacy-Hub-Wireframe-Spec-L1` **§12.1** (empty-state philosophy) and **§17.1** (the
brand-new-athlete state) · unaffected: §12.2's chapter branch, already superseded by **ONB-D14**
**Implemented by:** `app/(tabs)/legacy.tsx`

---

## 1. The request

> *"I like the legacy, but it needs to still feel luxurious. And somewhere explain that this is their
> profile and legacy."* — PO, 2026-09-20

Followed by the instruction to build the first-run Legacy screen as drawn: a title, one explanatory
line, and three invitations — **Add Your First Progress Photo · Add an Accomplishment · Add a Quote.**

## 2. ⚠ This contradicts L-1's most quoted sentence, and the code already did

**L-1 §12.1** reads:

> *"When a section has no qualifying content, it is absent. **Not empty. Not placeholder-filled. Not
> replaced with a prompt. Absent.**"*

**LEG-A1-D1 — The rule was already half-abandoned in the build, and for a good reason.** Legacy ships
an Accomplishments invitation on an empty section today, with a comment in `legacy.tsx` explaining why:
you previously needed an accomplishment to reach the screen where you add one. Absence had made a
feature unreachable. **This amendment stops that being an exception and makes it the first-run rule.**

**⚠ The distinction §12.1 was reaching for is worth keeping, so this amendment states it precisely:**

- **A placeholder** shows the SHAPE of content that is not there — a grey card where a photo will go, a
  row of dashes where a number will be. It says *you are missing something.* **Still forbidden.**
- **An invitation** is a real control that performs a real action. It says *here is a thing you can do.*
  **Permitted, on first run only.**

An earlier draft of this work proposed a greyed "what will be written" list. That is a placeholder by
the definition above, and it is **not** what this amendment permits.

## 3. Decisions

**LEG-A1-D2 — Before the first entry exists, Legacy shows an identity header and three invitations.**
In order: a title, one line naming what this tab is, then Progress Photo · Accomplishment · Quote. Each
is a live control that opens the surface that creates that thing.

**LEG-A1-D3 — The tab says what it is, in the athlete's words.** *"Capture the moments, milestones, and
progress that make you, you."* "Legacy" is the app's least self-explanatory noun and the first-run
screen is the only place it can be defined without a tour. The eyebrow reads **YOUR LEGACY** so the tab
name and the athlete's ownership of it arrive together.

**LEG-A1-D4 — Three, and these three.** Not four. **"Write a Note" is removed from the first-run set**
— it asks for reflection from someone who has not yet done the thing worth reflecting on. Honors are
**not** invited, on day one or ever: they are earned, and an invitation to earn one is a task list.
This preserves L-1's asymmetry — authored things can be invited, earned things cannot.

**LEG-A1-D5 — The invitations retire individually, as each is satisfied.** Adding a photo removes the
photo invitation and reveals the real Photos section; the other two remain. There is no combined
"onboarding complete" moment and nothing announces the change.

**LEG-A1-D6 — The screen must read as a museum plate, not a checklist.** Bronze rules, Playfair for the
title, generous spacing, and the closing inscription. ⚠ **No counter, no "1 of 3", no progress bar** —
`ONB-D22`'s Non-Behaviors bind here in full, and three invitations with a counter over them is a
completion meter whatever it is called.

**LEG-A1-D7 — §17.1 is superseded for the first-run state only.** Its *"Identity strip + invitation card
only. All sections 2–7 absent."* keeps its second sentence: sections 2–7 stay absent. What changes is
that the invitation card is three invitations rather than one.

## 4. What this does NOT change

- **Sections 2–7 stay absent when empty.** Timeline, Honors, Featured Moment, sealed chapters: absent,
  exactly as L-1 says. This amendment governs the first-run invitations and nothing else.
- **Honors remain earned-only** and are never invited.
- **`ONB-D14`'s silent Chapter I** is unaffected; §12.2's now-dead invitation branch stays dead.
- **No before-photo prompt is added to the first-workout moment.** That was proposed in the same
  conversation and is NOT adopted here — `ONB-D18` owns the first-workout payoff and a second ask
  landing on top of a locked ceremony needs its own decision.

## 5. Validation

- A brand-new athlete's Legacy shows: eyebrow · title · one explanatory line · three invitations ·
  inscription. Nothing else.
- Each invitation opens the real creation surface for that thing.
- Adding a photo retires only the photo invitation.
- No counter, meter or progress language appears anywhere on the screen.
- Honors are absent and uninvited.
