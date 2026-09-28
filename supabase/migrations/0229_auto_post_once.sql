-- 0229 — AUTO-POST LANDS ONCE PER WORKOUT PER DESTINATION
--
-- Auto-post (2026-09-28) lets a finished workout post itself to the athlete's friends and/or squads. The
-- post is the SAME recap row a manual post makes (`squad_posts`, type 'recap', `workout_id` +
-- `workout_summary`) — not a second post type — with one marker: `workout_summary->>'auto' = 'true'`.
--
-- The client already refuses to post to a destination that has the workout (`autoPostTargets`, reading
-- the athlete's own rows first). This index is the other half: if two attempts race past that read — a
-- retry overlapping a slow first try, two tabs — the second insert fails with 23505, which the client
-- reads as "already there" (`isDuplicate` in `auto-post-live.ts`).
--
-- ⚠ AUTO ROWS ONLY. Manual posts are not constrained here: the post sheet refuses destinations that
-- already have the session, and existing data may hold duplicate manual posts from before that rule
-- (the PO's own "people will double post"), which a table-wide unique index would fail to build over.
--
-- A null `squad_id` (a friends-only post) is coalesced to the zero uuid so that it, too, can only
-- appear once per workout. Additive, idempotent, no rows rewritten, no policy change.

create unique index if not exists squad_posts_auto_once
  on public.squad_posts (workout_id, coalesce(squad_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where workout_id is not null and (workout_summary ->> 'auto') = 'true';

comment on index public.squad_posts_auto_once is
  'Auto-post idempotency (0229): at most one auto-posted recap per workout per destination (squad, or friends when squad_id is null). Marker is workout_summary->>''auto''. Manual posts are not constrained.';
