-- Forge Legacy — 0011: workout reflection (W-17 Reflect stage)
-- A per-session "note for future you", written AFTER the atomic finish commit (the seam is (b): the
-- workout is durable at W-9 Finish; the reflection is an optional post-commit single-row self-update).
-- Nullable + distinct from chapters.reflection (the sealed-chapter reflection). No RPC — the Reflect
-- stage does a direct owner-scoped UPDATE (workouts_own RLS).

alter table workouts add column if not exists reflection text;
