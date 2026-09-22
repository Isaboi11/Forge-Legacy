# Forge Legacy — Deltas & Decisions

This document records where the **built screens diverge from the older architecture / blueprint
docs** (`uploads/Forge-Design-Blueprint-*.md`) and the design decisions made during the design
process. **The screens + this document are the source of truth.** The blueprint is superseded
wherever it conflicts with what is written here.

Each entry: **What changed · Why · What it supersedes.**

---

## 1. Artwork system introduced (new — not in the blueprint)
- **What:** A full illustration system — an engraved, charcoal, bronze-restrained visual language;
  a master reference (`Forge Artwork Reference.dc.html`); and activated collections: Training
  Splits, Workout Modalities, Program Themes, Exercise Families, Legacy, Honors. Assets under
  `assets/artwork/<collection>/<sex|shared>/<key>.png`.
- **Why:** The app needs one consistent, premium illustration language instead of ad-hoc images.
- **Supersedes:** The blueprint had no artwork taxonomy or asset system.

## 2. Sex-specific artwork sets
- **What:** Training Splits, Workout Modalities, Program Themes, and Exercise Families each ship a
  **male** and **female** set. The set is chosen from the user's saved sex only.
- **Why:** Athletes see figures that match their selected sex; both sets are one unified series.
- **Rule:** Sex is **never inferred** from name, photo, behaviour, or body data — saved selection
  only. Missing sex → neutral fallback (see §7).

## 3. Honors — female set is a deliberate subset
- **What:** The female **Honors** collection omits four figure-based emblems — **Strength,
  Endurance, Transformation, Community** — that the male set includes. The female side shows the
  remaining object/emblem honors (Consistency, Leadership, Completion, Milestones).
- **Why:** Explicit direction during review; the omitted four were male-figure illustrations.
- **Supersedes:** No prior spec addressed per-sex honor artwork.

## 4. Legacy & Honors reserved from the workout card
- **What:** Legacy and Honors artwork are shared (one set both sides) and **must never** appear on
  an active "Start Workout" card. Reserved for Legacy, achievement, ceremony, and empty states.
- **Why:** Keeps the workout card about *today's training*, not identity/achievement imagery.
- **Enforcement:** Guard in the resolver; validated by a unit test.

## 5. Home Workout Artwork Resolver (new system)
- **What:** A centralized, deterministic resolver — `resolveHomeWorkoutArtwork()` in
  `forge-artwork-resolver.js`, fully specified in `Forge Home Artwork Resolver.dc.html`. Chooses
  the Home-card artwork by a fixed 7-rung precedence (override → non-strength modality → strength
  split → dominant exercise family → program theme → generic fallback → neutral default), returns
  a typed object `{ collection, key, sexVariant, confidence, reason, source, assetPath }`.
- **Why:** Artwork must describe *today's* workout, deterministically, from structured data — not
  scattered per-screen logic or title string-matching.
- **Supersedes:** The Home card previously hard-coded a single placeholder ("Push Day A" /
  `assets/workout-push.png`). It now consumes only the resolved object and holds no classification
  logic.

## 6. Data-model additions required (structured fields)
- **What:** The resolver depends on structured fields that must be added to the real model:
  `workout.modality`, `workout.split`, `workout.targetMuscleGroups[]`, `workout.artworkOverride`,
  `program.theme`, `program.structure`, session-exercise `catalogKey`, and per-exercise
  `workingSets`.
- **Status:** Only the single active program (`usr-active-powerbuilding`) has
  `modality/split/structure/theme` populated as a demonstration. All others still lack them.
- **Why:** Deterministic resolution over inference. See resolver doc §14 (data-model audit) for
  what exists / is inferred / must be added.
- **Supersedes:** Blueprint program/workout schema did not carry these.

## 7. Sex fallback = neutral (fixes a model default)
- **What:** A missing sex selection must resolve to an explicit **neutral** artwork variant.
- **Status:** `forge-user.js` currently defaults missing sex to **male** — this is a **bug** to fix.
  True neutral artwork does not exist yet; the resolver uses the male set as a *documented*
  temporary placeholder and still reports `sexVariant: "neutral"`.
- **Why:** Never guess or default a user's sex.

## 8. Workout scheduling — queue-based, not day-bound
- **Decision:** Programs remain an **ordered queue** ("next workout is always startable today"),
  **not** date/weekday-bound. Rest is emergent (a day you don't train), not a scheduled slot.
- **Why:** Never present a locked "come back tomorrow" card; matches the rank engine's *active-week*
  consistency metric (any Mon–Sun with ≥1 session) rather than fixed training days; non-punitive.
- **Optional (soft only):** Users may set *preferred* training days for suggestions/notifications —
  never to gate the next workout.
- **Supersedes:** Any reading of the blueprint implying fixed day assignment.

## 9. Calendar — explored and dropped
- **Decision:** No Calendar screen. A lean "consistency heat-map + upcoming sessions" version was
  prototyped and **cut** as redundant: the flexible queue + Home "Today's Workout" + Legacy Timeline
  already cover look-back and look-ahead; a date grid added weight against the app's restraint.
- **Why:** Avoid crowding; the unique value (private consistency view) did not justify a full
  surface.
- **Supersedes:** The blueprint listed a cross-cutting **Calendar** surface. **Removed.** The
  private consistency view can be reconsidered later as a small element, not a screen.

---

## Still open (carry into implementation)
- Populate the structured fields across **all** programs/workouts (§6).
- Fix the sex default → neutral, and produce real **neutral** artwork (§7).
- Build the real **asset manifest** with version/aspect/placement, and swap prototype crops for
  high-res masters.
- Implement the resolver **unit-test matrix** (resolver doc §16).
- Reconcile / annotate the blueprint docs so no one treats the superseded sections as current.
