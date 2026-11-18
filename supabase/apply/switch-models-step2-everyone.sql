-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- MODEL SWITCH — STEP 2 of 2: the canary model for EVERYONE (AI Road to 10 Sprint 3b, PL-7)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor once step 1 has run on the operators and looked right (the
-- read in step 1's header: outcomes `ok`, no rise in `bad_output` / `refusal`, cost down). Safe to run twice.
-- Promotes every row that has a canary: model ← canary_model, effort ← canary_effort (else effort), canary cleared.
-- Rows without a canary are untouched — coach-ask is already Sonnet 5.5 for everyone from step 1. Undo:
-- switch-models-revert.sql.
--
-- ══ PREDICTED §3 ══ coach-ask = claude-sonnet-5-5 · coach-author = claude-haiku-5-5 ·
--   coach-kitchen = claude-haiku-5-5, canary null everywhere, athlete_gets = model.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.coach_ai_model_config') is null then
    raise exception 'apply supabase/apply/pending-0274.sql (and step 1) first';
  end if;
end $$;

update public.coach_ai_model_config c
   set model = c.canary_model,
       effort = coalesce(c.canary_effort, c.effort),
       canary_model = null,
       canary_effort = null,
       canary = null,
       note = coalesce(c.note, '') || ' · step 2 (everyone) ' || to_char(now(), 'YYYY-MM-DD'),
       updated_at = now()
 where c.canary_model is not null;

do $$
begin
  if exists (select 1 from public.coach_ai_model_config c where c.canary is not null or c.canary_model is not null) then
    raise exception 'step 2: a canary is still set';
  end if;
end $$;

select c.fn, c.model, c.effort, c.canary,
       (select p.model from public.coach_ai_model_pick(c.fn, '00000000-0000-0000-0000-000000000000') p) as athlete_gets
  from public.coach_ai_model_config c
 order by c.fn;
