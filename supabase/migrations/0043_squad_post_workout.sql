-- Forge Legacy — 0043: Workout-backed squad posts (real Recap; PR provenance)
--
-- A Workout Recap post now references a REAL completed workout and carries a SNAPSHOT of its stats taken at
-- post time (so the recap stays intact even if the workout is later edited/deleted — same rule as
-- accomplishments AD-52). The feed card renders the summary; the post detail renders the exercise breakdown.
-- `workout_summary` shape: { volume, durationSec, prCount, exercises:[{name,sets,topSet,isPR}] }. RUN BY HAND.

alter table public.squad_posts add column if not exists workout_id      uuid references public.workouts(id) on delete set null;
alter table public.squad_posts add column if not exists workout_summary jsonb;

-- Feed RPCs now also carry `workout_summary` (drop first — CREATE OR REPLACE can't change OUT columns).
drop function if exists public.squad_feed(uuid, int, int);
create function public.squad_feed(p_squad uuid, p_limit int, p_offset int)
returns table (
  id uuid, type text, body text, pr_value text, pr_exercise text, pr_label text,
  author_id uuid, author_name text, author_avatar text, author_is_owner boolean,
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean, media jsonb, workout_summary jsonb
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
    p.media, p.workout_summary
  from public.squad_posts p
  join public.squads s on s.id = p.squad_id
  join public.profiles pr on pr.id = p.author_id
  where p.squad_id = p_squad
  order by p.created_at desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

drop function if exists public.squad_post_one(uuid);
create function public.squad_post_one(p_post uuid)
returns table (
  id uuid, type text, body text, pr_value text, pr_exercise text, pr_label text,
  author_id uuid, author_name text, author_avatar text, author_is_owner boolean,
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean, media jsonb, workout_summary jsonb,
  squad_id uuid, squad_name text, squad_owner_id uuid
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
    p.media, p.workout_summary,
    s.id, s.name, s.owner_id
  from public.squad_posts p
  join public.squads s on s.id = p.squad_id
  join public.profiles pr on pr.id = p.author_id
  where p.id = p_post;
$$;
