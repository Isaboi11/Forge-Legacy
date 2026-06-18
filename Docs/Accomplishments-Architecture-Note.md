# Accomplishments System — Architecture Note
## v1.0 — June 2026

**Status:** Locked
**Type:** Architecture Note (not a wireframe spec)
**Authority:** O-2 First-Time Setup Wireframe Spec v1.0, P-1 Profile Wireframe Spec v1.0

---

## Purpose

This note establishes the core data model requirement for the Accomplishments system: accomplishments must support two distinct contexts — account-level and chapter-level.

This distinction was identified during O-2 specification. O-2e (Prior Accomplishments, Path B) creates accomplishments outside any chapter context — before the athlete has created any chapter. The data model must accommodate this.

---

## The Two Accomplishment Contexts

### Account-Level Accomplishments

Accomplishments created outside any chapter context. The athlete's prior history, established before any chapter exists in Forge Legacy.

**Created by:**
- O-2e Prior Accomplishments — freeform text entries added during first-time setup (Path B only)

**Characteristics:**
- No chapter association
- Created during onboarding, before any chapter has been created
- Represent what the athlete has built before using Forge Legacy
- Displayed on P-1 (Profile) in the Accomplishments section
- Accessible via L-12 (Accomplishments Detail)
- First-class accomplishment records — not secondary to chapter-level accomplishments

### Chapter-Level Accomplishments

Accomplishments created within the context of a specific chapter.

**Created by:**
- Within an active chapter's lifecycle (creation path defined in the L-12 spec or chapter spec — not yet finalized)

**Characteristics:**
- Associated with a specific chapter
- Displayed on P-1 (Profile) in the Accomplishments section alongside account-level accomplishments
- Accessible via L-12 (Accomplishments Detail)
- First-class accomplishment records — not secondary to account-level accomplishments

---

## Data Model Requirement

The Accomplishments data model must support records with no chapter association.

A `chapterId` field (or equivalent) must be nullable/optional:
- `chapterId: null` → account-level accomplishment (created outside any chapter)
- `chapterId: [id]` → chapter-level accomplishment (associated with a specific chapter)

Both are valid, complete accomplishment records. Neither type is a degraded or secondary form.

---

## Display Behavior

The Accomplishments section on P-1 and in L-12 displays all accomplishments — account-level and chapter-level — without visual differentiation by source context. The athlete's prior history (account-level) and achievements within chapters (chapter-level) are unified in a single list.

Display order: most recent first, by creation date in Forge Legacy — not by any historical date described in the entry text. An athlete who writes "Ran my first marathon in 2022" as an O-2e entry will see that entry sorted by the date they added it to Forge Legacy.

---

## What This Note Does Not Specify

- The UI for creating chapter-level accomplishments (deferred to L-12 spec)
- Whether accomplishment records can be associated with multiple chapters
- Whether records can be moved between chapter contexts post-creation
- Accomplishment privacy or visibility controls
- Any V1.1+ features (achievement linking, milestone tagging, photo attachments, etc.)

---

*Accomplishments System Architecture Note — v1.0 — June 2026*
*Authority: O-2 First-Time Setup Spec v1.0, P-1 Profile Spec v1.0*
