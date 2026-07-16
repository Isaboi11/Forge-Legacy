-- Forge Legacy — FULL MODEL (design-on-paper, the "don't miss anything" gate).
-- DELIBERATELY under supabase/design/ (NOT supabase/migrations/) so the Supabase CLI cannot
-- auto-apply it. NOT PUSHED in Phase 0. Each cluster graduates into a real migration when its
-- screens are built on the backend. Requires 0001_spine.sql (profiles, enums, etc.) first.
-- Design authority + rationale: Docs/Supabase-Data-Model-v1.0.md §3–§11. Embodies the recommended
-- resolutions to the §12 open decisions (child tables for programs · VIEW for checkins · jsonb post_content).

-- ═══ enums (remainder) ═══
create type source_kind        as enum ('community','squad','friend');
create type post_audience      as enum ('FRIENDS','SQUAD','BOTH','COMMUNITY');
create type post_source_kind   as enum ('MANUAL','MILESTONE_AUTO');
create type squad_title        as enum ('owner','mod','captain');     -- DECORATIVE badge, sourced from real membership.title; grants NOTHING (permissions use squad_role)
create type media_format       as enum ('photo','video');             -- post_content media discriminator (PROMOTED to an indexed column)
create type share_kind         as enum ('accomplishment','honor','goal','pr','chapter','rank','program','transformation','workout');
create type content_type       as enum ('text','achievement','honor','program','media','event','poll','checkin','challengeUpdate','traintogether');
create type reaction_target    as enum ('post','comment');
create type squad_role         as enum ('owner','member');            -- two tiers ONLY (S-3)
create type checkin_status     as enum ('trained','rest','missed');   -- spec (SQ-D5) wins over code trained|pending
create type visibility_audience as enum ('everyone','squads','friends','private');
create type friendship_status  as enum ('PENDING','ACCEPTED');
create type program_state      as enum ('preview','future','active','graduated','ended-early');
create type program_family     as enum ('Strength','Muscle Building','Running','Conditioning','Full Body & Home','Mobility');
create type program_theme      as enum ('powerbuilding','bodybuilding','strength','athletic_performance','beginner','hypertrophy','cutting','offseason');
create type program_structure  as enum ('upper_lower','ppl','full_body');
create type program_split      as enum ('push','pull','legs','upper','lower','full_body','core','conditioning');
create type prescription_unit  as enum ('reps','seconds','minutes','yards');
create type media_kind         as enum ('avatar','workout_proof','pr_media','squad_crest','post_media');
create type goal_outcome       as enum ('achieved','not_achieved');
create type relationship_type  as enum ('Substitute','Equipment Alternative','Regression','Progression','Variation');
create type muscle_role        as enum ('Primary','Secondary');

-- ═══ REFERENCE tables (seed; world-read, service-write) ═══
create table muscles   (id text primary key, name text not null, region text not null);
create table equipment (id text primary key, name text not null, category text not null,
                         portable boolean not null default false, environments text[] not null default '{}');
create table exercises (
  id text primary key, name text not null, aliases text[] not null default '{}', family text not null,
  equipment_id text references equipment(id), movement_pattern text not null, difficulty text not null, modality text not null);
create table exercise_muscles (
  exercise_id text not null references exercises(id), muscle_id text not null references muscles(id),
  role muscle_role not null, display_order smallint not null, primary key (exercise_id, muscle_id));
create table exercise_relationships (
  id text primary key, source_exercise_id text not null references exercises(id),
  target_exercise_id text not null references exercises(id), type relationship_type not null,
  rank smallint not null, compatibility_score numeric(4,1) not null, movement_pattern text not null,
  preserves_pattern boolean not null, same_primary_muscle boolean not null,
  shared_primary_muscle_ids text[] not null default '{}', equipment_change boolean not null,
  swap_contexts text[] not null default '{}', reason text not null, editorial_status text not null);
create table exercise_coaching (
  exercise_id text primary key references exercises(id), locale text not null default 'en',
  content_status text not null, risk_tier text not null, schema_version int not null default 2,
  content jsonb not null, editorial jsonb not null default '{}', updated_at timestamptz not null default now());
-- honor catalog (seed materialized from Honor-Catalog-v1.0-LOCKED; 167 rows). Seed deferred per §12.4.
create table honors (
  honor_type text primary key, category text not null, family text not null, tier_index smallint,
  display_name text not null, display_name_lbs text, display_name_kg text, qualification text not null,
  unit_adaptive boolean not null default false, repeatable boolean not null default false,
  trigger text not null, catalog_visible boolean not null default false,
  affects_rank boolean not null default false, metadata_keys text[] not null default '{}');

-- late FK: spine workout_exercises.catalog_key → exercises (reference lands here)
alter table workout_exercises add constraint workout_exercises_catalog_fk
  foreign key (catalog_key) references exercises(id);

-- ═══ IDENTITY / RANK ═══
create table rank_events (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references profiles(id) on delete cascade,
  family text not null references rank_families(family), level smallint not null check (level between 1 and 4),
  computed_at timestamptz not null default now(), trigger text not null);

-- ═══ PROGRESS: goals, chapter children, programs, honors earned ═══
create table goals (
  id uuid primary key default gen_random_uuid(), chapter_id uuid not null references chapters(id) on delete cascade,
  name text not null check (char_length(name) <= 100), is_primary boolean not null default false,
  target numeric check (target > 0), unit text, current_value numeric,
  progress smallint check (progress between 0 and 100), achieved boolean not null default false,
  achieved_on date, program_id text, outcome goal_outcome, created_at timestamptz not null default now());
create unique index goals_one_primary_per_chapter on goals (chapter_id) where is_primary;

create table accomplishments (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references profiles(id) on delete cascade,
  text text not null, occurred_on date, created_at timestamptz not null default now());

create table program_definitions (
  id text primary key, name text not null, family program_family not null, difficulty text,
  duration_weeks int not null, frequency_per_week int not null, environment text, description text,
  goals text[] not null default '{}', successor_name text, theme program_theme, structure program_structure,
  status text not null default 'LOCKED', source text not null default 'forge', source_file text);
create table program_blocks (
  id uuid primary key default gen_random_uuid(), definition_id text not null references program_definitions(id) on delete cascade,
  label text not null, week_start int not null, week_end int not null);
create table program_workouts (
  id uuid primary key default gen_random_uuid(), block_id uuid not null references program_blocks(id) on delete cascade,
  code text not null, name text not null, modality text not null, split program_split, warmup jsonb not null default '[]');
create table exercise_prescriptions (
  id uuid primary key default gen_random_uuid(), workout_id uuid not null references program_workouts(id) on delete cascade,
  catalog_key text references exercises(id), display_name text not null, sets int, reps int, reps_max int,
  unit prescription_unit, per text, rest_sec int, intensity text, substitution jsonb);
create table program_instances (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references profiles(id) on delete cascade,
  definition_id text not null references program_definitions(id), state program_state not null,
  progress_completed int not null default 0, progress_total int not null, started_at timestamptz);
create unique index program_instances_one_active on program_instances (athlete_id) where state = 'active';

create table honor_instances (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references profiles(id) on delete cascade,
  honor_type text not null references honors(honor_type), display_name text not null,  -- snapshotted at earn
  date_earned date not null, awarded_at timestamptz not null default now(),
  chapter_id uuid references chapters(id), source text not null, schema_version int not null default 1,
  metadata jsonb not null default '{}');
create unique index honor_instances_one_time on honor_instances (athlete_id, honor_type) where chapter_id is null;
create unique index honor_instances_repeatable on honor_instances (athlete_id, honor_type, chapter_id) where chapter_id is not null;

create table chapter_photos (
  id uuid primary key default gen_random_uuid(), chapter_id uuid not null references chapters(id) on delete cascade,
  media_asset_id uuid, added_at timestamptz not null default now());

-- ═══ SQUADS ═══
create table communities (id uuid primary key default gen_random_uuid(), name text not null);  -- shelved (§13); stub for FK
create table squads (
  id uuid primary key default gen_random_uuid(), name text not null, motto text check (char_length(motto) <= 60),
  commitment text, icon text, owner_athlete_id uuid not null references profiles(id),
  active_goal_id uuid, active_mission_id uuid, created_at timestamptz not null default now());
create table squad_members (
  id uuid primary key default gen_random_uuid(), squad_id uuid not null references squads(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  role squad_role not null default 'member',   -- PERMISSION tier (owner|member) — the only thing RLS reads
  title squad_title,                            -- DECORATIVE badge (owner|mod|captain|null); real data, grants nothing (§5 ruling)
  joined_at date,                          -- SQUAD-INTERNAL (never leaves squad; Firewall #2)
  athlete_type text, rank text,            -- public markers (the only fields exposed cross-context)
  accolades text[] not null default '{}',  -- SQUAD-INTERNAL
  unique (squad_id, athlete_id));
-- check-ins = a THIN FK'd table, NOT a view: 'rest' is a manual member declaration that can't be
-- inferred from logged data, so a pure VIEW can't hold it. The check-in ⊆ roster invariant is held
-- by the FK to squad_members (a check-in cannot exist without a roster row).
create table squad_checkins (
  id uuid primary key default gen_random_uuid(),
  squad_member_id uuid not null references squad_members(id) on delete cascade,
  status checkin_status not null,               -- trained (derivable) | rest (manual) | missed (derivable)
  has_video boolean, unread boolean,
  check_date date not null,
  unique (squad_member_id, check_date));         -- one per member per day (daily reset SQ-D5.5)
create table squad_competition (
  squad_id uuid primary key references squads(id) on delete cascade, name text not null, place text not null,
  of text not null, workouts int not null, gap text not null, ends text not null);
create table squad_records (
  id uuid primary key default gen_random_uuid(), squad_id uuid not null references squads(id) on delete cascade,
  key text not null, label text not null, holder uuid references squad_members(id),
  value text not null, unit text, date text, is_new boolean);
create table squad_record_entries (
  id uuid primary key default gen_random_uuid(), record_id uuid not null references squad_records(id) on delete cascade,
  holder uuid references squad_members(id), value text not null, date text, position int not null);
create table athlete_squad_prefs (
  athlete_id uuid not null references profiles(id) on delete cascade, squad_id uuid not null references squads(id) on delete cascade,
  is_favorite boolean not null default false, primary key (athlete_id, squad_id));

-- public markers view (Firewall #2 — accolades/joined_at never selected cross-context)
create view public_athlete_markers as
  select distinct athlete_id, rank, athlete_type from squad_members where rank is not null or athlete_type is not null;

-- ═══ SOCIAL ═══
create table posts (
  id uuid primary key default gen_random_uuid(), author_athlete_id uuid not null references profiles(id),
  author_role squad_title, source_kind source_kind not null, source_name text not null, source_tag text not null,  -- badge from author's membership.title
  audience post_audience not null, squad_id uuid references squads(id), community_id uuid references communities(id),
  post_source post_source_kind not null default 'MANUAL', milestone_type text, type_label text, challenge text,
  body text, share_type share_kind, created_at timestamptz not null default now(),
  archived_at timestamptz, deleted_at timestamptz,
  constraint post_community_scope check ((audience = 'COMMUNITY') = (community_id is not null)));
create table post_content (
  post_id uuid primary key references posts(id) on delete cascade,
  type content_type not null,                -- PROMOTED discriminator (indexed) — feed-by-type queries
  media_kind media_format,                    -- PROMOTED discriminator (indexed, nullable) — the media system keys off this
  payload jsonb not null default '{}',        -- streak + every other per-type field stays here
  constraint post_content_media_shape check ((type = 'media') = (media_kind is not null)));
create index post_content_type_idx on post_content (type);
create index post_content_media_kind_idx on post_content (media_kind) where media_kind is not null;
create table comments (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references posts(id) on delete cascade,
  parent_comment_id uuid references comments(id), author_athlete_id uuid not null references profiles(id),
  author_role squad_title, body text not null, created_at timestamptz not null default now());  -- decorative badge from membership.title
-- depth-1 enforcement: a reply cannot itself be a parent (trigger in real migration).
create table reactions (
  id uuid primary key default gen_random_uuid(), target_type reaction_target not null, target_id uuid not null,
  athlete_id uuid not null references profiles(id), created_at timestamptz not null default now(),
  unique (target_type, target_id, athlete_id));

-- ═══ FRIENDS + VISIBILITY + MEDIA ═══
create table friendships (
  id uuid primary key default gen_random_uuid(),
  athlete_a_id uuid not null references profiles(id) on delete cascade,
  athlete_b_id uuid not null references profiles(id) on delete cascade,
  requested_by_athlete_id uuid not null references profiles(id),
  status friendship_status not null default 'PENDING',
  requested_at timestamptz not null default now(), accepted_at timestamptz,
  constraint friendship_canonical check (athlete_a_id < athlete_b_id),  -- unordered pair, stored canonically
  unique (athlete_a_id, athlete_b_id));
create table visibility_settings (
  athlete_id uuid primary key references profiles(id) on delete cascade,
  audience_chapter visibility_audience not null default 'everyone',
  audience_history visibility_audience not null default 'everyone',
  audience_timeline visibility_audience not null default 'squads',
  audience_transformation visibility_audience not null default 'friends',
  audience_photos visibility_audience not null default 'friends',
  audience_accomplishments visibility_audience not null default 'everyone',
  audience_stats visibility_audience not null default 'squads',
  default_post_audience post_audience not null default 'BOTH',
  auto_share_milestones boolean not null default true,
  discoverable_in_search boolean not null default true);
create table media_assets (
  id uuid primary key default gen_random_uuid(), owner_athlete_id uuid not null references profiles(id) on delete cascade,
  kind media_kind not null, storage_path text not null, mime_type text not null,
  width int, height int, bytes bigint, linked_entity_type text, linked_entity_id uuid,
  created_at timestamptz not null default now());

-- ═══ RLS helpers: the visibility clearance model (§7.3) ═══
-- clearance(viewer, subject): 99 self · 3 friend · 2 squadmate · 1 else (total order, not 4 booleans)
create or replace function fl_clearance(subject uuid) returns int language sql stable as $$
  select case
    when subject = auth.uid() then 99
    when exists (select 1 from friendships f where f.status = 'ACCEPTED'
                 and ((f.athlete_a_id = auth.uid() and f.athlete_b_id = subject)
                   or (f.athlete_b_id = auth.uid() and f.athlete_a_id = subject))) then 3
    when exists (select 1 from squad_members m1 join squad_members m2 on m1.squad_id = m2.squad_id
                 where m1.athlete_id = auth.uid() and m2.athlete_id = subject) then 2
    else 1 end; $$;
create or replace function fl_required(a visibility_audience) returns int language sql immutable as $$
  select case a when 'everyone' then 1 when 'squads' then 2 when 'friends' then 3 when 'private' then 99 end; $$;

-- ═══ RLS: enable + policies ═══
alter table exercises enable row level security;  alter table muscles enable row level security;
alter table equipment enable row level security;  alter table exercise_muscles enable row level security;
alter table exercise_relationships enable row level security; alter table exercise_coaching enable row level security;
alter table honors enable row level security; alter table program_definitions enable row level security;
alter table program_blocks enable row level security; alter table program_workouts enable row level security;
alter table exercise_prescriptions enable row level security;
-- reference/seed + static program content: world-read, service-write.
create policy ref_read_exercises on exercises for select using (true);
create policy ref_read_muscles on muscles for select using (true);
create policy ref_read_equipment on equipment for select using (true);
create policy ref_read_ex_muscles on exercise_muscles for select using (true);
create policy ref_read_ex_rel on exercise_relationships for select using (true);
create policy ref_read_coaching on exercise_coaching for select using (content_status = 'Published');
create policy ref_read_honors on honors for select using (true);
create policy ref_read_progdef on program_definitions for select using (true);
create policy ref_read_progblk on program_blocks for select using (true);
create policy ref_read_progwk on program_workouts for select using (true);
create policy ref_read_presc on exercise_prescriptions for select using (true);

-- athlete-owned progress/identity tables (own rows only)
alter table rank_events enable row level security;
alter table goals enable row level security; alter table accomplishments enable row level security;
alter table program_instances enable row level security; alter table honor_instances enable row level security;
alter table chapter_photos enable row level security; alter table media_assets enable row level security;
alter table visibility_settings enable row level security; alter table athlete_squad_prefs enable row level security;
create policy rank_events_own on rank_events for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy accomplishments_own on accomplishments for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy program_instances_own on program_instances for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy honor_instances_own on honor_instances for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy media_assets_own on media_assets for all using (owner_athlete_id = auth.uid()) with check (owner_athlete_id = auth.uid());
create policy visibility_own on visibility_settings for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy squad_prefs_own on athlete_squad_prefs for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy goals_own on goals for all
  using (exists (select 1 from chapters c where c.id = chapter_id and c.athlete_id = auth.uid()))
  with check (exists (select 1 from chapters c where c.id = chapter_id and c.athlete_id = auth.uid()));
create policy chapter_photos_own on chapter_photos for all
  using (exists (select 1 from chapters c where c.id = chapter_id and c.athlete_id = auth.uid()))
  with check (exists (select 1 from chapters c where c.id = chapter_id and c.athlete_id = auth.uid()));

-- ── Firewall #1: squad-scoped rows are member-only ──
alter table squads enable row level security; alter table squad_members enable row level security;
alter table squad_checkins enable row level security;
alter table squad_competition enable row level security; alter table squad_records enable row level security;
alter table squad_record_entries enable row level security; alter table communities enable row level security;
create policy squad_checkins_member on squad_checkins for select
  using (exists (select 1 from squad_members sm join squad_members me on me.squad_id = sm.squad_id
                 where sm.id = squad_member_id and me.athlete_id = auth.uid()));
create policy squad_member_read on squads for select
  using (exists (select 1 from squad_members m where m.squad_id = id and m.athlete_id = auth.uid()));
create policy squad_members_member on squad_members for select
  using (exists (select 1 from squad_members m where m.squad_id = squad_members.squad_id and m.athlete_id = auth.uid()));
create policy squad_comp_member on squad_competition for select
  using (exists (select 1 from squad_members m where m.squad_id = squad_id and m.athlete_id = auth.uid()));  -- Firewall #3
create policy squad_records_member on squad_records for select
  using (exists (select 1 from squad_members m where m.squad_id = squad_id and m.athlete_id = auth.uid()));
create policy squad_rec_entries_member on squad_record_entries for select
  using (exists (select 1 from squad_records r join squad_members m on m.squad_id = r.squad_id
                 where r.id = record_id and m.athlete_id = auth.uid()));

-- ── posts: audience + Firewall #1/#4 ──
alter table posts enable row level security; alter table post_content enable row level security;
alter table comments enable row level security; alter table reactions enable row level security;
create policy posts_visible on posts for select using (
  deleted_at is null and (
    author_athlete_id = auth.uid()
    -- squad post: member-only (Firewall #1)
    or (squad_id is not null and exists (select 1 from squad_members m where m.squad_id = posts.squad_id and m.athlete_id = auth.uid()))
    -- friends/both post, NOT community-scoped (Firewall #4): visible to friends of the author
    or (audience in ('FRIENDS','BOTH') and community_id is null and fl_clearance(author_athlete_id) >= 3)
  ));
create policy post_content_follows on post_content for select
  using (exists (select 1 from posts p where p.id = post_id));  -- inherits post visibility
create policy comments_visible on comments for select
  using (exists (select 1 from posts p where p.id = post_id));  -- see the post ⇒ see its comments
create policy reactions_visible on reactions for select using (true);  -- presence only; never an ordering key

-- ── Firewall #6: friendships private to the pair ──
alter table friendships enable row level security;
create policy friendships_pair on friendships for all
  using (auth.uid() in (athlete_a_id, athlete_b_id)) with check (auth.uid() in (athlete_a_id, athlete_b_id));

-- ── profile-section visibility (§7.3 clearance compare) — applied on the read path per section, e.g.: ──
-- select ... where fl_clearance(subject) >= fl_required((select audience_timeline from visibility_settings where athlete_id = subject))
--   AND has_data.  (Encoded as a security-definer view per section, or in the query layer.)

-- Firewall #7: NO triggers from posts/comments/reactions/friendships into rank_events/honor_instances/timeline_events.
-- (Enforced by omission — asserted in a schema test, not a DB object.)
