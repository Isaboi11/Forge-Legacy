-- Forge Legacy — 0115: a template knows whether Forge wrote it
--
-- Forge now ships six starter templates (`src/domain/workout/starter-templates`), so a brand-new
-- athlete's first Templates screen is six ready sessions instead of an empty panel reading
-- "No templates yet". `Forge Strength Start.dc.html`'s "Start a workout you've saved — or one built by
-- Forge" becomes true.
--
-- ADOPTED, NOT SHARED. The starters are shipped DEFINITIONS; adopting one writes the athlete their own
-- ordinary row here, stamped with the definition it came from. Exactly the model `programs` already
-- uses for the built-in catalogue (`programs.source_definition_id`, 0019).
--
-- The alternative — seed rows with `athlete_id is null` plus a read policy — was rejected because this
-- schema is owner-only in load-bearing places, not incidentally:
--
--   · `template_detail()` and `workout_templates_list()` (0095) both end `where t.athlete_id =
--     auth.uid()`.
--   · `save_workout` re-checks `where id = p_template_id and athlete_id = v_uid` and DEGRADES TO AN
--     UNATTRIBUTED WORKOUT otherwise — so a session trained from a shared Forge row would silently
--     lose its `template_id`, and W-27 would show no history for the templates everyone used.
--   · `use_count` is DERIVED from `workouts.template_id` (0095 argues at length that it must be). On a
--     shared row that becomes a GLOBAL count — how many times every athlete alive has trained Push Day
--     — printed on a screen that means "how many times you have".
--
-- Provenance only. This column never gates a read, never changes ownership, and is never used to
-- rewrite an athlete's row when the shipped definition changes: their copy is theirs from the moment
-- they take it.

alter table public.workout_templates
  add column if not exists source_definition_id text;

comment on column public.workout_templates.source_definition_id is
  'The Forge starter definition this template was adopted from (src/domain/workout/starter-templates). Null for a captured or authored template. Provenance only — the row is the athlete''s own copy and an app update never rewrites it, exactly as programs.source_definition_id works.';

-- Adopting the same starter twice must RESUME the copy, not fork it. Partial, so the column stays
-- null on every captured/authored template without those colliding with each other.
create unique index if not exists workout_templates_one_per_source
  on public.workout_templates (athlete_id, source_definition_id)
  where source_definition_id is not null;

-- ── Both reads carry the field ────────────────────────────────────────────────
-- 0095's bodies, verbatim, plus one key each. Signatures unchanged, so no `drop function`.
--
-- ⚠ PL/pgSQL binds at RUN time. These two are `language sql`, which is checked at creation — but
-- `save_workout` in 0095 is PL/pgSQL and untouched here, and the run-time proof for this migration is
-- still the same one: adopt a starter, train it, and confirm W-27 shows "Times used 1" with a history
-- row. That is what proves the ownership check passed and `template_id` survived the save.

create or replace function public.template_detail(p_template uuid)
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select jsonb_build_object(
           'id', t.id,
           'name', t.name,
           'exercises', t.exercises,
           'created_at', t.created_at,
           'source_definition_id', t.source_definition_id,
           'use_count', (select count(*) from public.workouts w where w.template_id = t.id and w.state = 'saved'),
           'last_used_at', (select max(w.saved_at) from public.workouts w where w.template_id = t.id and w.state = 'saved'),
           'history', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'workout_id', h.id,
                      'at', h.saved_at,
                      'duration_sec', h.duration_sec,
                      'note', h.notes
                    ) order by h.saved_at desc)
               from public.workouts h
              where h.template_id = t.id and h.state = 'saved'
           ), '[]'::jsonb)
         )
    from public.workout_templates t
   where t.id = p_template and t.athlete_id = auth.uid();
$$;

create or replace function public.workout_templates_list()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(x.obj order by x.last_used_at desc nulls last, x.created_at desc), '[]'::jsonb)
    from (
      select t.created_at,
             (select max(w.saved_at) from public.workouts w where w.template_id = t.id and w.state = 'saved') as last_used_at,
             jsonb_build_object(
               'id', t.id,
               'name', t.name,
               'exercises', t.exercises,
               'created_at', t.created_at,
               'source_definition_id', t.source_definition_id,
               'use_count', (select count(*) from public.workouts w where w.template_id = t.id and w.state = 'saved'),
               'last_used_at', (select max(w.saved_at) from public.workouts w where w.template_id = t.id and w.state = 'saved')
             ) as obj
        from public.workout_templates t
       where t.athlete_id = auth.uid()
    ) x;
$$;
