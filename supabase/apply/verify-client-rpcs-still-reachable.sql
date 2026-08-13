-- Forge Legacy — POST-0147 VERIFICATION: can the app still call everything it calls?
--
-- Read-only. Creates nothing, changes nothing. Returns ROWS.
--
-- ══ WHY ══
--
-- 0147 revoked EXECUTE from `public` and `anon` across the whole schema. The danger in that shape of fix is
-- locking the app out of its own database — some functions may have been reachable by `authenticated` ONLY
-- through the PUBLIC grant, which 0147 removed. 0147 grants `authenticated` explicitly first, and asserts
-- that it can still execute *something*, but "something" is not "everything the client actually names".
--
-- This checks the real list: all 79 function names appearing in a `supabase.rpc('…')` call anywhere in
-- `src/`, extracted from the repo rather than typed from memory.
--
-- ══ HOW TO READ IT ══
--
--   status = '✅ reachable'      → `authenticated` can execute it. Correct.
--   status = '❌ LOCKED OUT'     → 0147 went too far. THE APP IS BROKEN for this feature. Fix with:
--                                    grant execute on function public.<name>(<args>) to authenticated;
--   status = '⚠ not in database' → no such function. Either it belongs to an unapplied migration
--                                  (`coach_ai_balance` → 0144, deliberately not applied) or the client
--                                  calls something that does not exist — which is its own bug.
--   status = '⚠ ANON CAN TOO'    → still reachable without an account. 0147 should have closed this.
--
-- Expect: every row ✅, except `coach_ai_balance` as '⚠ not in database' (0144 is deliberately unapplied).

with client_rpcs(name) as (
  select unnest(array[
    'accept_friend_request','accept_program_share','advance_challenges','approve_squad_join_request',
    'archive_squad_goal','athlete_profile','athlete_training_status','athlete_trophy_case',
    'cancel_challenge','challenge_detail','challenge_hub','challenge_results_detail','chapter_album',
    'claim_earned_honors','claim_initiative_honor','coach_ai_balance','complete_onboarding',
    'consume_holt_allowance','continue_workout','create_squad','decline_squad_join_request',
    'discover_squads','ensure_weekly_recap','ensure_weekly_review','find_athlete_by_handle',
    'find_athletes','founder_seats_remaining','friend_list','friends_feed','friendship_with',
    'goal_metric_value','is_app_admin','join_squad_by_code','mark_free_import_used',
    'mark_honors_celebrated','my_entitlement','notification_feed','notification_unread_count',
    'pending_join_requests','photo_albums','program_share','push_register_token','push_unregister_token',
    'record_intensity_signals','record_substitutions','refresh_squad_records','regenerate_squad_code',
    'remove_friendship','request_friend','request_squad_join','save_workout','save_workout_as_template',
    'set_post_reaction','set_training_status','set_weekly_review_note','share_program',
    'shared_workout_detail','skip_program_session','squad_by_code','squad_current_champions',
    'squad_feed','squad_goal_detail','squad_hall_of_champions','squad_invite_info','squad_metric_total',
    'squad_pending_requests','squad_post_one','squad_preview','squad_records_book','squad_trained_since',
    'squads_trained_since','start_program','template_detail','training_now','training_partners',
    'transfer_squad_ownership','uncelebrated_honors','workout_invite','workout_templates_list'
  ])
)
select
  c.name                                                     as client_calls,
  coalesce(pg_get_function_identity_arguments(p.oid), '—')   as arguments,
  case
    when p.oid is null                                              then '⚠ not in database'
    when has_function_privilege('anon', p.oid, 'execute')            then '⚠ ANON CAN TOO'
    when has_function_privilege('authenticated', p.oid, 'execute')   then '✅ reachable'
    else '❌ LOCKED OUT'
  end                                                        as status
from client_rpcs c
left join pg_proc p
       on p.proname = c.name
      and p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
order by
  case
    when p.oid is null                                            then 2
    when has_function_privilege('anon', p.oid, 'execute')          then 1
    when has_function_privilege('authenticated', p.oid, 'execute') then 4
    else 0                                                             -- LOCKED OUT sorts first
  end,
  c.name;
