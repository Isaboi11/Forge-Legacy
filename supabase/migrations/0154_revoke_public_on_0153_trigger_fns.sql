-- Forge Legacy — 0154: the two trigger functions 0153 created were granted to PUBLIC
--
-- ══ WHAT BROKE, AND WHY EVERY GATE WAS GREEN ══
--
-- `0147_revoke_anon_execute.sql` established an invariant on 2026-08-12: **zero non-extension functions
-- in `public` are executable by `anon`**. It was verified the same day — `anon_project_fns_expect_0`
-- returned 0.
--
-- A pre-flight on 2026-08-13 returned that check as MISSING. The database named the two:
--
--     push_tg_training_finished  ()  returns trigger  {=X/postgres, postgres=X/…, authenticated=X/…, service_role=X/…}
--     push_tg_training_started   ()  returns trigger  {=X/postgres, postgres=X/…, authenticated=X/…, service_role=X/…}
--
-- Both are 0153's. **`create or replace function` preserves the grants on a function that already
-- exists — but on one that does not, it is a plain `create`, and a newly created function carries
-- Postgres's default `EXECUTE` to PUBLIC.** 0153 revokes explicitly on `notification_events_for` and
-- `set_squad_notify`, the two functions it replaced that already had revokes to preserve, and on nothing
-- else. The two genuinely new ones were the only ones that needed it, and they are the two that missed.
--
-- ⚠ THAT IS 0147's OWN LESSON, ONE FILE LATER. Its header records the pattern under ~169 findings: *a
--   correct fix landed at one call site while its siblings were missed.* This is the sibling.
--
-- ══ THE LEADING `=` IS THE WHOLE DIAGNOSIS ══
--
-- `{=X/postgres, …}` — an ACL entry with an EMPTY grantee is the PUBLIC grant. There is no `anon=X`
-- entry on either function. So `anon`'s ability to execute is INHERITED FROM PUBLIC, and
--
--     revoke execute on function … from anon;
--
-- alone would have reported success and changed nothing — the check would still read MISSING and the
-- next reader would conclude the check was broken rather than the grant. 0147 hit the mirror image of
-- this and recorded it: *"There are TWO grants — Postgres's PUBLIC default and Supabase's direct anon
-- grant — and both must be revoked."* Here there is only the first. Both statements are issued anyway:
-- the direct-anon form is a no-op today and is what keeps this correct if Supabase's default privileges
-- are ever re-applied to the schema.
--
-- ══ WHY REVOKING CANNOT BREAK THE TRIGGERS ══
--
-- Postgres checks `EXECUTE` on a trigger function when the TRIGGER IS CREATED, not when it fires. The
-- triggers already exist (0153, verified APPLIED), and at fire time no privilege check occurs at all.
-- So this migration cannot repeat 0150 — where a revoke on `evaluate_honors` killed Finish Workout
-- because `save_workout` calls it and SECURITY DEFINER exempts the CALLER, not the CALLEE. Nothing
-- CALLS these two. They have no legitimate caller by construction: a `returns trigger` function cannot
-- be invoked directly (Postgres raises 0A000) and PostgREST does not expose one.
--
-- Section 3 asserts the triggers survived anyway, because "cannot break" is a claim and this project
-- has a standing rule against shipping those unchecked.
--
-- ══ WHAT IS DELIBERATELY *NOT* DONE HERE ══
--
-- ⚠ NO BLANKET SWEEP. The obvious generalisation — revoke `anon` on everything the pre-flight lists —
--   is how 0147 broke Finish Workout: it revoked `evaluate_honors`, which nothing called from the
--   client and everything called from `save_workout`. A revoke is only safe when the caller is known.
--   So section 1 names two functions, and section 2 REPORTS on the rest instead of touching them.
--
-- `authenticated=X` is left in place on both. It confers nothing usable for the same reason `anon`'s
-- grant conferred nothing usable, and removing a grant that is not the defect widens the diff for no
-- gain.

begin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 · THE REVOKE
-- ══════════════════════════════════════════════════════════════════════════════

revoke execute on function public.push_tg_training_started()  from public;
revoke execute on function public.push_tg_training_started()  from anon;

revoke execute on function public.push_tg_training_finished() from public;
revoke execute on function public.push_tg_training_finished() from anon;


-- ══════════════════════════════════════════════════════════════════════════════
-- 2 · RESTORE 0147's INVARIANT — AND FAIL LOUDLY IF ANYTHING ELSE HAS DRIFTED
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Extension functions are excluded: pgcrypto, pg_net and friends are granted to PUBLIC by their own
-- install scripts, and revoking them breaks the extension rather than the app. `deptype = 'e'` is how
-- 0147 drew that line and this uses the same test so the two files cannot disagree.
--
-- This RAISES rather than revokes. If a third function has appeared since the pre-flight, the correct
-- response is to look at what calls it, not to have this migration guess — see the note above.

do $$
declare
  v_n    int;
  v_list text;
begin
  select count(*), string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
                              ', ' order by p.proname)
    into v_n, v_list
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
     and has_function_privilege('anon', p.oid, 'execute')
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e');

  if v_n > 0 then
    raise exception
      '0154: anon can still execute % project function(s): %. Do NOT add a blanket revoke — find what CALLS each one first (0147 revoked evaluate_honors and broke Finish Workout).',
      v_n, v_list;
  end if;
end $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 3 · THE TRIGGERS MUST HAVE SURVIVED
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Asserted, not assumed. If a revoke ever did detach a trigger, squad training alerts would go silent
-- with no error anywhere — the exact shape of failure this project keeps finding after the fact.

do $$
declare
  v_started  boolean;
  v_finished boolean;
begin
  select exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                  where c.relname = 'profiles' and t.tgname = 'push_training_started'
                    and not t.tgisinternal)
    into v_started;

  select exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                  where c.relname = 'workouts' and t.tgname = 'push_workout_saved'
                    and not t.tgisinternal)
    into v_finished;

  if not v_started or not v_finished then
    raise exception '0154: a 0153 trigger is gone — push_training_started=%, push_workout_saved=%',
      v_started, v_finished;
  end if;
end $$;

commit;


-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFY — returns ROWS. All four must read true / 0.
-- ══════════════════════════════════════════════════════════════════════════════

select
  (select count(*)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and has_function_privilege('anon', p.oid, 'execute')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'))
                                                              as anon_project_fns_expect_0,

  -- The PUBLIC entry is gone from both. Checked on the ACL text rather than through
  -- has_function_privilege, because `public` is not a role name those functions accept.
  --
  -- ⚠ ANCHORED, AND IT HAS TO BE. `like '%=X/%'` looks like the right test and is not: EVERY acl item
  --   has that shape — `postgres=X/postgres` contains `=X/` — so it would read "PUBLIC still granted"
  --   on a perfectly clean function. The PUBLIC item is the one with an EMPTY grantee, i.e. a `=`
  --   immediately after the opening brace or after a comma. That is what the regex pins.
  --
  -- ⚠ AND A NULL `proacl` MEANS DEFAULT PRIVILEGES, WHICH INCLUDE PUBLIC. Coalescing it to '' would
  --   report the grant as GONE on exactly the function that never had a revoke — the case this whole
  --   migration exists for. So null coalesces to a string that DOES match.
  -- `[{,]=` rather than `(^\{|,)=`: a brace only ever appears as the delimiter of an aclitem[] literal,
  -- so the bracket form is exactly as precise and carries no backslash-escape ambiguity to get wrong.
  (select bool_and(coalesce(p.proacl::text, '{=X/postgres}') !~ '[{,]=')
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('push_tg_training_started', 'push_tg_training_finished'))
                                                              as public_grant_gone_expect_t,

  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where not t.tgisinternal
      and ((c.relname = 'profiles' and t.tgname = 'push_training_started')
        or (c.relname = 'workouts' and t.tgname = 'push_workout_saved')))
                                                              as triggers_intact_expect_2,

  -- 0153's own gates, re-asserted: this file must not have disturbed them.
  (select bool_and(not has_function_privilege('anon', p.oid, 'execute'))
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('notification_events_for', 'set_squad_notify'))
                                                              as notif_fns_still_closed_expect_t;
