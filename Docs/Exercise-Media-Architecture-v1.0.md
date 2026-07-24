# Forge Legacy — Exercise Media Architecture & Production Standards
## Version 1.1 | June 2026

**Status:** LOCKED
**Authority:** `Exercise-Library-Architecture-v1.0.md` §2.1 (LOCKED), `Exercise-Detail-Wireframe-Spec-W22.md` §4–6 (LOCKED), `Exercise-001-Custom-Exercise-Architecture.md` §5.1 (LOCKED), `Anchor-Exercise-Authoring-Framework-v1.0.md` (LOCKED — text-standards predecessor)
**Downstream impact:** `Exercise-Library-Architecture-v1.0.md` (→ v1.2), `Exercise-Detail-Wireframe-Spec-W22.md` (→ v1.0 R2), `Exercise-001-Custom-Exercise-Architecture.md` (→ v1.0 Media Field Reconciliation), `W-28-Create-Edit-Custom-Exercise.md` (→ v1.0 Media Field Reconciliation), `Anchor-Exercise-Authoring-Framework-v1.0.md` (→ v1.0 Media Cross-Reference)

---

## Section 1 — Purpose and Scope

This document is the canonical authority for:

1. The media- and anatomy-related fields on `ExerciseDefinition`
2. Production standards for every media and anatomy asset type
3. File naming and CDN/storage organization
4. Fallback behavior when an asset is not yet produced
5. The validation/QC checklist a future media production pass must satisfy

It does **not**:
- Produce, source, or assign any actual media or anatomy asset — every exercise's relevant fields remain `null` after this document is authored
- Change any exercise name, taxonomy, muscle assignment, difficulty, or narrative content
- Change any LOCKED *behavioral* spec already governing the existing Media block — GIF-primary format, autoplay-only-in-W-22, and the `gif → video → image → placeholder` fallback chain are unchanged. This document adds standards for *how those assets are produced*, not *what they mean to the schema or UI*.

This document fulfills the "adjacent open item" `Anchor-Exercise-Authoring-Framework-v1.0.md` §7 explicitly flagged as out of its own scope: "Media production (GIF/video capture and pipeline) is an adjacent open item this framework deliberately does not address (text standards only, per scope)."

**A note on a pre-existing, unrelated documentation gap.** Several wireframes (`Exercise-Detail-Wireframe-Spec-W22.md`, `Activity-Detail-Wireframe-Spec-W19.md`, `Exercise-Picker-Wireframe-Spec-W23.md`, `Workout-Builder-Wireframe-Spec-W24.md`, `Workout-Template-Detail-Spec-W27.md`) cite an "Exercise Domain Architecture v1.0" with decision codes "ED-1–ED-6" and W-22 specifically cites "Architecture §4.3 (Media Model)" as authority for its GIF-autoplay behavior. No file by that name exists in this repository, and `Exercise-Library-Architecture-v1.0.md` — the document that is clearly its successor — has no ED-x decision codes and no §4.3 "Media Model" section; its media field block lives in §2.1 with no dedicated subsection number. This is a discovered, pre-existing citation-drift issue. **It is out of scope for this document to repair.** All citations in this document and its companion amendments reference real, current section numbers only — no retroactive "ED-x" code is invented here.

---

## Section 2 — Schema Reconciliation

### 2.1 New Schema Group: Exercise Anatomy

A new field, `muscleTargetImageUrl`, is added to `ExerciseDefinition` as its **own schema group — "Exercise Anatomy" — kept deliberately separate from the existing Media block**:

```
ExerciseDefinition {
  ...
  // Media
  gifUrl:                   string | null
  gifThumbnailUrl:          string | null
  videoUrl:                 string | null
  imageUrl:                 string | null

  // Exercise Anatomy
  muscleTargetImageUrl:     string | null   // bespoke per-exercise muscle diagram; see §3.3
  ...
}
```

| Property | Value |
|---|---|
| Type | `string \| null` (URL, same convention as the Media block fields) |
| FORGE semantics | Required before `isActive: true` — added to the existing required-content gate alongside the GIF/video requirement |
| CUSTOM semantics | Optional. Athlete-supplied or null — identical pattern to `gifUrl`/`videoUrl`/`imageUrl` |
| Default | `null` |
| Uniqueness | Bespoke per exercise — not a shared/keyed-by-muscle-combination asset (§3.3) |

**Why a separate schema group instead of extending Media.** A muscle target image is an educational anatomical diagram, not a demonstration of the exercise being performed — it answers "what does this train?" rather than "what does this look like?" Grouping it under "Exercise Anatomy" rather than folding it into "Media" keeps that distinction visible in the schema itself, and leaves room for future anatomy-related fields (e.g., a secondary-angle diagram, a muscle-activation-intensity variant) without overloading or renaming the Media block.

### 2.2 Confirmation: the Existing Media Block Is Unchanged

`gifUrl`, `gifThumbnailUrl`, `videoUrl`, `imageUrl` retain their exact current type, requiredness semantics, and fallback-chain role (`gif → video → image → name-initial placeholder`, per `Exercise-Library-Architecture-v1.0.md` §2.1 and `Exercise-Detail-Wireframe-Spec-W22.md` §5.3). This document adds production standards for them; it does not alter their schema meaning or UI behavior.

### 2.3 Why Bespoke, Not Shared-by-Muscle-Combination

Each of the 200 exercises gets its own unique `muscleTargetImageUrl` asset — two exercises with identical `primaryMuscles`/`secondaryMuscles` sets still get two distinct image files. Pose, equipment context, and movement plane differ even when the muscle combination is identical (e.g., a standing vs. seated exercise hitting the same muscle group still needs a distinct depiction), and a shared-asset model would create a many-to-one mapping that breaks the one-file-per-exercise convention the other media fields already use.

---

## Section 3 — Production Standards

### 3.1 Looping Animation Asset (GIF — Primary Format)

| Spec | Standard |
|---|---|
| Format | Animated GIF (primary/required format) |
| Resolution | 1080×1080px source, exported at minimum 720×720px |
| Aspect ratio | 16:9, matching W-22 §5.2's locked full-width edge-to-edge hero presentation — no letterboxing, no pillarboxing |
| Duration | 2–4 seconds per loop cycle (one full repetition of the movement) |
| Frame rate | 24–30fps |
| File size ceiling | 3MB per GIF |
| **Loop start/end requirement (mandatory)** | **Every looping animation must begin and end in the same neutral stance.** This is the concrete production rule that guarantees a seamless loop — W-22 §5.1 autoplays this asset continuously and unattended with zero playback controls, so any visible jump-cut between the final and first frame is permanently on-screen for as long as the athlete views the exercise. Starting and ending on an identical neutral stance (not mid-rep, not a rest position distinct from the starting position) is the requirement that makes the loop genuinely seamless rather than merely short. |
| Codec | Standard GIF89a (LZW) |
| Background | Solid, consistent studio background across all 200 exercises |
| Lighting/framing | Subject centered; consistent camera distance/framing ratio across exercises of the same equipment class; even, shadow-minimized lighting |
| `gifThumbnailUrl` | A single static frame extracted from the GIF — must be visually representative of the midpoint or peak-contraction frame, not the neutral start/end stance, so the thumbnail alone communicates the movement |

### 3.2 Fallback Siblings — `videoUrl` and `imageUrl`

These are produced only when GIF capture is unavailable or insufficient for a given exercise — fallback assets, not a parallel primary track.

| Spec | `videoUrl` | `imageUrl` |
|---|---|---|
| Format | MP4 (H.264) | JPEG or WebP |
| Resolution/aspect | Same 16:9, same resolution floor as GIF (§3.1) | Same 16:9, same resolution floor as GIF |
| Duration/loop | Same 2–4s loop content as GIF would have been; W-22 §5.3 plays it autoplay/muted/loop in the hero — **same neutral-stance start/end requirement as §3.1 applies** | N/A — static |
| File size ceiling | 5MB | 500KB |
| Visual consistency | Same background/lighting/framing standard as §3.1 | Same background/lighting/framing standard as §3.1; must be a genuinely representative static pose (peak contraction), not the neutral start/end stance |

### 3.3 Muscle Target Image

| Spec | Standard |
|---|---|
| Resolution | 800×800px minimum |
| Aspect ratio | 1:1 (square) — sized for a compact identity-block placement (§ below), not the full-width hero |
| Visual style | Anatomical silhouette with highlighted muscle regions |
| **Anatomical model character (mandatory)** | **The model is intentionally generic and educational — a neutral, schematic anatomical reference, not a realistic, athletic, or aspirational figure.** It must not depict body fat, muscularity or body composition, sex-specific anatomy, skin tone, or any other identifying athlete characteristic (age markers, hairstyle, etc.). The diagram exists solely to show *where* a muscle is, never to represent *who* trains it — every athlete sees the identical neutral reference figure regardless of their own body. This governs the model itself; the highlighted-region color convention below is unaffected. |
| **Cross-exercise consistency requirement (mandatory)** | **Every muscle target image must use the exact same anatomical model, pose, camera angle, proportions, scale, and framing. Only the highlighted musculature changes between exercises.** This is what makes the 200 bespoke images read as one coherent system rather than 200 unrelated illustrations — the athlete should be able to flip between exercises and immediately register "this is the same diagram with different muscles lit up," never "this is a different drawing." |
| Color/highlight convention | Mirrors `Exercise-Detail-Wireframe-Spec-W22.md` §6.2–6.3's existing filled-primary / outlined-secondary chip hierarchy: primary muscle regions shown as a solid warm-tinted fill (same accent family as the filled primary-muscle chips); secondary muscle regions shown outlined/hatched only, no solid fill (same visual subordination as the outlined secondary chips); unworked regions in a neutral muted silhouette tone. This is the existing chip hierarchy translated onto the fixed anatomical template, not a new color language. |
| Background | Transparent or solid brand-neutral background, consistent across all 200 — transparent PNG/WebP recommended so it composites cleanly against W-22's dark theme |
| File format | PNG (if transparency needed) or WebP |
| File size ceiling | 300KB |
| Per-exercise bespoke requirement | Each of the 200 exercises gets its own unique asset rendered from the fixed template (§ above) with that exercise's muscles highlighted — 200 distinct files sharing one fixed model/pose/camera/framing, not 200 unrelated illustrations and not a smaller library of muscle-combination-keyed assets (§2.3). |

---

## Section 4 — Naming Convention and File / CDN Organization

### 4.1 The Collision Problem

Five known naming-duplicate pairs previously existed as separate catalog rows with near-identical names (per `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md`'s V1-Freeze-audit-corrected count): Box Step-Up / Step-Up, Back Squat / Squat, Front Plank / Plank, Barbell Romanian Deadlift / Romanian Deadlift, Barbell Bench Press / Bench Press. **These were resolved by the 2026-06-30 Exercise Naming Standard reconciliation** (see `Exercise-Naming-Standard-v1.0.md`) — each pair now collapses to a single canonical row, so the specific collision risk they posed no longer exists. The recommendation below remains the correct general policy regardless: any name-derived slug (e.g. `barbell-bench-press.gif` vs. a future near-duplicate name) risks either an actual collision, if slugified identically, or a confusing near-miss, if slugified distinctly but a human operator transposes them during a manual production pass given how similar two names can read.

### 4.2 Recommendation: Key All File Paths Off `ExerciseDefinition.id`

Never key file paths off name-derived slugs. Use the schema's immutable uuid primary key instead:

```
/media/exercises/{exerciseId}/gif.gif
/media/exercises/{exerciseId}/gif-thumbnail.{jpg|webp}
/media/exercises/{exerciseId}/video.mp4
/media/exercises/{exerciseId}/image.{jpg|webp}
/media/exercises/{exerciseId}/muscle-target.{png|webp}
```

`id` is collision-proof by construction — no naming-collision risk can exist regardless of how many duplicate-sounding exercise names exist now or are added in future post-MVP content cycles (`Exercise-Library-Architecture-v1.0.md` §8.3 targets +50–75 exercises per cycle, which only increases near-duplicate-name risk over time). This also decouples asset URLs from exercise renames — if an exercise's `name` is ever edited, the asset path never needs to change.

### 4.3 Forward Compatibility

This convention is backend-agnostic. It defines the naming standard the future Backend/Data-Model architecture (an universal blocker tracked in `Forge-Legacy-Master-Status.md` Decision Queue #1, not yet authored) must implement against — whatever storage/CDN backend is eventually chosen, the `{exerciseId}/{asset-type}.{ext}` convention requires no rework when that architecture is authored.

---

## Section 5 — Fallback Behavior for `muscleTargetImageUrl`

When `muscleTargetImageUrl` is `null` — the default state for all 200 exercises until a future production pass populates it, and the expected permanent state for most CUSTOM exercises — the supplementary visual is hidden entirely. No placeholder, no "diagram coming soon" message, no broken-image icon.

This is consistent with `Exercise-Detail-Wireframe-Spec-W22.md` §4.2's established section-visibility pattern ("Sections with null or empty content are hidden entirely — no empty placeholders... for system exercises") and §14.1's "Individual Section Absent (Content Null)" rule. No divergence from the established pattern is introduced here.

---

## Section 6 — Validation / QC Checklist for Future Media Production Passes

Modeled on `Anchor-Exercise-Authoring-Framework-v1.0.md` §5's QC-checklist structure for project-convention consistency.

```
## Media Asset QC Checklist (per exercise)

GIF / primary asset
- [ ] gifUrl populated; 16:9, ≥720×720 source, 2–4s loop, 24–30fps
- [ ] File size ≤ 3MB
- [ ] Loop begins and ends in the same neutral stance — no visible jump-cut between final and first frame
- [ ] gifThumbnailUrl extracted from a representative mid-movement frame, not the neutral start/end stance
- [ ] Background, lighting, and framing match the catalog-wide consistency standard (§3.1)

Fallback assets (only if GIF unavailable for this exercise)
- [ ] videoUrl: MP4/H.264, same aspect/resolution/loop standard as GIF, same neutral-stance start/end requirement, ≤5MB
- [ ] imageUrl: static, same aspect/resolution standard, representative peak-contraction pose, ≤500KB

Muscle target image
- [ ] muscleTargetImageUrl populated; 800×800 minimum, 1:1 aspect
- [ ] Matches the fixed model/pose/camera angle/proportions/scale/framing template exactly — only highlighted musculature differs from other exercises' diagrams
- [ ] Primary muscles: solid filled highlight matching W-22 primary-chip accent color
- [ ] Secondary muscles: outlined-only highlight matching W-22 secondary-chip treatment
- [ ] Background transparent or brand-neutral; file ≤300KB
- [ ] Asset is bespoke to this exercise — not reused from another exercise with an overlapping muscle set

Naming / organization
- [ ] All file paths keyed by exerciseId (uuid) — zero name-derived slugs anywhere in the path
- [ ] For exercises in a known naming-duplicate pair: confirm the asset is attached to the correct row's exerciseId, not its near-duplicate sibling

Schema gate
- [ ] isActive is NOT set to true until gifUrl-or-fallback AND muscleTargetImageUrl are both populated (alongside the existing text-content requirements per Exercise-Library-Architecture-v1.0.md §8.1)
```

---

## Section 7 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial document. Adds `muscleTargetImageUrl` to `ExerciseDefinition` as a new "Exercise Anatomy" schema group, separate from the existing Media block. Defines production standards for all 5 media/anatomy fields, including the mandatory neutral-stance loop start/end requirement (§3.1) and the mandatory fixed-template consistency requirement for muscle target images (§3.3). Defines a uuid-keyed naming convention chosen to be collision-proof against 5 known naming-duplicate exercise-name pairs. Standards and schema only — no exercise media or anatomy assets produced or assigned. |
| v1.1 | June 2026 | §3.3 — added a mandatory "Anatomical model character" standard: the muscle target image model must remain intentionally generic and educational, and must not depict body fat, muscularity/body composition, sex-specific anatomy, skin tone, or any other identifying athlete characteristic. Clarifies, not replaces, the existing cross-exercise consistency requirement. No schema change; standards-only, no assets produced. |

---

*Exercise Media Architecture & Production Standards v1.0*
*Forge Legacy | June 2026*
