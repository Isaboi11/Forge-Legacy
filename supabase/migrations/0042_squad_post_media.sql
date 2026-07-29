-- Forge Legacy — 0042: Squad post media (photos + video) + Form Check / Transformation types
--
-- Adds an attachments store to squad posts so most types can carry a photo or a short video, restores the
-- Form Check type (video-centric — it was blocked on exactly this), and pre-allows Transformation (before/
-- after photos, wired next). Media lives in a public `squad-media` bucket; `squad_posts.media` holds an
-- ordered `[{url, kind}]` array (0–1 items now; Transformation uses 2). RUN BY HAND in the SQL editor.

-- ── Media column ──────────────────────────────────────────────────────────────
alter table public.squad_posts add column if not exists media jsonb not null default '[]'::jsonb;

-- ── Widen the type set (formcheck restored; transformation reserved for the next build) ──
alter table public.squad_posts drop constraint if exists squad_posts_type_check;
alter table public.squad_posts add constraint squad_posts_type_check
  check (type in ('checkin', 'recap', 'pr', 'formcheck', 'transformation', 'discussion', 'announcement'));

-- ── Media storage (public read, authenticated write — mirrors squad-photos, 0030/0033) ──
insert into storage.buckets (id, name, public)
  values ('squad-media', 'squad-media', true)
  on conflict (id) do nothing;

drop policy if exists squad_media_read on storage.objects;
drop policy if exists squad_media_write on storage.objects;
drop policy if exists squad_media_update on storage.objects;
drop policy if exists squad_media_delete on storage.objects;
create policy squad_media_read on storage.objects for select
  using (bucket_id = 'squad-media');
create policy squad_media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'squad-media');
create policy squad_media_update on storage.objects for update to authenticated
  using (bucket_id = 'squad-media');
create policy squad_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'squad-media');

-- ── Feed RPCs now carry `media` (drop first — CREATE OR REPLACE can't change a function's OUT columns) ──
drop function if exists public.squad_feed(uuid, int, int);
create function public.squad_feed(p_squad uuid, p_limit int, p_offset int)
returns table (
  id uuid, type text, body text, pr_value text, pr_exercise text, pr_label text,
  author_id uuid, author_name text, author_avatar text, author_is_owner boolean,
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean, media jsonb
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
    p.media
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
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean, media jsonb,
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
    p.media,
    s.id, s.name, s.owner_id
  from public.squad_posts p
  join public.squads s on s.id = p.squad_id
  join public.profiles pr on pr.id = p.author_id
  where p.id = p_post;
$$;
