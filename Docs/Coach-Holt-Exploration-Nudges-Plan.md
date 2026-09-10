# Coach Holt — Exploration Nudges

> ✅ **BUILT 2026-08-25, as written and signed off** — migration `0179_coach_nudge_state.sql` (applied),
> `src/domain/coach/nudges.ts`, `src/data/nudge-live.ts`, `src/components/forge/CoachBubble.tsx`; commit
> `0db5868`. Fixed 2026-08-26 (`4383a50`): the DISPLAY records `shown`, not the tap, after the PO saw the
> honors line three times. Shipped without push, per §4. **This header read "PLAN, not yet built" until
> 2026-09-09** — two weeks after the code shipped — and is corrected here rather than rewritten, because §1–§7
> are the reasoning record the code cites.
>
> **Superseded for design purposes by `Docs/Coach-Holt-Feature-Discovery-System-v1.0.md` (2026-09-09)**, which
> keeps every rule below and extends the catalogue with MOMENTS (event-triggered, 72-hour window), a phase
> ladder for invitations, a third reply ("Don't bring this up again"), two Preferences switches, and a
> wayfinding list inside Holt's chat.

**Status:** BUILT (see above). The §4 cadence numbers are the ones in the code.
**Date:** 2026-08-25 · header corrected 2026-09-09
**Ask:** *"Coach holt should invite people to do things they haven't in the app once in a while… Subtly help them explore the app to get more buy in. Even push notifications when appropriate. Plan this out appropriately so it's not annoying… When he says something and they click on him he should help them get to that thing."*

---

## 1. The one-line design

Holt already has a mouth (the coin) and the app already has a push pipeline. This adds a **catalogue of
invitations**, a **frequency budget** that is deliberately stingy, and a **destination** for each — and
nothing else. No new surface, no new component, no banner, no card.

## 2. Why the coin and nothing else

`CoachSays` is the app's single "Holt is speaking" surface, it already carries a dismiss X, and it is
already tappable-to-open. Every athlete has learned what it is. A second nudge surface would be a
notification system competing with the notification system.

⚠ **NEVER DURING A WORKOUT.** The coin mid-session carries live coaching — the progression call, the
plan's cue, the intra-set nudge. An invitation to try progress photos in that slot would displace the
sentence the athlete is standing at a rack waiting for. Nudges appear only on the idle surfaces
(Home, Legacy, Workouts, Squads), through `CoachBubble`.

## 3. The catalogue

Each row is: **the feature · the signal that says "never tried" · the line · where tapping goes.**

| # | Feature | "Never tried" signal | Line | Destination |
|---|---|---|---|---|
| 1 | Progress photos | `transformation_entries` = 0 | "Most people can't see their own progress week to week. A photo can. Want to start?" | `/transformation-add` |
| 2 | Rank / Progress hub | never opened `/progress-hub` | "You've got a rank building whether you look at it or not. Want to see where you are?" | `/progress-hub` |
| 3 | Honors | `honor_instances` > 0 **and** never opened `/honors` | "You've earned {n} honors you haven't looked at." | `/honors` |
| 4 | Goals | `goals` = 0 | "Training without a target works. Training with one works better. Set one?" | `/goals` |
| 5 | Squads | no squad membership | "Training alone is harder than it needs to be. Want to find a squad?" | `/discover-squads` |
| 6 | Templates | `workout_templates` = 0, ≥ 5 sessions logged | "You've trained {n} sessions. Want to save one as a template so you're not rebuilding it?" | `/templates` |
| 7 | Program | no active program | "You've been going session to session. Want me to build you a program?" | `/coach` |
| 8 | Body metrics | no weigh-ins | "Want to track your weight alongside the lifting?" | `/progress-hub` (body section) |

⚠ **#3 IS THE MODEL FOR ALL OF THEM.** It fires only when there is something real to see. A nudge that
says "you've earned honors" to somebody with none is the app inventing enthusiasm, and the athlete
learns to ignore the coin — which costs us the live coaching too, since it is the same object.

⚠ **NOT IN THE CATALOGUE, DELIBERATELY:** anything behind the paywall, anything social that exposes the
athlete (challenges, friend requests), and the Creator Dashboard. An invitation to spend money is not an
invitation to explore, and it would poison a channel whose only asset is that it has never sold anything.

## 4. The cadence — THE PART THAT NEEDS SIGN-OFF

These numbers are the entire difference between helpful and annoying. Proposed:

| Rule | Value | Why |
|---|---|---|
| Earliest nudge | after **3 logged sessions** | Onboarding is already a tour. An athlete who has not yet trained three times is still learning the main loop. |
| Gap between nudges | **7 days** | One a week is a suggestion; one a session is nagging. |
| Max per athlete, ever | **1 at a time**, 8 total | The catalogue is 8 rows and each retires permanently once used. Nobody sees the same thing twice. |
| Retire on use | **immediately, forever** | Taking a photo must silence #1 that instant. |
| Dismissed (X) | back in **21 days** | A no today is not a no forever, but it is a no. |
| Dismissed twice | **never again** | Two refusals is an answer. |
| During a workout | **never** | §2. |
| Push | at most **1 per 30 days**, and only if the app has not been opened in **7 days** | A push is for someone drifting away, not someone using the app. |

⚠ **PUSH IS THE ONLY PART THAT CAN DAMAGE US.** An in-app line the athlete ignores costs nothing; a
notification they did not want costs the notification permission, permanently, for everything —
including the squad and training alerts they DID ask for. Proposal: **ship §1–7 first, with no push at
all**, and add push as a separate pass once we can see whether the in-app nudges are being tapped.

## 5. Tapping Holt

The ask: *"if he says 'I see you haven't done progress pictures yet. Want to do those?' then have him
prompt your way there."*

The coin already opens a sheet. When the current line is a nudge, that sheet shows the invitation with
one primary action that **navigates to the destination** and a text "Not now" that counts as a dismissal.
No multi-step wizard: one line, one button, one destination.

## 6. What this needs

- `src/domain/coach/nudges.ts` — pure catalogue + selection (which nudge, given signals + history). Testable.
- `src/lib/nudge-state.ts` — per-nudge `shown_at` / `dismissed_count` / `used_at`. **Server-side, not AsyncStorage**: an athlete on two devices must not be nudged twice, and this must survive a reinstall.
- One migration: a `coach_nudge_state` table + RLS, and the "never tried" reads (most already exist as counts).
- `CoachBubble` gains the nudge line when there is no more urgent thing to say.

## 7. Open questions for the PO

1. Are the §4 numbers right? They are deliberately conservative and easy to loosen later.
2. Ship without push first (§4 proposal), or build both together?
3. Anything in §3 you would cut, or anything missing?
