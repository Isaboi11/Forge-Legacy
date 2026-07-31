-- Forge Legacy — 0093: an invite carries the workout, not a pointer to it
--
-- 0092 let an invite name a template. It could not offer the most likely thing you would ask someone to
-- do with you: the session you already have planned today.
--
-- ══ WHY A SNAPSHOT AND NOT A REFERENCE ══
--
-- The obvious shape is `program_id` + a session index. It cannot work, for two independent reasons:
--
--   1. THEY MAY NOT OWN THE PROGRAM. Pointing at Powerbuilding II day 3 is meaningless to someone who
--      has never run Powerbuilding II, and buying them a copy of it is not what "train with me" means.
--   2. "NEXT SESSION" IS PER-ATHLETE. It resolves from each athlete's own completed count, so the same
--      pointer would open a different workout for each of you — which is precisely not training together.
--
-- So the invite carries the SHAPE, snapshotted at send time, in the same `[{catalogKey, name, sets,
-- targetReps}]` form templates use. What you asked them to do is what they get, whatever your program
-- does afterwards. Same reasoning as a frozen challenge result (CS-D17): the record of an offer should
-- not move because its source did.
--
-- `template_id` stays as PROVENANCE — "this came from your Leg Day A" — not as the thing the guest reads.
-- Empty `exercises` means a freestyle session under a shared name, which is a real third option, not a
-- missing value.
--
-- Depends on 0092 (workout_invites). Idempotent. RUN AFTER 0092.

alter table public.workout_invites add column if not exists exercises jsonb not null default '[]'::jsonb;

comment on column public.workout_invites.exercises is
  'The workout, snapshotted at send time: [{catalogKey, name, sets, targetReps}]. NOT a reference — the recipient may not own the source program, and "next session" resolves per athlete, so a pointer would open a different workout for each of them. Empty = freestyle under a shared name.';

-- ── The invite read has to return it ──────────────────────────────────────────
-- Identical to 0092's function apart from carrying `exercises` through, and counting the shape from the
-- invite itself rather than from a template that may not be there.
create or replace function public.workout_invite(p_invite uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
           'id', i.id,
           'from_id', i.from_id,
           'from_name', coalesce(p.name, 'Athlete'),
           'from_avatar_url', p.avatar_url,
           'workout_name', i.workout_name,
           'template_id', i.template_id,
           'exercises', i.exercises,
           'template_summary', case
             when jsonb_array_length(i.exercises) > 0 then jsonb_build_object(
               'lifts', jsonb_array_length(i.exercises),
               'sets', (select coalesce(sum((e->>'sets')::int), 0) from jsonb_array_elements(i.exercises) e)
             )
             else null
           end,
           'note', i.note,
           'status', i.status,
           'created_at', i.created_at
         )
    from public.workout_invites i
    join public.profiles p on p.id = i.from_id
   where i.id = p_invite
     and (i.to_id = auth.uid() or i.from_id = auth.uid());
$$;
