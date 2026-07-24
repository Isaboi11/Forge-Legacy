# Transformation Gallery — Architecture

## v1.0 — 2026-07-02

**Status:** LOCKED (stakeholder-directed — see Authority)

**Type:** Architecture Document (not a wireframe spec — no layout, no push-vs-modal, no grid/thumbnail sizing; all deferred to the wireframe-spec stage, `Transformation-Gallery-Wireframe-Spec-L17-L18.md`)

**Date:** 2026-07-02

**Implements:** A new Legacy feature, added per direct stakeholder direction: "Transformation Gallery preserves the athlete's physical transformation as part of their Legacy... a permanent visual record of personal growth across Chapters." Screens **L-17 (Transformation Gallery)** and **L-18 (Transformation Entry Detail)** are reserved for it.

**Authority Chain:**
- Direct stakeholder direction, 2026-07-02 — the originating authority for this entire feature; no prior locked document specced it.
- `Legacy-Hub-Wireframe-Spec-L1.md` (v1.1) §8a — the new L-1 entry point (preview strip + "View All" footer) this architecture must support.
- `L-15-Photos-Architecture.md` (LOCKED) — the closest existing precedent (a chapter-scoped, chronological visual-artifact archive). This document reuses its ownership, chapter-scoping, and mutability reasoning wherever the two features are structurally identical, and diverges explicitly and only where the stakeholder's design intent requires it (caption/reflection field, video support, tagging, chapter cover media).
- `Chapter-Detail-Wireframe-Spec-L3-L4.md` (LOCKED) — the "Memories are additions to the archive; the reflection is part of the archive itself" mutability principle, reused here identically.
- `M-5-Chapter-Sealing-Confirmation-Spec.md` (LOCKED) — the `sealedAt` timestamp this document's original-vs-memory distinction is derived from.
- `Component-Library-Architecture-v1.0.md` — CLA-C36 (PhotoThumbnail), reused for gallery thumbnails; no new Tier 1/2 primitive is introduced.
- Product DNA (`FORGE_LEGACY_PRODUCT_DNA.md`) §4/§10 — the binding "no social network, no public feed, no comparison" constraints this document applies to physical-transformation media specifically.

**Downstream Dependents:** `Transformation-Gallery-Wireframe-Spec-L17-L18.md` (companion wireframe spec, authored alongside this document); `Legacy-Hub-Wireframe-Spec-L1.md` (already updated, §8a); `Photos-Wireframe-Spec-L15-L16.md` (cross-reference note added, differentiating the two features).

**Amendment Log:** Initial. v1.0 LOCKED, 2026-07-02.

---

## Section 1 — Why This Document Exists

No locked architecture document specced a Transformation Gallery before this pass. The stakeholder direction that created it was explicit about intent and constraints (documentary, chapter-organized, no social mechanics, photo **and** video) but did not specify a data model, mutability rules, or screen contract. This document supplies those, reusing the closest existing precedent — `L-15-Photos-Architecture.md` — wherever the two features are structurally identical, and making explicit, justified decisions only where the stakeholder's brief requires new ground (video, tagging, captions, chapter cover media).

**What Transformation Gallery is not:** it is not a second Photos gallery (L-15/16), and it is not a social/fitness-progress-sharing feed. See Section 2 for the precise differentiation, and Section 10 for the binding non-social constraints.

---

## Section 2 — Differentiation from Photos (L-15/L-16)

| | Photos (L-15/L-16) | Transformation Gallery (L-17/L-18) |
|---|---|---|
| **Purpose** | General visual record of training life — any photo from any session or chapter moment | Specifically documents physical transformation — before/progress/after, physique check-ins, posing/competition/milestone videos |
| **Media types** | Photo only | Photo **and** video |
| **Caption/reflection** | None (no locked document evidences one) | Optional, supported by design intent — see TG-D4 |
| **Tags** | None | Optional, fixed taxonomy — see TG-D3 |
| **Ordering (within a chapter)** | Reverse-chronological only | Oldest → newest within a chapter, to read as a before→after story — see TG-D5 |
| **Chapter cover media** | Not a concept in Photos | Supported (reserved field) — see TG-D6 |
| **Editability** | Never editable | Title/caption/tags editable pre-seal — see TG-D9/TG-D10 |
| **Delete rule** | Memory (post-seal) photos removable; original (pre-seal) photos permanent | Identical rule, reused — see TG-D9 |
| **Social/comparison mechanics** | None | None (identical, binding — see Section 10) |

Both features share the same underlying philosophy (a private, chapter-scoped, chronological archive, never a social surface) and reuse the same component (`PhotoThumbnail`, CLA-C36) for their thumbnail grids. They are **siblings within the Legacy ecosystem, not one feature superseding the other** — an athlete may use either or both independently. A photo used generally (e.g., a training-session snapshot) belongs in Photos; a photo or video specifically documenting physical change belongs in Transformation Gallery. Nothing in this architecture requires an athlete to duplicate content between the two.

---

## Section 3 — Data Model

### TG-D1 — Entity & Chapter Association

**Locked.** A `TransformationEntry` is athlete-owned and **chapter-scoped, `chapterId` non-nullable** — identical reasoning to `L-15-Photos-Architecture.md` §3: every confirmed creation path in this architecture is chapter-scoped (Section 5), and Onboarding's silent Chapter I creation (`Onboarding-First-Time-Journey-Architecture-v1.0.md` ONB-D14) means an athlete always has a chapter available to associate an entry with by the time they could reach L-17.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | System-generated |
| `athleteId` | uuid (FK) | Owner |
| `chapterId` | uuid (FK), **non-nullable** | The chapter this entry belongs to, set permanently at creation |
| `mediaType` | enum `{ PHOTO, VIDEO }` | See TG-D2 |
| `mediaRef` | string (storage ref) | The photo image or video file |
| `thumbnailRef` | string (storage ref) | **Required for `VIDEO`**, optional (derivable) for `PHOTO` — same still-frame-thumbnail pattern already established for exercise video media (`Exercise-Media-Architecture-v1.0.md`) |
| `title` | string, optional, ≤60 chars | See TG-D4 |
| `caption` | string, optional, ≤300 chars | See TG-D4 — labeled "caption/reflection" in UI copy |
| `tags` | enum array, optional, 0+ values from the closed set in TG-D3 | |
| `isChapterCover` | boolean, default `false` | See TG-D6 — reserved field |
| `dateAdded` | timestamp | Forge Legacy creation timestamp — drives ordering (TG-D5) and the original-vs-memory distinction (TG-D9) |

### TG-D2 — Media Type

**Locked.** `mediaType` is a closed enum: `PHOTO` or `VIDEO`. A single entry is one media item, never a mixed photo+video pair and never a multi-photo set — this keeps the entity identical in shape to a Photos-style single-image record, extended by exactly one dimension (type), rather than introducing a compound "album" concept that no part of the stakeholder brief asked for. An athlete documenting a "before/progress/after" story creates **three separate entries**, ordered chronologically by `dateAdded` (TG-D5) — the "before/progress/after" relationship is expressed by chronology and, optionally, tags, not by a new grouping entity.

### TG-D3 — Tag Taxonomy

**Locked.** A fixed, closed taxonomy of six tags, directly derived from the media purposes named in the stakeholder brief: **Front, Side, Back, Posing, Competition, Milestone.** Zero or more tags per entry (an untagged progress photo is valid — tags are a discovery/organization aid, not a requirement). No free-text/custom tags in V1 — consistent with the product's general preference for closed taxonomies over open-ended athlete-authored categories (compare `ExerciseCategory`, `MuscleGroup`, difficulty enums, none of which allow custom values).

"Physique check-in," "posing video," "competition video," and "milestone video" from the stakeholder brief are treated as **use cases satisfied by this tag set**, not as additional distinct entry types — a physique check-in is simply an entry tagged Front/Side/Back; a posing video is `mediaType: VIDEO` tagged Posing; and so on. This avoids inventing a parallel type system alongside `mediaType` for no structural benefit.

### TG-D4 — Optional Title and Caption/Reflection

**Locked (a deliberate divergence from Photos).** Unlike `L-15-Photos-Architecture.md` §4 ("no caption/note field... no locked document evidences one"), Transformation Gallery entries **do** support an optional `title` (≤60 chars) and an optional `caption` (≤300 chars, the same length cap already established for custom-exercise notes and squad share messages elsewhere in the product). This divergence is justified directly by the stakeholder brief's own framing: Transformation Gallery is explicitly "used for reflection and documentation" — a documentary register that photos-in-general are not asked to carry. The caption is labeled "caption/reflection" in the UI (see wireframe spec) to signal this reflective register, distinct from a social-media-style caption.

### TG-D5 — Chronological Organization

**Locked.** Two distinct ordering rules apply, each serving a different purpose:
- **Within a chapter (L-17's chapter-grouped view):** entries are ordered **oldest → newest**, so a chapter's transformation reads as a story with a beginning and an end — the opposite of Photos' reverse-chronological convention, and a deliberate choice justified by the feature's own "before/progress/after" purpose.
- **Across chapters (which chapter-group appears first):** chapters are ordered **most-recently-sealed-or-active first**, reusing the same convention already locked for L-1's Chapter History section (`FLM/Sealed-Chapter-Amendment-001`) and for L-2's Legacy Timeline — active chapter's group first, then sealed chapters newest-sealed-first.
- **L-1's preview strip** (§8a) uses simple reverse-chronological-by-`dateAdded`, account-wide, matching the Photos strip's existing convention exactly — the story-ordering behavior above is specific to the full L-17 gallery, not the compact L-1 preview.

### TG-D6 — Chapter Cover Media (reserved field, display integration deferred)

**Locked at the schema level; deferred at the display level.** `isChapterCover` exists on `TransformationEntry` so a chapter can designate one entry (photo or video) as its representative cover media — the stakeholder brief lists "Chapter cover media" as a supported concept. **At most one entry per chapter may have `isChapterCover: true`** — setting a new cover for a chapter automatically unsets the previous one (same single-occupancy pattern already used for Chapter History's State A card, `FLM/Sealed-Chapter-Amendment-001`).

**Explicitly deferred, not built in this pass:** where chapter cover media actually renders (e.g., as a header image on `Chapter-Detail-Wireframe-Spec-L3-L4.md`'s L-3/L-4, or as a thumbnail on L-1's Chapter Card) requires a reconciliation amendment against those already-locked, high-traffic documents, which this pass does not perform. The field is reserved and settable from L-18 (see wireframe spec) so the data exists once that display integration is authored — consistent with how `Exercise-Media-Architecture-v1.0.md` reserved `muscleTargetImageUrl` ahead of its own display integration.

---

## Section 4 — Ownership, Visibility, and the Performance Firewall

### TG-D7 — No Social or Comparison Mechanics (binding)

**Locked.** Transformation Gallery carries **zero** social or engagement mechanics, without exception: no likes, no comments, no public or squad-visible feed, no view counts, no follower/audience concept, no leaderboard, no ranking, no comparison between athletes, and no shame/gamification language of any kind (no "streak" of check-ins, no "days since your last photo"). This is not a narrower version of an existing rule — it is the same binding constraint Product DNA §4/§10 already applies product-wide (no social network, no public feed, no like/comment/follower systems), stated explicitly here because physical-transformation media is exactly the category of content most likely to invite comparison mechanics in a conventional fitness app, and Forge Legacy explicitly rejects that pattern for it.

### TG-D8 — Visibility

**Locked.** Private by default, account-owned only — identical to Photos (`L-15-Photos-Architecture.md` §14, which confirmed no squad-visibility surface exists for Legacy photos). No per-entry privacy toggle exists or is introduced, since no visibility surface exists in the first place. Transformation Gallery entries are **not** eligible for external sharing via `WSR-001` (Workout Share Result) or `Share-Configuration-Step-Wireframe-Spec-SH1.md` (SH-1) — those surfaces share workout-session outcomes, not Legacy archive media, and extending them is out of scope for this document.

---

## Section 5 — Create / Edit / Delete Rules

### TG-D9 — Mutability (reuses the Photos precedent exactly)

**Locked.** The original-vs-memory distinction and its mutability consequences are derived identically to `L-15-Photos-Architecture.md` §4/§7/§13, by comparing an entry's `dateAdded` to its chapter's `sealedAt` timestamp — no redundant boolean flag is introduced:

| Action | Entry added while chapter Active (original) | Entry added to a sealed chapter (memory) |
|---|---|---|
| Create | Via L-17 "+ Add Entry" while the chapter is Active | Via the same post-sealing "Add a Memory"-style flow already established for L-4 (Chapter-Detail-Wireframe-Spec-L3-L4.md) |
| Edit title/caption/tags | Supported, until the chapter seals — see TG-D10 | Not supported — fixed at creation, consistent with other single-shot memory additions |
| Delete | **Not supported once the chapter seals** — becomes part of "the archive itself" | **Supported**, confirmation-gated (M-6 pattern) |
| Replace media file | **Never supported**, for any entry — the visual record itself is immutable once created (History Cannot Be Rewritten) |

### TG-D10 — Edit Window for Title/Caption/Tags

**Locked (new, since Photos has no editable fields to set precedent for).** For an original (pre-seal) entry, `title`/`caption`/`tags` remain editable only while its chapter is still Active — the same boundary Chapter Reflection (L-6) uses ("permanently locked once submitted"). Once the chapter seals, all fields on every entry in it are permanently fixed, including `isChapterCover`. This keeps Transformation Gallery consistent with the product-wide "History Cannot Be Rewritten" guardrail while still allowing an athlete to refine a caption or add a tag they forgot, in the ordinary course of an still-open chapter.

---

## Section 6 — Relationship to Other Systems

- **Legacy Timeline (L-2):** Not integrated in this pass. A future amendment may add a "Transformation Entry Added" event type, mirroring L-2's existing "Photo Added" event (`Legacy-Timeline-Wireframe-Spec-L2.md` §4) — left as an explicit open item (Section 8) rather than invented here, since the stakeholder brief did not request it.
- **Featured Legacy Moment (FLM):** Not integrated in this pass, for the same reason — `Featured-Legacy-Moment-Standards.md`'s tier/priority table is not amended here. Left as an open item.
- **Honors:** No new honor family is introduced for Transformation Gallery usage. Nothing in the stakeholder brief requested one, and inventing one would violate this project's "do not invent new honors" constraint.
- **Monetization:** No new free-tier limit is introduced by this document. Whether Transformation Gallery entries count toward the existing 50-photo free-tier limit (`Monetization-Architecture-Amendment-001.md`) or require a new, separate limit is an open question (Section 8) — not resolved here, since the stakeholder brief did not specify it and inventing a number would be a genuine product decision, not an architectural inference.
- **Profile (P-1):** No relationship — identical finding to Photos (`L-15-Photos-Architecture.md` §11). P-1's identity photo is unrelated.
- **Squads:** No relationship, no visibility surface — see TG-D8.

---

## Section 7 — Non-Behaviors

- No likes, comments, public/squad feed, view counts, follower concept, leaderboard, ranking, or cross-athlete comparison of any kind (TG-D7).
- No external sharing via WSR-001/SH-1.
- No multi-media "album" entity — one entry is one photo or one video (TG-D2).
- No custom/free-text tags — closed taxonomy only (TG-D3).
- No edit of any field after a chapter seals, and no media-file replacement ever, for any entry (TG-D9/TG-D10).
- No move-between-chapters for any entry.
- No new Honor family, no new Featured Legacy Moment event type, no new monetization limit — all left as explicit open items (Section 8), not invented.
- No squad-visibility surface, no per-entry privacy toggle (TG-D8).
- No change to Photos (L-15/L-16), Chapter Detail (L-3/L-4), Legacy Hub (L-1, beyond its own already-applied §8a addition), or any other existing locked document beyond the explicit cross-reference note added to `Photos-Wireframe-Spec-L15-L16.md`.

---

## Section 8 — Open Questions

Carried forward, non-blocking:

1. **Monetization limit.** Whether Transformation Gallery entries share the existing 50-photo free-tier cap, get their own separate cap, or are uncapped is not decided here — requires explicit stakeholder/PO direction, same as any other monetization boundary.
2. **Legacy Timeline / FLM integration.** Whether a "Transformation Entry Added" event should appear on L-2 or be FLM-eligible is left open (Section 6) — the feature is fully functional without either.
3. **Chapter cover media display integration.** TG-D6 reserves the field; where and how it actually renders on L-3/L-4 or L-1 requires a future reconciliation amendment against those documents, not performed here.
4. **Video duration/file-size limits.** Not specified by the stakeholder brief; left to a future technical/production standard, analogous to how `Exercise-Media-Architecture-v1.0.md` separately governs production standards for exercise media.

None of these block locking this architecture or authoring the companion wireframe spec.

---

## Section 9 — Recommendation for Wireframe Spec

Author `Transformation-Gallery-Wireframe-Spec-L17-L18.md` alongside this document (done — see companion file). Screen contract: **L-17 = Transformation Gallery** (chapter-grouped, chronological browse + entry creation), **L-18 = Transformation Entry Detail** (documentary single-entry view + edit/delete, subject to TG-D9/TG-D10's mutability window).

---

## Validation Checklist

### Data Model
- [ ] `chapterId` non-nullable — every entry chapter-scoped
- [ ] `mediaType` closed enum `{PHOTO, VIDEO}`; one media item per entry, no album entity
- [ ] `tags` closed six-value taxonomy (Front, Side, Back, Posing, Competition, Milestone), 0+ per entry, no custom tags
- [ ] `title`/`caption` optional, capped lengths, editable only pre-seal
- [ ] `isChapterCover` reserved, single-occupancy per chapter, display integration explicitly deferred

### Mutability
- [ ] Original (pre-seal) entries: editable until seal, then permanently locked, never deletable once sealed
- [ ] Memory (post-seal) entries: fixed at creation, deletable with confirmation
- [ ] Media file itself never replaceable, for any entry, ever

### Non-Social Constraints
- [ ] No likes, comments, feed, view counts, comparison, ranking, or leaderboard anywhere in the feature
- [ ] No external sharing via WSR-001/SH-1
- [ ] No squad-visibility surface, no per-entry privacy toggle

### Cross-Cutting
- [ ] No new Honor family, FLM event type, or monetization limit invented
- [ ] No relationship to P-1 introduced
- [ ] No change to any existing locked document beyond the L-1 §8a addition and the Photos cross-reference note

---

*Transformation Gallery — Architecture*
*v1.0 — 2026-07-02*
*Authority: Direct stakeholder direction, 2026-07-02; Legacy-Hub-Wireframe-Spec-L1.md (v1.1); L-15-Photos-Architecture.md (LOCKED, structural precedent); Chapter-Detail-Wireframe-Spec-L3-L4.md (LOCKED); M-5-Chapter-Sealing-Confirmation-Spec.md (LOCKED); Component-Library-Architecture-v1.0.md; FORGE_LEGACY_PRODUCT_DNA.md*
*Status: LOCKED*
