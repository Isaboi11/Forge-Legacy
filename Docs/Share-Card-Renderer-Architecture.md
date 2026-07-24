# Forge Legacy — Share Card Renderer Architecture

## v1.0 — June 2026

**Status:** LOCKED

**Type:** Architecture Document (not a screen, not a wireframe — no screen code, no navigation, no visual design system; renders artifacts only)

**Date:** June 2026

**Authority:**
- WSR-001-Workout-Share-Result-Architecture.md (LOCKED) — primary authority
- Share-Configuration-Step-Wireframe-Spec-SH1.md (LOCKED) — secondary authority (ownership boundaries and integration points only)

**Implements:** The Share Card Renderer component named by WSR-001 §7.1 ("A rendered image generated client-side from the `ShareContent` payload") and WSR-001 §14 Downstream Impact ("Share card renderer — New client-side component. Renders ShareContent to image at specified detail level. Three card templates."); referenced by SH-1 §1 ("Render the final share card image (delegated to the Share Card Renderer)") and SH-1 §9 ("NOT rendered by SH-1 or the Share Card Renderer").

**Downstream Dependents:** None. This document closes the final outstanding row of WSR-001 §14's Downstream Impact table ("Share card renderer").

**Amendment Log:** Initial. v1.0 LOCKED. OD-1 (RANK_UP template selection) found during initial lock pass, resolved via WSR-001 §7.1 clarification (v1.0.1), confirmed closed during final lock pass. No version bump required — resolved prior to promotion, consistent with this repository's convention for in-session lock-pass corrections.

---

## Preamble

The Share Card Renderer exists because WSR-001 names it as a required component and explicitly declines to specify it: §7.1 produces a "Card design principles (visual spec deferred to future share card design system...)" note, and §14's Downstream Impact table lists "Share card renderer — New client-side component" as still-required work. Every behavior the renderer needs has already been decided by WSR-001 — template selection, detail-level content rules, field-by-field `ShareContent` handling, output formats. What did not yet exist was a single document that collected those decisions under one component boundary.

It is separate from SH-1 because SH-1 is a screen — a control surface with entry points, navigation, states, and a data contract that creates a `WorkoutShare` record. The renderer has none of those things. SH-1 itself draws this line: "Render the final share card image (delegated to the Share Card Renderer)" (SH-1 §1) is listed under "What SH-1 does NOT do." SH-1 hosts the renderer's output inside a preview slot; it does not produce that output itself.

It is separate from S-2 because S-2's Check-ins section displays squad check-in cards, and those cards are explicitly excluded from the renderer's scope. SH-1 §9 states this directly: the squad check-in card "is NOT rendered by SH-1 or the Share Card Renderer — it is a native S-2 list row generated from the same `WorkoutShare` record, always at Achievement-level text, per WSR-001 §6.3's fixed 5-type format table." The renderer produces external share artifacts only.

It is not a screen because it has no navigation, no entry point of its own, and no screen code. It is invoked — by SH-1, for a live preview, and again to produce the final artifacts handed to the native OS share sheet — but it is never the destination of a tap, and an athlete never "opens" it.

---

## Section 1 — Purpose

### 1.1 What the Renderer Is

The Share Card Renderer is a client-side rendering component. It takes an immutable `ShareContent` payload, a `shareType`, and a `detailLevel`, and transforms them into the external share artifacts WSR-001 defines: a share card image, a text snippet, and the bundled payload handed to the native OS share sheet. It contains no business logic about *what* may be shared, *who* may see it, or *where* it may go — those decisions are made upstream, before the renderer is ever invoked.

### 1.2 What It Produces

- A rendered share card image, using one of three fixed templates (Section 4)
- A plain-text snippet, auto-generated from the same `ShareContent` (Section 8)
- A native share payload bundling both, handed to the OS share sheet (Section 9)

### 1.3 Where It Sits

The renderer sits between SH-1 (which assembles and previews share configuration) and the native OS share sheet (which owns delivery). It has no position in any navigation graph. It is not listed in any screen-code table, does not appear in any entry-point or destination column, and is invoked rather than visited.

### 1.4 Responsibility Distinction

| Component | Owns |
|---|---|
| **WSR-001** | What may be shared, under what conditions, to whom, and what each `ShareContent` field means. The architecture of record. |
| **SH-1** | The in-app control surface — entry points, content toggles, detail-level selection, squad destination, and the `WorkoutShare`-creation data contract. |
| **Renderer** | Transforming a given `ShareContent` + `shareType` + `detailLevel` into rendered artifacts. Produces; decides nothing. |
| **S-2** | The Check-ins section, squad check-in card display, and reactions. Never invokes the renderer — squad cards are text rows, not rendered artifacts (SH-1 §9). |

Full ownership boundaries are detailed in Section 10.

---

## Section 2 — Inputs

### 2.1 Required Inputs

| Input | Source of Truth | Defined In |
|---|---|---|
| `ShareContent` | Embedded snapshot on `WorkoutShare.content`, or the in-progress equivalent assembled by SH-1 prior to record creation (see 2.3) | WSR-001 §9.3 |
| `shareType` | `WorkoutShare.shareType`, pre-selected at the entry point and unchangeable within SH-1 (except the M-2 multi-honor case, which scopes content, not type) | WSR-001 §9.2; SH-1 §2 |
| `detailLevel` | `WorkoutShare.detailLevel` / `ShareContent.detailLevel`, athlete-selected in SH-1 §4.1, defaulting to `AthleteShareSettings.defaultDetailLevel` | WSR-001 §9.1–§9.3; SH-1 §4.1, §9 |

The renderer reads these three inputs and nothing else. It does not read `AthleteShareSettings`, squad membership, or any entity beyond the `ShareContent` snapshot itself — those have already been resolved into `ShareContent`'s fields by the time the renderer runs.

### 2.2 When the Renderer Is Invoked

Per SH-1 §5 ("Live preview" state) and §9 ("Submitting" state), the renderer is invoked at two distinct points in a share's lifecycle:

1. **Preview-time (pre-creation):** While SH-1 is open and before "Share" is tapped, the renderer runs against the athlete's current in-progress selections (detail level, content toggles, and — for M-2 multi-honor — the selected honor or "all") to produce the live preview shown in SH-1's Preview slot. No `WorkoutShare` or `ShareContent` record exists yet at this point; the renderer is fed the equivalent in-progress values SH-1 currently holds.
2. **Share-tap time (final artifacts):** When the athlete taps "Share," SH-1 creates the `WorkoutShare` record with its embedded `ShareContent` snapshot (SH-1 §9). The renderer is invoked again — or its preview-time output is finalized — against that now-immutable `ShareContent` to produce the artifacts actually handed to the native share sheet.

Both invocations apply identical rendering rules (Sections 4–8). The only difference is whether the input is a persisted, immutable `ShareContent` or its not-yet-persisted preview-time equivalent.

### 2.3 Multi-Honor Scoping

For `HONOR_EARNED` shares where the triggering session awarded more than one honor, SH-1 §4.2 gates the Preview specifically on the athlete's honor selection ("Select an honor above to preview your share"). The renderer does not perform this gating — it is a SH-1 UI state. The renderer is simply not invoked until SH-1 has resolved the selection into a single-honor or "all honors" content scope, per WSR-001 §5.2's HONOR_EARNED mapping.

---

## Section 3 — Outputs

### 3.1 Share Card Image — Primary Output

A rendered image generated from `ShareContent` at the specified `detailLevel`, using one of the three templates in Section 4. This is the primary artifact handed to the native share sheet. (WSR-001 §7.1, output 1)

### 3.2 Text Snippet — Fallback Output

A plain-text string auto-generated from `ShareContent`, used by platforms that display text alongside images, or when the athlete shares text-only. (WSR-001 §7.1, output 2; see Section 8)

### 3.3 Native Share Payload

The bundle of the share card image and text snippet, handed to the operating system's native share API. The renderer produces this payload; it does not control what the OS or the receiving platform does with it (Section 9).

### 3.4 MVP vs. Post-MVP Outputs

| Output | MVP Status |
|---|---|
| Share card image | MVP — required |
| Text snippet | MVP — required |
| Native share payload (image + text bundle) | MVP — required |
| Link (unlisted public recap URL) | **Post-MVP.** Reserved per WSR-001 §3.3, §4.4, §7.3. The renderer produces no link output at MVP; `WorkoutShare.shareLink` is null. |
| Photo rendering within a card | **Post-MVP.** WSR-001 §11.8 reserves a `ShareContent.highlights` photo reference; "the share card renderer would resolve the photo ID to an image at render time," gated on a consent model not yet built. Not implemented here. |

---

## Section 4 — Template Mapping

Reproduced exactly from WSR-001 §7.1. No templates added, removed, or reassigned.

| Template | Used For |
|---|---|
| **WorkoutComplete Card** | `WORKOUT_COMPLETE` |
| **Achievement Card** | `PROGRAM_GRADUATED`, `HONOR_EARNED`, `GOAL_ACHIEVED` |
| **Rank Card** | `RANK_UP` (sole template for this type) |

Each `shareType` maps to exactly one template. `RANK_UP` renders exclusively via the Rank Card — its dedicated high-emphasis template — and never via the Achievement Card. This resolves OD-1 (the prior ambiguity in WSR-001 §7.1, where `RANK_UP` appeared in both rows with no selection rule between them) per the approved OD-1 decision analysis: WSR-001 §7.1 has been amended (v1.0.1) to remove `RANK_UP` from the Achievement Card row and state this mapping as the sole template for the type.

---

## Section 5 — Rendering Principles

Extracted verbatim from WSR-001 §7.1's "Card design principles." These are architectural constraints on the renderer's behavior, not a visual design system — exact colors, typefaces, spacing, and pixel dimensions remain explicitly deferred (WSR-001 §7.1: "visual spec deferred to future share card design system — see Section 11.5").

- **Dark background, typographic-first, minimal visual elements.** The card is built from text and type hierarchy, not imagery or decoration.
- **Headline emphasis.** The achievement headline is the largest typographic element on the card.
- **Context treatment.** The context line (e.g., "Building → [Chapter Name]") renders as secondary — present, but visually subordinate to the headline.
- **Attribution requirements.** Forge Legacy app attribution is always present and legible, on every card, at every detail level (see Section 7, `appAttribution`).
- **Detailed-view exercise presentation.** At Detailed level, exercise data renders as a clean typographic list — explicitly not a database table, not a grid.
- **Earned, not screenshotted.** The card should feel earned and substantial — the architecture's own framing is that it must not feel like "a screenshot of a data screen."

These principles govern relative hierarchy and treatment. They do not specify typefaces, color values, exact spacing, or grid systems — that work belongs to the future share card design system named in WSR-001 §11.5 and is out of scope here per Non-Negotiable Rule 9–11.

---

## Section 6 — Detail-Level Rendering

Authority: WSR-001 §2.1 (content availability table), §7.2 (detail-level rendering rules), §5.2 (per-type content mapping).

### 6.1 Achievement

**Included:** Achievement type headline, chapter name (opt-out), date, app attribution, athlete display name (opt-out), "Forging since" (opt-in). For `PROGRAM_GRADUATED` specifically, the context line "[X] weeks · [Y] workouts" is also included at Achievement level — WSR-001 §5.2 marks this "always shown," and §7.2 clarifies it is treated as achievement data, not a performance stat, so it is not gated to Summary+.

**Excluded:** Workout type label, duration, program name + session position, honor name, goal name, full exercise list, progress percentages (always excluded at every level, per §2.3).

**Rendering expectation:** Identity-focused. Per WSR-001 §7.2: "No stats, no numbers... This is the default — Forge Legacy leads with who the athlete is." `WORKOUT_COMPLETE`'s subheadline is specifically gated to Summary/Detailed per §5.2 ("Subheadline (Summary/Detailed)") — at Achievement level, a `WORKOUT_COMPLETE` card renders headline and context only, with no subheadline line.

### 6.2 Summary

**Included:** Everything from Achievement, plus workout type label, duration, and one notable contextual stat (program position, honor name, or exercise count, per type).

**Excluded:** Full exercise list — `ShareContent.exerciseData` remains null at Summary level (WSR-001 §9.3: "DETAILED level only; null at other levels").

**Rendering expectation:** Per WSR-001 §7.2: "The card remains clean and readable. Stats are supporting context, not the headline."

### 6.3 Detailed

**Included:** Everything from Summary, plus the full exercise list from `ShareContent.exerciseData`, rendered per Section 5's typographic-list principle.

**Excluded:** Nothing beyond Section 2.3's universal exclusions (progress percentages, chapter notes, photos, other athletes' data, streaks, total volume, session-level PR comparisons).

**Rendering expectation:** Per WSR-001 §7.2: "the most data-rich output but remains under the Forge Legacy visual identity. The card may be longer to accommodate the exercise list." Each exercise renders as "[Exercise Name] — [sets × reps] at [weight]" or an equivalent typographic treatment — never a table or grid.

### 6.4 Squad Card (Not Renderer Scope)

For completeness: the squad check-in card is locked to Achievement-level *content* (WSR-001 §2.1, §6.3), but it is a native S-2 list row generated directly from `WorkoutShare`'s fixed 5-type text format table — it is never produced by this renderer (SH-1 §9). It is documented here only to make the boundary explicit; see Section 10.

---

## Section 7 — ShareContent Rendering Rules

Authority: WSR-001 §9.3 (`ShareContent` schema), §5.2 (type-specific mapping), §7.1–§7.2 (rendering description). No fields are invented or reinterpreted beyond what these sections already define.

| Field | Renderer Handling |
|---|---|
| `headline` | Always rendered, at every detail level. Largest typographic element (Section 5). Value is type-specific per §5.2 (e.g., "Workout Complete," "Program Graduated," "Honor Earned" / "Honors Earned," "Goal Achieved," "Rank Advancement"). |
| `subheadline` | Rendered below the headline when non-null. Null is a valid, renderable state (no placeholder shown) — notably for `WORKOUT_COMPLETE` at Achievement level, where §5.2 gates subheadline to Summary/Detailed only. |
| `contextLine` | Rendered as the secondary line (Section 5) when non-null. Null for types/levels where §5.2 defines no context line (e.g., `HONOR_EARNED`, `RANK_UP` have no contextLine in the mapping) — omitted entirely, not rendered as an empty row. |
| `highlights` | Rendered as an ordered list of supporting facts at Summary and Detailed levels, per the order given in the array — the renderer does not re-sort or filter `ShareHighlight[]`. Each `ShareHighlight` renders as `label` alone if `value` is null, or `label: value` if present. |
| `exerciseData` | Null at Achievement and Summary (not rendered). At Detailed, each `ShareExercise` renders as a name plus its `ShareExerciseSet[]`, each set rendering available fields (`weight`, `reps`, `notes`) and omitting any that are null — per the typographic-list principle in Section 5, never a table or grid. |
| `athleteName` | Rendered as a name line when non-null. Null means the athlete opted out via SH-1's "Include your name" toggle — the renderer omits the line entirely, not a blank or placeholder. |
| `forgingSince` | Rendered as "Forging since [Month Year]" only when non-null (opt-in default off, per SH-1 §4.1). Omitted otherwise. |
| `date` | Always rendered, at every detail level, per WSR-001 §2.1's table ("Date | ✓ | ✓ | ✓ | ✓"). Reflects the share action date, not the source event's date (WSR-001 §9.3). |
| `appAttribution` | Always rendered, at every detail level, legibly, per Section 5. Literal string `'Forge Legacy'`. Not gated by any SH-1 toggle — it is not one of the three content toggles SH-1 exposes (§4.1: name, chapter context, "Forging since" — attribution is not among them). |

---

## Section 8 — Text Snippet Generation

### 8.1 Generation Rules

The text snippet is auto-generated from `ShareContent` — it is never athlete-authored. This is a distinct concept from `WorkoutShare.athleteMessage`, which is a separate, optional, ≤140-character field the athlete writes specifically for squad check-in cards (WSR-001 §6.5 step 4, §8.3 item 4) and which the renderer does not produce or touch.

### 8.2 Formatting Rules

The snippet draws from the same headline/subheadline/context/attribution fields the image card renders, condensed into a single line or short paragraph of plain text. WSR-001 §7.1 provides the canonical examples, reproduced here verbatim:

- `WORKOUT_COMPLETE` (Achievement): *"Completed a workout building toward Iron Era. Forging with Forge Legacy."*
- `PROGRAM_GRADUATED` (Achievement): *"Graduated from Strength Foundation I. 8 weeks · 24 workouts. A permanent mark in my legacy. | Forge Legacy"*
- `HONOR_EARNED`: *"Earned the Bench Press: 225 lbs honor. A permanent part of my legacy. | Forge Legacy"*

### 8.3 Fallback Behavior

Per WSR-001 §7.1, the text snippet is "used by platforms that display text alongside images or when the athlete prefers to share text-only." The renderer always produces both the image and the text snippet as part of the native share payload (Section 3.3); which artifact a given receiving platform surfaces is determined by that platform's own share-sheet integration, not by Forge Legacy.

---

## Section 9 — Native Share Integration

### 9.1 Relationship to SH-1

SH-1 invokes the renderer twice (Section 2.2): once for the live preview shown inside its Preview slot, and once — implicitly, via the now-created `ShareContent` — when the athlete taps "Share" (SH-1 §5 "Submitting" state, §9). SH-1 owns the moment of invocation and the data passed in; the renderer owns only the transformation.

### 9.2 Relationship to the OS Share Sheet

Per WSR-D3, Forge Legacy maintains no custom platform integrations (no Instagram API, no WhatsApp API, etc.). The native iOS/Android share sheet is the sole external delivery mechanism (WSR-001 §3.1). The renderer has no awareness of which destination app the athlete ultimately selects in the OS share sheet, and no role in that selection.

### 9.3 Artifact Handoff Process

1. The renderer produces the share card image and text snippet (Sections 3, 4–8) from the given `ShareContent`.
2. These two artifacts are bundled into the native share payload (Section 3.3).
3. SH-1 invokes the OS's native share API with that payload at the moment "Share" is tapped (SH-1 §9: "`externalSharedAt` is set when the native OS share sheet opens").
4. The operating system presents its own share-sheet UI and routes the payload to whatever destination app the athlete selects.

**Renderer creates artifacts. Operating system owns delivery.** The renderer's responsibility ends at step 2; it has no visibility into, and no responsibility for, step 4.

---

## Section 10 — Ownership Boundaries

### WSR-001 Owns

- Share types, their triggers, and their entry points
- The `ShareContent`, `WorkoutShare`, `AthleteShareSettings`, and `ShareReaction` schemas
- Privacy and visibility architecture (PRIVATE / SQUAD_ONLY / PUBLIC; per-share override)
- Squad check-in surface rules: TTL, max cards, ordering, fixed card-text format, reactions
- The definition of what content is available at each detail level (§2.1)
- The template-to-`shareType` mapping (§7.1) and the rendering principles (§7.1) this document extracts
- All destinations (native share sheet, squad check-in, post-MVP public link)

### SH-1 Owns

- The in-app control surface: entry points, live preview hosting, detail-level selector, content toggles, squad destination picker, multi-honor selection
- Timing and data-write behavior of `WorkoutShare` record creation
- Navigation, dismissal, and ceremony-sequence integration
- Invoking the renderer, both for preview and at the moment of "Share"

### Renderer Owns

- Transforming a given `ShareContent` + `shareType` + `detailLevel` into: a share card image, a text snippet, and a bundled native share payload
- Template selection per Section 4
- Field-by-field rendering behavior per Section 7
- Nothing else. No UI surface of its own beyond the artifacts it produces. No navigation. No data-write authority — it never creates, modifies, or persists `WorkoutShare`, `ShareContent`, or any other entity.

### S-2 Owns

- The Check-ins section UI and squad check-in card display, generated directly from `WorkoutShare` as a native list row (never via the renderer — SH-1 §9)
- Reactions UI and reaction state
- The Limited Athlete Profile modal launched on check-in card tap

**Goal of this section:** prevent future overlap. The renderer's boundary with SH-1 is invocation (SH-1 calls it; it never calls back into SH-1's navigation or data layer). Its boundary with S-2 is total non-involvement — the renderer has no path into squad check-in card generation at all.

---

## Section 11 — Non-Behaviors

The renderer does not and will not:

- **Create a `WorkoutShare` record.** Record creation belongs to SH-1 (§9); the renderer only consumes `ShareContent` after or alongside that creation.
- **Select a destination.** Destination selection (external, squad, post-MVP public link) is SH-1's and WSR-001's responsibility (§3, §8.3); the renderer is invoked only after a destination decision context exists.
- **Render a squad check-in card.** Explicitly excluded per SH-1 §9 — squad cards are native S-2 list rows generated from `WorkoutShare`'s fixed text format table (WSR-001 §6.3), never from this renderer.
- **Render a public recap page.** Post-MVP, reserved by WSR-001 §3.3 / §7.3; no link output exists at MVP (Section 3.4).
- **Maintain custom platform integrations.** Per WSR-D3, only the native OS share sheet is targeted; the renderer never integrates with Instagram, WhatsApp, or any other platform's API directly.
- **Manage visibility.** `AthleteShareSettings.globalVisibility` and `WorkoutShare.visibility` are resolved entirely upstream before the renderer runs; the renderer has no visibility-related input or logic.
- **Make privacy decisions.** Same as above — privacy is fully resolved by WSR-001 and SH-1 before invocation.
- **Determine `shareType`.** `shareType` arrives as an input, pre-selected at the entry point (WSR-001 §8.1; SH-1 §2); the renderer never infers or changes it.
- **Expose share settings.** `AthleteShareSettings` is read (indirectly, via the already-resolved `ShareContent`) but never written or surfaced by the renderer.
- **Author a visual design system.** Colors, typefaces, exact spacing, and pixel layout remain deferred to the future share-card design system (WSR-001 §11.5); this document specifies architectural rendering rules only (Section 5).
- **Render reactions.** Per WSR-001 §10 Non-Behaviors, reactions never appear on external shares or public content — they are bounded to the private squad check-in context the renderer never touches.
- **Render photos.** Post-MVP per WSR-001 §11.8, gated on a consent model not yet built.
- **Introduce new templates, share types, detail levels, or destinations** beyond what WSR-001 already defines.

---

## Section 12 — Architecture Decisions

| Decision ID | Decision | Traces To |
|---|---|---|
| **SCR-D1** | The renderer is a non-screen, non-navigable client-side component with no screen code. | WSR-001 §14 ("New client-side component"); SH-1 §1 ("delegated to the Share Card Renderer") |
| **SCR-D2** | Exactly three card templates exist: WorkoutComplete, Achievement, Rank — no additions. | WSR-001 §7.1 |
| **SCR-D3** | `RANK_UP` maps to exactly one template, the Rank Card (its dedicated high-emphasis template); it does not also render via the Achievement Card. Resolves OD-1. | WSR-001 §7.1 (v1.0.1) |
| **SCR-D4** | Achievement is the default and most identity-focused detail level; no performance numbers render at Achievement level except `PROGRAM_GRADUATED`'s intrinsic "[X] weeks · [Y] workouts" context. | WSR-001 §5.2, §7.2, WSR-D10 |
| **SCR-D5** | The squad check-in card is never produced by this renderer, under any circumstance. | SH-1 §9; WSR-001 §6.3 |
| **SCR-D6** | The renderer is invoked twice per share lifecycle: once for SH-1's live preview (pre-creation), once for final artifact generation (post-creation, at "Share" tap). | SH-1 §5 ("Live preview" state), §9 ("Submitting" state) |
| **SCR-D7** | Visual design (exact colors, typography, spacing, pixel layout) is explicitly out of scope and deferred to a future design system. | WSR-001 §7.1, §11.5 |
| **SCR-D8** | The text snippet is fully auto-generated and is distinct from `WorkoutShare.athleteMessage`, which the renderer never reads or produces. | WSR-001 §7.1 (output 2), §6.5, §8.3 |
| **SCR-D9** | The renderer never manages delivery; the operating system's native share sheet owns delivery once artifacts are handed off. | WSR-D3, WSR-001 §3.1 |
| **SCR-D10** | `ShareContent` is treated as immutable input; the renderer never mutates it or any persisted entity. | WSR-D5, WSR-001 §9.3 |
| **SCR-D11** | Photo rendering and link rendering remain architecturally reserved but unimplemented at MVP. | WSR-001 §11.8, §3.3, §7.3 |

---

## Section 13 — Validation Checklist

### Template Mapping
- [ ] Exactly three templates defined: WorkoutComplete, Achievement, Rank
- [ ] WorkoutComplete Card maps only to `WORKOUT_COMPLETE`
- [ ] Achievement Card maps to `PROGRAM_GRADUATED`, `HONOR_EARNED`, `GOAL_ACHIEVED` only
- [ ] Rank Card maps to `RANK_UP` as its sole template
- [ ] No template added beyond WSR-001 §7.1's three
- [ ] **OD-1 resolved:** `RANK_UP` maps to exactly one template (Rank Card), per WSR-001 §7.1 v1.0.1

### Detail-Level Rendering
- [ ] Achievement: no stats/numbers except `PROGRAM_GRADUATED`'s intrinsic context line
- [ ] Achievement: `WORKOUT_COMPLETE` subheadline is null (gated to Summary/Detailed per §5.2)
- [ ] Summary: workout type label, duration, one notable stat added; `exerciseData` remains null
- [ ] Detailed: full `exerciseData` rendered as typographic list, never a table/grid
- [ ] Progress percentages excluded at every level (universal exclusion)
- [ ] Squad card content (Achievement-locked text) is out of renderer scope entirely

### ShareContent Field Handling
- [ ] `headline` always rendered, largest typographic element
- [ ] `subheadline` omitted (not placeholder-rendered) when null
- [ ] `contextLine` omitted when null (no empty row)
- [ ] `highlights` rendered in given order, never re-sorted
- [ ] `exerciseData` rendered only at Detailed; null elsewhere
- [ ] `athleteName` line omitted entirely when null (opt-out respected)
- [ ] `forgingSince` rendered only when non-null (opt-in respected)
- [ ] `date` always rendered at every level; reflects share-action date
- [ ] `appAttribution` always rendered, never gated by a toggle

### Text Snippet Generation
- [ ] Snippet is auto-generated, never athlete-authored
- [ ] Snippet is distinct from `WorkoutShare.athleteMessage`
- [ ] WSR-001's three canonical examples reproduced without alteration

### Ownership Boundaries
- [ ] Renderer never creates, modifies, or persists any entity
- [ ] Renderer never selects a destination or determines `shareType`
- [ ] Renderer never renders a squad check-in card
- [ ] Renderer never manages visibility or privacy
- [ ] No overlap with SH-1's control-surface responsibilities
- [ ] No overlap with S-2's check-in/reaction responsibilities

### MVP Scope Boundaries
- [ ] No link/public-recap output at MVP
- [ ] No photo rendering at MVP
- [ ] No new share types, detail levels, or destinations introduced
- [ ] No visual design system authored

### Integration Boundaries
- [ ] Renderer invoked by SH-1 only — at preview time and at Share-tap time
- [ ] Renderer hands off artifacts to the OS share sheet; does not manage delivery
- [ ] `externalSharedAt` semantics (set when OS share sheet opens) remain SH-1's responsibility, not the renderer's

---

## Section 14 — Lock Recommendation

**LOCKED.**

Every behavior in this document traces directly to WSR-001 (primary authority) or SH-1 (ownership/integration boundaries only); no new share types, templates, detail levels, destinations, or visual design decisions were introduced. OD-1 — the only gap found during the initial lock pass, concerning which template `RANK_UP` shares use — was resolved via a textual clarification to WSR-001 §7.1 (v1.0.1) stating that `RANK_UP` maps exclusively to the Rank Card, with this document's Section 4, Section 12 (SCR-D3), and Section 13 updated to match.

A final promotion-review lock pass re-verified the document end to end: full traceability to WSR-001, intact ownership boundaries (Section 10), correct SH-1 integration boundaries (Sections 2.2, 9), no remaining open decisions, no new architecture, and intact MVP scope boundaries (Section 3.4, Section 11). No issues were found. Approved for LOCKED status.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial. Extracted the Share Card Renderer component from WSR-001 §7 (External Share Architecture) and §14 (Downstream Impact: "Share card renderer" row), incorporating SH-1's ownership and integration boundaries (§1, §9). No new architecture introduced; closes the final unresolved WSR-001 downstream dependency. Initial lock pass found one gap (OD-1: no selection rule between the Achievement Card and Rank Card for `RANK_UP`) — confirmed as a genuine gap in WSR-001 itself, not an extraction error. Resolved via a textual clarification to WSR-001 §7.1 (v1.0.1: `RANK_UP` maps exclusively to the Rank Card). Final lock pass found no further issues. Approved for LOCKED status. Locked. |

---

*Forge Legacy Share Card Renderer Architecture*
*v1.0 — June 2026*
*Authority: WSR-001-Workout-Share-Result-Architecture.md (LOCKED); Share-Configuration-Step-Wireframe-Spec-SH1.md (LOCKED)*
*Status: LOCKED*
