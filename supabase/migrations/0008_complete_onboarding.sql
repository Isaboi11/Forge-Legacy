-- Forge Legacy — 0008: complete_onboarding RPC (Login + Onboarding, Gate B)
-- The finish transaction, ATOMIC. A plpgsql function body is one transaction, so the profile update,
-- the Chapter I insert, and the onboarded_at commit either ALL land or NONE do — a fresh athlete can
-- never be stranded half-created (profile set but no chapter, or onboarded with no chapter).
--
-- security invoker → runs as the caller; the existing owner-scoped RLS on profiles/chapters applies
-- (both key off auth.uid()). The one-active-chapter partial unique index makes a duplicate Chapter I
-- insert fail — which correctly rolls the whole thing back (proven by the rollback test).

create or replace function complete_onboarding(
  p_name         text,
  p_first_name   text,
  p_handle       text,          -- nullable (username skipped)
  p_initials     text,
  p_sex          sex,
  p_avatar_url   text,          -- nullable (no photo)
  p_athlete_type athlete_type,
  p_environment  text,
  p_chapter_name text
) returns void
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update profiles set
    name         = p_name,
    first_name   = p_first_name,
    handle       = p_handle,
    initials     = p_initials,
    sex          = p_sex,
    avatar_url   = p_avatar_url,
    athlete_type = p_athlete_type,
    environment  = p_environment,
    onboarded_at = now(),
    updated_at   = now()
  where id = v_uid;

  -- Chapter I — silent, active, empty (ONB-D14). If an active chapter already exists, the partial
  -- unique index raises here and the update above rolls back with it.
  insert into chapters (athlete_id, name, start_date, is_active, workout_count, honor_count)
  values (v_uid, p_chapter_name, current_date, true, 0, 0);
end;
$$;
