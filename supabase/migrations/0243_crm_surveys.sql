-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0243 — CRM SURVEYS (Facebook-group survey answers → the CRM's Surveys page)
--
-- PO 2026-09-29: "Can I add the results to the CRM somehow? A survey space?" — answers arrive on their
-- own (PO chose automatic over CSV upload), and the early-access emails land in Contacts (PO chose that
-- too). Governed by `Docs/Admin-Analytics-Amendment-002-Business-CRM.md` (AA-D22, added with this).
--
-- ══ HOW ANSWERS GET HERE ══
--
--   The survey is a Google Form. A small Apps Script inside the form (the CRM's Surveys page hands it
--   over, filled in) calls `survey_intake()` through PostgREST with the PUBLIC anon key on every submit
--   — the same path the landing site's waitlist uses (0215). No Edge Function, no service key.
--   The script proves which survey it is with that survey's `intake_token`: 64 random hex characters,
--   readable only through `admin_survey()`. A call without a known token writes nothing.
--
-- ══ WHAT IT ADDS ══
--
--   Tables (RLS ON, ZERO policies — AA-D6; written only by survey_intake, read only by admin_* functions):
--     ops_surveys           — one row per survey: title, form link, token, the form's questions
--     ops_survey_responses  — one row per submitted form; re-sending the same response updates it
--   crm_contacts.source gains 'survey' (the check constraint is widened; nothing else about Contacts moves).
--
--   Functions:
--     survey_intake(text, jsonb)           ← anon + authenticated; token-checked, size-capped
--     admin_surveys · admin_survey · admin_survey_save · admin_survey_delete · admin_survey_hide
--                                          ← each opens with `perform public.admin_guard()` (AA-D5)
--
-- ══ ⚠ NOTHING HERE CHANGES AN APPLIED FUNCTION ══
--
--   admin_contacts / admin_contact_save / admin_contact_delete (0238) are untouched. A survey contact is
--   `source <> 'manual'`, so the existing delete already marks it inactive rather than deleting it.
--
-- ══ ⚠ REMOVING A RESPONSE HIDES IT ══
--
--   "Remove" sets hidden_at instead of deleting, so the script's "send everything again" (sendAll) can
--   never bring back a test answer the PO took out.
--
-- Safe to run twice. Pasted as a whole via `supabase/apply/pending-0243.sql`.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.ops_surveys (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (length(title) between 1 and 200),
  form_url        text check (form_url is null or length(form_url) <= 500),
  -- What the form's script sends to prove which survey it is. Two uuids' worth of randomness, no dashes.
  intake_token    text not null unique
                  default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  -- The form's questions as its script last sent them: [{ title, type, choices[] }], in form order.
  questions       jsonb not null default '[]'::jsonb,
  last_intake_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.ops_surveys enable row level security;

create table if not exists public.ops_survey_responses (
  id            uuid primary key default gen_random_uuid(),
  survey_id     uuid not null references public.ops_surveys (id) on delete cascade,
  -- Google Forms' own response id, so a re-send (edit, or sendAll) updates instead of duplicating.
  response_id   text not null check (length(response_id) <= 200),
  submitted_at  timestamptz not null,
  -- [{ q, a }] in form order; a = text, or an array of text for a checkbox question.
  answers       jsonb not null default '[]'::jsonb,
  email         text check (email is null or length(email) <= 254),
  hidden_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (survey_id, response_id)
);

create index if not exists ops_survey_responses_survey_idx on public.ops_survey_responses (survey_id, submitted_at desc);

alter table public.ops_survey_responses enable row level security;

comment on table public.ops_surveys is 'CRM surveys (0243, AA-D22). RLS on, no policies; intake_token read only via admin_survey().';
comment on table public.ops_survey_responses is 'CRM survey answers (0243). Written only by survey_intake(); RLS on, no policies.';

-- Contacts can now come from a survey.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'crm_contacts_source_check'
                    and pg_get_constraintdef(oid) like '%survey%') then
    alter table public.crm_contacts drop constraint if exists crm_contacts_source_check;
    alter table public.crm_contacts add constraint crm_contacts_source_check
      check (source in ('manual', 'testflight_form', 'trainer_seat', 'survey'));
  end if;
end $$;

-- The first survey — the Facebook-group one the PO published 09-29.
insert into public.ops_surveys (title, form_url)
select 'What do you love (and hate) about workout apps?', 'https://forms.gle/BukyU3tJE6HsXcAP9'
 where not exists (select 1 from public.ops_surveys where form_url = 'https://forms.gle/BukyU3tJE6HsXcAP9');

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. INTAKE — the ONLY write path for answers. Called by the form's Apps Script with the anon key.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * p_payload = { questions: [{ title, type, choices[] }], response: { id, submitted_at, answers: [{ q, a }] } }
 *
 * Everything is rebuilt from the input with hard caps (60 questions, 40 choices, 500 chars a label, 4000
 * an answer, 64 KB overall), never stored as sent. An email answer (a question whose title says "email"
 * and whose answer looks like one) also becomes — or tags — a Contact.
 */
create or replace function public.survey_intake(p_token text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_survey    public.ops_surveys%rowtype;
  v_resp      jsonb;
  v_rid       text;
  v_at        timestamptz;
  v_answers   jsonb;
  v_questions jsonb;
  v_email     text;
  v_new       boolean;
  v_contact   uuid;
begin
  if p_payload is null or length(p_payload::text) > 65536 then
    raise exception 'payload too large' using errcode = '22023';
  end if;

  select * into v_survey from public.ops_surveys s where s.intake_token = btrim(coalesce(p_token, ''));
  if not found then
    raise exception 'unknown survey' using errcode = '42501';
  end if;

  -- The questions, when sent (the script sends them every time, so an edited form stays in step).
  if jsonb_typeof(p_payload -> 'questions') = 'array' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'title', left(q.x ->> 'title', 500),
             'type', left(coalesce(q.x ->> 'type', ''), 40),
             'choices', coalesce((select jsonb_agg(left(ch.v, 500) order by ch.o)
                                    from jsonb_array_elements_text(
                                           case when jsonb_typeof(q.x -> 'choices') = 'array' then q.x -> 'choices' else '[]'::jsonb end
                                         ) with ordinality ch(v, o)
                                   where ch.o <= 40), '[]'::jsonb))
             order by q.o), '[]'::jsonb)
      into v_questions
      from jsonb_array_elements(p_payload -> 'questions') with ordinality q(x, o)
     where q.o <= 60 and jsonb_typeof(q.x) = 'object' and coalesce(q.x ->> 'title', '') <> '';

    update public.ops_surveys s
       set questions = v_questions, last_intake_at = now(), updated_at = now()
     where s.id = v_survey.id and v_questions <> '[]'::jsonb;
  end if;

  v_resp := p_payload -> 'response';
  if jsonb_typeof(v_resp) <> 'object' then
    return jsonb_build_object('ok', true, 'saved', false);
  end if;

  v_rid := left(btrim(coalesce(v_resp ->> 'id', '')), 200);
  if v_rid = '' then
    raise exception 'response id missing' using errcode = '22023';
  end if;
  begin
    v_at := (v_resp ->> 'submitted_at')::timestamptz;
  exception when others then
    v_at := null;
  end;

  select coalesce(jsonb_agg(jsonb_build_object(
           'q', left(a.x ->> 'q', 500),
           'a', case jsonb_typeof(a.x -> 'a')
                  when 'array' then coalesce((select jsonb_agg(left(v.t, 500) order by v.o)
                                                from jsonb_array_elements_text(a.x -> 'a') with ordinality v(t, o)
                                               where v.o <= 40), '[]'::jsonb)
                  when 'string' then to_jsonb(left(a.x ->> 'a', 4000))
                  when 'number' then to_jsonb(left(a.x ->> 'a', 4000))
                  else 'null'::jsonb
                end)
           order by a.o), '[]'::jsonb)
    into v_answers
    from jsonb_array_elements(case when jsonb_typeof(v_resp -> 'answers') = 'array' then v_resp -> 'answers' else '[]'::jsonb end)
         with ordinality a(x, o)
   where a.o <= 60 and jsonb_typeof(a.x) = 'object' and coalesce(a.x ->> 'q', '') <> '';

  select lower(btrim(e.x ->> 'a')) into v_email
    from jsonb_array_elements(v_answers) e(x)
   where e.x ->> 'q' ilike '%email%'
     and jsonb_typeof(e.x -> 'a') = 'string'
     and lower(btrim(e.x ->> 'a')) ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
     and length(btrim(e.x ->> 'a')) <= 254
   limit 1;

  insert into public.ops_survey_responses as r (survey_id, response_id, submitted_at, answers, email)
  values (v_survey.id, v_rid, coalesce(v_at, now()), v_answers, v_email)
  on conflict (survey_id, response_id) do update
     set answers = excluded.answers,
         email = excluded.email,
         submitted_at = excluded.submitted_at,
         updated_at = now()
  returning (r.xmax = 0) into v_new;

  update public.ops_surveys s set last_intake_at = now() where s.id = v_survey.id;

  -- The early-access list (PO 09-29): a contact per email, never a second one for the same address.
  if v_email is not null then
    select c.id into v_contact from public.crm_contacts c where lower(c.email) = v_email order by c.created_at limit 1;
    if v_contact is null then
      insert into public.crm_contacts (kind, email, stage, tags, notes, source, source_ref)
      values ('other', v_email, 'lead', array['Survey', 'Early access'],
              left(format('Asked for early access in the survey “%s”.', v_survey.title), 8000),
              'survey', v_survey.id::text || ':' || v_rid)
      on conflict (source, source_ref) where source_ref is not null do nothing;
    else
      update public.crm_contacts c
         set tags = array(select distinct t from unnest(c.tags || array['Survey', 'Early access']) t),
             updated_at = now()
       where c.id = v_contact and not (c.tags @> array['Survey', 'Early access']);
    end if;
  end if;

  return jsonb_build_object('ok', true, 'saved', true, 'new', v_new);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. THE CRM'S READS AND WRITES (AA-D5: admin_guard first, always)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_surveys()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(jsonb_build_object(
            'id', s.id, 'title', s.title, 'form_url', s.form_url, 'created_at', s.created_at,
            'last_intake_at', s.last_intake_at,
            'responses', (select count(*) from public.ops_survey_responses r where r.survey_id = s.id and r.hidden_at is null),
            'emails', (select count(*) from public.ops_survey_responses r where r.survey_id = s.id and r.hidden_at is null and r.email is not null),
            'last_response_at', (select max(r.submitted_at) from public.ops_survey_responses r where r.survey_id = s.id and r.hidden_at is null))
          order by s.created_at desc) from public.ops_surveys s), '[]'::jsonb);
end;
$$;

create or replace function public.admin_survey(p_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v jsonb;
begin
  perform public.admin_guard();
  select jsonb_build_object(
           'id', s.id, 'title', s.title, 'form_url', s.form_url, 'intake_token', s.intake_token,
           'questions', s.questions, 'last_intake_at', s.last_intake_at, 'created_at', s.created_at,
           'hidden', (select count(*) from public.ops_survey_responses r where r.survey_id = s.id and r.hidden_at is not null),
           'rows', coalesce((select jsonb_agg(jsonb_build_object(
                      'id', r.id, 'submitted_at', r.submitted_at, 'answers', r.answers, 'email', r.email)
                    order by r.submitted_at desc)
                    from public.ops_survey_responses r where r.survey_id = s.id and r.hidden_at is null), '[]'::jsonb))
    into v
    from public.ops_surveys s where s.id = p_id;
  if v is null then
    raise exception 'survey % not found', p_id using errcode = 'P0002';
  end if;
  return v;
end;
$$;

create or replace function public.admin_survey_save(p_id uuid, p_patch jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := p_id;
  v_p  jsonb := coalesce(p_patch, '{}'::jsonb);
begin
  perform public.admin_guard();
  if v_id is null then
    insert into public.ops_surveys (title, form_url)
    values (coalesce(nullif(btrim(v_p ->> 'title'), ''), 'Untitled survey'), nullif(btrim(v_p ->> 'form_url'), ''))
    returning id into v_id;
    return v_id;
  end if;
  update public.ops_surveys s
     set title    = case when v_p ? 'title' then coalesce(nullif(btrim(v_p ->> 'title'), ''), s.title) else s.title end,
         form_url = case when v_p ? 'form_url' then nullif(btrim(v_p ->> 'form_url'), '') else s.form_url end,
         updated_at = now()
   where s.id = v_id;
  if not found then
    raise exception 'survey % not found', v_id using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

/* Deletes the survey and its answers. Contacts it created stay — they are the point of the survey. */
create or replace function public.admin_survey_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  delete from public.ops_surveys where id = p_id;
end;
$$;

create or replace function public.admin_survey_hide(p_response uuid, p_hidden boolean default true)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  update public.ops_survey_responses r
     set hidden_at = case when p_hidden then now() else null end, updated_at = now()
   where r.id = p_response;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. GRANTS — revoke from PUBLIC; the guard refuses a signed-in non-admin (0137's note).
--    survey_intake alone goes to anon: the Google Form's script is not signed in.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

revoke all on public.ops_surveys, public.ops_survey_responses from anon, authenticated;

revoke all on function public.survey_intake(text, jsonb) from public;
grant execute on function public.survey_intake(text, jsonb) to anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_surveys()',
    'admin_survey(uuid)',
    'admin_survey_save(uuid, jsonb)',
    'admin_survey_delete(uuid)',
    'admin_survey_hide(uuid, boolean)'
  ] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
