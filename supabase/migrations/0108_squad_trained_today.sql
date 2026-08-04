-- Forge Legacy — 0108: "trained today" counts people who TRAINED
--
-- ══ THE DEFECT ══
--
-- The Squads hub card reads, in the largest type on it:
--
--     1 / 4
--     trained today
--
-- and the number counts rows in `squad_checkins` — a posted VIDEO check-in from the last 24 hours.
-- A squadmate who trained, logged every set, and finished the session moves it by nothing at all.
-- Squad Detail's "N training today" is the same figure with the same problem.
--
-- Reported the way defects like this always surface: "someone in the squad worked out and it didn't
-- update on the squad card." The card was not stale and the fetch was not broken. It was counting a
-- different thing from the one its own label names, which is the same class as `chapters.honor_count`
-- (0098) — a confident, specific number about the athlete that nothing behind it supported.
--
-- ══ WHY THIS NEEDS A FUNCTION AND NOT A QUERY ══
--
-- RLS on `workouts` is own-row: a member cannot read whether anybody ELSE trained. That is exactly why
-- the client fell back to counting check-ins — it was the only cross-member signal it could see. So the
-- count has to run `security definer`, and therefore carries the same member-or-public gate every other
-- definer function here carries. 0101 had to retrofit that onto `archive_squad_goal` after it shipped
-- without one and became a disclosure oracle; it is here from the start.
--
-- IT RETURNS A COUNT, NEVER A ROSTER. "Two of you trained" is the squad-scoped, non-comparative fact
-- S-1 asks for. "Marcus and Dana trained, you didn't" is a different product, and SA-D4 ("non-
-- participation is never shown as failure") rules it out. The function cannot leak the second one
-- because it never returns names.
--
-- ══ WHAT COUNTS ══
--
-- A member counts if, since `p_since`, they either saved a workout OR posted a check-in. Both are
-- evidence of training and neither supersedes the other: the check-in is a claim you make to the squad,
-- the workout is a record you made for yourself. Counting only the first was the bug; counting only the
-- second would silently retire a feature people use.
--
-- The window is the CALLER'S, passed in rather than computed here. A squad spans timezones and the
-- server has no opinion about when the athlete's day started; the client already computes local midnight
-- for its own fallback, and now that value governs both halves instead of one.
--
-- Depends on 0001 (workouts), 0029 (is_squad_member), 0048 (squad_checkins). Idempotent. RUN AFTER 0107.

begin;

-- ── one squad ────────────────────────────────────────────────────────────────
create or replace function public.squad_trained_since(p_squad uuid, p_since timestamptz)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select case
    when not (
      public.is_squad_member(p_squad, auth.uid())
      or exists (select 1 from public.squads s where s.id = p_squad and s.privacy = 'public')
    ) then 0
    else (
      select count(distinct m.user_id)::int
        from public.squad_members m
       where m.squad_id = p_squad
         and (
           exists (
             select 1 from public.workouts w
              where w.athlete_id = m.user_id
                and w.state = 'saved'
                and w.saved_at >= p_since
           )
           or exists (
             select 1 from public.squad_checkins c
              where c.squad_id = p_squad
                and c.user_id = m.user_id
                and c.created_at >= p_since
           )
         )
    )
  end;
$$;

grant execute on function public.squad_trained_since(uuid, timestamptz) to authenticated;

comment on function public.squad_trained_since(uuid, timestamptz) is
  'How many of a squad''s members have trained since p_since — a saved workout OR a posted check-in. A COUNT, never a roster: "two of you trained" is the squad fact; naming who did not is a different product (SA-D4).';


-- ── many squads, one round trip ──────────────────────────────────────────────
-- The Squads hub draws this figure on every card. One call per squad would be N round trips on the
-- first screen of the tab, so the hub gets a batch that answers them together.
create or replace function public.squads_trained_since(p_squads uuid[], p_since timestamptz)
returns table (squad_id uuid, trained int)
language sql
security definer
stable
set search_path = public
as $$
  select s.id, public.squad_trained_since(s.id, p_since)
    from public.squads s
   where s.id = any(coalesce(p_squads, '{}'::uuid[]));
$$;

grant execute on function public.squads_trained_since(uuid[], timestamptz) to authenticated;

commit;

-- ── VERIFY (in the app, not here — auth.uid() is NULL in the SQL editor, so both
--            functions correctly return 0 for a private squad and a healthy
--            migration looks broken) ─────────────────────────────────────────
--
--   -- structural: both functions exist
--   select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and proname in ('squad_trained_since','squads_trained_since');
--   -- expect 2 rows
--
--   -- behavioural: have a squadmate log a workout, then open the Squads tab.
--   -- The "N / M trained today" figure should include them without anyone filming anything.
