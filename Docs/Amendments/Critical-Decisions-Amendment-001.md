# Forge Legacy — Critical Decisions Amendment 001
## June 2026

**Authority:** MVP Architecture Audit v1.0 (June 2026)
**Status:** Locked — **v1.1, 2026-08-12: Decision 4 (squad limits) SUPERSEDED by Monetization Architecture Amendment 003 (MA3-D7). Decision 3's photo figure corrected 50 → 75. Decisions 1, 2 and 5 unaffected.**
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

> **⚠ Numerical correction 2026-08-12 — the DECISION stands, the NUMBER moved twice.** The account-wide
> *scope* ruling below is the substance of Decision 3 and it is untouched and still locked. The figure "50"
> is not: free photos went **50 → 100** (Monetization Amendment 001, storage-economics revision 2026-08-05)
> **→ 75** (Amendment 003, MA3-D8, 2026-08-12). Premium is **1,000**, finite since 2026-08-05, not
> "unlimited". Read **75 / 1,000** everywhere "50 / unlimited" appears below.

### Statement

**Locked:** The ~~50~~ **75**-photo limit for the Free tier is account-wide — not per-chapter, not per-program, not per-section. Total across the entire account. **Transformation Gallery entries share this same counter** (MA3-D8).

### Rules

1. **Free tier:** ~~50~~ **75** photos total across the entire account. All chapters, all programs, all time — **and all Gallery entries**.
2. **Premium tier:** ~~Unlimited photos, no restriction.~~ **1,000** — an abuse guard nobody reaches, not a tier feature (Amendment 001 §4A).
3. **The per-chapter photo counter in L-3/L-4** (Section 19.4, if present) shows how many photos are in that chapter as a display value only. It does not create a per-chapter limit. Limit enforcement occurs at account level.
4. **When a free-tier athlete reaches ~~50~~ 75 photos account-wide,** M-7 fires on any subsequent photo addition attempt anywhere in the product. The section or chapter context of the attempt is irrelevant. **The check is pre-action** — M-7 fires before the picker opens, never after a photo has been chosen.
5. **"Never Charge For History" applies:** Existing photos are always accessible regardless of tier. Downgrade does not hide or delete photos.

### Downstream Document Updates Required

| Document | Change Required | Status |
|----------|----------------|--------|
| Monetization Amendment 001 | Photo row: Add "Account-wide (not per-chapter)" qualifier | Complete — this session |
| Monetization Amendment 001 | **Photo number: 50 → 100 → 75** | Complete — 2026-08-05, then 2026-08-12 (MA3-D8) |
| L-3/L-4 Chapter Detail | Section 19.4 (photo counter): Clarify counter shows chapter count; limit is account-level | Pending — Phase 2C |
| Forge-Legacy-Master-PRD.md | Section 12: Confirm account-wide scope **and correct the figure to 75** | Pending |

---

## ~~Decision 4 — Squad Limits: 2 Free / Unlimited Premium~~
## ⛔ SUPERSEDED 2026-08-12 — Squad Limits are now 1 Free / 5 Paid

> ### THIS DECISION IS SUPERSEDED BY MONETIZATION ARCHITECTURE AMENDMENT 003 (MA3-D7)
>
> **Authority:** `Monetization-Architecture-Amendment-003-Add-On-Tier-And-Launch-Limits.md` (LOCKED,
> 2026-08-12) §4, decision **MA3-D7**, on the authority of the Pricing Structure & Monetization Build Plan
> (locked 2026-08-12).
>
> | Limit | Monetization Amdt 001 (June) | **This decision** (June) | **Amendment 003 (2026-08-12)** |
> |---|---|---|---|
> | Free squads | 1 | ~~2~~ | **1** — reverted |
> | Paid squads | Unlimited → 10 | ~~Unlimited~~ | **5** |
>
> **The reversal is stated here rather than left implicit**, because this decision explicitly overrode
> Monetization Amendment 001 to reach 2, and a locked document is only worth something if the record of
> what overrode it in turn is findable from the document itself.
>
> **Why the reversal.** One squad is enough to be recruited into by a friend — the acquisition path that
> actually matters, since half the product only functions with other people in it. A *second* squad is a
> real, felt upgrade reason arriving exactly when the athlete has proven the social half of the product
> works for them. Two free squads gives that moment away for nothing. The paid ceiling of 5 replaces
> "unlimited" for the reason Amendment 001 §4A gives: an account in fifty squads is an automation, not an
> athlete.
>
> **Decisions 1, 2, 3 and 5 of this amendment are unaffected and remain locked** — with one numerical
> correction to Decision 3, noted in its own section.
>
> **Everything below is retained as the historical record. Do not implement from it.**

### Statement *(superseded)*

**Locked:** Free-tier athletes may belong to or create a maximum of 2 squads. Premium tier is unlimited.

**Critical note:** This supersedes Monetization Architecture Amendment 001, which specified 1 squad as the Free tier limit. The revised limit is 2 squads. The Monetization Amendment and all squad specifications must reflect 2, not 1.

### Rules *(superseded — read 1 free / 5 paid throughout)*

1. **Free tier:** Maximum 2 squads total. Includes squads the athlete created and squads they joined.
2. **Premium tier:** Unlimited squads.
3. **M-7 fires** when a free-tier athlete in 2 squads attempts to create or join a third.
4. **Invitations:** Visible but cannot be accepted when athlete is at the 2-squad free limit.
5. **Downgrade:** Athlete remains in all squads. Cannot create or join new squads until below the 2-squad limit. No squad deletion on downgrade.
6. **Free slot restoration:** Leaving a squad restores a free slot. An athlete who drops from 2 to 1 may join or create another squad.

> **Rules 1–2 are the only ones that changed.** Rules 3–6 hold verbatim against the new numbers: M-7 fires
> at the **2nd** squad attempt, invitations are visible-but-unacceptable at **1**, downgrade removes nobody
> from anything, and leaving a squad restores the slot. Amendment 003 §4.2 restates them in full.

### Downstream Document Updates Required *(superseded)*

| Document | Change Required | Status |
|----------|----------------|--------|
| Monetization Amendment 001 | ~~Squad row: 1 → 2~~ → **reverted to 1 by MA3-D7; applied 2026-08-12** | Superseded — see Amendment 003 §10 |
| S-1 Squads Hub v1.2 | ~~Section 5.2: 2-squad free limit~~ → **now 1 free / 5 paid** | **Open** — S-1 §5.2 still reads 2 |
| S-3 Squad Management Permissions v1.1 | Squad creation/join gate language → **1 free / 5 paid** | **Open** |
| Forge-Legacy-Master-PRD.md | Section 18: squad limit → **1 free / 5 paid** | **Open** |

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
| Monetization Amendment 001 | 3, 4 | Photo row: account-wide qualifier added. ~~Squad: 1 → 2 throughout.~~ **Squad reverted to 1 by MA3-D7 (2026-08-12); photo figure is now 75.** |
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
- [x] Decision 3 — ⚠ photo figure is **75**, not 50 (50 → 100 on 2026-08-05, → 75 by MA3-D8 on 2026-08-12); premium is 1,000, not unlimited
- [x] ~~Decision 4 — Monetization Amendment 001 squad limit updated: 1 → 2 throughout~~ **SUPERSEDED — reverted to 1 by MA3-D7, applied 2026-08-12**
- [ ] Decision 4 — S-1 Section 5.2 updated: ~~2-squad~~ **1-squad** free limit — **still reads 2, open**
- [ ] Decision 4 — S-3 squad gate language updated to **1 free / 5 paid**
- [ ] Decision 5 — L-3/L-4 Section 14.1: CTA updated to "Seal This Chapter"
- [ ] Decision 5 — L-3/L-4 Section 22.1: heading and text updated
- [ ] Decision 5 — No remaining "Complete This Chapter" references in locked specs

---

## Change Log

### v1.1 — 2026-08-12 — Decision 4 superseded, Decision 3 renumbered

**Decision 4 (squad limits) is SUPERSEDED** by `Monetization-Architecture-Amendment-003` MA3-D7: free squads
revert **2 → 1**, paid squads become **5** (was "unlimited"). This amendment had itself overridden
Monetization Amendment 001's original 1-squad limit to reach 2; that override is now reversed, and the
reversal is recorded in Decision 4's own section rather than left for a reader to discover elsewhere.
Rules 3–6 of Decision 4 hold verbatim against the new numbers.

**Decision 3 (photos) — the ruling stands, the number moved.** Account-wide scope is untouched and still
locked. The figure went 50 → **100** (Monetization Amendment 001 storage-economics revision, 2026-08-05) →
**75** (MA3-D8, 2026-08-12); premium is **1,000**, finite since 2026-08-05, not "unlimited". Gallery entries
share the one counter. Decisions 1, 2 and 5 are unaffected.

### v1.0 — June 2026

Five critical architecture decisions locked following MVP Architecture Audit v1.0. Decisions resolve: goal progress update mechanism (hybrid — manual G-2 authoritative, auto-update allowed when confident mapping, narrative manual-only); chapter-program relationship at archival (independent systems — sealing has no effect on program state, programs span chapters); photo limit scope (account-wide, 50 total for free tier); squad limit (2 free / unlimited premium, revised from Monetization Amendment 001's 1-squad limit); chapter action vocabulary (standardized on "Seal," "Complete Chapter" deprecated everywhere). Documents updated this session: G-1 v1.1, S-1 v1.2, Monetization Amendment 001, L-3/L-4. Pending updates listed per decision.

---

*Forge Legacy — Critical Decisions Amendment 001*
*v1.0 — June 2026*
*Authority: MVP Architecture Audit v1.0 (June 2026)*
