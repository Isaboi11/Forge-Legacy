-- Forge Legacy — 0090: a photo can be OF a lift
--
-- Most Legacy photos belong to a chapter and nothing narrower — a progress shot, a gym, a moment. A PR
-- photo is different: it is a picture of a specific lift at a specific weight, and filing it under
-- "somewhere in Chapter III" loses the only thing that made it worth taking.
--
-- The workout logger already knows. It detects a PR mid-set and opens a card that says "Capture the
-- moment — add a photo or video to your legacy", with a button that has always just dismissed. This is
-- the column that lets that button mean something.
--
-- ══ ONE COLUMN, NOT A JOIN ══
--
-- The obvious shape is `personal_record_id`, and it cannot work: `personal_records` rows are written by
-- `save_workout` at the END of a session, so at the moment the PR fires — which is the moment worth
-- photographing — there is no row to point at. The exercise's catalog key is available immediately, is
-- stable, and does not depend on the workout ever being saved.
--
-- The LOAD is deliberately not stored. `personal_records` already holds what was lifted on that date for
-- that exercise, so duplicating it here would be a second copy free to drift from the first. Exercise +
-- date is enough to recover it, and recovering a fact beats storing it twice.
--
-- Null for the ordinary case, which is most photos.
--
-- Depends on 0085 (chapter_photos). Idempotent. RUN AFTER 0089.

alter table public.chapter_photos add column if not exists exercise text;

comment on column public.chapter_photos.exercise is
  'Catalog key of the lift this photo is OF, when it is of one (a PR shot). Null for an ordinary chapter photo. Not a foreign key to personal_records: those rows are written at save time, and the moment worth photographing is mid-set, before one exists. The load is recoverable from personal_records by exercise + date rather than copied here.';

create index if not exists chapter_photos_exercise on public.chapter_photos (athlete_id, exercise, taken_on desc)
  where exercise is not null;

-- ── The album read has to return it ───────────────────────────────────────────
-- Identical to 0085's function apart from carrying `exercise` through, so the gallery and the viewer can
-- say what a PR shot is a photo OF. Without this the column would be written and never read.

create or replace function public.chapter_album(p_chapter uuid)
returns jsonb
language plpgsql
security invoker
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c     public.chapters%rowtype;
begin
  if v_uid is null then
    return null;
  end if;

  select * into c from public.chapters where id = p_chapter and athlete_id = v_uid;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'chapter_id', c.id,
    'name', c.name,
    'subtitle', c.reflection,
    'start_date', c.start_date,
    'end_date', coalesce(c.end_date, c.sealed_at::date),
    'is_active', c.is_active,
    'sealed', c.sealed_at is not null,
    'weeks', greatest(1, ceil((
      coalesce(c.end_date, c.sealed_at::date, current_date) - c.start_date
    )::numeric / 7)::int),

    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'url', p.url,
               'taken_on', p.taken_on,
               'pose', p.pose,
               'caption', p.caption,
               'is_video', p.is_video,
               'is_starred', p.is_starred,
               'role', p.role,
               'exercise', p.exercise,
               -- The event for this photo's DATE. Chapter boundaries first, then the day's best PR.
               -- Null on an ordinary day, which is most of them.
               'event', case
                 when p.taken_on = c.start_date then 'Chapter opened'
                 when c.sealed_at is not null and p.taken_on = c.sealed_at::date then 'Chapter sealed'
                 else (
                   -- `exercise` is a catalog slug, so it is spoken rather than printed raw, and the load
                   -- keeps a half-plate without growing a ".0": FM drops trailing fraction zeros and the
                   -- rtrim removes the bare decimal point it leaves behind. 405 → "405", 227.5 → "227.5".
                   select 'PR · ' || initcap(replace(pr.exercise, '-', ' ')) || ' '
                          || rtrim(to_char(pr.load_value, 'FM999999.99'), '.')
                     from public.personal_records pr
                    where pr.athlete_id = v_uid
                      and pr.achieved_on = p.taken_on
                      and pr.measure_kind = 'load'
                    order by pr.load_value desc nulls last limit 1
                 )
               end
             ) order by p.taken_on desc, p.created_at desc)
        from public.chapter_photos p
       where p.chapter_id = c.id
    ), '[]'::jsonb)
  );
end;
$$;
