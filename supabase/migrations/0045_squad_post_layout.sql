-- Forge Legacy — 0045: Squad post share layout (transformation templates)
--
-- A shared transformation can pick a layout template (slider / side-by-side / stacked / multi-pose grid) and
-- carry one or more before/after pose pairs. `layout` holds `{ template, thenLabel, nowLabel, elapsed,
-- pairs:[{label, then:{url,transform}, now:{url,transform}}] }`. `media[0]` stays a representative thumbnail
-- for the feed card. RUN BY HAND in the SQL editor.

alter table public.squad_posts add column if not exists layout jsonb;

-- Feed RPCs now also return `layout` (drop first — CREATE OR REPLACE can't change OUT columns).
drop function if exists public.squad_feed(uuid, int, int);
create function public.squad_feed(p_squad uuid, p_limit int, p_offset int)
returns table (
  id uuid, type text, body text, pr_value text, pr_exercise text, pr_label text,
  author_id uuid, author_name text, author_avatar text, author_is_owner boolean,
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean, media jsonb, workout_summary jsonb, layout jsonb
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
    p.media, p.workout_summary, p.layout
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
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean, media jsonb, workout_summary jsonb, layout jsonb,
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
    p.media, p.workout_summary, p.layout,
    s.id, s.name, s.owner_id
  from public.squad_posts p
  join public.squads s on s.id = p.squad_id
  join public.profiles pr on pr.id = p.author_id
  where p.id = p_post;
$$;
