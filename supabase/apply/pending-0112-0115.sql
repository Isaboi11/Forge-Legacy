-- Forge Legacy — pending migrations 0112–0115 (PO feedback batch 2, 2026-08-04)
--
-- Apply in the Supabase SQL editor, IN THIS ORDER, as one run. They are independent of each
-- other, so a failure in one does not corrupt another — but a stopped chain leaves the later
-- ones unapplied, and the failure mode there is a MISSING COLUMN (42703), which most of this
-- app's guards do not catch. Check for an error after the run, not just the absence of one.
--
--   0112  honor_instances.celebrated_at  + uncelebrated_honors() + mark_honors_celebrated()
--   0113  friends_feed() re-issued with workout_id + workout_summary
--   0114  profiles.discoverable + find_athletes()
--   0115  workout_templates.source_definition_id + both template RPCs re-issued
--
-- THREE OF THESE REDEFINE FUNCTIONS. A clean apply proves the body parsed, not that it binds.
-- The run-time proof is pressing the buttons — see the verification list in the summary.


-- ══════════════════════════════════════════════════════════════════════════════════════════
-- 0112_honor_celebration.sql
-- ══════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0112: an honor knows whether it has been celebrated
--
-- M-2 has never played. `HonorCeremony` (the forged medallion, built to `Forge First Honor
-- Ceremony.dc.html`) is a real component, `CeremonyProvider` special-cases `honorEarned` to render
-- it instead of the generic Modal, and `CeremonyProvider` is mounted app-wide in `_layout.tsx` — and
-- `kind: 'honorEarned'` is enqueued NOWHERE outside `ceremony-harness.tsx` and the unit tests. An
-- athlete earning an honor got one line of text on the Seal screen, which the PO reasonably read as
-- the honor "popping up at the workout end", and asked for it on Legacy instead.
--
-- Legacy is where it belongs and where the pattern already lives: `legacy.tsx` has fired M-1 rank-ups
-- from its focus effect since the rank engine shipped. What was missing is not the ceremony, it is
-- the STATE — "has this athlete been shown this honor yet."
--
-- WHY A COLUMN AND NOT A CLIENT FLAG. Device-local state replays the ceremony on every reinstall and
-- forgets it on every other device. Router params from W-17 only work when the athlete reaches Legacy
-- by finishing a workout, and this must also work for an honor granted by `claim_earned_honors` on a
-- retroactive sweep — which is precisely the case where a silent grant is most confusing.
--
-- WHY MARKING IS ITS OWN CALL. `uncelebrated_honors()` reads and marks NOTHING. A ceremony that a
-- crash, a force-quit or a tab close cut short must still play next time — showing an honor twice is
-- a small annoyance, and never showing it at all is losing the moment the whole system exists for.

alter table public.honor_instances add column if not exists celebrated_at timestamptz;

comment on column public.honor_instances.celebrated_at is
  'When the M-2 ceremony for this honor was dismissed. Null = still owed. Set by mark_honors_celebrated() AFTER the ceremony closes, never at fetch time — a ceremony cut short must replay.';

-- BACKFILL, and it is not optional. Every honor in the system predates this column, so leaving them
-- null would greet every existing athlete with a ceremony for every honor they have ever earned the
-- next time they open Legacy — 139 medallions in a row for the account that has them all. They were
-- earned before the ceremony existed; the honest record is that their moment has passed.
update public.honor_instances set celebrated_at = awarded_at where celebrated_at is null;

-- Owed honors, oldest first. `security invoker` — the `honor_own` policy (0012) already scopes this
-- to the caller's own rows, and a definer here would be a wider grant than the read needs.
create or replace function public.uncelebrated_honors()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',           h.id,
        'honorType',    h.honor_type,
        'displayName',  h.display_name,
        'dateEarned',   h.date_earned
      )
      order by h.awarded_at, h.id
    ),
    '[]'::jsonb
  )
    from public.honor_instances h
   where h.athlete_id = auth.uid()
     and h.celebrated_at is null;
$$;

-- Returns how many rows it actually changed, so a caller can tell "marked" from "already was".
-- `is null` in the WHERE keeps this idempotent: a double-dismiss does not rewrite the timestamp.
create or replace function public.mark_honors_celebrated(p_ids uuid[])
returns int
language plpgsql
security invoker
as $$
declare
  v_n int;
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    return 0;
  end if;
  update public.honor_instances
     set celebrated_at = now()
   where athlete_id = auth.uid()
     and id = any(p_ids)
     and celebrated_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════════════════
-- 0113_friends_feed_recap.sql
-- ══════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0113: the Friends Feed carries the recap it was already storing
--
-- One table has served both feeds since 0074: `squad_posts`, with an `audience` column and a
-- `workout_summary` jsonb. The SQUAD side has rendered that column as a Vol / Time / Lifts / PRs strip
-- since it shipped. `friends_feed()` selected `pr_value`, `pr_exercise` and `pr_label` and never
-- selected `workout_summary` or `workout_id` — so a recap posted to FRIENDS arrived with its stats
-- stripped, fell through `shapeOf()` into the generic bronze milestone card, and had nothing to say.
--
-- Same table. Same column. One feed reading it and one not. This is an omission, not a design.
--
-- NOTHING ELSE CHANGES. Audience scoping, the friendship join, ordering, the comment/reaction
-- subqueries and the reactors aggregate are 0074's, verbatim. Signature and return type are unchanged,
-- so `create or replace` is enough and no `drop function` is needed.
--
-- ⚠ PL/pgSQL RESOLVES COLUMN REFERENCES AT RUN TIME. Applying this proves the body parsed, not that it
-- binds `p.workout_summary`. The proof is pressing the button: post a recap to Friends and look at the
-- card. If it renders bare, the function did not rebind — check the live body with \df+ friends_feed.

create or replace function public.friends_feed(p_limit int default 40, p_before timestamptz default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'id', p.id,
               'type', p.type,
               'audience', p.audience,
               'body', p.body,
               'media', p.media,
               'layout', p.layout,
               'created_at', p.created_at,
               'author_id', p.author_id,
               'author_name', coalesce(pr.name, 'Athlete'),
               'author_handle', pr.handle,
               'author_avatar_url', pr.avatar_url,
               'is_mine', p.author_id = v_uid,
               'pr_value', p.pr_value,
               'pr_exercise', p.pr_exercise,
               'pr_label', p.pr_label,
               -- THE TWO KEYS THIS MIGRATION EXISTS FOR.
               'workout_id', p.workout_id,
               'workout_summary', p.workout_summary,
               'comment_count', (select count(*) from public.squad_post_comments c where c.post_id = p.id),
               'reaction_count', (select count(*) from public.squad_post_reactions r where r.post_id = p.id),
               'my_reaction', (
                 select r.reaction from public.squad_post_reactions r
                  where r.post_id = p.id and r.user_id = v_uid
               ),
               -- Who acknowledged it, for the "Acknowledged by A, B and N others" line. Names only; there
               -- is no count rendered as a score anywhere (SOC-D11).
               'reactors', coalesce((
                 select jsonb_agg(jsonb_build_object('id', rp.id, 'name', coalesce(rp.name, 'Athlete'), 'avatar_url', rp.avatar_url, 'is_self', rp.id = v_uid)
                          order by (rp.id = v_uid) desc, rp.name)
                   from public.squad_post_reactions r
                   join public.profiles rp on rp.id = r.user_id
                  where r.post_id = p.id
               ), '[]'::jsonb)
             ) order by p.created_at desc)
      from public.squad_posts p
      join public.profiles pr on pr.id = p.author_id
     where p.audience in ('FRIENDS', 'BOTH')
       and (p.author_id = v_uid or public.are_friends(p.author_id, v_uid))
       and (p_before is null or p.created_at < p_before)
     limit greatest(p_limit, 0)
  ), '[]'::jsonb);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════════════════
-- 0114_athlete_search.sql
-- ══════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0114: athlete search returns a LIST, by name or handle
--
-- THIS RESTORES A LOCKED SPEC RATHER THAN OVERTURNING ONE.
--
-- `Identity-Amendment-001-Username.md` §4 has specified name+handle search since it was locked: §4.1
-- says a query matches Display Name AND Username simultaneously and that a leading `@` forces
-- handle-only mode, §4.2 gives the ranking, §4.3 the row format, §4.4 the empty state, §4.5 the
-- no-results copy word for word. SOC-D15 was written later, read "returns a LIST" as the definition of
-- a discovery surface, and narrowed it to one exact handle — which is what 0073 shipped.
--
-- Two LOCKED documents disagreed. `Social-Architecture-Amendment-003-Athlete-Search.md` settles it in
-- Identity's favour and restates precisely what SOC-D15 still bars, which is everything the system
-- populates on its own: Suggested Friends, People You May Know, mutual-friend recommendations, any
-- ranking by engagement or popularity, and any result for a query the athlete did not type.
--
-- `find_athlete_by_handle` (0073) IS NOT REPLACED. It is the QR-code and profile-link path SOC-D15
-- explicitly sanctions, and other callers use it.
--
-- ⚠ READ THIS BEFORE TRUSTING `discoverable`. `0001_spine.sql:165` is
--   create policy profiles_read on profiles for select using (true)
-- so any client holding the anon key can already page the entire profile table through PostgREST. Every
-- guard below is ADVISORY UX, not enforcement, and the toggle is a promise this database does not keep.
-- Making it real means narrowing `profiles_read`, which is its own ruling — the feed and notification
-- functions that join `profiles` are all `security definer` and would be unaffected, but the blast
-- radius needs checking first. Until then the setting must be worded as "hide me from name search",
-- never as "no one can find me".

-- ── The toggle Identity §7.1 has always specified and nothing ever implemented ────────────────────
-- A real column, not a key inside `app_prefs`: the search function has to filter on it in SQL. And not
-- a key inside `profiles.visibility` either — that is a per-SECTION audience map (chapter · history ·
-- timeline · transformation · photos · accomplishments · stats · training) with no notion of
-- findability, and P-6 §75 assigns discoverability to Identity rather than to P-6's own controls.
alter table public.profiles add column if not exists discoverable boolean not null default true;

comment on column public.profiles.discoverable is
  'Identity-Amendment-001 §7.1 "Let non-squad athletes find me in search". Default true. Governs NAME search only (SOC-A3-D4) — an exact handle still resolves, because a handle is something you were given. ADVISORY: profiles_read is `using (true)`, so this is not enforced at the row level.';

-- Only the LEADING-prefix branch can use these. The mid-name word-prefix branch seq-scans, which is
-- fine at this scale and capped at 25 rows; past tens of thousands of athletes it wants pg_trgm + GIN,
-- which is an extension decision and is deliberately not taken here.
create index if not exists profiles_name_prefix on public.profiles (lower(name) text_pattern_ops);
create index if not exists profiles_handle_prefix on public.profiles (lower(handle::text) text_pattern_ops);

create or replace function public.find_athletes(p_query text, p_limit int default 20)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_raw    text := btrim(coalesce(p_query, ''));
  v_handle boolean := left(v_raw, 1) = '@';   -- Identity §4.1: @ forces handle-only mode
  q        text := lower(regexp_replace(v_raw, '^@+', ''));
  esc      text;
  v_cap    int := least(greatest(coalesce(p_limit, 20), 1), 25);
begin
  -- Identity §4.4: nothing is returned before a query. Not an empty list as a formality — the empty
  -- query is the one input that would otherwise mean "everyone".
  if v_uid is null or char_length(q) < 2 then
    return '[]'::jsonb;
  end if;

  -- ══ THE LINE THAT STOPS THE WHOLE USER BASE BEING ENUMERATED ══
  -- Unescaped, a query of '%' matches every athlete alive and this function becomes the directory the
  -- product does not have. Escaped, '%' matches a literal percent sign and returns nothing.
  esc := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');

  return coalesce((
    select jsonb_agg(r.obj order by r.tier, lower(r.name), r.id)
      from (
        select p.id,
               p.name,
               -- Identity §4.2's ranking, with one deliberate deviation recorded in SOC-A3-D2: an
               -- EXACT HANDLE outranks a squad-mate. Typing somebody's whole handle is the most
               -- intentional act SOC-D15 recognises, and burying it under a roster would defeat it.
               case
                 when lower(p.handle::text) = q then 0
                 when exists (
                   select 1 from public.squad_members a
                     join public.squad_members b on b.squad_id = a.squad_id
                    where a.user_id = v_uid and b.user_id = p.id
                 ) then 1
                 when lower(p.name) = q then 2
                 when lower(p.handle::text) like esc || '%' escape '\' then 3
                 else 4
               end as tier,
               jsonb_build_object(
                 'id',           p.id,
                 'name',         p.name,
                 'handle',       p.handle,
                 'avatar_url',   p.avatar_url,
                 'athlete_type', p.athlete_type,
                 'rank_family',  p.rank_family,
                 'rank_level',   p.rank_level,
                 -- Identity §4.3's tertiary line. ONE squad name, not a list — this is a label on a
                 -- row, not a read of anybody's graph.
                 'shared_squad', (
                   select s.name from public.squads s
                     join public.squad_members a on a.squad_id = s.id and a.user_id = v_uid
                     join public.squad_members b on b.squad_id = s.id and b.user_id = p.id
                    order by s.name limit 1
                 ),
                 'state', public.friendship_with(p.id)
               ) as obj
          from public.profiles p
         where p.id <> v_uid                            -- you are not a search result
           and (
             lower(p.handle::text) like esc || '%' escape '\'
             -- NAME matches on a WORD prefix, never a free substring. "ada" finds "Ada Lovelace" and
             -- "Grace Ada Hopper" and does not find "Amanda". A free substring is an enumeration tool
             -- wearing a search box: '%a%' would return almost everyone.
             or (not v_handle and (
                  lower(p.name) like esc || '%' escape '\'
               or lower(p.name) like '% ' || esc || '%' escape '\'
             ))
           )
           -- SOC-A3-D3/D4: the toggle hides you from NAME search. An exact handle still resolves, and
           -- squad-mates always see each other — you are already in a room together.
           and (
             p.discoverable
             or lower(p.handle::text) = q
             or exists (
               select 1 from public.squad_members a
                 join public.squad_members b on b.squad_id = a.squad_id
                where a.user_id = v_uid and b.user_id = p.id
             )
           )
         limit v_cap
      ) r
  ), '[]'::jsonb);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════════════════
-- 0115_starter_template_provenance.sql
-- ══════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0115: a template knows whether Forge wrote it
--
-- Forge now ships six starter templates (`src/domain/workout/starter-templates`), so a brand-new
-- athlete's first Templates screen is six ready sessions instead of an empty panel reading
-- "No templates yet". `Forge Strength Start.dc.html`'s "Start a workout you've saved — or one built by
-- Forge" becomes true.
--
-- ADOPTED, NOT SHARED. The starters are shipped DEFINITIONS; adopting one writes the athlete their own
-- ordinary row here, stamped with the definition it came from. Exactly the model `programs` already
-- uses for the built-in catalogue (`programs.source_definition_id`, 0019).
--
-- The alternative — seed rows with `athlete_id is null` plus a read policy — was rejected because this
-- schema is owner-only in load-bearing places, not incidentally:
--
--   · `template_detail()` and `workout_templates_list()` (0095) both end `where t.athlete_id =
--     auth.uid()`.
--   · `save_workout` re-checks `where id = p_template_id and athlete_id = v_uid` and DEGRADES TO AN
--     UNATTRIBUTED WORKOUT otherwise — so a session trained from a shared Forge row would silently
--     lose its `template_id`, and W-27 would show no history for the templates everyone used.
--   · `use_count` is DERIVED from `workouts.template_id` (0095 argues at length that it must be). On a
--     shared row that becomes a GLOBAL count — how many times every athlete alive has trained Push Day
--     — printed on a screen that means "how many times you have".
--
-- Provenance only. This column never gates a read, never changes ownership, and is never used to
-- rewrite an athlete's row when the shipped definition changes: their copy is theirs from the moment
-- they take it.

alter table public.workout_templates
  add column if not exists source_definition_id text;

comment on column public.workout_templates.source_definition_id is
  'The Forge starter definition this template was adopted from (src/domain/workout/starter-templates). Null for a captured or authored template. Provenance only — the row is the athlete''s own copy and an app update never rewrites it, exactly as programs.source_definition_id works.';

-- Adopting the same starter twice must RESUME the copy, not fork it. Partial, so the column stays
-- null on every captured/authored template without those colliding with each other.
create unique index if not exists workout_templates_one_per_source
  on public.workout_templates (athlete_id, source_definition_id)
  where source_definition_id is not null;

-- ── Both reads carry the field ────────────────────────────────────────────────
-- 0095's bodies, verbatim, plus one key each. Signatures unchanged, so no `drop function`.
--
-- ⚠ PL/pgSQL binds at RUN time. These two are `language sql`, which is checked at creation — but
-- `save_workout` in 0095 is PL/pgSQL and untouched here, and the run-time proof for this migration is
-- still the same one: adopt a starter, train it, and confirm W-27 shows "Times used 1" with a history
-- row. That is what proves the ownership check passed and `template_id` survived the save.

create or replace function public.template_detail(p_template uuid)
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select jsonb_build_object(
           'id', t.id,
           'name', t.name,
           'exercises', t.exercises,
           'created_at', t.created_at,
           'source_definition_id', t.source_definition_id,
           'use_count', (select count(*) from public.workouts w where w.template_id = t.id and w.state = 'saved'),
           'last_used_at', (select max(w.saved_at) from public.workouts w where w.template_id = t.id and w.state = 'saved'),
           'history', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'workout_id', h.id,
                      'at', h.saved_at,
                      'duration_sec', h.duration_sec,
                      'note', h.notes
                    ) order by h.saved_at desc)
               from public.workouts h
              where h.template_id = t.id and h.state = 'saved'
           ), '[]'::jsonb)
         )
    from public.workout_templates t
   where t.id = p_template and t.athlete_id = auth.uid();
$$;

create or replace function public.workout_templates_list()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(x.obj order by x.last_used_at desc nulls last, x.created_at desc), '[]'::jsonb)
    from (
      select t.created_at,
             (select max(w.saved_at) from public.workouts w where w.template_id = t.id and w.state = 'saved') as last_used_at,
             jsonb_build_object(
               'id', t.id,
               'name', t.name,
               'exercises', t.exercises,
               'created_at', t.created_at,
               'source_definition_id', t.source_definition_id,
               'use_count', (select count(*) from public.workouts w where w.template_id = t.id and w.state = 'saved'),
               'last_used_at', (select max(w.saved_at) from public.workouts w where w.template_id = t.id and w.state = 'saved')
             ) as obj
        from public.workout_templates t
       where t.athlete_id = auth.uid()
    ) x;
$$;
