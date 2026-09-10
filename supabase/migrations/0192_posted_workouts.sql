-- Forge Legacy — 0192: the workout a squad posts, and the slot it lands in
--
-- `Squad-Architecture-Amendment-005-Posted-Workouts.md` (🔒 LOCKED 2026-09-03).
--
-- A squad member posts one workout to the feed. Other members tap Take it, and it lands in their
-- `planned_workouts` slot (0136) — the Home hero, waiting to be started. The driving case is the nightly
-- drip: Squatober and everything shaped like it, where the organiser posts tomorrow's session the night
-- before rather than publishing a plan in advance.
--
-- ══ ⚠ WHAT THIS MIGRATION DELIBERATELY DOES NOT TOUCH ══
--
-- **`squad_feed()` is not rebuilt, and neither is the post-detail read.** Both are `returns table (...)`,
-- which `create or replace` cannot widen — 0186's header explains this at length and 0043 hit the same
-- wall before it. So the workout snapshot rides in `squad_posts.layout`, which is untyped jsonb (0045),
-- is already returned by every read path, and already carries a `kind` discriminator for exactly this
-- purpose (0045's progress card vs transformation layout). No column, no backfill, no read path changed.
--
-- **`notification_events_for()` is not rebuilt either, and that is the point.** Its branch 10 (0122,
-- narrowed 0126) already fans out EVERY authored squad post to every member of that squad. A `'workout'`
-- post is an authored squad post, so it notifies the moment the type constraint admits it — under the
-- existing Squad Feed Activity toggle, with no new preference, which is what SQ-A5-D8 requires. The
-- client's `KINDS` allowlist already contains `squad_post`.
--
-- That function has silently lost shipped features to a from-memory rebuild FOUR times (0171 §37 says so
-- in its own header). Not touching it is not laziness here — it is the single highest-risk operation in
-- this schema, and this feature genuinely does not need it.
--
-- ══ ⚠ THE RATE LIMIT IS A TRIGGER, NOT AN RPC ══
--
-- SQ-A5-D1.3 is one posted workout per member per squad per day. An RPC enforcing it would be bypassed
-- the moment anything posted through `addSquadPost`, which is the path the composer ALREADY uses for the
-- other seven types and which inserts into `squad_posts` directly under its RLS policy. A limit that only
-- exists in a function the client may route around is a suggestion.
--
-- ══ ⚠ AND `take_posted_workout` IS **NOT** SECURITY DEFINER ══
--
-- The amendment's §10 implementation note said it must be. That note was written before the policies were
-- read, and it was wrong — recorded here rather than quietly corrected, because "make it definer" is the
-- reflex that has cost this schema real outages (a revoke on `evaluate_honors` killed Finish Workout with
-- every gate green, because the definer function still called it as itself).
--
-- Both halves of the operation are already the caller's own rights:
--   * READING the post — `squad_posts_select` (0076) admits a row when the reader is a squad member.
--   * WRITING the slot — `planned_workouts_own_insert`/`_update` (0136) admit the caller's own row.
--
-- So SECURITY INVOKER is not merely sufficient, it is SAFER: RLS performs the membership check, rather
-- than this function re-implementing it and being the only thing standing between a stranger's post and
-- somebody's Home screen. A non-member's take finds no row and raises — enforced by the database, in one
-- place, for every caller including a future one nobody has written yet.
--
-- Idempotent and safe to run twice.

-- ─────────────────────────────────────────────────────────────────────────────
-- §1 — the 'workout' post type
--
-- ⚠ THE FULL LIST IS RESTATED, AND EVERY ENTRY IS LOAD-BEARING. 0074 rebuilt this constraint from 0041's
-- five types plus 'weekly' and silently dropped 'formcheck' and 'transformation'; 0076 exists solely to
-- put them back. Carrying the list forward with its provenance comments is how that stops recurring.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.squad_posts drop constraint if exists squad_posts_type_check;
alter table public.squad_posts add constraint squad_posts_type_check
  check (type in (
    -- 0041
    'checkin', 'recap', 'pr', 'discussion', 'announcement',
    -- 0042
    'formcheck', 'transformation',
    -- 0057
    'weekly',
    -- 0074
    'progress', 'milestone',
    -- 0192 — a workout offered to the squad to run (SQ-A5-D1)
    'workout'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- §2 — one posted workout per member per squad per day (SQ-A5-D1.3)
--
-- ⚠ THE WINDOW IS THE UTC CALENDAR DAY, NOT A ROLLING 24 HOURS, and the difference matters to the only
-- use case this feature has. A rolling window blocks the athlete posting at 8:55pm tonight because they
-- posted at 9:00pm last night — it would bite the nightly drip precisely, and only, when it is working.
--
-- No `profiles.tz` join, deliberately: a bare `tz` reference inside a function raises 42702 when the name
-- also exists on a joined table, which is a live scar in this schema (0163). The honest cost is that an
-- athlete posting either side of UTC midnight can post twice; that is a far smaller failure than blocking
-- the intended pattern, and it is invisible to an evening poster in the Americas, where 9pm is already
-- the next UTC day.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.squad_posts_workout_daily_limit()
returns trigger
language plpgsql
as $$
begin
  if new.type <> 'workout' or new.author_id is null then
    return new;
  end if;

  if exists (
    select 1
      from public.squad_posts sp
     where sp.type = 'workout'
       and sp.author_id = new.author_id
       and sp.squad_id is not distinct from new.squad_id
       and sp.id <> new.id
       and sp.created_at >= date_trunc('day', now() at time zone 'utc')
  ) then
    raise exception 'You have already posted a workout to this squad today.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists squad_posts_workout_daily_limit on public.squad_posts;
create trigger squad_posts_workout_daily_limit
  before insert on public.squad_posts
  for each row execute function public.squad_posts_workout_daily_limit();

-- ─────────────────────────────────────────────────────────────────────────────
-- §3 — where the slot's contents came from (SQ-A5-D3.1)
--
-- All nullable, and every row that exists today is null on all three: a workout the athlete built for
-- themselves has no provenance, and that absence is what the hero reads to decide whether to draw the
-- "From <squad>" line at all.
--
-- `on delete set null` throughout, never cascade. A squad deleting its post — or the poster deleting
-- their account — must not reach into somebody else's Home screen and take away the session they were
-- planning to train. The workout is a snapshot (SQ-A5-D1.1); losing its origin makes it anonymous, not
-- invalid.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.planned_workouts add column if not exists source_post_id   uuid references public.squad_posts(id) on delete set null;
alter table public.planned_workouts add column if not exists source_squad_id  uuid references public.squads(id)      on delete set null;
alter table public.planned_workouts add column if not exists source_author_id uuid references public.profiles(id)    on delete set null;

comment on column public.planned_workouts.source_post_id is
  'The squad post this workout was taken from (0192), or null when the athlete built it themselves. '
  'Nulled rather than cascaded if the post is deleted — the taken snapshot survives its origin.';
comment on column public.planned_workouts.source_squad_id is
  'The squad the workout was posted to. Drawn on the Home hero as "From <squad>" (SQ-A5-D3.1).';
comment on column public.planned_workouts.source_author_id is
  'Who posted it. Never used to rank or count takes — SQ-A5-D5.2 forbids any take aggregate.';

-- ─────────────────────────────────────────────────────────────────────────────
-- §4 — taking one (SQ-A5-D3)
--
-- SECURITY INVOKER. See the header for why that is the safer choice here and not an oversight.
--
-- ⚠ NOTHING COUNTS TAKES. There is no counter column, no takes table, and no aggregate anywhere in this
-- migration — SQ-A5-D5.2. The number is absent rather than merely unshown, because a `take_count` that
-- exists is one line of client code away from being displayed, and this codebase's recurring failure is
-- "locked but never applied" in exactly that direction.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.take_posted_workout(p_post uuid)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_squad     uuid;
  v_author    uuid;
  v_layout    jsonb;
  v_name      text;
  v_exercises jsonb;
begin
  -- RLS decides whether this row is visible. A non-member — or an athlete who has left the squad — finds
  -- nothing here, which is the membership check, performed by the database rather than restated by hand.
  select sp.squad_id, sp.author_id, sp.layout
    into v_squad, v_author, v_layout
    from public.squad_posts sp
   where sp.id = p_post
     and sp.type = 'workout';

  if v_layout is null then
    raise exception 'That workout is no longer available.' using errcode = 'no_data_found';
  end if;

  v_name      := nullif(btrim(coalesce(v_layout ->> 'name', '')), '');
  v_exercises := coalesce(v_layout -> 'exercises', '[]'::jsonb);

  if v_name is null then
    raise exception 'That post is not a workout.' using errcode = 'check_violation';
  end if;
  if jsonb_typeof(v_exercises) <> 'array' or jsonb_array_length(v_exercises) = 0 then
    raise exception 'That workout has no exercises.' using errcode = 'check_violation';
  end if;

  -- The slot is one row per athlete (0136's PK), so this replaces whatever was in it — the athlete's own
  -- one-off or last night's drop. SQ-A5-D3.2 puts the confirmation in front of this call, not inside it.
  insert into public.planned_workouts
    (athlete_id, name, exercises, source_post_id, source_squad_id, source_author_id, updated_at)
  values
    (auth.uid(), left(v_name, 60), v_exercises, p_post, v_squad, v_author, now())
  on conflict (athlete_id) do update
     set name             = excluded.name,
         exercises        = excluded.exercises,
         source_post_id   = excluded.source_post_id,
         source_squad_id  = excluded.source_squad_id,
         source_author_id = excluded.source_author_id,
         updated_at       = now();

  return v_name;
end;
$$;

revoke all on function public.take_posted_workout(uuid) from public;
grant execute on function public.take_posted_workout(uuid) to authenticated;

comment on function public.take_posted_workout(uuid) is
  'Take a squad-posted workout into your own planned_workouts slot (0192, SQ-A5-D3). SECURITY INVOKER on '
  'purpose: squad_posts_select supplies the membership check and planned_workouts_own_* the write, so RLS '
  'enforces both halves rather than this function re-implementing them. Counts nothing (SQ-A5-D5.2).';
