-- Forge Legacy — 0083: honor wording sweep
--
-- A pass over every honor's name and generated description, reading them as an athlete would.
--
-- ══ 1. A DISPLAY AMOUNT, FOR THRESHOLDS THAT DON'T ROUND-TRIP ══
--
-- Every distance threshold is stored in miles so one evaluator can compare them (0078). Swimming is
-- authored in metres and kilometres, so converting back for display produced nonsense:
--
--     "25 Lifetime Swimming Kilometers"  →  "15.534 lifetime swim miles."
--     "First 500m Swim"                  →  "Swim 0.311 miles in a single session."
--
-- The name says one unit and the description says another, in a decimal nobody swims to. Converting in the
-- client doesn't fix it either: 500 m and 1,000 m convert back cleanly, but 1 mile does not become a round
-- metric figure, and a rule that guesses which unit to show would get "First Mile Swim" wrong.
--
-- So the catalog carries an optional `display_amount` — the phrase to print for that threshold. Set only
-- where the stored number and the spoken number differ. Null everywhere else, which is most honors.
--
-- ══ 2. NAMING COLLISION ══
--
-- "Not Alone" (Origin — you joined a squad or added a friend) and "Never Alone" (Partnership — you logged
-- a workout alongside someone) are two different achievements in two categories whose names are almost
-- indistinguishable. Both were authored here, a day apart, without being read against each other.
-- Origin's becomes "First Connection", which says what it is; Partnership's keeps "Never Alone", which
-- means what it says.
--
-- Display names are snapshotted onto earned rows (AD-58), so the rename is backfilled for anyone who
-- already holds it — nobody has had it more than a few hours, and leaving two names for one honor in
-- circulation would be worse than editing a very young record.
--
-- Idempotent. RUN AFTER 0082.

alter table public.honor_catalog add column if not exists display_amount text;

comment on column public.honor_catalog.display_amount is
  'How to speak this threshold when the stored figure is not the spoken one (swimming is stored in miles, authored in metres). Null = say the stored number.';

update public.honor_catalog set display_amount = v.amount
  from (values
    ('swim_milestone_1', '500 m'),
    ('swim_milestone_2', '1,000 m'),
    ('swim_milestone_3', '1 mile'),
    ('swim_milestone_4', '5 km'),
    ('swim_lifetime_distance_1', '25 km'),
    ('swim_lifetime_distance_2', '100 km'),
    ('swim_lifetime_distance_3', '250 km'),
    ('swim_lifetime_distance_4', '500 km'),
    ('swim_lifetime_distance_5', '1,000 km')
  ) as v(honor_type, amount)
 where public.honor_catalog.honor_type = v.honor_type;

-- ── The rename ────────────────────────────────────────────────────────────────
update public.honor_catalog
   set display_name = 'First Connection'
 where honor_type = 'origin_not_alone';

-- Earned rows snapshot their name, so the rename has to reach them too or the same honor reads two ways.
update public.honor_instances
   set display_name = 'First Connection'
 where honor_type = 'origin_not_alone';
