# Forge Legacy — Social System Architecture Amendment 004
## An Acknowledgement May Show Its Count
### August 2026

**Status:** LOCKED

**Type:** Narrowing Amendment (permits one specific surfacing that SOC-D11's blanket "no popularity metric" clause forbade; every other clause of SOC-D11 is restated below and remains binding)

**Authority:** Product Owner decision, 2026-08-13, on reviewing the feed redesign: *"Let's update that rule. Acknowledge is good."*

**Amends:** `Social-System-Architecture-v1.0.md` — SOC-D11 (Engagement), the "No popularity metric" clause only.

**Supersedes:** nothing. SOC-D11's philosophy is unchanged; this settles what "no popularity metric" was actually protecting against.

---

## Purpose

The feed redesign draws the action row as a single **Acknowledge** control carrying a flame, the word,
and **a number**. SOC-D11 said no:

> **No popularity metric** — reaction/comment counts are not surfaced as a popularity score, are never
> aggregated into a ranking, and never appear on a profile as a status number.

That clause was written to stop three specific things, and the implementation honoured it literally by
never rendering a number at all — `acknowledgedLine` named people instead ("Acknowledged by Priya and
Diego and 3 others"). The redesign is not asking for any of the three things the clause names. It is
asking for the count of a thing on the post it belongs to.

**The distinction this amendment makes is between a number that describes a post and a number that
scores a person.** SOC-D11 forbids the second. It did not intend to forbid the first, and forbidding it
cost the feed a piece of ordinary, useful information — how many people responded — while the *names*
it required instead are strictly more exposing.

---

## Section 1 — The decision

### SOC-A4-D1 — The acknowledgement count renders on the post

**Locked.** A post may display the number of acknowledgements it has received, beside the Acknowledge
control, on the post itself.

The count is **hidden at zero.** A "0" beside a control reads as a verdict rather than an invitation,
which is the Accountability-Without-Shame stance (CC-D3) applied to the smallest possible surface.

The comment count follows the same rule and is likewise hidden at zero.

### SOC-A4-D2 — Everything SOC-D11 was protecting is still protected

**Locked, binding, and unchanged.** Restated here in stronger terms than the original, so that nothing
about this amendment reads as an opening:

- **The count is never aggregated into a ranking.** No feed ordering, no trending, no surfacing, no
  sorting, no filtering by it. SOC-D10 is untouched: reverse-chronological, always.
- **The count never appears on a profile.** Not as a total, not as an average, not as a badge, not as a
  "most acknowledged post". A profile is identity (SOC-D3); it carries no engagement figures of any kind.
- **The count is never a status number about a person.** It belongs to a post and dies with it. Nothing
  sums an athlete's acknowledgements across posts, anywhere, for any purpose.
- **The count feeds nothing.** SOC-D13 is absolute and unamended: no social action affects Rank, Honors,
  Legacy, goals, chapters or challenge scoring, and an acknowledgement count is not an input to any
  system whatsoever.
- **Acknowledgements remain lightweight encouragement**, not a vote. There is no negative reaction, no
  downvote, and no way to acknowledge a post out of the feed.

### SOC-A4-D3 — The four kinds survive the single-tap row

**Locked.** SOC-D11's acknowledgement kinds — **Respect · Honor · Support · Strength** — are unchanged
and all four remain writable.

The redesigned row is a single control whose only state change is its colour, so a tap **acknowledges**
rather than opening a chooser. The four kinds moved to a **press-and-hold** on the same control.

This is recorded as a decision rather than an implementation detail because the alternative was to
delete three of the four: a row that can only ever write `respect` would strand `honor`, `support` and
`strength` as values in `post_reactions` that nothing can produce and nothing can explain.

### SOC-A4-D4 — `acknowledgedLine` is retained, not deleted

**Locked.** The helper that renders "Acknowledged by Priya and Diego and 3 others" stays in the codebase
and is not currently mounted.

It is the older, more expressive form of the same information, and it is the one to reach for on any
surface where a post is the subject rather than an item in a list — a post detail screen, a
notification, a share preview. Naming people is still the richer statement; it is simply the wrong
density for a scrolling ledger.

---

## Section 2 — Non-Behaviors

| Non-Behavior | Reason |
|---|---|
| Ranking, sorting or surfacing by acknowledgement count | SOC-D10; the whole point of the original clause |
| Any engagement figure on a profile | SOC-D3 — profiles are identity, posts are moments |
| A lifetime or per-athlete acknowledgement total, anywhere | That is the "status number" SOC-D11 forbids, and it stays forbidden |
| A comment count that shows `0` | Hidden at zero, same as acknowledgements |
| A negative or dissenting reaction | Never in scope; encouragement-oriented (CC-D3) |
| Acknowledgement count as a Rank, Honor or Challenge input | SOC-D13, absolute and unamended |
| Notifying on acknowledgement | Still deferred to P-5 reconciliation exactly as SOC-D11 left it |

---

*Forge Legacy — Social System Architecture Amendment 004*
*August 2026*
