# Forge Legacy — Supabase Data Model v1.0 (Phase 0 design)

**Status:** DESIGN — for PO review. **Nothing applied to any database.** Phase 1 applies only the **SPINE** set (§2); the rest is designed-on-paper now, built later so each screen is wired to the real backend once (no fixture-then-rewire).

Derived from a full enumeration of the real `src/domain/*` schemas, the `src/data/*` placeholder shapes, and the LOCKED `Docs/*` specs. Every table cites its source class: **[code]** (a real TS shape exists) · **[spec]** (LOCKED architecture doc) · **[derived]** (design target from a UI surface).

---

## 1. Conventions

- Postgres 15 / Supabase. `uuid` PKs (`gen_random_uuid()`), `timestamptz` everywhere, `citext` for case-insensitive handles/usernames.
- **`athlete_id` = `profiles.id` = `auth.users.id`** (1:1). The demo user is a real `auth.users` row; "self" is `auth.uid()`, not a `?as=` query param.
- RLS **ON for every table**. Reference/seed tables are world-readable, write-locked to service role.
- **Reference/seed** (read-only content shipped with the app): `exercises`, `muscles`, `equipment`, `exercise_muscles`, `exercise_relationships`, `exercise_coaching`, `honors` (catalog), `rank_families`, `program_definitions` (+ nested). Seeded from the existing JSON / the LOCKED Honor Catalog doc; **not** user-written.
- **Bundled, NOT in the DB:** the home-artwork registry + screen backgrounds (Metro static `require()` — compile-time assets).

### Phase → what gets applied
| Phase | Applied |
|---|---|
| **1** | Spine tables (§2) · `rank_families` seed · auth trigger (`handle_new_user`) · `avatars` + `media` storage buckets · seed the demo user from fixtures |
| **later** | Everything in §3 onward, one screen-cluster at a time, already on the real backend |

---

## 2. THE SPINE (Phase 1 applies this)

The vertical slice that goes real through Phase 3: identity → log a workout → derive a PR → append a timeline event → read it back in Legacy.

| Table | Class | Demo | Role in the slice |
|---|---|---|---|
| `profiles` | [code] | **live** | identity; "self" is a real logged-in user |
| `chapters` | [code] | **live** | the active chapter a logged workout lands in |
| `workouts` | [spec] | **new write (Phase 3)** | a logged session — the first real mutation |
| `workout_exercises` | [spec] | **new write** | per-exercise rows in a session |
| `workout_sets` | [spec] | **new write** | logged sets (weight×reps) |
| `personal_records` | [code] | **live model, Phase 3 derives** | a PR derived from a logged set |
| `timeline_events` | [code] | **live, Phase 3 appends** | the Legacy timeline the workout/PR appends to |

### 2.1 `profiles` [code]
1:1 with `auth.users`. Rank columns are a **cached snapshot** of the computed rank (§4), not authored.
```
id              uuid PK            references auth.users(id) on delete cascade
name            text not null
first_name      text not null
handle          citext not null unique          -- stored without leading '@'
username        citext unique                    -- optional; searchable address (Identity-Amendment-001); null-allowed
initials        text not null
sex             text not null default 'unspecified'  -- enum sex: male|female|unspecified — NEVER coerce to male
athlete_type    text                              -- enum athlete_type: Strength|Bodybuilding|Endurance|Hybrid (nullable)
standard        text                              -- "My Standard" creed
rank_family     text references rank_families(family)   -- cached snapshot
rank_level      smallint check (rank_level between 1 and 4)  -- cached snapshot
created_at      timestamptz not null default now()
updated_at      timestamptz not null default now()
```

### 2.2 `chapters` [code]
`sealed_at IS NULL` ⇒ active. Exactly one active chapter per athlete (partial unique index).
```
id              uuid PK
athlete_id      uuid not null references profiles(id) on delete cascade
name            text not null                     -- not unique by design (L-5)
start_date      date not null
end_date        date
sealed_at       timestamptz                       -- null = active
is_active       boolean not null default true
reflection      text                              -- L-6 sealing reflection; private, never shareable
workout_count   integer not null default 0        -- denormalized rollup
honor_count     integer not null default 0        -- denormalized rollup
created_at      timestamptz not null default now()
-- partial unique: one active chapter per athlete
```

### 2.3 `workouts` [spec — W-17 / WSR-001]
No code store today; Phase 3 writes the first row.
```
id                    uuid PK
athlete_id            uuid not null references profiles(id) on delete cascade
chapter_id            uuid references chapters(id)          -- the chapter that received it; null if none active
program_instance_id   uuid references program_instances(id) -- if program-launched (schema-only until §5)
workout_name          text                                  -- "Push Day A" or null (free workout)
activity_type         text not null                         -- enum modality: strength|running|walking|cycling|...
started_at            timestamptz not null
saved_at              timestamptz                           -- committed record (the atomic unit); null while in-progress
duration_sec          integer                               -- the one session-level numeric shown
distance              numeric                               -- cardio only
distance_unit         text                                  -- mi|km|m
state                 text not null default 'in_progress'   -- enum workout_state: in_progress|saved
notes                 text
created_at            timestamptz not null default now()
```

### 2.4 `workout_exercises` [spec]
```
id              uuid PK
workout_id      uuid not null references workouts(id) on delete cascade
catalog_key     text references exercises(id)     -- nullable (custom/warmup drills)
name            text not null                     -- snapshotted display name
section         text not null                     -- enum workout_section: warmup|main|cooldown
position        integer not null
notes           text
```

### 2.5 `workout_sets` [spec]
Zero rows ⇒ "no sets logged" (valid).
```
id                    uuid PK
workout_exercise_id   uuid not null references workout_exercises(id) on delete cascade
set_index             integer not null
weight                numeric                     -- null ⇒ bodyweight
weight_unit           text                        -- lb|kg
reps                  integer
notes                 text
```

### 2.6 `personal_records` [code — `src/domain/records/schema.ts`]
The 4-variant measure union → **discriminator + typed nullable columns** (chosen over jsonb: only 4 variants / ~7 fields, gives real numeric types + CHECK validity + indexability for the eventual leaderboard/ranking `direction`). Display string is **derived** (`formatRecordValue`), never stored.
```
id              uuid PK
athlete_id      uuid references profiles(id) on delete cascade
exercise        text not null                     -- "Back Squat", "5K"
achieved_on     date
measure_kind    text not null                     -- enum measure_kind: load|time|distance|reps
load_value      numeric
load_unit       text                              -- lb|kg
load_reps       integer                           -- optional ("405 lb × 3")
time_seconds    integer                           -- 1188 → "19:48"
distance_value  numeric
distance_unit   text                              -- mi|km|m
reps_count      integer
created_at      timestamptz not null default now()
-- CHECK per measure_kind: exactly the right columns non-null (see SQL §9)
```

### 2.7 `timeline_events` [code — `src/types/legacy.ts`]
`chapter_id NULL` ⇒ **standalone** athlete-level event (e.g. `RANK_UP`); non-null ⇒ nested under a chapter. `source_entity_*` is a **soft reference** (navigation, not FK — history survives source deletion).
```
id                    uuid PK
athlete_id            uuid not null references profiles(id) on delete cascade
event_type            text not null    -- enum flm_event_type: CHAPTER_SEALED|GOAL_ACHIEVED|RANK_UP|
                                        --   PROGRAM_GRADUATED|ACCOMPLISHMENT|HONOR_EARNED|REFLECTION_ADDED|
                                        --   MEMORY_ADDED|PHOTO_ADDED
object_name           text not null    -- referenced thing's display name ("Squat 405 lbs")
chapter_id            uuid references chapters(id)   -- null = standalone (RANK_UP)
occurred_at           timestamptz not null           -- real time; date_label is derived for display
source_entity_type    text                            -- chapter|goal|honor|program|rank|workout
source_entity_id      uuid                            -- soft ref (no FK)
created_at            timestamptz not null default now()
```

---

## 3. SOCIAL — posts, content, comments, reactions [code + spec]

### 3.1 `posts`
`comment_count` and reaction count are **derived** (`count(*)`), never independent (goldened invariant). Community-audience posts are barred from the Friends feed (Firewall §7.4).
```
id                  uuid PK
author_athlete_id   uuid not null references profiles(id)
author_role         text        -- enum squad_title: owner|mod|captain — DECORATIVE badge, sourced from author's squad_members.title; grants nothing (§6/§10)
source_kind         text not null   -- enum source_kind: community|squad|friend
source_name         text not null
source_tag          text not null
audience            text not null   -- enum post_audience: FRIENDS|SQUAD|BOTH|COMMUNITY [spec SOC-D7]
squad_id            uuid references squads(id)        -- non-null iff squad-scoped
community_id        uuid references communities(id)   -- non-null iff audience=COMMUNITY (schema-only)
post_source         text not null default 'MANUAL'    -- enum: MANUAL|MILESTONE_AUTO
milestone_type      text                              -- set only when MILESTONE_AUTO
type_label          text                              -- "PR","Honor","Check-in"
challenge           text
body                text
share_type          text        -- enum share_kind: accomplishment|honor|goal|pr|chapter|rank|program|transformation|workout
created_at          timestamptz not null default now()
archived_at         timestamptz
deleted_at          timestamptz
```

### 3.2 `post_content` (the 10 per-type variants) [code]
**One table, 1:1 with `posts`, `type` + `jsonb payload`** (chosen over per-type columns: it's authored as a discriminated union, `achievement.record` is itself a nested union, and the squad-only variants keep growing). CHECK constraint keys required jsonb fields per type.
```
post_id    uuid PK references posts(id) on delete cascade
type       text not null   -- enum content_type (10 variants) — PROMOTED to an indexed discriminator column (feed-by-type)
media_kind text            -- enum media_format: photo|video — PROMOTED indexed discriminator, nullable (the media system keys off it)
payload    jsonb not null default '{}'   -- streak + every other per-type field stays here
-- CHECK: (type = 'media') = (media_kind is not null)
```
The two **queried** discriminators (`type`, `media_kind`) are real indexed enum columns — same call as the PR measure_kind; everything else stays in `payload`.
Payload shapes (per `PostContent` union): `achievement{record:PersonalRecord, label}` · `honor{label,title,sub?}` · `program{programId?,programName,durationWeeks?,frequencyPerWeek?,structure?,price?,kindLabel?,saveLabel?,savedNote?,footNote?}` · `media{mediaKind:photo|video, duration?}` · `event{month,day,title,when,going}` · `poll{options:[{text,pct,chosen?}],footer}` · `checkin{streak?}` · `challengeUpdate{name,place,of,metric}` · `text`/`traintogether{}`.

### 3.3 `comments` [code] — single table, self-FK, depth 1
Replies = rows with `parent_comment_id` set; CHECK forbids depth > 1 and forbids reply-level `respect`. Chronological, never engagement-ranked, never bump the post (SOC-D11).
```
id                  uuid PK
post_id             uuid not null references posts(id) on delete cascade
parent_comment_id   uuid references comments(id)   -- null = top-level; set = reply (max depth 1)
author_athlete_id   uuid not null references profiles(id)
author_role         text                            -- decorative badge only
body                text not null
created_at          timestamptz not null default now()
```

### 3.4 `reactions` [spec — SOC-D11] — rows, not a count
The code's `respect` integer is a demo count; the real entity is per-athlete rows. **Never surfaced as a popularity/status number, never an ordering key.** One per athlete per target.
```
id            uuid PK
target_type   text not null      -- post|comment
target_id     uuid not null      -- polymorphic
athlete_id    uuid not null references profiles(id)
created_at    timestamptz not null default now()
unique (target_type, target_id, athlete_id)
```

---

## 4. IDENTITY / RANK [code + spec]

Rank is **computed** (event-driven RCM), never authored per-athlete. `rank_families` is static content; the athlete's current rank is the cached snapshot on `profiles` (§2.1) plus an append-only `rank_events` log that feeds `RANK_UP` timeline events.

### 4.1 `rank_families` [code] — static seed (7 rows)
```
family          text PK          -- foundation|builder|craftsman|architect|established|legend|legacy
sort_order      smallint not null
has_sub_tiers   boolean not null default true   -- false for 'legacy' (D-RCM-16)
```
### 4.2 `rank_events` [spec — Rank-Computation-Model] — append-only
```
id            uuid PK
athlete_id    uuid not null references profiles(id) on delete cascade
family        text not null references rank_families(family)
level         smallint not null check (level between 1 and 4)
computed_at   timestamptz not null default now()
trigger       text not null   -- MeaningfulWorkSessionSaved|ProgramGraduated|ChapterSealed|ImportCompleted
```

---

## 5. PROGRESS — goals, programs, chapters' children, honors, accomplishments

### 5.1 `goals` [code embedded → normalized; spec G-1/G-3]
Chapter-owned, permanent, cannot move between chapters. **Target presence = display discriminator** (set ⇒ quantifiable; blank ⇒ narrative) — no goal-type column. One primary per chapter.
```
id            uuid PK
chapter_id    uuid not null references chapters(id) on delete cascade   -- immutable
name          text not null                     -- ≤100 chars; the goal IS the category
is_primary    boolean not null default false
target        numeric check (target > 0)        -- optional
unit          text                              -- only valid when target set
current_value numeric
progress      smallint check (progress between 0 and 100)  -- quantifiable only
achieved      boolean not null default false
achieved_on   date
program_id    text references program_definitions(id)      -- optional display context
outcome       text                              -- at seal: achieved|not_achieved (neutral, no fail state)
created_at    timestamptz not null default now()
```

### 5.2 `chapter_photos` [code] · `accomplishments` [code]
```
chapter_photos:  id uuid PK · chapter_id uuid FK · media_asset_id uuid FK (§8) · added_at timestamptz
accomplishments: id uuid PK · athlete_id uuid FK · text text · occurred_on date · created_at timestamptz
```

### 5.3 `program_definitions` (+ nested) [code] — static seed, read-only
Generated from `Programs/*.docx`, never user-modified. Nested schedule → child tables (or `blocks jsonb`). Only the 2 LOCKED Strength programs exist today.
```
program_definitions: id text PK · name · family (enum program_family, 6) · difficulty · duration_weeks ·
  frequency_per_week · environment · description · goals text[] · successor_name · theme (enum, 8) ·
  structure (enum: upper_lower|ppl|full_body) · status · source · source_file
program_blocks:      id · definition_id FK · label · week_start · week_end
program_workouts:    id · block_id FK · code (A–D) · name · modality · split (enum, 8) · warmup jsonb[]
exercise_prescriptions: id · workout_id FK · catalog_key → exercises(id) · display_name · sets · reps ·
  reps_max? · unit (reps|seconds|minutes|yards) · per? (leg|side) · rest_sec? · substitution jsonb?
```
### 5.4 `program_instances` [spec] — athlete program state (schema-only)
```
id uuid PK · athlete_id FK · definition_id FK · state (enum program_state: preview|future|active|
  graduated|ended-early) · progress_completed int · progress_total int · started_at timestamptz
-- one 'active' per athlete (partial unique)
```

### 5.5 `honors` (catalog) [spec — Honor-Catalog-v1.0-LOCKED, 167 types] — static seed
Materialized from the LOCKED doc (no JSON in code). `category`/`family` derivable from `honor_type`.
```
honor_type text PK · category (enum, 13) · family text · tier_index int · display_name ·
  display_name_lbs? · display_name_kg? · qualification text · unit_adaptive bool · repeatable bool ·
  trigger text · catalog_visible bool default false · affects_rank bool default false · metadata_keys text[]
```
### 5.6 `honor_instances` [spec — HonorInstance-Architecture] — per-user, written, snapshot-immutable
```
id uuid PK · athlete_id FK · honor_type → honors(honor_type) · display_name text (snapshotted at earn) ·
  date_earned date · awarded_at timestamptz · chapter_id uuid FK (null for one-time; set for 9 repeatable) ·
  source (live_session|offline_sync|import|challenge) · schema_version int default 1 · metadata jsonb default '{}'
-- unique one-time: (athlete_id, honor_type); repeatable: (athlete_id, honor_type, chapter_id)
```

---

## 6. SQUADS [code + spec]

**Role conflict resolved:** code shows decorative `mod`/`captain` badges; the LOCKED S-3 spec is emphatic — **two tiers only: `owner | member`. No moderator, no admin, no co-owner.** Real permissions/RLS are built off `owner|member`; the post/comment `author_role` badge is cosmetic and grants nothing.

```
squads:            id uuid PK · name · motto (≤60) · commitment? · icon (enum, 9+None) ·
                   owner_athlete_id FK · active_goal_id? · active_mission_id? · created_at
                   -- max 10 members (SQ-D1); free tier ≤2 joined (S-1)
squad_members:     id uuid PK · squad_id FK · athlete_id FK · role (squad_role: owner|member — PERMISSION, the only tier RLS reads) ·
                   title (squad_title: owner|mod|captain|null — DECORATIVE badge, real data, grants nothing; §10) ·
                   joined_at date [SQUAD-INTERNAL] · athlete_type? · rank? [public markers] · accolades text[] [SQUAD-INTERNAL]
                   -- roster is the SINGLE source; member_count is a derived count
squad_checkins:    THIN TABLE, not a VIEW — id · squad_member_id FK (invariant check-in ⊆ roster held by the FK) ·
                   status (trained|rest|missed, SQ-D5) · has_video? · unread? · check_date · unique(squad_member_id, check_date).
                   Rationale: 'rest' is a MANUAL member declaration (absence-of-workout can't tell rest from missed), so a
                   pure VIEW over logged data can't hold it → stored, invariant preserved by the roster FK (§2 ruling).
squad_competition: squad_id FK (1:0..1) · name · place · of · workouts · gap · ends
                   -- a squad-scoped VIEW into the Challenge System (SQ-D11), not a new engine
squad_records:     id · squad_id FK · key · label · holder → squad_members · value text · unit · date · is_new?
squad_record_entries: id · record_id FK · holder FK · value · date · position   -- history
athlete_squad_prefs:  athlete_id FK · squad_id FK · is_favorite bool   -- per-viewer local pref (PK pair)
```

---

## 7. FRIENDS + VISIBILITY [spec + code] — and the RLS crown jewel

### 7.1 `friendships` [spec — FR-D1] — symmetric, private, no counts
Store the pair canonically (`athlete_a_id < athlete_b_id`) so uniqueness + RLS are symmetric. Only retained asymmetry: who initiated. Unfriend = hard delete (no "removed" marker).
```
id uuid PK · athlete_a_id FK · athlete_b_id FK · requested_by_athlete_id FK ·
  status (PENDING|ACCEPTED) · requested_at · accepted_at?
unique (athlete_a_id, athlete_b_id)
```

### 7.2 `visibility_settings` [code — VISIBILITY_DEFAULTS + spec SOC-D12]
Per-user, per-section audience. Always-ungated core identity (rank, My Standard, Featured Moment, Honors) is **not** in this table.
```
athlete_id uuid PK FK
audience_chapter          text not null default 'everyone'
audience_history          text not null default 'everyone'
audience_timeline         text not null default 'squads'
audience_transformation   text not null default 'friends'
audience_photos           text not null default 'friends'
audience_accomplishments  text not null default 'everyone'
audience_stats            text not null default 'squads'
default_post_audience     text not null default 'BOTH'   -- FRIENDS|SQUAD|BOTH
auto_share_milestones     boolean not null default true  -- SOC-D12 default ON
discoverable_in_search    boolean not null default true  -- Identity-Amendment-001
```

### 7.3 The visibility → RLS mapping (this is why the domain we built maps cleanly)

`audience` is a **total order** (a clearance compare), not four orthogonal booleans — friend ⊇ squadmate ⊇ stranger.

| audience | required clearance | | relationship | clearance |
|---|---|---|---|---|
| `everyone` | 1 | | `self` | 99 (bypass) |
| `squads` | 2 | | `friend` | 3 |
| `friends` | 3 | | `squadmate` | 2 |
| `private` | 99 (self only) | | `stranger` | 1 |

**Truth table** (before the `hasData` gate): a section is visible iff `clearance(viewer) ≥ required(audience)`; `private` is self-only; `self` bypasses gate (a) for owned sections but still needs data.

| audience ↓ / viewer → | self | friend | squadmate | stranger |
|---|---|---|---|---|
| everyone | ✓ | ✓ | ✓ | ✓ |
| squads | ✓ | ✓ | ✓ | ✗ |
| friends | ✓ | ✓ | ✗ | ✗ |
| private | ✓ | ✗ | ✗ | ✗ |

Implemented as **two SQL helpers** used by every profile-section policy: `fl_clearance(viewer, subject) → int` (99 self / 3 friend / 2 squadmate / 1 else) and `fl_required(audience) → int`. A section row is visible when `fl_clearance(auth.uid(), subject) >= fl_required(subject's audience_<section>)`. **Relationship grants interaction, not visibility** (SOC-D2) — the `friendships`/`squad_members` rows gate the *interaction* tables (comments/reactions), the `audience_*` columns gate *visibility*.

### 7.4 The Firewall → 7 RLS rules (load-bearing)
1. **Squad-scoped rows are member-only.** `posts(squad_id)`, `squad_checkins`, `squad_records`, `squad_record_entries`, `squad_competition`, `squad_members`: `USING (auth.uid() IN (SELECT athlete_id FROM squad_members WHERE squad_id = row.squad_id))`.
2. **`accolades` + `joined_at` never leave the squad.** Public-profile path selects only `rank, athlete_type` (a `public_athlete_markers` view); those two columns are never in a cross-context select.
3. **Performance Firewall lifts ONLY on a squad's own S-1/S-2** (SQ-D2) — standings/streaks/presence barred on Friends/Community/another squad. `squad_competition` RLS scopes to the owning squad's members.
4. **Community posts never reach the Friends feed** (SOC-D9): Friends query `WHERE audience IN ('FRIENDS','BOTH') AND community_id IS NULL`.
5. **Relationship ≠ visibility** (SOC-D2): section policies use the clearance compare against `audience_*`, not mere existence of a relationship row.
6. **Friend list is private to the pair** (FR-D3): `friendships` RLS `USING (auth.uid() IN (athlete_a_id, athlete_b_id))`; never aggregated.
7. **No social action feeds progression** (SOC-D13): posts/comments/reactions/friendships have **no triggers** into `rank_events`/`honor_instances`/`timeline_events`.

---

## 8. MEDIA [derived] — storage-bucket ↔ DB-row split

The file (jpg/mp4) lives in a Supabase **Storage bucket**; a 1:1 `media_assets` row holds owner/kind/path/dims. `Avatar.src` / the post media band resolve to the bucket URL for the row.
```
media_assets:
  id uuid PK · owner_athlete_id FK · kind (enum media_kind: avatar|workout_proof|pr_media|squad_crest|post_media) ·
  storage_path text · mime_type text · width int? · height int? · bytes bigint? ·
  linked_entity_type text? · linked_entity_id uuid? · created_at
```
Buckets: **`avatars`** (`avatars/<uid>.jpg`, public-read) · **`media`** (`media/workouts/<id>.jpg`, `media/crests/<squad>.jpg`; RLS-signed). Owner-write via storage policy `owner = auth.uid()`.

---

## 9. Reference tables (seed) — condensed

`exercises`(794): `id PK · name · aliases text[] · family · equipment_id FK · movement_pattern (18-enum) · difficulty · modality`. `exercise_muscles`(1941): `(exercise_id, muscle_id) · role(Primary|Secondary) · display_order`. `muscles`, `equipment`: id/name/region · id/name/category/portable/environments. `exercise_relationships`(5698): `id · source_id FK · target_id FK · type(5-enum) · rank · compatibility_score · movement_pattern · preserves_pattern · same_primary_muscle · shared_primary_muscle_ids text[] · equipment_change · swap_contexts text[] · reason · editorial_status`. `exercise_coaching`(556): keyed `exercise_id` unique, the full W-22 coaching block + editorial fields (`content_status`, only `Published` user-visible). All **world-read, service-write** RLS.

---

## 10. Code-vs-spec conflicts — resolutions (before freeze)
1. **Roles: permission = `owner|member`** (S-3 — the only tier RLS reads) **+ a nullable decorative `title` (`owner|mod|captain`) on `squad_members`** that drives the rendered MOD/OWNER/CAPTAIN badge from real data (a badge with no data source is fabrication — the line we don't cross). Posts/comments `author_role` is sourced from the author's membership `title`; it grants nothing.
2. **`respect` count → `reactions` rows** (SOC-D11); never a status number or ordering key.
3. **Check-in states → `trained|rest|missed`** (SQ-D5), not code's `trained|pending`.
4. **Squad PR ≠ Squad Record** — `personal_records` (typed union) vs `squad_records` (string aggregates); never merged.
5. **`following` relationship** — clears as stranger; omit from the real resolver (Friend spec bars followers).
6. **`athlete_type` → 4-enum** (`Strength|Bodybuilding|Endurance|Hybrid`, O-2-Amdt-002); reconcile the roster's free-text labels.

---

## 11. Demo-live vs schema-only (the full classification)

**DEMO-LIVE (wired into UI today):** `profiles` · `personal_records` · `chapters` · `timeline_events` · `goals`(embedded) · honors/accomplishments/photos(placeholder) · rank(placeholder) · program content · posts · post_content(all 10) · comments/replies · reactions(as counts) · squads · squad_members · squad_checkins · squad_competition · squad_records · visibility gating.

**SCHEMA-ONLY (design now, build later):** `workouts` · `workout_exercises` · `workout_sets` · `goals`(standalone) · `program_instances` · rank computation + `rank_events` · `friendships` · `visibility_settings`(persisted) · `honor_instances` · `media_assets` · `reactions`(relational) · squad goals/missions/streak · post `audience`/`community_id`/`milestone_type` · communities.

**Phase 2 update (2026-07-16):** Legacy + Profile now read the DEMO-LIVE spine (`profiles`/`chapters`/`timeline_events`, incl. a derived featured moment) live from Supabase. The four still-placeholder Legacy sections above — **photos · accomplishments · honors · chapter goals** — are consolidated into a single explicitly-named transitional source, `src/data/legacy-fixture-pending.ts` (`LEGACY_FIXTURE_PENDING` + `CHAPTER_GOALS_PENDING`), each field carrying a `// FIXTURE until <table> lands` boundary. When `media_assets` / an accomplishments table / `honor_instances` / a standalone `goals` table is applied, delete its entry there and read it live. See FORGE_DELTAS §21.

---

## 12. Migration SQL

**Phase 1 applies `0001_spine.sql` only.** `0002_full_model.sql` is written here (the "whole model on paper" gate) but **not applied** until each cluster's screens are built.

> The complete DDL — enums, all tables, CHECK constraints, the `fl_clearance`/`fl_required` RLS helpers, spine RLS policies, the 7 Firewall policies, the `handle_new_user` auth trigger, and the two storage buckets — is authored as companion files `supabase/migrations/0001_spine.sql` + `supabase/design/0002_full_model.sql` alongside this doc in the Phase 0 commit. `0002` lives under `design/` (not `migrations/`) precisely so the Supabase CLI cannot auto-apply it. **Nothing is pushed to a database in Phase 0.**

**Decisions — RULED (applied above):**
1. Program schedule → **child tables** (`program_blocks`/`program_workouts`/`exercise_prescriptions`) — the Workout Builder mutates individual prescriptions; referential integrity + partial updates matter.
2. `squad_checkins` → **thin FK'd table, not a VIEW.** `rest` is a manual member declaration (absence-of-workout can't distinguish rest from missed), so a pure VIEW over logged data can't hold it; the check-in ⊆ roster invariant is held by the FK to `squad_members`.
3. `post_content` → **jsonb + per-type CHECK, with `type` + `media_kind` promoted** to indexed enum columns (the two queried discriminators — feed-by-type + the media system); `streak` and the rest stay in `payload`.
4. `honors` catalog → **table kept in `0002`, the 167-row seed DEFERRED** to a one-shot task when honors surface (reference, not spine).
5. Roles → **`owner|member` permission tier + a decorative `title` (`owner|mod|captain|null`) on `squad_members`** driving the badge from real data (§10 #1). The other three conflict resolutions (respect→reactions rows · check-in states enum · athlete_type 4-enum) stand.
