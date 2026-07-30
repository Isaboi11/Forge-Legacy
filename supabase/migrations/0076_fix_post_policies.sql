-- Forge Legacy — 0076: fix two regressions 0074 introduced
--
-- ══ 1. A SELF-REFERENTIAL DEFINER FUNCTION CANNOT BE A SELECT POLICY ON ITS OWN TABLE ══
--
-- 0074 replaced `squad_posts`' SELECT policy with `can_read_post(id, auth.uid())`, a SECURITY DEFINER
-- function that queries `squad_posts` to find the row. Reading worked. Posting failed with
-- "new row violates row-level security policy for table squad_posts" (42501).
--
-- Why: PostgREST's `insert().select()` issues `INSERT ... RETURNING`, and RETURNING must pass the SELECT
-- policy as well as the INSERT one. The policy called `can_read_post`, whose inner `select ... from
-- squad_posts where id = p_post` runs with a snapshot taken at statement start — so the row currently being
-- inserted is not visible to it. The lookup found nothing, the policy evaluated false, and the insert was
-- rejected for a row that was in fact perfectly permitted.
--
-- 0041's original policy never had this problem because it tested the NEW row's own columns
-- (`is_squad_member(squad_id, auth.uid())`) rather than looking the row back up. That is the shape to keep:
-- a policy on a table should read that table's columns, never re-query it.
--
-- So the predicate is INLINED here. `can_read_post` stays — it is correct and useful for `squad_post_comments`
-- and `squad_post_reactions`, whose policies query a DIFFERENT table than the one they guard, which is the
-- case the definer-helper pattern was designed for (0041's own comment says so).
--
-- ══ 2. TWO VALID POST TYPES WERE DROPPED ══
--
-- 0074 rebuilt `squad_posts_type_check` from 0041's original five types plus 'weekly', and missed that 0042
-- added 'formcheck' and 'transformation'. The authoritative list was 0057's. Form-check posts and
-- transformation posts would both have been rejected — 'transformation' is offered in the squad composer
-- today, so that is a live path.
--
-- Restored in full, with 0074's two additions kept.
--
-- Depends on 0074. Idempotent. RUN AFTER 0074.

-- ── The type list, complete ───────────────────────────────────────────────────
alter table public.squad_posts drop constraint if exists squad_posts_type_check;
alter table public.squad_posts add constraint squad_posts_type_check
  check (type in (
    -- 0041
    'checkin', 'recap', 'pr', 'discussion', 'announcement',
    -- 0042
    'formcheck', 'transformation',
    -- 0057
    'weekly',
    -- 0074
    'progress', 'milestone'
  ));

-- ── The SELECT policy, reading its own row ────────────────────────────────────
drop policy if exists squad_posts_select on public.squad_posts;
create policy squad_posts_select on public.squad_posts for select using (
  author_id = auth.uid()
  or (audience in ('SQUAD', 'BOTH') and squad_id is not null and public.is_squad_member(squad_id, auth.uid()))
  or (audience in ('FRIENDS', 'BOTH') and public.are_friends(author_id, auth.uid()))
);

-- ── The INSERT policy, likewise — `coalesce` so a null audience can never silently fail every branch ──
drop policy if exists squad_posts_insert on public.squad_posts;
create policy squad_posts_insert on public.squad_posts for insert with check (
  author_id = auth.uid()
  and (
    (coalesce(audience, 'SQUAD') in ('SQUAD', 'BOTH')
      and public.is_squad_member(squad_id, auth.uid())
      and (type <> 'announcement' or public.is_squad_owner(squad_id, auth.uid())))
    or (audience = 'FRIENDS' and squad_id is null)
  )
);

-- Comments and reactions keep `can_read_post`: their policies guard a different table than the one the
-- function reads, so there is no snapshot problem and no recursion. Re-asserted here so this migration
-- leaves the whole set in a known state.
drop policy if exists squad_post_comments_select on public.squad_post_comments;
create policy squad_post_comments_select on public.squad_post_comments for select
  using (public.can_read_post(post_id, auth.uid()));

drop policy if exists squad_post_reactions_select on public.squad_post_reactions;
create policy squad_post_reactions_select on public.squad_post_reactions for select
  using (public.can_read_post(post_id, auth.uid()));
