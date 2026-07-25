-- Forge Legacy — 0028: body metrics (P-2 Progress Hub · body section)
--
-- Optional bodyweight + measurement log — a quiet record, no goal weight. Weight is stored canonically in
-- pounds (display converts to kg via the units system); measurements are inches and never convert. Each
-- weigh-in carries a REAL date (`logged_on`) — an improvement over the .dc's always-"Now" label.
--
-- The "enabled" + "show-trend" toggles are device-local UI prefs (AsyncStorage), not stored here.
-- Idempotent: safe to run repeatedly.

create table if not exists public.body_entries (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references profiles(id) on delete cascade,
  logged_on   date not null default current_date,
  weight_lb   numeric not null,
  waist_in    numeric,
  chest_in    numeric,
  arm_in      numeric,
  created_at  timestamptz not null default now()
);

create index if not exists body_entries_athlete on public.body_entries (athlete_id, logged_on);

alter table public.body_entries enable row level security;

drop policy if exists body_owner_select on public.body_entries;
drop policy if exists body_owner_insert on public.body_entries;
drop policy if exists body_owner_delete on public.body_entries;
create policy body_owner_select on public.body_entries for select using (athlete_id = auth.uid());
create policy body_owner_insert on public.body_entries for insert with check (athlete_id = auth.uid());
create policy body_owner_delete on public.body_entries for delete using (athlete_id = auth.uid());
