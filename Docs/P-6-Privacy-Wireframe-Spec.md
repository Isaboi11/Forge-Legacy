# P-6 Privacy — Wireframe Specification
## Screen Specification: Privacy Settings
### June 2026

**Status:** LOCKED

**Type:** Screen Wireframe Specification

**Date:** June 2026

**Implements:** P-6-Privacy-Architecture.md v1.0 (LOCKED)

**Authority Chain:**
- P-6-Privacy-Architecture.md v1.0 (LOCKED) — setting inventory, ownership boundaries, visibility rules matrix
- Identity-Amendment-001 (LOCKED) — Section 7 (Privacy and Opt-Out Model) — owns Setting 1
- WSR-001-Workout-Share-Result-Architecture.md v1.0 (LOCKED) — Section 4 (Privacy Architecture), Section 8.3 (Share Configuration Step terminology) — owns Setting 2
- P-4-Settings-Root-Architecture.md v1.0 (LOCKED) / P-4-Settings-Root-Wireframe-Spec.md v1.0 (LOCKED) — entry point, modal stack behavior, pushed-screen header convention

**Downstream Dependents:** None. P-6 has no child screens and introduces no new entities — it reads and writes directly to Identity's and WSR-001's existing fields.

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Screen Purpose

P-6 Privacy hosts exactly two settings, each owned by a different existing system. P-6 does not unify them. This document preserves the distinction established in P-6-Privacy-Architecture.md §1:

- **Setting 1 (discoverability)** is owned by the **Identity system**. It governs whether non-squad athletes can find this athlete in search. Nothing else.
- **Setting 2 (sharing default)** is owned by **WSR-001**. It governs only the default value of `AthleteShareSettings.globalVisibility` read at the moment a new workout share is created. Nothing else.

There is no shared entity, no shared service, and no combined "privacy level" anywhere in this screen's design. Each row reads and writes its own owning system's field directly. This document names the owning authority next to each setting wherever it is described, specifically so this distinction cannot be lost during implementation.

---

## Section 2 — Navigation Entry & Modal Context

P-6 is entered exclusively via: **P-4 Settings Root → Privacy row → P-6.**

**Modal context (reused from P-4, unmodified):**
- P-6 pushes onto the same Profile modal navigation stack that P-4 itself is on. It is one level deeper than P-4 (P-1 → P-4 → P-6).
- The modal's handle bar and dimmed background persist behind P-6.

**Header treatment:** P-6 uses the same "‹ [Screen Name]" pushed-screen header convention as P-4 and P-1.1 Edit Profile: a back chevron (‹) followed by "Privacy," left-aligned, below the system status bar and modal handle bar.

- Tapping ‹ pops P-6 off the stack, returning to P-4 within the same modal session.
- Handle bar drag / dimmed-area tap dismisses the entire modal at any point, returning to the originating tab — unchanged from P-4's existing behavior.

---

## Section 3 — Layout Structure

```
┌─────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                               │
├─────────────────────────────────────────────────┤
│  ‹ Privacy                                       │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  Let non-squad athletes find me in search  [●━]  │
│                                                   │
│  Squad members can always find and interact      │
│  with you within shared squads.                  │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  Allow squad check-in cards                [━○]  │
│                                                   │
│  When turned on, you can choose to send a        │
│  check-in card to your squad each time you       │
│  share a workout. Your squad sees only a         │
│  summary — never your full workout details.      │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Two setting blocks, each structured identically:**
1. Label (15sp, primary text) + toggle switch, same row, toggle right-aligned — matches the row pattern already established on P-1 and P-4.
2. Supporting copy beneath the label (13sp, muted), persistent and always visible regardless of toggle state — not a transient confirmation message, not conditional on the toggle being on or off.

A hairline divider separates the two setting blocks. No divider above Setting 1 or below Setting 2 — the screen contains nothing else.

**Why no Save button:** Both toggles apply their effect immediately on tap. Unlike the Type Picker bottom sheet in P-1-Amendment-002 (which requires a deliberate Save because it triggers an async re-evaluation job), these two settings have no costly side effect — flipping either is a simple, instantly-reversible field write. A Save/Cancel step would add friction with no corresponding benefit.

**Scroll behavior:** The handle bar, [×] dismiss button, and "‹ Privacy" header are fixed; the content area scrolls if needed for accessibility text-scaling. At two setting blocks, this screen fits within a single viewport under normal conditions.

---

## Section 4 — Setting Detail

### 4.1 Setting 1 — Discoverability

| Field | Value |
|---|---|
| Label | "Let non-squad athletes find me in search" |
| Type | Toggle |
| Default | ON |
| Owning system | **Identity system** (Identity-Amendment-001 §7.1) |
| Behavior | Controls whether non-squad athletes can find this athlete via search (display name or username query). |
| Non-behavior | Does not affect squad member visibility in any way. |
| Supporting copy | "Squad members can always find and interact with you within shared squads." |

This setting has no relationship to Setting 2. Toggling it affects only search/lookup behavior for non-squad athletes — it has no effect on workout sharing, check-in cards, or anything WSR-001 governs.

### 4.2 Setting 2 — Sharing Default

| Field | Value |
|---|---|
| Label | "Allow squad check-in cards" |
| Type | Toggle |
| Default | OFF |
| Owning system | **WSR-001** (§4.1, §4.2, §8.3) |
| Behavior | OFF maps to `AthleteShareSettings.globalVisibility = PRIVATE`. ON maps to `SQUAD_ONLY`. This is the global default read at the moment a new `WorkoutShare` is created. |
| Non-behavior | Does not modify any existing `WorkoutShare` record (immutable after creation, per WSR-001 §4.2/§4.5). Does not override the per-share toggle inside the share configuration step — that remains a separate, athlete-controlled choice each time a workout is shared (WSR-001 §8.3). Does not affect native share sheet (external) sharing in any way — external sharing is always available regardless of this setting's state. Does not create or send any check-in card by itself — it only controls whether the per-share "share to squad" option is available to choose from. |
| Supporting copy | "When turned on, you can choose to send a check-in card to your squad each time you share a workout. Your squad sees only a summary — never your full workout details." |

**Label rationale:** "Allow squad check-in cards" was chosen over alternatives like "Share workouts with my squad" because the latter implies automatic, ongoing sharing. This setting does not share anything by itself — it only makes the squad-sharing *option* available within the existing per-share configuration flow (WSR-001 §8.3). The chosen label and supporting copy both use WSR-001's own established term, "check-in card," rather than introducing new vocabulary.

**PUBLIC exclusion:** This screen presents Setting 2 as a binary toggle (PRIVATE ↔ SQUAD_ONLY) because `globalVisibility = PUBLIC` remains a future tier per WSR-001's own Future Compatibility checklist. This screen does not reference, expose, or provide any path to PUBLIC.

---

## Section 5 — Empty States

**Not applicable.** Both settings render unconditionally for every athlete, every time, regardless of squad membership, subscription tier, or any other state. There is no loading state — toggle values are read synchronously from already-loaded athlete data — and no conditional content of any kind.

---

## Section 6 — Behavior Table

| Interaction | Behavior |
|---|---|
| Screen load | Both toggles render immediately, reflecting current stored values from their respective owning systems (Identity for Setting 1, WSR-001's `AthleteShareSettings` for Setting 2). |
| Tap Setting 1 toggle | Immediately flips the Identity-owned discoverability field. No confirmation, no Save step. Supporting copy beneath does not change. |
| Tap Setting 2 toggle | Immediately writes `AthleteShareSettings.globalVisibility` (PRIVATE ↔ SQUAD_ONLY). No confirmation, no Save step. Supporting copy beneath does not change — it is persistent, not a conditional confirmation message. |
| Toggle Setting 2 OFF after being ON | Future shares default to PRIVATE again. Any `WorkoutShare` records already created under SQUAD_ONLY remain unchanged (immutable per WSR-001). Existing squad check-in cards already delivered are not retracted. |
| Tap ‹ | Pops P-6 off the modal stack, returns to P-4. Both settings persist exactly as last set — there is nothing to discard, since both apply instantly. |
| Rotate device / resize | Layout reflows; no content changes. |
| Text-scaling accessibility setting increased | Content area scrolls if needed; header and dismiss controls remain fixed. |

---

## Section 7 — Navigation Table

| From | Action | To | Stack Behavior |
|---|---|---|---|
| P-4 | Tap Privacy row | P-6 | Push onto the Profile modal's stack (existing P-4 pattern, unmodified) |
| P-6 | Tap ‹ | P-4 | Pop off the modal stack |
| P-6 | Tap either toggle | — | No navigation. State changes in place. |
| P-6 | Drag handle bar / tap dimmed area | — | Dismisses entire Profile modal; returns to originating tab (existing P-1 behavior, unmodified) |

P-6 has no other navigation behavior. There are no child screens to navigate to.

---

## Section 8 — Accessibility Requirements

| Element | accessibilityLabel | accessibilityRole / Value | Notes |
|---|---|---|---|
| Back chevron (‹) | "Back" | — | "Returns to Settings" |
| Setting 1 toggle | "Let non-squad athletes find me in search" | `switch`; value "On" or "Off" | `accessibilityHint`: "Controls whether non-squad athletes can find you in search" |
| Setting 1 supporting copy | Read as static text immediately following the toggle | text | Not focusable as a separate interactive element |
| Setting 2 toggle | "Allow squad check-in cards" | `switch`; value "On" or "Off" | `accessibilityHint`: "Controls whether you can send check-in cards to your squad when sharing a workout" |
| Setting 2 supporting copy | Read as static text immediately following the toggle | text | Not focusable as a separate interactive element |

**Focus order:** Top to bottom — back chevron, Setting 1 toggle, Setting 1 supporting copy, Setting 2 toggle, Setting 2 supporting copy.

**Toggle state changes are announced** by the platform's standard switch-control accessibility behavior on activation (no custom announcement needed).

**Minimum tap targets:** Both toggle switches meet platform-standard minimum touch target size. Label text for each setting is also tappable to toggle, consistent with standard list-row toggle conventions, to avoid requiring a precise tap on the small switch control itself.

---

## Section 9 — Non-Behaviors

Explicit confirmation of what P-6 does **not** do, per the locked architecture and this task's screen constraints:

- No child screens — both settings are inline toggles on a single flat screen
- No additional toggles beyond the two specified
- No profile field visibility controls (accomplishments, athlete type, rank, forging-since) — deferred per P-1 §15
- No public profile controls — Future Roadmap only, no locked architecture exists
- No journey-sharing controls — Future Roadmap only, no locked architecture exists
- No squad discoverability controls — squads have no discovery surface to control (S-1)
- No legacy visibility controls — Legacy content has no exposure surface to control
- No honor visibility controls — Honors have no exposure surface to control beyond WSR-001's existing achievement check-in card mechanism, which is governed entirely by Setting 2 and the per-share flow, not a separate honor-specific control
- No goal visibility controls — same reasoning as honors
- No future placeholder controls or rows reserved for later expansion
- No shared entity, service, or "privacy level" abstraction unifying Setting 1 and Setting 2 — each reads/writes its own owning system's field independently
- No Save/Cancel step — both toggles apply instantly
- No empty states, loading states, or conditional rendering of any kind

---

## Section 10 — Validation Checklist

### Navigation Entry
- [ ] P-6 is reachable only via P-4 Settings Root → Privacy row
- [ ] P-6 pushes onto the same modal stack as P-4 (one level deeper than P-4)
- [ ] "‹ Privacy" header present, matching the established pushed-screen convention
- [ ] Tapping ‹ pops P-6 off the stack, returning to P-4 within the same modal session
- [ ] Handle bar drag / dimmed-area tap dismisses the entire modal at any point

### Layout & Content
- [ ] Exactly two setting blocks present, in order: discoverability, then sharing default
- [ ] Each setting block: label + toggle on one row, supporting copy beneath, persistent regardless of toggle state
- [ ] Hairline divider between the two setting blocks only
- [ ] No content beyond the two setting blocks
- [ ] No empty states — both settings render unconditionally

### Setting 1 — Discoverability
- [ ] Label exactly: "Let non-squad athletes find me in search"
- [ ] Default: ON
- [ ] Toggling writes only the Identity-owned discoverability field
- [ ] Supporting copy exactly: "Squad members can always find and interact with you within shared squads."
- [ ] No effect on Setting 2 or any WSR-001 behavior

### Setting 2 — Sharing Default
- [ ] Label exactly: "Allow squad check-in cards"
- [ ] Default: OFF
- [ ] Toggling writes only `AthleteShareSettings.globalVisibility` (OFF → PRIVATE, ON → SQUAD_ONLY)
- [ ] PUBLIC tier never referenced or exposed anywhere on this screen
- [ ] Supporting copy exactly: "When turned on, you can choose to send a check-in card to your squad each time you share a workout. Your squad sees only a summary — never your full workout details."
- [ ] Toggling does not modify any existing `WorkoutShare` record
- [ ] Toggling does not override the per-share toggle inside the share configuration step
- [ ] Toggling does not affect native share sheet (external) sharing
- [ ] Toggling ON does not itself create or send any check-in card
- [ ] No effect on Setting 1 or any Identity-system behavior

### Architectural Boundary
- [ ] No shared entity, enum, or service created to hold both settings
- [ ] Each setting's owning authority (Identity vs. WSR-001) is identifiable from the spec without cross-referencing external context
- [ ] No "privacy level" or combined on/off summary state exists anywhere on this screen

### Accessibility
- [ ] Both toggles have accessibilityLabel, accessibilityRole of switch, and accessibilityHint per Section 8
- [ ] Focus order matches visual top-to-bottom order
- [ ] Both supporting-copy blocks are read as static text, not focusable as separate controls
- [ ] Label text is tappable (not just the switch control) for both settings

---

## Section 11 — Open Issues

**None blocking.** All decisions required to fully specify P-6 are resolved by P-6-Privacy-Architecture.md (LOCKED) and this document.

Resolved during this spec pass (carried over from the architecture document's Open Questions):
- **Setting 2 final copy** — resolved: "Allow squad check-in cards," using WSR-001's own terminology (Section 4.2 above).
- **Inline confirmation copy on enabling Setting 2** — resolved: persistent supporting copy beneath the toggle serves this purpose; no separate transient confirmation message is needed.

Carried forward, not blocking P-6:
- Legal/analytics-disclosure controls (CCPA, ad-tracking opt-out) — no existing authority either way; a product/legal decision outside this screen's scope.
- Whether WSR-001's header should be lightly amended to remove "(future)" from its "P-settings (future: share preference surface)" downstream-impact note, now that this screen fulfills it — a small housekeeping cross-reference, not required for P-6 to function.

---

## Change Log

*No entries. v1.0 LOCKED.*

---

*P-6 Privacy — Wireframe Specification*
*Screen Specification: Privacy Settings*
*June 2026*
*Authority: P-6-Privacy-Architecture.md (LOCKED), Identity-Amendment-001 (LOCKED), WSR-001-Workout-Share-Result-Architecture.md (LOCKED), P-4-Settings-Root-Architecture.md (LOCKED), P-4-Settings-Root-Wireframe-Spec.md (LOCKED)*
*Status: LOCKED*
