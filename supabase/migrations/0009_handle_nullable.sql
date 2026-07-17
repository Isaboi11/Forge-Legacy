-- Forge Legacy — 0009: handle nullable (Login + Onboarding, Gate B)
-- Onboarding's Username step is skippable ("Skip for now"), and Identity-Amendment-001 makes the handle
-- an OPTIONAL, later-collected identifier — so profiles.handle must allow null. 0001 declared it NOT
-- NULL, which blocked the finish RPC on the skip path. The unique index stays (Postgres allows multiple
-- nulls), so skip-users don't collide.

alter table profiles alter column handle drop not null;
