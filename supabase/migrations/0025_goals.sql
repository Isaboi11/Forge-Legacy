-- Forge Legacy — 0025: Goals (G-1 Goal Hub, LOCKED spec)
--
-- Chapter-scoped commitments. GD-D1: one PRIMARY goal per chapter, unlimited secondary. GD-D2: goals
-- live under a chapter. GD-D4: achieve + remain visible (achieved goals stay until the chapter archives).
-- GD-D5: no delete/abandon — the only exit is archiving the chapter, so there is deliberately NO delete
-- path in the app; the row persists.
--
-- A goal is quantifiable (target + unit + a manually-updated `current`) OR narrative (target null — a
-- commitment marked achieved by hand). `target_date` is reserved for the Calendar, which may write a
-- milestone/target date (CAL-D4) but never creates/achieves/edits a goal.

create table if not exists public.goals (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references profiles(id) on delete cascade,
  chapter_id   uuid not null references chapters(id) on delete cascade,
  name         text not null,
  target       numeric,                 -- null = narrative goal
  unit         text,                     -- null unless a target is set
  current      numeric not null default 0,
  is_primary   boolean not null default false,
  target_date  date,                     -- Calendar-written milestone (CAL-D4); we only store it
  achieved_at  timestamptz,              -- null = in progress
  created_at   timestamptz not null default now()
);

create index if not exists goals_athlete_chapter on public.goals (athlete_id, chapter_id, created_at);

-- GD-D1 safety net: at most one primary per chapter. The app unsets the old primary before setting the
-- new one (never two at once), so this partial unique index is safe.
create unique index if not exists goals_one_primary on public.goals (chapter_id) where is_primary;

alter table public.goals enable row level security;

create policy goals_owner_select on public.goals for select using (athlete_id = auth.uid());
create policy goals_owner_insert on public.goals for insert with check (athlete_id = auth.uid());
create policy goals_owner_update on public.goals for update using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
-- No delete policy — GD-D5: goals are never deleted; the chapter archive records the outcome.
