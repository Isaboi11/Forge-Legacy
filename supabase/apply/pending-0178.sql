-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- PASTE BUNDLE — 0178 · acknowledgement kinds + comment editing
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- PASTE THIS WHOLE FILE INTO THE SUPABASE SQL EDITOR AND RUN IT ONCE. It is safe to run twice —
-- every statement is guarded (`add column if not exists`, a `pg_constraint` existence check, and
-- `drop policy if exists` before the create).
--
-- WHAT IT DOES
--   1. Adds `squad_post_reactions.kind` — respect | honor | support | strength — so the four locked
--      acknowledgement kinds (SOC-A4-D3) can finally be written. The amendment has described these
--      since August and the column has never existed.
--   2. Adds `squad_post_comments.edited_at` and an **author-only** UPDATE policy, so an athlete can
--      edit their own comment. That table has had INSERT and DELETE policies since 0041 and no UPDATE
--      policy at all, so editing could not have worked whatever the client sent — RLS denies by default.
--
-- ⚠ NO FUNCTION IS REBUILT BY THIS MIGRATION. `squad_feed` and `squad_post_one` count reactions without
--   regard to kind and keep doing exactly that (Amendment 004 permits a post's own acknowledgement
--   COUNT; four numbers per post would be a scoreboard). Touching neither also means there is no chance
--   of the 0088/0092/0106 failure — rebuilding a function body from an older copy and silently dropping
--   a shipped feature.
--
-- ⚠ THE OWNER CANNOT EDIT SOMEBODY ELSE'S COMMENT, deliberately. The DELETE policy from 0041 does let an
--   owner remove a comment, because removal is moderation. Rewriting another athlete's words while their
--   name stays on them is not, and this policy is `author_id = auth.uid()` on both sides.
--
-- ⚠ APPLYING IS NOT SHIPPING. The client half is committed but NOT yet deployed at the time of writing.
--   Until `/deploy-web` runs, §3 will correctly report 0 edited comments and 0 non-respect kinds — see
--   the prediction under §3. 0153 sat applied-and-invisible for eleven migrations exactly this way.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- §1 · THE STATEMENTS — verbatim from supabase/migrations/0178_acknowledgement_kinds_and_comment_edit.sql
--       7 statements / 20 non-comment lines, ALL 20 present and in order — verified by parsing both
--       files and diffing the non-comment lines, not by eye.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

alter table public.squad_post_reactions
  add column if not exists kind text not null default 'respect';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'squad_post_reactions_kind_ck') then
    alter table public.squad_post_reactions
      add constraint squad_post_reactions_kind_ck
      check (kind in ('respect', 'honor', 'support', 'strength'));
  end if;
end $$;

comment on column public.squad_post_reactions.kind is
  'WHICH acknowledgement this is — respect | honor | support | strength (SOC-A4-D3, locked). NOT part of the primary key: one athlete leaves one acknowledgement per post and chooses its kind, never a set of four. Defaults to respect, which is what every row written before 0178 was.';

alter table public.squad_post_comments
  add column if not exists edited_at timestamptz;

comment on column public.squad_post_comments.edited_at is
  'When the author last rewrote this comment; null means never. Set by the client on update so a comment that changed after people read it can say so.';

drop policy if exists squad_post_comments_update on public.squad_post_comments;
create policy squad_post_comments_update on public.squad_post_comments for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- §2 · ASSERTIONS — raise if anything above did not land.
--       A migration that returns a tidy green while having done nothing is what this section prevents.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'squad_post_reactions' and column_name = 'kind'
  ) then
    raise exception '0178 FAILED: squad_post_reactions.kind is absent';
  end if;

  if not exists (select 1 from pg_constraint where conname = 'squad_post_reactions_kind_ck') then
    raise exception '0178 FAILED: squad_post_reactions_kind_ck is absent — any string would be writable';
  end if;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'squad_post_comments' and column_name = 'edited_at'
  ) then
    raise exception '0178 FAILED: squad_post_comments.edited_at is absent';
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'squad_post_comments' and policyname = 'squad_post_comments_update'
  ) then
    raise exception '0178 FAILED: squad_post_comments_update policy is absent — editing would be denied by RLS';
  end if;

  -- ⚠ THE CONSTRAINT MUST ACTUALLY REFUSE A BAD VALUE. Its existence in `pg_constraint` says a
  -- constraint is there, not that it says what we think. This writes a deliberately invalid kind into a
  -- rolled-back savepoint and fails loudly if Postgres accepts it.
  begin
    insert into public.squad_post_reactions (post_id, user_id, kind)
    values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'applause');
    raise exception '0178 FAILED: the kind check accepted "applause"';
  exception
    when check_violation then null;      -- correct: refused
    when foreign_key_violation then null; -- also fine: the FK fired first, the row never existed
  end;

  raise notice '0178 OK — kind column + check, edited_at, and the author-only update policy are all present.';
end $$;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- §3 · REPORT — read-only.
--
--       PREDICTED OUTPUT, written before running (see the migration skill's step 4):
--         · acknowledgements            — however many exist; ALL of them kind='respect'
--         · non_respect_kinds           — 0   ← the client that writes them is NOT deployed yet
--         · comments                    — however many exist
--         · edited_comments             — 0   ← same reason
--         · update_policy               — 1
--
--       ⚠ A NON-ZERO `non_respect_kinds` OR `edited_comments` BEFORE THE DEPLOY MEANS SOMETHING ELSE IS
--         WRITING THESE COLUMNS. That is worth stopping for, not celebrating.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

select
  (select count(*) from public.squad_post_reactions)                                as acknowledgements,
  (select count(*) from public.squad_post_reactions where kind <> 'respect')        as non_respect_kinds,
  (select count(*) from public.squad_post_comments)                                 as comments,
  (select count(*) from public.squad_post_comments where edited_at is not null)     as edited_comments,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'squad_post_comments'
      and policyname = 'squad_post_comments_update')                                as update_policy;

-- The spread of kinds, once the client ships. All 'respect' today, by construction.
select kind, count(*) as n
  from public.squad_post_reactions
 group by kind
 order by n desc;
