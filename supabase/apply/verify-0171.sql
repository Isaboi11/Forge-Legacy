-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY 0171 — one row, every answer. Read-only, safe to run any time.
--
-- ⚠ ONE ROW BECAUSE THE SQL EDITOR SHOWS ONLY THE LAST STATEMENT'S RESULT. A bundle ending in several
--    selects silently hides all but one of them — that is how 0170's two security checks ran unread.
--
-- ⛔ NO FUNCTION IS CALLED HERE. Every one of 0171's functions keys off `auth.uid()`, which is null in the
--    editor, so calling one raises 28000 — and inside a bundle that rolls back everything before it.
--    Catalogue reads only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

select
  -- ── did it land ─────────────────────────────────────────────────────────────────────────────
  (to_regclass('public.athlete_blocks') is not null)                              as blocks_table,
  (to_regclass('public.content_reports') is not null)                             as reports_table,
  (to_regclass('public.moderation_blocklist') is not null)                        as blocklist_table,
  (to_regprocedure('public.is_blocked(uuid, uuid)') is not null)                  as is_blocked_fn,
  (to_regprocedure('public.block_athlete(uuid)') is not null)                     as block_fn,
  (to_regprocedure('public.report_content(text, text, text, text, uuid)') is not null) as report_fn,
  (to_regprocedure('public.admin_reports(int, text)') is not null)                as admin_fn,

  -- ── ⛔ ENFORCEMENT. Both numbers are the whole feature. ──────────────────────────────────────
  --
  -- MUST BE 4. These are RESTRICTIVE policies, which are ANDed with the permissive ones already on those
  -- tables. If any were created PERMISSIVE instead they would be ORed — which does not merely fail to hide
  -- blocked content, it makes ALL of it visible to everyone.
  (select count(*)
     from pg_policies
    where schemaname = 'public'
      and policyname in ('squad_posts_not_blocked', 'squad_post_comments_not_blocked',
                         'squad_post_reactions_not_blocked', 'squad_checkins_not_blocked')
      and permissive = 'RESTRICTIVE')::int                                        as restrictive_policies_expect_4,

  -- MUST BE 4. `friends_feed` is SECURITY DEFINER, so RLS does not apply to it and no policy above can
  -- reach it — these four predicates ARE the block on the friends feed. A future `create or replace`
  -- rebuilt from 0113 would drop them and every other check here would stay green.
  (select count(*)
     from regexp_matches(pg_get_functiondef('public.friends_feed(int, timestamptz)'::regprocedure),
                         'not public\.is_blocked', 'g'))::int                     as feed_predicates_expect_4,

  (exists (select 1 from pg_trigger
            where tgname = 'profiles_moderation_check' and not tgisinternal))     as name_filter_trigger,

  -- ── context ─────────────────────────────────────────────────────────────────────────────────
  (select count(*) from public.athlete_blocks)::int                               as blocks,
  (select count(*) from public.content_reports where status = 'open')::int        as reports_open,
  (select count(*) from public.moderation_blocklist)::int                         as blocklist_patterns;

-- ⚠ EXPECTED ON A FRESH APPLY: every boolean true, both counts 4, `blocks` and `reports_open` 0, and
--   `blocklist_patterns` 9 — the impersonation seed. **A slur/profanity list is NOT seeded and is owed**
--   (see 0171 §3b); adding rows needs no migration:
--
--     insert into public.moderation_blocklist (pattern, kind, note) values ('…', 'both', '…');
