# Squad Architecture — Amendment 005: Posted Workouts

**Amends:** `Squad-System-Architecture-v1.0.md` §9 (SQ-D9.1) · §12 (SQ-D12) · `Home-Screen-Wireframe-Spec-H1.md` (hero precedence)
**Status:** 🔒 LOCKED
**Date:** 2026-09-03 (proposed and locked same day — PO answered all four open questions, see §11)
**Design authority:** none yet — no `.dc` exists for this post type or for the hero it changes
**Migration:** `0192_posted_workouts` — WRITTEN, **NOT YET APPLIED** (paste bundle: `supabase/apply/pending-0192.sql`)

---

## Section 1 — What this is, and the case that drove it

A squad member posts **one workout** to the feed. Other members tap **Take it**, and it lands on their
Home hero as the next thing to start. They train it, it is consumed, and the hero returns to whatever it
was showing before.

The driving case is the nightly drip — Squatober and everything shaped like it. The organiser does not
publish a 31-day plan in advance; they post tomorrow's session the night before, and they do it again the
next night. Nobody in that model is enrolling in anything.

**This is why Send Program (0110) does not answer it.** That path ships a whole program, writes a
`programs` row, and — because of `Program-Architecture-Amendment-001` — **ends the recipient's active
program** when they start it. For a squad running a month-long daily challenge alongside their normal
training, all three of those are wrong. A posted workout creates no program, ends nothing, and is gone
once it is done.

---

## Section 2 — SQ-A5-D1: the feed gains a post type that is an INVITATION, not a record

**Amends SQ-D9.1** (permitted event types), which admits workout completions, PRs, Honors, challenge
updates and Goal progress.

Every one of those is **a record of something that already happened.** The seven authorable types in
`SQUAD_POST_TYPES` are the same: Progress Photos, Recap, PR, Form Check, Transformation, Discussion,
Announcement. A Recap shares a session you have finished — it is read-only by construction, and it opens
Activity Detail.

A posted workout is the first feed entry that asks the reader to **do** something. That is a structural
change to what the feed is, not a seventh item on a list, and it is recorded as one.

**What it carries:** a `TemplateExercise[]` snapshot — the same shape a train-together invite already
sends (`WorkoutLaunch.exercises`, 0093) and the same shape the Free Workout Builder already produces.
No new authoring surface is needed; the poster builds it in W-25 and posts instead of saving.

**SQ-A5-D1.1 — It is a snapshot, and the post says so.** Editing or deleting your copy afterwards does
not reach into the workout anybody already took. This is `share_program`'s rule (0110) and it is adopted
verbatim, for the same reason: the sender must not be able to rewrite a session somebody is midway
through.

**SQ-A5-D1.2 — Any member may post one.** Consistent with SQ-D11.2 (any member may create a challenge)
and SQ-D3.2's original "any member" for Goals. `announcement` is owner-only because it **pins**; posting
a workout pins nothing. A training partner saying *"here's mine for tomorrow, join me"* is the same act
as an organiser's Day 12, and the product should not need to know which is which.

**SQ-A5-D1.3 — One posted workout per member per day.** PO-approved 2026-09-03. Any member may post
(SQ-A5-D1.2), so nothing else stops five people posting five workouts on the same evening to a squad of
fifty. The limit is per **member**, not per squad: a squad-wide ceiling would let whoever posted first
silence everyone else that day, which is a governance tier invented by rate limit.

It is enforced server-side in the post RPC, and the composer states it only when it is hit. A member who
posts one workout a night — the entire driving case — never sees it exist.

---

## Section 3 — ⚠ SQ-A5-D2: a taken workout outranks the program day on Home

**This is the substance of the amendment.** Everything else is plumbing.

**What Home does today** (`src/domain/home/composition.ts`):

```
resume  >  program day  >  planned one-off  >  open
```

`hasProgramSession` is tested before `hasPlannedWorkout`, and when the hero is `program` **the planned
workout is not reachable from Home at all** — there is no secondary affordance pointing at it. So under
today's ranking a taken squad workout would land in the athlete's slot and never appear to them. For the
Squatober case that is fatal: most people doing a daily challenge are also running a normal program.

**The new ranking:**

```
resume  >  the slot (taken or self-planned)  >  program day  >  open
```

**PO ruling, 2026-09-03:** *"If they go in and deliberately click on our workout for the next day then
that one takes precedence."*

**The rule this expresses is already the app's own, stated twice in code.** It is not a new principle
being imported for one feature:

| Where | What it says |
|---|---|
| `composition.ts`, the `planned` branch | Not gated on `settled`, because *"having planned one is itself the answer… and a stronger one than a tap on a chooser"* |
| `workout-launch.ts`, `programWeek`/`programDay` | An explicitly picked session travels, as *"a deliberate choice, made two taps earlier, which cannot go stale in the way a passively-rendered card can"* |

A program day is the passive default — it is whatever the schedule says, rendered without anyone asking
for it today. Occupying the slot is an act. The act wins.

**SQ-A5-D2.1 — Resume still outranks everything.** Unfinished sets in the autosave are not a plan, they
are work in progress, and the logger already reads a launch intent arriving on top of logged work as a
conflict it has to ask about. Unchanged.

**SQ-A5-D2.2 — ⚠ This also changes behaviour for the EXISTING one-off, and that is intended.**

The slot is shared (see §4), so raising it above the program day raises the self-planned one-off too.
An athlete on a program who builds a workout for Thursday currently keeps seeing their program day;
after this they see the workout they built.

That is the same ruling applied consistently. Building a one-off in W-25 is every bit as deliberate as
tapping Take it, and the two cannot be ranked differently without the product claiming that a squad's
intention counts for more than the athlete's own. **Today's ordering is a latent instance of the same
defect**, and it is fixed here rather than special-cased around.

---

## Section 4 — SQ-A5-D3: one slot, with provenance

A posted workout is taken into `planned_workouts` (0136) — **not a new table.**

`athlete_id` is the primary key, so an athlete has at most one, and an upsert replaces it. For a nightly
drip that constraint is exactly right: tonight's workout replaces last night's, no accumulation, no
inbox of stale sessions. The single slot was built as a product rule about one-offs and it turns out to
be the correct rule for this too.

**SQ-A5-D3.1 — Provenance is stored and shown.** The slot records where the workout came from — the
squad, the poster, and the source post. The hero names it (*"From Iron Squad"*), and it is tappable back
to the post it came from.

A workout that appears on your Home screen with no account of who put it there is the shape of an
unsolicited payload, which is what SOC-D15's discovery rules exist to prevent. It does not stop being
that because the sender happened to be a squad-mate.

**SQ-A5-D3.2 — Last taken wins, and replacement is stated.** Taking Wednesday's when Tuesday's is still
sitting there replaces it — with a named confirmation if the outgoing one was self-planned, silently if
it was a previous take from the same squad. Losing a workout you built yourself is worth a sentence;
losing yesterday's untrained drop is not.

---

## Section 5 — SQ-A5-D4: it can be given back

**A gap this amendment must close, not a nicety.**

Today `clearPlannedWorkout()` is called in exactly one place — `startPlannedWorkout`, on the way into the
logger. The slot empties when the workout is **started** and by no other route. There is no dismiss.

That is survivable while the slot loses to a program day. Under SQ-A5-D2 it stops being survivable: the
slot now outranks the program, so an athlete who takes Tuesday's workout and changes their mind is
looking at it with no way back to their own training. Under the nightly model people will be taking these
most evenings, so backing out is a routine act, not an edge case.

**The hero gains a discard.** Not beside Start — it is a small destructive action on a card whose primary
verb must stay unambiguous. Discarding restores the program day. Nothing is posted to the feed and nobody
is told (SQ-A5-D5).

⚠ **BUILT AS A QUIET ROW, NOT AN OVERFLOW.** This clause said "behind the overflow"; `TodaysWorkoutCard`
has no overflow menu, and its established idiom for a secondary action is the quiet text row that
"Something else today?" and "Build for later" already use. Discard is a third one, placed last. Adding an
overflow to a card that has never had one would have been a larger and less consistent change than the
clause was asking for — the intent (small, subordinate, never competing with Start) is met.

---

## Section 6 — SQ-A5-D5: anti-shame, and where the line falls

SQ-D9.6 is binding: non-participation never generates a Feed entry. `Squad-Architecture-Amendment-004`
§2 already settled the adjacent question — **work done may be shown; work not done may not.**

| Permitted | Forbidden |
|---|---|
| Respect and comments, as on any post (SQ-D9.4) | Any list, count or hint of who did **not** take it |
| Recaps posted afterwards by people who trained it | Any "you haven't taken today's workout" prompt to an individual |
| The taker's own confirmation that they took it | Any streak, ranking or completion table built from takes |

**SQ-A5-D5.2 — ⚠ The take count is NOT shown in V1.** PO ruling 2026-09-03.

An earlier draft of this section permitted it, on `Squad-Architecture-Amendment-004` §2's precedent that
work done may be shown. That precedent holds for **contribution to a goal the squad already shares**. It
does not transfer here, and the difference is who the number is about: a contribution bar describes the
squad's own progress, where *"4 of 34 took this"* is a verdict on a thing **one member offered** — read
by that member, about themselves, every time they post.

So the number is absent rather than framed carefully. **Nothing counts takes, and no surface displays
one.** Adding it later is a small change; removing it after a squad has watched it for a month is not.

The poster learns what landed the way the product already does it everywhere else — people train it and
post their own recaps.

**SQ-A5-D5.1 — Declining is invisible.** Not taking a posted workout produces no event, no absence
marker, and no notification to the poster. Ignoring it must cost nothing, or the feed acquires an
obligation and the squad acquires a way to fail at it.

---

## Section 7 — SQ-A5-D6: no scheduling engine in V1

The post is not date-aware. There is no "unlocks at 6am", no expiry, no calendar.

**Posted tonight, it sits in the feed. Taken, it sits in the slot until it is trained, discarded or
replaced.** 0136 chose no expiry deliberately — *"a plan that silently vanishes is worse than a stale
one"* — and that reasoning is unchanged by the workout having arrived from somebody else.

The poster names the session (*"Day 12 — Back Squat"*) and writes the date into the body if it matters.
A scheduling model can be added later against real use; inventing one now would be building a calendar
for a product whose whole premise is that the plan arrives the night before.

---

## Section 8 — SQ-A5-D7: not a program, therefore not capped and not gated

Taking a posted workout writes no `programs` row, so `programs_cap_guard()` (0145) and the free tier's
3-program limit (`Monetization-Architecture-Amendment-003`) are untouched, and this amendment does not
propose touching them.

**A free member may take a squad workout every day of a 31-day challenge.** The library caps limit what
an athlete **stores**; they have never limited what an athlete **does**, and the daily-challenge case is
precisely the moment a squad's newest and least-committed members are participating. Gating it would put
the paywall across the one door this feature exists to open.

Stated explicitly so it is not quietly gated later by someone reading "shared training content" and
reaching for the entitlement check.

---

## Section 9 — SQ-A5-D8: notification

**Amends SQ-D12's trigger table** with one row:

| Trigger | Delivery |
|---|---|
| A workout is posted to a squad you are in | Push + inbox, under the existing **Squad Feed Activity** toggle (`squadNotificationsEnabled`) — no new setting |

No new preference. SQ-D12 already relabelled the old check-in toggle to cover feed activity generally,
and a posted workout is feed activity. A member who has silenced squad noise has silenced this too, and
that is correct.

**Nothing pushes when a workout is TAKEN.** The poster is not notified, per SQ-A5-D5.1 — a notification
per take turns a 34-member squad into a slot machine and makes the takes visible one by one, which is the
non-participation ledger by another route.

---

## Section 10 — Implementation notes

Non-binding; the decisions above are the spec.

**Migration**
1. Post payload — the `TemplateExercise[]` snapshot on the squad post row, alongside the existing
   `workout_summary` / `workout_id` columns the feed already carries.
2. `planned_workouts` gains provenance: source squad, source post, poster. Nullable — a self-planned
   one-off has none, and every existing row is one.
3. ⚠ **CORRECTED AT BUILD TIME — `take_posted_workout(p_post uuid)` is SECURITY INVOKER, not DEFINER.**

   This note originally said it *must* be definer, reasoning that a squad-mate's post cannot write the
   slot under the caller's rights. **That was written before the policies were read, and it is wrong.**
   Both halves of the operation are already the caller's own:

   | Half | Policy that already allows it |
   |---|---|
   | Reading the post | `squad_posts_select` (0076) — admits the row to any member of that squad |
   | Writing the slot | `planned_workouts_own_insert` / `_update` (0136) — the caller's own row |

   So INVOKER is not merely sufficient, it is **safer**: RLS performs the membership check in one place
   for every caller, instead of this function becoming the only thing between a stranger's post and
   somebody's Home screen. A non-member's take finds no row and raises.

   Recorded rather than quietly corrected, because "make it definer" is the reflex that has caused real
   outages here — a revoke on `evaluate_honors` killed Finish Workout with every gate green, because the
   definer function still called it as itself. 0192's §2 assertion **fails if a later hand flips it to
   definer**.
4. **`post_squad_workout(...)` enforces SQ-A5-D1.3** — one per author per squad per day — and returns a
   distinguishable error the composer can name. Server-side, because a client-side check is a suggestion.
5. ⚠ **Nothing counts takes** (SQ-A5-D5.2). The take writes the taker's slot and no aggregate anywhere.
   A `take_count` column is not "harmless until read" — it is the number existing, which is what makes
   adding the surface a one-line change later, in a codebase where locked-but-never-applied is the
   recurring failure.

**Client**
6. `SQUAD_POST_TYPES` — a new entry. ⚠ Never remove one: `LEGACY_SQUAD_POST_TYPES` exists because a
   retired type must keep rendering its own historic posts.
7. `composition.ts` — the precedence change (§3), plus its tests.
8. Home hero — provenance line, and the discard behind the overflow (§5).
9. ⚠ **CORRECTED AT BUILD TIME — no new notification kind is needed, and none was added.**

   This note assumed one would be. It is not: `notification_events_for()`'s **branch 10** (0122, narrowed
   0126) already fans out EVERY authored squad post to every member of that squad, so a `'workout'` post
   notifies the moment the type constraint admits it — under the existing Squad Feed Activity toggle,
   which is exactly what SQ-A5-D8 asks for. `squad_post` is already in the `KINDS` allowlist.

   The trap the note describes is real and the warning stands for anything that DOES add a kind. What
   changed is that this feature does not — which means `notification_events_for`, a function that has
   silently lost shipped features to a from-memory rebuild four times, is not touched at all.

   **The honest cost:** the push reads *"<name> posted in <squad>"* rather than naming it as a workout.
   Dedicated wording would need a new kind, hence that rebuild. Not worth it for a sentence.

**Not in scope:** a takers list surface, scheduling, recurrence, and any squad-level completion metric
built on takes (SQ-A5-D5).

---

## Section 11 — The four questions, answered

All four put to the PO on 2026-09-03 and answered the same day. Recorded here because three of them
changed the spec above rather than merely confirming it.

| # | Question | Answer | Where it landed |
|---|---|---|---|
| 1 | Does posting notify the squad, or does the poster choose? | **Always notifies**, under the existing Squad Feed Activity toggle | §9, unchanged — the assumption was correct |
| 2 | Any rate limit? | **One posted workout per member per day** | §2, new **SQ-A5-D1.3** |
| 3 | Is the take count shown? | **No — not in V1** | §6 rewritten, new **SQ-A5-D5.2** |
| 4 | Does the ruling also re-rank the existing self-planned one-off? | **Yes — fix both together** | §3, **SQ-A5-D2.2** confirmed |

**On (1):** the objection was that a nightly drip is 31 pushes. It stands, and it is accepted rather than
solved — a workout posted the night before that nobody is told about is a workout nobody does, which
fails the entire driving case. The existing toggle is the escape hatch, and it is squad-scoped, so a
member can silence one squad's challenge without silencing the others.

**On (4):** this is the one that reaches shipped behaviour. It is not scope creep. The alternative was a
product that ranks a squad's intention above the athlete's own, which is not a rule anyone would write
down on purpose — see SQ-A5-D2.2.
