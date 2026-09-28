# Squad Architecture — Amendment 008: The Weekly Summary Tells the Story of the Week

**Amends:** `Squad-System-Architecture-v1.0.md` §8 (SQ-D8, Rule 4 — content)
**Status:** 🔒 LOCKED — PO approved the design 2026-09-28 (*"love it. Build it"*)
**Date:** 2026-09-28
**Design authority:** the approved clickable mockup, https://claude.ai/artifact/C2coURw351Dggbq4eTSKYE (no `.dc`)
**Migration:** `0233_squad_week_story.sql` · paste bundle `supabase/apply/pending-0233.sql`
**Code:** `src/domain/squad/week-story.ts` (the words, tested) · `src/components/squad/WeekStoryView.tsx` (the screen)

---

## Section 1 — The case

PO, 2026-09-28: *"How can we make the squad summaries feel more emotionally better? Emotionally grabbing?
Right now it's just a list of things. How can we tell a story of the week? Shout people out? Help everyone
feel amazing that they contributed? How we worked as a team to accomplish something great?"*

SQ-D8 Rule 4 locked five aggregate facts (workouts · PRs named by member · participation · goal delta ·
honors). The summary reported all five, correctly, and read as a stat sheet. It said what the squad did,
never who did it or what it meant.

## Section 2 — SQ-A8-D1: the summary is a story in six parts

1. **Holt's opening.** One headline and a few sentences written from the week: how many showed up, new
   bests, a comeback, a newcomer, the goal's move. Rule-based, not AI.
2. **The together number.** Pounds lifted (or miles, or workouts) with a real-world comparison that is
   always an under-claim ("More than an empty semi truck").
3. **The squad goal built from everyone's piece.** Where it stood before the week, then each member's
   contribution as its own segment.
4. **A shout-out for everyone who trained.** One line each, about that person's own best moment of the week
   (comeback · first week · welcome · new best · best week · honor · showed up).
5. **Trained-together moments** from accepted Train Together invites.
6. **An open door**: what is left on the goal, or a fresh start, and a Start a workout button.

Members can **cheer** a shout-out (one flame per person per summary; never on yourself).

## Section 3 — SQ-A8-D2: what does NOT change

- **No member is ranked** (SQ-D8 Rule 4, kept). Shout-outs are A→Z. Nothing orders people by size, names a
  top performer, or says "most" across people. "Best week" means that person's own best.
- **Nobody is called out.** A member who did not train is never named. The opening counts everyone
  ("seven of you showed up"); the close is an invitation.
- **A slower week is not scolded.** "↑ N on last week" appears only when the squad went up.
- **The squad's own goal, never a theme.** Holt says "the squad goal" and uses the goal's title. A monthly
  theme (e.g. Squatober) is not something he remembers (PO 2026-09-28).
- **Cadence, delivery and retention** (Rules 1–3) are unchanged.

## Section 4 — How it is built

- The **facts** are snapshotted once, when the week closes, by `squad_week_story()` inside
  `ensure_weekly_recap()` (as `recap.story`). A summary is a record of what that week was and must not
  shift later (existing SQ-D8 screen rule).
- The **words** are written in the app from those facts, so the voice can be tuned by a phone update.
- A summary whose story could not be built, or one from before 0233, shows the previous plain layout.
- `0233` also backfills summaries from the last 14 days so the change is visible immediately.
