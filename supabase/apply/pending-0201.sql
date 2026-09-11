-- ═════════════════════════════════════════════════════════════════════════════════════════
--
--   0201 — THE ATHLETE PUTS THEIR TEMPLATES IN THEIR OWN ORDER
--
--   PASTE THIS WHOLE FILE INTO THE SUPABASE SQL EDITOR AND RUN IT ONCE.
--   It is idempotent: running it twice is safe and changes nothing the second time.
--
--   ⚠ SAFE TO APPLY BEFORE OR AFTER THE CLIENT SHIPS.
--     · Before the client: every `position` is null, so `workout_templates_list()` returns exactly
--       today's order (null-first, then the old recency sort) and nobody sees a difference.
--     · Client before this: the list still loads (it is the old function); only Save on the new
--       Reorder sheet fails, with a "Couldn't save" toast. Nothing else calls the new function.
--
--   It ends with a self-check that ABORTS if anything did not take, then a read-only report.
--
-- ═════════════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — the migration (supabase/migrations/0201_template_order.sql, verbatim)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

-- Forge Legacy — 0201: the athlete puts their templates in their own order
--
-- PO, 2026-09-11: *"In my template page, I should be able to rearrange my templates how I want. Same
-- drag and drop as the days in a program type of feel."* W26-Amendment-003 records it, overriding
-- W26-D1's "single default sort, no user controls".
--
-- ══ ONE NULLABLE COLUMN, AND NULL MEANS "NOT PLACED YET" ══
--
-- `position` is written only when the athlete saves an order, and then for every template they had.
-- Until then every row is null and the list sorts exactly as it always has (most recently used first,
-- then never-used newest first) — so an athlete who never touches Reorder sees no change at all.
--
-- ⚠ AN UNPLACED TEMPLATE SORTS ABOVE THE PLACED ONES. A template saved after the last reorder has no
-- position; putting it at the TOP is what W-26 already promises ("a new template appears at the top")
-- and it is where the athlete who just saved it is looking. Among themselves, unplaced rows keep the
-- old recency order.
--
-- ⚠ THE LIST IS THE ONLY READ THAT CHANGES, AND EVERY SCREEN INHERITS IT. The Workouts tab's top three,
-- the program builder's "Use a template", the train invite and the squad composer all call
-- `workout_templates_list()`, so the athlete's order reaches all of them with no client change.
-- The body below is 0115's VERBATIM with two edits: `t.position` carried out of the subquery, and the
-- `order by`. Same signature and return type, so `create or replace` is enough.
--
-- ⚠ THE WRITE IS ONE CALL FOR THE WHOLE ORDER, NOT ONE UPDATE PER ROW. A per-row loop from the client
-- that fails halfway leaves two templates sharing a slot and the list in an order nobody chose.

alter table public.workout_templates
  add column if not exists position integer;

comment on column public.workout_templates.position is
  'The athlete''s own order on the Templates screen (0-based). Null = not placed yet: every row before the athlete first saves an order, and any template saved after it. Unplaced rows sort ABOVE placed ones, newest-used first. Written only by workout_templates_reorder(). Migration 0201.';

create index if not exists workout_templates_athlete_position
  on public.workout_templates (athlete_id, position);

create or replace function public.workout_templates_list()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(x.obj order by (x.position is not null), x.position, x.last_used_at desc nulls last, x.created_at desc), '[]'::jsonb)
    from (
      select t.created_at,
             t.position,
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

-- `p_ids` is the whole list, top to bottom. An id that is not the caller's is ignored by the
-- `athlete_id` predicate rather than raised on — the same template can have been deleted on another
-- device a second ago, and refusing the whole order for that would lose the athlete's work.
create or replace function public.workout_templates_reorder(p_ids uuid[])
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_placed int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  update public.workout_templates t
     set position = (o.ord - 1)::int
    from unnest(p_ids) with ordinality as o(template_id, ord)
   where t.id = o.template_id
     and t.athlete_id = v_uid;
  get diagnostics v_placed = row_count;

  return jsonb_build_object('ok', true, 'placed', v_placed);
end;
$$;

comment on function public.workout_templates_reorder(uuid[]) is
  'Save the athlete''s template order: p_ids top to bottom becomes position 0..n-1. Security invoker; rows that are not the caller''s are skipped, not raised on. Migration 0201.';

grant execute on function public.workout_templates_reorder(uuid[]) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — self-check
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'workout_templates' and column_name = 'position'
  ) then
    raise exception '0201 self-check: workout_templates.position was not added';
  end if;

  if to_regprocedure('public.workout_templates_reorder(uuid[])') is null then
    raise exception '0201 self-check: workout_templates_reorder was not created';
  end if;

  -- Invoker, like every template read and write: a definer function would update rows as the owner and
  -- the athlete_id predicate would be the only thing between one athlete and another's list.
  if exists (
    select 1 from pg_proc
     where oid = 'public.workout_templates_reorder(uuid[])'::regprocedure and prosecdef
  ) then
    raise exception '0201 self-check: workout_templates_reorder must be security invoker';
  end if;

  -- The live list function must be the NEW body — read from the database, not from this file.
  if pg_get_functiondef('public.workout_templates_list()'::regprocedure) not like '%x.position is not null%' then
    raise exception '0201 self-check: workout_templates_list() does not sort by position';
  end if;

  raise notice '0201 self-check passed — position column, reorder function and new list sort are live';
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — report (read-only)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- PREDICTED: templates = however many exist (tens), placed = 0, athletes_with_an_order = 0.
-- Nothing has ever written `position` — the only writer is the Reorder sheet, which calls the function
-- this file creates. A non-zero `placed` on the first run means something else is writing the column.

select count(*)                                              as templates,
       count(*) filter (where position is not null)          as placed,
       count(distinct athlete_id) filter (where position is not null) as athletes_with_an_order
  from public.workout_templates;
