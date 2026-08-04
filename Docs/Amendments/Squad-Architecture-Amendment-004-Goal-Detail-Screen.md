# Squad Architecture — Amendment 004: Goal Detail Screen

**Amends:** `Squad-System-Architecture-v1.0.md` §3 (SQ-D3.4) · `Squad-Detail-Wireframe-Spec-S2.md` §15.3
**Status:** 🔒 LOCKED
**Date:** 2026-08-03
**Design authority:** `Squad Goal Detail.dc.html` — Claude Design project `b029488a`
**Migration:** 0107

---

## Section 1 — The screen

Squad goals had exactly one surface: a three-line card in the S-2 hero, whose only specified tap target
(§15.3) was **editing**. The number moved and nobody could ask why — not who had contributed, not
whether the squad was on pace, not what happened to the last goal.

**S-2b Squad Goal Detail** (`/squad/[id]/goal`) is the answer. Its sections, in order:

1. **Hero** — the goal, `done / target`, percentage, progress bar, and what remains stated at the
   squad's own rate.
2. **Pace** — Started · Recent Pace · Projected Close.
3. **Contribution** — per member (see §2).
4. **Weekly Rhythm** — the last 8 weeks.
5. **Milestones** — five waypoints at fifths of the target, the last being the target itself.
6. **Recent Progress** — the sessions that moved the number.
7. **When this closes** — the Honor, and that the goal is kept.
8. **Past Goals** — from `squad_goal_completions`, which 0099 has been writing since it shipped and
   which nothing in the app had ever read.

**SQ-A4-D1 — Entry is the Current Goal card on S-2.** This amends §15.3, whose only tap target was
editing. The card opens the detail screen; the pencil beside it keeps opening the editor. Two actions,
two targets.

**SQ-A4-D2 — Every derived number is real or absent.** Pace excludes the current (partial) week. A
squad with no completed week has **no pace**; a squad with no pace has **no projected close**; a
milestone crossed before the eight-week window has **no date**. All render as "—". A pace of zero
projects nothing at all, deliberately: an infinite projection rendered as "never" is the opposite of
what this product does.

---

## Section 2 — ⚠ SQ-D3.4 is REVERSED for this screen

**What SQ-D3.4 says:**

> Progress display is aggregate, never a per-member leaderboard.

**What this screen does:** shows every member's contribution, ordered by size, with bars.

That is the same thing SQ-D3.4 forbids. It is being adopted anyway, by **PD-7 (design governs, docs
corrected)** — the design is the north star and this is what it draws — and it is recorded here as a
reversal rather than slipped in, because SQ-D3.4 was a deliberate decision and deserves a deliberate
overrule.

**SQ-A4-D3 — Contribution is shown, framed as a record of work.**

The reasoning that makes it survivable is the design's own, and its closing line ships verbatim on the
card:

> *Contribution is a record of work, not a ranking. Nobody is behind.*

The anti-shame guardrails SQ-D3.5, CC-D3 and SA-D4 are honoured in the specifics, and these are
binding, not decorative:

| Rule | Why |
|---|---|
| **No rank numbers.** No "1.", no "2." | A position is a claim about a person; a figure is a record of work |
| **No "behind", no deficits, no arrows** | Nothing is measured against anybody else's figure |
| **The smallest contributor is never called out** — no "needs to step up", no highlight | SA-D4: non-participation is never shown as failure |
| **Shares are of the WORK DONE, not of the target** | "18% of the goal" while the squad is halfway there is a fraction of a thing that has not happened |
| **Bars scale to the top contributor, not the target** | So the list is legible, not so somebody looks empty |
| **The closing line is on the card, not in a tooltip** | The framing has to be as visible as the list |

**SQ-D3.5 is untouched.** Completion is still positive and non-comparative, and no member is singled
out as having carried or missed a goal.

**Scope:** this reversal applies to **Squad Goal Detail only**. The Performance Firewall elsewhere —
the Friends Feed, Communities, the Calendar — is unchanged, as is the S-2 goal card itself, which stays
aggregate.

---

## Section 3 — The defect this screen forced out (fixed)

`0103_squad_goal_dates.sql` recorded this in its own header and declined to fix it, correctly:

> "on an EXPIRED squad goal a member's 'your contribution' line keeps counting past the deadline while
> the squad total is frozen. Fixing that wants a squad-scoped function of its own, not a change to the
> shared one."

`goal_metric_value` (0039) is shared with the personal Goals system, including body-composition
readings that are deliberately unwindowed; bounding it there would reach outside squads.

**SQ-A4-D4** — Migration 0107 adds `squad_member_contributions(p_squad)`: the squad-scoped function
0103 asked for, applying the **same window as `squad_metric_sum`** (`goal_started_at` →
`squad_goal_window_end`) per member. A screen putting your figure beside the squad's would have
surfaced the mismatch on day one, as two numbers that cannot both be true.

Every function in 0107 is `security definer` and carries the member-or-public gate. 0101 had to
retrofit exactly that onto `archive_squad_goal` after it became a disclosure oracle over private
squads; that lesson is applied up front here.

---

## Section 4 — SQ-D3.2 SUPERSEDED: the goal is OWNER-ONLY

**SQ-D3.2 said** any member may set or edit the active goal — "consistent with the existing Squad
Identity model (S-3 §4.3 — squad identity belongs to the squad, not just the Owner)."

**SQ-A4-D5 — Setting, editing and clearing a squad goal is the OWNER'S action.** PO decision,
2026-08-03. SQ-D3.2 is superseded for goals; S-3 §4.3's identity model is untouched for everything else
it governs.

### Why this way round

The build already worked this way, and not only in the UI — `squads_update` (0029) is
`using (owner_id = auth.uid())`, and `setSquadGoal` writes the `squads` row directly. So a member's edit
button would have been rejected by the database. Two ways to resolve that, and they are not equal:

- **Honour SQ-D3.2** — a `security definer` `set_squad_goal` RPC with a membership guard. Note the
  policy itself cannot simply be loosened: `squads_update` covers the whole row, so opening it would
  also hand every member the squad's **name, privacy setting and crest**, which SQ-D3 never asked for.
- **Amend SQ-D3.2 to owner-only** — no new RPC, no new attack surface, and the spec starts describing
  what the app does.

The second was chosen. A squad goal is a longer-lived, more consequential object than a squad's name:
one active goal at a time (SQ-D3.1), and changing it mid-flight resets what everyone is working toward.
Last-write-wins on a name is a shrug; last-write-wins on a goal is somebody's month.

### What this means in the build

**Nothing changes.** Both goal surfaces already gate on `isOwner`:

- S-2's Current Goal card — the pencil, and the "Set a squad goal" empty-state row
- S-2b Squad Goal Detail — the AppBar pencil

Members see the goal, their own contribution and everybody else's on the detail screen; they simply do
not set it. **No RPC is added, and `squads_update` is left exactly as 0029 wrote it** — the narrowest
policy that works is the one worth keeping.

> **Downstream:** `Squad-System-Architecture-v1.0.md` §3 SQ-D3.2 now carries a superseded banner
> pointing here. `Squad-Management-Permissions-Spec-S3.md`'s permission table should read Goal =
> Owner on its next pass.

---

## Section 5 — Minor

- `clearSquadGoal` nulls `goal`, `goal_target` and `goal_started_at` but left `goal_ends_at` orphaned.
  Harmless today because `setSquadGoal` always overwrites it; noted so it is not discovered twice.
- `squad_goal_weeks` **generates** its weeks rather than deriving them from the data, so a week nobody
  trained is a zero and not a gap. A rhythm chart that silently omits the quiet week is a chart about a
  different squad.
