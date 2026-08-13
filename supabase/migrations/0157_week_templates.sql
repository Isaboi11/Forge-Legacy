-- Forge Legacy — 0157: a week you can build once and run again
--
-- ⚠ RUN AFTER 0155 AND 0156. This file references the 'finished' state only in comments, but
--   `programs.source_week_template_id` is what 0158's cap guard keys on, and the whole feature is
--   incoherent without 0156's credit rule.
--
-- ══ WHY A SEPARATE TABLE, AND WHY ITS CONTENTS ARE A `ProgramStructure` ══
--
-- A tester asked for a template for a full week. The existing `workout_templates` (0091) holds exactly ONE
-- session — a flat list of rows — so a week is genuinely a new object.
--
-- But it is not a new SHAPE. `week_templates.structure` is a `ProgramStructure` pinned to one week, which
-- means every piece of program machinery already works on it unchanged: `program_slots`,
-- `program_total_sessions`, `scheduleSlots`, `nextOpenSlot`, the Day Builder, the "drop a saved workout
-- template into this day" sheet, and the Picker round-trip. Starting a week template is literally
-- `createProgram(structure)` + `start_program(id)` — no converter, no second scheduler, no new way for a
-- session to be cued.
--
-- `src/domain/program/template-day-core.ts`'s header is the argument for this in miniature: every shape
-- conversion is a place to lose a field, and it names the fields that were lost the last time
-- (`targetDurationSec`, cardio blocks, `per`). A bespoke week shape would have needed its own converter
-- and its own list of things it drops.
--
-- Depends on 0013 (programs), 0091 (workout_templates, for the shape of this one), 0119 (program_slots),
-- 0155/0156. Idempotent.

begin;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. THE TABLE
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Modelled on 0091's `workout_templates`: owner-scoped, one jsonb payload, no derived counters.
create table if not exists public.week_templates (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  -- 40, matching the Program Builder's own `maxLength` — the same field authors this name.
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  structure  jsonb not null,

  -- ⚠ THE PIN IS A CONSTRAINT, NOT A CONVENTION.
  --
  -- A jsonb column will hold `{"weeks": 8}` perfectly happily, and a week template that is secretly eight
  -- weeks long would start as an eight-week program, earn rank credit, and be indistinguishable from a
  -- correct row until someone read the JSON.
  --
  -- Compared as JSONB, never cast: `to_jsonb(1)` matches both `1` and `1.0` numerically and does NOT match
  -- the string `"1"`, and none of it can raise the way `(structure->>'weeks')::int` can.
  constraint week_templates_one_week check (
    structure->'weeks' = to_jsonb(1)
    and coalesce(structure->'vary', 'false'::jsonb) <> 'true'::jsonb
  ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists week_templates_athlete
  on public.week_templates (athlete_id, created_at desc);

alter table public.week_templates enable row level security;

drop policy if exists week_templates_owner_all on public.week_templates;
create policy week_templates_owner_all on public.week_templates
  for all
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

comment on table public.week_templates is
  'A one-week training plan the athlete can save and run repeatedly. `structure` is a ProgramStructure
   pinned to weeks:1 / vary:false by week_templates_one_week, so starting one is createProgram() +
   start_program() and every scheduler, slot walker and builder surface works on it unchanged. Unlike a
   program this is NOT a record of anything — it is a shape. The records are the programs it produces.
   Migration 0157.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. PROVENANCE — which template a program came from
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ DELIBERATELY NOT `source_definition_id`, and the reasons are load-bearing rather than stylistic:
--
--   · `programs_one_live_per_source` (0104) is a UNIQUE index on it — you could then only have one live
--     run of a given week, when running the same week repeatedly is the entire feature;
--   · `adoptCatalogProgram` and `runProgramAgain` both key off it to find a catalog plan;
--   · `getProgramDefinition(sourceDefId)` would be handed a uuid it cannot resolve and would render a
--     program detail screen with no definition behind it.
--
-- `on delete set null`: deleting the template must never delete or orphan the PROGRAMS it produced. Those
-- are permanent records and outlive the shape they came from (Never Charge For History).
alter table public.programs
  add column if not exists source_week_template_id uuid
    references public.week_templates(id) on delete set null;

create index if not exists programs_source_week_template
  on public.programs (source_week_template_id)
  where source_week_template_id is not null;

comment on column public.programs.source_week_template_id is
  'The week template this program was started from, or null. Read by the entitlement guard so starting a
   template you already paid for does not spend a second allowance (MA4-D4). NOT source_definition_id —
   that column carries a unique index that would permit only one live run of a given week. Migration 0157.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. SELF-CHECK — the pin actually refuses
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- A CHECK constraint that does not check is worse than none: it reads as a guarantee in every file that
-- cites it. Proven at apply time against a real insert, rolled back.
do $$
declare
  v_uid uuid;
  v_ok  boolean;
begin
  select id into v_uid from public.profiles limit 1;
  if v_uid is null then
    raise notice '0157: no profiles yet — pin self-check skipped (constraint still installed).';
    return;
  end if;

  -- must REFUSE: eight weeks
  begin
    insert into public.week_templates (athlete_id, name, structure)
    values (v_uid, '0157 selfcheck', '{"weeks":8,"daysPerWeek":3,"vary":false,"days":[]}'::jsonb);
    raise exception '0157 SELF-CHECK FAILED: an 8-week structure was accepted as a week template';
  exception when check_violation then null;
  end;

  -- must REFUSE: one week, but varying (a per-week plan inside a single week is incoherent)
  begin
    insert into public.week_templates (athlete_id, name, structure)
    values (v_uid, '0157 selfcheck', '{"weeks":1,"daysPerWeek":3,"vary":true,"days":[]}'::jsonb);
    raise exception '0157 SELF-CHECK FAILED: vary:true was accepted';
  exception when check_violation then null;
  end;

  -- must REFUSE: the STRING "1" — the near-miss the jsonb comparison exists to catch
  begin
    insert into public.week_templates (athlete_id, name, structure)
    values (v_uid, '0157 selfcheck', '{"weeks":"1","daysPerWeek":3,"vary":false,"days":[]}'::jsonb);
    raise exception '0157 SELF-CHECK FAILED: the string "1" was accepted as a week count';
  exception when check_violation then null;
  end;

  -- must ACCEPT
  insert into public.week_templates (athlete_id, name, structure)
  values (v_uid, '0157 selfcheck', '{"weeks":1,"daysPerWeek":3,"vary":false,"days":[]}'::jsonb);
  delete from public.week_templates where name = '0157 selfcheck';

  raise notice '0157: week_templates_one_week refuses 8 weeks, vary:true and "1", and accepts a real week.';
end $$;

commit;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY — read-only.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
--   select count(*) as templates from public.week_templates;
--
--   -- Every row is genuinely one week. Expect zero rows back.
--   select id, name, structure->'weeks' as weeks
--     from public.week_templates
--    where structure->'weeks' <> to_jsonb(1);
--
--   -- RLS is on and owner-scoped. Expect rowsecurity = true, exactly one policy.
--   select relrowsecurity from pg_class where relname = 'week_templates';
--   select polname, polcmd from pg_policy
--    where polrelid = 'public.week_templates'::regclass;
--
--   -- The provenance column exists and is nullable.
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_name = 'programs' and column_name = 'source_week_template_id';
--
-- ── THE BUTTON PRESS THIS FILE CANNOT MAKE ──
--
--   In the app: build a week, save it, start it. Then assert the two halves are linked and that the
--   program is a real, runnable one-week program:
--
--     select p.name, p.state, p.structure->'weeks' as weeks, p.source_week_template_id,
--            public.program_total_sessions(p.structure) as sessions,
--            public.program_earns_credit(p.structure)  as counts_for_rank
--       from public.programs p
--      where p.source_week_template_id is not null
--      order by p.created_at desc limit 1;
--
--   Expected: weeks 1 · sessions = the days you built · counts_for_rank FALSE · a non-null template id.
