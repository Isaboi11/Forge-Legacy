# P-1 Dissolution Amendment
## Dissolution of the Profile Modal into Legacy and Account Settings
### July 2026

**Status:** LOCKED

**Type:** Screen Dissolution Amendment

**Date:** 2026-07-20

**Dissolves:** P-1 Profile (modal sheet) and P-4 Settings Root — both superseded by the design layer

**Authority Chain:**
- Design project `b029488a` (the built frontend; north-star per project convention) — executed this change
- `Forge Settings Root.dc.html` — self-retiring redirect, line 127
- `Forge Home.dc.html` line 354 / `Forge Legacy.dc.html` lines 633–635 — avatar re-target
- `Forge Account Settings.dc.html` — the absorbing screen
- `Profile-Wireframe-Spec-P1.md` v1.3 (LOCKED — dissolved by this document)
- `P-4-Settings-Root-Architecture.md` / `P-4-Settings-Root-Wireframe-Spec.md` (LOCKED — dissolved by this document)
- `Legacy-Hub-Wireframe-Spec-L1.md` v1.1 (LOCKED — amended by this document)

**Downstream Effects:**
- `Legacy-Hub-Wireframe-Spec-L1.md` — four P-1 tap destinations rerouted; Sections 4A/My Standard/Trophy Case gap recorded
- `P-1-Amendment-001-Progress-Entry-Point.md` — Progress row rehomed
- `P-1-Amendment-002-Athlete-Type-Editability.md` — P-1.1 Edit Profile rehomed
- `P-5` / `P-6` / `P-8` / `P-9` — parent changes from P-4 to Account Settings
- `Profile-Progress-Ecosystem-Audit.md` — "ecosystem health: CLEAN" finding superseded

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 0 — Why This Amendment Exists

This amendment records a change that **had already been executed in the design layer and never written down**. It is a reconciliation, not a new decision.

The gap was discovered during the settings build (2026-07-20): the documentation described an entry path — App Bar avatar → P-1 Profile modal → Settings row → P-4 Settings Root → P-5/P-6/P-8/P-9 — of which **the first three hops no longer exist**. Two hours of build planning proceeded on the doc chain before the design was checked.

A repository-wide grep for any amendment covering the avatar re-target or the Settings Root merge returns **zero matches**. Nothing recorded it.

---

## Section 1 — Dissolution Decision

### 1.1 Basis

Three independent pieces of evidence, all in the design layer:

**(a) P-4 Settings Root retires itself.** `Forge Settings Root.dc.html` line 125–127, before any render:

```js
// Settings Root has been merged into Account Settings — redirect any lingering entry there.
try { window.location.replace('Forge%20Account%20Settings.dc.html'); return; } catch (e) {}
```

**(b) The avatar no longer opens a Profile modal.** It is labelled and wired as settings on both screens that carry it:

```js
// Forge Home.dc.html:354
{ role: 'button', 'aria-label': 'Account settings',
  onClick: () => { window.location.href = 'Forge%20Account%20Settings.dc.html'; } }

// Forge Legacy.dc.html:633
const goAccount = () => { window.location.href = 'Forge%20Account%20Settings.dc.html'; };
```

There is no `Forge Profile.dc.html` in the design project. P-1 has no design artifact at all.

**(c) P-1's content already moved.** `Forge Account Settings.dc.html` carries P-1's Tier 1 identity header (`selfInitials`, `selfName`, `selfRank` — lines 59–62, 308–310). `Forge Legacy.dc.html` and the built `src/app/(tabs)/legacy.tsx` carry P-1's Tier 1B Pinned Legacy.

Mention counts, as evidence of the move:

| Content | P-1 spec | L-1 spec | Built `legacy.tsx` |
|---|---|---|---|
| Pinned Legacy | 20 | **0** | **5** |
| My Standard | 0 | 0 | **3** |
| Trophy Case | 0 | 0 | **1** |

Pinned Legacy was specced exclusively as P-1 Tier 1B and is now built on Legacy. My Standard and Trophy Case are built on Legacy and appear in **no spec at all** (see §5.2).

### 1.2 Decision

**P-1 Profile is DISSOLVED.** It is not retired-and-rerouted like P-3; its content is redistributed across two surviving screens. There is no Profile modal, no Profile tab, and no Profile route.

**P-4 Settings Root is DISSOLVED.** Account Settings is the settings home and the direct target of the App Bar avatar.

The product's answer to "where is my profile?" is now **two screens by question asked**:

| Question | Screen | Status |
|---|---|---|
| "What have I built?" | **Legacy** (L-1, tab) | Built |
| "Who am I, and what do I control?" | **Account Settings** | Not yet built |

### 1.3 What Dissolution Does Not Change

- **Legacy (L-1) remains a tab root.** Its own identity and scroll order are untouched except where it absorbed P-1 content (§2).
- **P-2 Progress Hub and P-2.2 Rank Journey are unaffected.** They remain the rank-depth surfaces.
- **P-5, P-6, P-8, P-9 are not retired.** Only their parent changes (§3.2).
- **The Legacy tab does not become a profile.** It answers "what have I built?"; identity fields (@username, athlete type) belong to Account Settings, not Legacy.
- **No athlete-facing capability is removed.** Every P-1 capability either has a new home (§2) or is recorded as orphaned and owed one (§4).

---

## Section 2 — Content Redistribution

Each P-1 tier, and where it now lives.

| P-1 Tier | Content | New home | Status |
|---|---|---|---|
| 1 | Photo, Display Name, Rank · Sub-tier | **Account Settings** header | In design, unbuilt |
| 1 | @username, Athlete Type, "Forging since" | — | **ORPHANED** (§4) |
| 1 | `Edit Profile` CTA → P-1.1 | — | **ORPHANED** (§4) |
| 1B | Pinned Legacy (6 curated pins) | **Legacy** ("My Museum") | **Built** |
| 2 | Current Chapter card | **Legacy** Section 1 | **Built** |
| 3 | Rank row → P-2.2 | **Legacy** hero rank badge | Built, tap inert |
| 3B | Progress row → P-2 | **Legacy** hero rank badge | Built, tap inert |
| 4 | Honors (3 recent) | **Legacy** "What Endures" | **Built** |
| 5 | Accomplishments (3 recent) | **Legacy** "What Endures" | **Built** |
| 5 | `+ Add Accomplishment` CTA → L-14 | — | **ORPHANED** (§4) |
| 6 | Settings row → P-4 | **App Bar avatar** → Account Settings | In design, unbuilt |

**Governing rule for future work:** P-1's *record* content went to Legacy; its *identity and administration* content goes to Account Settings. When in doubt, ask which question the content answers — "what have I built?" (Legacy) or "who am I / what do I control?" (Account Settings).

---

## Section 3 — Navigation Rerouting

### 3.1 Rerouting Table

| Entry point | Old destination | New destination |
|---|---|---|
| App Bar avatar (all screens) | P-1 Profile modal | **Account Settings** |
| P-1 Settings row | P-4 Settings Root | *(row dissolved — avatar is the entry)* |
| P-4 rows | P-5 / P-6 / P-8 / P-9 | **Account Settings rows** → same screens |
| L-1 FLM card — Rank Up (L-1 §13.1, line 874) | P-1 (fallback) | **P-2.2** via `openRankJourney` |
| L-1 FLM card — Major Accomplishment (line 876) | P-1 (fallback) | **L-12 Accomplishments** |
| L-1 line 431 — rank tap | P-1 (fallback until P-3) | **P-2.2** |
| L-1 line 455 — accomplishment tap | P-1 (fallback until L-12) | **L-12** |

Both L-1 fallbacks were already stale before this amendment: P-3 was retired (P-3-Retirement-Amendment) and L-12 has since been specced. This amendment closes them.

### 3.2 New Settings Parentage

Account Settings' four sections, per `Forge Account Settings.dc.html` lines 259–274:

```
Privacy & Alerts   → Profile Visibility (P-6) · Notifications (P-5)
Training           → My Home Gym · Preferences (P-4b)
Membership         → Subscription (P-8, opens as an in-app sheet)
About              → About Forge Legacy (sheet)
```

Plus: Guided Tips toggle + replay, Sign Out with confirm, Terms/Privacy legal sheets, version string.

**Two notes.** "My Home Gym" is a new row with no P-series number, introduced by the design and built 2026-07-20. "Preferences" (P-4b) is a screen the P-4 documentation does not describe — it is a design-layer addition (§5.2).

---

## Section 4 — Orphaned Content

The following P-1 capabilities have **no home in the design and no home in the build**. They are recorded here rather than silently dropped.

| Orphan | Source | Disposition |
|---|---|---|
| **@username** | P-1 Tier 1 | **Assign to Account Settings header.** The field exists on `profiles.username`; onboarding collects it. Displaying it nowhere makes it unverifiable by its owner. |
| **Athlete Type** | P-1 Tier 1 + Amendment 002 | **Assign to Account Settings.** Amendment 002 specs the full edit flow incl. async re-attribution; that flow is otherwise unreachable. |
| **"Forging since [Month Year]"** | P-1 Tier 1 | **Assign to Account Settings header.** Derivable from `profiles.created_at`. |
| **P-1.1 Edit Profile** | Amendment 002 | **Rehome under Account Settings.** An entire locked sub-screen with no parent. |
| **`+ Add Accomplishment` CTA** | P-1 Tier 5 | **Assign to Legacy** "What Endures", or to L-12. Legacy currently offers "View all" with no create path, so L-14 Add Accomplishment is unreachable from anywhere. |

**These five are the outstanding build debt of this dissolution.** No further amendment is required to act on them; the dispositions above are locked by this document.

---

## Section 5 — Affected Document Updates

### 5.1 Profile-Wireframe-Spec-P1.md (LOCKED — dissolved by this document)

Add to the header: **DISSOLVED 2026-07-20 by P-1-Dissolution-Amendment.md.** The screen is not built and will not be. The document is retained as the authority for *content*, not for *screen*: §2 Tier definitions, §4A Pinned Legacy, and P-1.1 Edit Profile remain the governing specs for that content wherever it now lives.

Do **not** delete this file. Pinned Legacy is built from it, and P-1.1 is still owed.

### 5.2 Legacy-Hub-Wireframe-Spec-L1.md (LOCKED — amended by this document)

Two changes:

1. **Reroute the four P-1 destinations** per §3.1 (lines 431, 455, 874, 876). Risk 3 (§1249–1253, "Rank Up FLM tap lands on P-1") is **closed** — the destination is now P-2.2, which shows rank progress, so the stated impact no longer applies.

2. **Record the absorbed sections.** L-1 as specced does not contain Pinned Legacy, My Standard, or Trophy Case; the built screen does. This is a **documentation gap, not a build error** — the build followed the design, which is the north star.

   - **Pinned Legacy** — governed by `Profile-Wireframe-Spec-P1.md` §4A, now rendering on Legacy. Authority transfers to L-1.
   - **My Standard** and **Trophy Case** — appear in **no specification in this repository**. They are undocumented design-layer additions. They are **not retroactively blessed by this amendment**; they need spec coverage, and until they have it there is no locked definition of what they contain or how they behave.

### 5.3 P-4-Settings-Root-Architecture.md / P-4-Settings-Root-Wireframe-Spec.md (LOCKED — dissolved)

Add: **DISSOLVED 2026-07-20.** Content merged into Account Settings. The category map, Sign Out confirm copy, footer legal links, version string and `LEGAL` content object survive as the source Account Settings absorbed; the screen does not.

The locked statement *"Settings is a single row, TIER 6 (bottom of P-1, below Accomplishments)"* is **void** — there is no P-1 to sit at the bottom of. The App Bar avatar is the entry point.

### 5.4 P-1-Amendment-001-Progress-Entry-Point.md (LOCKED — amended)

The Progress row it adds has no host screen. Progress is reached from the Legacy hero's rank badge. Note additionally that this amendment's §2.1 still routes the Rank row to **P-3**, which was retired by `P-3-Retirement-Amendment.md` — a pre-existing staleness this document does not fix beyond recording it.

### 5.5 P-1-Amendment-002-Athlete-Type-Editability.md (LOCKED — amended)

P-1.1 Edit Profile is rehomed under Account Settings (§4). The athlete-type edit flow, the Type Picker sheet, and the async re-attribution states are unchanged and remain locked.

### 5.6 P-5 / P-6 / P-8 / P-9 (LOCKED — amended)

Parent changes from P-4 Settings Root to **Account Settings**. Back-destination for all four is Account Settings. No internal content changes.

### 5.7 Profile-Progress-Ecosystem-Audit.md (LOCKED — superseded in part)

Its §1 finding — *"Overall ecosystem health: CLEAN. No spec gaps exist. No architecture redundancy exists."* — is **superseded**. The audit examined the documentation set against itself and did not compare it to the design layer, where P-1 had already been dissolved. This is the specific failure mode this amendment exists to correct.

### 5.8 Forge-Legacy-Master-PRD.md / FORGE_LEGACY_PRD.md (LOCKED — amended)

Screen inventory: remove P-1 Profile and P-4 Settings Root. Add Account Settings and Preferences (P-4b). Adjust the MVP screen count accordingly.

---

## Section 6 — Architecture Decisions

**PD-1.** P-1 Profile is dissolved, not retired. Its content is redistributed, not merely rerouted, because two screens had already absorbed it.

**PD-2.** The App Bar avatar targets Account Settings directly. There is no intermediate identity modal.

**PD-3.** P-4 Settings Root is dissolved. Account Settings is the settings home and the sole parent of P-5/P-6/P-8/P-9.

**PD-4.** The split rule is *by question*: "what have I built?" → Legacy; "who am I / what do I control?" → Account Settings.

**PD-5.** The five orphans in §4 have locked dispositions and require no further amendment to build.

**PD-6.** My Standard and Trophy Case are built but unspecced. This amendment records the gap and explicitly declines to bless them retroactively.

**PD-7.** Where documentation and the design project disagree, **the design project governs** and the documentation is the thing to correct. This amendment applies that rule; it does not establish it.

---

## Section 7 — Validation Checklist

### Dissolution
- [x] P-4 self-retiring redirect verified in source (`Forge Settings Root.dc.html:127`)
- [x] Avatar re-target verified on both host screens (`Forge Home.dc.html:354`, `Forge Legacy.dc.html:633`)
- [x] Absence of any `Forge Profile.dc.html` in the design project confirmed
- [x] P-1 content relocation confirmed by mention-count evidence (§1.1c)
- [x] No prior amendment covering either change (repo-wide grep, zero matches)

### Redistribution
- [x] Every P-1 tier assigned a home or recorded as orphaned (§2)
- [x] All four stale L-1 → P-1 destinations identified with line numbers (§3.1)
- [x] Settings parentage re-pointed for P-5/P-6/P-8/P-9 (§3.2)

### Outstanding — not closed by this document
- [ ] @username, Athlete Type, "Forging since" surfaced in Account Settings
- [ ] P-1.1 Edit Profile built under Account Settings
- [ ] `+ Add Accomplishment` path restored (L-14 currently unreachable)
- [ ] My Standard and Trophy Case given spec coverage
- [ ] Edits in §5 applied to the eight named documents (this amendment records them; it does not perform them)
- [ ] `P-1-Amendment-001` §2.1 P-3 reference corrected (pre-existing staleness)
