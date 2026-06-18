# Forge Legacy — Critical Decisions Amendment 001
## June 2026

**Authority:** MVP Architecture Audit v1.0 (June 2026)
**Status:** Locked
**Type:** Architecture Amendment
**Resolves Audit Issues:** C-04 (photo scope), C-05 (chapter-program intersection), C-09 (squad limit conflict), C-10 (goal progress undefined), H-01 (chapter terminology)

---

## Purpose

This amendment resolves five critical open architecture decisions identified in the Forge Legacy MVP Architecture Audit v1.0 (June 2026). Each decision was flagged as a blocker for engineering implementation. All five are now locked.

No new product features are introduced. All decisions are architectural clarifications or terminological standardizations of systems already specified.

---

## Decision 1 — Goal Progress Model: Hybrid

### Statement

**Locked:** The goal progress model is Hybrid. Manual progress via G-2 "Update Progress" sheet is the authoritative mechanism. Automatic progress updates are permitted when the system can confidently map logged workout data to a goal's target type. Narrative goals are manual-only.

### Rules

1. **Manual is authoritative.** The athlete may manually update progress via G-2 "Update Progress" sheet at any time for any quantifiable goal. This is the primary mechanism and overrides any prior automatic value.

2. **Automatic updates are permitted** for quantifiable goals when workout data contains a measurement directly comparable to the goal's Target field. "Confident mapping" means the logged workout performance can be matched to the goal type without ambiguity.

3. **Narrative goals are manual-only.** Goals without a Target field have no automatic progress mechanism. They display as "In Progress" and can only be marked complete via explicit manual action.

4. **Manual override is always available.** When a goal has been automatically updated, the athlete may overwrite that value at any time by submitting a manual update via G-2. No confirmation required.

5. **Source of update is not surfaced.** Whether a progress update was set manually or automatically is not displayed to the athlete in any UI context.

6. **Mapping rules are engineering-defined.** The specific algorithm for determining confident mapping is an engineering implementation decision. The product rule: only update automatically when the match is unambiguous. Overly-liberal auto-updates are worse than no auto-updates — when in doubt, do not auto-update.

### Eligible for Auto-Update (Examples)

- Squat goal with Target = 405 lbs: may auto-update when a workout logs a new max squat
- Running mileage goal with Target = 500 miles: may auto-update by accumulating logged run distances
- Bodyweight goal with Target = 185 lbs: may auto-update when bodyweight is logged

### Manual-Only (Examples)

- "Train with my son" — narrative goal, no Target
- "Be consistent" — narrative goal, no Target
- Any goal with no Target field set, regardless of goal name content

### Downstream Document Updates Required

| Document | Change Required | Status |
|----------|----------------|--------|
| G-1 v1.1 | Risk 2: Mark as RESOLVED with decision summary | Complete — this session |
| G-2 v1.0 | Add section: Hybrid Progress Model — document both update paths and rules | Pending — Phase 2C |
| W-17 Workout Summary | Note that workout completion may trigger goal progress auto-update where mapping exists | Pending |

---

## Decision 2 — Chapter ↔ Program Relationship: Independent Systems

### Statement

**Locked:** Chapters and Programs are independent systems. They do not own each other. Chapter state changes have no effect on Program state. Program state changes have no effect on Chapter state.

### Rules

1. **A Chapter may contain zero, one, or multiple Programs** — specifically, zero or more programs that had workouts logged during the chapter's active period.

2. **A Program may span multiple Chapters.** A program begun in Chapter 1 may still be Active when Chapter 2 begins. This is valid and expected behavior.

3. **Chapter archival (Sealing) does not affect Program state.** When a chapter is Sealed, all Active programs associated with it remain Active. Programs are not ended, paused, suspended, or modified by chapter sealing.

4. **Program state changes do not affect Chapter state.** A program Graduating or being Ended Early does not change the chapter's Active state. The chapter continues.

5. **Program "association" with a chapter is derivational, not ownership.** A program is associated with a chapter if it had at least one workout logged during the chapter's active period. This is display-only. It creates no ownership relationship.

6. **L-3 (Active Chapter) Programs section** shows programs that have had workouts logged during the current chapter's active period. These programs may also have workouts in prior or future chapters.

7. **L-4 (Archived Chapter) Programs section** shows a historical snapshot: programs that had workouts logged during this chapter's lifetime, with their progress count at the time of sealing. A program shown here may still be Active in a subsequent chapter — L-4 shows the historical snapshot, not current program state.

### Downstream Document Updates Required

| Document | Change Required | Status |
|----------|----------------|--------|
| G-1 v1.1 | Risk 3: Mark as RESOLVED with decision summary | Complete — this session |
| L-3/L-4 Chapter Detail | Section 8 (Programs): Update display language to reflect association model; L-4 must clarify that program progress shown is a snapshot at sealing, not current state | Pending — Phase 2C |
| Program Amendment 001 | Section 10 (Unresolved Decision): Mark as resolved with this decision | Pending |
| Forge-Legacy-Master-PRD.md | Sections 6 and 11: Update chapter-program relationship language | Pending |

---

## Decision 3 — Photo Limits: Account-Wide

### Statement

**Locked:** The 50-photo limit for the Free tier is account-wide — not per-chapter, not per-program, not per-section. Total across the entire account.

### Rules

1. **Free tier:** 50 photos total across the entire account. All chapters, all programs, all time.
2. **Premium tier:** Unlimited photos, no restriction.
3. **The per-chapter photo counter in L-3/L-4** (Section 19.4, if present) shows how many photos are in that chapter as a display value only. It does not create a per-chapter limit. Limit enforcement occurs at account level.
4. **When a free-tier athlete reaches 50 photos account-wide,** M-7 fires on any subsequent photo addition attempt anywhere in the product. The section or chapter context of the attempt is irrelevant.
5. **"Never Charge For History" applies:** Existing photos are always accessible regardless of tier. Downgrade does not hide or delete photos.

### Downstream Document Updates Required

| Document | Change Required | Status |
|----------|----------------|--------|
| Monetization Amendment 001 | Photo row: Add "Account-wide (not per-chapter)" qualifier | Complete — this session |
| L-3/L-4 Chapter Detail | Section 19.4 (photo counter): Clarify counter shows chapter count; limit is account-level | Pending — Phase 2C |
| Forge-Legacy-Master-PRD.md | Section 12: Confirm account-wide scope | Pending |

---

## Decision 4 — Squad Limits: 2 Free / Unlimited Premium

### Statement

**Locked:** Free-tier athletes may belong to or create a maximum of 2 squads. Premium tier is unlimited.

**Critical note:** This supersedes Monetization Architecture Amendment 001, which specified 1 squad as the Free tier limit. The revised limit is 2 squads. The Monetization Amendment and all squad specifications must reflect 2, not 1.

### Rules

1. **Free tier:** Maximum 2 squads total. Includes squads the athlete created and squads they joined.
2. **Premium tier:** Unlimited squads.
3. **M-7 fires** when a free-tier athlete in 2 squads attempts to create or join a third.
4. **Invitations:** Visible but cannot be accepted when athlete is at the 2-squad free limit.
5. **Downgrade:** Athlete remains in all squads. Cannot create or join new squads until below the 2-squad limit. No squad deletion on downgrade.
6. **Free slot restoration:** Leaving a squad restores a free slot. An athlete who drops from 2 to 1 may join or create another squad.

### Downstream Document Updates Required

| Document | Change Required | Status |
|----------|----------------|--------|
| Monetization Amendment 001 | Squad row: 1 → 2. Section 7 table: all "1 squad" references → "2 squads." Validation checklist: update. | Complete — this session |
| S-1 Squads Hub v1.2 | Section 5.2: Replace "No Limit on Squad Count" with limit rules | Complete — this session |
| S-3 Squad Management Permissions v1.1 | Update any squad creation/join gate language to reflect 2-squad limit | Pending |
| Forge-Legacy-Master-PRD.md | Section 18: Update squad limit to 2 | Pending |

---

## Decision 5 — Chapter Terminology: "Seal Chapter"

### Statement

**Locked:** The vocabulary for chapter archival is "Seal." All prior references to "Complete Chapter" or "Complete This Chapter" as a CTA or action name are deprecated and replaced everywhere.

### Approved Vocabulary

| Context | Correct Language |
|---------|----------------|
| Primary CTA | "Seal This Chapter" |
| Confirmation modal header | "Seal [Chapter Name]?" |
| Confirmation modal button | "Seal This Chapter" |
| Timeline entry | "Chapter Sealed [Date]" |
| Past tense | "Chapter sealed" / "sealed chapter" |
| Section headings | "Seal Chapter" |
| Verb | "seal" |
| Noun | "sealing" (not "completion") |

### Deprecated Vocabulary (Replace Everywhere)

| Deprecated | Replacement |
|-----------|------------|
| "Complete This Chapter" | "Seal This Chapter" |
| "Complete Chapter" | "Seal Chapter" |
| "complete the chapter" | "seal the chapter" |
| "chapter completion" | "chapter sealing" |
| "completion flow" | "sealing flow" |
| "completed chapter" | "sealed chapter" |

### Note on Existing Correct Usage

Several specs already use "Seal" correctly in modal context. The M-5 confirmation modal in L-3/L-4 already says "Seal This Chapter" (button) and "Seal [Chapter Name]?" (header) — these are correct and require no change. The issue is the primary CTA button text, which says "Complete This Chapter." That CTA is updated to "Seal This Chapter" by this amendment.

### Downstream Document Updates Required

| Document | Change Required | Status |
|----------|----------------|--------|
| L-3/L-4 Chapter Detail | Section 14.1 heading + CTA label + Section 22.1 heading and text: "Complete This Chapter" → "Seal This Chapter" throughout | Complete — this session |
| Forge-Legacy-Master-PRD.md | Any references to "complete chapter" action | Pending |
| All future specs | Must use "Seal" vocabulary from initial draft | Ongoing |

---

## Summary of All Downstream Updates

### Updated This Session

| Document | Decision(s) Applied | Change Summary |
|----------|--------------------|----|
| G-1 v1.1 | 1, 2 | Risk 2 and Risk 3 marked as RESOLVED |
| S-1 v1.2 | 4 | Section 5.2 updated: 2-squad free limit replaces "no cap" |
| Monetization Amendment 001 | 3, 4 | Photo row: account-wide qualifier added. Squad: 1 → 2 throughout. |
| L-3/L-4 Chapter Detail | 5 | "Complete This Chapter" → "Seal This Chapter" throughout |

### Pending (Phase 2C or Follow-Up Sessions)

| Document | Decision(s) | Change Summary |
|----------|------------|----------------|
| G-2 v1.0 | 1 | Add Hybrid Progress Model section |
| L-3/L-4 Chapter Detail | 2 | Section 8 display language: association model, historical snapshot for L-4 |
| Program Amendment 001 | 2 | Section 10: mark unresolved decision as resolved |
| S-3 v1.1 | 4 | Squad gate language: 2-squad limit |
| Forge-Legacy-Master-PRD.md | 2, 3, 4, 5 | Multiple sections: chapter-program independence, account-wide photos, 2-squad limit, "Seal" terminology |

---

## Validation Checklist

- [ ] Decision 1 — G-1 Risk 2 marked as RESOLVED
- [ ] Decision 1 — G-2 Hybrid Progress Model section added
- [ ] Decision 2 — G-1 Risk 3 marked as RESOLVED
- [ ] Decision 2 — L-3/L-4 Section 8 updated for association model
- [ ] Decision 2 — Program Amendment 001 Section 10 updated
- [ ] Decision 3 — Monetization Amendment 001 photo row: "Account-wide" qualifier added
- [ ] Decision 4 — Monetization Amendment 001 squad limit updated: 1 → 2 throughout
- [ ] Decision 4 — S-1 Section 5.2 updated: 2-squad free limit
- [ ] Decision 4 — S-3 squad gate language updated
- [ ] Decision 5 — L-3/L-4 Section 14.1: CTA updated to "Seal This Chapter"
- [ ] Decision 5 — L-3/L-4 Section 22.1: heading and text updated
- [ ] Decision 5 — No remaining "Complete This Chapter" references in locked specs

---

## Change Log

### v1.0 — June 2026

Five critical architecture decisions locked following MVP Architecture Audit v1.0. Decisions resolve: goal progress update mechanism (hybrid — manual G-2 authoritative, auto-update allowed when confident mapping, narrative manual-only); chapter-program relationship at archival (independent systems — sealing has no effect on program state, programs span chapters); photo limit scope (account-wide, 50 total for free tier); squad limit (2 free / unlimited premium, revised from Monetization Amendment 001's 1-squad limit); chapter action vocabulary (standardized on "Seal," "Complete Chapter" deprecated everywhere). Documents updated this session: G-1 v1.1, S-1 v1.2, Monetization Amendment 001, L-3/L-4. Pending updates listed per decision.

---

*Forge Legacy — Critical Decisions Amendment 001*
*v1.0 — June 2026*
*Authority: MVP Architecture Audit v1.0 (June 2026)*
