-- Forge Legacy — 0020: bookmarked exercises (Exercise-003, LOCKED)
--
-- The locked architecture calls this `UserFavoriteExercise`: athlete-owned, manual, no limit, private.
-- It is the athlete's own shortlist, and together with what they have actually logged it is what puts
-- the exercises they really use at the top of the Picker — real signals, rather than a "popularity"
-- ranking the catalog carries no data for.
--
-- `catalog_key` is the `exercises.json` id, not a foreign key: the exercise catalog is shipped app
-- content, not a table. An unknown key simply doesn't resolve and is skipped.

create table if not exists public.exercise_favorites (
  athlete_id  uuid not null references profiles(id) on delete cascade,
  catalog_key text not null,
  created_at  timestamptz not null default now(),
  primary key (athlete_id, catalog_key)
);

create index if not exists exercise_favorites_athlete on public.exercise_favorites (athlete_id, created_at desc);

alter table public.exercise_favorites enable row level security;

-- Private to its owner — EX-003: favourites are never visible to anyone else.
create policy exercise_favorites_owner_select on public.exercise_favorites
  for select using (athlete_id = auth.uid());
create policy exercise_favorites_owner_insert on public.exercise_favorites
  for insert with check (athlete_id = auth.uid());
create policy exercise_favorites_owner_delete on public.exercise_favorites
  for delete using (athlete_id = auth.uid());
