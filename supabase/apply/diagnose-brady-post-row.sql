-- READ ONLY. The object is already proven fine — 200, public, CORS-open — so this
-- asks the only remaining question: does the POST ROW carry that URL?
--
--   media_count = 0  → the row lost the photo. Brady is seeing it from his own
--                      client's cache, not from the feed, which is exactly why it
--                      shows for him and nobody else.
--   media_count = 1  → the row is fine and the CLIENT is dropping it. Read
--                      `layout_kind` in that case: a non-null layout makes
--                      `asTransformationLayout` draw a photo comparison and empty
--                      the real media array on the way.

select
  p.id                                               as post_id,
  p.type,
  p.created_at,
  jsonb_array_length(coalesce(p.media, '[]'::jsonb)) as media_count,
  p.media,
  p.layout ->> 'kind'                                as layout_kind,
  (p.layout is not null)                             as has_layout,
  left(coalesce(p.body, ''), 60)                     as body_preview
from public.squad_posts p
where p.squad_id  = 'e3ec430d-3166-4261-b4a0-29176d2cd61f'   -- da bois
  and p.author_id = '95dedc0d-347a-409c-93a3-c529836649b4'   -- Brady
order by p.created_at desc
limit 10;
