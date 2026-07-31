-- Forge Legacy — 0089: make "Everyone" mean something for Live Workout Status
--
-- 0086 put `training` on the visibility ladder, so Settings → Privacy offers all four audiences for it:
-- Everyone / Squads / Friends / Only me. Three of those work. **Everyone did nothing**, because the only
-- reader was `training_now()`, which by design looks at squad-mates and accepted friends and nobody else.
-- An athlete could set their status to Everyone and remain visible to exactly the same people as before.
--
-- A setting that promises more than it delivers is worse than one that isn't offered, so this is the
-- reader that makes it true: anyone who opens your profile sees you're training, if your audience lets
-- them.
--
-- ══ WHAT "EVERYONE" DOES AND DOESN'T MEAN ══
--
-- It means: a stranger looking at your profile can see you're mid-workout.
-- It does NOT mean: you appear in strangers' Home feeds. `training_now()` stays circle-scoped, because
-- Your Circle is about YOUR circle — a stranger training is not news to you, and a global "who's lifting
-- right now" list is a different product nobody asked for.
--
-- ══ WHY NOT JUST ADD A KEY TO `athlete_profile()` ══
--
-- Presence is volatile and the profile is not. `athlete_profile` is a large `stable` function returning a
-- record that changes when the athlete does something deliberate; training status changes on its own
-- every few minutes and expires on a clock. Bolting one onto the other would mean rewriting a hundred
-- lines to add a field, and would tie a fast-moving fact to a slow-moving read. Separate function,
-- separate cadence — and the profile screen can refresh one without refetching the other.
--
-- Same four-hour staleness floor as `training_now()`: one rule for "is this person actually training",
-- applied in both places, so the two can never disagree.
--
-- Depends on 0022 (visibility), 0069 (vis_clears), 0073 (friendships), 0086 (training_since).
-- Idempotent. RUN AFTER 0088.

create or replace function public.athlete_training_status(p_athlete uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  p       public.profiles%rowtype;
  v_clear text;
begin
  if v_uid is null then
    return null;
  end if;

  select * into p from public.profiles where id = p_athlete;
  if not found then
    return null;
  end if;

  -- Same ladder every other section uses (0069), with `friend` now reachable (0073).
  v_clear := case
    when p.id = v_uid then 'owner'
    when exists (
      select 1 from public.friendships f
       where f.status = 'ACCEPTED'
         and ((f.low_id = v_uid and f.high_id = p.id) or (f.low_id = p.id and f.high_id = v_uid))
    ) then 'friend'
    when exists (
      select 1
        from public.squad_members a
        join public.squad_members b on b.squad_id = a.squad_id
       where a.user_id = v_uid and b.user_id = p_athlete
    ) then 'squad'
    else 'stranger'
  end;

  -- Not cleared: the status never leaves the server. Null is "not yours to read", which the client
  -- renders identically to "not training" — a viewer cannot tell a private athlete from a resting one,
  -- and that is the point.
  if not public.vis_clears(coalesce(p.visibility->>'training', 'squads'), v_clear) then
    return null;
  end if;

  if p.training_since is null or p.training_since <= now() - interval '4 hours' then
    return jsonb_build_object('training', false);
  end if;

  return jsonb_build_object(
    'training', true,
    'label', p.training_label,
    'started_at', p.training_since
  );
end;
$$;

comment on function public.athlete_training_status(uuid) is
  'Whether this athlete is mid-workout, gated on their own visibility.training audience. This is what makes the Everyone option real — training_now() is circle-scoped and always will be.';
