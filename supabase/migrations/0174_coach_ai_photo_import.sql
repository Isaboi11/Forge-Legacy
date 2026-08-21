-- 0174 — `photo_import` gets its own credit weight
--
-- Idempotent. Depends on 0144 (coach_ai_config). RUN AFTER 0173.
--
-- ══ WHY THIS EXISTS ══
--
-- `program-photo-read` transcribes a photographed training table into TSV for the existing importer.
-- `coach_ai_spend_credits(p_action)` reads its weight out of `coach_ai_config.action_credits`, and that
-- function RAISES `22023` on an action it does not know:
--
--   "An unknown action must not cost zero and sail through. A capability that forgot to declare a
--    weight would otherwise be free and invisible, which is precisely the failure the credit model
--    exists to avoid."
--
-- So until this runs, every photo import fails at the meter before the model is ever called. That is
-- the designed behaviour, not a bug to work around in the function.
--
-- ══ ⚠ ITS OWN ACTION RATHER THAN REUSING `photo_read` ══
--
-- `photo_read` (3) is photo COACHING — a model looking at a person and reasoning about what it sees,
-- costed at ~$0.075 in the capability scope. This is a transcription of a table: one uncached image,
-- a cached system prompt, and TSV out, at roughly half that. Two capabilities sharing one action would
-- save this file and cost the 60-day run the only thing it is for — a ledger that cannot tell them
-- apart cannot price either.
--
-- **2 credits**, set here and nowhere else. MA3-D16: every cap and allowance is server-side config,
-- never a constant in `src/`.
--
-- ⚠ `metering_only` IS ALREADY TRUE (0144's default) AND THIS FILE DOES NOT CHANGE IT. Spend is
-- recorded and never refused, which is the plan's uncapped metered-tester posture. Flipping it is
-- Phase F's job, and when it happens photo import starts gating with no code change.

begin;

-- ── 1. The default, for a database built from scratch ────────────────────────────────────────────
--
-- Kept in step with the row update below. A default that disagrees with the live row is how the next
-- environment gets a different price list than this one.
alter table public.coach_ai_config
  alter column action_credits set default
    '{"message": 1, "program": 1, "day": 1, "photo_read": 3, "photo_import": 2, "form_check": 6}'::jsonb;

-- ── 2. The live row ──────────────────────────────────────────────────────────────────────────────
--
-- ⚠ MERGE ORDER IS LOAD-BEARING AND IT IS NOT THE OBVIOUS ONE. In `a || b`, b's keys win. The new
-- object is on the LEFT so the existing `action_credits` wins every collision — which means this adds
-- `photo_import` when it is missing and can never overwrite a weight that has been hand-tuned in the
-- SQL editor since. The `where` makes it a no-op on a second run; the merge order makes it harmless
-- even if the `where` is ever removed.
update public.coach_ai_config
   set action_credits = jsonb_build_object('photo_import', 2) || action_credits,
       updated_at = now()
 where not (action_credits ? 'photo_import');

comment on column public.coach_ai_config.action_credits is
  'Per-action credit weights. message/program/day 1 · photo_import 2 · photo_read 3 · form_check 6. '
  'An action absent from this map raises 22023 in coach_ai_spend_credits rather than costing zero.';

commit;
