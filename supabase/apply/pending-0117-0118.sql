-- Forge Legacy — pending migrations 0117 and 0118
--
-- Both authored 2026-08-05 for the PO's four-item batch. Independent of each other — 0117 touches the
-- squad feed functions and adds one new one; 0118 touches a single table's columns — so the order below
-- is only the file order, and either would apply alone.
--
-- ══ WHAT BREAKS IF YOU APPLY 0118 AND NOT THE APP, OR THE APP AND NOT 0118 ═══════════════════════
--
-- 0118 RENAMES `accomplishments.photo_url` to `media_url`. That is the one statement in this bundle
-- that is not additive, and the client is updated in the same commit:
--
--   · DB migrated, app stale  → the old build selects `photo_url` and gets `42703`, which the data
--     layer's `if (error) return []` swallows into an EMPTY accomplishments list. Not a crash — a
--     screen that quietly says you have none.
--   · App shipped, DB stale  → the new build selects `media_url` and gets the same `42703`, with the
--     same silent-empty result.
--
-- So DEPLOY AND APPLY TOGETHER. The rename is safe in every other respect: `photo_url` was created by
-- 0023 and never written by anything, so no data moves.
--
-- ══ 0117 DROPS AND RECREATES TWO FUNCTIONS THE SQUAD FEED DEPENDS ON ═════════════════════════════
--
-- `squad_feed` and `squad_post_one` gain one OUT column (`workout_id`), which `create or replace`
-- cannot do (`42P13`) — hence the drops. Between the DROP and the CREATE the squad feed has no
-- function to call; run this in ONE go rather than statement by statement.
--
-- ⚠ PL/pgSQL binds column references at RUN time. Applying proves the bodies parsed, not that they
-- resolve. The proofs, in order:
--   1. Open a squad feed with a workout recap in it → the card opens the SESSION, not the post page.
--   2. Open a friend's recap in the Friends feed → their sets, under a "shared with you" banner.
--   3. Add an accomplishment with a photo → it saves, and shows on the detail.

-- ═══════════════════════════ 0117_shared_workout_detail.sql ═══════════════════════════
-- ═══════════════════════════ 0117_shared_workout_detail.sql ═══════════════════════════

-- Forge Legacy — 0117: a shared workout recap opens the session, for everyone who can see the post
--
-- ══ WHAT WAS BROKEN ══════════════════════════════════════════════════════════════════════════════
--
-- `Social-Architecture-Amendment-002-Workout-Recap-Posts` §3 says a recap card taps "through to the
-- session on Activity Detail". The Friends feed does route there. But `fetchActivityDetail` reads
--
--     from workouts where id = $1 and athlete_id = auth.uid()
--
-- so it resolves for exactly one person: the author. Every other athlete who tapped a friend's recap —
-- the entire audience the post was written for — got "Couldn't load this session. It may have been
-- deleted." A dead link, on the one card in the feed that promises the most.
--
-- The Squad feed never even tried: a `recap` row opened `/squad-post/[id]`, which rebuilds a reduced
-- version of the same screen out of the `workout_summary` snapshot. So the same post type had two
-- different destinations depending on which feed you found it in, and neither was the one the
-- amendment specifies. Reported by the PO: *"the post of a workout recap should be the same page that
-- pulls up when you go to activity history and you click on a workout."*
--
-- ══ WHY AN RPC AND NOT AN RLS POLICY ═════════════════════════════════════════════════════════════
--
-- A policy on `workouts` would have to be readable as "…or somebody posted this workout to a feed you
-- are in", and would then apply to EVERY query against the table — including `fetchActivityHistory`,
-- the Progress Hub's set read, and the rank engine's aggregates, all of which say `athlete_id =
-- auth.uid()` today and would quietly start being able to return other people's rows if that clause
-- were ever dropped. One `security definer` function with one entry point is the narrower grant: it
-- answers exactly one question, for exactly one workout id, and `workouts` RLS stays "yours only".
--
-- ══ WHAT A VIEWER GETS, AND WHAT THEY DO NOT ═════════════════════════════════════════════════════
--
-- The SESSION, because that is what the author posted: its name, when it was, how long it took, the
-- distance if it was a run, every exercise with the sets actually logged, the records set in it, the
-- playlist, and the program it belonged to by name.
--
-- NOT four things the owner's own screen shows, each deliberately withheld:
--
--   · `ordinal` ("Workout #212") — a running count of the author's entire training life. The post
--     shared one session, not a lifetime total.
--   · `chapter` — athlete-authored prose about their own life ("Chapter III — The Rebuild"). Sharing a
--     workout is not sharing your Legacy.
--   · `partners` — other people's identities, who did not post anything.
--   · the program's ID, so it is named but not tappable: a viewer cannot open somebody else's program,
--     and a link that leads to a permission error is worse than a label.
--
-- The client renders their absence as absence — no ordinal line, no chapter row — rather than as a
-- zero. A value that is only ever its default is worse than an absent one (2026-08-01 audit).
--
-- ══ ENTITLEMENT IS THE POST, NOT THE RELATIONSHIP ════════════════════════════════════════════════
--
-- SOC-A2-D1 §2: *"friendship still exposes nothing… the athlete does."* This function refuses unless a
-- `squad_posts` row EXISTS carrying this workout on an audience the caller is in. Unfriend, leave the
-- squad, or delete the post and the session stops resolving — because the grant was never attached to
-- the workout, only ever to the post about it.
--
-- ⚠ PL/pgSQL binds column references at RUN time. Applying this proves the body parsed. The proof is
-- opening a squad-mate's recap card and seeing their sets.

create or replace function public.shared_workout_detail(p_workout_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_w   record;
begin
  if v_uid is null or p_workout_id is null then
    return null;
  end if;

  -- THE GATE. A post must exist, carry this workout, and be one this athlete is an audience for.
  if not exists (
    select 1
      from public.squad_posts p
     where p.workout_id = p_workout_id
       and (
            p.author_id = v_uid
         or (p.audience in ('FRIENDS', 'BOTH') and public.are_friends(p.author_id, v_uid))
         or (p.audience in ('SQUAD',   'BOTH') and p.squad_id is not null
             and public.is_squad_member(p.squad_id, v_uid))
       )
  ) then
    return null;
  end if;

  select w.id, w.athlete_id, w.workout_name, w.activity_type, w.started_at, w.duration_sec,
         w.distance, w.distance_unit, w.program_id,
         w.playlist_url, w.playlist_service, w.playlist_name
    into v_w
    from public.workouts w
   where w.id = p_workout_id
     and w.state = 'saved';

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_w.id,
    'author_id', v_w.athlete_id,
    'author_name', coalesce((select pr.name from public.profiles pr where pr.id = v_w.athlete_id), 'Athlete'),
    'workout_name', v_w.workout_name,
    'activity_type', v_w.activity_type,
    'started_at', v_w.started_at,
    'duration_sec', v_w.duration_sec,
    'distance', v_w.distance,
    'distance_unit', v_w.distance_unit,
    -- Named, not linked — see the header. `program_id` is deliberately not returned.
    'program_name', (select pg.name from public.programs pg where pg.id = v_w.program_id),
    'playlist_url', v_w.playlist_url,
    'playlist_service', v_w.playlist_service,
    'playlist_name', v_w.playlist_name,
    'exercises', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'name', we.name,
                 'section', we.section,
                 'position', we.position,
                 'catalog_key', we.catalog_key,
                 'sets', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'set_index', ws.set_index,
                              'weight', ws.weight,
                              'weight_unit', ws.weight_unit,
                              'reps', ws.reps
                            ) order by ws.set_index)
                     from public.workout_sets ws
                    where ws.workout_exercise_id = we.id
                 ), '[]'::jsonb)
               ) order by we.position)
        from public.workout_exercises we
       where we.workout_id = v_w.id
    ), '[]'::jsonb),
    -- The records set on the day of this session. Narrowed to this session's exercises by the client,
    -- exactly as the owner's own read does — a record set in a different session that day belongs to
    -- that session, not this one.
    'milestones', coalesce((
      select jsonb_agg(
               case when pr.load_value is not null
                    then pr.load_value::text || ' ' || coalesce(pr.load_unit, 'lb') || ' ' || pr.exercise
                    else pr.exercise end)
        from public.personal_records pr
       where pr.athlete_id = v_w.athlete_id
         and pr.achieved_on = (v_w.started_at at time zone 'UTC')::date
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.shared_workout_detail(uuid) from public;
grant execute on function public.shared_workout_detail(uuid) to authenticated;


-- ══ AND THE SQUAD FEED HAS TO CARRY THE ID, THE WAY THE FRIENDS FEED ALREADY DOES ═════════════════
--
-- Exactly the omission 0113 fixed on the other side, in the other direction. `friends_feed()` returns
-- `workout_id`, so the Friends card has always been able to route to the session. `squad_feed()` and
-- `squad_post_one()` select `workout_summary` and NOT `workout_id` — so a squad recap card had nowhere
-- to send you, and `onOpen` fell back to the post page. Same table, same column, one caller reading it.
--
-- Dropped first: `create or replace` cannot change a set-returning function's OUT columns (42P13) — the
-- same failure 0057 hit and 0109 hit again. Everything else below is 0057's body verbatim, including
-- the LEFT JOIN on profiles that keeps an authorless weekly recap in the feed.

drop function if exists public.squad_feed(uuid, int, int);
create function public.squad_feed(p_squad uuid, p_limit int, p_offset int)
returns table (
  id uuid, type text, body text, pr_value text, pr_exercise text, pr_label text,
  author_id uuid, author_name text, author_avatar text, author_is_owner boolean,
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean,
  media jsonb, workout_summary jsonb, layout jsonb, recap jsonb, workout_id uuid
)
language sql
security invoker
stable
set search_path = public
as $$
  select p.id, p.type, p.body, p.pr_value, p.pr_exercise, p.pr_label,
    p.author_id, pr.name, pr.avatar_url, (s.owner_id = p.author_id),
    p.created_at,
    (select count(*) from public.squad_post_comments c where c.post_id = p.id),
    (select count(*) from public.squad_post_reactions r where r.post_id = p.id),
    exists (select 1 from public.squad_post_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
    p.media, p.workout_summary, p.layout, p.recap, p.workout_id
  from public.squad_posts p
  join public.squads s on s.id = p.squad_id
  left join public.profiles pr on pr.id = p.author_id
  where p.squad_id = p_squad
  order by p.created_at desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

drop function if exists public.squad_post_one(uuid);
create function public.squad_post_one(p_post uuid)
returns table (
  id uuid, type text, body text, pr_value text, pr_exercise text, pr_label text,
  author_id uuid, author_name text, author_avatar text, author_is_owner boolean,
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean,
  media jsonb, workout_summary jsonb, layout jsonb, recap jsonb,
  squad_id uuid, squad_name text, squad_owner_id uuid, workout_id uuid
)
language sql
security invoker
stable
set search_path = public
as $$
  select p.id, p.type, p.body, p.pr_value, p.pr_exercise, p.pr_label,
    p.author_id, pr.name, pr.avatar_url, (s.owner_id = p.author_id),
    p.created_at,
    (select count(*) from public.squad_post_comments c where c.post_id = p.id),
    (select count(*) from public.squad_post_reactions r where r.post_id = p.id),
    exists (select 1 from public.squad_post_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
    p.media, p.workout_summary, p.layout, p.recap,
    s.id, s.name, s.owner_id, p.workout_id
  from public.squad_posts p
  join public.squads s on s.id = p.squad_id
  left join public.profiles pr on pr.id = p.author_id
  where p.id = p_post;
$$;


-- ═══════════════════════════ 0118_accomplishment_media.sql ═══════════════════════════

-- Forge Legacy — 0118: an accomplishment can carry the photo or the video
--
-- ══ WHAT WAS MISSING ═════════════════════════════════════════════════════════════════════════════
--
-- `Forge Accomplishments.dc.html`'s L-14 form has a file-drop slot for an optional photo. 0023 created
-- the column for it and said so in its own header — *"`photo_url` reserved for the design's optional
-- photo; the image-upload flow is a later pass, so it stays null for now"* — and the screen carried the
-- matching `DEFERRED vs the .dc` note. Two years of scaffolding, and nothing between them.
--
-- So the athlete adding "Marathon Finisher" could write why it mattered and could not attach the finish
-- line. Reported by the PO: *"I went to add an accomplishment, I don't see a spot to add the video or
-- the picture."* Note: **video**, which the `.dc` never drew and the column could not have held.
--
-- ══ THE COLUMN IS RENAMED, NOT JOINED BY A SECOND ONE ════════════════════════════════════════════
--
-- The obvious move is `add column video_url` beside `photo_url`. It is the wrong one: two columns
-- meaning "the media on this row" is precisely the drift this codebase keeps having to unpick — every
-- reader then has to know which to prefer, and the first one that gets it backwards shows a photo over
-- a video for a year before anyone notices.
--
-- A rename is safe HERE and would not be elsewhere, because `photo_url` has never been written. It was
-- created in 0023, it is absent from `saveAccomplishment`'s field list, and no other migration touches
-- it — so there is no data to migrate and no writer to break. One reader (`accomplishments-live.ts`'s
-- `toModel`) changes in the same commit.
--
--     media_url   the object's public URL in the `media` bucket, or null
--     media_kind  'image' | 'video', or null
--
-- BOTH OR NEITHER, enforced. A URL with no kind cannot be rendered (an image tag and a video player are
-- different components), and a kind with no URL is a claim about a file that does not exist. The check
-- makes the invalid pair unrepresentable rather than leaving every reader to defend against it.
--
-- ══ THE BUCKET ALREADY EXISTS ════════════════════════════════════════════════════════════════════
--
-- `media` (0006): public-read, writes owner-scoped by first path segment (`<uid>/…`), which is exactly
-- the shape an athlete-owned keepsake wants. No new bucket, no new policy. Objects land at
-- `<uid>/accomplishments/<accomplishment-or-draft-id>.<ext>`.
--
-- ⚠ DELETING AN ACCOMPLISHMENT DOES NOT DELETE ITS OBJECT. The row goes; the file is orphaned in the
-- bucket. Storage has no foreign keys, and a trigger reaching into `storage.objects` from a public
-- table is the kind of cross-schema coupling that fails silently when it fails. Recorded here rather
-- than pretended away — the same standing gap `transformation-media` and `squad-media` have, and the
-- same answer: a sweep job, when one is worth writing.

-- GUARDED so a second run is a no-op rather than `42703: column "photo_url" does not exist`.
-- Every other statement in this file is already `if not exists` / `if exists`; a bare RENAME would have
-- been the one line that turns "paste it again to be sure" — which is what actually happens when a run
-- is interrupted in the SQL editor — into an error that looks like the migration failed.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'accomplishments'
       and column_name  = 'photo_url'
  ) then
    alter table public.accomplishments rename column photo_url to media_url;
  end if;
end $$;

alter table public.accomplishments
  add column if not exists media_kind text;

alter table public.accomplishments
  drop constraint if exists accomplishments_media_kind_check;

alter table public.accomplishments
  add constraint accomplishments_media_kind_check
  check (
    (media_url is null and media_kind is null)
    or (media_url is not null and media_kind in ('image', 'video'))
  );
