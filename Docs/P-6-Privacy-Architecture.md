# P-6 Privacy Architecture
## Architecture Specification — Privacy Settings Information Architecture
### June 2026

**Status:** LOCKED

**Type:** Screen Architecture (architecture-level, not a pixel wireframe — mirrors the role P-4-Settings-Root-Architecture.md played before P-4-Settings-Root-Wireframe-Spec.md)

**Date:** June 2026

**Authority Chain:**
- P-4-Settings-Root-Architecture.md v1.0 (LOCKED) — Section 2.4 (P-6 content summary, entry point)
- Identity-Amendment-001 (LOCKED) — Section 7 (Privacy and Opt-Out Model) — owns the discoverability setting
- WSR-001-Workout-Share-Result-Architecture.md v1.2 (LOCKED) — Section 4 (Privacy Architecture), Section 8.3–8.4 (share configuration flow) — owns the sharing default setting
- Profile-Wireframe-Spec-P1.md v1.3 (LOCKED) — Section 15 (Privacy Architecture Review: Flagged Elements) — authority for deferred future scope
- Squad-Detail-Wireframe-Spec-S2.md (LOCKED) — Section 5.5 (Limited Athlete Profile) — confirms field-level squad visibility is hardcoded, not P-6-configurable at MVP
- Squads-Hub-Wireframe-Spec-S1.md (LOCKED) — confirms squads have no discovery surface, so no discoverability setting is needed for squads themselves

**Downstream Dependents:**
- P-6 Privacy wireframe spec (recommended immediately — see Section 7; unlike P-9, nothing blocks it)
- WSR-001 — this document fulfills WSR-001's own explicitly-named downstream dependency, "P-settings (future: share preference surface)" (WSR-001 header, Downstream impact line)

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — P-6 Architecture Review

The Master PRD describes P-6 in three overlapping phrases: "who can find me, squad visibility, username search opt-out." Read literally, this suggests three settings. A full dependency audit shows it is actually **two settings from two unrelated owning systems, plus one piece of non-configurable informational copy.**

**Guardrail this document establishes and that the wireframe spec must preserve:**

P-6 is a presentation surface, not a new system. It hosts two settings that belong to two different owning architectures, and neither this document nor the wireframe spec that follows it should blur them into a unified "privacy preferences" abstraction:

- **Discoverability setting** ("Let non-squad athletes find me in search") — owned by the **Identity system** (Identity-Amendment-001). It governs search/lookup, nothing else.
- **Sharing default setting** ("Share workouts with my squad") — owned by **WSR-001**. It governs only the default `globalVisibility` value read at share-creation time, nothing else.

These two settings have no relationship to each other: no shared data model, no shared service, no combined on/off state, no "privacy level" that summarizes both. P-6 does not introduce a new `PrivacySettings` entity or a unifying concept wrapping Identity's discoverability flag and WSR-001's `globalVisibility` together. Each setting reads and writes directly to its own owning system's existing field. P-6 is purely where the two rows are displayed together for the athlete's convenience — the architecture underneath stays exactly as split as it already is.

**What the dependency audit ruled out, and why:**

| Candidate Control | Why It's Not on P-6 at MVP |
|---|---|
| Per-field profile visibility (accomplishments, athlete type, rank, forging-since) | Explicitly deferred — P-1 §15 lists all six as future-roadmap items, not MVP. S-2's Limited Athlete Profile already hardcodes what's shown/hidden; there is no athlete-facing toggle for any of it today. |
| Public profile opt-in | Listed only under Master PRD "Future Roadmap — Not Scheduled." No locked architecture exists anywhere. |
| Journey sharing (shareable Legacy link) | Same as above — future roadmap only, P-1 §15.2. |
| Legacy / Honors / Goals visibility | No locked spec (L-1, L-10, G-1, G-2) ever exposes this content to squad members. There is no exposure surface, so there is nothing to control. |
| Squad discoverability | Squads have no discovery surface at all — S-1 confirms squads are private, invite-only, with no public directory and no join-without-invite path. A toggle would control nothing. |
| `includeNameByDefault`, `includeChapterByDefault`, `defaultDetailLevel` (other `AthleteShareSettings` fields) | WSR-001 names only `globalVisibility` as needing a "P-settings (future)" home. These remain per-share toggles inside the share configuration flow, with no indication they need a persistent Settings surface. |

**What the dependency audit confirmed must be added:**

WSR-001's own document header lists, as a downstream dependency: *"P-settings (future: share preference surface)."* Tracing the actual share configuration flow (WSR-001 §8.3–8.4) confirms why: the squad-sharing toggle inside that flow is visible *only if* `globalVisibility` is already `SQUAD_ONLY` — but no UI anywhere lets an athlete move it there from the `PRIVATE` default. Without a control somewhere, **the `SQUAD_ONLY` tier is unreachable by any athlete**, despite being listed under WSR-001's MVP data model checklist (not its Future Compatibility checklist — only `PUBLIC` is checklisted as future). This is a real, locked-but-incomplete dependency that this document resolves, not a speculative addition.

---

## Section 2 — Privacy Information Architecture

**P-6 MVP content, in order:**

1. **"Let non-squad athletes find me in search"** — toggle, default ON. Owned by the **Identity system** (Identity-Amendment-001 §7.1). Controls non-squad discoverability only.
2. Brief informational copy, non-toggle: squad members can always find and tag the athlete within a shared squad, regardless of setting #1. This directly satisfies the Master PRD's "squad visibility" phrase without inventing a fake control — Identity-Amendment-001 §7.2 is explicit that squad membership implies discoverability within the squad and is **not configurable**.
3. **"Share workouts with my squad"** — toggle, default OFF (maps to `AthleteShareSettings.globalVisibility = PRIVATE`). ON maps to `SQUAD_ONLY`. Owned by **WSR-001** (§4.1, §4.2). Governs only the *global default* read at the moment a new share is created — it does not retroactively affect existing `WorkoutShare` records, which are immutable after creation (WSR-001 §4.2, §4.5). Per-share override and the squad picker (when an athlete belongs to multiple squads) remain entirely owned by the share configuration flow (W-17 / W-19 / M-1–M-4), not by P-6.

No other content appears on P-6 at MVP.

---

## Section 3 — Setting Inventory

Each row is independently owned — this table is deliberately structured to keep that visible, not to imply a shared schema.

| Setting | Type | Default | Owning System | Data Model Field |
|---|---|---|---|---|
| Let non-squad athletes find me in search | Toggle | ON | **Identity system** (Identity-Amendment-001 §7.1) | Athlete discoverability flag, owned entirely by Identity |
| Share workouts with my squad | Toggle | OFF (PRIVATE) | **WSR-001** (§4.1) | `AthleteShareSettings.globalVisibility` — PRIVATE↔SQUAD_ONLY only at MVP; PUBLIC excluded (still future per WSR-001); field lives entirely within WSR-001's `AthleteShareSettings` entity, not a new P-6 entity |

Plus one informational, non-toggle line (squad members always have visibility within the squad) — not a setting, not stored anywhere, purely explanatory copy.

**No new entity, enum, or service is created to hold these two settings together.** P-6 reads and writes Identity's field for row 1 and WSR-001's field for row 2, independently, with no intermediating P-6-owned data model.

---

## Section 4 — Visibility Rules Matrix

| Content | Default Visibility | Squad Members See | Outside Users See | Controlled By |
|---|---|---|---|---|
| Username / search (non-squad) | Searchable | N/A — always visible to squad regardless of setting | Per setting #1 | P-6 (Identity-owned field) |
| Squad roster presence | N/A | Presence only — no performance data | Nothing | S-2 (not P-6) |
| Limited Athlete Profile fields | N/A | Photo, display name, athlete type, rank name (no sub-tier), forging since, top 3 accomplishments | Nothing | S-2 (hardcoded, not P-6-configurable at MVP) |
| Legacy (chapters, photos, timeline) | Private | Nothing | Nothing | No control needed — no exposure surface exists |
| Honors | Private | Achievement-only, via share check-in card, only if setting #2 is ON | Nothing | WSR-001 (per-share) + P-6 (global default) |
| Goals | Private | Achievement-only, via share check-in card, only if setting #2 is ON | Nothing | WSR-001 (per-share) + P-6 (global default) |
| Workout data | PRIVATE default | Check-in card (presence + achievement signal only — never performance data) if setting #2 is ON | Only via athlete-initiated native share sheet (always available regardless of setting #2) | P-6 (global default) + WSR-001 (per-share override) |

---

## Section 5 — Navigation Dependencies

- **P-4 → Privacy row → P-6** — pushes onto the Profile modal's navigation stack, reusing the established P-4 pattern exactly (P-4-Settings-Root-Architecture.md §3 / Wireframe Spec §3). No new navigation model is introduced.
- **P-6 has zero child screens at MVP.** Both settings are inline toggles on a single flat screen — no sub-navigation, no further pushes.
- **Back: P-6 → P-4** — standard stack pop, identical to every other P-4 child screen's back behavior.

---

## Section 6 — Open Questions

1. **Exact toggle copy for "Share workouts with my squad."** Needs a final UX copy pass before wireframe lock. Not an architecture blocker — the behavior is fully specified regardless of final wording.
2. **Should enabling setting #2 show inline confirmation copy** (e.g., "Your squad will see check-in cards when you share")? Recommendation: yes, brief — this is consistent with WSR-001 §8.3's existing in-flow copy pattern ("Your squad will see the check-in summary. Exercise details appear in your external share only.").
3. **Legal/analytics-disclosure controls** (e.g., CCPA "Do Not Sell," ad-tracking opt-out). No existing authority either way anywhere in the docs. Flagged as needing product/legal confirmation before launch — not a P-6 architecture blocker, since nothing currently locked requires it.
4. **Should WSR-001's header be lightly amended** to remove "(future)" from its "P-settings (future: share preference surface)" downstream-impact note, now that this document fulfills it? Recommendation: yes, as a small follow-up cross-reference update to WSR-001 — not required for P-6 itself to lock, since P-6 is the fulfilling document regardless of whether WSR-001's own header text is updated to reflect it.

**Status of P-6 itself: fully resolved.** All four items above are copy-level or cross-reference housekeeping, not architectural blockers.

---

## Section 7 — Recommendation for P-6 Wireframe Spec Scope

P-6 is small: two toggles, one informational line, zero child screens. Unlike P-9 (gated on a non-existent Account/Auth Architecture), **P-6 has no external blocking dependency** — both of its settings already have fully-specified owning systems (Identity, WSR-001) and a fully-specified entry point (P-4).

**Recommend authoring the full P-6 wireframe spec immediately.** No deferral is needed. The wireframe spec should:
- Carry forward the Section 1 guardrail verbatim — name each setting's owning authority inline wherever it's described, to prevent the two settings from drifting into a merged abstraction during implementation
- Resolve Open Questions 1–2 (copy) as part of the wireframe authoring pass
- Leave Open Questions 3–4 as noted follow-ups, not blockers

---

## Section 8 — Lock Recommendation

**LOCKED.** All architectural decisions required to specify P-6 are resolved. Open Questions 1–4 are copy-level or cross-reference housekeeping and do not block this document or the wireframe spec that follows it.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Dependency audit across Identity-Amendment-001, P-1 §15, S-2, S-1, and WSR-001. Confirmed P-6 MVP scope: two independently-owned settings, no new privacy entity. Fulfills WSR-001's explicitly-named "P-settings (future)" dependency. |

---

*P-6 Privacy Architecture*
*Architecture Specification — Privacy Settings Information Architecture*
*June 2026*
*Authority: P-4-Settings-Root-Architecture.md (LOCKED), Identity-Amendment-001 (LOCKED), WSR-001-Workout-Share-Result-Architecture.md (LOCKED), Profile-Wireframe-Spec-P1.md (LOCKED), Squad-Detail-Wireframe-Spec-S2.md (LOCKED), Squads-Hub-Wireframe-Spec-S1.md (LOCKED)*
*Status: LOCKED*
