-- diagnose-po-chapter-photos.sql — READ-ONLY. Changes nothing.
--
-- PO, 2026-09-30: "the photos from my first chapter didn't save or aren't in there."
--
-- There are TWO photo stores, and only one of them is what a chapter's album counts:
--   · chapter_photos          — "Add a Photo" on a chapter. This is the album.
--   · transformation_entries  — progress photos (the six poses). NOT shown in a chapter's album.
-- So "no photos in Chapter I" can be true while every progress photo is safe next door.
--
-- One result set (the SQL editor only shows the last one). One row per chapter of every admin
-- account, plus a row for progress photos tied to no chapter, plus what is physically in storage.
-- Paste the whole result back.

with me as (
  select a.user_id as uid, u.email, u.created_at as account_created
    from public.app_admins a
    join auth.users u on u.id = a.user_id
)
select 'chapter' as what,
       me.email,
       me.account_created::date as account_created,
       c.name,
       c.start_date,
       coalesce(c.end_date, c.sealed_at::date) as ended,
       c.is_active,
       (select count(*) from public.chapter_photos p where p.chapter_id = c.id) as album_photos,
       (select count(*) from public.transformation_entries t where t.chapter_id = c.id) as progress_entries,
       (select coalesce(sum((select count(*) from jsonb_object_keys(t.photos))), 0)
          from public.transformation_entries t where t.chapter_id = c.id) as progress_photos,
       (select min(t.created_at)::date from public.transformation_entries t where t.chapter_id = c.id) as first_progress,
       (select max(t.created_at)::date from public.transformation_entries t where t.chapter_id = c.id) as last_progress
  from me
  join public.chapters c on c.athlete_id = me.uid

union all

select 'progress photos with NO chapter', me.email, me.account_created::date, null, null, null, null,
       0,
       count(t.id),
       coalesce(sum((select count(*) from jsonb_object_keys(t.photos))), 0),
       min(t.created_at)::date, max(t.created_at)::date
  from me
  left join public.transformation_entries t on t.athlete_id = me.uid and t.chapter_id is null
 group by me.email, me.account_created

union all

-- What is physically in the two buckets under this account, and since when.
select 'files in storage: ' || o.bucket_id, me.email, me.account_created::date, null,
       min(o.created_at)::date, max(o.created_at)::date, null,
       count(*), null, null, null, null
  from me
  join storage.objects o on o.owner = me.uid and o.bucket_id in ('chapter-photos', 'transformation-media')
 group by o.bucket_id, me.email, me.account_created

order by 1, 5;
