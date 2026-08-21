# Program Fork/Edit Amendment 001 — Editing a Program You Have Already Started
## Forge Legacy | Version 1.0 — August 2026

**Amendment ID:** Program-Fork-Edit-Amendment-001
**Status:** 🔒 LOCKED
**Date:** 2026-08-20
**Amends:** `Program-Fork-Edit-Wireframe-Spec-W5.md` §Decision 1 (State-Based Permissions),
§Decision 4 (Active Program Protection)
**Related:** `Program-Architecture-Amendment-001-Active-Program-Rule.md` §1, §4, §6 ·
PRD §11 · migration `0175_live_program_edit_guard.sql`
**Supersedes:** W-5 Decision 4 in full. W-5 Decision 1's Active row is replaced; Graduated and Ended
Early are untouched and remain sealed.

---

## Section 0 — Why

W-5 said an Active program could not be modified in any way, and spelled out that this included a
rename: *"For MVP: no modifications to Active programs of any kind."*

The PO overruled it on 2026-08-20: **"Right now you're not allowed to edit once you start a program.
That should not be the case."**

That is a product judgement and it is the right one. An athlete lives inside a training block for eight
to twelve weeks. In that time a gym membership changes, a shoulder starts complaining, a movement turns
out to be wrong for them. The old rule's answer — duplicate it and start over — throws away the weeks
already trained, which is a far worse outcome than the inconsistency it was protecting against.

**But the rule was defending two different things, and only one of them was a preference.**

| What W-5 was protecting | Category | Outcome |
|---|---|---|
| "Changing it rewrites history in progress" | Product judgement | **Overruled** — bounded instead |
| Rename divergence between a workout log and the program name | Product judgement | **Accepted** — logs already store their own copy |
| Moving the graduation finish line | **Irreversible data damage** | **Kept, and now enforced twice** |

---

## Section 1 — The Rule That Replaces It

**An Active program may be edited, subject to two invariants:**

1. **Sessions already trained or skipped are frozen.** Their content cannot change.
2. **`totalSessions(structure)` cannot change.** The program keeps the length it had when it started.

Everything else is editable: swap an exercise in a session ahead, rename a day, change sets and reps,
restructure a week you have not reached yet.

### Revised permission matrix (replaces W-5 Decision 1)

| Action | Future | **Active** | Graduated | Ended Early |
|--------|--------|-----------|-----------|-------------|
| Edit program name | YES | **YES** | NO | NO |
| Edit program description | YES | **YES** | NO | NO |
| Edit duration setting | YES | **NO** — moves the finish line | NO | NO |
| Edit type/focus setting | YES | **YES** | NO | NO |
| Add workout slot | YES | **NO** — moves the finish line | NO | NO |
| Remove workout slot | YES | **NO** — moves the finish line | NO | NO |
| Reorder workout slots | YES | **YES**, ahead of the athlete only | NO | NO |
| Edit slot contents (exercises, sets, reps) | YES | **YES**, ahead of the athlete only | NO | NO |
| Edit workout slot name | YES | **YES**, ahead of the athlete only | NO | NO |
| Empty a slot of all exercises | YES | **NO** — see §2 | NO | NO |
| Duplicate program | YES | YES | YES | YES |

> **On the last Duplicate row:** W-5's matrix read NO for Active, and the implementation has shown
> Duplicate on every state for as long as it has existed. The code was right and the spec was wrong —
> duplicating never touches the source. Recorded here rather than left as a silent divergence.

---

## Section 2 — Why the Length Is Not Negotiable

Graduation is decided **server-side**, in `save_workout`, as:

```
completed >= public.program_total_sessions(structure)
```

recomputed **live** from whatever the row currently holds. The finish line is derived, never stored.

So shrinking a running program does not merely change a plan — it moves the bar down onto progress the
athlete has already made, and the next logged session clears it. `save_workout` then fires the
graduation branch: a `PROGRAM_GRADUATED` timeline event and **five honors**.

`Program-Architecture-Amendment-001` §170 is unambiguous about what that means:

> "These facts are immutable. The product does not provide a mechanism to alter them because the
> integrity of the legacy depends on the accuracy of the record."

**There is no un-graduate path.** An athlete who shortened a program to skip a week they were dreading
would be handed a graduation they did not earn, permanently, and the product has no way to take it back.
That is not a trade-off to be made in a settings screen.

### ⚠ It is the COUNT, not the shape

`program_total_sessions` counts days that **prescribe something** — a day with no exercises is not a
session owed. So **emptying a day's exercises shortens the program just as surely as deleting the day.**
A guard written against `weeks × daysPerWeek` would have missed this entirely, and it is the most likely
way an athlete would trip it by accident.

### Enforced twice, on purpose

- **Client** — `liveEditViolation()` in `src/lib/program-draft-model.ts`, checked at Save. This is where
  the athlete gets a sentence they can act on.
- **Database** — `0175_live_program_edit_guard.sql`, a `before update of structure` trigger on
  `programs`. This is where it is actually true. An athlete must not be able to assert their own
  graduation, which is the same reason `program_total_sessions` exists in SQL at all.

The trigger guards the count only. Freezing already-trained sessions is client-side, because rewriting a
past session is a correctness problem while moving the finish line is an irreversible one — and only the
second earns a trigger on every write.

---

## Section 3 — Repeat Mode Becomes Customize

In Repeat mode a single day template backs **every** week. So "swap Wednesday's press" on a program you
are three weeks into would rewrite the three Wednesdays already trained along with the nine ahead.

**On opening a running program for edit, a Repeat-mode program is materialised into per-week plans**
(`forLiveEdit`). Every week receives a verbatim copy of the template, so:

- `totalSessions()` is unchanged **by construction** — each week now holds the same day list it was
  already being read as;
- weeks ahead become independently editable;
- weeks behind stay frozen.

The athlete is not asked about this and does not need to be: the program means exactly what it meant a
moment earlier.

---

## Section 4 — Two Bugs This Uncovered

Neither was introduced by this change; both had to be fixed before the builder could safely be opened on
a real program at all.

1. **`hydrateDraft` truncated.** It normalised the day list through `makeDays`, which pads *or truncates*
   to `daysPerWeek` — the silent day-deletion recorded in migration `0123`. **Every Coach Holt program is
   deliberately ragged**, so any such program lost days merely by being opened.

2. **`normalizeDraft` did the same, on every focus.** That includes every return trip from the exercise
   Picker — so a ragged program would have been truncated *mid-edit*, after the athlete had already
   started working. Both now use `padWeeks`, which builds absent weeks and never resizes present ones.

---

## Section 5 — What Did Not Change

- **Forge-authored programs remain Duplicate-only**, in every state. That is a *provenance* rule, not a
  progress rule: a program carrying Forge's name must not drift into something we did not write. See
  `project_third_party_program_provenance`. The PO confirmed this stands, 2026-08-20.
- **Graduated and Ended Early remain sealed.** Amendment-001 §6 is untouched.
- **The one-active-program rule** is untouched.
- **No un-graduate path is introduced.** This amendment prevents an unearned graduation; it does not
  provide a way to reverse one, and nothing here should be read as opening that door.

---

## Section 6 — Verification Checklist

- [ ] Edit appears on W-3 for an Active, non-Forge program
- [ ] Edit does **not** appear for an Active Forge program (Duplicate does)
- [ ] Opening a ragged program in the builder preserves every day
- [ ] A Picker round-trip mid-edit preserves every day
- [ ] A trained session cannot be opened, renamed, or added to
- [ ] A Picker result addressed to a trained session is dropped, and says so
- [ ] Save is refused when weeks are dropped, with the session numbers named
- [ ] Save is refused when a day is emptied of all exercises
- [ ] Save succeeds when an exercise is swapped in a future week
- [ ] `0175` applied; the trigger rejects the same shrink server-side

---

## Revision History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-08-20 | Initial amendment. Replaces W-5 Decision 4 and the Active row of Decision 1 with the two-invariant rule; records the Duplicate-on-Active divergence, the Repeat→Customize materialisation, and the two truncation bugs found on the way. |
