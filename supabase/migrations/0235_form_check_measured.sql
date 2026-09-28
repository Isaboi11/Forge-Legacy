-- 0235 — form_checks.measured: the numbers body tracking measured for a read (reps, depth, tempo)
--
-- `Docs/Form-Check-Body-Pose-Build-Plan.md`, PO decision 3 (09-28): *save the numbers — reps, depth,
-- tempo — never the joints.* On build 10 the phone measures the set with Apple Vision body pose
-- (`modules/body-pose`, `src/domain/coach/pose/`). The read already stores its text in `form_checks.read`
-- (0221); this adds the measured numbers beside it, so a later read can say "rep 5 was shallower than in
-- August".
--
-- ⛔ NUMBERS ONLY. The client writes `measuredForSave()` (`src/domain/coach/pose/pose-measure.ts`), whose
-- type has no field that could carry a joint or a body measurement: `{ v, kind, view, reps, depth[],
-- tempo[] }`. The CHECK below backs that up structurally — a JSON object of at most 4,000 bytes. A joint
-- series (300 samples × 57 numbers) is ~100 KB and cannot fit.
--
-- Privacy: workout data, already declared under Fitness (plan §9). No new label.
--
-- Additive and idempotent. `form_checks` already has owner-only RLS for select/insert/update/delete
-- (0221), so there is no policy work. Nullable, no default: null = no body tracking for that read (web,
-- build 9, or pose fell back), which is most reads today.
--
-- ⚠ THE CLIENT SURVIVES THIS NOT BEING APPLIED. `insertFormCheck` retries without `measured` when the
-- insert is refused over the column, so a build-10 read is never lost to an unpasted migration.

alter table public.form_checks add column if not exists measured jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'form_checks_measured_check') then
    alter table public.form_checks
      add constraint form_checks_measured_check
      check (measured is null or (jsonb_typeof(measured) = 'object' and octet_length(measured::text) <= 4000));
  end if;
end $$;

comment on column public.form_checks.measured is
  'Body tracking''s numbers for this read (build 10+): { v, kind, view, reps, depth[], tempo[] } from measuredForSave() in src/domain/coach/pose/pose-measure.ts. NUMBERS ONLY, never joints (PO decision 3, 2026-09-28). null = no body tracking for this read.';
