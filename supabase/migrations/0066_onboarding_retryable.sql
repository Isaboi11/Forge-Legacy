-- Forge Legacy — 0066: make finishing onboarding retryable
--
-- THE BUG. `complete_onboarding` (0008) ends with an unconditional `insert into chapters`, and
-- `chapters_one_active_per_athlete` is a unique index over active chapters. So the function succeeds
-- exactly once per athlete and raises 23505 on every subsequent call.
--
-- That is fine while the happy path holds, and traps an athlete the moment it doesn't. If the write
-- lands but the client doesn't navigate — a refetch that fails, a reload, a closed tab, a flaked
-- network on the response rather than the request — the athlete is left on the onboarding screen with
-- a complete profile, an active Chapter I, and an "Enter Forge" button that can now only ever fail.
-- Pressing it again is the one thing they will do, and it is the one thing guaranteed not to work.
--
-- THE FIX. Insert Chapter I only when no active chapter exists. The profile update was always
-- idempotent; now the whole function is, so retrying is safe and finishing twice is a no-op rather
-- than an error. `onboarded_at` is refreshed on each call, which is harmless — the boot router only
-- tests it for null.
--
-- Atomicity is unchanged: a plpgsql body is still one transaction, so a genuine failure still rolls
-- back whole. This removes a false failure, not a real one.
--
-- Depends on 0008. Idempotent (twice over). RUN ANY TIME.

create or replace function complete_onboarding(
  p_name         text,
  p_first_name   text,
  p_handle       text,
  p_initials     text,
  p_sex          sex,
  p_avatar_url   text,
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

  -- The athlete's row is minted by `handle_new_user()` on signup, so zero rows updated means the
  -- trigger never fired. Failing loudly beats silently onboarding a profile that doesn't exist.
  if not found then
    raise exception 'no profile row for this account';
  end if;

  -- Chapter I — silent, active, empty (ONB-D14). Only if they don't already have an active chapter:
  -- a second call is a retry, not a request for a second chapter.
  if not exists (select 1 from chapters where athlete_id = v_uid and is_active) then
    insert into chapters (athlete_id, name, start_date, is_active, workout_count, honor_count)
    values (v_uid, p_chapter_name, current_date, true, 0, 0);
  end if;
end;
$$;
