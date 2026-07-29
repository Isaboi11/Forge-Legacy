-- Forge Legacy — 0049: squad check-ins → ephemeral video "stories"
--
-- Re-models check-ins (0048) as Marco-Polo/story-style: each is a short (≤30s) VIDEO. Only a member's LATEST
-- check-in shows, and only within 24h (a newer one supersedes the older; both age out after a day). A
-- `squad_checkin_views` table records who has watched which — so the UI can show unwatched (new) vs watched.
-- The check-in data from 0048 was ephemeral daily state, so this drops + recreates the table. Videos live in
-- the existing public `squad-media` bucket (0042). `squad_metric_total` (0048) is unaffected. RUN BY HAND.

drop table if exists public.squad_checkins cascade;

create table public.squad_checkins (
  id         uuid primary key default gen_random_uuid(),
  squad_id   uuid not null references public.squads(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  video_url  text not null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists squad_checkins_recent on public.squad_checkins (squad_id, created_at desc);

alter table public.squad_checkins enable row level security;
drop policy if exists squad_checkins_select on public.squad_checkins;
drop policy if exists squad_checkins_insert on public.squad_checkins;
drop policy if exists squad_checkins_delete on public.squad_checkins;
create policy squad_checkins_select on public.squad_checkins for select
  using (public.is_squad_member(squad_id, auth.uid()));
create policy squad_checkins_insert on public.squad_checkins for insert with check (
  user_id = auth.uid() and public.is_squad_member(squad_id, auth.uid())
);
create policy squad_checkins_delete on public.squad_checkins for delete
  using (user_id = auth.uid());

-- Who watched which check-in (unwatched = no row for the viewer).
create table if not exists public.squad_checkin_views (
  checkin_id uuid not null references public.squad_checkins(id) on delete cascade,
  viewer_id  uuid not null references public.profiles(id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (checkin_id, viewer_id)
);
alter table public.squad_checkin_views enable row level security;
drop policy if exists squad_checkin_views_select on public.squad_checkin_views;
drop policy if exists squad_checkin_views_insert on public.squad_checkin_views;
create policy squad_checkin_views_select on public.squad_checkin_views for select
  using (viewer_id = auth.uid());
create policy squad_checkin_views_insert on public.squad_checkin_views for insert with check (viewer_id = auth.uid());
