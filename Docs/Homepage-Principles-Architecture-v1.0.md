# Forge Legacy — Homepage Principles Architecture
## v1.0 | June 2026

**Status:** **LOCKED** v1.0 (foundational brand architecture; defines the net-new Homepage Principles system. Locked and ready for the Architecture Freeze.)

**Type:** Foundational Brand Architecture — the **governing authority for the Homepage Principle (the digital inscription) shown on Home (H-1).** This document owns no Home-screen layout and no Tier model; it governs only the inscription's purpose, content rules, rotation behavior, and editorial process. `Home-Screen-Wireframe-Spec-H1.md` owns the screen; this document owns the inscription that appears on it.

**Authority (this document inherits from and may not exceed):**
- `FORGE_LEGACY_PRODUCT_DNA.md` (LOCKED) — mission, the six principles, "reflection over motivation" posture, guardrails against hype/shame/comparison patterns.
- `Forge-Legacy-Master-PRD.md` (LOCKED v1.0) — §6 (5-tab Navigation System as of 2026-07-07, unaffected by this document), §19 (Information Architecture).
- `Home-Screen-Wireframe-Spec-H1.md` (LOCKED v1.1) — the five-tier Information Hierarchy (Decision 2) and the screen's "Daily Focus Surface" purpose (Decision 1). This document's inscription is **additive** to H-1 and is **not** a sixth tier (§2 below).

**Supersedes:** Nothing. This document is purely additive. It introduces no new H-1 tier, redefines no existing H-1 decision, and owns no data belonging to any other system.

**Amendment Log:** Initial. v1.0.

**Downstream dependents (reconciled in this pass):** `Home-Screen-Wireframe-Spec-H1.md` (v1.1 → v1.2, new non-tiered inscription element); `Forge-Legacy-Master-Status.md` (V1 Architecture Freeze table, Documentation Status, Recently Completed); `Forge-Legacy-Master-PRD.md` (Amendment Log). The per-athlete "recently shown" history needed for the no-repeat rotation window (§4) depends on the not-yet-authored Backend / Data-Model architecture — flagged as a downstream dependency, the same way `Home-Screen-Wireframe-Spec-H1.md` already flags its own L-5/W-8 dependencies.

---

## Section 1 — HP-D1 — Purpose: The Digital Inscription

**Locked.** The Homepage Principle exists to quietly reinforce the values of Forge Legacy over years of use. Its purpose is **reflection, not motivation.**

The governing metaphor for this system is the **digital inscription** — not a motivational widget, not a quote-of-the-day card, not a tip, not a coaching prompt. An inscription is read, felt, and left alone; it does not ask for engagement, does not animate for attention, and does not compete with anything around it. Every decision in this document is tested against that metaphor: if a design choice would make the Homepage Principle feel like a widget rather than an inscription, it is wrong.

This term — **digital inscription** — is used consistently throughout this document, the companion library (`Homepage-Principles-Library-v1.0.md`), and the H-1 reconciliation. It is never referred to as a "card," "tip," "quote," or "widget" in governing documentation.

---

## Section 2 — HP-D2 — Placement

**Locked.** The Homepage Principle is placed on **Home (H-1) only in V1.**

- Positioned near the top of the page.
- Below the greeting/status area — in H-1 terms, below the Chapter Card (Tier 1, which carries the athlete's status line and primary goal).
- Above the primary action cards — in H-1 terms, above the Active Program Card (Tier 2) and the Workout CTA (Tier 3).
- Never displayed inside a large card.
- Never treated as a primary feature.

**The Homepage Principle is not a sixth content tier of H-1's Information Hierarchy (H-1 Decision 2).** H-1's five tiers are each present only when their underlying data applies, and each is omitted cleanly when absent. The inscription has no such data dependency — it does not represent an athlete's chapter, program, activity, or squad. It is a **fixed, low-prominence element** that renders unconditionally, much like H-1's App Bar (Section 4 of the H-1 spec): always present, never a tier, never omitted, never an empty state.

---

## Section 3 — HP-D3 — Visual Design

**Locked (architecture-level; exact pixel values are wireframe-level, owned by the H-1 reconciliation).** The Homepage Principle must feel like an inscription, not a widget:

- Small typography (indicatively 13sp, consistent with H-1's muted/tertiary text scale).
- Low-contrast text (muted/tertiary color token — never primary-weight text).
- No icon.
- No border.
- No background card.
- No CTA.
- No animation.
- No interaction.

It renders as a single line of static text. If the rendered text would not fit on one line at the design system's standard width, it truncates — it never wraps to a second line and never grows the element's footprint. This is a deliberate constraint that keeps the inscription's vertical and visual weight constant regardless of which entry is shown.

---

## Section 4 — HP-D4 — Rotation

**Locked.** The Homepage Principle is selected using **deterministic daily randomization**, not session-level randomness:

- One entry is shown per calendar day. The entry changes at most once per day and remains the same for that entire day, consistent with H-1's existing day-boundary semantics ("Active · N days").
- **Determinism requirement:** for a given athlete and a given calendar day, every device that athlete uses must display the same entry. The selection is computed from `(athleteId, calendar date in the athlete's local timezone)` as a deterministic seed — the same inputs always produce the same output, so no server round-trip is required for two devices to agree on the day's entry.
- **No-repeat window:** the entry is drawn from the subset of the canonical library not shown to that athlete in the last **14 days**. If the canonical library is too small to satisfy a 14-day no-repeat window for a given athlete (see HP-D10 — the library's size is not fixed and is not stated here), the system gracefully falls back to the full library minus only the entry shown yesterday.
- **No event-triggered principles.** The Homepage Principle never changes in response to a workout, a goal, an honor, a rank change, or any other in-app event. This mirrors H-1 Decision 12's binding rule that H-1 does not use ceremonial or reactive behavior outside of its locked exceptions — the inscription has no exception of its own.

The per-athlete "recently shown" history this rule depends on is a data-layer concern outside this document's authority (see Downstream Dependents above).

---

## Section 5 — HP-D5 — Content Rules

**Locked.** Every entry in the canonical library must:

- Be original Forge Legacy writing.
- Be timeless.
- Apply inside and outside the gym.
- Reward reflection.
- Respect the user.
- Avoid hype.
- Avoid clichés.
- Avoid shame or guilt.
- Avoid celebrity quotes.
- Avoid copyrighted material.
- Avoid social-media-style motivation.
- Prefer 5–12 words.
- Use calm, understated language.
- Prefer present tense.
- **Express one complete idea only.** An entry that bundles two ideas, or that qualifies/hedges its own statement, has not earned its place — it is split or cut, never kept as a compound.

These rules bind every entry in the library, not only new additions — they are the standard the v1.0 import was checked against and the standard every future entry must clear (see HP-D7, HP-D10).

---

## Section 6 — HP-D6 — Entry Types

**Locked.** The library contains exactly two approved entry types:

**Principles** — short statements of enduring truth.

**Reflection Questions** — open-ended questions intended to encourage quiet reflection. They never imply a correct answer and never pressure the athlete.

No affirmations. No commands. No coaching prompts. No daily challenges. An entry that instructs the athlete to do something, congratulates them, or frames today as a test to pass is not a Principle or a Reflection Question — it does not belong in the library regardless of how well-written it is.

---

## Section 7 — HP-D7 — Editorial Standard

**Locked.** An entry is approved only if it satisfies **all** of the following:

- Feels timeless.
- Sounds distinctly Forge Legacy.
- Applies beyond fitness.
- Does not repeat an existing idea.
- Rewards a second reading.
- Would still feel relevant 100 years from now.

**Editorial Rejection Criteria.** Reject any entry that:

- repeats an existing principle,
- sounds like social-media motivation,
- feels preachy,
- requires explanation,
- exists only to increase library size.

**Quality is always prioritized over quantity.** A smaller library that holds this bar is correct; a larger library that does not is a failure of this standard, regardless of how the library got there.

---

## Section 8 — HP-D8 — Approved Themes

**Locked.** The closed set of themes future entries are checked against:

Foundation · Legacy · Discipline · Consistency · Identity · Character · Standards · Craftsmanship · Responsibility · Leadership · Courage · Humility · Patience · Long-term thinking · Progress · Purpose · Training · Resilience

This taxonomy governs editorial review of future additions (HP-D7, HP-D10). The v1.0 canonical library is **not** tagged by theme — see HP-D10.

---

## Section 9 — HP-D9 — Library Reference

**Locked, binding.** This architecture document **owns no content.** Every Homepage Principle entry lives in exactly one place: `Homepage-Principles-Library-v1.0.md`. That document is the single canonical source of every entry's text, type (Principle / Reflection Question), and count.

This mirrors the separation other Forge Legacy systems already use between a *rules* document and a *content* document (e.g., the Honor Catalog's category rules versus its enumerated honor types) — established here for the first time for the Homepage Principles system specifically.

---

## Section 10 — HP-D10 — Future Expansion & Editorial Versioning

**Locked.** The initial canonical library consists of the approved V1 Homepage Principles Library imported from the design process. **`Homepage-Principles-Library-v1.0.md` — not this architecture document — is the single source of truth for all library counts.** This document deliberately states no fixed entry count, so this architecture never goes stale as the library grows, shrinks, or is revised.

- **Additive expansion:** additional principles or reflection questions may be added in future versions only if they satisfy the Editorial Standard (HP-D7) in full, including the Editorial Rejection Criteria.
- **Editorial versioning:** existing entries may be **revised or retired** in future versions if they no longer satisfy HP-D7. **Quality always takes precedence over preserving existing entries** — an entry earning a place in v1.0 does not entitle it to a place in v1.1 if a future editorial pass finds it falls short.
- **Size discipline:** the system prioritizes maintaining a premium, timeless identity over increasing library size. There is no growth target and no minimum cadence for additions.
- **Theme tagging** of the existing (untagged) library against HP-D8 is noted as a candidate future-expansion task — not required, not scheduled.

---

## Section 11 — HP-D11 — Canonical Library, No Runtime Generation

**Locked, binding.** Homepage Principles are **never AI-generated at runtime.** Every displayed entry comes from the curated, versioned canonical library (`Homepage-Principles-Library-v1.0.md`). There is no on-device generation, no on-demand generation, and no personalization that alters or paraphrases an entry's wording.

Future additions require editorial review against HP-D7 and are appended to the canonical library file as part of a new, explicitly versioned release of that document — never synthesized at the moment of display. This is what makes "canonical" mean something: the set of possible entries an athlete can ever see is fully enumerable by reading `Homepage-Principles-Library-v1.0.md`, in every version, forever.

---

## Non-Behaviors

The Homepage Principles system deliberately does **not** introduce, in V1 or as part of this architecture:

- **No motivational quotes** — the system is reflection, not motivation (HP-D1).
- **No celebrity quotes, no copyrighted material** — every entry is original Forge Legacy writing (HP-D5).
- **No event-triggered principles** — the inscription never reacts to workouts, honors, rank changes, or any other event (HP-D4).
- **No notifications or push** tied to the Homepage Principle — it is a passive, on-screen-only element.
- **No interaction or CTA** — no tap target, no share action, no "save this" affordance (HP-D3).
- **No analytics-driven personalization in V1** — selection is deterministic by athlete + date only (HP-D4), never by inferred preference or behavior.
- **No per-athlete content history surfaced to the athlete** — the "recently shown" record exists only to support the no-repeat rule; it is never displayed as a history, journal, or favorites list.
- **No second tier or card treatment** — the inscription is never promoted to a card, a tier, or a primary feature (HP-D2).
- **No runtime or on-device AI generation of entries** — every entry is canonical and pre-curated (HP-D11).
- **No sixth H-1 tier** — H-1's five-tier Information Hierarchy is unchanged (HP-D2; H-1 Decision 2).

---

## Validation Checklist

- [ ] HP-D1 — purpose is reflection, not motivation; "digital inscription," not "widget," is the governing and consistently-used term
- [ ] HP-D2 — Home (H-1) only in V1; below status area, above primary action cards; never a large card; never a primary feature; explicitly **not** a sixth H-1 tier
- [ ] HP-D3 — small typography, low-contrast, no icon/border/card/CTA/animation/interaction; single line, truncates rather than wraps
- [ ] HP-D4 — deterministic daily randomization (same athlete + same day ⇒ same entry on every device); one entry per day; 14-day no-repeat window with graceful fallback; no event-triggered changes
- [ ] HP-D5 — full content-rules list satisfied, including "one complete idea only"
- [ ] HP-D6 — exactly two entry types (Principle, Reflection Question); Reflection Questions never imply a correct answer or pressure the athlete; no affirmations/commands/coaching prompts/daily challenges
- [ ] HP-D7 — six-part Editorial Standard plus five-part Editorial Rejection Criteria; quality over quantity is binding
- [ ] HP-D8 — 18 approved themes listed as the closed taxonomy for future review
- [ ] HP-D9 — this document owns no content; `Homepage-Principles-Library-v1.0.md` is the single canonical source
- [ ] HP-D10 — no fixed entry count stated here; Library doc is the single source of truth for counts; additive expansion and editorial revision/retirement both gated by HP-D7; quality over quantity; theme-tagging noted as optional future work
- [ ] HP-D11 — no runtime/on-device AI generation; every entry is canonical and pre-curated; future additions go through editorial review into a new versioned library release
- [ ] No contradiction with `Home-Screen-Wireframe-Spec-H1.md`'s five-tier model or Decisions 1–12
- [ ] No contradiction with Product DNA or Master PRD

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Establishes the Homepage Principles system as a governed Forge Legacy brand architecture: the Homepage Principle is a **digital inscription**, not a motivational widget (HP-D1); placed on Home only, below the status area and above the primary action cards, explicitly not a sixth H-1 tier (HP-D2); visual spec calls for an inscription-like single line of small, low-contrast, static text (HP-D3); rotation is deterministic per athlete and calendar day with a 14-day no-repeat window and graceful fallback (HP-D4); content rules bind every entry, including the new "one complete idea only" rule (HP-D5); exactly two entry types — Principles and Reflection Questions, the latter now formally defined as never implying a correct answer or pressuring the athlete (HP-D6); the Editorial Standard gains five explicit Editorial Rejection Criteria alongside its original six-part test (HP-D7); 18 approved themes form the closed taxonomy for future review (HP-D8); this document owns no content — `Homepage-Principles-Library-v1.0.md` is the sole canonical source (HP-D9); future expansion is additive-only against HP-D7, existing entries may be revised or retired in future versions if they no longer satisfy HP-D7, quality always outranks preserving existing entries, and this document deliberately states no fixed library count so it cannot go stale as the library changes (HP-D10); a new binding decision establishes that Homepage Principles are never AI-generated at runtime — every entry is canonical and pre-curated (HP-D11). The initial canonical library, imported verbatim from the approved design session, ships alongside this document in `Homepage-Principles-Library-v1.0.md`. **LOCKED for the Architecture Freeze.** |

---

*Forge Legacy — Homepage Principles Architecture*
*v1.0 — June 2026*
*Authority: FORGE_LEGACY_PRODUCT_DNA.md; Forge-Legacy-Master-PRD.md; Home-Screen-Wireframe-Spec-H1.md v1.1 — all LOCKED*
*Supersedes: nothing (additive)*
*Status: LOCKED v1.0 — ready for Architecture Freeze*
