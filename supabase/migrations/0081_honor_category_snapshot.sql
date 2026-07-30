-- Forge Legacy — 0081: snapshot an honor's category onto the earned row
--
-- The Honors Hub draws a per-category medallion — a dumbbell for Training, a shield for Strength. The
-- Legacy screen drew a five-point star for every honor, because its query selects only
-- `id, display_name, date_earned`: there is nothing on the row to resolve a category from, so it fell back
-- to one hardcoded mark. Two surfaces, same honor, different artwork.
--
-- WHY SNAPSHOT RATHER THAN JOIN. `honor_instances.honor_type` has no foreign key to `honor_catalog` and
-- cannot have one — `initiative` is granted by its own RPC (0014) and is not a threshold honor, so it will
-- never be a catalog row. Every surface that wants a glyph would otherwise have to fetch the whole catalog
-- and map it client-side, which is a second list to keep in step and a second query on every read.
--
-- Snapshotting also matches what this table already does: `display_name` is copied onto the row at award
-- time (AD-58) precisely so a later catalog edit cannot rewrite what an athlete was told they earned. The
-- category is the same kind of fact — what this honor WAS when it was struck. If Relative Strength is ever
-- renamed, honors earned under the old name keep it, which is the correct behaviour for a permanent record.
--
-- Nullable, and the client falls back to the code catalog when it is null: `initiative` has no catalog row,
-- and rows earned before this migration keep whatever the backfill can resolve.
--
-- Depends on 0077 (honor_catalog), 0012 (honor_instances). Idempotent. RUN AFTER 0080.

alter table public.honor_instances add column if not exists category text;

comment on column public.honor_instances.category is
  'Category snapshotted at award time, so every surface renders the right medallion without joining the catalog. Null for honors granted outside the catalog (e.g. initiative) — the client falls back to the code catalog.';

-- Backfill what can be resolved. Honors with no catalog row (initiative) stay null by design.
update public.honor_instances hi
   set category = c.category
  from public.honor_catalog c
 where c.honor_type = hi.honor_type
   and hi.category is distinct from c.category;

-- ── Award with the category attached ──────────────────────────────────────────
-- Identical to 0079's evaluator apart from carrying `c.category` through each insert.
create or replace function evaluate_honors(p_source text default 'live_session')
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid   uuid := auth.uid();
  v_live  boolean := (p_source = 'live_session');
  v_new   jsonb := '[]'::jsonb;
  v_row   record;
  v_metrics jsonb;
  v_bw    numeric;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_bw := public.latest_bodyweight_lb(v_uid);

  select jsonb_build_object(
    'workouts_total',  (select count(*) from workouts where athlete_id = v_uid),
    'hours_forged',    (select coalesce(sum(duration_sec), 0) / 3600.0 from workouts where athlete_id = v_uid),
    'chapters_sealed', (select count(*) from chapters where athlete_id = v_uid and sealed_at is not null),
    'goals_achieved',  (select count(*) from goals where athlete_id = v_uid and achieved_at is not null),
    'active_weeks',    (select count(distinct date_trunc('week', saved_at)) from workouts where athlete_id = v_uid),
    'combined_lifts',  public.lift_best_lb(v_uid, 'barbell-bench-press')
                     + public.lift_best_lb(v_uid, 'barbell-back-squat')
                     + public.lift_best_lb(v_uid, 'barbell-deadlift'),
    'challenges_won',     (select count(*) from public.challenge_results r where r.user_id = v_uid and r.is_winner),
    'challenges_entered', (select count(*) from public.challenge_results r where r.user_id = v_uid),
    'lifetime_volume', (
      select coalesce(sum(
        case when lower(coalesce(ws.weight_unit, 'lb')) = 'kg' then ws.weight * 2.20462 else ws.weight end
        * ws.reps), 0)
        from workout_sets ws
        join workout_exercises we on we.id = ws.workout_exercise_id
        join workouts w on w.id = we.workout_id
       where w.athlete_id = v_uid and ws.weight is not null and ws.reps is not null
    ),
    'partnered_sessions', (
      select count(*) from workouts w
       where w.athlete_id = v_uid and array_length(w.partners, 1) > 0
    ),
    'same_partner_max', (
      select coalesce(max(n), 0) from (
        select count(*) as n
          from workouts w, unnest(w.partners) as p(name)
         where w.athlete_id = v_uid
         group by p.name
      ) t
    ),
    'distinct_partners', (
      select count(distinct p.name)
        from workouts w, unnest(w.partners) as p(name)
       where w.athlete_id = v_uid
    ),
    'comeback_days', (
      select coalesce(max(gap), 0) from (
        select (w.saved_at::date - lag(w.saved_at::date) over (order by w.saved_at))::numeric as gap
          from workouts w
         where w.athlete_id = v_uid
      ) g
    )
  ) into v_metrics;

  -- ── Account-scoped, unkeyed ──
  for v_row in
    select c.honor_type, c.display_name, c.category
      from public.honor_catalog c
     where c.scope = 'account'
       and c.metric_key is null
       and c.metric in ('workouts_total', 'hours_forged', 'chapters_sealed', 'goals_achieved', 'active_weeks',
                        'combined_lifts', 'challenges_won', 'challenges_entered',
                        'lifetime_volume', 'partnered_sessions', 'same_partner_max', 'distinct_partners',
                        'comeback_days')
       and (v_metrics->>c.metric)::numeric >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, category, source)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.category, p_source)
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_row.honor_type, 'display_name', v_row.display_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── Account-scoped, keyed ──
  for v_row in
    select c.honor_type, c.display_name, c.category
      from public.honor_catalog c
     where c.scope = 'account'
       and c.metric_key is not null
       and case c.metric
             when 'lift_max' then public.lift_best_lb(v_uid, c.metric_key)
             when 'lift_ratio' then
               case when v_bw is null or v_bw <= 0 then null
                    else public.lift_best_lb(v_uid, c.metric_key) / v_bw end
             when 'session_distance' then (
               select coalesce(max(case when lower(coalesce(w.distance_unit, 'mi')) = 'km'
                                        then w.distance * 0.621371 else w.distance end), 0)
                 from workouts w
                where w.athlete_id = v_uid and w.distance is not null
                  and w.activity_type::text = c.metric_key
             )
             when 'lifetime_distance' then (
               select coalesce(sum(case when lower(coalesce(w.distance_unit, 'mi')) = 'km'
                                        then w.distance * 0.621371 else w.distance end), 0)
                 from workouts w
                where w.athlete_id = v_uid and w.distance is not null
                  and w.activity_type::text = c.metric_key
             )
             else null
           end >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, category, source)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.category, p_source)
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_row.honor_type, 'display_name', v_row.display_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── Chapter-scoped ──
  for v_row in
    select c.honor_type, c.display_name, c.category, ch.id as chapter_id, ch.name as chapter_name
      from public.honor_catalog c
      cross join (
        select chp.id, chp.name,
               chp.workout_count::numeric as chapter_workouts,
               case when chp.sealed_at is not null
                    then (chp.sealed_at::date - chp.start_date)::numeric
                    else null end as chapter_days
          from chapters chp
         where chp.athlete_id = v_uid
      ) ch
     where c.scope = 'chapter'
       and case c.metric
             when 'chapter_workouts' then ch.chapter_workouts
             when 'chapter_days'     then ch.chapter_days
             else null
           end >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, category, chapter_id, source, metadata)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.category, v_row.chapter_id, p_source,
            jsonb_build_object('chapterName', v_row.chapter_name))
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object(
        'honor_type', v_row.honor_type, 'display_name', v_row.display_name, 'chapter', v_row.chapter_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, v_row.chapter_id, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  return v_new;
end;
$$;
