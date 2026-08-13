# W-26 Amendment 002 — The Templates Hub Holds Two Kinds of Shape
## Forge Legacy | Version 1.0 — August 2026

**Amendment ID:** W26-Amendment-002
**Status:** 🔒 LOCKED
**Date:** 2026-08-13
**Amends:** `Workout-Templates-Hub-Spec-W26.md` §1 (Purpose), §2 (Entry Points), §3 (List Architecture),
§4 (Empty State), §5 (Actions)
**Related:** `Week-Template-Detail-Spec-W29.md` (new) · `Program-Architecture-Amendment-002` ·
`W25-Amendment-001` §3 (W25-A1-D8, the authoring-door rule this follows)
**Supersedes:** Nothing. W-26 v1.0 stands for workout templates.

---

## Section 1 — Why here

A tester asked for **a template for a full week**. It is a reusable shape you can run — which is what
this screen is already for. The athlete's model of W-26 is *"the shapes I keep"*, and a week is one; the
alternative was a separate hub for an object most people will have one or two of.

W-26 also already routes to two different detail screens (`/template/[id]` and `/starter-template/[id]`),
so a third destination is not a new idea here.

---

## Section 2 — Decisions

### W26-A2-D1 — A "Your Weeks" shelf, above Your Templates

Weeks sit **above** the single-session templates and below the From Forge shelf.

Above, because a week **contains** sessions. Putting it underneath would read as a subtype of the thing
it is made of. The shelf is absent entirely when the athlete has no weeks — an empty section under a
heading promising weeks is the exact defect the From Forge shelf was added to fix.

### W26-A2-D2 — A week row opens; it does not start

A workout-template row carries **Start** in its footer. A week row carries nothing but a tap target.

Starting a week **ends the athlete's active program** (Program Amendment 001 §2). That question needs a
screen with the program's name in it and a confirmation, not a footer button one thumb-width from a
scroll. The row opens W-29, and W-29 owns the decision.

### W26-A2-D3 — The `+` asks which; the list rows do not

The AppBar `+` opens a two-option chooser (*Build a workout* · *Build a week*), because it has no room to
say two words and guessing is what made a saved template unreachable from the Workouts tab
(W25-A1-D8 — a door that answers a question the athlete did not ask).

**It only asks once there is a week to disambiguate.** With no weeks saved, `+` goes straight to the
workout builder as it always has — a chooser presented to someone who has never seen the second option
is a tax on the common path.

At the foot of the list, **two separate rows** — "Build a workout" and "Build a week" — because there is
room there for both to be one tap.

### W26-A2-D4 — Both doors are gated, on different allowances

"Build a workout" pre-checks `templates`. "Build a week" pre-checks `short_programs` (MA4-D1). A free
athlete at their template limit can still author a week, and vice versa — the two are different
allowances and the gate must not conflate them.

### W26-A2-D5 — The empty state is unchanged

W-26 §4's empty state speaks about workout templates and offers the workout builder. It stays that way.

An athlete with nothing saved is being introduced to the idea of a reusable shape; introducing two at
once, one of which starts a program and can end another, is a worse first screen. Weeks appear as soon
as there is one, and are discoverable from the second row at the foot of the list.

---

## Section 3 — Verification checklist

- [ ] With no weeks: no "Your Weeks" shelf, `+` goes straight to the workout builder, empty state unchanged
- [ ] With ≥1 week: the shelf renders above Your Templates, `+` opens the chooser
- [ ] A week row opens W-29 and never starts anything
- [ ] "Build a week" fires M-7 at the `short_programs` cap, not the `templates` cap
- [ ] Returning from the builder shows the new week without a manual refresh

---

## Section 4 — Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-13 | Initial. Adds the "Your Weeks" shelf above Your Templates (W26-A2-D1). A week row opens rather than starts, because starting one ends the active program (W26-A2-D2). The `+` becomes a chooser once a week exists (W26-A2-D3). The two doors gate on different allowances (W26-A2-D4). The empty state is deliberately unchanged (W26-A2-D5). |

---

*W-26 Amendment 002 — The Templates Hub Holds Two Kinds of Shape*
