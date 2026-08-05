# Forge Legacy — Social System Architecture Amendment 002
## Sharing a Sealed Session to the Friends Feed
### August 2026

**Status:** LOCKED

**Type:** Architecture Amendment (admits one existing post type to one existing audience; adds no new entity, no new field, and no new automatic behavior)

**Authority:** Product Owner decision, 2026-08-04, from a live training session. `Social-System-Architecture-v1.0.md` (LOCKED) — the document amended.

**Amends:** `Social-System-Architecture-v1.0.md` — SOC-D9 (Friends Feed content model) and its Non-Behaviors list.

**Supersedes:** Nothing is reversed. SOC-D9's bar on **automatic** workout-log posts stands unchanged and is restated below in stronger terms than it was written.

---

## Purpose

The Squad feed has carried `type = 'recap'` posts — a sealed workout with its volume, duration, lift
count and PR count snapshotted at share time — since the squad feed shipped. The Friends feed could
not receive one. The PO asked for it after finishing a session and finding no way to show a friend
what he had just done.

The blocker was two-thirds mechanical and one-third a governance question. This amendment settles the
governance question. The mechanics are migration 0113.

---

## Section 1 — What was actually broken

**One table has served both feeds since migration 0074.** `squad_posts` carries an `audience` column
(`SQUAD` · `FRIENDS` · `BOTH`) and a `workout_summary` jsonb. The Squad feed has rendered that column
as a stats strip from the day it existed.

`friends_feed()` — the RPC, in that same migration 0074 — built its result object with `pr_value`,
`pr_exercise` and `pr_label`, and **never selected `workout_summary` or `workout_id`**. So a recap
posted with `audience = 'BOTH'` was stored correctly, was readable correctly, appeared in the Friends
feed correctly, and arrived with its stats stripped: it fell through `shapeOf()` into the generic
bronze milestone card with nothing to put in it.

Same table, same row, same column. One feed read it and one did not. That is an omission, not a
design, and no decision was needed to fix it.

**W-17's share step offered Squad only.** `createFriendPost` had no field that could carry a workout,
so even a caller that wanted to could not have written one.

---

## Section 2 — The decision

### SOC-A2-D1 — `recap` is an admissible **manual** post type on the FRIENDS and BOTH audiences

**Locked.**

SOC-D9's Non-Behaviors list bars **"No automatic workout-log posts,"** and FR-D3 / SOC-D16 hold that
**friendship alone never exposes performance.** A card carrying volume, duration, lift count and PR
count is workout-log data in a friends feed, so this decision has to be made deliberately rather than
assumed.

It is admissible, on three grounds:

1. **The bar is on `automatic`, and this is not automatic.** The post is composed by the athlete, at
   the Seal, on a screen they reached by finishing a workout, by choosing a destination from a sheet.
   Nothing posts on their behalf. Nothing is on by default. Declining is one tap — leaving.
2. **Friendship still exposes nothing.** A non-friend sees nothing. Being a friend grants no view of
   any session the author did not deliberately post. The firewall SOC-D16 describes is about what
   the *relationship* confers, and this confers nothing; the athlete does.
3. **The identical post already exists one audience over**, under the same table, the same `type`, the
   same `workout_summary`, and the same privacy standing — SOC-D8 makes the audience the author's
   choice. A rule that permits this to a squad and forbids it to a friend is not protecting anything;
   it is a gap in an RPC that had been mistaken for a policy.

### SOC-A2-D2 — Automatic workout-log posting remains barred, and is not weakened by SOC-A2-D1

**Locked.**

Nothing in this amendment authorises:

- posting a workout without the athlete choosing to, on any audience
- a default-on "share my workouts" preference
- a trigger, cron or database rule that writes a `recap` row
- surfacing a workout to friends through any path other than a post the athlete composed

SOC-D12's spec'd `MILESTONE_AUTO` source and `milestoneType` field remain **unbuilt and out of scope**.
If they are ever built, they are a separate decision and this amendment is not the precedent for it.

### SOC-A2-D3 — "Both" is one row, and requires a squad

**Locked.**

`squad_posts_audience_squad` is `check ((audience = 'FRIENDS') = (squad_id is null))` — an
equivalence, stated in both directions. `BOTH` therefore **must** carry a `squad_id`. An athlete in no
squads can share to Friends and nothing else.

The share sheet **shows the unavailable destinations, disabled, with the reason** rather than hiding
them: *"You're not in a squad yet, so Friends is the only place inside Forge to share this."* A hidden
option teaches nothing; a disabled one with a sentence teaches what a squad is for.

One row, not two. `BOTH` is a single post that appears in both feeds, carries one comment thread and
one set of acknowledgements, and is deleted once.

### SOC-A2-D4 — CC-D2 and FR-D3 are untouched

**Locked.** Nothing here is public. The `audience` check constraint admits exactly three values and
there is no public option to add by accident. Performance data remains invisible outside a
relationship the athlete formed and a post the athlete wrote.

---

## Section 3 — What the athlete sees

**W-17 Stage 4 (Share).** The secondary button reads **"Share to Forge"** (was "Share to Squad") and
always opens a destination sheet:

| Row | Result | When unavailable |
|---|---|---|
| **Friends** | one `FRIENDS` post | never |
| **A Squad** | one `SQUAD` post; picks the squad when there is more than one | disabled, "You're not in a squad yet" |
| **Friends & Squad** | one `BOTH` post | disabled, "Needs a squad" |

The native OS share sheet ("Share") is unchanged and still sits above it — sharing *out* of Forge is a
different act from sharing *inside* it.

**The Friends feed card.** A recap renders the same four numbers the Squad feed shows — Vol · Time ·
Lifts · PRs — in the bronze milestone frame, tapping through to the session on Activity Detail. PRs
are omitted when there are none rather than shown as zero: "0 PRs" reads as a verdict, and the honest
statement is that the session was not about records.

---

## Section 4 — Implementation notes

- **Migration 0113** re-issues `friends_feed()` with `workout_id` and `workout_summary` added to its
  result object. Signature, audience scoping, friendship join, ordering, and every reaction/comment
  subquery are 0074's, verbatim.
- **No backfill, and none is needed.** `shapeOf()` returns the new `'recap'` shape only when the
  summary is actually present, so every recap written before this — and every row read from a
  database that has not applied 0113 — falls through to the milestone card exactly as it does today.
- **`RecapStrip`** was extracted from `src/app/squad/[id].tsx` into a shared composition. Two feeds
  rendering the same four numbers from two copies is how they drift.
- **`BOTH` is written through `createFriendPost`, not `addSquadPost`.** `addSquadPost` never sets
  `audience` and so can only produce a SQUAD row; teaching it a third audience would give two
  functions the same job.
- ⚠ **PL/pgSQL binds column references at RUN time.** Applying 0113 proves the body parsed. It does
  not prove `p.workout_summary` resolves. The proof is posting a recap to Friends and looking at the
  card — a bare bronze card means the function did not rebind.
