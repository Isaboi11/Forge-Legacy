-- Forge Legacy — 0139: put every athlete on pounds and miles
--
-- ══ WHAT THIS IS ══
--
-- PO: *"Set everyone on LBs right now that's on the app. I don't know what happened but I think you
-- switched everyone. Make sure everyone is on miles too and not kms."*
--
-- A one-time data correction for the closed test cohort, not a schema change.
--
-- ══ ⚠ THERE IS NO SEPARATE DISTANCE SETTING ══
--
-- `units` is the single switch. `distanceUnitFor()` reads it for km-vs-mi (and metres-vs-yards in a
-- pool), `displayWeight()` reads it for kg-vs-lb, and pace and speed follow the same value. Setting
-- `units` to `imperial` therefore fixes weights AND distances in one write — there is nothing else to
-- change, and a second column would be a second thing to disagree with this one.
--
-- ══ WHAT ACTUALLY HAPPENED, RECORDED SO IT IS NOT RE-LITIGATED ══
--
-- `DEFAULT_UNITS` has been `'imperial'` since the constant was written — one commit, never edited. And
-- until 2026-08-12 the ONLY code in the app that could store `'metric'` was the Kgs button on
-- `/preferences`: onboarding asked "Lbs or Kgs" under the hint *"weights, distance and pace across the
-- app"*, held the answer in local state, and **never saved it** (fixed the same day, in
-- `domain/onboarding/service.ts`). So no release, migration or default ever moved anybody to metric —
-- a stored `'metric'` can only have been tapped.
--
-- ⚠ AND THIS OVERWRITES A GENUINE PREFERENCE. Anybody who deliberately chose kilograms is being moved
-- off it without being asked. That is acceptable ONLY because the cohort is a handful of known testers
-- and the PO is asking for it directly. **Do not re-run this once the app has real users** — at that
-- point it stops being a correction and becomes taking somebody's setting away.
--
-- Idempotent, and safe to run twice: the WHERE clause skips rows already correct.
-- Depends on 0022 (profiles.app_prefs). RUN AFTER 0138.

begin;

/*
 * `coalesce` because `app_prefs` is nullable WITH NO DEFAULT (0022's own decision: null means "never
 * touched, use code defaults"). A null row already resolves to imperial in the client, so it needs no
 * write — but writing one costs nothing and makes the column say plainly what the athlete gets, which
 * matters the day somebody reads this table instead of the code.
 *
 * `true` on `jsonb_set`'s create_missing so a blob written before `units` existed gains the key rather
 * than being silently skipped.
 */
update public.profiles
   set app_prefs = jsonb_set(coalesce(app_prefs, '{}'::jsonb), '{units}', '"imperial"', true)
 where app_prefs is null
    or app_prefs->>'units' is distinct from 'imperial';

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
-- Outside the transaction, so a failure reports rather than rolling back a correction that worked.
do $$
declare
  v_wrong int;
  v_total int;
begin
  select count(*) into v_wrong from public.profiles where app_prefs->>'units' is distinct from 'imperial';
  select count(*) into v_total from public.profiles;
  if v_wrong > 0 then
    raise exception '0139 self-check: % of % athletes are still not on imperial', v_wrong, v_total;
  end if;
  raise notice '0139: all % athletes are on pounds and miles.', v_total;
end;
$$;
