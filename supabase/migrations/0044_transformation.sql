-- Forge Legacy — 0044: Transformation gallery (L-17) — documentary progress-photo archive
--
-- Personal (owner-only) body-change record: chapter-grouped entries, each up to six guided poses + an
-- optional posing clip, a reflection, tags, and a context line. Photos/video live in a public
-- `transformation-media` bucket; the entry row holds a `photos` map (poseKey → url) + `video_url`. New
-- entries tie to the athlete's ACTIVE chapter (the design hardcodes one — real app groups by real chapters).
-- RUN BY HAND in the Supabase SQL editor.

create table if not exists public.transformation_entries (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  label      text not null,                                  -- the capture date, free text ("Mar 6, 2026")
  caption    text,                                            -- reflection
  meta       text,                                            -- context line ("183 lb · Week 12 · Morning")
  tags       text[] not null default '{}',
  photos     jsonb  not null default '{}'::jsonb,             -- { rf:url, rs:url, rb:url, ff:url, su:url, bf:url }
  video_url  text,
  created_at timestamptz not null default now()
);
create index if not exists transformation_entries_athlete on public.transformation_entries (athlete_id, created_at desc);

alter table public.transformation_entries enable row level security;

drop policy if exists transformation_entries_all on public.transformation_entries;
create policy transformation_entries_all on public.transformation_entries for all
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- ── Media storage (public read, authenticated write — mirrors squad-media, 0042) ──
insert into storage.buckets (id, name, public)
  values ('transformation-media', 'transformation-media', true)
  on conflict (id) do nothing;

drop policy if exists xform_media_read on storage.objects;
drop policy if exists xform_media_write on storage.objects;
drop policy if exists xform_media_update on storage.objects;
drop policy if exists xform_media_delete on storage.objects;
create policy xform_media_read on storage.objects for select
  using (bucket_id = 'transformation-media');
create policy xform_media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'transformation-media');
create policy xform_media_update on storage.objects for update to authenticated
  using (bucket_id = 'transformation-media');
create policy xform_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'transformation-media');
