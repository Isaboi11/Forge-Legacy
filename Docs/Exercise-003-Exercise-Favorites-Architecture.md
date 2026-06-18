# Forge Legacy — Exercise-003: Exercise Favorites Architecture
## Version 1.0 | June 2026

**Status:** LOCKED
**Authority:** Exercise-Library-Architecture-v1.0.md (EL-D2, §2.5), Exercise-001-Custom-Exercise-Architecture.md (EX-001-D2, EX-001-D7), Exercise-Picker-Wireframe-Spec-W23.md (W23-D14, §7, §11.3), Exercise-Detail-Wireframe-Spec-W22.md (§13), FORGE_LEGACY_PRODUCT_DNA.md, Monetization-Architecture-Amendment-001.md

---

## Section 1 — Purpose

### 1.1 What Favorites Are

Favorites are an athlete's personal productivity index for the exercise library. An athlete marks an exercise as a favorite to signal: "I use this. I want to find it fast."

Favorites surface at the top of the exercise picker (W-23), appear in the quick-access section of the Exercise Library Hub (W-21), and rank ahead of non-favorites in search results within matching precision tiers. Their sole purpose is to reduce friction between the athlete and the exercises that anchor their training.

### 1.2 What Favorites Are Not

- **Not a social signal.** No other athlete can see another athlete's favorites. Favorites are invisible outside the athlete's own experience.
- **Not a popularity system.** Aggregate favorite counts are never computed, exposed, or used to rank exercises across athletes.
- **Not an auto-generated list.** Favorites are never derived from workout behavior, session frequency, or exercise history. The system never decides what an athlete "should" have favorited.
- **Not a public ranking.** There is no "most favorited" or "trending exercises" surface in the product.

### 1.3 Why Favorites Exist

Athletes typically train with a consistent subset of exercises. Within a library of 200+ exercises, repeatedly searching for the same movements creates unnecessary friction. Favorites exist to:

- Surface the athlete's go-to exercises at the top of the picker default state
- Build a personal quick-access row in the Exercise Library Hub
- Ensure the athlete's preferred exercises float to the top of relevant search results
- Gradually personalize the exercise discovery experience without requiring any configuration

The signal is athlete-initiated and athlete-controlled. The system does not infer favorites, does not suggest exercises to favorite, and does not penalize exercises that are not favorited.

---

## Section 2 — Data Model

### 2.1 UserFavoriteExercise Entity

`isFavorite` is NOT a field on `ExerciseDefinition` (EL-D2). It is computed per-athlete at query time from the `UserFavoriteExercise` join table. A single `ExerciseDefinition` record may be favorited by zero to N athletes simultaneously with no schema conflict.

```
UserFavoriteExercise {
  athleteId:    uuid          // FK → Athlete.id; not null; indexed
  exerciseId:   uuid          // FK → ExerciseDefinition.id; not null; indexed
  createdAt:    timestamp     // server-assigned at insert time; client never sets this
}

Primary key / unique index: (athleteId, exerciseId)
```

### 2.2 isFavorite Resolution at Query Time

When serving exercise data to an athlete, the server joins `UserFavoriteExercise` on `(athleteId = :requestingAthlete AND exerciseId = exercise.id)` to resolve `isFavorite: boolean` for each exercise in the response. The field is not persisted on the exercise record; it is computed per-request.

Clients may cache resolved `isFavorite` state locally for offline operation and optimistic UI updates.

### 2.3 Favorite Count

No hard limit is enforced on the number of favorites per athlete in MVP (EX-003-D2). Favorites are a personal productivity index — limiting them would contradict the Never Charge For History principle and feel arbitrary to athletes with broad exercise vocabularies.

### 2.4 Timestamps

`createdAt` is server-assigned at the moment the favorite record is created. The client does not pass a timestamp; it passes only intent. The server resolves the exact time.

When a favorite record is re-created after a prior deletion (athlete unfavorited then re-favorited), the new `createdAt` reflects the latest favoriting action. The ordering of the Favorites rows resets accordingly — the re-favorited exercise moves to the front.

---

## Section 3 — Favorite Eligibility

| Exercise State | Eligible | Rule |
|---------------|---------|------|
| `source: 'FORGE'`, `isActive: true` | Yes | Standard catalog; any athlete may favorite |
| `source: 'CUSTOM'`, `isActive: true`, `authorId = requesting athlete` | Yes | Author-owned custom exercises fully eligible |
| `source: 'CUSTOM'`, `isActive: true`, `authorId ≠ requesting athlete` | No | Custom exercises are private to their author in MVP (EX-001-D2) |
| `source: 'FORGE'`, `isActive: false` (Forge-team deactivated) | No | Deactivated exercises excluded from catalog; existing UserFavoriteExercise records removed silently (EX-003-D8) |
| `source: 'CUSTOM'`, `isActive: false` (athlete soft-deleted) | No | Soft-deleted exercises excluded; UserFavoriteExercise removed silently on deletion (EX-001-D7 cascade) |
| `[Deleted Exercise]` tombstone in template or program context | Not applicable | A tombstone is a placeholder, not an ExerciseDefinition; no favorite capability exists |

### 3.1 Eligibility and Visibility

An athlete can only favorite exercises they can see. Because Custom exercises are private to their author in MVP, an athlete will never encounter a foreign CUSTOM exercise in the catalog. The `authorId ≠ requesting athlete` rule is stated for completeness; it is not a defense against a common interaction path.

---

## Section 4 — Favorite Creation

### 4.1 MVP Toggle Surfaces

Three surfaces support favorite toggling in MVP.

#### 4.1.1 W-22 Exercise Detail — Sticky Header Heart Icon

The heart icon in W-22's sticky header is the canonical favorite toggle (W-22 §13). It is always visible regardless of scroll position. Tapping toggles the favorite state with an immediate local update and a queued server write.

This is the highest-fidelity favoriting path: the athlete has already navigated to the exercise's full detail screen, indicating deliberate engagement before choosing to favorite.

Visual states (consistent with W-22 §13.2):

| State | Icon | Accessible Label |
|-------|------|-----------------|
| Not favorited | Heart outline, muted | "Add [Exercise Name] to Favorites" |
| Favorited | Heart filled, warm accent | "Remove [Exercise Name] from Favorites" |

#### 4.1.2 W-21 Exercise Library Hub — Exercise Row Toggle

Exercise rows throughout W-21 (FORGE category browse results, My Exercises CUSTOM rows, global search results) display a heart icon at the trailing edge of the row. The icon matches the W-22 visual treatment: outlined when not favorited, filled warm accent when favorited.

Single tap toggles the favorite state. No long-press required on W-21 rows — W-21 is a discovery and browse surface where the athlete is not mid-task; direct toggle is appropriate.

#### 4.1.3 W-23 Exercise Picker — Long-Press Contextual Action (EX-003-D4)

W-23 is primarily a task-completion surface (select an exercise to add to a workout). No visible heart icon appears on any exercise row or compact card in W-23. The picker layout is unchanged from its current specification.

However, athletes also encounter exercises during discovery within W-23 — while browsing categories, substituting exercises, or searching for something new. A long-press on any exercise row in W-23 opens a contextual action sheet:

```
┌──────────────────────────────────────────────┐
│  [Exercise Name]                             │
│  ────────────────────────────────────────    │
│  View Exercise                               │
│  Favorite                                    │
│  ────────────────────────────────────────    │
│  Cancel                                      │
└──────────────────────────────────────────────┘
```

The "Favorite" label becomes "Unfavorite" when the exercise is already favorited.

**Action behaviors:**
- **View Exercise** — navigates to W-22 (full-screen push). The athlete can view full detail and return to W-23 via the back gesture.
- **Favorite / Unfavorite** — toggles the favorite state without leaving W-23. The sheet dismisses; the exercise row updates inline if visible.
- **Cancel** — dismisses the sheet; no action taken.

**Long-press is available on:**
- Exercise rows in W-23 browse lists (category drill-down views)
- Exercise rows in W-23 search results
- Compact cards in the Recently Used row
- Compact cards in the Favorites row (long-press shows "Unfavorite" and "View Exercise" — enabling removal directly from the surface where the exercise already appears)

**Long-press is NOT available on:**
- Category browse tiles (section headers, not exercise rows)
- Section header labels ("MY EXERCISES", "ALL EXERCISES", "Favorites ›", "Recently Used ›")

**Why long-press, not a visible icon:**

Adding a visible heart icon to W-23 rows would introduce a second tap target on every exercise row in the picker, creating accidental-tap risk during high-frequency exercise selection. Long-press requires deliberate hold (≥ 500ms), preserving the picker's task-completion speed and visual cleanliness while eliminating the W-23 → W-22 → Favorite → Back detour for athletes who want to mark an exercise during discovery. The picker remains visually identical. The long-press gesture is inherently intentional, consistent with the deliberate-favorite philosophy. (EX-003-D4)

### 4.2 Deferred Toggle Surfaces (Post-MVP)

| Surface | Reason for Deferral |
|---------|---------------------|
| W-9 / W-10 active workout exercise panel | Workout execution has its own focus context; adding a favorite toggle during a live session introduces library-curation friction mid-workout. W-22 is accessible from the exercise detail panel for athletes who want to favorite during a session. |
| W-27 Template Detail exercise rows | Template editing has a focused task context; W-22 is one tap away from any exercise row. |

---

## Section 5 — Favorite Removal

### 5.1 Manual Removal

Tapping a filled heart icon (favorited state) on any MVP toggle surface unfavorites the exercise. No confirmation is shown — favoriting is non-destructive and immediately reversible by tapping the heart again. Consistent with W-22 §13.3.

### 5.2 Cascade Removal on Exercise Deletion or Deactivation

| Event | Cascade Behavior |
|-------|-----------------|
| Athlete soft-deletes own CUSTOM exercise (`isActive: false`) | UserFavoriteExercise record for that exercise deleted silently. No notification. Exercise disappears from all Favorites surfaces. (EX-001-D7) |
| Forge team deactivates a FORGE exercise (`isActive: false`) | Same cascade: UserFavoriteExercise record deleted silently. No notification. (EX-003-D8) |

Cascade removal is silent in both cases. The exercise simply disappears from the Favorites rows and Favorites browse — absence is the signal. No toast, no "exercise removed from favorites" message is shown.

### 5.3 No Confirmation Required

Unfavoriting is always a single tap with no confirmation prompt. The action is:
- Immediately reversible (re-tap to re-favorite; record re-inserted with new `createdAt`)
- Low-stakes (no content is deleted; the exercise remains in the catalog)
- Consistent with W-22 §13.3's explicit no-confirmation rule

---

## Section 6 — Search Behavior

### 6.1 Ranking Hierarchy

Favorites participate in search ranking across all exercise search surfaces (W-21 global search, W-23 picker search). The hierarchy, formalized from W-23 §11.3:

| Priority | Signal | Rule |
|----------|--------|------|
| 1 (highest) | Match weight | Exact name > prefix name > contains name > muscle/equipment match |
| 2 | `isFavorite: true` | Within the same match-weight tier, favorited exercises rank first |
| 3 | Recently Used | Within non-favorites at the same match-weight tier, recently used exercises rank first |
| 4 (lowest) | Alphabetical | All remaining exercises, A–Z by name |

Favorites never override match precision. An unfavorited exact-name match always ranks above a favorited partial match. (EX-003-D9)

### 6.2 Search Within Favorites — Source: Favorites Filter

W-23 includes a Source filter option: **Favorites**. When selected, only exercises where `isFavorite: true` are included in the exercise set before search is applied. Search queries, other active filters, and context filters all operate within this reduced set. (W23-D14)

The equivalent in W-21 is the dedicated Favorites browse view, reached by tapping "Favorites ›" in the MY EXERCISES section. No separate "Favorites only" toggle is needed in W-21 search because the browse view already serves this function.

### 6.3 Favorites and Context Filters in W-23

In W-23 context-filtered sessions (e.g., a Mobility-typed workout), the Favorites row shows only favorited exercises compatible with the active context. Favorites outside the current context are hidden from the Favorites row. This is consistent with W-23's general context-filtering behavior (W-23 §8.3).

Context filtering does not affect the Favorites browse view in W-21, which always shows all favorited exercises regardless of activity type.

---

## Section 7 — W-21 Integration

### 7.1 MY EXERCISES Quick-Access Section

The MY EXERCISES section in the Exercise Library Hub (W-21) provides two horizontal-scroll quick-access rows: Favorites and Recently Used. Each row is visible only when the athlete has at least one entry in that row. If either row has no entries, that row is omitted.

**Favorites Row:**
- Shows all favorited exercises (FORGE + CUSTOM), ordered by `createdAt DESC` (most recently favorited first)
- First 4 cards visible before horizontal scroll begins
- "Favorites ›" header tap navigates to the full Favorites browse view
- Each card: exercise thumbnail (if available), exercise name (max 2 lines), "Custom" label for CUSTOM exercises

**Recently Used Row (W-21 context):**
W-21 Recently Used is ordered by last-trained session date — the last time the athlete completed a set of this exercise in a workout session (W-9 session history). This is distinct from W-23 Recently Used:

| Surface | Recently Used Source | Order Signal |
|---------|---------------------|--------------|
| W-21 | WorkoutSession history | Last completed session date containing this exercise |
| W-23 | Picker selection history | Last time the athlete selected this exercise from the picker |

The two signals serve different discovery needs: W-21 shows "what I last trained" (retrospective, browsing context), W-23 shows "what I last added to a workout" (task-predictive, selection context). An exercise may appear at different positions in each surface's Recently Used row. (EX-003-D11)

### 7.2 Full Favorites Browse View

Tapping "Favorites ›" in the MY EXERCISES section navigates to a dedicated Favorites browse view within W-21. This view:
- Shows all favorited exercises (FORGE + CUSTOM) in a scrollable list
- Default sort: `createdAt DESC` (most recently favorited first)
- Supports search within the favorites list
- Each row uses the standard W-21 exercise row layout with the heart icon shown in filled state (all rows are favorites)
- Heart icon tap unfavorites the exercise; the row disappears from this view immediately
- When the list becomes empty: shows an empty state ("No favorites yet. Tap the heart icon on any exercise to save it here.")

### 7.3 Favorite Toggle on W-21 Exercise Rows

All exercise rows in W-21 (FORGE category browse drill-down, My Exercises CUSTOM list, Favorites browse, search results) display a heart icon at the trailing edge of the row. Single tap toggles. The trailing heart icon does not appear on section headers, category tile cards, or the MY EXERCISES row-level headers.

---

## Section 8 — W-23 Integration

### 8.1 Favorites Row in Default State

When W-23 opens, the MY EXERCISES section shows the Favorites row if the athlete has at least one favorited exercise. Cards are ordered `createdAt DESC`. Full card tap immediately selects the exercise and returns to the caller — the fastest possible selection path.

No heart icon appears on compact cards in this row; their presence in this row already signifies favorited status. Long-press on a compact card opens the contextual action sheet with "View Exercise" and "Unfavorite" options.

### 8.2 Source: Favorites Filter

The Source filter in W-23 includes a "Favorites" option. When active, the exercise catalog is reduced to only `isFavorite: true` exercises before any other filter, context, or search operation is applied. This is the direct path for "show me only my favorited exercises." (W23-D14)

### 8.3 Search Result Ranking

Within any W-23 search result set, favorites rank first within each match-weight tier (Section 6.1). No visual badge, icon, or label distinguishes favorited from non-favorited results in the search list — ranking position is the signal. (EX-003-D9)

### 8.4 Long-Press Contextual Action

See Section 4.1.3 for the full specification. The action sheet is available on all W-23 exercise rows and compact cards. No visible heart icon or any other UI change appears on W-23 rows as a result of this feature. (EX-003-D4)

---

## Section 9 — Workout Logging Integration

### 9.1 No Auto-Creation from Logging

Logging an exercise in W-9 (or any workout session surface) does NOT create a favorite. The two discovery signals are always independent:

| Signal | Origin | Characteristic |
|--------|--------|---------------|
| Recently Used | Automatic — derived from behavior | "What the athlete has done" |
| Favorites | Manual — athlete-chosen | "What the athlete wants to find fast" |

An exercise may be frequently used but not favorited (the athlete trains it regularly but doesn't need it surfaced preferentially). An exercise may be favorited but not recently used (the athlete values it but hasn't trained it lately). The system does not conflate these signals. (EX-003-D1)

### 9.2 Workout Surface Favorite Toggle — Deferred

A favorite toggle within the workout execution flow (W-9 live session exercise panels) is deferred to post-MVP. During an active session, the athlete's focus is on execution. W-22 is always accessible from the exercise detail panel for athletes who want to favorite mid-workout.

---

## Section 10 — Offline and Sync Behavior

### 10.1 Offline-First Toggle

Favorite state changes are stored locally and synced when connectivity resumes. The athlete can favorite or unfavorite an exercise offline — the local state updates immediately. The server write is queued and executed on reconnect. (Consistent with W-22 §13.5.)

The athlete never experiences a network gate on a simple personal preference. (EX-003-D7)

### 10.2 Conflict Resolution

The UserFavoriteExercise record is a simple existence record: present means favorited, absent means not favorited. Toggle operations are idempotent:

- Two concurrent favorite operations for the same (athleteId, exerciseId) produce one record. No duplicate. The unique index enforces this.
- Two concurrent unfavorite operations produce zero records. No error.
- A favorite-then-unfavorite sequence across two devices, queued at different times, resolves to the state of the last operation that reaches the server. Last-write-wins is sufficient because there are no compound fields to merge — only existence.

There are no true merge conflict scenarios in the favorites sync model.

### 10.3 Cross-Device Consistency

Server state is canonical. When the app reconnects, pending local operations are flushed to the server in order. The client reconciles its local cache with the server response on the next catalog load. Brief divergence between devices (one shows favorited, another shows unfavorited) is acceptable within the offline window and resolves automatically.

---

## Section 11 — Future Compatibility

### 11.1 AI Recommendation Systems

Future AI recommendation systems may use `UserFavoriteExercise` as an explicit preference signal alongside session frequency, recency, and program affiliation. The join table is already structured to support this: it is a flat, queryable record with no schema changes required. Favorites are a strong explicit signal (athlete-chosen) versus recency (behavioral). Recommendation systems should weight them accordingly.

### 11.2 Program Creation and Smart Start

A future "smart start" feature for custom program creation could surface exercises the athlete commonly uses, combining favorites and recency signals. UserFavoriteExercise supports this as one input without schema modification.

### 11.3 Coach and Training Partner Systems

A future coaching system may read an athlete's UserFavoriteExercise records (with appropriate permissions) to understand that athlete's preferred exercise vocabulary. The join table design supports multi-consumer reads. (EX-003-D12)

### 11.4 Exercise Intelligence Services

A post-MVP exercise intelligence service might suggest exercises to favorite based on usage patterns. When that system is designed, UserFavoriteExercise remains the write target — the suggestion is the new work; the storage model is already correct.

---

## Section 12 — Non-Behaviors

Favorites do not and will not (without a new architecture decision):

| Non-Behavior | Reason |
|-------------|--------|
| Show other athletes' favorites | Favorites are private. Social-proof mechanics conflict with Product DNA. |
| Expose aggregate favorite counts ("Favorited by 312 athletes") | Popularity signals violate the personal-tool design and Product DNA's anti-leaderboard principle. |
| Create favorites automatically from any behavioral signal | Deliberate-interaction principle (Product DNA). Auto-creation blurs the favorites/recency distinction. |
| Suggest exercises to favorite | Unsolicited curation suggestions conflict with deliberate-interaction design. The athlete's choices are their own. |
| Show favorites in public profile or squad surfaces | Favorites are invisible outside the athlete's own library surfaces. |
| Apply a monetization gate to favorites in MVP | Favorites are a productivity index adjacent to history. Never Charge For History principle applies. Any future gating must preserve existing favorites on downgrade. |
| Show a "Most Favorited" browse category | Popularity ranking across athletes is explicitly prohibited. |
| Track a favorite streak or engagement metric on favorites | Addictive engagement mechanics conflict with Product DNA. |
| Export the favorites list | No export surface planned or required in MVP. |
| Allow batch-favoriting or bulk-favorite actions | Favorites are a deliberate per-exercise action. Bulk curation tools are out of scope for MVP. |
| Surface favorites in the Honors system | Honors evaluate workout behavior, not library curation preferences. |
| Apply favorites to exercise categories, programs, or workout templates | Favorites is exercise-scoped. Other entity types have their own organizational surfaces. |
| Show the athlete when they favorited an exercise | `createdAt` is server data used for ordering only; it is not surfaced in the UI. |
| Allow athletes to annotate or name their favorites | Favorites are a presence/absence toggle. Notes belong on the exercise itself (Custom Exercise Notes field in W-24). |
| Apply visible heart icons or badges to W-23 exercise rows | Picker rows have no visible favorite controls. Long-press is the only favorite affordance in W-23. |

---

## Section 13 — Architecture Decisions

| Decision | Rule |
|----------|------|
| **EX-003-D1 — Favorites are strictly manual** | No automatic favorite creation from workout behavior, session frequency, exercise viewing, or any other behavioral signal. The explicit athlete gesture is what makes a favorite meaningful. Auto-creation would blur the favorites/recency distinction and introduce engagement mechanics inconsistent with Product DNA's deliberate-interaction principle. |
| **EX-003-D2 — No hard favorite count limit in MVP** | Favorites are a personal productivity index, not a storage resource. They generate no content unlike programs, photos, or imports. Capping them would contradict the Never Charge For History principle. If volume becomes a system concern post-MVP, this decision is revisited with the constraint that existing favorites must be preserved on any downgrade. |
| **EX-003-D3 — Composite uniqueness: (athleteId, exerciseId)** | One UserFavoriteExercise record per athlete per exercise. Toggle is implemented as INSERT on favorite and DELETE on unfavorite. No boolean field to update; existence is the state. Duplicate inserts are idempotent (unique index enforced at the database level). |
| **EX-003-D4 — MVP toggle surfaces: W-22, W-21 exercise rows, and W-23 long-press** | W-22 (already locked in W-22 §13) is the canonical toggle. W-21 exercise rows add a direct-toggle path in the discovery and browse context. W-23 adds a long-press contextual action — not a visible heart icon — preserving picker speed and visual cleanliness while eliminating the W-23 → W-22 → Favorite → Back detour at the highest-frequency exercise surface. Long-press requires deliberate hold (≥500ms), satisfying the deliberate-favorite principle. Workout execution surfaces (W-9, W-10, W-27) are deferred. |
| **EX-003-D5 — Favorites row ordering: `createdAt DESC`** | Favorites rows in W-21 and W-23 show exercises ordered by most recently favorited. Recently favorited exercises are more likely to reflect current training priorities. Alphabetical would force athletes to scroll for recently added entries. `createdAt` resets to the new insert time when an exercise is unfavorited and re-favorited. |
| **EX-003-D6 — Favorites are fully private in MVP** | No other athlete, squad member, or coach can see an athlete's favorites. Favorites are a personal productivity tool; exposing them would transform them into a social signal. If a coaching or squad layer introduces favorites visibility post-MVP, a new permission architecture governs that decision. |
| **EX-003-D7 — Offline-first: local state immediate, sync on reconnect** | Consistent with W-22 §13.5. Favorite toggles are queued writes, not blocking network operations. The athlete's preference is recorded locally immediately; the server is the eventual authority. Last-write-wins is sufficient for a toggle-only, no-merge-conflict data model. |
| **EX-003-D8 — FORGE exercise deactivation cascade: UserFavoriteExercise removed silently** | Mirrors EX-001-D7 cascade for CUSTOM soft-delete. If the Forge team deactivates a FORGE exercise (`isActive: false`), the exercise disappears from the catalog and UserFavoriteExercise records for that exercise are removed silently. Athletes receive no notification. Absence from the Favorites row is the signal. Consistent behavior across both exercise sources. |
| **EX-003-D9 — Favorites rank within match-weight tier only; never above exact matches** | A favorited partial match never beats an unfavorited exact match. Match precision is always the primary search signal. Favorites serve as a tiebreaker within each precision tier, ensuring the athlete's go-to exercises float to the top of relevant results without distorting precision-driven ranking. |
| **EX-003-D10 — No monetization gate on favorites in MVP** | Applying a premium gate to favorites would feel restrictive without product benefit. Unlike programs (creation cost), photos (storage cost), or imports (service cost), favorites generate no server load beyond a join-table row. If subscription evolution creates a case for favorites gating, this decision is explicitly revisited — with the constraint that any future gate must preserve existing favorites on downgrade and must pass the Monetization Amendment 001 §10 six-question framework. |
| **EX-003-D11 — W-21 Recently Used and W-23 Recently Used are independent signals** | W-21 Recently Used is ordered by last-trained session date (WorkoutSession history). W-23 Recently Used is ordered by last picker-selection date. They serve different discovery needs: W-21 is retrospective ("what I last trained"), W-23 is task-predictive ("what I last added to a workout"). Both display their ordered rows independently in their respective surfaces. An exercise may appear at different positions in each surface's row. |
| **EX-003-D12 — Favorites are a first-class signal preserved for future AI and recommendation systems** | UserFavoriteExercise is a clean, queryable, athlete-intent table. Future AI, coach, and smart-suggestion systems should read from it as an explicit preference signal alongside recency and behavioral data. No schema changes are required for any currently envisioned system. This table is intentionally multi-consumer and must not be altered or deprecated for MVP-scoped reasons. |

---

## Section 14 — Validation Checklist

### Data Model
- [ ] `UserFavoriteExercise { athleteId, exerciseId, createdAt }` table exists with composite unique index on `(athleteId, exerciseId)`
- [ ] `isFavorite` is NOT a field on `ExerciseDefinition`; resolved at query time via join
- [ ] No hard count limit enforced on favorites per athlete in MVP
- [ ] `createdAt` is server-assigned at insert time; client does not pass a timestamp

### Eligibility
- [ ] FORGE, `isActive: true` → eligible for any athlete
- [ ] CUSTOM, `isActive: true`, `authorId = requesting athlete` → eligible
- [ ] CUSTOM, `isActive: true`, `authorId ≠ requesting athlete` → ineligible (privacy boundary)
- [ ] Any exercise with `isActive: false` → ineligible; existing UserFavoriteExercise records cascade-removed silently

### Toggle Surfaces
- [ ] W-22 sticky header heart icon: single tap toggles; outlined = not favorited; filled warm accent = favorited; no confirmation
- [ ] W-21 exercise rows: trailing heart icon; single tap toggles; consistent visual treatment with W-22
- [ ] W-23: NO visible heart icon on any exercise row or compact card
- [ ] W-23: long-press (≥500ms) on any exercise row or compact card opens contextual action sheet
- [ ] W-23 action sheet items: "View Exercise" | "Favorite" or "Unfavorite" (context-aware label) | "Cancel"
- [ ] W-23 "View Exercise" → navigates to W-22 full-screen push
- [ ] W-23 "Favorite / Unfavorite" → toggles state, sheet dismisses, row reflects updated state
- [ ] W-23 long-press available on: browse list rows, search result rows, Recently Used compact cards, Favorites compact cards
- [ ] W-23 long-press NOT available on: category browse tiles, MY EXERCISES / ALL EXERCISES section headers
- [ ] W-9 / W-10 workout surfaces: no favorite toggle (deferred)
- [ ] W-27 Template Detail rows: no favorite toggle (deferred)

### W-21 Integration
- [ ] MY EXERCISES section shows Favorites row and Recently Used row independently (each visible only when ≥1 entry)
- [ ] Favorites row: exercises ordered `createdAt DESC`; first 4 visible before scroll
- [ ] Favorites row: "Favorites ›" header navigates to full Favorites browse view
- [ ] Favorites browse view: scrollable, `createdAt DESC`, supports search, heart icon filled on all rows
- [ ] Favorites browse empty state: displayed when athlete has no favorites
- [ ] Unfavoriting from Favorites browse: row disappears immediately
- [ ] Recently Used row in W-21: ordered by last WorkoutSession session date for that exercise (NOT picker selection date)
- [ ] Heart icon appears on all W-21 exercise rows (FORGE browse, My Exercises, Favorites browse, global search)
- [ ] Heart icon does NOT appear on category browse tiles or section headers

### W-23 Integration
- [ ] Favorites horizontal-scroll row shown when ≥1 favorite exists; `createdAt DESC`; full card tap = immediate exercise selection
- [ ] No heart icon visible on any W-23 row or compact card
- [ ] Long-press contextual action sheet functions correctly per Section 4.1.3
- [ ] Source: Favorites filter limits exercise set to `isFavorite: true` only
- [ ] Source: Favorites filter interacts correctly with search queries and other active filters
- [ ] Context filter hides out-of-context favorites from the Favorites row (consistent with W-23 §8.3)

### Search Ranking
- [ ] Match weight is always the primary sort key; favorites cannot override a higher match-weight result
- [ ] Within the same match-weight tier: `isFavorite: true` ranks above `isFavorite: false`
- [ ] Within non-favorites at the same weight: recently used ranks above non-recently-used
- [ ] Alphabetical is the final tiebreaker at all surfaces

### Cascade Removal
- [ ] CUSTOM exercise soft-delete (`isActive: false`): UserFavoriteExercise removed silently; no toast
- [ ] FORGE exercise deactivation (`isActive: false`): UserFavoriteExercise removed silently; no toast
- [ ] Exercise disappears from Favorites rows and Favorites browse without placeholder or tombstone
- [ ] No "removed from favorites" notification shown on cascade removal

### Offline and Sync
- [ ] Favorite toggle available offline; local state updated immediately
- [ ] Server write queued; executed on reconnect
- [ ] Duplicate favorite inserts are idempotent (unique constraint; no error)
- [ ] Last-write-wins on sync; no merge conflict scenarios
- [ ] Cross-device: server state canonical after sync; local cache reconciled on next catalog load

### Non-Behaviors Confirmed
- [ ] No aggregate favorite counts shown on any surface
- [ ] No auto-favoriting from any behavioral signal (session, logging, viewing)
- [ ] No public or squad visibility of favorites
- [ ] No monetization gate on favorites in MVP
- [ ] No batch-favorite or bulk-favorite tools
- [ ] No `createdAt` timestamp surfaced in the UI
- [ ] No favorites applied to categories, programs, or templates (exercise-scoped only)
- [ ] No "Most Favorited" browse category
- [ ] No favorite streak or engagement metric
- [ ] No visible heart icon in W-23 rows

---

## Section 15 — Downstream Impact

| Document | Impact |
|----------|--------|
| `Exercise-Library-Architecture-v1.0.md` | EL-D2 (`isFavorite` as computed join) and §2.5 (`UserFavoriteExercise` schema sketch) are now formally ratified and extended by Exercise-003. No edits to that document required. |
| `Exercise-001-Custom-Exercise-Architecture.md` | §7.2 cascade behavior (`UserFavoriteExercise` removed on soft-delete) is referenced and honored. No edits required. |
| `Exercise-Detail-Wireframe-Spec-W22.md` | W-22 §13 favorite behavior is now backed by this architecture document. No edits required. |
| `Exercise-Picker-Wireframe-Spec-W23.md` | W-23 §7 (Favorites row), §11.3 (search ranking), and W23-D14 (Source: Favorites filter) are now backed by this architecture. **One addition required:** document that W-23 exercise rows and compact cards support a long-press contextual action ("View Exercise" / "Favorite" / "Unfavorite") per EX-003-D4. No visible UI changes to W-23 row layout. |
| `Exercise-Library-Hub-Wireframe-Spec-W21.md` (not yet authored) | When W-21 is written, it must implement: (1) Favorites row in MY EXERCISES section (`createdAt DESC`, "Favorites ›" header, full Favorites browse view); (2) Recently Used row ordered by WorkoutSession history (distinct from W-23 Recently Used); (3) trailing heart icon toggle on all exercise rows; (4) Favorites browse view with search support and empty state. All Favorites and Recently Used behaviors for W-21 are defined here. |

---

## Section 16 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Defines Exercise Favorites architecture end-to-end. Formalizes `UserFavoriteExercise` data model from EL-D2 sketch. Locks 12 architecture decisions (EX-003-D1 through EX-003-D12). Establishes three MVP toggle surfaces: W-22 sticky header (existing), W-21 exercise rows (new), and W-23 long-press contextual action (new — no visible picker UI changes). Favorites are strictly manual, fully private, unlimited, offline-first, and preserved as a first-class signal for future AI and recommendation systems. Cascade removal extended to FORGE exercise deactivation (EX-003-D8). W-21 and W-23 Recently Used defined as independent signals (EX-003-D11). W-23 long-press includes "View Exercise" as a companion action. |

---

*Forge Legacy — Exercise-003: Exercise Favorites Architecture — v1.0*
*June 2026*
*Authority for all Exercise Favorites behavior across W-21, W-22, W-23, and future surfaces.*
*Implements EL-D2. Extends EX-001-D7. Backs W-22 §13, W-23 §7, W-23 §11.3, and W23-D14.*
