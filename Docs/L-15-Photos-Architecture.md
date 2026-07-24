# L-15 / L-16 Photos — Architecture

## v1.0 — June 2026

**Status:** LOCKED

**Type:** Architecture Document (not a wireframe spec — no layout, no push-vs-modal, no grid/thumbnail sizing; all deferred to the wireframe-spec stage)

**Date:** June 2026

**Implements:** Legacy-Hub-Wireframe-Spec-L1.md §4's "View All [N] Photos ›" destination and Risk 5 ("L-15 Photos Unspecced; Photo Tap Uses L-4 Fallback"); P-8's, M-7's, and Monetization-Architecture-Amendment-001.md's existing assumption that a photo counter "lives on L-15."

**Authority Chain:**
- Legacy-Hub-Wireframe-Spec-L1.md (LOCKED) §4 — Photos preview strip, ordering rule, Risk 5
- Legacy-Timeline-Wireframe-Spec-L2.md (LOCKED) §4 — "Photo Added" event format and chapter-section grouping
- Chapter-Detail-Wireframe-Spec-L3-L4.md (LOCKED) §11.2, §17.3, §19.4 — the only confirmed photo creation paths; the "additions to the archive" vs. "the archive itself" mutability principle
- Featured-Legacy-Moment-Standards.md (LOCKED) — Tier 5, Priority 9, "Photo Added" trigger and fallback rule
- Monetization-Architecture-Amendment-001.md (LOCKED) §3, §5 — 50-photo free limit, counter display requirement
- Critical-Decisions-Amendment-001.md (LOCKED) Decision 3 — account-wide (not per-chapter) limit enforcement
- M-7-Premium-Upsell-Spec.md (LOCKED) — upsell trigger on the 51st photo from any surface
- HonorInstance-Architecture-v1.0.md (LOCKED) §5 — AD-52 snapshot principle, governing this document's delete-safety reasoning
- Profile-Wireframe-Spec-P1.md (LOCKED), Squad-Detail-Wireframe-Spec-S2.md (LOCKED) — confirm no relationship to P-1 and no squad-visibility surface

**Downstream Dependents:** Docs/Photos-Wireframe-Spec-L15-L16.md (recommended next, not yet authored — see Section 17).

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Architecture Review

L-1 already treats L-15 as a live, named navigation destination, and frames the gap precisely:

> *"'View All [N] Photos ›' → L-15 (Photos). Unspecced. See Architecture Risks, Risk 5."*
> *Risk 5: "L-15 has no wireframe spec. Tap on a photo thumbnail uses L-4 (the chapter the photo belongs to) as a MVP fallback — the athlete lands on the chapter detail, not on the photo itself... Recommendation: L-15 spec in Phase 2C queue. Photo detail screen may be L-16."*

Three other locked documents already assume L-15 exists as the canonical home for the photo counter: P-8 ("the photo counter shown on L-15"), Monetization-Architecture-Amendment-001.md ("Counter shown on L-15"), and M-7 ("Any photo upload surface (chapter detail, L-15, or equivalent)"). This document, plus a follow-on wireframe spec, closes the one remaining Priority 1 MVP gap project-wide.

Per the task's locked direction, **L-15 = Photos Gallery, L-16 = Photo Detail** — two separate screens, not revisited here.

---

## Section 2 — Existing Authority Audit

| Question | Answer | Source |
|---|---|---|
| Existing photo ownership rules | Athlete-owned; created only via L-3 (active chapter, "Add Photo") or L-4 (archived chapter, "Add a Memory" flow) | Chapter-Detail-Wireframe-Spec-L3-L4.md |
| Existing photo limits | 50 free, account-wide, not per-chapter; unlimited on premium | Monetization-Architecture-Amendment-001.md §3; Critical-Decisions-Amendment-001.md Decision 3 |
| Existing photo visibility rules | No squad-visibility surface anywhere; P-1 shows only the identity profile photo, unrelated to Legacy photos | Squad-Detail-Wireframe-Spec-S2.md; Profile-Wireframe-Spec-P1.md |
| Existing photo references | L-1 strip (preview), L-2 "Photo Added" timeline event, L-3/L-4 chapter galleries, P-8 usage counter, M-7 upsell trigger | as cited above |
| Existing photo navigation references | L-1 → L-15 ("View All"); L-1 thumbnail → L-4 (explicit MVP fallback, Risk 5) | Legacy-Hub-Wireframe-Spec-L1.md |
| Existing FLM interactions | Tier 5, Priority 9, lowest tier, fallback-only, no active window, no aggregation of multiple photos into one event | Featured-Legacy-Moment-Standards.md |
| Existing chapter relationships | Every confirmed creation path is chapter-scoped (active or archived); no account-level path is evidenced in any wireframe spec | Chapter-Detail-Wireframe-Spec-L3-L4.md; Featured-Legacy-Moment-Standards.md |
| Existing unresolved photo decisions | L-15/L-16 themselves (this document); the PRD's one conflicting line (Section 3); the Memory-vs-Photo entity boundary (Section 16) | — |

No new accomplishment-style taxonomy or type system is introduced — a photo remains a single, untyped image record, exactly as every existing reference already treats it.

---

## Section 3 — Photo Ownership Model

A Legacy Photo is athlete-owned, created only through one of two already-locked flows:

1. **L-3 (Active Chapter):** direct "Add Photo" CTA, available any time the chapter is active.
2. **L-4 (Archived Chapter):** no direct "Add Photo" CTA — *"photos added through 'Add a Memory' flow"* only, post-sealing.

**A genuine conflict, surfaced rather than silently resolved:** FORGE_LEGACY_PRD.md states *"Add photos without an active chapter"* — the only text anywhere suggesting an account-level (chapter-less) photo. This directly conflicts with both of the more specific, more recently locked sources above: L-3/L-4's actual creation mechanics name only the two chapter-scoped flows, and Featured-Legacy-Moment-Standards.md's own trigger definition reads *"Athlete adds a photo to any chapter (active or archived)"* — chapter is not optional in that phrasing either. Weighing two specific, detailed, wireframe/standards-level sources against one general PRD line, **this document resolves photos as chapter-scoped only.** The PRD line is flagged in Section 16 as a documentation-lag artifact for the project's existing cleanup backlog — not silently edited, and not used to justify an account-level path that no UI flow actually supports.

**Result: `chapterId` is non-nullable.** This is the key divergence from the Accomplishments precedent (L-12-Accomplishments-Management-Architecture.md), reached by direct evidence rather than assumed-by-analogy — Accomplishments have a genuinely locked two-context model; Photos do not.

---

## Section 4 — Photo Data Model Requirements

| Field | Notes |
|---|---|
| `id` | System-generated. |
| `chapterId` | **Non-nullable.** Every photo belongs to exactly one chapter. |
| `dateAdded` | Forge Legacy creation timestamp. Drives L-1's reverse-chronological strip order and L-15's gallery order. |
| `imageRef` | The stored image itself. |

**No `isMemoryAddition` flag is introduced.** Whether a photo is an "original" (pre-sealing) photo or a "memory" (post-sealing) photo is fully derivable by comparing `dateAdded` to the photo's chapter's existing `sealedAt` timestamp (already part of Chapter Architecture via M-5-Chapter-Sealing-Confirmation-Spec.md). Adding a redundant boolean would duplicate information the data model already has.

**No caption/note field.** No locked document evidences one. The task's own framing names this as a possible "future expansion point" for L-16 — explicitly not introduced now.

**Boundary, not redesigned here:** L-3/L-4 separately defines a "Memory" concept (text notes; L-2 has its own distinct "Memory Added" timeline event, separate from "Photo Added"). This document defines only the Photo entity itself, however it was created — it does not redefine Memory/notes, and does not decide whether a Memory-flow photo addition fires one timeline event or two. That boundary is owned by Chapter Architecture/L-6 (flagged again in Section 16).

---

## Section 5 — Information Architecture

Two screens:

- **L-15 — Photos Gallery:** every photo the athlete owns, flat, reverse-chronological, account-wide. Browse-only (Section 6).
- **L-16 — Photo Detail:** a single photo's full-size image and metadata, plus its only available management action (Section 7).

This is the visual-artifact counterpart to L-12/L-13's accomplishment-record pair, but with a narrower, more constrained contract — fewer create/edit/delete affordances, because less is evidenced as needed or wanted for photos than for accomplishments.

---

## Section 6 — L-15 Responsibilities

Resolved against "if supported by authority," per the task's own framing for each candidate responsibility:

- **Browse all photos** — yes. Flat list/grid, reverse-chronological by `dateAdded`, account-wide — directly reusing L-1's existing strip-ordering rule (*"most recently added photo first, regardless of which chapter it belongs to"*).
- **Filtering/grouping** — **not supported.** No locked document evidences chapter filtering, date filtering, or any grouping mechanism for photos anywhere. L-1's own strip explicitly doesn't group by chapter either. Smallest MVP omits it.
- **Empty states** — yes, required: a new athlete with zero photos needs a state (Section 9-style "silence is the correct empty state" convention, consistent with L-1's *"Section omitted entirely when the athlete has added zero photos. No label. No placeholder."* — extended to L-15 itself).
- **Photo count visibility** — **required, not optional.** This is the one piece of UI that P-8, M-7, and Monetization-Architecture-Amendment-001.md all already assume lives here: *"X of 50 photos"* (free) or *"X photos"* (premium).
- **Navigation into L-16** — yes, every photo row/thumbnail → L-16.
- **Add Photo CTA — not supported.** Not evidenced anywhere. The only confirmed creation surfaces are L-3 and L-4, both already chapter-scoped. Inventing an account-level "Add Photo" entry point on L-15 would require a chapter picker with zero authority behind it — the single most consequential "smallest MVP" call in this document. **L-15 is browse-only.**
- **No chapter labels on thumbnails** — same rule L-1 already applies to its own strip, extended consistently. Chapter context is deliberately reserved for L-16 (parallel to how L-12's list omits source-context while L-13's detail shows it).

---

## Section 7 — L-16 Responsibilities

- **Full-size image** — yes.
- **Photo metadata** — date (`dateAdded`).
- **Chapter relationship** — yes, shown here specifically because L-15 deliberately omits it. Includes a "View Chapter" link → L-3 (if the chapter is still active) or L-4 (if archived) — this preserves the context the old Risk-5 fallback used to provide, now reached one tap further rather than being the primary destination (Section 15).
- **Edit/Delete actions — narrower than the Accomplishments precedent, corrected after direct verification:**
  - **No edit**, for any photo. No editable field exists anywhere in the locked architecture (no caption, no chapter reassignment evidenced as needed).
  - **Delete is supported only for memory photos** (post-sealing, Add-Memory-flow additions — derivable via the same `dateAdded` vs. `sealedAt` comparison as Section 4). This is directly evidenced: *"Memory photos: removable"* (Chapter-Detail-Wireframe-Spec-L3-L4.md §17.3), and grounded in the same general principle the document states for why Reflections cannot be edited but Memories can: *"Memories are additions to the archive; the reflection is part of the archive itself"* (§11.2). An original photo — added while the chapter was still being built — becomes part of "the archive itself" once the chapter seals, exactly as Reflections do; it was never evidenced as deletable even before sealing (the active-chapter Photos section shows only `"Add Photo"`, no remove affordance at all). **Original photos, active or sealed, have no delete action in this architecture.**
- **No "Featured" toggle.** Unlike Accomplishments' P-1 top-3 (explicitly athlete-curated per P-1 §8.2), L-1's photo strip order is fully automatic (*"reverse chronological... regardless of chapter"*) — there is no curation mechanism for L-16 to support. This asymmetry is evidenced, not assumed.
- **Future expansion point** (not built now, per the task's own framing): captions/attachments, if a future amendment ever introduces them.

---

## Section 8 — Chapter Relationship Rules

Every photo belongs to exactly one chapter, set permanently at creation (Section 3's `chapterId`, non-nullable). No locked document evidences moving a photo between chapters, and none is introduced — unlike Accomplishments, where chapter reassignment was a real, named open question. For photos, the question was never raised by any source document, so silence is read as "not a feature," not as "an open gap."

Whether a photo is "original" or a "memory" is purely a function of its chapter's seal state at the time it was added (Section 4) — not a separate relationship.

---

## Section 9 — Timeline Relationship Rules

Already fully specified by Legacy-Timeline-Wireframe-Spec-L2.md §4 and not redesigned here: `"Photo Added · [Chapter Name]"`, always **chapter-section grouped**, never standalone — consistent with photos always being chapter-scoped (Section 3). This document adds only one clarification: deleting a memory photo (Section 7) has no retroactive effect on its existing L-2 timeline entry, applying the same generalized snapshot principle already established for Accomplishments (HonorInstance-Architecture-v1.0.md §5, AD-52). In practice this is lower-risk than the Accomplishments case: L-2's "Photo Added" entry is pure text (chapter name + date) — it never displays the image itself, so there is nothing image-shaped that could break on deletion.

---

## Section 10 — FLM Relationship Rules

Already fully specified by Featured-Legacy-Moment-Standards.md and not redesigned here: "Photo Added" is Tier 5, Priority 9 — the lowest tier, *"a routine action, not a transformation."* No active window; it serves only as a full-history fallback when no Tier 1–4 event exists in the past 30 days. Confirmed directly: multiple photos added in the same session are **not aggregated** into a single FLM event — each is an independent Tier 5 candidate. No manual "feature this for FLM" flag exists or is needed; every photo automatically qualifies on creation, the same automatic-eligibility pattern already established for Accomplishments. Deleting a memory photo has no retroactive effect on a past FLM selection — that selection is a historical fact, not a live query (same reasoning as Section 9).

---

## Section 11 — Profile Relationship Rules

**No relationship exists.** Verified directly: Profile-Wireframe-Spec-P1.md shows only the identity profile photo (88dp circle, tappable → P-2 Edit Profile) — no gallery, no photo count, no CTA, and no reference to L-15 or Legacy photos anywhere in that document. This rules out a possible assumption cleanly rather than leaving it ambiguous.

---

## Section 12 — Monetization Relationship Rules

Reused verbatim, not redesigned:

- **50-photo free limit, account-wide, not per-chapter** (Critical-Decisions-Amendment-001.md Decision 3): *"The per-chapter photo counter in L-3/L-4... shows how many photos are in that chapter as a display value only. It does not create a per-chapter limit. Limit enforcement occurs at account level."* L-15's counter is the canonical, enforcement-tied display; L-3/L-4's per-chapter counters remain local, display-only values — this document does not change that distinction, only states it clearly for L-15's benefit.
- **M-7 fires on the 51st attempt from any surface** (chapter detail, L-15, or equivalent) — but since L-15 has no Add-Photo CTA (Section 6), reaching the limit has **zero effect on L-15's own UI**. The limit only ever matters at L-3/L-4's add flows, both already owned elsewhere.
- **Never Charge For History:** downgrade never deletes a photo; it only blocks new additions while over the limit. All existing photos — original or memory — remain visible on L-15/L-16 forever, regardless of tier.

---

## Section 13 — Create/Edit/Delete Rules

| Action | Original photo (active chapter) | Original photo (sealed chapter) | Memory photo (post-sealing) |
|---|---|---|---|
| Create | Via L-3 "Add Photo" (not redesigned here) | Not applicable — chapter no longer accepts direct photo additions | Via L-4 "Add a Memory" flow (not redesigned here) |
| Edit | Not supported | Not supported | Not supported |
| Delete | **Not supported** — no remove affordance evidenced anywhere for this state | **Not supported** — part of "the archive itself" once sealed | **Supported**, confirmation-gated — directly evidenced (*"Memory photos: removable"*) |
| Move to another chapter | Not supported, not evidenced | Not supported, not evidenced | Not supported, not evidenced |

This table is the corrected version of an earlier draft assumption (delete uniformly available for all photos) — see Section 7 for the full reasoning, prompted by direct verification against Chapter-Detail-Wireframe-Spec-L3-L4.md rather than assumed-by-consistency with the Accomplishments precedent.

---

## Section 14 — Visibility Rules

**No squad-visibility surface for Legacy photos exists, and none is introduced.** Verified directly: Squad-Detail-Wireframe-Spec-S2.md's Limited Athlete Profile explicitly excludes "progress photos" from its field list — squadmates see only the member's identity profile photo, never chapter/Legacy photos. This is a real, verified asymmetry against Accomplishments (which do appear on the Limited Athlete Profile's top-3) — not an oversight in this document, but a confirmed property of the existing locked architecture.

No per-photo privacy toggle exists or is introduced — there is nothing to toggle, since no visibility surface exists in the first place.

---

## Section 15 — Navigation Model

| From | Action | To |
|---|---|---|
| L-1 | "View All [N] Photos ›" | L-15 |
| L-1 | Tap a strip thumbnail | **Updated from L-1's current documented fallback.** Risk 5 names the L-4 chapter-fallback as an explicit *"MVP fallback"* pending a dedicated photo detail screen. Now that L-16 exists at the architecture level, the intended destination is **L-16** directly — L-1's own body text is not edited by this document (citation-only, same discipline used for Accomplishments-Architecture-Note.md's stale L-12 labeling), but is flagged in Section 16 for the next update pass. |
| L-15 | Tap a photo | L-16 |
| L-16 | "View Chapter" | L-3 (active) or L-4 (archived) — whichever currently owns the photo |
| L-16 | "Delete" (memory photos only) → confirm | L-15 |
| L-3 | "Add Photo" | Creates a photo; no screen transition to L-15/L-16 (already locked, not redesigned) |
| L-4 | "Add a Memory" | Creates a (possible) photo; no screen transition to L-15/L-16 (already locked, not redesigned) |

P-8 reads the photo count as a shared data source, not a navigation link — no P-8 → L-15 navigation edge exists or is introduced.

---

## Section 16 — Open Questions

Carried forward, non-blocking:

1. **FORGE_LEGACY_PRD.md's "Add photos without an active chapter" line** (Section 3) — resolved against the more specific, locked L-3/L-4 and FLM Standards evidence. Flagged for the project's existing documentation-lag cleanup backlog, alongside the other PRD/wireframe staleness findings already tracked in Global-Architecture-Status-Audit.md §7.
2. **The Memory-vs-Photo entity boundary** (Section 4) — whether a Memory-flow photo addition fires one timeline event or two (Memory Added and/or Photo Added) is explicitly left to Chapter Architecture/L-6. This document only needed to define the Photo entity's own shape, which does not depend on that answer.
3. **L-1's stale Risk 5 language** (Section 15) — once a wireframe spec for L-15/L-16 exists, L-1's own Risk 5 text and thumbnail-tap-target documentation should be updated to reflect the new L-16 destination. Not performed here, same deferral pattern as L-12's Risk 4.

None of these block locking this architecture or authoring the next wireframe spec.

---

## Section 17 — Recommendation For Wireframe Spec

Author **Docs/Photos-Wireframe-Spec-L15-L16.md** next (same paired-screen convention as Chapter-Detail-Wireframe-Spec-L3-L4.md and Accomplishments-Wireframe-Spec-L12-L14.md). This document resolves ownership, data model, the chapter-scoping question, the corrected mutability table, and every navigation edge — the wireframe spec is layout work (grid dimensions, thumbnail sizing, push vs. modal for L-16, exact empty-state copy) against a fixed contract, not open design space.

**Final Question:** Per the Global Architecture Status Audit, L-15/L-16 was the *sole* remaining Priority 1 MVP gap project-wide. Once this architecture locks, **Priority 1 is fully cleared.** What remains: Priority 2 (the narrow W3-A1/W9-A1 integration amendments, unrelated to Photos) and Priority 3 (the consolidated documentation-lag cleanup pass, which will grow by one more item — L-1's Risk 5 — once a wireframe spec also exists). The wireframe spec itself is the one concrete remaining step before Legacy/Photos is fully implementation-ready — exactly parallel to where L-12 stood after its architecture document alone.

---

## Validation Checklist

### Ownership & Data Model
- [ ] `chapterId` is non-nullable — no account-level photo case introduced
- [ ] No new caption/note/type field introduced
- [ ] Original-vs-memory distinction derived from `dateAdded` vs. chapter `sealedAt`, no redundant flag

### L-15
- [ ] No Add Photo CTA
- [ ] No filtering/grouping
- [ ] Photo counter ("X of 50" / "X photos") present and required
- [ ] Reverse-chronological order, account-wide, no chapter labels

### L-16
- [ ] No edit action for any photo
- [ ] Delete action present only for memory photos
- [ ] No delete action for original photos (active or sealed chapter)
- [ ] "View Chapter" link present, routes to L-3 or L-4 correctly
- [ ] No "Featured" toggle

### Cross-Cutting
- [ ] No relationship to P-1 introduced
- [ ] No squad-visibility surface introduced
- [ ] Monetization limit reused verbatim (account-wide, 50, enforced via L-15 counter + M-7)
- [ ] Deleting a memory photo does not alter its L-2 timeline entry or any past FLM selection

---

## Non-Behaviors

- **No account-level (chapter-less) photo creation** — every photo is chapter-scoped at creation.
- **No Add Photo CTA on L-15** — creation remains exclusively at L-3/L-4.
- **No edit of any photo field** — no caption, no chapter reassignment.
- **No delete of original photos** — only memory photos are removable.
- **No move-between-chapters** for any photo.
- **No filtering, grouping, or sorting control** on L-15 beyond the fixed reverse-chronological order.
- **No "Featured" or curation mechanism** for photos.
- **No squad-visibility surface, no per-photo privacy toggle.**
- **No change to L-1, L-2, L-3/L-4, FLM Standards, Monetization Amendment, or Critical Decisions Amendment 001** — all cited as authority, never redesigned.

---

## Open Issues

**None blocking.** See Section 16 for non-blocking items explicitly deferred to the wireframe-spec stage or the existing documentation-lag cleanup backlog.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. |

---

*L-15 / L-16 Photos — Architecture*
*June 2026*
*Authority: Legacy-Hub-Wireframe-Spec-L1.md (LOCKED), Legacy-Timeline-Wireframe-Spec-L2.md (LOCKED), Chapter-Detail-Wireframe-Spec-L3-L4.md (LOCKED), Featured-Legacy-Moment-Standards.md (LOCKED), Monetization-Architecture-Amendment-001.md (LOCKED), Critical-Decisions-Amendment-001.md (LOCKED), M-7-Premium-Upsell-Spec.md (LOCKED), HonorInstance-Architecture-v1.0.md (LOCKED)*
*Status: LOCKED*
