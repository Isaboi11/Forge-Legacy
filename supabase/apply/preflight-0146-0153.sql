-- Forge Legacy — PRE-FLIGHT: what is actually applied, 0144 → 0153
--
-- Read-only. Creates nothing, changes nothing. Paste it, run it, and read one row per check.
--
-- ⚠ WHY A SECOND FILE. `preflight-what-is-applied.sql` stops at 0145 and has not been extended since the
--   2026-08-12 launch audit. Everything that shipped after it — the audit's own fixes, account deletion,
--   the honors grant, floors, trained-today, the weekly-review window and squad training alerts — had no
--   catalogue check at all, which is the same blind spot that let "applied" and "not applied" coexist in
--   the dashboard for eight migrations at once.
--
-- ⚠ EVERY CHECK IS A CATALOGUE LOOKUP, AND THAT IS NOT A STYLE CHOICE. A check may never SELECT FROM the
--   object it is checking for: Postgres resolves relation names at PARSE time, so a missing table raises
--   42P01 and takes the WHOLE report down — precisely the case this file exists to report on. Function
--   privilege checks go through a `pg_proc` join rather than `has_function_privilege('public.f()', …)`
--   for the same reason: the literal form ERRORS on a function that does not exist, the join returns
--   false.
--
-- ⚠ AND A BODY CHECK BEATS AN EXISTENCE CHECK for anything rebuilt with `create or replace`. 0151, 0152
--   and 0153 all replace functions that already existed, so "the function is there" proves nothing —
--   the question is whether the NEW text is in it.

with checks as (

  -- ── 0144 · deliberately unapplied ──────────────────────────────────────────
  -- PO decision 2026-08-12: no AI spend before full release, and no AI for testers. APPLIED on this row
  -- is a mistake to undo, not a green light.
  select '0144 · coach_ai_config — ⚠ MUST READ MISSING' as grp,
         to_regclass('public.coach_ai_config') is not null as ok

  -- ── 0145 · entitlement ─────────────────────────────────────────────────────
  -- The trigger, not the tables: a truncated paste leaves the tables standing and the program cap
  -- silently never fires.
  union all
  select '0145 · programs_cap_guard_trg on programs',
         exists (select 1 from pg_trigger where tgname = 'programs_cap_guard_trg' and not tgisinternal)

  -- ── 0146 · the launch audit ────────────────────────────────────────────────
  union all
  select '0146 · honor_metrics closed to anon',
         not exists (
           select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'honor_metrics'
              and has_function_privilege('anon', p.oid, 'execute')
         )
  union all
  select '0146 · squad photo storage is owner-scoped',
         exists (select 1 from pg_policies
                  where schemaname = 'storage' and tablename = 'objects'
                    and policyname = 'squad_photos_owner_delete')

  -- ── 0147 · anon cannot execute project functions ───────────────────────────
  -- Extension functions are excluded: PostGIS/pgcrypto and friends are granted to PUBLIC by their own
  -- install scripts and revoking them breaks the extension, not the app.
  union all
  select '0147 · anon-executable project functions = 0',
         not exists (
           select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prokind = 'f'
              and has_function_privilege('anon', p.oid, 'execute')
              and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
         )

  -- ── 0148 · account deletion (App Store 5.1.1(v)) ───────────────────────────
  union all
  select '0148 · delete_my_account, authenticated only',
         exists (
           select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'delete_my_account'
              and has_function_privilege('authenticated', p.oid, 'execute')
              and not has_function_privilege('anon', p.oid, 'execute')
         )

  -- ── 0149 · two columns stop being world-readable ───────────────────────────
  union all
  select '0149 · squads.invite_code hidden from authenticated',
         not has_column_privilege('authenticated', 'public.squads', 'invite_code', 'select')
  union all
  select '0149 · profiles.training_since hidden from anon',
         not has_column_privilege('anon', 'public.profiles', 'training_since', 'select')

  -- ── 0150 · the grant that unbroke Finish Workout ───────────────────────────
  -- ⚠ SECURITY DEFINER exempts the CALLER, not the CALLEE. `save_workout` calls `evaluate_honors`, and
  --   0147's sweep revoked it — every gate stayed green while saving a workout was permission denied.
  union all
  select '0150 · evaluate_honors(text) → authenticated',
         exists (
           select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'evaluate_honors'
              and has_function_privilege('authenticated', p.oid, 'execute')
              and not has_function_privilege('anon', p.oid, 'execute')
         )

  -- ── 0151 · the stair climber counts floors ─────────────────────────────────
  -- ⚠ THE CLIENT ALREADY SELECTS `floors`. PostgREST answers a missing column with 42703 and the whole
  --   query fails, which `if (error) return null` turns into "there is nothing to continue".
  union all
  select '0151 · workout_sets.floors column',
         exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'workout_sets'
                    and column_name = 'floors')
  union all
  select '0151 · save_workout writes floors',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'save_workout'
                    and pg_get_functiondef(p.oid) like '%(v_set->>''floors'')::int%')
  union all
  select '0151 · continue_workout writes floors',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'continue_workout'
                    and pg_get_functiondef(p.oid) like '%(v_set->>''floors'')::int%')
  union all
  -- Any set-writing overload left behind by an older signature would drop the floor count silently.
  select '0151 · no stale set-writing overload',
         not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'public'
                        and p.proname in ('save_workout', 'continue_workout')
                        and pg_get_functiondef(p.oid) like '%insert into%workout_sets%'
                        and pg_get_functiondef(p.oid) not like '%floors%')

  -- ── 0152 · "trained today" counts training ─────────────────────────────────
  -- ⚠ NOT `not like '%interval ''24 hours''%'` — the migration's own verify used that and reads a FALSE
  --   NEGATIVE on squad_preview, which carries a SECOND 24-hour window (the per-member `checked_in`
  --   flag, 0055:224-228) that 0152 never targeted and does not need to.
  union all
  select '0152 · discover_squads uses squad_trained_since',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'discover_squads'
                    and pg_get_functiondef(p.oid) like '%squad_trained_since%')
  union all
  select '0152 · squad_preview uses squad_trained_since',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'squad_preview'
                    and pg_get_functiondef(p.oid) like '%squad_trained_since%')
  union all
  select '0152 · squad_preview old count is gone',
         not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'public' and p.proname = 'squad_preview'
                        and pg_get_functiondef(p.oid) like '%count(distinct c.user_id)::int into v_today%')

  -- ── 0152 · the weekly review card expires ──────────────────────────────────
  -- A missing timestamp reads as OPEN by design, so an unapplied 0152 does not make every athlete's
  -- review vanish — it just never retires. That is why this needs a check rather than a bug report.
  union all
  select '0152 · ensure_weekly_review returns created_at',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'ensure_weekly_review'
                    and pg_get_functiondef(p.oid) like '%created_at%')

  -- ── 0153 · squad training notifications ────────────────────────────────────
  union all
  select '0153 · squads.training_alerts (leader switch)',
         exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'squads'
                    and column_name = 'training_alerts')
  union all
  select '0153 · squad_members.notify_start + notify_finish',
         (select count(*) from information_schema.columns
           where table_schema = 'public' and table_name = 'squad_members'
             and column_name in ('notify_start', 'notify_finish')) = 2
  union all
  -- ⚠ THE BRANCH, NOT THE FUNCTION. `notification_events_for` has existed since 0135 and has been
  --   rebuilt from a partial read four times (0088, 0092, 0106, 0122), each time silently deleting a
  --   shipped feature. Its existence proves nothing; branch 15 is the thing 0153 adds.
  select '0153 · notification_events_for has branch 15/16',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'notification_events_for'
                    and pg_get_functiondef(p.oid) like '%squad_training_started%')
  union all
  select '0153 · set_squad_notify → authenticated only',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'set_squad_notify'
                    and has_function_privilege('authenticated', p.oid, 'execute')
                    and not has_function_privilege('anon', p.oid, 'execute'))
  union all
  -- The first trigger this project has ever put on `workouts`. A function body without its trigger is
  -- the truncated-paste failure mode, and it is silent.
  select '0153 · push_workout_saved trigger on workouts',
         exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                  where c.relname = 'workouts' and t.tgname = 'push_workout_saved'
                    and not t.tgisinternal)
  union all
  select '0153 · push_training_started trigger on profiles',
         exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                  where c.relname = 'profiles' and t.tgname = 'push_training_started'
                    and not t.tgisinternal)
)
select grp as "migration / check",
       case when ok then '✅ APPLIED' else '❌ MISSING' end as "state"
  from checks
 order by grp;

-- ── WHAT THIS FILE CANNOT ANSWER ─────────────────────────────────────────────
--
-- Structural checks prove the TEXT is installed. Three things still need the app:
--
--   1. 0151 — log a stair block with a floor count, finish it, then:
--        select distance, distance_unit, floors from public.workout_sets where floors is not null;
--      `distance` must be NULL on every row. A number there is the mileage bug this migration exists
--      to stop.
--
--   2. 0153 — nothing fires until a leader opts in: all three switches default false. Flip
--      squads.training_alerts, flip a member's notify_start, and have a squad-mate begin a session.
--
--   3. 0152 — the weekly review card should disappear 24h after it was written, and
--      /weekly-review/[week] must still open it. The row is never deleted.
