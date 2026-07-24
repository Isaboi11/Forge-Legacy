# P-5 Notifications — Wireframe Specification
## Screen Specification: Notification Preferences
### June 2026

**Status:** LOCKED

**Type:** Screen Wireframe Specification

**Date:** June 2026

**Implements:** P-5-Notifications-Architecture.md v1.4 (LOCKED)

**Authority Chain:**
- P-5-Notifications-Architecture.md v1.4 (LOCKED) — notification inventory, settings inventory, grouping decision, state matrix
- Squad-System-Architecture-v1.0 (LOCKED) — Squad Feed Activity / Squad Reactions & Mentions scope expansion, Squad Goal & Mission Updates
- WSR-001-Workout-Share-Result-Architecture.md (LOCKED) — original Squad Check-ins, Squad Reactions fields (now relabeled)
- Workout-With-Friend-Spec-WwF.md (LOCKED) — Workout Tags (M-8, M-9)
- Squads-Hub-Wireframe-Spec-S1.md / Squad-Management-Permissions-Spec-S3.md (LOCKED) — Squad Invitations, squad ownership transfer, squad deletion
- P-4-Settings-Root-Architecture.md v1.0 (LOCKED) / P-4-Settings-Root-Wireframe-Spec.md v1.0 (LOCKED) — entry point, modal stack behavior, pushed-screen header convention

**Downstream Dependents:** None. P-5 has no child screens.

**Amendment Log:** v1.1 — Section A reconciled to `P-5-Notifications-Architecture.md` v1.4 / `Squad-System-Architecture-v1.0`: "Squad Check-ins" → **Squad Feed Activity**, "Squad Reactions" → **Squad Reactions & Mentions** (relabeled, same fields), and a new **Squad Goal & Mission Updates** toggle added. Squad Activity is now three rows. **Note:** this wireframe predates the architecture's Sections C (Challenges), D (Friend Requests), and E (Communities) — that gap is pre-existing and not introduced by this revision; it is flagged in Section 11 as a standing follow-up, not resolved here. v1.0 LOCKED initial.

---

## Section 1 — Screen Purpose

P-5 Notifications controls **push delivery only**. It does not control, hide, or condition any underlying in-app surface or data — Squad Feed entries, workout tag action cards, and pending invitations all exist and remain visible in their native surfaces (S-2, W-1, S-3) regardless of what an athlete sets here. P-5 governs whether a push notification *accompanies* those surfaces, nothing more.

As of v1.1, Squad Activity contains **three** toggles, grouped with Requests by what kind of notification they are — passive activity broadcasts (Squad Activity) versus direct requests awaiting a response (Requests) — plus one non-toggleable informational note for notifications that are never optional (Required Updates).

P-5 contains no per-ceremony controls. Rank-ups, honors, goal achievements, program graduations, and Squad Honors never produce a push notification directly (each is confirmed in its own locked spec, or — for Squad Honors — `Squad-System-Architecture-v1.0` SQ-D10, as an in-app-only M-2 modal) — the only path any of them reaches a notification is through Squad Feed Activity, which already covers all of WSR-001's share types and the Squad Feed's workout/PR/video-check-in events uniformly. There is no additional control to add for these on this screen.

---

## Section 2 — Navigation Entry & Modal Context

P-5 is entered exclusively via: **P-4 Settings Root → Notifications row → P-5.**

- Pushes onto the same Profile modal navigation stack P-4 itself is on, identical to P-6 and P-8's entry behavior.
- Header: "‹ Notifications" — the same pushed-screen convention used by P-6, P-8 (via P-4), and P-1.1 Edit Profile. Tapping ‹ pops P-5 off the stack, returning to P-4.
- Handle bar drag / dimmed-area tap dismisses the entire Profile modal at any point, unchanged from existing behavior.

---

## Section 3 — Layout Structure

```
┌─────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                               │
├─────────────────────────────────────────────────┤
│  ‹ Notifications                                 │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  SQUAD ACTIVITY                                  │
│                                                   │
│  Squad Feed Activity                        [─○] │
│  Notify you about workout completions,           │
│  PRs, and video check-ins in your squad.         │
│                                                   │
│  Squad Reactions & Mentions                 [─○] │
│  Notify you when your squad reacts to or         │
│  mentions you on something you shared.           │
│                                                   │
│  Squad Goal & Mission Updates               [─○] │
│  Notify you about squad goals, missions,         │
│  and daily check-in completion.                  │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  REQUESTS                                        │
│                                                   │
│  Workout Tags                               [●─] │
│  Notify you when someone tags you in a           │
│  workout.                                        │
│                                                   │
│  Squad Invitations                          [●─] │
│  Notify you when you're invited to a squad.      │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  REQUIRED UPDATES                                │
│                                                   │
│  Squad ownership changes and squad                │
│  deletions are always delivered and              │
│  can't be turned off.                             │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Section header treatment:** "SQUAD ACTIVITY," "REQUESTS," and "REQUIRED UPDATES" render as 11sp, muted, all-caps labels — the same section-label convention used elsewhere in the app (e.g., L-1's "PHOTOS [N]" pattern). They are navigational/organizational labels only, not interactive.

**Row structure (Squad Activity, Requests):** label (15sp, primary text) + toggle switch on the same row, toggle right-aligned — the same pattern established on P-1, P-4, and P-6. Supporting copy (13sp, muted) renders beneath each label, persistent regardless of toggle state — not a transient confirmation message.

**Required Updates section:** no toggle, no label/value row — a single block of static, muted-but-readable text. This section is visually distinct from the two toggle sections above it (no switch control anywhere in this block) to avoid implying it's configurable.

**Why no Save button:** Consistent with P-6's precedent — every toggle here applies its effect immediately on tap. None has a costly side effect; each is a simple, instantly-reversible field write. A Save/Cancel step would add friction with no corresponding benefit.

**Scroll behavior:** The handle bar, [×] dismiss button, and "‹ Notifications" header are fixed; the content area scrolls if needed for accessibility text-scaling. At five toggles plus one informational block, this screen fits within a single viewport under normal conditions.

---

## Section 4 — Setting Detail

### 4.1 Section A — Squad Activity

#### Squad Feed Activity *(v1.1 — relabeled from "Squad Check-ins")*

| Field | Value |
|---|---|
| Label | "Squad Feed Activity" |
| Type | Toggle |
| Default | OFF |
| Owning system | `AthleteShareSettings.squadNotificationsEnabled` (same field as the prior "Squad Check-ins" toggle — no schema change) |
| Behavior | Controls whether a push notification accompanies a Squad Feed entry: a workout completion, PR, or video check-in posted to this athlete's squad (`Squad-System-Architecture-v1.0` SQ-D9), or any remaining WSR-001 share type shared to a squad. |
| Non-behavior | Does not control whether the Feed entry itself is created. Does not affect any other athlete's notification preferences. |
| Supporting copy | "Notify you about workout completions, PRs, and video check-ins in your squad." |

#### Squad Reactions & Mentions *(v1.1 — relabeled from "Squad Reactions")*

| Field | Value |
|---|---|
| Label | "Squad Reactions & Mentions" |
| Type | Toggle |
| Default | OFF |
| Owning system | `AthleteShareSettings.reactionsNotificationEnabled` (same field as the prior "Squad Reactions" toggle — no schema change) |
| Behavior | Controls whether this athlete receives a bundled push notification when one or more squad members react to or @-mention them on a Squad Feed entry. Capped at one notification per 24 hours per entry, per WSR-001 §6.4 (cap carried forward unchanged). |
| Non-behavior | Does not control whether reactions or mentions themselves can be left — that is Squad Feed functionality, unaffected by this toggle. |
| Supporting copy | "Notify you when your squad reacts to or mentions you on something you shared." |

#### Squad Goal & Mission Updates *(v1.1, new)*

| Field | Value |
|---|---|
| Label | "Squad Goal & Mission Updates" |
| Type | Toggle |
| Default | OFF |
| Owning system | A new squad-systems notification preference (`Squad-System-Architecture-v1.0` SQ-D12) |
| Behavior | Controls whether this athlete receives a push notification when: the squad's active Goal is completed; a new Mission starts or the active Mission is ending soon; or every current squad member has checked in for the day. |
| Non-behavior | Does not affect whether the Current Goal card, Current Mission card, or Today's Check-ins card (S-2 §§15–17) reflect current state — those always do, regardless of this toggle. |
| Supporting copy | "Notify you about squad goals, missions, and daily check-in completion." |

**Reconciliation note — Competition and Honors are not rows here.** Squad competition start/end notifications route through the existing Challenge-related toggle this document's architecture defines (P-5-Notifications-Architecture.md §3.2a) — out of this wireframe's current scope (Section 11). Squad Honors Earned is not a notification at all; it surfaces only via the M-2 modal, per the standing Ceremonies-are-not-notifications rule.

### 4.2 Section B — Requests

#### Workout Tags

| Field | Value |
|---|---|
| Label | "Workout Tags" |
| Type | Toggle |
| Default | **ON** |
| Owning system | A workout-tag notification preference, covering both M-8 (squad member tags) and M-9 (non-squad athlete tags) uniformly |
| Behavior | Controls whether this athlete receives a push notification when tagged in a workout by a squad member or a non-squad athlete. |
| Non-behavior | Does not affect whether the W-1 action card (Unclaimed Workout / Pending Approval) appears — that card always appears regardless of this toggle's state. Does not affect the tagger's own experience or notifications in any way. |
| Supporting copy | "Notify you when someone tags you in a workout." |

#### Squad Invitations

| Field | Value |
|---|---|
| Label | "Squad Invitations" |
| Type | Toggle |
| Default | **ON** |
| Owning system | A squad-invitation notification preference |
| Behavior | Controls whether this athlete receives a push notification when invited to join a squad. |
| Non-behavior | Does not affect whether the invitation appears in S-3's pending invitations list — that list is independent of notification delivery. Does not affect the inviter's experience. |
| Supporting copy | "Notify you when you're invited to a squad." |

**Why both default ON:** A tag or an invitation is a direct request awaiting the athlete's response — missing it defeats the purpose of the feature it belongs to. This is a different risk profile than Section A's passive activity broadcasts, which default OFF to avoid unsolicited noise.

### 4.3 Section C — Required Updates (Non-Toggleable)

| Field | Value |
|---|---|
| Content | Squad ownership transfer notifications and squad deletion notifications |
| Type | Informational text only — no toggle, no control |
| Behavior | Always delivered. Cannot be muted from this screen or anywhere else. |
| Rationale | Both events are rare, structurally important, and low-volume. Silencing them could leave an athlete confused about why a squad disappeared or who is now responsible for it. |
| Displayed copy | "Squad ownership changes and squad deletions are always delivered and can't be turned off." |

---

## Section 5 — Empty States

**Not applicable.** All five toggles and the Required Updates note render unconditionally for every athlete, every time, regardless of squad membership, subscription tier, or any other state. There is no loading state and no conditional content.

---

## Section 6 — Toggle Behavior Table

| Interaction | Behavior |
|---|---|
| Screen load | All five toggles render immediately, reflecting current stored values (Squad Feed Activity / Squad Reactions & Mentions from `AthleteShareSettings`; Squad Goal & Mission Updates from its own preference field; Workout Tags / Squad Invitations from their respective preference fields). Required Updates note always renders, unconditionally. |
| Tap Squad Feed Activity | Immediately writes `squadNotificationsEnabled`. No confirmation, no Save step. Supporting copy beneath does not change. |
| Tap Squad Reactions & Mentions | Immediately writes `reactionsNotificationEnabled`. No confirmation, no Save step. |
| Tap Squad Goal & Mission Updates | Immediately writes the squad-goal-and-mission notification preference. No confirmation, no Save step. |
| Tap Workout Tags | Immediately writes the workout-tag notification preference. No confirmation, no Save step. |
| Tap Squad Invitations | Immediately writes the squad-invitation notification preference. No confirmation, no Save step. |
| Toggle any setting OFF | Push notifications of that type stop. The underlying in-app surface (check-in card, W-1 action card, S-3 pending invitation) is entirely unaffected and continues to appear normally. |
| Toggle any setting back ON | Push notifications of that type resume for future events. No retroactive notification is sent for events that occurred while the toggle was off. |
| Tap ‹ | Pops P-5 off the modal stack, returns to P-4. All settings persist exactly as last set — nothing to discard, since every toggle applies instantly. |
| Rotate device / resize | Layout reflows; no content changes. |
| Text-scaling accessibility setting increased | Content area scrolls if needed; header and dismiss controls remain fixed. |

---

## Section 7 — Navigation Table

| From | Action | To | Stack Behavior |
|---|---|---|---|
| P-4 | Tap Notifications row | P-5 | Push onto the Profile modal's stack (existing P-4 pattern, unmodified) |
| P-5 | Tap ‹ | P-4 | Pop off the modal stack |
| P-5 | Tap any toggle | — | No navigation. State changes in place. |
| P-5 | Drag handle bar / tap dimmed area | — | Dismisses entire Profile modal; returns to originating tab (existing P-1 behavior, unmodified) |

P-5 has no other navigation behavior. There are no child screens.

---

## Section 8 — Accessibility Requirements

| Element | accessibilityLabel | accessibilityRole / Value | Notes |
|---|---|---|---|
| Back chevron (‹) | "Back" | — | "Returns to Settings" |
| Section headers | "Squad Activity", "Requests", "Required Updates" | header | Announced as section headers, not interactive |
| Squad Feed Activity toggle | "Squad Feed Activity" | `switch`; value "On"/"Off" | `accessibilityHint`: "Notifies you about workout completions, PRs, and video check-ins in your squad" |
| Squad Reactions & Mentions toggle | "Squad Reactions & Mentions" | `switch`; value "On"/"Off" | `accessibilityHint`: "Notifies you when your squad reacts to or mentions you on something you shared" |
| Squad Goal & Mission Updates toggle | "Squad Goal & Mission Updates" | `switch`; value "On"/"Off" | `accessibilityHint`: "Notifies you about squad goals, missions, and daily check-in completion" |
| Workout Tags toggle | "Workout Tags" | `switch`; value "On"/"Off" | `accessibilityHint`: "Notifies you when someone tags you in a workout" |
| Squad Invitations toggle | "Squad Invitations" | `switch`; value "On"/"Off" | `accessibilityHint`: "Notifies you when you're invited to a squad" |
| Supporting copy (all five) | Read as static text immediately following each toggle | text | Not focusable as a separate interactive element |
| Required Updates text | Read as static text | text | Not focusable as an interactive element; no `switch` role anywhere in this block |

**Focus order:** Top to bottom — back chevron, Squad Activity header, Squad Feed Activity toggle + copy, Squad Reactions & Mentions toggle + copy, Squad Goal & Mission Updates toggle + copy, Requests header, Workout Tags toggle + copy, Squad Invitations toggle + copy, Required Updates header, Required Updates text.

**Minimum tap targets:** All five toggle switches meet platform-standard minimum touch target size. Label text for each setting is also tappable to toggle, consistent with P-6's established convention, to avoid requiring a precise tap on the small switch control itself.

---

## Section 9 — Non-Behaviors

Explicit confirmation of what P-5 does **not** do, per the locked architecture and this task's constraints:

- No child screens — all five toggles and the informational note live on a single flat screen.
- No in-app notification tray or center — this was explicitly considered and rejected elsewhere (P-2-Progress-Hub-Spec.md §2) and is not reconsidered here.
- No marketing or re-engagement notification controls — none exist anywhere in the locked docs, and none are introduced here.
- No per-ceremony notification controls — rank-ups, honors (including Squad Honors), goal achievements, and program graduations never fire a push notification directly; there is nothing to toggle for them individually.
- No per-share-type notification matrix — Squad Feed Activity covers all of WSR-001's share types plus the Squad Feed's workout/PR/video-check-in events with a single toggle. This screen does not split that into separate rows.
- No row for squad Competition started/ended — that routes through the Challenge-related toggle defined in the architecture (P-5-Notifications-Architecture.md §3.2a), out of this wireframe's current scope (Section 11).
- No administrative, account, or security notification controls — none exist anywhere in the locked docs.
- No toggle hides or conditions any underlying in-app surface or data. Squad Feed entries, the Today's Check-ins card, the Current Goal/Mission cards (S-2), workout tag action cards (W-1), and pending squad invitations (S-3) are always present in their native surfaces regardless of any setting on this screen.
- No toggle exists for squad ownership transfer or squad deletion notifications — both are always delivered, by design, per Section 4.3.
- No Save/Cancel step — every toggle applies instantly.
- No empty states, loading states, or conditional rendering of any kind.
- This document does not redesign WSR-001, WwF, or Squad architecture — it only exposes existing or newly-named preference fields as toggles on a settings screen.

---

## Section 10 — Validation Checklist

### Navigation Entry
- [ ] P-5 is reachable only via P-4 Settings Root → Notifications row
- [ ] P-5 pushes onto the same modal stack as P-4
- [ ] "‹ Notifications" header present, matching the established pushed-screen convention
- [ ] Tapping ‹ pops P-5 off the stack, returning to P-4 within the same modal session
- [ ] Handle bar drag / dimmed-area tap dismisses the entire modal at any point

### Layout & Content
- [ ] Three sections present, in order: Squad Activity, Requests, Required Updates
- [ ] Squad Activity contains exactly three toggles: Squad Feed Activity (OFF), Squad Reactions & Mentions (OFF), Squad Goal & Mission Updates (OFF)
- [ ] Requests contains exactly two toggles: Workout Tags (ON), Squad Invitations (ON)
- [ ] Required Updates contains no toggle — static text only
- [ ] Each toggle row: label + switch on one row, supporting copy beneath, persistent regardless of toggle state
- [ ] Section headers render as muted, all-caps labels, non-interactive
- [ ] No content beyond the five toggles and the Required Updates note

### Squad Feed Activity
- [ ] Label exactly: "Squad Feed Activity"; default OFF
- [ ] Toggling writes only `squadNotificationsEnabled`
- [ ] Supporting copy exactly: "Notify you about workout completions, PRs, and video check-ins in your squad."
- [ ] Does not affect whether the Squad Feed entry itself is created

### Squad Reactions & Mentions
- [ ] Label exactly: "Squad Reactions & Mentions"; default OFF
- [ ] Toggling writes only `reactionsNotificationEnabled`
- [ ] Supporting copy exactly: "Notify you when your squad reacts to or mentions you on something you shared."

### Squad Goal & Mission Updates
- [ ] Label exactly: "Squad Goal & Mission Updates"; default OFF
- [ ] Toggling writes the squad-goal-and-mission notification preference (field name deferred to backend, per the existing §3.2 naming precedent)
- [ ] Supporting copy exactly: "Notify you about squad goals, missions, and daily check-in completion."
- [ ] Does not affect whether the Current Goal, Current Mission, or Today's Check-ins cards (S-2 §§15–17) render

### Workout Tags
- [ ] Label exactly: "Workout Tags"; default ON
- [ ] Covers both M-8 (squad) and M-9 (non-squad) tag notifications with a single toggle
- [ ] Supporting copy exactly: "Notify you when someone tags you in a workout."
- [ ] Does not affect W-1 action card visibility

### Squad Invitations
- [ ] Label exactly: "Squad Invitations"; default ON
- [ ] Supporting copy exactly: "Notify you when you're invited to a squad."
- [ ] Does not affect S-3 pending invitations list visibility

### Required Updates
- [ ] No toggle present anywhere in this section
- [ ] Displayed copy exactly: "Squad ownership changes and squad deletions are always delivered and can't be turned off."
- [ ] Squad ownership transfer notifications always fire, unconditionally
- [ ] Squad deletion notifications always fire, unconditionally

### Architectural Boundary
- [ ] No toggle on this screen hides or conditions any underlying in-app surface (S-2 check-in cards, W-1 action cards, S-3 pending invitations)
- [ ] No per-ceremony toggle exists (no Rank Up, Honor, Goal, or Program Graduation row)
- [ ] No per-share-type breakdown of Squad Check-ins exists
- [ ] No administrative/marketing/security notification row exists

### Accessibility
- [ ] All five toggles have accessibilityLabel, accessibilityRole of switch, and accessibilityHint per Section 8
- [ ] Focus order matches visual top-to-bottom order
- [ ] All supporting-copy blocks and the Required Updates text are read as static text, not focusable as separate controls
- [ ] Label text is tappable (not just the switch control) for all five toggles

---

## Section 11 — Open Issues

**Not blocking this revision.** Section A (Squad Activity) is fully reconciled to `P-5-Notifications-Architecture.md` v1.4.

**Pre-existing gap, flagged not resolved here:** this wireframe was never updated alongside the architecture's Section C (Challenges), Section D (Friend Requests), and Section E (Communities) additions — it still shows only the original Squad Activity / Requests / Required Updates layout. That drift predates this revision and is out of scope for the Squad System Architecture reconciliation; it is recorded here as a standing follow-up for the next full P-5 wireframe pass, consistent with this project's "amendment locked but never reconciled" pattern audits.

Carried forward, not blocking P-5:
- **Field naming for Workout Tags, Squad Invitations, and Squad Goal & Mission Updates preferences** — explicitly deferred to backend/data architecture, consistent with the P-8 precedent. This document states only that each concept must exist and be readable/writable by P-5.
- **Administrative/account notifications** — confirmed absent from every locked document; not proposed here. Flagged as a possible future need (e.g., policy-change disclosures) but explicitly out of scope until some other document locks it.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.1 | June 2026 | `Squad-System-Architecture-v1.0.md` (LOCKED) SQ-D12 / `P-5-Notifications-Architecture.md` v1.4 reconciled into Section A: "Squad Check-ins" → **Squad Feed Activity**, "Squad Reactions" → **Squad Reactions & Mentions** (relabeled, same backing fields), new **Squad Goal & Mission Updates** toggle added (default OFF). Layout (§3), setting detail (§4.1), toggle behavior (§6), accessibility (§8), non-behaviors (§9), and validation checklist (§10) updated. Flagged, not resolved: this wireframe's pre-existing gap relative to the architecture's Sections C/D/E (§11). |
| 1.0 | June 2026 | Initial. |

---

*P-5 Notifications — Wireframe Specification*
*Screen Specification: Notification Preferences*
*June 2026*
*Authority: P-5-Notifications-Architecture.md v1.4 (LOCKED), WSR-001-Workout-Share-Result-Architecture.md (LOCKED), Workout-With-Friend-Spec-WwF.md (LOCKED), Squads-Hub-Wireframe-Spec-S1.md (LOCKED), Squad-Management-Permissions-Spec-S3.md (LOCKED), P-4-Settings-Root-Architecture.md (LOCKED), P-4-Settings-Root-Wireframe-Spec.md (LOCKED), Squad-System-Architecture-v1.0 (LOCKED)*
*Status: LOCKED*
