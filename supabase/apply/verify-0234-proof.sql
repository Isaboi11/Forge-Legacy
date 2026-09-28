-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY 0234 — the behaviour proof (optional; run AFTER pending-0234.sql)
--
-- Paste the whole thing and run it. NOTHING IS KEPT: the block does its work inside one transaction and
-- then deliberately raises, which rolls every write back. So the editor shows the answer as an ERROR
-- line — that is expected. Read the message:
--
--   0234 PROOF PASSED … → done. Send me the line.
--   0234 PROOF FAILED … → send me the line; the numbers say which check broke.
--
-- What it does, as one real athlete (one in a squad with training alerts on, if there is one):
--   1. imports one made-up Apple Health run that ended 2½ hours ago — inside branch 16's 24-hour window,
--      which is exactly the case the squad gate exists for;
--   2. imports the SAME run again — the second call must insert nothing;
--   3. checks saved_at is the run's real end (not now), that no squad push row was queued, and that no
--      squad-mate's inbox shows "finished a workout" for it.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_uid     uuid;
  v_ext     text := 'verify-0234-' || gen_random_uuid()::text;
  v_end     timestamptz := date_trunc('second', now() - interval '150 minutes');
  v_rows    jsonb;
  r1        jsonb;
  r2        jsonb;
  v_saved   timestamptz;
  v_copies  int;
  v_push0   int;
  v_push1   int;
  v_inbox   int := 0;
  v_mate    record;
  v_ok      boolean;
begin
  select sm.user_id into v_uid
    from public.squad_members sm
    join public.squads s on s.id = sm.squad_id and s.training_alerts
   limit 1;
  if v_uid is null then
    select p.id into v_uid from public.profiles p limit 1;
  end if;

  -- Act as that athlete for auth.uid() (both claim forms Supabase reads). Local to this transaction.
  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  select count(*) into v_push0 from public.push_outbox o where o.actor_id = v_uid and o.kind = 'squad_training_finished';

  v_rows := jsonb_build_array(jsonb_build_object(
    'external_id',   v_ext,
    'activity_type', 'running',
    'workout_name',  'Run',
    'started_at',    to_char((v_end - interval '30 minutes') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'ended_at',      to_char(v_end at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'duration_sec',  1800,
    'distance',      3.107,
    'distance_unit', 'mi',
    'indoor',        false,
    'source_label',  'Garmin Connect'
  ));

  r1 := public.import_external_workouts('apple_health', v_rows);
  r2 := public.import_external_workouts('apple_health', v_rows);

  select count(*), max(w.saved_at) into v_copies, v_saved
    from public.workouts w
   where w.athlete_id = v_uid and w.source = 'apple_health' and w.external_id = v_ext;

  select count(*) into v_push1 from public.push_outbox o where o.actor_id = v_uid and o.kind = 'squad_training_finished';

  for v_mate in
    select distinct m.user_id
      from public.squad_members mine
      join public.squad_members m on m.squad_id = mine.squad_id and m.user_id <> v_uid
     where mine.user_id = v_uid
  loop
    select v_inbox + count(*) into v_inbox
      from public.notification_events_for(v_mate.user_id) e
     where e.kind = 'squad_training_finished' and e.actor_id = v_uid and e.at = v_saved;
  end loop;

  v_ok := (r1->>'inserted')::int = 1
      and (r2->>'inserted')::int = 0
      and (r2->>'skipped')::int = 1
      and v_copies = 1
      and v_saved = v_end
      and v_push1 = v_push0
      and v_inbox = 0
      and exists (select 1 from public.external_activity_ledger l
                   where l.athlete_id = v_uid and l.external_id = v_ext and l.outcome = 'imported');

  raise exception '0234 PROOF % (rolled back, nothing kept) · first call % · second call % · copies in workouts % (want 1) · saved_at is the real end: % · squad push rows added % (want 0) · squad-mate inbox rows % (want 0)',
    case when v_ok then 'PASSED' else 'FAILED' end,
    r1, r2, v_copies, (v_saved = v_end), v_push1 - v_push0, v_inbox;
end $$;
