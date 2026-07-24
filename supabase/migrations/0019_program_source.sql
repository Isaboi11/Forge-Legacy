-- Forge Legacy — 0019: remember which catalog program a row was adopted from
--
-- A built-in program (`ProgramDefinition`) is static app content with no database row, so a logged
-- workout had nothing to attach to and its progress bar was a hardcoded zero. Starting one now writes
-- it out as a real `programs` row; this column records where that row came from.
--
-- Two jobs: provenance (this is Strength Foundation I, not a program the athlete authored), and
-- idempotency — the partial unique index below means starting the same catalog program twice resumes
-- the existing row instead of silently forking a second copy with its own separate progress.

alter table public.programs
  add column if not exists source_definition_id text;

create unique index if not exists programs_one_per_source
  on public.programs (athlete_id, source_definition_id)
  where source_definition_id is not null;
