# Forge Legacy — Full MVP Architecture Audit
## v1.0 — June 2026

**Scope:** All locked Phase 2B specifications, amendments, and PRD  
**Method:** Three parallel domain audits (Core/Onboarding/Identity/Goals; Workouts/Programs; Legacy/Profile/Squads/Monetization) synthesized into a single report  
**Purpose:** Identify contradictions, missing ownership, missing navigation, state conflicts, monetization conflicts, data model risks, Product DNA violations, and missing implementation dependencies. No new features proposed.

---

## Executive Summary

Phase 2B architecture is philosophically sound and the specced portions are detailed, well-reasoned, and internally consistent. The Product DNA is clear, the amendment model is mature, and the major systems that ARE specced (onboarding, programs, active workouts, goals, squads root/detail/settings) are production-quality.

However, the audit reveals three structural problems that prevent engineering from beginning:

**1. The Legacy system — the core product — is mostly unspecced.** L-1 (Legacy Hub), the root screen of the product's most important tab, has no spec file. L-5 (post-onboarding chapter creation), L-6 (chapter reflection), and L-9 through L-16 (the full legacy detail system) are all missing. The chapter completion flow is architecturally broken because L-6 does not exist.

**2. Thirty or more MVP screens have no spec files.** H-1 (Home), L-1, P-2 through P-8, S-10, W-8, W-18, W-19, M-1 through M-9, and the full import screen set (W-IM-1 through W-IM-4 as dedicated specs) are all referenced across the system but never written.

**3. Three architecture decisions remain unresolved that block specific system implementations.** Goal progress update mechanism (manual vs. automatic), chapter-program interaction at archival, and the squad creation limit conflict with S-1 must be resolved before those systems can be built.

The specced portion of the product is ready for engineering. The unspecced portion needs an additional Phase 2C of wireframe work before the full system enters implementation.

**Build Readiness Score: 62 / 100**  
**Architecture Completion: 68%**  
**Lock Recommendation: Partial — see Section 8**

---

## Section 1 — Critical Issues

Critical issues block build. They must be resolved before engineering can begin on the affected system.

---

**[C-01] Missing Spec: H-1 (Home Screen)**

The Home screen has no spec file in Docs/. H-1 is referenced as a navigation destination in every spec in the product — onboarding completion (O-3), workout completion (W-17), chapter skip (O-3), squad navigation (S-1, S-2), and profile dismissal (P-1). It is the most-referenced screen in the entire system and has no wireframe definition.

The memory from Phase 2B indicates H-1 was approved in an earlier session but was never saved to Docs/. The plan file from that session may be recoverable, but the authoritative spec does not exist in the project.

- **Affected:** Every spec that navigates to Home
- **Blocks:** The entire product shipping without this spec

---

**[C-02] Missing Spec: L-1 (Legacy Hub)**

The Legacy Hub root screen has no spec file in Docs/. L-1 is the entry point for the Legacy tab. It is referenced as a navigation destination in L-3/L-4 (chapter archival navigation returns to L-1), in P-1 (P-1 → L-1 on tab switch), in S-2 (S-2 closes to L-1 via back stack), and in Featured-Legacy-Moment-Standards.md. Like H-1, it was approved earlier but never saved to Docs/.

- **Affected:** L-3/L-4, P-1, Featured-Legacy-Moment-Standards.md, Master PRD
- **Blocks:** Legacy tab implementation

---

**[C-03] Missing Spec: L-6 (Chapter Reflection)**

The chapter completion flow is:  
`L-3 "Complete This Chapter" CTA → M-5 confirmation → L-6 Reflection → archival → L-1`

L-6 is an explicit navigation destination in L-3/L-4 Section 14.2 and Section 22.2. The reflection content written on L-6 appears read-only in L-4 (Archived Chapter Detail). L-6 does not have a spec file. Without it, the chapter completion flow is architecturally broken — there is a CTA that navigates to a screen that does not exist.

- **Affected:** Chapter-Detail-Wireframe-Spec-L3-L4.md
- **Blocks:** Chapter archival implementation

---

**[C-04] Unresolved Architecture Decision: Goal Progress Update Mechanism**

G-1 Risk 2 explicitly flags this as unresolved: "How progress is updated is not defined in this spec. Options: manual update from G-2, automatic calculation from workout logs, milestone-based."

G-2 v1.0 assumes manual update via the "Update Progress" bottom sheet. But this is an assumption, not a locked decision. If progress is automatic (calculated from workout sets/reps logged in W-9 through W-16), the data model, API endpoints, and G-2 display are fundamentally different from the manual model.

This is the single most consequential unresolved decision in the goal system. The entire goal architecture depends on it.

- **Affected:** G-1 v1.1, G-2 v1.0, G-3 v1.1
- **Blocks:** Goal system implementation

---

**[C-05] Unresolved Architecture Decision: Chapter-Program Interaction at Archival**

Both Program Amendment 001 and G-1 v1.1 explicitly flag this as unresolved. When an athlete archives a chapter while a program is still Active, the system has three architecturally different options:

1. Chapter archival is blocked until the program is Graduated or Ended Early
2. Chapter archival forces the program to Ended Early automatically
3. The program continues Active but detaches from the chapter context

None of these options is locked. L-3/L-4 Section 8.2 shows how an "In Progress When Sealed" program is displayed (it shows `7 of 12 workouts completed`), which implies the program becomes Ended Early at archival — but this is display assumption, not a locked rule.

- **Affected:** Chapter-Detail-Wireframe-Spec-L3-L4.md, Program-Architecture-Amendment-001.md, G-1 v1.1
- **Blocks:** Chapter completion flow implementation

---

**[C-06] Missing Spec: S-10 (Train Together Partner Selection)**

S-2 Section 8.1 specifies: "Train Together Primary CTA → S-10 (Train Together partner selection)." S-10 is an MVP screen for the Workout With Friend feature. It is the screen where an athlete selects their training partner before beginning a workout. No spec file exists. The entire Train Together initiation path (S-2 → S-10 → W-9/W-16) cannot be implemented.

- **Affected:** Squad-Detail-Wireframe-Spec-S2.md, Workout-With-Friend-Spec-WwF.md
- **Blocks:** Workout With Friend Train Together path

---

**[C-07] Missing Spec: W-8 (Activity Type Picker)**

W-1 Section 5.3 states that tapping "Log Activity" opens W-8, an activity type picker sheet showing all 8 activity types plus a template option. W-8 is the entry point for the entire workout logging flow. No spec exists. Without W-8, the path from W-1 to W-9 through W-16 has no defined transition screen.

- **Affected:** Workouts-Hub-Wireframe-Spec-W1.md
- **Blocks:** Workout logging initiation

---

**[C-08] Missing Specs: W-18 (Activity History) and W-19 (Activity Detail)**

W-1 "View All →" navigates to W-18 (Activity History). Tapping a workout row in W-18 navigates to W-19 (Activity Detail). WwF reference entries also appear in W-18 and tap to W-19. Neither screen is specced. The workout history viewing experience has no defined UI.

- **Affected:** Workouts-Hub-Wireframe-Spec-W1.md, Workout-With-Friend-Spec-WwF.md
- **Blocks:** Activity history viewing

---

**[C-09] S-1 Squad Count Conflicts with Monetization Amendment 001**

S-1 v1.2 Section 5.2 states: "MVP does not cap the number of squads an athlete can belong to."

Monetization-Architecture-Amendment-001.md Section 7 defines: "Free tier: 1 squad. Creating or joining a second squad fires M-7."

These are direct contradictions. The Monetization Amendment explicitly flags S-1 as "Status: follow-up required" — but that follow-up never happened. An engineer building to S-1 will implement unlimited squads on free tier.

- **Affected:** Squads-Hub-Wireframe-Spec-S1.md, Squad-Management-Permissions-Spec-S3.md, Monetization-Architecture-Amendment-001.md
- **Blocks:** Squad monetization implementation

---

**[C-10] Photo Limit Counting Undefined: Per Chapter vs. Account-Wide**

Monetization-Architecture-Amendment-001.md Section 3 specifies "50 photos" for the free tier. The counter is referenced on L-15 as "X of 50 photos." But no spec defines whether this is 50 photos per chapter or 50 photos total across all chapters.

Master PRD Section 12 says "50 total stored photos" — "total" suggests account-wide. But L-3/L-4 Section 19.4 shows a per-chapter "0 photos" counter, which suggests per-chapter tracking. These are different business models with different implementation requirements.

- **Affected:** Monetization-Architecture-Amendment-001.md, Master PRD Section 12, Chapter-Detail-Wireframe-Spec-L3-L4.md
- **Blocks:** Photo monetization implementation

---

**[C-11] Missing Specs: M-1 through M-9 (Global Modal System)**

The spec system references nine global modals throughout: M-3 (Goal Achieved), M-4 (Program Graduated), M-5 (Chapter Completion Confirmation), M-7 (Premium Upsell), M-8 (WwF Claim/Dismiss for squad members), M-9 (WwF Approve/Decline for non-squad), M-1/M-2/M-6. These modals are referenced by name across many specs but none have dedicated spec files. Their titles, body copy, button labels, and navigation outcomes are described in passing in the calling specs — but there is no authoritative modal spec document.

- **Affected:** G-2 v1.0, Program Amendment 001, W-17, WwF Spec, W-5
- **Blocks:** Global modal implementation

---

**[C-12] Missing Spec: W-5 Fork Does Not Explicitly Integrate M-7**

W-5 Fork/Edit Spec Section 7 flow diagram mentions "Program limit check: M-7 fires if at free-tier limit (3 programs)" for the Duplicate operation. But this requirement does not appear in the main specification prose of W-5. W-3 v1.2 changelog is the authoritative source for this requirement — a changelog, not a spec section.

An engineer building W-5 from the spec prose will not implement the M-7 limit check on fork. This is a monetization enforcement gap.

- **Affected:** Program-Fork-Edit-Wireframe-Spec-W5.md, W-3 v1.2 changelog
- **Blocks:** Program limit enforcement on fork

---

## Section 2 — High Issues

High issues do not block build entirely but must be resolved before any screen they affect is shipped.

---

**[H-01] "Complete" vs. "Seal" Terminology Inconsistency in L-3/L-4**

L-3/L-4 Section 14.1: CTA is "[Complete This Chapter]"  
L-3/L-4 Section 14.2: M-5 confirmation modal says "Seal [Chapter Name]?" and button says "Seal This Chapter"  
L-3/L-4 Section 22: "Chapter Sealed [Date]" is the timeline entry

The athlete taps "Complete" but confirms with "Seal." These are semantically similar but emotionally different. "Complete" implies finishing. "Seal" implies permanence. The spec uses them interchangeably. Copy must be unified before implementation.

- **Affected:** Chapter-Detail-Wireframe-Spec-L3-L4.md

---

**[H-02] Goal Editing During Chapter Completion Window Undefined**

G-3 v1.1 states goals are editable while In Progress. Chapter completion initiates a flow (L-3 CTA → M-5 → L-6 → archival) that spans multiple screens. Whether goals are locked at M-5 confirmation, at L-6 completion, or at the final archival write is not defined. If goals remain editable during L-6, the athlete can rewrite outcomes they are moments from sealing.

- **Affected:** G-3 v1.1, Chapter-Detail-Wireframe-Spec-L3-L4.md

---

**[H-03] Accomplishment Lifecycle (Edit/Delete) Undefined**

Accomplishments-Architecture-Note.md defines the data model (account-level vs. chapter-level, nullable chapterId). O-2e creates account-level accomplishments during onboarding. But no spec defines whether accomplishments can be edited or deleted post-creation. The referenced management screens (L-12, L-13, L-14) have no spec files. An athlete who misspells an accomplishment has no documented path to correct it.

- **Affected:** Accomplishments-Architecture-Note.md, Profile-Wireframe-Spec-P1.md

---

**[H-04] Photo Deletion Rules Undefined**

L-3/L-4 Section 16.2 states memories (post-archive additions) can be deleted. But no spec defines whether an athlete can delete a photo attributed to an active chapter, or whether original chapter photos (not memories) can be deleted from an archived chapter. Master PRD Section 12 does not address deletion. A photo deletion system must define: what is deletable, by whom, and whether deletion is permanent.

- **Affected:** Chapter-Detail-Wireframe-Spec-L3-L4.md, Master PRD Section 12

---

**[H-05] Honor Suppression/Visibility Controls Undefined**

Honors are system-awarded and the athlete cannot create them manually. But no spec defines whether an athlete can hide, suppress, or opt out of displaying an honor they'd prefer not to show. Featured-Legacy-Moment-Standards.md uses honors as Tier 3 content without acknowledging that an athlete may not want a particular honor featured. Master PRD Section 13 does not address honor visibility controls.

- **Affected:** Master PRD Section 13, Featured-Legacy-Moment-Standards.md

---

**[H-06] Rank Computation at Downgrade: Earned vs. Computed**

Master PRD Section 15 defines rank as derived from Legacy Score, which is a composite of workouts logged, chapters completed, goals achieved, honors, and programs graduated. The Monetization Amendment states "Historical ranks are always free" (Never Charge For History). But if rank is computed (recalculated whenever any input changes), a downgrade that limits future inputs does not affect existing rank. If rank is "earned" (locked to the highest achieved tier), downgrade is also safe. The implementation — and the data model — differs significantly between these two models, and no spec declares which applies.

- **Affected:** Master PRD Section 15, Monetization-Architecture-Amendment-001.md

---

**[H-07] Featured Legacy Moment: Brand-New Athlete Contradiction**

Featured-Legacy-Moment-Standards.md Section 6.1 states: "Brand-new athlete with no workouts, no chapter, no photos. Behavior: The Featured Legacy Moment section is omitted from L-1 entirely."

Featured-Legacy-Moment-Standards.md Section 4.4 states: Photo Added (Tier 5) is the final fallback for the Featured Legacy Moment section.

An athlete who adds a single photo but has no workouts or chapter triggers Section 4.4 (Photo is a valid Tier 5 event), but Section 6.1 says "no photos added = no section." Section 6.1 says "no photos added" creates no section, but once one photo is added, Section 4.4 would activate it. These are consistent — but the threshold (first photo = section appears) is not stated explicitly and should be.

- **Affected:** Featured-Legacy-Moment-Standards.md

---

**[H-08] Simultaneous Goal Achievement + Chapter Completion: Modal Sequencing Undefined**

When a primary goal is achieved on the same action that triggers chapter completion, two modals could fire: M-3 (Goal Achieved) and M-5 (Seal Chapter). Featured-Legacy-Moment-Standards.md Section 6.3 handles the Featured Moment priority (Chapter Completed wins), but does not address which modal fires first, or whether M-3 is suppressed when M-5 is imminent. The modal sequencing at this simultaneous event is undefined.

- **Affected:** Featured-Legacy-Moment-Standards.md, Master PRD Section 13

---

**[H-09] Unit Label Changes in G-3 Edit Mode Create Display Confusion**

G-3 v1.1 Decision 5 allows editing the unit label (e.g., "lbs" → "kg") with no retroactive effect on history. G-2 v1.0 Section 10.3 confirms each progress entry stores a unit snapshot at recording time. These rules are consistent and protect data integrity. However, no UI warning is shown when the unit is changed — the athlete may believe they are switching from pounds to kilograms retroactively, when they are not. Historical entries will still show "365 lbs" while new entries show "kg," creating apparent inconsistency in the progress history without explanation.

- **Affected:** G-3 v1.1, G-2 v1.0

---

**[H-10] "Forging Since" Date Immutability Not Enforced at API Level**

O-1 v1.0 Decision 4 declares "Forging Since" immutable forever. This is a UX rule — no edit affordance is shown. But no spec defines API-level enforcement (a read-only field, a 403 Forbidden on any PATCH to this field). Without server-side enforcement, the immutability is a convention, not a guarantee.

- **Affected:** O-1 v1.0

---

**[H-11] Goal Progress Percentage Precision Undefined**

G-3 v1.1 allows decimal targets (e.g., "2.5 hours"). G-2 v1.0 Edge Case 16.3 shows the bar capped at 100% when progress exceeds target, but does not define the calculation rule. If target is 2.5 and current is 1.5, the percentage is 60%. If current is 2.6, the percentage is 104% — shown as 100%. The stored precision (is 104.2% stored, or is it capped at 100%?), rounding rules, and display behavior are not defined. This affects both the G-2 progress bar and the data model.

- **Affected:** G-2 v1.0, G-3 v1.1

---

**[H-12] Navigation Stack Behavior for Cross-Tab Navigation Undefined**

P-1 Section 13.2 states: "Navigation to Legacy content (L-3, L-10) from P-1 dismisses the modal, makes the Legacy tab active, and opens the destination." This implies the back stack from L-10 → back goes to L-1, not back to P-1. But when the athlete was on the Squads tab before tapping the avatar (P-1), does pressing back from L-10 go to L-1 (the Legacy tab root) or to S-1 (where they came from)? The cross-tab navigation stack behavior is not documented.

- **Affected:** Profile-Wireframe-Spec-P1.md, Master PRD Section 6

---

**[H-13] W-20 (Partner Selection Sheet) Specified Inline, Not as Dedicated Spec**

WwF Spec Section 5.2 defines W-20 inline as a "Partner Selection Sheet (Bottom Sheet from W-17)." It is the most complete definition of this screen in the system, but it exists only as a subsection of the WwF spec, not as a dedicated screen spec. This breaks the naming and organization convention. W-20 will likely be implemented by the engineer who reads the WwF spec, not by an engineer working on W-17 — creating a risk of it being overlooked in the W-17 implementation pass.

- **Affected:** Workout-With-Friend-Spec-WwF.md

---

**[H-14] Import W-IM-3 (Chapter Setup) Not Fully Specced**

Architecture-Amendment-001-Import.md lists W-IM-3 as "Chapter Setup" with two inputs: Chapter Name (required) and Primary Goal (required). But there is no full wireframe for this screen. Is this a single-screen form? A two-step flow? What are the field constraints (chapter name max length, goal text max length)? Does the goal use the same data model as G-3 (Target, Unit, progressive disclosure)? These are undefined.

Additionally: O-3 makes the goal optional for first chapter creation, but W-IM-3 marks Primary Goal as required. This is a data model consistency issue — import chapters require a goal but O-3 chapters do not.

- **Affected:** Architecture-Amendment-001-Import.md, O-3 v1.0

---

**[H-15] Privacy Settings Screens (P-5 Through P-7) Not Specced**

P-1 Section 13.3 references P-6 (Privacy Settings) for the "Let non-squad athletes find me in search" toggle. Master PRD Section 17 references P-6 for squad visibility settings. Identity Amendment 001 Section 7.1 defines this toggle and its behavior. But P-5, P-6, and P-7 have no spec files. Privacy settings cannot be implemented without knowing what screens exist and what controls they contain.

- **Affected:** Profile-Wireframe-Spec-P1.md, Amendments/Identity-Amendment-001-Username.md, Master PRD Section 17

---

**[H-16] Program State Transition Timing at Graduation Undefined**

Program Amendment 001 defines the graduation flow as: last workout logged → W-17 loads → M-4 fires → program transitions Active → Graduated. But the exact moment of state transition is not declared. Does the transition happen when W-17 loads? When M-4 is dismissed? When the athlete taps "Done" on W-17? The distinction matters for edge cases — if the app crashes between M-4 and "Done," is the program Graduated or still Active?

- **Affected:** Program-Architecture-Amendment-001-Active-Program-Rule.md, Workout-Summary-Spec-W17.md

---

**[H-17] Chapter Attribution During In-Progress Session When Chapter Is Sealed on Another Device**

Active Workout Flow Spec Section 15.7 states: "If a chapter is sealed from another device while a workout is in progress, the chapter attribution is captured at session start." The Chapter Context Strip would then show "no chapter" while the workout continues — but the session will be attributed to the now-sealed chapter. The athlete sees "no chapter" but the record will show the chapter. No in-session notification or explanation is specified.

- **Affected:** Active-Workout-Flow-Spec-W9-W16.md, Workout-Summary-Spec-W17.md

---

**[H-18] M-7 (Premium Upsell Sheet) Referenced but Not Specced**

M-7 is referenced by name in W-3, W-5, and Monetization Amendment 001. It fires at program creation limit, squad creation limit, import limit, and program fork limit. But M-7 has no spec. Its title, body copy, CTA label, and navigation behavior on dismissal are all undefined. This is the primary monetization upgrade conversion surface — it must be specced.

- **Affected:** Monetization-Architecture-Amendment-001.md, W-3, W-5, S-1

---

**[H-19] Dual PRD Files Create Authority Ambiguity**

Both `Docs/FORGE_LEGACY_PRD.md` and `Docs/Forge-Legacy-Master-PRD.md` exist. Agent 3 confirmed they appear identical. If they diverge over time (amendments applied to one but not the other), the system has two conflicting sources of truth. One file should be the canonical source; the other should be removed or clearly marked as deprecated.

- **Affected:** FORGE_LEGACY_PRD.md, Forge-Legacy-Master-PRD.md

---

## Section 3 — Medium Issues

Medium issues should be fixed before shipping but do not block engineering planning.

---

**[M-01] DNA: "In Progress" Label for Narrative Goals Doesn't Tell the Story**

Narrative goals (no Target set) display "In Progress" as their sole status indicator in G-1 and G-2. "In Progress" is data — it describes the goal's state, not its story. A quantifiable goal tells a story ("Road to 405 — 365 lbs, 90%"). A narrative goal ("Train with my son") shows only "In Progress." The display confirms the goal exists but does not reinforce its meaning. Product DNA principle "Story Before Data" is technically satisfied (no progress bar) but the spirit of the principle — that the story should be expressed — is not met for narrative goals.

- **Affected:** G-1 v1.1, G-2 v1.0

---

**[M-02] DNA: O-2 Dual-Path Framing Creates Two-Tier Identity**

O-2b (Athlete Type selection) uses different titles by path:
- Path A: "What interests you?" (aspirational, forward-looking)
- Path B: "What do you train?" (declarative, factual)

A new athlete selecting their athlete type is asked what interests them, not what they do. An experienced athlete is asked what they train. This subtle framing positions Path A athletes as aspirants and Path B athletes as practitioners — a hierarchy that conflicts with "Identity Over Performance." Both athletes are athletes. The title should declare identity equally for both.

- **Affected:** First-Time-Setup-Wireframe-Spec-O2.md

---

**[M-03] DNA: "Partial Session" Label Implies Incompleteness**

W-17 Section 10.2 labels early-exit workouts as "Partial Session" in the summary header. The spec notes the label is "not an error color." But "Partial" semantically contrasts with "Complete" — it implies the session was unfinished relative to an expectation. "Accountability Without Shame" means the product should not frame a deliberate exit as falling short. A neutral label (e.g., "Session Saved," "Short Session") would accomplish the same data communication without the implicit judgment.

- **Affected:** Workout-Summary-Spec-W17.md, Active-Workout-Flow-Spec-W9-W16.md

---

**[M-04] DNA: Ended Early Display Shows Ratio; Graduated Shows Count**

W-2 Program Browse Spec shows:
- Graduated: "[Program Name] — Y workouts completed"
- Ended Early: "[Program Name] — X of Y workouts completed"

Ended Early explicitly surfaces the incompleteness ratio. Program Amendment 001 Section 7 states "no visual stigma" between Ended Early and Graduated cards. But showing "7 of 12" makes the shortfall visible in a way "12 workouts completed" does not. True visual parity would show both as counts: Graduated "12 of 12" or Ended Early simply "7 workouts completed."

- **Affected:** Program-Browse-Wireframe-Spec-W2.md, Program-Architecture-Amendment-001-Active-Program-Rule.md

---

**[M-05] No Grace Period or Undo for Accidental "Mark as Achieved"**

G-2 v1.0 Section 9.4 confirms "Mark as Achieved" is permanent — no un-achieve path exists. This is correct per "History Cannot Be Rewritten." But if an athlete taps the action accidentally (a common mobile interaction failure), they have no recovery path short of archiving the entire chapter. The confirmation prompt should clearly communicate the permanence. Alternatively, a brief (10-second) undo window before the server write would provide recovery without violating data integrity, since the record doesn't truly exist until the server write completes.

- **Affected:** G-2 v1.0

---

**[M-06] Unit Label Change in G-3 Edit Mode Needs a Warning**

G-3 v1.1 allows editing the unit field (e.g., "lbs" → "kg"). The spec correctly preserves unit snapshots per history entry. But no UI warning exists to tell the athlete that their historical entries will still show the old unit. An athlete who switches to metric may believe they are updating all past entries. A single inline note ("Future entries will use kg. Past entries keep their original units.") resolves the confusion.

- **Affected:** G-3 v1.1

---

**[M-07] Multiple Progress Updates on Same Date: No Rule Defined**

G-2 v1.0 Section 8 allows manual progress updates but does not state whether multiple updates on the same date are allowed. The history display format ("June 5 · 365 → 380") implies one entry per date. If a second update is entered on the same day, should it replace the first or create a second entry? This ambiguity will produce inconsistent implementations.

- **Affected:** G-2 v1.0

---

**[M-08] W-IM-3 Requires Primary Goal; O-3 Makes Goal Optional**

Architecture-Amendment-001-Import.md marks Primary Goal as required in W-IM-3 (Chapter Setup for import). O-3 v1.0 makes the goal optional in all first-chapter creation flows. These data model conventions conflict. Either import chapter creation should use the same optional goal model as O-3, or the import spec should explain why goal is required for imported chapters but not for onboarding chapters.

- **Affected:** Architecture-Amendment-001-Import.md, First-Chapter-First-Goal-Wireframe-Spec-O3.md

---

**[M-09] Accomplishment Display Order Uses Forge Legacy Add Date, Not Historical Date**

Accomplishments-Architecture-Note.md Section (Display Behavior) states: "Display order: most recent first, by creation date in Forge Legacy." An athlete who enters "Ran my first marathon in 2022" as an O-2e entry during onboarding in 2026 will see that entry displayed by its 2026 add date, not its 2022 event date. This is technically correct (Forge Legacy cannot verify historical dates) but will feel wrong to athletes who add past accomplishments in non-chronological order. No UI note explains this ordering to the athlete.

- **Affected:** Accomplishments-Architecture-Note.md

---

**[M-10] Onboarding State Reset Not Prevented at Operational Level**

O-1 v1.0 Decision 7 stores onboarding state server-side for cross-device resume. But no spec prevents operational tools or support workflows from resetting an athlete's onboarding completion status. If a support engineer resets O-2 completion, the athlete's athlete type, accomplishments, and username selections could be overwritten. "Forging Since" date immutability is declared, but it applies only to that one field — the broader onboarding record has no documented protection.

- **Affected:** O-1 v1.0

---

**[M-11] Chapter Name Editability Post-Creation Not Confirmed**

L-3/L-4 Section 2 (Top App Bar) mentions an overflow [⋯] menu with "edit chapter name" as an option in active chapters. But no spec fully defines the chapter name edit flow: is there a screen, a bottom sheet, a modal? Is there a character limit enforcement (same as O-3's 60-char limit)? The edit flow is referenced but not specced.

- **Affected:** Chapter-Detail-Wireframe-Spec-L3-L4.md

---

**[M-12] WwF: Historical "Trained With" Entry Shows Old Display Name**

Identity Amendment 001 Section 3.3 states WwF history entries store the display name at the time of the workout (immutable snapshot). If Athlete B changes their display name after a WwF session, Athlete A's history will show B's old name. This is technically correct (History Cannot Be Rewritten) but could confuse Athlete A who no longer recognizes the old name. No UI note or contextual indicator addresses this.

- **Affected:** Amendments/Identity-Amendment-001-Username.md

---

**[M-13] Chapter State Machine Not Formally Defined**

Master PRD Section 10 describes a lifecycle: "Create → Active → [Completion Initiated] → Reflection → Archived." But the spec documents only define two states with full detail (Active = L-3; Archived = L-4). The intermediate states (Completion Initiated, Reflection) are implied by the flow but not formally modeled. The data model must define whether "Completion Initiated" and "Reflection" are server-side states or UI-only states — a distinction that affects crash recovery, concurrent access, and the goal-locking question from H-02.

- **Affected:** Chapter-Detail-Wireframe-Spec-L3-L4.md, Master PRD Section 10

---

**[M-14] Post-Removal WwF History Visibility Undefined**

S-3 v1.1 Section 7.5 confirms that removing a squad member does not delete WwF history entries. But whether the removed member's WwF reference entries remain visible in the remaining members' Activity History (W-18) after removal is not stated. Two valid interpretations: (1) WwF entries are owned by the individual athlete's record and remain regardless of squad membership; (2) WwF entries that were squad-context-created are removed from W-18 on squad exit. Neither is locked.

- **Affected:** Squad-Management-Permissions-Spec-S3.md

---

**[M-15] import "1 Lifetime" Limit: Failed Import Handling Not Defined**

Monetization Amendment 001 Section 8 defines "completed" as the athlete tapping Confirm at W-IM-4. Failed imports (abandoned before W-IM-4) do not consume the free import. But what if the athlete reaches W-IM-4, taps Confirm, and the server fails to save? Is `hasUsedFreeImport` set to true before or after the server confirms the save? If it is set before and the save fails, the athlete has consumed their free import without receiving any content.

- **Affected:** Monetization-Architecture-Amendment-001.md

---

## Section 4 — Minor Issues

Minor issues are quality improvements, copy standardizations, or low-risk inconsistencies.

---

**[L-01] Two PRD Files Should Be Unified**

Both `FORGE_LEGACY_PRD.md` and `Forge-Legacy-Master-PRD.md` exist and appear identical. One should be deleted or the master clearly named as the canonical source. Having two files with similar names creates confusion about which to update when amendments are applied.

---

**[L-02] No Formal Decisions.md Document**

Architecture decisions are recorded in spec preambles and amendment preambles. There is no single Decisions.md document listing all locked decisions in one scannable place. Future amendment authors and engineers must read all specs to understand prior decisions. A single-page decision log would reduce this overhead.

---

**[L-03] "Conflict Sheet" Copy Should Be Locked Verbatim**

Program Amendment 001 Section 3 and W-3 Section 13 both describe the Conflict Resolution Sheet for "Current Program Active." The body copy is described but slightly paraphrased differently in each spec. The exact wording should be treated as locked copy (verbatim) across all specs that reference it, not as a description to be re-implemented from the description.

---

**[L-04] Scroll Position Restoration Rules Are Inconsistent**

S-1 v1.2 Section 11.3 specifies scroll position restoration on back from S-2. S-2 v1.3 Section 10.5 specifies scroll position restoration on back from S-10. Whether scroll restoration is a universal rule (all screens restore position on back) or an explicitly opt-in rule (each spec must state it) is not documented. A global navigation rule should clarify the default.

---

**[L-05] Username Auto-Suggestion Adds Complexity Without Proportionate Benefit**

Identity Amendment 001 v1.1 specifies username auto-suggestion with fallback logic for edge cases (< 3 chars, all variants taken). Product DNA "Simplicity Wins" argues for a simpler approach: blank field with helpful placeholder. The auto-suggestion is well-intentioned but introduces five edge case rules for a step that is optional (the athlete can clear the suggestion immediately). This is a minor complexity concern worth revisiting at implementation.

---

**[L-06] Memory Timestamp Precision Not Defined**

L-3/L-4 Section 12.2 shows memory timestamps as "Added June 5, 2027 · 14 months after sealing." The precision rule for the duration calculation ("14 months") is not defined. Does it round to nearest month? Show weeks at less than 1 month? Truncate at month level? This is display-level ambiguity with low risk but should be locked before implementation.

---

## Section 5 — Recommended Fixes

Organized by priority and effort level.

### Group A — Critical Decisions (Lock Before Any Engineering)

These are decisions, not specifications. They require a product decision meeting, not wireframe work.

1. **Goal Progress Mechanism** — Lock one of: (a) manual only via G-2 Update Progress sheet; (b) automatic from workout logging; (c) hybrid. Write a one-page Goals Progress Mechanism Amendment. This is the most consequential unresolved decision in the system.

2. **Chapter-Program Intersection at Archival** — Lock one of: (a) must Graduate or End Early the program before completing chapter; (b) chapter completion auto-creates an Ended Early record; (c) program detaches and continues in next chapter. Write a Chapter-Program Intersection Amendment.

3. **Photo Limit Counting** — Lock as account-wide (50 total across all chapters). Update Monetization Amendment 001 with explicit language. Update L-3/L-4 to reference account-wide counter.

4. **Squad Creation Limit** — Update S-1 v1.2 to reflect the Monetization Amendment 001 limit (1 squad free, unlimited premium). Monetization Amendment 001 already flags this as "follow-up required."

5. **"Complete" vs. "Seal"** — Lock one verb for the chapter archival action across all specs, copy, and UI. "Seal" is more emotionally appropriate and more precisely describes permanence. Recommend "Seal."

### Group B — Missing Specifications (Write Before Engineering)

These are screens or spec sections that must exist before the system can be implemented.

Priority 1 (blocks entire flows):
- H-1 Home Screen — recover from plan file or re-spec
- L-1 Legacy Hub — recover from plan file or re-spec
- L-6 Chapter Reflection — new spec
- S-10 Train Together Partner Selection — new spec
- W-8 Activity Type Picker — new spec

Priority 2 (blocks specific features):
- M-1 through M-9 Global Modal Library — new spec document
- W-18 Activity History — new spec
- W-19 Activity Detail — new spec
- W-20 Partner Selection Sheet — promote from inline WwF section to dedicated spec

Priority 3 (blocks secondary features):
- L-5 Chapter Creation (post-onboarding)
- L-9 Legacy Timeline
- P-5/P-6/P-7 Privacy Settings
- W-IM-1 through W-IM-4 (detailed import screen specs)

### Group C — Spec Clarifications (Amend Existing Specs)

These are additions or clarifications to existing locked specs.

- **W-5:** Add M-7 limit check to main spec prose (not just flow diagram)
- **S-1:** Update squad count to reflect monetization limit
- **G-2:** Clarify same-day duplicate update rule
- **G-3:** Add unit label change warning copy
- **Architecture-Amendment-001-Import.md:** Resolve W-IM-3 goal required vs. optional (align with O-3)
- **Monetization-Architecture-Amendment-001.md:** Add W-5 Fork to program limit table, clarify import rollback on server failure
- **Program-Architecture-Amendment-001:** Explicitly state graduation timing (Active → Graduated transitions at W-17 "Done" tap)
- **O-2 v1.0:** Unify O-2b title to "What do you train?" for both paths

### Group D — Cleanup (Low Priority)

- Delete `FORGE_LEGACY_PRD.md` or clearly mark it as deprecated; `Forge-Legacy-Master-PRD.md` is canonical
- Create `Docs/Decisions.md` — a single-page log of all locked architecture decisions
- Lock "Conflict Sheet" body copy verbatim in Program Amendment 001
- Define global scroll position restoration rule in PRD Navigation section

---

## Section 6 — Build Readiness Score

**62 / 100**

| Component | Score | Notes |
|-----------|-------|-------|
| Product DNA & Philosophy | 95/100 | Fully defined, internally consistent, well-applied across specced systems |
| PRD & Amendment Structure | 85/100 | Complete and mature; amendment model is sound; dual PRD file is minor |
| Onboarding (O-1/O-2/O-3) | 92/100 | All three locked and production-quality; minor clarifications needed |
| Programs (W-2 through W-5) | 88/100 | Strong; W-5 M-7 gap and graduation timing need fixes |
| Active Workouts (W-9 through W-17) | 85/100 | Strong; W-8/W-18/W-19 missing; W-20 inline only |
| Goals (G-1/G-2/G-3) | 75/100 | Good architecture; progress mechanism undefined blocks implementation |
| Squads (S-1/S-2/S-3) | 70/100 | Good; S-10 missing, squad limit conflict outstanding |
| Workouts Hub (W-1) | 72/100 | Strong spec; W-8 missing means the primary action is undefined |
| Legacy System (L-3/L-4 + Standards) | 45/100 | L-3/L-4 are excellent; L-1/L-2/L-5/L-6/L-9 through L-16 all missing |
| Home Screen (H-1) | 0/100 | No spec file |
| Profile (P-1 through P-8) | 20/100 | P-1 is complete; P-2 through P-8 unspecced |
| Identity & Monetization Architecture | 88/100 | Amendments are thorough; squad limit conflict and photo counting outstanding |

**Weighted average: 62/100**

The score is dragged down primarily by the absence of H-1 and L-1 (the two most-referenced screens in the product) and the 30+ unspecced MVP screens in the Legacy, Profile, and Workout utility (W-8, W-18, W-19) systems.

The specced portions of the product are production-quality and score 85–95/100 in their own domains.

---

## Section 7 — Architecture Completion Percentage

**68%**

| System | Screens Specced | Estimated Total | Completion |
|--------|----------------|-----------------|------------|
| Onboarding (O-1 through O-3) | 12 sub-screens | 12 | 100% |
| Programs (W-2 through W-5) | ~20 states/views | ~22 | 91% |
| Active Workouts (W-9 through W-17) | ~12 screens | ~16 (W-8, W-18, W-19, W-20) | 75% |
| Goals (G-1 through G-3) | ~8 states/views | ~8 | 100% (decisions pending) |
| Squads (S-1 through S-3) | ~10 states/views | ~15 (S-7–S-10 missing) | 67% |
| Legacy (L-1 through L-16) | L-3/L-4 only | ~20+ screens | 15% |
| Home (H-1) | 0 | ~5 states | 0% |
| Profile (P-1 through P-8) | P-1 only | ~10 screens | 12% |
| Global Modals (M-1 through M-9) | 0 (inline only) | 9 modals | 10% |
| Import (W-IM-1 through W-IM-4) | Overview only | 4 screens | 20% |
| Amendments & Architecture Notes | All locked | — | 95% |

Approximately **50 out of ~80 defined MVP screen states** have production-quality specifications. The remaining ~30 screens are missing or have only inline descriptions.

---

## Section 8 — Lock Recommendation

**Partial Lock. Not Ready for Full Engineering Planning.**

### Systems Ready for Engineering

The following systems have production-quality specifications and can enter engineering planning immediately, subject to the noted caveats:

| System | Ready? | Caveat |
|--------|--------|--------|
| Onboarding (O-1, O-2, O-3) | ✓ Yes | Minor O-2b title clarification |
| Programs (W-2, W-3, W-4, W-5) | ✓ Yes | Add M-7 to W-5 spec; lock graduation timing |
| Active Workouts (W-9 through W-17) | ✓ Yes | W-8, W-18, W-19 must be specced first |
| Goals (G-1, G-2, G-3) | ✓ Conditional | Goal progress mechanism must be decided first |
| Squads (S-1, S-2, S-3) | ✓ Conditional | Squad limit conflict in S-1 must be resolved |
| Identity & Username Architecture | ✓ Yes | Minor privacy screen gap (P-5/P-6) |
| Monetization Architecture | ✓ Conditional | Photo limit counting and squad limit must be locked |

### Systems Not Ready for Engineering

| System | Blocker |
|--------|---------|
| Home Screen (H-1) | No spec |
| Legacy Hub (L-1) | No spec |
| Legacy Detail System (L-5 through L-16) | Missing: L-5, L-6, L-9 through L-16 |
| Profile Sub-Screens (P-2 through P-8) | Missing all |
| Train Together (S-10, W-20 as dedicated spec) | Missing |
| Workout Entry Point (W-8) | Missing |
| Workout History (W-18, W-19) | Missing |
| Global Modals (M-1 through M-9) | No dedicated spec |
| Import Flow (W-IM detailed screens) | Missing detailed specs |
| Chapter Completion Flow | L-6 missing; chapter-program intersection unresolved |

### Recommended Next Steps (in order)

1. **Decide** goal progress mechanism, chapter-program intersection, photo limit counting, and squad limit conflict (Group A decisions above) — can be done in one session
2. **Recover** H-1 and L-1 from plan files or re-spec from memory — highest priority missing specs
3. **Spec** L-6, S-10, W-8, W-18, W-19, W-20, M-7 — critical path items for launch
4. **Update** S-1 squad limit, W-5 M-7 integration, program graduation timing
5. **Spec** remaining Legacy screens (L-5, L-9 through L-16), Profile screens (P-2 through P-8), Import detailed screens (W-IM-1 through W-IM-4)
6. **Spec** remaining modals (M-1 through M-6, M-8, M-9 as a library document)

The product is architecturally coherent and philosophically clear. The gap is completeness, not quality. The specced systems are ready to build.

---

## Appendix: Cross-Spec Contradiction Summary

| Contradiction | Document A | Document B | Priority |
|---------------|-----------|-----------|----------|
| Squad count limit | S-1 v1.2: "no limit" | Monetization Amendment: "1 free" | C-09 Critical |
| Photo limit scope | Master PRD: "total stored" | L-3/L-4: per-chapter counter | C-10 Critical |
| Chapter completion verb | L-3/L-4 CTA: "Complete" | L-3/L-4 modal: "Seal" | H-01 High |
| Goal required on import | W-IM-3: required | O-3: optional | M-08 Medium |
| Featured Moment: new athlete | Standards 6.1: no section | Standards 4.4: photo is fallback | H-07 High |
| Program state at archival | L-3/L-4: shows "in progress" | Amendment 001: decision deferred | C-05 Critical |
| Goal progress mechanism | G-2: assumes manual | G-1 Risk 2: undefined | C-04 Critical |

---

*Forge Legacy MVP Architecture Audit — v1.0 — June 2026*  
*Conducted across 3 domain research passes; synthesized from 62 domain-level findings.*  
*Total: 12 Critical | 19 High | 15 Medium | 6 Minor*
