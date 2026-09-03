-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0190: the app has not been able to say anybody is training since 0187
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice.
--
-- ══ WHAT IT FIXES ══
--
-- `verify-0185-0189.sql` reported Rachelle's last announcement as **322 hours ago**. Every settings gate
-- is now open (0189) and she still could not appear, because the two symptoms never shared a cause:
--
--   · THE NOTIFICATION was gated off by two switches that default false. 0189 opened them.
--   · THE ANNOUNCEMENT ITSELF has been raising 42501 on every phone since 0187 landed.
--
-- `set_training_status` is SECURITY INVOKER, so it runs as `authenticated`. 0086 only ASSIGNED the
-- column; 0187 made the body READ it, to keep one stamp per session; and 0149 had already revoked
-- `authenticated`'s SELECT on `profiles.training_since`, deliberately. Reading a column in an expression
-- requires SELECT on it. So the call has failed for everyone, for thirteen days — silently, because
-- `presence-live.ts` catches and discards the error on purpose so presence can never block a workout.
--
-- ⛔ THIS IS 0161'S BUG ON A SECOND FUNCTION. That one fixed `squads_set_invite_code()` — an invoker
-- trigger reading the `invite_code` column 0149 hid — by making it definer. The note it left says it
-- outright: *"'Internal' describes where a function is CALLED FROM. It says nothing about what it may
-- READ."* 0187 reintroduced the shape five migrations later.
--
-- ══ ⚠ WHY §3 DOES NOT EXERCISE A REAL WRITE ══
--
-- The obvious proof — impersonate an athlete, call the function, watch the column change — is the one
-- thing this file must not do. `push_training_started` is an `after update of training_since` trigger
-- (0153). A probe write would enqueue a REAL push to that athlete's squad, and rolling the row back
-- fires the trigger a second time. A verification step is not allowed to notify five people.
--
-- So §3 asserts the PRIVILEGE SHAPE instead, which is what actually decides the outcome: the function is
-- definer, `authenticated` may execute it, and the column is still hidden — the last one being the proof
-- that an invoker version could not possibly work.
--
-- ⛔ IT SENDS NOTHING RETROACTIVELY. Thirteen days of unannounced sessions stay unannounced. The first
-- workout STARTED AFTER this lands is the first one anybody hears about.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

begin;

-- ═════════════════════════════════════════════════════════════════════════════
-- §1 · THE MIGRATION — verbatim from 0190_training_status_definer.sql
-- ═════════════════════════════════════════════════════════════════════════════
--
-- ⚠ THE BODY IS COPIED FROM 0187, NOT REWRITTEN. Rebuilding a function from memory is how
-- `notification_events_for` silently lost a shipped feature four separate times. The only edit is the
-- security clause.

create or replace function public.set_training_status(p_active boolean, p_label text default null)
returns void
language plpgsql
security definer                      -- ← 0187 had `security invoker`. That is the whole fix.
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.profiles
     set training_since = case
           when not p_active then null
           -- Already training, inside the four-hour ceiling every reader of this column applies: the same
           -- session saying so again. Keep the original stamp, so the outbox key does not change and the
           -- squad is not told twice.
           when profiles.training_since is not null
            and profiles.training_since > now() - interval '4 hours'
             then profiles.training_since
           else now()
         end,
         -- The label always follows the current call: the stamp says when, the label says what.
         training_label = case when p_active then nullif(btrim(coalesce(p_label, '')), '') else null end
   where id = auth.uid();
end;
$$;

revoke all on function public.set_training_status(boolean, text) from public;
revoke all on function public.set_training_status(boolean, text) from anon;
grant execute on function public.set_training_status(boolean, text) to authenticated;

comment on function public.set_training_status(boolean, text) is
  'Announce that the caller started or ended a workout. Writes profiles.training_since/training_label for auth.uid() only. ⚠ SECURITY DEFINER SINCE 0190 AND IT MUST STAY THAT WAY: 0187 made the body READ training_since (to keep one stamp per session) and 0149 revoked authenticated''s SELECT on that column, so as an invoker every call raised 42501 and the client swallowed it — nobody could announce for thirteen days. Same shape as the 0161 fix. Definer is safe because the function takes no athlete argument, writes only where id = auth.uid(), and returns void.';

-- ═════════════════════════════════════════════════════════════════════════════
-- §2 · THE ASSERTION — refuse to commit a no-op
-- ═════════════════════════════════════════════════════════════════════════════
--
-- A migration that returns a tidy green while having changed nothing is the failure this section exists
-- to prevent. All three must hold or nothing commits.

do $$
declare
  v_definer  boolean;
  v_exec     boolean;
  v_sigs     int;
begin
  select p.prosecdef into v_definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'set_training_status';

  if v_definer is null then
    raise exception '0190: set_training_status does not exist — 0086 was never applied?';
  end if;
  if not v_definer then
    raise exception '0190: set_training_status is STILL SECURITY INVOKER — the replace did not take';
  end if;

  select count(*) into v_sigs
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'set_training_status';
  if v_sigs <> 1 then
    raise exception '0190: expected exactly 1 set_training_status, found % — an old signature survives', v_sigs;
  end if;

  select has_function_privilege('authenticated', 'public.set_training_status(boolean, text)', 'execute')
    into v_exec;
  if not v_exec then
    raise exception '0190: authenticated cannot EXECUTE set_training_status — the grant did not take';
  end if;
end;
$$;

commit;

-- ═════════════════════════════════════════════════════════════════════════════
-- §3 · WHAT IS NOW TRUE. Read-only, ONE result set.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- ⚠ ONE ROW SET ON PURPOSE — the Supabase editor shows only the LAST statement's output, which is how
-- two security checks once ran completely unread.
--
-- ⚠ PREDICTION, written before running:
--     is_definer                 true   ← the fix
--     authed_can_execute         true
--     column_still_hidden        true   ← the reason definer is REQUIRED. If this ever reads false,
--                                         somebody re-granted a column 0149 hid on purpose.
--     announcing_now             0      ← nobody is mid-workout at this instant. NOT a failure.
--     announced_last_24h         0      ← thirteen days of silence; this is the number to re-read
--                                         AFTER somebody trains. It becoming ≥ 1 is the whole proof.

select
  (select p.prosecdef
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_training_status')                     as is_definer,
  has_function_privilege('authenticated',
    'public.set_training_status(boolean, text)', 'execute')                               as authed_can_execute,
  not has_column_privilege('authenticated', 'public.profiles', 'training_since', 'select') as column_still_hidden,
  (select count(*) from public.profiles
    where training_since > now() - interval '4 hours')                                    as announcing_now,
  (select count(*) from public.profiles
    where training_since > now() - interval '24 hours')                                   as announced_last_24h,
  (select coalesce(to_char(max(training_since), 'YYYY-MM-DD HH24:MI'), 'never')
     from public.profiles)                                                                as most_recent_announcement;
