-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0174: `photo_import` gets its own credit weight
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 is guarded and self-cancelling, §2 raises, §3 is read-only.
--
-- ⚠ ORDER. Nothing else is pending — `0172` and `0173` were applied 2026-08-20 (§3 matched all six
-- predicted numbers). This is the ONLY migration awaiting application. It touches `coach_ai_config`
-- alone, which `0144` created, so it depends on nothing since.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- The new `program-photo-read` Edge Function transcribes a photographed training table into TSV, which
-- the existing spreadsheet importer then parses exactly as if it had been pasted. It meters itself
-- through `coach_ai_spend_credits('photo_import')`.
--
-- ⚠ THAT CALL RAISES `22023` TODAY. 0144's function refuses an action it has no weight for, on purpose:
--
--   "An unknown action must not cost zero and sail through. A capability that forgot to declare a
--    weight would otherwise be free and invisible, which is precisely the failure the credit model
--    exists to avoid."
--
-- So until this file runs, every photo import fails at the meter before a model is called. The feature
-- is inert, not broken — and it fails closed, which is the right direction for a metered capability.
--
-- ══ ⚠ WHY NOT JUST REUSE `photo_read` ══
--
-- `photo_read` (3 credits) is photo COACHING: a model looking at a person and reasoning, ~$0.075 a call
-- in the capability scope. This is a table transcription at roughly half that. Sharing one action would
-- save this file and cost the 60-day calibration run the only thing it exists to produce — a ledger
-- that cannot tell two capabilities apart cannot price either of them.
--
-- ══ ⚠ NOTHING STARTS CHARGING ANYBODY ══
--
-- `coach_ai_config.metering_only` is TRUE (0144's default) and this file does not touch it. Spend is
-- recorded and never refused. That is the plan's "run it uncapped for the 20 testers with metering on",
-- and it is why the honest description of this feature today is *metered, not charged*.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  sets the `action_credits` column default and adds `photo_import: 2` to the one live row
-- §2  asserts the key is present and numeric, and RAISES if not
-- §3  reports the full weight map and the meter's posture. Read-only.
--
-- No table is rewritten. No policy, grant or function changes — `coach_ai_spend_credits` reads this map
-- at call time and needs no redefinition to see a new key.
--
-- ⚠ §1 IS VERBATIM FROM `supabase/migrations/0174_coach_ai_photo_import.sql` — 3 of 3 statements
-- present (1 alter, 1 update, 1 comment), diffed on non-comment lines rather than read by eye.

begin;

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- §1 — THE STATEMENTS
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

alter table public.coach_ai_config
  alter column action_credits set default
    '{"message": 1, "program": 1, "day": 1, "photo_read": 3, "photo_import": 2, "form_check": 6}'::jsonb;

-- ⚠ MERGE ORDER IS LOAD-BEARING AND IT IS NOT THE OBVIOUS ONE. In `a || b`, b's keys win. The new
-- object is on the LEFT so the existing `action_credits` wins every collision — this adds the key when
-- it is missing and can never overwrite a weight hand-tuned in the SQL editor since. The `where` makes
-- a second run a no-op; the merge order makes it harmless even if the `where` were ever removed.
update public.coach_ai_config
   set action_credits = jsonb_build_object('photo_import', 2) || action_credits,
       updated_at = now()
 where not (action_credits ? 'photo_import');

comment on column public.coach_ai_config.action_credits is
  'Per-action credit weights. message/program/day 1 · photo_import 2 · photo_read 3 · form_check 6. '
  'An action absent from this map raises 22023 in coach_ai_spend_credits rather than costing zero.';

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- §2 — THE ASSERTION
--
-- A tidy green having done nothing is the failure this section exists to catch. The key must be
-- present AND numeric: `action_credits ->> 'photo_import'` is cast to int inside
-- `coach_ai_spend_credits`, so a string value would land here clean and raise at call time instead.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_raw   jsonb;
  v_value jsonb;
begin
  select action_credits into v_raw from public.coach_ai_config where id;

  if v_raw is null then
    raise exception '0174 FAILED: coach_ai_config has no row. Apply 0144 first.';
  end if;

  v_value := v_raw -> 'photo_import';

  if v_value is null then
    raise exception '0174 FAILED: action_credits has no photo_import key. Map is now: %', v_raw;
  end if;

  if jsonb_typeof(v_value) <> 'number' then
    raise exception '0174 FAILED: photo_import is %, not a number. Value: %',
      jsonb_typeof(v_value), v_value;
  end if;

  -- The four that were already there must survive. A merge that dropped one would still pass every
  -- check above, and the first symptom would be a working capability raising 22023 in production.
  if not (v_raw ? 'message' and v_raw ? 'program' and v_raw ? 'day'
          and v_raw ? 'photo_read' and v_raw ? 'form_check') then
    raise exception '0174 FAILED: an existing action weight was lost. Map is now: %', v_raw;
  end if;

  raise notice '0174 OK: photo_import = %, all prior weights intact.', v_value;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- §3 — THE REPORT (read-only)
--
-- ══ WHAT THIS SHOULD SAY, PREDICTED BEFORE RUNNING ══
--
--   · weights            — six rows: day 1, form_check 6, message 1, photo_import 2, photo_read 3,
--                          program 1. Exactly one more row than before this file.
--   · posture            — metering_only = true, credits_per_period = 150.
--   · photo_import_spend — **0**. The Edge Function is not deployed at the time this is pasted, so
--                          nothing can have called it yet. ⚠ A NON-ZERO COUNT HERE MEANS SOMETHING IS
--                          ALREADY SPENDING under this action — investigate before deploying.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

select key as action, value::int as credits
  from public.coach_ai_config c, jsonb_each(c.action_credits)
 where c.id
 order by key;

select credits_per_period,
       metering_only,
       usd_per_mtok_input,
       usd_per_mtok_output,
       updated_at
  from public.coach_ai_config
 where id;

select count(*) as photo_import_spend
  from public.coach_ai_spend
 where action = 'photo_import';
