-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- MODEL SWITCH — REVERT (AI Road to 10 Sprint 3b, PL-7)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor to put the switched functions back on the model written in
-- their own code (Sonnet 5, effort low) — at any point, after step 1 or step 2. Safe to run twice.
-- It DELETES the rows: no row = the function's in-code default. Warm functions pick it up within 60 s.
-- ⚠ Only the switched functions. To revert one, delete just its line from the list.
--
-- ══ PREDICTED §3 ══ remaining rows for these functions = 0 · athlete_gets = (none) = the in-code default.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

delete from public.coach_ai_model_config c
 where c.fn in ('coach-author', 'coach-kitchen', 'coach-ask');

select (select count(*) from public.coach_ai_model_config c where c.fn in ('coach-author', 'coach-kitchen', 'coach-ask')) as remaining_rows,
       (select count(*) from public.coach_ai_model_pick('coach-author', '00000000-0000-0000-0000-000000000000')) as author_config_rows;
