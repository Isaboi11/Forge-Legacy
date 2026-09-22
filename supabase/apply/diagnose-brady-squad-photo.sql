-- ─────────────────────────────────────────────────────────────────────────────
-- DIAGNOSTIC ONLY — reads, no writes. Safe to run any time.
--
-- "Why is this picture in the squad not showing up" — a post by Brady Plante in
-- "da bois" whose photo more than one member cannot see.
--
-- Everything checkable from the repo is already clean, so this is the remaining
-- fork and §1 decides it in one row:
--
--   media = '[]'  → the photo NEVER UPLOADED. The composer only attaches media on
--                   a successful upload, so Brady got an error toast and posted
--                   anyway. There is nothing to recover; he re-attaches and posts.
--
--   media = [{url}] → the row is fine and the OBJECT is the problem. §2 and §3 say
--                   whether it exists in the bucket and whether the URL was built
--                   against the right path.
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ §1 · THE POST ROW — does it carry media at all? ══════════════════════════
select
  p.id            as post_id,
  p.type,
  pr.name         as author,
  s.name          as squad,
  p.created_at,
  jsonb_array_length(coalesce(p.media, '[]'::jsonb)) as media_count,
  p.media,
  -- ⚠ A NON-NULL `layout` IS ITS OWN FAILURE MODE. `asTransformationLayout` reads
  -- "anything without a known kind is a transformation layout", so an unrecognised
  -- shape is drawn as a photo comparison and the real media array is emptied on the
  -- way — a post that renders a blank where the picture should be.
  p.layout ->> 'kind' as layout_kind,
  (p.layout is not null)  as has_layout
from public.squad_posts p
join public.profiles pr on pr.id = p.author_id
join public.squads   s  on s.id  = p.squad_id
where s.name ilike '%da bois%'
  and pr.name ilike '%brady%'
order by p.created_at desc
limit 10;

-- ══ §2 · THE OBJECT — is what the URL points at actually in the bucket? ══════
-- Compares each post's stored URL against the real object list. `missing_object`
-- true means the row points at something that is not there.
with m as (
  select p.id as post_id,
         p.created_at,
         e.value ->> 'url'  as url,
         e.value ->> 'kind' as kind
  from public.squad_posts p
  join public.profiles pr on pr.id = p.author_id
  join public.squads   s  on s.id  = p.squad_id
  cross join lateral jsonb_array_elements(coalesce(p.media, '[]'::jsonb)) e
  where s.name ilike '%da bois%'
    and pr.name ilike '%brady%'
)
select
  m.post_id,
  m.kind,
  m.url,
  -- The client uploads to `<squad_id>/<user_id>-<epoch>.<ext>`, so the object name
  -- is everything after '/squad-media/'.
  split_part(m.url, '/squad-media/', 2) as object_name,
  (o.id is null) as missing_object,
  o.created_at   as object_uploaded_at,
  o.metadata ->> 'size'      as bytes,
  o.metadata ->> 'mimetype'  as mimetype
from m
left join storage.objects o
  on o.bucket_id = 'squad-media'
 and o.name = split_part(m.url, '/squad-media/', 2)
order by m.post_id;

-- ══ §3 · THE BUCKET — still public, still readable by everyone? ══════════════
-- 0042 created it public with an unrestricted select policy and 0075 left SELECT
-- alone deliberately. If `public` came back false, a migration privatised it and
-- EVERY squad photo in the app is dark, not just this one.
select id, public
from storage.buckets
where id = 'squad-media';

select policyname, cmd, roles::text, qual
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'squad_media%'
order by policyname;

-- ══ §4 · WHAT BRADY HAS IN THE BUCKET, regardless of any post ═══════════════
-- If §1 says media is empty but a fresh object exists here at the same minute,
-- the upload SUCCEEDED and the post row lost it — a different bug entirely, and
-- the URL below can be pasted straight back onto the post.
select o.name, o.created_at, o.metadata ->> 'size' as bytes
from storage.objects o
where o.bucket_id = 'squad-media'
  and o.owner = (select id from public.profiles where name ilike '%brady%' limit 1)
order by o.created_at desc
limit 20;
