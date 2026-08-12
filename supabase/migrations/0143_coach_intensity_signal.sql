-- Forge Legacy — 0143: what the athlete does with what Holt says
--
-- ══ WHAT THIS IS ══
--
-- PO: *"Coach Holt would need to learn from how the person is working out. If they're jumping up in
-- weight. If they're staying put. If they're going down in weight. He can ask if they like the feedback
-- every once in a while."*
--
-- Governed by `Coach-Adaptive-Learning-Amendment-001` (CL-D1…CL-D11) and `-002` (the intensity dial).
--
-- ══ ⚠ THE SIGNAL IS ALREADY COMPUTED — IT IS JUST NEVER KEPT ══
--
-- `progressionFor()` classifies every lift in every session as `add_weight | add_reps | hold |
-- back_off | no_history`, which is exactly the PO's three states plus the two honest edges. The live
-- logger builds that map on every session and throws it away when the screen unmounts.
--
-- ⚠ AND IT CANNOT BE RECOMPUTED LATER. The classification depends on the PRESCRIPTION in force at the
-- time — sets, reps, and the top of the range — and none of that is stored on a saved workout. A set
-- of 8 reps means "topped the range" against 3×8 and "short of it" against 3×12, and the saved row
-- cannot tell the two apart. So the decision has to be snapshotted at the moment it is made, exactly
-- like `partners` and the substitution record before it.
--
-- ══ WHY A TABLE AND NOT A COLUMN ══
--
-- One row per LIFT per session, not per session — the athlete who adds weight on squats and backs off
-- on presses in the same hour is the interesting case, and a per-session summary would average them
-- into "hold" and describe nobody.
--
-- ══ WHAT THIS DOES NOT DO ══
--
-- ⚠ NOTHING READS IT YET, AND THAT IS CL-D11. Capture ships before consumption, because nothing can
-- learn from data that was never written and the table's value starts accruing the day it exists
-- rather than the day the engine reads it. When it is read, CL-D3 binds: two occurrences before
-- anything moves, a shown sentence, and a level RAISE must be accepted rather than applied.
--
-- ⚠ AND IT IS NOT ANALYTICS. This is the athlete's own training, readable only by them, and it never
-- leaves their account — `P-6` and CL-D7 both. It is deliberately not in `app_events`, which is
-- opt-out product telemetry with a different purpose, a different consent and a different retention.
--
-- Idempotent. Depends on 0001 (workouts). RUN AFTER 0142.
--
-- ⚠ THIS WAS 0142 AND WAS RENUMBERED. A parallel workstream committed its own 0142
-- (`0142_checkin_orphan_ledger.sql`) while this was being written. Two files claiming one number apply
-- in an undefined order, and the numbering IS the dependency graph here — there is no CLI keeping a
-- history table, so the filename is the only thing saying what runs when.

begin;

create table if not exists public.coach_intensity_signal (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  -- Which lift in the session, by its position — the same key `record_substitutions` uses (0138).
  position    int  not null,
  observed_at timestamptz not null default now(),
  -- `progressionFor().action`. Constrained so a client that invents a sixth state is rejected here
  -- rather than quietly widening what the reader has to handle.
  action      text not null check (action in ('add_weight', 'add_reps', 'hold', 'back_off', 'no_history')),
  catalog_key text,
  pattern     text,
  unique (workout_id, position)
);

create index if not exists coach_intensity_signal_athlete
  on public.coach_intensity_signal (athlete_id, observed_at desc);

alter table public.coach_intensity_signal enable row level security;

-- Yours and nobody else's. CL-D7: learned state is never readable by another athlete, never in a squad
-- surface, never in /admin.
drop policy if exists coach_intensity_signal_own on public.coach_intensity_signal;
create policy coach_intensity_signal_own on public.coach_intensity_signal
  for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

comment on table public.coach_intensity_signal is
  'CL-D1/CL-D11. One row per lift per session: what progressionFor decided at the time. Snapshotted because the decision depends on the prescription in force, which a saved workout does not store — 8 reps is "topped the range" against 3x8 and "short" against 3x12. Read by nothing yet, deliberately.';

-- ── The writer ───────────────────────────────────────────────────────────────────────────────────
--
-- Post-commit, at the same call site as `record_substitutions`, and for the same stated reason: this is
-- a mark ON a session rather than part of one, and it must never be able to fail a save that worked.
create or replace function public.record_intensity_signals(p_workout uuid, p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int := 0;
begin
  if p_workout is null or p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return 0;
  end if;

  -- ⚠ OWNERSHIP FROM THE WORKOUT. Same rule as `record_substitutions`: the child rows carry no athlete
  -- of their own, so an unguarded definer function here would let anybody write against anybody.
  if not exists (select 1 from public.workouts w where w.id = p_workout and w.athlete_id = auth.uid()) then
    raise exception 'not your workout' using errcode = '42501';
  end if;

  insert into public.coach_intensity_signal (athlete_id, workout_id, position, action, catalog_key, pattern)
  select auth.uid(),
         p_workout,
         (r->>'position')::int,
         r->>'action',
         nullif(r->>'catalog_key', ''),
         nullif(r->>'pattern', '')
    from jsonb_array_elements(p_rows) r
   where r->>'action' in ('add_weight', 'add_reps', 'hold', 'back_off', 'no_history')
  on conflict (workout_id, position) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.record_intensity_signals(uuid, jsonb) from public;
grant  execute on function public.record_intensity_signals(uuid, jsonb) to authenticated;

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
do $$
begin
  if to_regclass('public.coach_intensity_signal') is null then
    raise exception '0143 self-check: the table was not created';
  end if;
  if to_regprocedure('public.record_intensity_signals(uuid, jsonb)') is null then
    raise exception '0143 self-check: record_intensity_signals was not created';
  end if;
  raise notice '0143: intensity capture ready. Nothing reads it yet — that is CL-D11.';
end;
$$;
