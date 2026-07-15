# Visual Audit Coverage Matrix

The **denominator that makes visual-audit coverage knowable.** Built mechanically:
- **Design side:** `find design_reference -iname '*.dc.html'` → **112 files**.
- **App side:** `git ls-files 'src/app/**'` (+ `src/deferred`) → **15 routes + 1 deferred**.

Each `.dc` is classified. **Only SCREEN rows are the audit denominator.** Non-SCREEN classes
(DS-REF / HARNESS / PRINT-DUPE) are listed in the appendix and excluded.

> **Status of this doc:** manifest only — nothing audited or fixed off it yet. The per-screen coverage
> columns (audited? · deltas classified? · DROPPED-FREE fixed? · BLOCKED logged?) start empty; the one
> exception is **Squad Detail**, cataloged this session (`FORGE_DELTAS` Squad Detail catalog + §16).

---

## Rollup

| Metric | Count |
|---|---:|
| Total `.dc.html` files | 112 |
| — SCREEN (denominator) | **82** |
| — DS-REF (design-system/reference/badge/symbol/art/component) | 24 |
| — HARNESS (QA / test bench) | 4 |
| — PRINT / DUPE (print variants) | 2 |
| **SCREENS built** (route renders the surface) | **8** |
| **SCREENS built-as-sheet/partial/shelved** | **5** |
| **SCREENS built-via-M-series ceremony** | **1** (Honor Engraved → honorEarned) |
| **SCREENS unbuilt** | **68** |
| Orphan routes (built, no `.dc` SCREEN) | 1 (`explore.tsx` — starter cruft) |
| Redirect stubs | 1 (`community.tsx` → Home) |

**Built-screen coverage ≈ 8 / 82 = 10%** (14 / 82 ≈ 17% counting partials/sheets + the built ceremony).
Matches the Project-Audit "Code ~15%" estimate from an independent axis.

> **Denominator corrections (verified, not asserted):** (1) **Ceremonies** — of the 3, only **Honor
> Engraved** is built (maps to `honorEarned`/M-2 in `CeremonyKind`); **Podium Reveal** (competition-win)
> and **Legacy Unlocked** have **no covering `CeremonyKind`** → they stay UNBUILT. (2) **Beginner Home /
> Day 2** are **hidden-unbuilt, not DUPE** — the built Home has no first-run branch, while the design
> carries a first-run flow it doesn't handle (name-first-chapter, sealed-until-first-move, locked
> tabs). Moved from DUPE → SCREEN/unbuilt (+2), so "DUPE" doesn't bury real onboarding work.

---

## SCREEN denominator (82) — coverage matrix

Columns: **A?** audited · **D?** deltas classified · **DF** DROPPED-FREE fixed · **BL** BLOCKED logged.
(All empty except Squad Detail — the one cataloged this session.)

### ✅ Built (8)

| `.dc` file | Built route | Status | A? | D? | DF | BL |
|---|---|---|:--:|:--:|:--:|:--:|
| Forge Home | `src/app/(tabs)/index.tsx` | BUILT | | | | |
| Forge Legacy | `src/app/(tabs)/legacy.tsx` | BUILT | | | | |
| Squads Hub | `src/app/(tabs)/squads.tsx` | BUILT | | | | |
| Forge Programs Catalog | `src/app/(tabs)/workouts.tsx` | BUILT (Workouts = W-2) | | | | |
| Forge Public Profile | `src/app/athlete/[id].tsx` | BUILT (thin, Path 1) | | | | |
| Forge Friends Feed | `src/app/friends.tsx` | BUILT | | | | |
| Post Detail | `src/app/post/[id].tsx` | BUILT | | | | |
| Squad Detail | `src/app/squad/[id].tsx` | BUILT | ✓ | ✓ | bg only | ✓ |

### 🟡 Built-as-sheet / partial / shelved (5)

| `.dc` file | Built as | Status | A? | D? | DF | BL |
|---|---|---|:--:|:--:|:--:|:--:|
| Forge Squad Records | records sheet in `squad/[id]` | BUILT (sheet) | | | | |
| Forge Share Configuration | `ShareSheet` / `ShareProvider` | BUILT (sheet, SH-1) | | | | |
| Forge Active Workout | `src/app/workout.tsx` | PARTIAL (73-line stub) | | | | |
| Squad Settings | inert sheet in `squad/[id]` | PARTIAL (inert shell) | | | | |
| Community Home | `src/deferred/community.tsx` | SHELVED (non-routed, §13) | | | | |

### 🕯️ Built-via-M-series ceremony (1)

| `.dc` file | Built as | Status | A? | D? | DF | BL |
|---|---|---|:--:|:--:|:--:|:--:|
| Forge Honor Engraved | `CeremonyKind: honorEarned` (M-2) | BUILT (ceremony overlay) | | | | |

### ⛔ Unbuilt (68) — highest-priority findings

*Onboarding / Home first-run* — Forge Onboarding · Forge Strength Start · Forge Home Gym · **Forge Beginner Home** *(hidden-unbuilt: first-run flow the built Home has no branch for)* · **Forge Beginner Home Day 2** *(hidden-unbuilt)*
*Workout / Exercise* — Forge Activity Type Picker (W-8) · Forge Workout Complete (W-17) · Forge Active Run · Forge Activity History (W-18) · Forge Activity Detail (W-19) · Forge Exercise Library (W-21) · Forge Exercise Detail (W-22) · Forge Exercise Picker (W-23) · Forge Create Custom Exercise (W-28) · Forge Program Builder (W-24) · Forge Free Workout Builder (W-25) · Forge Workout Templates (W-26) · Forge Workout Template Detail (W-27) · Forge Run Record
*Programs* — Forge Program Detail (W-3) · Forge Program
*Goals* — Forge Goal Hub (G-1) · Forge Goal Detail (G-2) · Forge Goal Create Edit (G-3)
*Legacy / Chapters* — Forge Legacy Timeline (L-2) · Forge Chapter Detail (L-3) · Forge Chapter Reflection (L-6) · Forge Accomplishments · Forge Photos Gallery (L-15/16) · Forge Transformation (L-17) · Forge Transformation Entry Detail (L-18) · Forge Trophy Case · Forge Honors Hub · Forge Progress Hub (P-2)
*Ceremonies* — Forge Podium Reveal · Forge Legacy Unlocked *(⚠ verified: no covering `CeremonyKind` in the M-system — genuinely unbuilt. Honor Engraved is the only one built, see the ceremony section above.)*
*Squads* — Squad Composer (partial inert) · Squad Preview · Squad Invite · Squad Join Requests · Squad Settings Member · Squad Transfer Ownership · Report Squad · Create Squad · Discover Squads · Forge Mission · Forge Hall of Champions · Forge Current Champions
*Communities* — Community Composer · Community Profile · Create Community · Edit Community · Discover Communities
*Friends / Social* — Add Friend by Handle · Invite by Handle
*Challenges / Competition* — Forge Challenge · Forge Challenge Results · Forge Challenge Invite · Forge Create Challenge · Forge Competitions · Forge Competition History
*Settings / Account* — Forge Settings Root (P-4) · Forge Notifications (P-5) · Forge Profile Visibility (P-6) · Forge Preferences · Forge Account Settings · Forge Subscription (P-8)
*Workout-with-friend* — Forge Workout Invite

*(68 total. Each is a design SCREEN with no built route.)*

---

## Orphan routes (built, no `.dc` SCREEN)

| Route | Nature | Action |
|---|---|---|
| `src/app/explore.tsx` | **Stock Expo starter** "explore" tutorial tab (ThemedText/Collapsible/ExternalLink) — not a product surface | flag for removal |
| `src/app/community.tsx` | Redirect stub (`/community` → Home, §13) — intentional, not an orphan | keep |
| `src/app/ceremony-harness.tsx` | HARNESS (ceremony test bench) | keep (dev) |
| `src/app/legacy-design-test.tsx` | HARNESS (old-theme Legacy prototype, superseded by `(tabs)/legacy`) | flag for removal |

---

## Appendix — non-SCREEN `.dc` (excluded from denominator)

**DS-REF (24):** Architect Rank Badges · Builder Rank Badges · Canvas · Craftsman Rank Badges ·
Established Rank Badges · Forge Accent Palettes · Forge Artwork Reference · Forge Ceremony Language ·
Forge Home Artwork Resolver · Forge Modal Library · Forge Rank Seal · Forge Symbol Library ·
Forge Tier-3 Cards · Forge Training Splits Collection · Forge Workout Artwork ·
Forge Workout Modalities Collection · Foundation Rank Badges · FoundationBadge · Honors Catalog ·
Legacy Rank Badges · Legends Rank Badges · Rank Progression · Rank System Reference · RankFrame

**HARNESS (4):** Forge Build Status · Forge QA Audit · Forge Resolver Test Bench ·
Social Architecture Verification

**PRINT / DUPE (2):** Forge Home-print-10htpqx · Forge Legacy-print-1xc8la9

---

## Notes on judgment calls (RESOLVED)

- **Ceremonies** — verified against `CeremonyKind` (`rankUp | goalAchieved | programGraduated |
  honorEarned | premiumUpsell`). **Honor Engraved → built** (honorEarned/M-2). **Podium Reveal**
  (competition-win) and **Legacy Unlocked** have **no covering kind → unbuilt** (a competition-win
  ceremony and a legacy-unlock reveal are genuinely missing from the M-system).
- **Home variants** — **Beginner Home / Day 2 → hidden-unbuilt** (NOT DUPE): the built Home
  (`(tabs)/index.tsx`) has no first-run branch, while the design carries a first-run flow
  (name-first-chapter · sealed-until-first-move · locked tab bar) it doesn't render. Counted as SCREEN.
  **Home Gym / Strength Start** stay SCREEN (unbuilt).
- **Built-as-sheet / partial** rows (Squad Records, Share Configuration) stay in the PARTIAL bucket,
  **not** the fully-built 8. **Squad Settings** is an inert shell → PARTIAL, not built. A reasoned sheet
  divergence (the app standardized on sheets), but not counted among the built screens.
