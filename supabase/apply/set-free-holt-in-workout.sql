-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — give the free tier a taste of in-workout coaching (holt_in_workout: 0 → 3)
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- ══ WHY ══
--
-- `holt_in_workout` is the only capability that lands at the athlete's moment of highest need — mid-set,
-- weight in hand, unsure whether to add to the bar. It is also the ONLY cap in the table set to zero,
-- which means a free athlete never experiences it even once.
--
-- A capability nobody has felt cannot be missed, and cannot be sold. At zero it converts nobody: the
-- athlete has no idea what they would be buying, because the product has never shown it to them. Three a
-- month is enough to be felt on the sets that matter and to run out while the memory of it is fresh —
-- which is the moment an upgrade actually makes sense to somebody.
--
-- ⚠ NOT A CODE CHANGE, AND DELIBERATELY SO. MA3-D16: every cap is server-side configuration, editable
-- without a deploy, so a number can be tuned from real usage instead of guessed at in a release. The app
-- reads `entitlement_config` on every gate; nothing needs rebuilding, and nothing needs to ship.
--
-- ⚠ SAFE WHILE `default_tier` IS STILL 'PREMIUM'. Nothing gates today, so this changes nobody's
-- experience yet — it sets the number correctly BEFORE Phase F flips the tier, rather than discovering
-- afterwards that the most persuasive thing in the app was switched off for the people being persuaded.
--
-- ══ HOW TO READ THE RESULT ══
--
-- One row, showing the caps before and after. `holt_in_workout` should read 3; every other free cap must
-- be untouched — this edits one key inside the JSON rather than replacing the object, so a typo cannot
-- silently reset the photo or squad allowance.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

with before as (
  select free_caps from public.entitlement_config where id
),
updated as (
  update public.entitlement_config
     set free_caps = jsonb_set(free_caps, '{holt_in_workout}', '3'::jsonb, true),
         updated_at = now()
   where id
  returning free_caps
)
select
  (select free_caps -> 'holt_in_workout' from before)  as in_workout_before,
  (select free_caps -> 'holt_in_workout' from updated) as in_workout_after,
  (select free_caps from updated)                      as all_free_caps_now;
