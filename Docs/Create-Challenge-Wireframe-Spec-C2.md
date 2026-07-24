# Forge Legacy — Create Challenge Wireframe Specification
## C-2 | Challenge System | v1.1 — June 2026

**Status:** Lock-ready

**Type:** Screen Wireframe Specification

**Authority:** `Challenge-System-Architecture-v1.3.md` — CS-D1/D3 (context enum), CS-D5 (lifecycle/DRAFT→ENROLLMENT), CS-D6 (any member/any athlete creates), CS-D7 (enrollment, two roster sources), CS-D8 (5 types + MAX_LIFT target), CS-D9 (eligibility), CS-D13 (system Rules); `Challenge-Architecture-Amendment-003` v1.1 (CA3-D10 — Context step + Friends roster picker); `Friend-Relationship-Architecture-Amendment-001` (FR-D6 — eligibility = accepted Friends); `Comparison-Philosophy-Amendment-001` (CC-D1 four gates); `Squad-Architecture-Amendment-001` (SA-D3 creator role); Exercise Library / Identity-Amendment-001 (athlete search for the Friends picker).

**Amendment Log:** v1.1 — added the Context step (Squad / Friends) and the Friends roster picker (CA3-D10). v1.0 initial.

> **v1.1 reconciliation note (CA3-D10) — the Context step:** C-2 now opens with a **Context step** before the existing fields: the creator chooses **"Squad"** or **"Friends"** (`Challenge.context`, immutable after creation). **Squad** = the current behavior in this spec (the challenge binds to the current `squadId`; squad members opt in). **Friends** = the challenge has **no `squadId`**; selecting it reveals a **roster picker** — an athlete search (Identity-Amendment-001) restricted to the creator's **existing accepted Friends** (FR-D6), from which the creator builds an invite list. Each invited Friend must still **explicitly opt into the challenge** (friendship alone never enrolls). The scope-affirmation line (§4.6) reads context-appropriately: "Squad-only · …" for Squad, "Friends-only · invited friends choose to join" for Friends. The four CC-D1 gates are unchanged — gate 1 is now "private to an opted-in bounded roster (Squad **or** invited Friends)" per CC-D1 v1.1 / CA3-D2; opt-in, roster-lock-at-start, and bounded duration are identical in both contexts. All other fields (name/type/duration/description/system Rules) are unchanged. Pixel layout of the Context step + roster picker is deferred to a later wireframe revision; no change to the existing fields' behavior.

---

## Preamble: What C-2 Is For

C-2 lets any squad member author a challenge. It answers: **"What competition do I want to start, and on what terms?"**

The four CC-D1 gates are enforced *structurally* by this screen: the challenge is bound to the current squad (squad-scoped), it will require opt-in (no auto-enroll — not even the creator), it will roster-lock at start, and it must have a bounded duration. C-2 cannot produce a challenge that violates any gate.

C-2 is deliberately small: name, type, duration, optional description. The Rules (scoring method, eligibility, tie-breakers) are **system-generated** from the type (CS-D13) — the creator never writes rules, which guarantees objective, consistent competition.

---

## Section 1 — C-2 Goals

1. **Capture the four required inputs:** name, type, duration, (and for MAX_LIFT, an optional target exercise).
2. **Enforce the four gates** structurally — no path produces a public, cross-squad, always-on, or auto-enrolled challenge.
3. **Publish to ENROLLMENT** — the challenge opens for squad opt-in.

**What C-2 does NOT do:**
- Let the creator write scoring rules (system-generated).
- Enroll anyone, including the creator (creating ≠ joining, CS-D6 note 4).
- Set visibility (always squad-scoped; no visibility control exists).

---

## Section 2 — Information Hierarchy

**TIER 1 — Challenge Name** (required) → **TIER 2 — Challenge Type** (required, drives Rules) → **TIER 3 — Duration** (required) → **TIER 4 — Description** (optional) → **TIER 5 — Rules preview** (read-only, system-generated) → **TIER 6 — Publish CTA.**

---

## Section 3 — Full Scroll Order

Navigation-stack screen entered from C-1. Top App Bar: [✕] cancel + "New Challenge" + (no save until valid).

```
┌─────────────────────────────────────────────────────────┐
│  [✕]  New Challenge                                      │
├─────────────────────────────────────────────────────────┤
│  CHALLENGE NAME                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ e.g. No Excuses June                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  TYPE                                                   │
│  ( ) Most Workouts        ( ) Most Volume               │
│  ( ) Max Lift             ( ) Most Duration             │
│  ( ) Most PRs                                           │
│   └─[ if Max Lift ]→ Target Exercise (optional)  [Any ▾]│
│                                                         │
│  DURATION                                               │
│  [ Daily ] [ Weekly ] [ Monthly ] [ Custom ]            │
│   └─[ if Custom ]→ Start [date]   End [date]            │
│                                                         │
│  DESCRIPTION  (Optional)                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  RULES  (auto-generated)                                │
│  Scoring: Most total workouts logged during the window. │
│  Eligible: Workouts logged by joined members, in window.│
│  Tie-breaker: Earliest to reach the score.              │
│                                                         │
│  Squad-only · You'll choose to join like everyone else. │
│                                                         │
│  [          Publish — Open for Enrollment          ]    │
└─────────────────────────────────────────────────────────┘
```

---

## Section 4 — Field Architecture

### 4.1 Challenge Name (required)
- Text input; 1–40 chars recommended; required to publish. Inline error if empty on publish: "Give your challenge a name."

### 4.2 Type (required, single-select)
Five options (CS-D8): **Most Workouts, Most Volume, Max Lift, Most Duration, Most PRs.** Selecting a type updates the Rules preview live.

- **Max Lift → Target Exercise (optional):** when Max Lift is selected, a "Target Exercise" picker appears, defaulting to **"Any lift."** Tapping opens the canonical exercise picker (Exercise Library; CUSTOM excluded per AD-28c / CS-D8). Selecting an exercise scopes the contest ("heaviest [Exercise]"). Leaving "Any lift" scores the heaviest single set on any tracked lift.
- `RANK_XP` is **not offered** — deferred (CS-D11). It does not appear as a type.

### 4.3 Duration (required)
- Presets: Daily, Weekly, Monthly. **Custom** reveals Start and End date pickers.
- Validation: end must be after start; start may be now or future (start defines roster lock, CS-D5). Custom range must be ≥ 1 day.
- The chosen duration sets `startAt` / `endAt`; `enrollmentOpensAt` = publish time (enrollment opens immediately, CS-D7).

### 4.4 Description (optional)
- Multi-line, optional. Absent if not provided (no placeholder downstream).

### 4.5 Rules preview (read-only, system-generated — CS-D13)
- Live-updates from the selected type. Three lines: **Scoring Method**, **Eligibility** (joined members, in-window, partial counts/discarded don't — CS-D9), **Tie-breaker** (CS-D15). Not editable.

### 4.6 Scope affirmation line
A fixed, non-interactive line: "Squad-only · You'll choose to join like everyone else." Makes the squad-scope + opt-in gates visible. No visibility control is shown because none exists (CC-D1).

---

## Section 5 — Publish

- **Publish CTA** disabled until name + type + valid duration are set.
- On publish: `Challenge` created in **ENROLLMENT** state, bound to the current `squadId`, `creatorAthleteId` = this athlete. **Creator is not auto-joined** (CS-D6 n4).
- Navigates to **C-3 Challenge Detail** (enrollment state) for the new challenge.
- A challenge-created event posts to the in-app Challenge Feed (CS-D21, bounded; no failure push).

---

## Section 6 — Navigation Paths

| Action | Destination |
|---|---|
| [✕] Cancel | Discard confirmation if any field touched → C-1; else straight to C-1 |
| Target Exercise picker | Canonical Exercise picker (modal) → returns to C-2 |
| Custom duration | Reveals inline date pickers (no navigation) |
| Publish | C-3 Challenge Detail (ENROLLMENT) for the created challenge |

---

## Section 7 — State Rules

| Condition | Behavior |
|---|---|
| Name empty | Publish disabled; inline error on attempt |
| Type unselected | Publish disabled; Rules preview shows neutral placeholder |
| Max Lift selected | Target Exercise picker appears (defaults "Any lift") |
| Custom duration, invalid range | Publish disabled; inline error "End must be after start" |
| Valid form | Publish enabled |
| Published | Challenge enters ENROLLMENT; creator not enrolled |

---

## Section 8 — Empty / Error / Edge States

| # | Case | Behavior |
|---|---|---|
| 8.1 | Back/cancel with unsaved input | Discard confirmation ("Discard this challenge?") |
| 8.2 | Squad at member churn (member leaves during creation) | No effect — roster is drawn at join time, not creation |
| 8.3 | Network failure on publish | Inline error toast; form preserved; retry |
| 8.4 | Squad deleted mid-creation | On publish failure, resolve to S-1; challenge not created |
| 8.5 | Duplicate challenge name in squad | Allowed — names are not unique (parallels squad display-name non-uniqueness) |
| 8.6 | Creator wants to compete too | Creator joins separately via C-3 "Join" — creating never auto-enrolls |

---

## Section 9 — Firewall & Anti-Shame Compliance

- [ ] No public/audience control exists — challenge is **roster-scoped by construction** (Squad or invited Friends; CC-D1 gate 1 v1.1 / CA3-D2). The Context step chooses the roster *source*, never a public/visibility setting.
- [ ] No auto-enroll mechanism — opt-in only, including for the creator (gate 2).
- [ ] Duration is required — no always-on challenge can be created (gate 4); roster locks at start (gate 3).
- [ ] Creator role is challenge-scoped; C-2 confers no squad-governance power (SA-D3).
- [ ] RANK_XP not offered (CS-D11).
- [ ] C-2 writes only challenge data; no contamination of squad surfaces.

---

## Section 10 — Mobile UX

- Portrait only. Form scrolls; Publish CTA scrolls with content (not sticky) or pinned per platform form convention.
- Tap targets ≥ 44dp; radio options ≥ 44dp rows; date pickers native.
- Accessibility: each field labeled; type radios as a labeled group; Rules preview announced as read-only summary.

---

## Section 11 — Validation Checklist

- [ ] Inputs: name (required), type (required, 5 options incl. Max Lift), duration (Daily/Weekly/Monthly/Custom), description (optional)
- [ ] Max Lift reveals optional Target Exercise picker (canonical only, CUSTOM excluded; default "Any lift")
- [ ] RANK_XP not offered
- [ ] Rules block is system-generated, read-only, live-updates with type
- [ ] Scope affirmation line present; no visibility control
- [ ] Publish disabled until valid; custom range validated (end > start)
- [ ] On publish: ENROLLMENT state, bound to squad, creator not auto-joined → C-3
- [ ] Discard confirmation on cancel with unsaved input
- [ ] Firewall/gate items (§9) satisfied
- [ ] Portrait; tap targets ≥ 44dp

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.1 | June 2026 | Participant-based reconciliation (CA3-D10): added the **Context step (Squad / Friends)** and the **Friends roster picker** (athlete search over the creator's accepted Friends, FR-D6); Friends context creates a challenge with no `squadId`; scope-affirmation line is context-aware; gate 1 relaxed to "roster-scoped by construction" (CC-D1 v1.1). All existing fields unchanged. Authority updated to v1.3. Pixel layout of the Context step/picker deferred. |
| 1.0 | June 2026 | Initial. Create Challenge form: name/type/duration/description with MAX_LIFT optional target-exercise scoping; system-generated read-only Rules; four CC-D1 gates enforced structurally (squad-only, opt-in incl. creator, roster-lock-at-start, bounded duration); RANK_XP omitted (deferred). Publish → ENROLLMENT → C-3. |

---

*Forge Legacy — Create Challenge Wireframe Specification — C-2*
*v1.1 — June 2026 (Context step: Squad / Friends)*
*Authority: Challenge-System-Architecture-v1.0.md (v1.5), Challenge-Architecture-Amendment-003 v1.1, Friend-Relationship-Architecture-Amendment-001 (and governing Challenge amendments)*
*Status: Lock-ready*
