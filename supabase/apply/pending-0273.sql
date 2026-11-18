-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0273: "How did you find Forge Legacy?"
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded or a create-or-replace, and §3 is read-only. The editor
-- shows only the LAST result — that is §3.
--
-- Independent of the other pending bundles: it adds one table and three functions, and changes ONE line
-- of the signup alert (0266) — nothing else of 0266's.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO 2026-11-17: two people nobody knew signed up and nothing recorded how they found us. Home now asks
-- once, as a one-tap card — Instagram · TikTok · A friend · App Store search · Google or the web · Other —
-- with a Skip.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  · `athlete_found_via` — the answer, one row per athlete, first answer wins (Skip is saved as
--       'skipped' so the card stops asking). No client can read or write it except through:
--     · `found_via_owed()` (Home's read) and `set_found_via(source)` (Home's write) — signed-in only.
--     · the signup alert adds the answer when it is already in:
--         New athlete — Free     Jane Doe (@jane) signed up · found us on TikTok
--     · an answer that arrives AFTER that alert went out pushes on its own (athletes onboarded in the
--       last 14 days only, never a skip):
--         How they found us      Jane Doe (@jane) found us on TikTok
-- §2  asserts everything landed and the grants are right. RAISES if not.
-- §3  the 8 most recent onboardings: their answer (none yet) and what their signup push says now.
--
-- ⚠ APPLYING IT SENDS NOTHING AND ASKS NOBODY. The card is in the app update that follows; until a phone
--   has it, nothing calls these functions. Either order is safe: an app that has the card but meets a
--   database without this file simply does not show the card.
-- ⚠ EVERYONE IS ASKED ONCE — the two new athletes, testers, and your own account. Only athletes who
--   onboarded in the last 14 days ring your phone when they answer.
-- ⚠ Tapping the "How they found us" push opens Inbox on a phone without the update; with it, /admin.
--
-- ══ PREDICTED §3 (2026-11-17) ══
--   answers = 0 · job_active = true · answer is empty on all 8 rows · body is exactly what 0266's §3
--   showed for the same people (nothing appended, because nobody has answered).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0273_found_via.sql)
-- ───────────────────────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. The answer ───────────────────────────────────────────────────────────────────────────────────
create table if not exists public.athlete_found_via (
  athlete_id  uuid        primary key references public.profiles (id) on delete cascade,
  source      text        not null,
  answered_at timestamptz not null default now(),
  constraint athlete_found_via_source_check
    check (source in ('instagram', 'tiktok', 'friend', 'app_store', 'web', 'other', 'skipped'))
);

alter table public.athlete_found_via enable row level security;
-- ⚠ No policy on purpose, and no grant: only the definer functions below touch it.
revoke all on table public.athlete_found_via from public, anon, authenticated;

comment on table public.athlete_found_via is
  'How an athlete found Forge Legacy — the one-tap Home question. First answer wins; ''skipped'' counts as an answer. Written only by set_found_via (0273).';

-- ── 2. How the operator push words an answer ────────────────────────────────────────────────────────
create or replace function public.found_via_label(p_source text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_source
           when 'instagram' then 'found us on Instagram'
           when 'tiktok'    then 'found us on TikTok'
           when 'friend'    then 'heard about us from a friend'
           when 'app_store' then 'found us in App Store search'
           when 'web'       then 'found us on Google or the web'
           when 'other'     then 'found us another way'
           when 'skipped'   then 'skipped how they found us'
         end;
$$;

comment on function public.found_via_label(text) is
  'The operator push''s words for a found-via answer. Internal — no client grant (0273).';

-- ── 3. Home's read: is the question still owed? ─────────────────────────────────────────────────────
create or replace function public.found_via_owed()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and exists (select 1 from public.profiles p
                  where p.id = auth.uid() and p.onboarded_at is not null)
     and not exists (select 1 from public.athlete_found_via f
                      where f.athlete_id = auth.uid());
$$;

comment on function public.found_via_owed() is
  'True while the signed-in, onboarded athlete has not answered (or skipped) the found-via question. Home''s read (0273).';

-- ── 4. Home's write ─────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ THE LATE PUSH IS FOR AN ANSWER THE SIGNUP ALERT MISSED. Answered inside the alert's first five minutes,
--   the alert itself carries it (§5) and this files nothing. Answered after it went out — or by someone who
--   onboarded 3–14 days ago, older than the alert's catch-up window — this files its own short push.
--   Older athletes (testers, the PO's own account) are still asked; they just do not ring the operator.
-- ⚠ A PUSH PROBLEM NEVER UNDOES THE ANSWER. The insert into push_outbox is in its own block that swallows
--   errors; the answer row is already written by then.
create or replace function public.set_found_via(p_source text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_at  timestamptz;
begin
  if v_uid is null then
    raise exception 'set_found_via: not signed in' using errcode = '42501';
  end if;
  if p_source is null
     or p_source not in ('instagram', 'tiktok', 'friend', 'app_store', 'web', 'other', 'skipped') then
    raise exception 'set_found_via: unknown source %', p_source using errcode = '22023';
  end if;

  insert into public.athlete_found_via (athlete_id, source)
  values (v_uid, p_source)
  on conflict (athlete_id) do nothing
  returning answered_at into v_at;

  if v_at is null then
    return false; -- answered before; the first answer stands
  end if;

  if p_source <> 'skipped'
     and to_regclass('public.push_outbox') is not null
     and to_regclass('public.push_tokens') is not null then
    begin
      insert into public.push_outbox (user_id, kind, event_at, actor_id, title, body, route)
      select a.user_id,
             'athlete_found_via',
             v_at,
             p.id,
             'How they found us',
             coalesce(nullif(p.name, ''), 'An athlete')
               || coalesce(' (@' || p.handle || ')', '')
               || ' ' || public.found_via_label(p_source),
             '/admin'
        from public.profiles p
        join public.app_admins a on a.user_id <> p.id
       where p.id = v_uid
         and p.onboarded_at > now() - interval '14 days'
         and (p.onboarded_at <= now() - interval '3 days'
              or exists (select 1 from public.push_outbox o
                          where o.kind = 'athlete_signup'
                            and o.actor_id = p.id
                            and o.event_at = p.created_at))
         and exists (select 1 from public.push_tokens t
                      where t.user_id = a.user_id and t.disabled_at is null)
      on conflict do nothing;
    exception
      when others then
        null;
    end;
  end if;

  return true;
end;
$$;

comment on function public.set_found_via(text) is
  'Records the signed-in athlete''s found-via answer (first answer wins; ''skipped'' counts). Files an operator push when the signup alert has already gone without it (0273).';

-- ── 5. The signup alert carries the answer when it is already in ────────────────────────────────────
--
-- 0266's function, unchanged but for the `found_via_label` line and the `left join` (see the header).
create or replace function public.signup_alerts_send()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_n int := 0;
begin
  if to_regclass('public.push_outbox') is null or to_regclass('public.push_tokens') is null then
    return 0;
  end if;

  insert into public.push_outbox (user_id, kind, event_at, actor_id, title, body, route)
  select a.user_id,
         'athlete_signup',
         p.created_at,
         p.id,
         'New athlete — ' || pl.tier,
         coalesce(nullif(p.name, ''), 'Someone')
           || coalesce(' (@' || p.handle || ')', '')
           || ' signed up'
           || coalesce(' · ' || pl.details, '')
           || coalesce(' · ' || public.found_via_label(fv.source), ''),
         '/admin'
    from public.profiles p
    join public.app_admins a on a.user_id <> p.id
    cross join lateral public.admin_plan_of(p.id) pl
    left join public.athlete_found_via fv on fv.athlete_id = p.id
   where p.onboarded_at is not null
     and p.onboarded_at <= now() - interval '5 minutes'
     and p.onboarded_at >  now() - interval '3 days'
     and exists (select 1 from public.push_tokens t
                  where t.user_id = a.user_id and t.disabled_at is null)
     and not exists (select 1 from public.push_outbox o
                      where o.user_id = a.user_id
                        and o.kind = 'athlete_signup'
                        and o.actor_id = p.id
                        and o.event_at = p.created_at)
  on conflict do nothing;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

comment on function public.signup_alerts_send() is
  'Files the operator''s signup push five minutes after an athlete finishes onboarding, so it can say the plan they chose on the plans screen and, once answered, how they found us. Run every minute by cron job forge-signup-alerts. Same dedupe key as 0137''s retired trigger (0266, 0273).';

-- ── 6. Who may call what ────────────────────────────────────────────────────────────────────────────
--
-- ⚠ Supabase grants EXECUTE on every new function to anon and authenticated DIRECTLY, so revoking from
-- PUBLIC alone leaves them callable. Home's two calls are for signed-in athletes only.
revoke execute on function public.found_via_label(text) from public, anon, authenticated;
revoke execute on function public.found_via_owed()      from public, anon;
revoke execute on function public.set_found_via(text)   from public, anon;
revoke execute on function public.signup_alerts_send()  from public, anon, authenticated;
grant  execute on function public.found_via_owed()      to authenticated;
grant  execute on function public.set_found_via(text)   to authenticated;

commit;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ───────────────────────────────────────────────────────────────────────────────────────────────
do $$
declare
  f text;
  r text;
  p text;
begin
  if to_regclass('public.athlete_found_via') is null then
    raise exception '0273 §2: table athlete_found_via was not created';
  end if;
  if not (select c.relrowsecurity from pg_class c where c.oid = 'public.athlete_found_via'::regclass) then
    raise exception '0273 §2: row level security is OFF on athlete_found_via';
  end if;

  foreach f in array array['public.found_via_label(text)', 'public.found_via_owed()',
                           'public.set_found_via(text)', 'public.signup_alerts_send()'] loop
    if to_regprocedure(f) is null then
      raise exception '0273 §2: % was not created', f;
    end if;
  end loop;

  foreach r in array array['anon', 'authenticated'] loop
    foreach p in array array['select', 'insert', 'update', 'delete'] loop
      if has_table_privilege(r, 'public.athlete_found_via', p) then
        raise exception '0273 §2: % can % athlete_found_via directly — the revoke did not take', r, p;
      end if;
    end loop;
    foreach f in array array['public.found_via_label(text)', 'public.signup_alerts_send()'] loop
      if has_function_privilege(r, f, 'execute') then
        raise exception '0273 §2: % can still execute %', r, f;
      end if;
    end loop;
  end loop;

  foreach f in array array['public.found_via_owed()', 'public.set_found_via(text)'] loop
    if has_function_privilege('anon', f, 'execute') then
      raise exception '0273 §2: anon can execute % — signed-in athletes only', f;
    end if;
    if not has_function_privilege('authenticated', f, 'execute') then
      raise exception '0273 §2: authenticated cannot execute % — Home could never ask', f;
    end if;
  end loop;

  if position('athlete_found_via' in (select p2.prosrc from pg_proc p2
                                        where p2.oid = 'public.signup_alerts_send()'::regprocedure)) = 0 then
    raise exception '0273 §2: signup_alerts_send does not read the answer — the replace did not take';
  end if;
  if not exists (select 1 from cron.job where jobname = 'forge-signup-alerts' and active) then
    raise exception '0273 §2: cron job forge-signup-alerts is missing or inactive (0266)';
  end if;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — THE ANSWERS, AND THE SIGNUP PUSH AS IT READS NOW. Read-only.
-- The 8 most recent onboardings. `body` is what the signup job would write for them today, with the
-- answer appended once there is one (predicted: no answers yet, so the same text as 0266's §3).
-- ───────────────────────────────────────────────────────────────────────────────────────────────
select (select count(*) from public.athlete_found_via) as answers,
       (select j.active from cron.job j where j.jobname = 'forge-signup-alerts') as job_active,
       p.onboarded_at::date as onboarded,
       fv.source as answer,
       'New athlete — ' || pl.tier as title,
       coalesce(nullif(p.name, ''), 'Someone') || coalesce(' (@' || p.handle || ')', '') || ' signed up'
         || coalesce(' · ' || pl.details, '')
         || coalesce(' · ' || public.found_via_label(fv.source), '') as body
  from (select p0.id from public.profiles p0
         where p0.onboarded_at is not null
         order by p0.onboarded_at desc
         limit 8) k
  join public.profiles p on p.id = k.id
  cross join lateral public.admin_plan_of(p.id) pl
  left join public.athlete_found_via fv on fv.athlete_id = p.id
 order by p.onboarded_at desc;
