-- ─────────────────────────────────────────────────────────────────────────────
-- REPAIR: post rows poisoned with a one-hour SIGNED photo URL.
--
-- ══ WHAT HAPPENED ══
--
-- `fd09f99` ("a photo you can stop showing someone — 0188") added `signMedia`, which
-- rewrites every chapter-photo read into a `/object/sign/…?token=` URL with a
-- **60-minute TTL**. It was written for a PRIVATE `chapter-photos` bucket.
--
-- ⚠ `0188` WAS ROLLED BACK — the bucket is public again by PO decision — BUT THE
--   CLIENT HALF WAS NEVER REMOVED. It lives on `ota/build8-js` and on no other
--   branch, so every OTA since 2026-09-04 has been signing URLs against a bucket
--   that needs no signature.
--
-- Signing a public bucket is harmless for RENDERING, which is why it went unseen.
-- It is fatal the moment a URL is PERSISTED: `workout-complete.tsx` attaches
-- today's chapter photo to a squad recap, so a permanent row was written holding a
-- URL that dies in an hour. The author keeps seeing it from their own image cache;
-- everyone else gets `400 InvalidJWT: "exp" claim timestamp check failed`.
--
-- The objects themselves are FINE. Same path via `/object/public/` returns 200.
-- This rewrites the stored URLs back to their durable public form.
--
-- ⚠ RUN THE CODE FIX FIRST OR THE ROWS RE-POISON. A client still running the
--   signing build will write fresh signed URLs into every new recap.
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ §1 · HOW BAD IS IT — read this before writing anything ═══════════════════
select
  count(*)                                                as poisoned_posts,
  min(created_at)                                         as first_seen,
  max(created_at)                                         as last_seen,
  count(*) filter (where created_at > now() - interval '1 hour') as still_live_for_now
from public.squad_posts
where media::text like '%/object/sign/%';

-- Per-post detail, so the repair can be checked against something.
select p.id, p.type, p.created_at, pr.name as author, s.name as squad, p.media
from public.squad_posts p
join public.profiles pr on pr.id = p.author_id
join public.squads   s  on s.id  = p.squad_id
where p.media::text like '%/object/sign/%'
order by p.created_at desc;

-- ══ §2 · THE REPAIR ═════════════════════════════════════════════════════════
-- `/object/sign/<path>?token=<jwt>` → `/object/public/<path>`
--
-- ⚠ ORDER IS PRESERVED (`with ordinality` + `order by ord`). A transformation post
--   carries two photos and swapping them would silently reverse a before/after.
-- ⚠ Only the `url` key is touched; `kind` and any other key ride through untouched.
update public.squad_posts p
set media = (
  select jsonb_agg(
           case
             when e ->> 'url' like '%/object/sign/%'
               then jsonb_set(
                      e,
                      '{url}',
                      to_jsonb(split_part(replace(e ->> 'url', '/object/sign/', '/object/public/'), '?', 1))
                    )
             else e
           end
           order by ord
         )
  from jsonb_array_elements(p.media) with ordinality as t(e, ord)
)
where p.media::text like '%/object/sign/%';

-- ══ §3 · VERIFY — must return 0 ═════════════════════════════════════════════
select count(*) as still_poisoned
from public.squad_posts
where media::text like '%/object/sign/%';

-- And confirm the repaired rows now hold a public URL that resolves.
-- (Open one in a browser — a public chapter-photos URL returns 200 with no token.)
select p.id, p.created_at, e ->> 'url' as url
from public.squad_posts p
cross join lateral jsonb_array_elements(coalesce(p.media, '[]'::jsonb)) e
where e ->> 'url' like '%/object/public/chapter-photos/%'
order by p.created_at desc
limit 10;

-- ══ §4 · THE OTHER PLACE A URL IS STORED ════════════════════════════════════
-- `squad_checkins.video_url` is written from `uploadCheckinVideo`, which uploads
-- directly and never passes through `signMedia` — so it should be clean. Asserted
-- rather than assumed, because "should be" is how the first one was missed.
select count(*) as poisoned_checkins
from public.squad_checkins
where video_url like '%/object/sign/%';
