-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0188: the photo archive stops being a public folder
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: the bucket update is idempotent, every policy is dropped before it is created,
-- and §3 is read-only.
--
-- ⛔ DO NOT RUN THIS UNTIL THE OTA CARRYING `src/lib/signed-media.ts` IS LIVE.
--
-- This is the entire risk of the file, and it is an ordering risk rather than a SQL one. Any athlete
-- still running a bundle that builds photo URLs with `getPublicUrl()` is pointing at a private bucket
-- the moment §1 runs — every photo in the archive 404s, on the screens that exist to show photos.
-- `createSignedUrl` works against a public bucket too, so the app change is inert until this lands.
-- That asymmetry is what makes "app first, migration second" safe and the reverse an outage.
--
-- ══ WHAT IT DOES ══
--
-- §1  flips `chapter-photos` to `public = false` and replaces its four storage policies, verbatim from
--     `0188_private_chapter_photos.sql`. Read becomes authenticated-and-yours instead of anyone; insert
--     becomes owner-scoped instead of any authenticated user writing into any chapter's folder.
-- §2  asserts the bucket is private and all four policies exist with the shape §1 gave them — and, the
--     assertion that matters, that READ is not still open to `anon`. RAISES rather than returning a
--     tidy false green.
-- §3  reports the bucket, the four policies and the object counts. Read-only, ONE result set.
--
-- ⚠ §3 IS DELIBERATELY ONE RESULT SET. The Supabase editor shows only the LAST one, which is how
-- 0182's function list and policy counts were swallowed. Do not split it.
--
-- ══ ⚠ THE NUMBER TO READ IN §3 IS `unreachable objects`. IT MUST BE 0 ══
--
-- The read policy grants an object to an athlete two ways: `owner = auth.uid()`, or the object's first
-- path segment resolving to a chapter they own. An object matching NEITHER is a photo its athlete can
-- never open again, with no recovery path and no error they would think to report. The count is
-- expected to be **0**, because every object in this bucket was written as `<chapterId>/<file>` by
-- `uploadChapterPhoto`. If it is not 0: STOP, do not ship, and say so.
--
-- ══ WHAT THIS DOES NOT TOUCH ══
--
-- `transformation-media` stays public for now, and the reason is wiring rather than policy: a progress
-- post stores the transformation object's URL directly, so squad-mates read that object off the feed
-- without owning it and without being able to sign it. Locking it before the share path copies into
-- `squad-media` would break every progress post already posted. The four social buckets and
-- `exercise-media` stay public by design.
-- ═══════════════════════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════
-- §1 — BUCKET AND POLICIES  (verbatim from 0188_private_chapter_photos.sql)
-- ══════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0188: the photo archive stops being a public folder
--
-- ══ WHAT THIS CLOSES ══
--
-- `0146`'s "Still open" §1 — read on the media buckets is open to `anon`. Both of the personal photo
-- buckets were created `public: true` with a SELECT policy carrying NO `TO` clause and NO owner scope
-- (`create policy chapter_photos_read … using (bucket_id = 'chapter-photos')`, 0085), so every progress
-- photo any athlete has ever taken is fetchable by anyone holding the URL, forever, signed out.
--
-- 0146 could not close it and said so: *"Making the bucket private turns every one of those into a 404
-- — every photo in the app disappears. Closing it means moving to signed URLs across every media
-- surface, which is an app change and a release, not a migration."* That app change is
-- `src/lib/signed-media.ts`. This is the migration half.
--
-- ⛔ ══ ORDERING. THIS IS THE WHOLE RISK OF THE FILE ══
--
-- **Ship the OTA before pasting this.** Every athlete still running a bundle that calls
-- `getPublicUrl()` is calling it against a private bucket the moment this runs, and every photo in the
-- archive 404s on a screen that is nothing but photos. `createSignedUrl` works on a PUBLIC bucket too,
-- so the app change is a no-op until this lands — which is exactly what makes that order safe and the
-- reverse order a visible outage. Confirm the update is live, THEN paste.
--
-- ══ ⚠ WHY THE READ POLICY IS NOT JUST `owner = auth.uid()` ══
--
-- That is the obvious policy and it is a trap. `storage.objects.owner` is populated by the client on
-- upload; 0146 already relies on it for UPDATE and DELETE, where a null owner costs an athlete the
-- ability to re-upload or tidy up. On SELECT the same null costs them **the photo itself, permanently,
-- with no recovery path and no error anyone would think to report.** An archive is the one place in
-- this app where a false negative is unacceptable — the product's promise is that it is kept.
--
-- So ownership is established the way the schema actually establishes it. The object path is
-- `<chapterId>/<file>` (`photos-live.ts` builds it), `chapters` is owner-scoped, and a chapter IS an
-- album (0085). `owner = auth.uid()` stays as the fast path; the chapter lookup is the truth, and it
-- holds for every object ever uploaded regardless of what `owner` says.
--
-- The chapter id is cast TO text rather than casting the folder name to uuid — a stray non-uuid folder
-- must fail to match, not raise 22P02 and take the whole listing down with it.
--
-- ══ WHAT THIS DELIBERATELY DOES NOT TOUCH ══
--
-- `transformation-media` — the six poses, and the bucket a coach will eventually read (FC-D16). It
-- cannot be locked yet and the reason is a wiring fact, not a policy one: a progress post stores the
-- transformation object's URL **directly** (`progress-photo-post.tsx` hands `entry.photos[k]` to
-- `addSquadPost`), so squad-mates — who do not own that object and cannot sign it — read it straight
-- off the feed. Locking it today breaks every progress post already posted. The share path must copy
-- into `squad-media` first, the way every other post's media already does.
--
-- The four social buckets (`avatars`, `squad-photos`, `squad-media`, `media`) stay public by design:
-- they hold what an athlete chose to show people. `exercise-media` stays public because it is the
-- product's own 703 demo loops, keyed by exercise id, with no stored URL anywhere.
--
-- ══ WHAT ELSE MOVES, AND WHY IT BELONGS HERE ══
--
-- INSERT was `with check (bucket_id = 'chapter-photos')` — any authenticated user could write objects
-- into any chapter's folder. It is owner-scoped here, matching what 0146 did for `squad-photos`.
--
-- UPDATE and DELETE gain the same chapter clause as SELECT. Leaving them on a bare `owner` test would
-- mean a null-owner object an athlete can see and can never delete — and `delete_my_account()` walks
-- exactly these rows (`account-live.ts`), so an undeletable object is an orphan that outlives the
-- account that made it. 0142 built a ledger for that class; this stops adding to it.

-- ── The bucket ───────────────────────────────────────────────────────────────
update storage.buckets set public = false where id = 'chapter-photos';

-- ── The policies ─────────────────────────────────────────────────────────────
drop policy if exists chapter_photos_read on storage.objects;
create policy chapter_photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'chapter-photos'
    and (
      owner = auth.uid()
      or (storage.foldername(name))[1] in (
        select c.id::text from public.chapters c where c.athlete_id = auth.uid()
      )
    )
  );

drop policy if exists chapter_photos_write on storage.objects;
create policy chapter_photos_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chapter-photos'
    and owner = auth.uid()
    and (storage.foldername(name))[1] in (
      select c.id::text from public.chapters c where c.athlete_id = auth.uid()
    )
  );

drop policy if exists chapter_photos_update on storage.objects;
create policy chapter_photos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'chapter-photos'
    and (
      owner = auth.uid()
      or (storage.foldername(name))[1] in (
        select c.id::text from public.chapters c where c.athlete_id = auth.uid()
      )
    )
  );

drop policy if exists chapter_photos_delete on storage.objects;
create policy chapter_photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'chapter-photos'
    and (
      owner = auth.uid()
      or (storage.foldername(name))[1] in (
        select c.id::text from public.chapters c where c.athlete_id = auth.uid()
      )
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ══════════════════════════════════════════════════════════════════════════
do $ASSERT$
declare
  v_public   boolean;
  v_missing  text;
  v_anon     int;
  v_loose    int;
begin
  select b.public into v_public from storage.buckets b where b.id = 'chapter-photos';
  if v_public is null then
    raise exception '0188: bucket chapter-photos does not exist. Was 0085 ever applied?';
  end if;
  if v_public then
    raise exception '0188: chapter-photos is STILL PUBLIC. Section 1 did not take.';
  end if;

  select string_agg(want.n, ', ') into v_missing
  from (values ('chapter_photos_read'), ('chapter_photos_write'),
               ('chapter_photos_update'), ('chapter_photos_delete')) as want(n)
  where not exists (
    select 1 from pg_policies p
    where p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = want.n
  );
  if v_missing is not null then
    raise exception '0188: missing storage policies: %', v_missing;
  end if;

  -- The whole point. A SELECT policy with no TO clause applies to anon, which is the 0146 finding.
  select count(*) into v_anon
  from pg_policies p
  where p.schemaname = 'storage' and p.tablename = 'objects'
    and p.policyname = 'chapter_photos_read'
    and not ('authenticated' = any(p.roles) and array_length(p.roles, 1) = 1);
  if v_anon > 0 then
    raise exception '0188: chapter_photos_read is not scoped TO authenticated - read is still open to anon.';
  end if;

  -- A read policy naming neither a chapter nor an owner grants the whole bucket to every signed-in user.
  select count(*) into v_loose
  from pg_policies p
  where p.schemaname = 'storage' and p.tablename = 'objects'
    and p.policyname = 'chapter_photos_read'
    and (p.qual is null or p.qual not like '%chapters%' or p.qual not like '%owner%');
  if v_loose > 0 then
    raise exception '0188: chapter_photos_read lost its owner/chapter scope - every athlete can read every archive.';
  end if;

  raise notice '0188 OK - chapter-photos is private, four policies present, read is authenticated and owner-scoped.';
end $ASSERT$;


-- ══════════════════════════════════════════════════════════════════════════
-- §3 — WHAT IS NOW THERE. Read-only, ONE result set.
-- ══════════════════════════════════════════════════════════════════════════

-- ⚠ EXPECTED: bucket `private`; four policies, every one `{authenticated}` and `owner+chapter`;
--    and `unreachable objects` = 0. Anything else, stop and report it.
with obj as (
  select
    count(*)                                as total,
    count(*) filter (where o.owner is null) as no_owner,
    count(*) filter (
      where o.owner is null
        and (storage.foldername(o.name))[1] not in (select c.id::text from public.chapters c)
    )                                       as unreachable
  from storage.objects o
  where o.bucket_id = 'chapter-photos'
)
select 'bucket'         as kind,
       'chapter-photos' as thing,
       case when b.public then 'PUBLIC  <-- WRONG' else 'private' end as verdict
from storage.buckets b where b.id = 'chapter-photos'

union all
select 'policy',
       p.policyname || '  ' || p.cmd,
       array_to_string(p.roles, ',')
         || case
              when coalesce(p.qual, p.with_check) like '%chapters%'
               and coalesce(p.qual, p.with_check) like '%owner%'    then '  owner+chapter'
              when coalesce(p.qual, p.with_check) like '%chapters%' then '  chapter only'
              when coalesce(p.qual, p.with_check) like '%owner%'    then '  owner only'
              else '  UNSCOPED  <-- WRONG'
            end
from pg_policies p
where p.schemaname = 'storage' and p.tablename = 'objects'
  and p.policyname like 'chapter\_photos\_%'

union all
select 'objects', 'a. total in bucket',            o.total::text    from obj
union all
select 'objects', 'b. owner is null (still fine)', o.no_owner::text from obj
union all
select 'objects', 'c. unreachable objects (expect 0)',
       case when o.unreachable = 0 then '0' else o.unreachable::text || '  <-- STOP' end
from obj

order by 1, 2;
