-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- MODEL SWITCH — STEP 1 of 2 (AI Road to 10 Sprint 3b, PL-7): Holt's chat on Sonnet 5.5 for EVERYONE, and the two
-- Haiku 5.5 moves for the OPERATORS first
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor. Safe to run twice (an upsert; §3 is read-only).
-- ⛔ ONLY AFTER: pending-0274.sql is applied (§0 raises otherwise) AND the functions below are deployed from ai/s3b
--   (a function deployed before Sprint 3b never reads this table — the row would do nothing).
--
-- What it does — the PO's 11-18 switches, each one passing the rule "as good on its eval AND the same or lower
-- price" (numbers: Docs/AI-Sprint-3b-models-Report.md §5):
--   coach-ask      Sonnet 5 → Sonnet 5.5, EVERYONE (PO 11-18: no operators-only canary). Its in-code default is already
--                  Sonnet 5.5 in ai/s3b; this row says so in the table too, so the revert has one row to flip.
--                  ask-safety (Holt's chat on ITS OWN request — chat-safety measures coach-interpret): 677/704 vs
--                  626/704; must-stop lines let through 5 vs 27, none Sonnet 5 stopped lost; same list price, cheaper
--                  cache reads. Refusal fallback on (Sonnet 5.5 → Sonnet 5 on a cyber / frontier_llm decline).
--   coach-author   Sonnet 5 → Haiku 5.5, operators first: author eval 130/130 = 130/130, nothing lost; ~1/20 the price
--   coach-kitchen  Sonnet 5 → Haiku 5.5, operators first: kitchen eval 34/36 = 34/36; 0 real allergen ingredients in a
--                  shown dish on either (each "leak" is a dish NAME like "Sesame-Free …"); ~1/19 the price
-- coach-interpret is HELD this sprint (PO 11-18): no row for it.
--
-- ⚠ Prompt caches are per model: the first call per function on a new model pays one cache write (cents).
-- ⚠ The functions keep an answer 60 s, so the switch reaches a warm function within a minute.
--
-- While the canary runs, read how it does (since this file ran):
--   select fn, model, outcome, count(*), round(avg(cost_usd)::numeric, 5) as avg_usd, round(avg(latency_ms)) as avg_ms
--     from public.coach_ai_spend
--    where fn in ('coach-author', 'coach-kitchen', 'coach-ask') and occurred_at > now() - interval '7 days'
--    group by 1, 2, 3 order by 1, 2, 3;
--
-- ══ PREDICTED §3 ══
--   coach-ask      model = claude-sonnet-5-5 · canary (none) · athlete_gets = operator_gets = claude-sonnet-5-5
--   coach-author   model = claude-sonnet-5 · canary_model = claude-haiku-5-5 · canary = operators ·
--                  athlete_gets = claude-sonnet-5 · operator_gets = claude-haiku-5-5
--   coach-kitchen  the same as coach-author
--   (operator_gets is null if app_admins is empty — it had 1 row on 2026-11-18.)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

-- §0 — 0274 must be in
do $$
begin
  if to_regclass('public.coach_ai_model_config') is null or to_regprocedure('public.coach_ai_model_pick(text, uuid)') is null then
    raise exception 'apply supabase/apply/pending-0274.sql first';
  end if;
end $$;

-- §1 — coach-ask for everyone; the two canary rows
insert into public.coach_ai_model_config (fn, model, effort, canary_model, canary_effort, canary, note) values
  ('coach-ask',     'claude-sonnet-5-5', 'low', null,               null,  null,        'PL-7, PO 11-18 (everyone): ask-safety 677/704 vs 626/704'),
  ('coach-author',  'claude-sonnet-5',   'low', 'claude-haiku-5-5', 'low', 'operators', 'PL-7 step 1, PO 11-18: author eval 130/130 = 130/130'),
  ('coach-kitchen', 'claude-sonnet-5',   'low', 'claude-haiku-5-5', 'low', 'operators', 'PL-7 step 1, PO 11-18: kitchen eval 34/36 = 34/36, 0 real leaks')
on conflict (fn) do update
  set model = excluded.model, effort = excluded.effort, canary_model = excluded.canary_model,
      canary_effort = excluded.canary_effort, canary = excluded.canary, note = excluded.note, updated_at = now();

-- §2 — it landed
do $$
begin
  if (select count(*) from public.coach_ai_model_config c
       where c.fn in ('coach-author', 'coach-kitchen') and c.canary = 'operators' and c.canary_model = 'claude-haiku-5-5') <> 2 then
    raise exception 'step 1: the canary rows did not land';
  end if;
  if not exists (select 1 from public.coach_ai_model_config c
                  where c.fn = 'coach-ask' and c.model = 'claude-sonnet-5-5' and c.canary is null) then
    raise exception 'step 1: coach-ask is not on Sonnet 5.5 for everyone';
  end if;
end $$;

-- §3 — what each kind of caller now gets
select c.fn, c.model, c.canary_model, c.canary,
       (select p.model from public.coach_ai_model_pick(c.fn, '00000000-0000-0000-0000-000000000000') p) as athlete_gets,
       (select p.model from public.coach_ai_model_pick(c.fn, (select a.user_id from public.app_admins a limit 1)) p) as operator_gets
  from public.coach_ai_model_config c
 order by c.fn;
