-- Forge Legacy — 0041: Squad Feed (Social · Part 1 · training-only posts)
--
-- A squad's internal feed: typed posts + flat comments + a "respect" reaction, all per-squad and
-- member-scoped. Training-only by design (no polls / public events / programs — that's the Community store).
-- Post types shipped: checkin · recap · pr · discussion · announcement (owner-gated). The design's
-- formcheck (needs video upload), challenge (needs the competition system), and traintogether (needs
-- scheduling) ride on subsystems that don't exist yet and are omitted here, not stubbed. RUN BY HAND.

-- ── Tables ────────────────────────────────────────────────────────────────────
create table if not exists public.squad_posts (
  id          uuid primary key default gen_random_uuid(),
  squad_id    uuid not null references public.squads(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('checkin', 'recap', 'pr', 'discussion', 'announcement')),
  body        text,
  pr_value    text,   -- 'pr' only: "315 lb", "19:48"
  pr_exercise text,   -- 'pr' only: "Bench Press"
  pr_label    text,   -- 'pr' only: "Squad PR"
  created_at  timestamptz not null default now()
);
create index if not exists squad_posts_squad on public.squad_posts (squad_id, created_at desc);

create table if not exists public.squad_post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.squad_posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists squad_post_comments_post on public.squad_post_comments (post_id, created_at);

create table if not exists public.squad_post_reactions (
  post_id    uuid not null references public.squad_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.squad_posts          enable row level security;
alter table public.squad_post_comments  enable row level security;
alter table public.squad_post_reactions enable row level security;

-- ── Helpers (SECURITY DEFINER → policies can call without recursing) ──────────
create or replace function public.is_squad_owner(p_squad uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.squads where id = p_squad and owner_id = p_uid);
$$;

create or replace function public.squad_of_post(p_post uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select squad_id from public.squad_posts where id = p_post;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Posts: any member reads; a member posts as themselves; announcements are owner-only; author or owner deletes.
drop policy if exists squad_posts_select on public.squad_posts;
drop policy if exists squad_posts_insert on public.squad_posts;
drop policy if exists squad_posts_delete on public.squad_posts;
create policy squad_posts_select on public.squad_posts for select
  using (public.is_squad_member(squad_id, auth.uid()));
create policy squad_posts_insert on public.squad_posts for insert with check (
  author_id = auth.uid()
  and public.is_squad_member(squad_id, auth.uid())
  and (type <> 'announcement' or public.is_squad_owner(squad_id, auth.uid()))
);
create policy squad_posts_delete on public.squad_posts for delete
  using (author_id = auth.uid() or public.is_squad_owner(squad_id, auth.uid()));

-- Comments: member of the post's squad reads; a member comments as themselves; author or squad owner deletes.
drop policy if exists squad_post_comments_select on public.squad_post_comments;
drop policy if exists squad_post_comments_insert on public.squad_post_comments;
drop policy if exists squad_post_comments_delete on public.squad_post_comments;
create policy squad_post_comments_select on public.squad_post_comments for select
  using (public.is_squad_member(public.squad_of_post(post_id), auth.uid()));
create policy squad_post_comments_insert on public.squad_post_comments for insert with check (
  author_id = auth.uid() and public.is_squad_member(public.squad_of_post(post_id), auth.uid())
);
create policy squad_post_comments_delete on public.squad_post_comments for delete
  using (author_id = auth.uid() or public.is_squad_owner(public.squad_of_post(post_id), auth.uid()));

-- Reactions: member reads; you own your reaction (insert/delete).
drop policy if exists squad_post_reactions_select on public.squad_post_reactions;
drop policy if exists squad_post_reactions_insert on public.squad_post_reactions;
drop policy if exists squad_post_reactions_delete on public.squad_post_reactions;
create policy squad_post_reactions_select on public.squad_post_reactions for select
  using (public.is_squad_member(public.squad_of_post(post_id), auth.uid()));
create policy squad_post_reactions_insert on public.squad_post_reactions for insert with check (
  user_id = auth.uid() and public.is_squad_member(public.squad_of_post(post_id), auth.uid())
);
create policy squad_post_reactions_delete on public.squad_post_reactions for delete
  using (user_id = auth.uid());

-- ── Read RPCs (security invoker → squad_posts RLS still gates every row) ───────
-- One squad's feed, newest first, with author identity + live counts + whether I've reacted.
create or replace function public.squad_feed(p_squad uuid, p_limit int, p_offset int)
returns table (
  id uuid, type text, body text, pr_value text, pr_exercise text, pr_label text,
  author_id uuid, author_name text, author_avatar text, author_is_owner boolean,
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean
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
    exists (select 1 from public.squad_post_reactions r where r.post_id = p.id and r.user_id = auth.uid())
  from public.squad_posts p
  join public.squads s on s.id = p.squad_id
  join public.profiles pr on pr.id = p.author_id
  where p.squad_id = p_squad
  order by p.created_at desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

-- A single post (same shape as the feed row) plus the squad name + owner id (so the thread can badge roles).
create or replace function public.squad_post_one(p_post uuid)
returns table (
  id uuid, type text, body text, pr_value text, pr_exercise text, pr_label text,
  author_id uuid, author_name text, author_avatar text, author_is_owner boolean,
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean,
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
    s.id, s.name, s.owner_id
  from public.squad_posts p
  join public.squads s on s.id = p.squad_id
  join public.profiles pr on pr.id = p.author_id
  where p.id = p_post;
$$;
