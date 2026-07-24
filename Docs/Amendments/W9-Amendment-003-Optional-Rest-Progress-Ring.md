# W9-Amendment-003 — Optional Rest Progress Ring

## June 2026

**Status:** LOCKED

**Type:** Amendment (design — adds a new optional, athlete-controlled visual element; does not alter the count-up timer behavior or the "Accountability Without Shame" rest philosophy)

**Target:** Active-Workout-Flow-Spec-W9-W16.md

**Authority:** Active-Workout-Flow-Spec-W9-W16.md (LOCKED) §7.1–§7.3 (Rest State purpose and Timer Design Principle — both reused, not overturned); ExercisePrescription-Amendment-001.md §4.4 (`restSeconds` optional reference display — extended, not redesigned); FORGE_LEGACY_PRODUCT_DNA.md (Accountability Without Shame principle)

**Amendment Log:** Initial. v1.0 LOCKED.

> **Component governance note:** The `ProgressRing` component described in this amendment is **NOT governed by `Component-Library-Architecture-v1.0.md`** (Freeze Row 18). It is a Rest Timer-specific component owned by **`Rest-Timer-Architecture-v1.0.md`** (LOCKED, Freeze Row 19). It does not appear in the CLA component registry (CLA-C01–C37) and may not be reused outside the rest timer surface without a formal Rest Timer Architecture amendment.

---

## Section 1 — Amendment Scope

A request was made for a circular progress-ring countdown around the rest timer. The base spec's §7.3 "Timer Design Principle" explicitly rejects any countdown framing: *"A countdown timer would imply a correct rest duration exists and that the athlete should race to finish before it expires... Count-up is the only honest choice."* A ring that drains toward empty is a countdown rendered without numerals — it still implies a deadline.

**This amendment does not overturn that principle.** It adds a new, narrowly-scoped, opt-in visual element that satisfies the original request (a thin bronze ring around the rest timer, small, unobtrusive, smoothly animated) while keeping the timer itself honest:

- The ring **fills** as rest elapses (count-up direction), it never **drains**.
- The ring only appears when the athlete has a reference duration to fill toward — either the program's `restSeconds` (already optional per EP-A1) or a personal reference time the athlete sets for themselves in Timer Preferences. No reference exists, no ring is shown.
- Reaching the reference duration produces no alert, no color change, and no stop — the ring simply holds full while the count-up timer keeps counting. The reference is information the athlete chose to track against, not a deadline the product imposes.
- The feature is off by default and fully optional — an athlete who sets no reference and enables nothing sees the existing count-up timer exactly as today, unchanged.

---

## Section 2 — What Is Reused Verbatim (Not Redesigned)

- **Count-up timer behavior** (§7.2, §7.3): still starts at 0:00, counts upward, never changes color or urgency state. Unaffected by this amendment.
- **`restSeconds` as an optional, program-supplied reference value** (ExercisePrescription-Amendment-001.md §4.4): reused as one of two possible sources for the ring's fill target. Its existing display as muted secondary text ("Target: 1:30") is unaffected — the ring is an additional, independent visual, not a replacement.
- **Rest overlay layout, dismissal behavior, and "Ready" CTA** (§7.2, §7.4): unchanged.
- **No haptic on rest events** (§16.8): unchanged — the ring reaching full produces no haptic, consistent with "no haptic for rest timer tick."

---

## Section 3 — New Decisions

**Decision 1 — Ring fills toward a reference, it does not drain toward zero.**
This is the one change that reconciles the request with §7.3. A filling ring communicates "time accumulating toward a number I chose to watch," not "time running out before a penalty." It preserves the count-up timer's honesty while giving the athlete the requested visual.

**Decision 2 — Reference source priority: personal preference first, then program `restSeconds`, else no ring.**
1. If the athlete has set a personal rest reference time in Timer Preferences, the ring fills toward that value for every exercise, program or free workout.
2. Else, if the current exercise has a program-prescribed `restSeconds` (EP-A1), the ring fills toward that value.
3. Else, no reference exists and the ring is not rendered — the rest overlay looks exactly as it does today.

A personal preference is the athlete's own number, set for their own reasons, which is why it takes priority and why it satisfies "Accountability Without Shame" — the product is not the author of the number.

**Decision 3 — Off by default; controlled from the existing "⋯ Options → Timer preferences" entry (§4.2).**
§4.2 already names "timer preferences" as a sub-item of the Workout Action Bar's options sheet without specifying its contents. This amendment is the first to define it:

```
┌─────────────────────────────────────────────────────────┐
│  Timer Preferences                                      │
│  ─────────────────────────────────────────────────────  │
│  Show rest progress ring              [ Off ●○ On ]    │  ← New toggle, default Off
│  My rest reference time      [  90  ] sec               │  ← Optional, blank by default
│                                                         │
│  [              Done              ]                      │
└─────────────────────────────────────────────────────────┘
```

- "Show rest progress ring" defaults to Off. The athlete who never opens this sheet sees no behavior change at all.
- "My rest reference time" is blank by default. Leaving it blank falls through to Decision 2's program-`restSeconds` fallback.
- Both fields are account-level preferences (parallel to weight unit, §6.4), not per-session or per-exercise.

**Decision 4 — Visual treatment: thin, small, bronze, behind the existing timer.**
- The ring is drawn as a thin stroke (2–3dp) circumscribing the existing count-up timer numerals (§7.2's `[ 01:23 ]`), not a separate element competing for space.
- Diameter sized to the timer's own footprint plus a small margin — roughly 72–84dp total, comparable in visual weight to the Notes icon's 44×44dp tap target, scaled up only enough to read as a ring around text.
- Color: the same bronze accent already used for the Chapter Context Strip (§4.2) and W-1 chapter context card — no new accent color introduced.
- Track (the unfilled portion of the ring) renders in a muted neutral, consistent with the rest overlay's existing "neutral, informational" tone (§7.2).
- Fill animates smoothly and continuously (no per-second jumps) — animation cadence matches the existing timer's own update rate, so the ring and the numerals always agree.
- No numerals, percentage, or countdown text on the ring itself — it is a passive visual companion to the existing timer text, not a second data source.

---

## Section 4 — Designed Flow (New Content for §7.2)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ✓  Set 3 logged.  95 lb × 5                            │
│                                                         │
│              Rest.                                      │
│                                                         │
│                 ╭─────╮                                 │  ← New: thin bronze ring,
│                 │01:23│                                 │     fills toward reference
│                 ╰─────╯                                 │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  Next: Set 4  ·  target 95 lb × 5                       │
│                                                         │
│  [              Ready              ]                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

1. Rest overlay appears (unchanged trigger, §6.5).
2. If a reference duration resolves (Decision 2) **and** the athlete has the ring enabled (Decision 3): the ring renders around the timer, starting empty, filling proportionally as the count-up timer advances.
3. If elapsed time reaches the reference duration: the ring holds at full. No color shift, no pulse, no message. The count-up timer keeps counting past it exactly as it would with the ring disabled.
4. If no reference resolves, or the toggle is Off: the timer renders exactly as in the base spec, with no ring.
5. Dismissal behavior, "Ready" CTA, and auto-scroll on dismissal are all unchanged (§7.4).

---

## Section 5 — Required W-9 Changes (Applied Directly)

Applied directly to `Active-Workout-Flow-Spec-W9-W16.md` as v1.4:
- §4.2 — "timer preferences" sub-item of "⋯ Options" now cross-references this amendment instead of being an undefined stub.
- §7.2 — wireframe updated to show the optional ring; new note explaining when it renders.
- New §7.6 "Optional Rest Progress Ring" added after §7.5, summarizing Decisions 1–4.
- §16.6 (Rest Overlay Dimensions) — note added that the ring sits within the existing overlay footprint; introduces no new layout region.
- §17 Validation Checklist — new "Rest Progress Ring" block added.

---

## Section 6 — Non-Behaviors

- **No countdown is introduced.** The ring fills; it does not drain. Reaching the reference produces no stop, alert, or visual penalty.
- **No notification behavior is added or changed.** The base spec defines no "rest ended" notification today (§16.8 explicitly excludes any haptic for rest timer events); this amendment does not introduce one. If a future amendment adds a rest-end notification, it is independent of this ring and out of scope here.
- **No color change, pulse, or urgency cue at any fill level** — consistent with §7.2's existing prohibition.
- **No program-imposed "correct" rest duration** — the program's `restSeconds`, when used as a fallback reference, is still optional per EP-A1 and still displayed/used as a reference, never a requirement.
- **No new screen or modal** — the ring renders inside the existing Rest State overlay; Timer Preferences is a new sheet reached from the existing "⋯ Options" entry point, not a new top-level destination.
- **No change to free vs. program workout behavior** beyond the reference-source fallback in Decision 2.

---

## Section 7 — Validation Checklist

- [x] Ring fills (count-up direction) — never drains toward empty
- [x] Ring renders only when a reference duration resolves (personal preference, else program `restSeconds`) AND the athlete has the toggle enabled
- [x] Default state: toggle Off, personal reference blank — base spec behavior unchanged for any athlete who does not opt in
- [x] Reaching the reference produces no color change, pulse, haptic, or message — count-up timer is unaffected
- [x] Ring is bronze accent, thin stroke, sized to the timer's own footprint — no numerals on the ring itself
- [x] Timer Preferences sheet reached from existing "⋯ Options" entry; no new top-level navigation
- [x] No existing rest-end notification behavior touched (none exists in the base spec to touch)

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Reconciles a countdown-ring request with the base spec's count-up-only rest philosophy by specifying a fill-direction, opt-in, reference-based ring. Applied directly to Active-Workout-Flow-Spec-W9-W16.md as v1.4. |

---

*W9-Amendment-003 — Optional Rest Progress Ring*
*June 2026*
*Authority: Active-Workout-Flow-Spec-W9-W16.md (LOCKED), ExercisePrescription-Amendment-001.md (LOCKED), FORGE_LEGACY_PRODUCT_DNA.md (LOCKED)*
*Status: LOCKED*
