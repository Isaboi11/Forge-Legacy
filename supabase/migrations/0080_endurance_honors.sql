-- Forge Legacy — 0080: walking, cycling and swimming endurance honors (28)
--
-- Pure catalog rows. `session_distance` and `lifetime_distance` already take a modality key (0078), so
-- these three families needed no evaluator change at all — which was the point of making the catalog a
-- table. Running shipped in 0078; this completes the Endurance category.
--
-- ══ EVERY THRESHOLD IS IN MILES ══
--
-- The catalog states each family in the unit its athletes think in — kilometres for swimming, miles for
-- cycling, both for running and walking. The evaluator normalises `workouts.distance` to miles (a km-logged
-- session converts on read), so the thresholds are converted ONCE here rather than the evaluator carrying a
-- per-family unit. Conversions are shown beside each row so the arithmetic is checkable against the doc
-- rather than trusted.
--
-- ══ WHAT IS DELIBERATELY LEFT OUT: THE kg CLUBS ══
--
-- `club_400kg` / `club_500kg` / `club_600kg` are in the locked catalog beside `club_1000` / `1200` / `1500`,
-- and they are the SAME achievement stated in another unit — 400 kg is 882 lb, so an athlete crossing
-- 1,000 lb has already crossed 400 kg. Awarding both sets means one combined total earns six honors, and a
-- trophy case that lists "1,000 Pound Club" next to "400 Kilogram Club" reads as padding rather than as
-- two accomplishments.
--
-- The catalog almost certainly intends them as a UNIT-PREFERENCE pair — you are shown the set matching your
-- units — but nothing in the schema expresses "these two honors are the same honor in different units", and
-- inventing that mapping silently is a product decision, not a migration. Left out and raised instead.
-- Athletes on metric currently earn the lb clubs, which are at least correct, just not in their units.
--
-- Depends on 0078 (session_distance / lifetime_distance metrics). Idempotent. RUN AFTER 0079.

insert into public.honor_catalog (honor_type, display_name, category, metric, metric_key, threshold, scope, sort_order) values
  -- ── Walking · session ──
  ('walk_milestone_1', 'First Mile Walk',          'Endurance', 'session_distance', 'walking', 1,    'account', 420),
  ('walk_milestone_2', 'First 5K Walk',            'Endurance', 'session_distance', 'walking', 3.1,  'account', 421),
  ('walk_milestone_3', 'First 10K Walk',           'Endurance', 'session_distance', 'walking', 6.2,  'account', 422),
  ('walk_milestone_4', 'First Half Marathon Walk', 'Endurance', 'session_distance', 'walking', 13.1, 'account', 423),
  ('walk_milestone_5', 'First Marathon Walk',      'Endurance', 'session_distance', 'walking', 26.2, 'account', 424),

  -- ── Walking · lifetime ──
  ('walk_lifetime_distance_1', '100 Lifetime Walking Miles',    'Endurance', 'lifetime_distance', 'walking', 100,   'account', 430),
  ('walk_lifetime_distance_2', '500 Lifetime Walking Miles',    'Endurance', 'lifetime_distance', 'walking', 500,   'account', 431),
  ('walk_lifetime_distance_3', '1,000 Lifetime Walking Miles',  'Endurance', 'lifetime_distance', 'walking', 1000,  'account', 432),
  ('walk_lifetime_distance_4', '5,000 Lifetime Walking Miles',  'Endurance', 'lifetime_distance', 'walking', 5000,  'account', 433),
  ('walk_lifetime_distance_5', '15,000 Lifetime Walking Miles', 'Endurance', 'lifetime_distance', 'walking', 15000, 'account', 434),

  -- ── Cycling · session ──
  ('bike_milestone_1', 'First 25-Mile Ride',       'Endurance', 'session_distance', 'cycling', 25,  'account', 440),
  ('bike_milestone_2', 'First 50-Mile Ride',       'Endurance', 'session_distance', 'cycling', 50,  'account', 441),
  ('bike_milestone_3', 'First Century Ride',       'Endurance', 'session_distance', 'cycling', 100, 'account', 442),
  ('bike_milestone_4', 'First Double Century Ride','Endurance', 'session_distance', 'cycling', 200, 'account', 443),

  -- ── Cycling · lifetime ──
  ('bike_lifetime_distance_1', '250 Lifetime Cycling Miles',    'Endurance', 'lifetime_distance', 'cycling', 250,   'account', 450),
  ('bike_lifetime_distance_2', '1,000 Lifetime Cycling Miles',  'Endurance', 'lifetime_distance', 'cycling', 1000,  'account', 451),
  ('bike_lifetime_distance_3', '5,000 Lifetime Cycling Miles',  'Endurance', 'lifetime_distance', 'cycling', 5000,  'account', 452),
  ('bike_lifetime_distance_4', '15,000 Lifetime Cycling Miles', 'Endurance', 'lifetime_distance', 'cycling', 15000, 'account', 453),
  ('bike_lifetime_distance_5', '50,000 Lifetime Cycling Miles', 'Endurance', 'lifetime_distance', 'cycling', 50000, 'account', 454),

  -- ── Swimming · session (catalog states metres; converted to miles) ──
  ('swim_milestone_1', 'First 500m Swim',  'Endurance', 'session_distance', 'swimming', 0.311, 'account', 460),  --   500 m
  ('swim_milestone_2', 'First 1000m Swim', 'Endurance', 'session_distance', 'swimming', 0.621, 'account', 461),  -- 1,000 m
  ('swim_milestone_3', 'First Mile Swim',  'Endurance', 'session_distance', 'swimming', 1,     'account', 462),  -- 1,609 m
  ('swim_milestone_4', 'First 5K Swim',    'Endurance', 'session_distance', 'swimming', 3.107, 'account', 463),  -- 5,000 m

  -- ── Swimming · lifetime (catalog states kilometres; converted to miles) ──
  ('swim_lifetime_distance_1', '25 Lifetime Swimming Kilometers',    'Endurance', 'lifetime_distance', 'swimming', 15.534, 'account', 470),  --    25 km
  ('swim_lifetime_distance_2', '100 Lifetime Swimming Kilometers',   'Endurance', 'lifetime_distance', 'swimming', 62.137, 'account', 471),  --   100 km
  ('swim_lifetime_distance_3', '250 Lifetime Swimming Kilometers',   'Endurance', 'lifetime_distance', 'swimming', 155.34, 'account', 472),  --   250 km
  ('swim_lifetime_distance_4', '500 Lifetime Swimming Kilometers',   'Endurance', 'lifetime_distance', 'swimming', 310.69, 'account', 473),  --   500 km
  ('swim_lifetime_distance_5', '1,000 Lifetime Swimming Kilometers', 'Endurance', 'lifetime_distance', 'swimming', 621.37, 'account', 474)   -- 1,000 km
on conflict (honor_type) do update set
  display_name = excluded.display_name,
  category     = excluded.category,
  metric       = excluded.metric,
  metric_key   = excluded.metric_key,
  threshold    = excluded.threshold,
  scope        = excluded.scope,
  sort_order   = excluded.sort_order;
