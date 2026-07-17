-- Forge Legacy — 0007: onboarding state (Login + Onboarding, Gate A)
-- Two profile columns the first-time journey needs:
--   onboarded_at — null until the journey completes; the boot router sends null → onboarding, set → app.
--   environment  — the athlete's training environment (ONB-D11), written at the Equipment step (Gate B).
-- Both nullable + additive; no backfill here (the seed marks the demo user onboarded).

alter table profiles add column if not exists onboarded_at timestamptz;
alter table profiles add column if not exists environment  text;
