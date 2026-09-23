-- ─────────────────────────────────────────────────────────────────────────────
-- 0209 — what the athlete weighed when a target was set
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `Nutrition Targets.dc.html` opens with a banner: *"Your weight has changed since these targets were
-- set — 201.8 lb on Aug 4 · 196.4 lb now."* Every figure a recommended target is built from comes from
-- bodyweight (Mifflin–St Jeor, the 1%-a-week cap, protein at 0.9 g/lb), so a target drifts out of date
-- the moment the body it was calculated for changes.
--
-- ⚠ THE BANNER CANNOT BE BUILT WITHOUT THIS COLUMN, AND MUST NOT BE FAKED WITHOUT IT. The only weight
--   the app can otherwise see is the LATEST one, which is the "now" half of that sentence. Comparing it
--   to itself yields nothing; comparing it to the oldest weigh-in answers a different question. A
--   banner built either way would state a change that did not happen, on the screen whose whole job is
--   saying true things about someone's body.
--
-- ⚠ IT IS A SNAPSHOT AND IS NEVER RECALCULATED. It records what was true when the row was written, the
--   same reason `effective_from` is never edited (NUT-D5, 0205 §4). A row with no weight behind it —
--   a manual target typed before any weigh-in — keeps `null`, and null means "no comparison to draw",
--   never "0 lb".
--
-- ⚠ POUNDS, like `body_entries.weight_lb`. Units are a display concern; the store is lb-canonical
--   everywhere in this app and this column does not become the exception.
--
-- Additive and nullable, so the deployed client is unaffected: it neither selects nor writes this. The
-- new client writes it and falls back to a write without it while this is unpasted.
--
-- Paste the whole file at once. Safe to run twice.

alter table public.nutrition_targets add column if not exists weight_lb numeric;

comment on column public.nutrition_targets.weight_lb is
  'What the athlete weighed, in lb, when this target was written — a SNAPSHOT, never recalculated. Drives the "your weight has changed since these targets were set" review prompt. Null = no weigh-in existed at the time, so no comparison can be drawn.';
