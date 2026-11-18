-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- MODEL SWITCH — REVERT (AI Road to 10 Sprint 3b, PL-7)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor to put the three switched functions back on Sonnet 5, effort
-- low — at any point, after step 1 or step 2. Safe to run twice. Warm functions pick it up within 60 s.
--   coach-author, coach-kitchen  their rows are DELETED: no row = the in-code default, Sonnet 5.
--   coach-ask                    its in-code default is Sonnet 5.5 in ai/s3b (PO 11-18), so deleting the row would
--                                leave it on Sonnet 5.5 — it gets a Sonnet 5 row instead.
-- ⚠ To revert one function only, keep just its statement.
--
-- ══ PREDICTED §3 ══ remaining author/kitchen rows = 0 · coach-ask row = claude-sonnet-5 · coach_ask_gets =
--   claude-sonnet-5 · author_config_rows = 0 (= the in-code default, Sonnet 5).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.coach_ai_model_config') is null then
    raise exception 'nothing to revert: pending-0274.sql was never applied';
  end if;
end $$;

delete from public.coach_ai_model_config c
 where c.fn in ('coach-author', 'coach-kitchen');

insert into public.coach_ai_model_config (fn, model, effort, canary_model, canary_effort, canary, note)
values ('coach-ask', 'claude-sonnet-5', 'low', null, null, null, 'PL-7 REVERT ' || to_char(now(), 'YYYY-MM-DD') || ': back on Sonnet 5')
on conflict (fn) do update
  set model = excluded.model, effort = excluded.effort, canary_model = null, canary_effort = null, canary = null,
      note = excluded.note, updated_at = now();

select (select count(*) from public.coach_ai_model_config c where c.fn in ('coach-author', 'coach-kitchen')) as remaining_author_kitchen_rows,
       (select c.model from public.coach_ai_model_config c where c.fn = 'coach-ask') as coach_ask_row,
       (select p.model from public.coach_ai_model_pick('coach-ask', '00000000-0000-0000-0000-000000000000') p) as coach_ask_gets,
       (select count(*) from public.coach_ai_model_pick('coach-author', '00000000-0000-0000-0000-000000000000')) as author_config_rows;
