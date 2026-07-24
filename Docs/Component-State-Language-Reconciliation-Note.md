# Component State Language — Reconciliation Note

**Status:** Open recommendation, non-blocking.
**Date:** 2026-07-02
**Related:** `Component-Library-Architecture-v1.0.md` CLA-D9, CLA-P2 (Accountability Without Shame); `Forge-Legacy-Design-System-v1.0.md` §10 ("Do not use red for absence, streaks, or missed workouts"); `Docs/Forge-Design-System-Architecture-v1.0.md`.

## What this note is

A documentation-consistency audit (2026-07-02) found that two committed, LEGACY/REFERENCE component-library files implement internal state values and default user-facing copy/color that read as absence-shaming, which CLA-D9 explicitly prohibits from being introduced without formal architectural justification:

- `src/components/forge/cards/WorkoutCard.tsx` (`WorkoutCardState`, `types.ts`) — a `missed` state, rendered with color `#A85252` and the label `"Missed."`
- `src/components/forge/progress/ForgeStreakIndicator.tsx` (`StreakState`, `types.ts`) — a `broken` state, with accessibility label `"Broken · streak lost"` and a danger-toned color.

**Per explicit instruction, this note does not remove, rename, or recolor either state.** `missed` and `broken` remain valid internal application states — a workout that wasn't logged and a streak that has lapsed are both real, legitimate conditions the product needs to represent internally. Nothing in this note authorizes changing `src/components/forge/**` code.

## What is recommended for a future pass

When these components are next revised (most naturally as part of the Claude Design visual rebuild that has already reclassified these libraries LEGACY/REFERENCE — see `Forge-Legacy-Master-Status.md` Decision Queue #13), the **user-facing language and color** for these states should be reconciled with CLA-D9/CLA-P2, independent of the internal state name:

| Current user-facing treatment | Suggested neutral direction |
|---|---|
| `WorkoutCard` `missed` → label "Missed", color `#A85252` | A neutral label such as **"Not Logged"**, using `text.secondary` (muted) rather than a danger/red color — consistent with CLA-D8's Absence Rule, which already prescribes this exact treatment for other surfaces. |
| `ForgeStreakIndicator` `broken` → "Broken · streak lost", danger color | A neutral label such as **"Inactive"** or **"Streak paused"**, non-red, avoiding "broken"/"lost" framing. |

The internal enum values (`missed`, `broken`) can remain unchanged — only the rendered label text and color mapping need revision. This keeps the fix scoped to presentation, not data model or component API.

## Why this is tracked separately rather than fixed now

This is a product-principle/UX-copy decision (what the athlete sees), not a documentation-accuracy fix, so it falls outside the scope of a documentation reconciliation pass. It is recorded here so it isn't lost, and so a future session revising these libraries has a concrete, actionable starting point rather than rediscovering the same CLA-D9 conflict from scratch.
