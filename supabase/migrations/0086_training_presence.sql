-- Forge Legacy — 0086: training presence ("Live Now")
--
-- Home's Your Circle has shown a Live Now block since the first build, fed by a fixture that named two
-- squad-mates and claimed they were mid-workout. Nothing could ever have been true there: an in-progress
-- workout lived only in a client-side session, and `workouts` gets its row at SAVE time — so the database
-- knew who had finished and never who had started. This is the missing half.
--
-- ══ TWO COLUMNS, NOT A TABLE ══
--
-- Presence is one fact per athlete that is almost always null, replaced rather than appended, and never
-- historical. A row per session would accumulate a log of every workout anyone ever began — including the
-- abandoned ones — which is a record the product deliberately does not keep (CS-D3's instinct: nothing
-- surfaces a thing someone didn't finish).
--
-- ══ STALENESS IS THE HARD PART ══
--
-- An app that dies mid-set never clears its own flag, so "training since" alone leaves a ghost training
-- forever. Three guards, and the last is the one that matters:
--
--   1. The session ends the status on finish and on abandon.
--   2. A client-side stale timer already ends the session after its own timeout.
--   3. `training_now()` will not report a start older than 4 HOURS, whatever the column says. So a ghost
--      expires on its own, and nobody has to trust a client to have cleaned up after itself.
--
-- ══ WHO CAN SEE IT ══
--
-- `training` joins `profiles.visibility` (0022) as a section, so it rides the audience ladder every other
-- section uses — everyone / squads / friends / private — and `private` IS the off switch. Default is
-- `squads`: the people you train alongside see it, strangers never do. No new privacy concept, no second
-- settings surface, and `vis_clears()` (0069) already implements the rule.
--
-- Depends on 0022 (visibility), 0029 (squads), 0069 (vis_clears), 0073 (friendships). Idempotent.
-- RUN AFTER 0085.

alter table public.profiles add column if not exists training_since timestamptz;
alter table public.profiles add column if not exists training_label text;

comment on column public.profiles.training_since is
  'When the current workout started, or null. Presence only — never history. Reads ignore anything older than 4h so a crashed client cannot leave a ghost training forever.';
comment on column public.profiles.training_label is
  'The workout being trained ("Pull Day B"), shown beside the name in Live Now.';

-- Only ever your own row, and only ever these two columns.
create or replace function public.set_training_status(p_active boolean, p_label text default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.profiles
     set training_since = case when p_active then now() else null end,
         training_label = case when p_active then nullif(btrim(coalesce(p_label, '')), '') else null end
   where id = auth.uid();
end;
$$;

-- ── Who is training right now ─────────────────────────────────────────────────
-- Squad-mates and accepted friends, each gated on THEIR OWN `training` audience. Definer, because the
-- gate has to read a column the viewer cannot select directly — the whole point is that the decision
-- happens here rather than shipping everyone's status to a device that promises to look away.
create or replace function public.training_now()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cut timestamptz;
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  v_cut := now() - interval '4 hours';

  return coalesce((
    select jsonb_agg(t.obj order by
             -- Squad first: the people you actually train alongside outrank a friend you have never
             -- lifted with. Then whoever started most recently, so the row keeps moving.
             case when t.source = 'squad' then 0 else 1 end,
             t.training_since desc)
      from (
        select distinct on (p.id)
               p.id,
               p.training_since,
               case when sm.squad_id is not null then 'squad' else 'friend' end as source,
               jsonb_build_object(
                 'user_id', p.id,
                 'name', coalesce(p.name, 'Athlete'),
                 'avatar_url', p.avatar_url,
                 'label', p.training_label,
                 'started_at', p.training_since,
                 'source', case when sm.squad_id is not null then 'squad' else 'friend' end,
                 'squad_name', s.name
               ) as obj
          from public.profiles p

          -- A squad we share. `distinct on` keeps one row per athlete when we share several.
          left join lateral (
            select a.squad_id
              from public.squad_members a
              join public.squad_members b on b.squad_id = a.squad_id
             where a.user_id = p.id and b.user_id = v_uid
             limit 1
          ) sm on true
          left join public.squads s on s.id = sm.squad_id

         where p.id <> v_uid
           and p.training_since is not null
           and p.training_since > v_cut
           and (
             sm.squad_id is not null
             or exists (
               select 1 from public.friendships f
                where f.status = 'ACCEPTED'
                  and ((f.low_id = v_uid and f.high_id = p.id) or (f.low_id = p.id and f.high_id = v_uid))
             )
           )
           -- Their audience, not ours. `private` is the off switch.
           and public.vis_clears(
                 coalesce(p.visibility->>'training', 'squads'),
                 case when sm.squad_id is not null then 'squad' else 'friend' end
               )
         order by p.id, p.training_since desc
      ) t
  ), '[]'::jsonb);
end;
$$;

comment on function public.training_now() is
  'Squad-mates and accepted friends currently training, squad first then most recent. Gated on each athlete''s own visibility.training audience (default squads; private = off). Ignores starts older than 4h.';
