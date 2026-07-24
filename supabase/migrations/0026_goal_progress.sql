-- Forge Legacy — 0026: Goal progress history (G-2 Goal Detail · History list)
--
-- Each "Update Progress" on a quantifiable goal writes one immutable row here — the log the design shows
-- as "365 → 405 lb · <date>". Stored as from→to so the row renders directly and survives the goal's
-- `current` moving on. Permanent, like the goal itself (no delete); cascades only if the goal row ever is.

create table if not exists public.goal_progress (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references goals(id) on delete cascade,
  athlete_id  uuid not null references profiles(id) on delete cascade,
  from_value  numeric not null,
  to_value    numeric not null,
  created_at  timestamptz not null default now()
);

create index if not exists goal_progress_goal on public.goal_progress (goal_id, created_at desc);

alter table public.goal_progress enable row level security;

create policy goal_progress_owner_select on public.goal_progress for select using (athlete_id = auth.uid());
create policy goal_progress_owner_insert on public.goal_progress for insert with check (athlete_id = auth.uid());
