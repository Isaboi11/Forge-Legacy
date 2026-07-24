-- Forge Legacy — 0023: Accomplishments (L-12/13/14)
--
-- Athlete-authored, freeform milestones — the deliberate opposite of Honors: 100% athlete CRUD, no
-- taxonomy, no numeric validation (`forge-accomplishments.js`). The Legacy fixture's own comment
-- ("FIXTURE until an accomplishments table lands") anticipated this table.
--
-- `chapter_id` null = account-level ("built before Forge Legacy" / no chapter). On chapter delete the
-- accomplishment survives, un-chaptered (`set null`), rather than vanishing with it.
--
-- `featured` is the design's "Featured on Profile" flag — the athlete's top 3, shown with a star on the
-- Legacy accomplishments section. The 3-cap is enforced in the app layer (the design's toggle), not here,
-- so the column stays a plain boolean.
--
-- `photo_url` reserved for the design's optional photo; the image-upload flow is a later pass, so it
-- stays null for now (accomplishments are fully usable without one, exactly as the .dc allows).

create table if not exists public.accomplishments (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references profiles(id) on delete cascade,
  name        text not null,
  date        date,
  chapter_id  uuid references chapters(id) on delete set null,
  featured    boolean not null default false,
  note        text,
  photo_url   text,
  created_at  timestamptz not null default now()
);

create index if not exists accomplishments_athlete on public.accomplishments (athlete_id, created_at desc);

alter table public.accomplishments enable row level security;

-- Private to its owner — athlete-authored, athlete-owned.
create policy accomplishments_owner_select on public.accomplishments
  for select using (athlete_id = auth.uid());
create policy accomplishments_owner_insert on public.accomplishments
  for insert with check (athlete_id = auth.uid());
create policy accomplishments_owner_update on public.accomplishments
  for update using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy accomplishments_owner_delete on public.accomplishments
  for delete using (athlete_id = auth.uid());
