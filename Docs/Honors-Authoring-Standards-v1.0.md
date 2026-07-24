# Forge Legacy — Honors Authoring Standards
## Version 1.0 | June 2026

**Status:** LOCKED — content-production standards only. No architecture, schema, taxonomy, or catalog changes. Zero honors authored by this document — every honor-shaped example below is either structural (no honor-specific content) or an explicit citation of an honor already defined in `Honors-Architecture-V1-Final-v1.0.md` or `Honor-Catalog-v1.0-LOCKED.md`.
**Authority:** `Honors-Architecture-V1-Final-v1.0.md` (LOCKED), `Honor-Catalog-v1.0-LOCKED.md` (LOCKED), `HonorInstance-Architecture-v1.0.md` (LOCKED), `Honor-Detail-Sheet-Spec-L11.md` (LOCKED), `Anchor-Exercise-Authoring-Framework-v1.0.md` (LOCKED — structural precedent this document mirrors), Product DNA (LOCKED)
**Governs:** every future Honor — both the eventual full-descriptive-content pass against the 109 new honor types this V1 architecture introduces, and any honor authored after V1.

---

## Section 1 — Honor Content Philosophy

A Honor has four distinct content surfaces, each with a different communicative job. Conflating them produces honors that read like database rows instead of recognition.

| Field | Job | Example (existing, locked) |
|---|---|---|
| `displayName` | Names the accomplishment plainly — the headline, not the explanation | "Bench 225" |
| Qualification (threshold) | The objective, evaluable fact — never visible to the athlete as copy, only as the mechanism that fires the honor | `bench PR ≥ 225 lbs` |
| L-11 description (future pass) | Answers "why does this matter?" — 1–3 lines, the only place rationale lives | "A real strength milestone — bodyweight and beyond for most lifters." |
| Preview line (L-10 card) | The shortest possible context, derived from snapshotted metadata, never re-stating the name | "225 lbs" |

A honor is not content-complete until all four are authored and none of them duplicate another's job. The qualification is never restated in the description; the description never restates the display name.

---

## Section 2 — Writing and Design Standards

### 2.1 Naming Convention

- `honorType`: lowercase snake_case, family-prefixed, tier-suffixed where the family is a ladder (`bench_sex_milestone_3`), unsuffixed where it's a single named achievement (`prestige_complete_lifter`).
- `displayName`: title case, never a restated qualification ("Bench 225," not "Bench Press 225 Pounds Lifted").
- No honor name uses exclamation points, emoji, or superlatives the athlete hasn't earned the right to claim ("Amazing," "Incredible") — Product DNA's "Identity Over Performance" principle: the achievement speaks for itself.

### 2.2 Threshold-Setting Discipline

- **Career-horizon calibration.** Every ladder's top tier should be reachable within a realistic 8–20 year dedicated-athlete career, not a professional/elite-only ceiling. This is the single most consistent rule across all six Expansion Passes and is binding going forward.
- **Deceleration shape, not linear shape.** Successive tiers should grow by a shrinking or constant ratio, never an accelerating one — each tier should feel like a real, attainable next step from the one before it, not a sudden cliff.
- **No-filler rule.** A tier exists because it represents a genuine, independently-justifiable rung — never because a round number was needed to fill a gap between two existing tiers.

### 2.3 Voice

- `displayName` and qualification copy: plain, declarative, no second person ("Bench 225," not "You benched 225!").
- L-11 description copy (future pass): brief, "why" focused per §1 — see `Honor-Detail-Sheet-Spec-L11.md` §9 for the binding pattern.

---

## Section 3 — Honor Authoring Template

Structural skeleton only — no honor-specific content below.

```
honorType:        [family_prefix]_[tier_or_name]
category:         [one of the 13 locked display categories]
family:           [the named family this honor belongs to]
displayName:      [Title Case, plain, no restated qualification]
qualification:    [the exact, objectively evaluable threshold or condition]
metadata shape:   [the field names this honor's metadata object will carry —
                    never invent a field not already defined in
                    HonorInstance-Architecture-v1.0.md §4 for an analogous family]
repeatable:        [true only if chapter-scoped, per HonorInstance §6 — false by default]
```

---

## Section 4 — Family and Category Standards

When authoring a new honor, decide in this order:

1. **Does it extend an existing ladder?** (e.g., a sixth Workout Count tier) — add a tier, no new family.
2. **Does it measure a genuinely new dimension within an existing category?** (e.g., Consistency within Training) — new family, existing category.
3. **Does it measure a dimension no existing category covers at all?** (e.g., Endurance, Prestige, Hidden) — new category, only after confirming no existing category's intent already covers it (see the Distinct-Dimension test, §5).

A new category is the highest-cost option — it requires an L-10 display-category amendment and a new badge slot. Default to extending an existing family or adding a new family within an existing category unless the dimension is genuinely incommensurate with all 13.

---

## Section 5 — The Real Athlete Test (QC Checklist)

Every future Honor — without exception — must pass all six items before it is considered content-complete.

```
## Real Athlete Test — per honor

- [ ] POPULATION-ACHIEVABILITY: reachable by a genuinely dedicated,
      non-elite, non-professional athlete within the established career
      horizon (§2.2) — never calibrated to an outlier/elite-only population
- [ ] NO-PURE-LUCK-GATING: qualification is attributable to deliberate
      athlete effort, never to circumstance alone
- [ ] NO-IMPLICIT-EXCLUSION: does not gate behind a circumstance outside
      the athlete's control, or behind a declaration the athlete may not
      have made — any honor that depends on an optional declared field
      (biological sex, bodyweight) must leave the undeclared athlete with
      an equally real, always-available alternative path
- [ ] DISTINCT-DIMENSION-NOT-DUPLICATE: measures a genuinely different
      axis than every existing honor — does not recognize the same
      underlying achievement twice under a different name
- [ ] ARCHITECTURE-HONESTY: evaluated only against a statistic that
      genuinely exists and is precomputed per the Evaluation Service's
      invariant (Honor-Evaluation-Service-Architecture-v1.0.md §9.5) —
      if the needed statistic does not exist, the honor is not authored;
      it is written up as an explicit deferral instead (see
      Honors-Architecture-V1-Final-v1.0.md §9 for the established pattern)
- [ ] NO-FILLER: every tier is independently justifiable as a real rung,
      never inserted solely to round out a numeric gap
```

**Case law.** Each item above has a concrete precedent from this project's own history, cited so future authors can see the test applied, not just stated:
- Population-achievability: the Strength ladders' career-horizon calibration (Expansion Pass 2).
- No-pure-luck-gating / No-implicit-exclusion: Partnership/Squad's exclusion from the Prestige breadth denominator, because their top tiers require another person's participation, not solo effort (Expansion Pass 6 Part B).
- Distinct-dimension-not-duplicate: `chapter_duration_*` rejected as a duplicate of `workouts_in_chapter_*` until proven to measure a genuinely different axis (calendar time vs. session count) — confirmed distinct, both kept (Expansion Pass 1).
- Architecture-honesty: Comebacks & Resilience authored zero honors rather than inventing a gap-tracking statistic that didn't exist (Expansion Pass 6 Part A) — the clearest example in the project's history of this rule in action.
- No-filler: every Expansion Pass's own gap-analysis section explicitly rejected tiers that existed only to fill a numeric gap (Expansion Pass 2's entire mandate).

---

## Section 6 — Production Readiness

This document defines standards only. It does not assess readiness to begin the next phase (full L-11 descriptive content for the 109 new honor types introduced in `Honors-Architecture-V1-Final-v1.0.md`) — that assessment is the first task of the future content-authoring pass itself, using this document's Section 5 checklist as its gate. No honors are authored here; none should be inferred from the structural examples above.

---

## Section 7 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial document. Defines the four-surface content philosophy, naming/threshold/voice standards, the authoring template, family/category decision order, and the six-item Real Athlete Test with case-law citations from the project's own Expansion Pass history. Zero honors authored. |

---

*Forge Legacy — Honors Authoring Standards*
*Version 1.0 | June 2026*
