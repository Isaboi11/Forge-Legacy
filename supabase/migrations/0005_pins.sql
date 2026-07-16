-- Forge Legacy — 0005: Pinned Legacy (Phase 3 follow-up, media)
-- The "My Museum · Pinned Legacy" strip (Forge Legacy.dc.html §pinned) — the design's home for a
-- curated record lift / sealed chapter / honor / photo. Small spine extension; a pin carries its own
-- display fields + media so the strip renders from real rows (not the fixture). Owner-scoped RLS.
-- The pin-curation sheet (openPins) stays inert for now — only the table + real pins need to exist.

create type pin_kind as enum ('record', 'chapter', 'honor', 'photo', 'memory');

create table pins (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references profiles(id) on delete cascade,
  kind        pin_kind not null,
  title       text not null,
  subtitle    text,
  media_url   text,                 -- image (photo) or video URL in the `media` bucket
  poster_url  text,                 -- still frame for video pins (design: image-slot behind the play button)
  is_video    boolean not null default false,
  ref_id      uuid,                 -- soft ref to the underlying entity (PR / chapter / honor); no FK
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index pins_athlete_position on pins (athlete_id, position);

alter table pins enable row level security;
create policy pins_own on pins for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
