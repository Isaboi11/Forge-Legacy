-- Forge Legacy — 0085: chapter photos (L-15 / L-16) — the Legacy photo archive
--
-- The Legacy screen has advertised a photo count since the first build and it has always been a literal
-- in `LEGACY_FIXTURE_PENDING`. This is the table behind it. Photos belong to a chapter, and a chapter is
-- an album — which is why there is no standalone `photos` table and no album entity: the chapter IS the
-- grouping, and one already exists.
--
-- ══ CREATION LIVES AT L-3/L-4, NOT L-15 ══
--
-- `L-15-Photos-Architecture` §2 is explicit that the only photo creation paths are the chapter screens,
-- and §6 that "L-15 is browse-only". That holds here: nothing in this migration is reachable from the
-- gallery. The insert path is the chapter's own media strip.
--
-- ══ THE COVER WATERFALL ══
--
-- `photo_albums()` resolves a chapter's cover through the design's five tiers, in one place, so the
-- albums list and the album header can never disagree about which photo represents a chapter:
--
--   1. `chapters.cover_photo_id` — an explicit choice always wins.
--   2. A sealed chapter uses the shot tagged `role = 'final'` — the closing image of a closed chapter.
--   3. The most recent STARRED photo. Starring is an importance signal and is deliberately kept separate
--      from cover intent (tier 1): "this mattered" is not the same claim as "this represents the chapter".
--   4. The most recent photo.
--   5. Null — the chapter has no photos, and is not an album yet.
--
-- ══ EVENTS AND MILESTONES ARE DERIVED, NOT TYPED IN ══
--
-- The design carries an `event` string per day ("PR · Squat 405", "Chapter opened") as authored fixture
-- text. Storing that as free text would let the timeline claim a PR that never happened. Every event here
-- is computed from records the app already keeps: a photo dated on the chapter's start date reads
-- "Chapter opened", one dated on its seal date reads "Chapter sealed", and one sharing a date with a
-- `personal_records` row reads that PR. A day with an event is a MILESTONE day, which is what drives the
-- larger bronze-edged cover in the timeline — so the emphasis is earned by the record rather than
-- assigned by hand.
--
-- Depends on 0001 (chapters, personal_records, profiles). Idempotent. RUN AFTER 0084.

create table if not exists public.chapter_photos (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  chapter_id  uuid not null references public.chapters(id) on delete cascade,
  url         text not null,
  taken_on    date not null default current_date,
  pose        text,                                       -- optional label: "Front", "Side", "Clip"
  caption     text,                                       -- the photo's own line, shown in the viewer
  is_video    boolean not null default false,
  is_starred  boolean not null default false,             -- importance, NOT cover intent (tier 3)
  role        text,                                       -- 'final' = a sealed chapter's closing shot
  created_at  timestamptz not null default now()
);

create index if not exists chapter_photos_athlete on public.chapter_photos (athlete_id, taken_on desc, created_at desc);
create index if not exists chapter_photos_chapter on public.chapter_photos (chapter_id, taken_on desc, created_at desc);

alter table public.chapter_photos enable row level security;

-- Owner-only, every verb. There is no squad or friend surface for Legacy photos anywhere in the
-- architecture (`L-15-Photos-Architecture` §2), so there is no read path for anyone else.
drop policy if exists chapter_photos_all on public.chapter_photos;
create policy chapter_photos_all on public.chapter_photos for all
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- Tier 1 of the cover waterfall. No FK: a deleted photo should blank the choice, not block the delete,
-- and `photo_albums()` already falls through to tier 2 when the id resolves to nothing.
alter table public.chapters add column if not exists cover_photo_id uuid;

comment on column public.chapters.cover_photo_id is
  'Explicitly chosen album cover. Tier 1 of photo_albums()''s waterfall; null falls through to sealed-final, then starred, then most recent.';

-- ── Media storage (public read, authenticated write — mirrors transformation-media, 0044) ──
insert into storage.buckets (id, name, public)
  values ('chapter-photos', 'chapter-photos', true)
  on conflict (id) do nothing;

drop policy if exists chapter_photos_read on storage.objects;
drop policy if exists chapter_photos_write on storage.objects;
drop policy if exists chapter_photos_update on storage.objects;
drop policy if exists chapter_photos_delete on storage.objects;
create policy chapter_photos_read on storage.objects for select
  using (bucket_id = 'chapter-photos');
create policy chapter_photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'chapter-photos');
create policy chapter_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'chapter-photos' and owner = auth.uid());
create policy chapter_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'chapter-photos' and owner = auth.uid());

-- ── Albums (L-15 root) ────────────────────────────────────────────────────────
create or replace function public.photo_albums()
returns jsonb
language plpgsql
security invoker
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('total', 0, 'albums', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'total', (select count(*) from public.chapter_photos p where p.athlete_id = v_uid),

    -- Only chapters that HAVE photos. A chapter with none has no cover to draw, and a hero card with a
    -- blank plate is worse than not being listed yet — it becomes an album with its first photo.
    'albums', coalesce((
      select jsonb_agg(a.obj order by a.is_active desc, a.start_date desc)
        from (
          select c.is_active, c.start_date,
                 jsonb_build_object(
                   'chapter_id', c.id,
                   'name', c.name,
                   'subtitle', c.reflection,
                   'start_date', c.start_date,
                   'end_date', coalesce(c.end_date, c.sealed_at::date),
                   'is_active', c.is_active,
                   'sealed', c.sealed_at is not null,

                   'cover_url', coalesce(
                     -- 1 · an explicit choice always wins
                     (select p.url from public.chapter_photos p
                       where p.id = c.cover_photo_id and p.chapter_id = c.id),
                     -- 2 · a sealed chapter closes on its final shot
                     (select p.url from public.chapter_photos p
                       where p.chapter_id = c.id and c.sealed_at is not null and p.role = 'final'
                       order by p.taken_on desc, p.created_at desc limit 1),
                     -- 3 · the most recent thing they marked as mattering
                     (select p.url from public.chapter_photos p
                       where p.chapter_id = c.id and p.is_starred
                       order by p.taken_on desc, p.created_at desc limit 1),
                     -- 4 · the most recent photo
                     (select p.url from public.chapter_photos p
                       where p.chapter_id = c.id
                       order by p.taken_on desc, p.created_at desc limit 1)
                   ),
                   -- Whether the cover is a moving frame, so the card can badge it. The design's own
                   -- cover resolves to a video and shows no play indicator.
                   'cover_is_video', coalesce((
                     select p.is_video from public.chapter_photos p
                      where p.chapter_id = c.id
                      order by p.taken_on desc, p.created_at desc limit 1
                   ), false),

                   'photo_count', (select count(*) from public.chapter_photos p where p.chapter_id = c.id),
                   -- Derived, never a hand-entered literal: the design's card says 8 weeks over a range
                   -- that spans nine and a half.
                   'weeks', greatest(1, ceil((
                     coalesce(c.end_date, c.sealed_at::date, current_date) - c.start_date
                   )::numeric / 7)::int),

                   -- The chapter's headline lift: heaviest PR set inside its window.
                   'highlight_exercise', (
                     select pr.exercise from public.personal_records pr
                      where pr.athlete_id = v_uid
                        and pr.measure_kind = 'load'
                        and pr.achieved_on >= c.start_date
                        and pr.achieved_on <= coalesce(c.end_date, c.sealed_at::date, current_date)
                      order by pr.load_value desc nulls last, pr.achieved_on desc limit 1
                   ),
                   'highlight_value', (
                     select pr.load_value from public.personal_records pr
                      where pr.athlete_id = v_uid
                        and pr.measure_kind = 'load'
                        and pr.achieved_on >= c.start_date
                        and pr.achieved_on <= coalesce(c.end_date, c.sealed_at::date, current_date)
                      order by pr.load_value desc nulls last, pr.achieved_on desc limit 1
                   )
                 ) as obj
            from public.chapters c
           where c.athlete_id = v_uid
             and exists (select 1 from public.chapter_photos p where p.chapter_id = c.id)
        ) a
    ), '[]'::jsonb)
  );
end;
$$;

-- ── One album (L-15 detail) ───────────────────────────────────────────────────
-- Every photo in a chapter, newest first, each carrying the event derived for its date. The client
-- groups by month and day; the database decides what is TRUE about a date, which is the part it can
-- actually answer.
create or replace function public.chapter_album(p_chapter uuid)
returns jsonb
language plpgsql
security invoker
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c     public.chapters%rowtype;
begin
  if v_uid is null then
    return null;
  end if;

  select * into c from public.chapters where id = p_chapter and athlete_id = v_uid;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'chapter_id', c.id,
    'name', c.name,
    'subtitle', c.reflection,
    'start_date', c.start_date,
    'end_date', coalesce(c.end_date, c.sealed_at::date),
    'is_active', c.is_active,
    'sealed', c.sealed_at is not null,
    'weeks', greatest(1, ceil((
      coalesce(c.end_date, c.sealed_at::date, current_date) - c.start_date
    )::numeric / 7)::int),

    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'url', p.url,
               'taken_on', p.taken_on,
               'pose', p.pose,
               'caption', p.caption,
               'is_video', p.is_video,
               'is_starred', p.is_starred,
               'role', p.role,
               -- The event for this photo's DATE. Chapter boundaries first, then the day's best PR.
               -- Null on an ordinary day, which is most of them.
               'event', case
                 when p.taken_on = c.start_date then 'Chapter opened'
                 when c.sealed_at is not null and p.taken_on = c.sealed_at::date then 'Chapter sealed'
                 else (
                   -- `exercise` is a catalog slug, so it is spoken rather than printed raw, and the load
                   -- keeps a half-plate without growing a ".0": FM drops trailing fraction zeros and the
                   -- rtrim removes the bare decimal point it leaves behind. 405 → "405", 227.5 → "227.5".
                   select 'PR · ' || initcap(replace(pr.exercise, '-', ' ')) || ' '
                          || rtrim(to_char(pr.load_value, 'FM999999.99'), '.')
                     from public.personal_records pr
                    where pr.athlete_id = v_uid
                      and pr.achieved_on = p.taken_on
                      and pr.measure_kind = 'load'
                    order by pr.load_value desc nulls last limit 1
                 )
               end
             ) order by p.taken_on desc, p.created_at desc)
        from public.chapter_photos p
       where p.chapter_id = c.id
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.photo_albums() is
  'L-15 albums: every chapter that has photos, with its cover resolved through the five-tier waterfall so no two surfaces disagree about which photo represents a chapter.';
comment on function public.chapter_album(uuid) is
  'One chapter''s photos, newest first, each carrying the event DERIVED for its date (chapter opened/sealed, or that day''s PR) rather than an authored string.';
