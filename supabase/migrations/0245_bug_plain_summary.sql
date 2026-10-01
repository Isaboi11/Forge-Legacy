-- 0245 — Bug board: a plain-English summary on every bug (PO 2026-09-29)
--
-- PO: *"it's really, really wordy … a really dumbed down version of what the bug is … why it's happening and
-- what we're going to do to fix it … see more to dive deeper … who it affected, or if it's affecting
-- everyone."* The QA write-ups are engineer notes (file paths, line numbers). They stay exactly as they are
-- (they are what "Copy for Claude" hands a coding session); the summary sits ABOVE them.
--
-- Written by the `bug-plain` Edge Function (Claude) the first time the owner opens a bug with none, and
-- again when the report's title or detail changes (`plain_stale`). PO chose AI over hand-written, 09-29.
--
--   ops_bugs.plain  jsonb  { what, why, fix, scope: everyone|some|one|unknown, who, model, src, at }
--                          `src` = ops_bug_plain_src(title, detail) when written — the staleness check.
--   admin_bug_context(id)        the bug + every report merged into it (handle, platform, version) + crash
--                                reach, so the summary can say WHO. Admin only.
--   admin_bug_plain_save(id, j)  stores the summary; the server stamps `src` and `at`, never the caller.
--   admin_bugs                   0238's body COPIED (0238 is the last to define it), plus `plain` and
--                                `plain_stale` in the row select. Nothing else changed.
--
-- No service key anywhere: the Edge Function calls both RPCs AS THE OWNER, and admin_guard() refuses
-- anyone else. Safe to run twice.

begin;

-- 1. The column ─────────────────────────────────────────────────────────────────────────────────────
alter table public.ops_bugs add column if not exists plain jsonb;

comment on column public.ops_bugs.plain is
  '0245: plain-English summary written by the bug-plain Edge Function — { what, why, fix, scope, who, model, src, at }. src = ops_bug_plain_src(title, detail) when written; admin_bugs.plain_stale compares it.';

-- 2. The staleness fingerprint ──────────────────────────────────────────────────────────────────────
create or replace function public.ops_bug_plain_src(p_title text, p_detail text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select md5(coalesce(p_title, '') || E'\n' || coalesce(p_detail, ''));
$$;
revoke all on function public.ops_bug_plain_src(text, text) from public;

-- 3. The board, now carrying the summary (0238 verbatim + two select columns) ──────────────────────
create or replace function public.admin_bugs(
  p_status text default null,
  p_severity text default null,
  p_q text default null,
  p_limit int default 400
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_status text := nullif(btrim(coalesce(p_status, '')), '');
  v_sev    text := nullif(btrim(coalesce(p_severity, '')), '');
  v_q      text := nullif(btrim(coalesce(p_q, '')), '');
  v_limit  int  := least(greatest(coalesce(p_limit, 400), 1), 1000);
  v_out    jsonb;
begin
  perform public.admin_guard();

  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(b) order by
                        case b.severity when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,
                        b.created_at desc)
                      from (
                        select id, source, report, ref, origin, title, severity, area, round, detail, status, note,
                               created_at, updated_at, closed_at,
                               -- 0245: the plain-English summary, and whether the report changed under it.
                               plain,
                               (plain is not null and plain ->> 'src' is distinct from public.ops_bug_plain_src(title, detail)) as plain_stale
                          from public.ops_bugs
                         where (v_status is null
                                or (v_status = 'active' and status in ('open', 'in_progress'))
                                or status = v_status)
                           and (v_sev is null or severity = v_sev)
                           and (v_q is null or title ilike '%' || v_q || '%' or ref ilike v_q || '%'
                                or area ilike '%' || v_q || '%' or detail ilike '%' || v_q || '%')
                         order by case severity when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,
                                  created_at desc
                         limit v_limit) b), '[]'::jsonb),
    -- Counts span the whole board, never the filtered page (the admin_feedback rule).
    'counts', (select jsonb_build_object(
                 'total',       count(*),
                 'open',        count(*) filter (where status = 'open'),
                 'in_progress', count(*) filter (where status = 'in_progress'),
                 'fixed',       count(*) filter (where status = 'fixed'),
                 'wont_fix',    count(*) filter (where status = 'wont_fix'),
                 'active_critical', count(*) filter (where status in ('open', 'in_progress') and severity = 'critical'),
                 'active_high',     count(*) filter (where status in ('open', 'in_progress') and severity = 'high'),
                 'active_medium',   count(*) filter (where status in ('open', 'in_progress') and severity = 'medium'),
                 'active_low',      count(*) filter (where status in ('open', 'in_progress') and severity = 'low'),
                 'fixed_7d',    count(*) filter (where status = 'fixed' and closed_at > now() - interval '7 days'))
                 from public.ops_bugs),
    'areas', coalesce((select jsonb_agg(x order by x.n desc) from (
                 select area, count(*) as n from public.ops_bugs
                  where status in ('open', 'in_progress') and area is not null group by area) x), '[]'::jsonb),
    'feedback_new', (select count(*) from public.feedback where status = 'NEW' and kind = 'BUG'),
    'errors_new',   (select count(distinct c.fingerprint) from public.client_errors c
                      left join public.client_error_status s on s.fingerprint = c.fingerprint
                     where coalesce(s.status, 'NEW') = 'NEW' and c.received_at > now() - interval '14 days')
  ) into v_out;

  return v_out;
end;
$$;

-- 4. Everything the summary is written from ────────────────────────────────────────────────────────
/*
 * The bug, plus every report under it: its own origin and each merged link. Reports come from
 * admin_reports_inbox and crash reach from admin_crashes, so "who" is read exactly the way the board's
 * own tabs read it. Both re-run admin_guard as the same caller.
 */
create or replace function public.admin_bug_context(p_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_bug     public.ops_bugs;
  v_origins text[];
begin
  perform public.admin_guard();

  select * into v_bug from public.ops_bugs b where b.id = p_id;
  if not found then
    raise exception 'bug % not found', p_id using errcode = 'P0002';
  end if;

  select array_remove(array_append(coalesce(array_agg(l.origin), '{}'::text[]), v_bug.origin), null)
    into v_origins
    from public.ops_bug_links l
   where l.bug_id = p_id;

  return jsonb_build_object(
    'bug', jsonb_build_object(
      'id', v_bug.id, 'ref', v_bug.ref, 'title', v_bug.title, 'severity', v_bug.severity, 'area', v_bug.area,
      'source', v_bug.source, 'report', v_bug.report, 'detail', v_bug.detail, 'note', v_bug.note,
      'status', v_bug.status, 'created_at', v_bug.created_at),
    'reports', coalesce((select jsonb_agg(jsonb_build_object(
                   'channel', r ->> 'channel', 'handle', r ->> 'handle', 'platform', r ->> 'platform',
                   'version', r ->> 'version', 'device', r ->> 'device', 'screen', r ->> 'screen',
                   'body', left(r ->> 'body', 1500), 'created_at', r ->> 'created_at'))
                 from jsonb_array_elements(public.admin_reports_inbox(500)) r
                where r ->> 'origin' = any (v_origins)), '[]'::jsonb),
    'crashes', coalesce((select jsonb_agg(jsonb_build_object(
                   'title', c ->> 'title', 'events', (c ->> 'events')::int, 'people', (c ->> 'people')::int,
                   'version', c ->> 'version', 'last_seen', c ->> 'last_seen'))
                 from jsonb_array_elements(public.admin_crashes(365)) c
                where c ->> 'origin' = any (v_origins)), '[]'::jsonb));
end;
$$;

-- 5. Storing it ─────────────────────────────────────────────────────────────────────────────────────
/* Keeps only the fields the board reads; `src` and `at` are stamped here, from the row as it is now. */
create or replace function public.admin_bug_plain_save(p_id uuid, p_plain jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_p jsonb := coalesce(p_plain, '{}'::jsonb);
begin
  perform public.admin_guard();

  if coalesce(v_p ->> 'scope', '') not in ('everyone', 'some', 'one', 'unknown') then
    raise exception 'scope must be everyone, some, one or unknown' using errcode = '22023';
  end if;

  update public.ops_bugs b
     set plain = jsonb_build_object(
                   'what',  left(coalesce(v_p ->> 'what', ''), 600),
                   'why',   left(coalesce(v_p ->> 'why', ''), 600),
                   'fix',   left(coalesce(v_p ->> 'fix', ''), 600),
                   'scope', v_p ->> 'scope',
                   'who',   left(coalesce(v_p ->> 'who', ''), 300),
                   'model', left(coalesce(v_p ->> 'model', ''), 80),
                   'src',   public.ops_bug_plain_src(b.title, b.detail),
                   'at',    now())
   where b.id = p_id;

  if not found then
    raise exception 'bug % not found', p_id using errcode = 'P0002';
  end if;
end;
$$;

-- 6. Grants — revoke from PUBLIC; the guard refuses a signed-in non-admin ──────────────────────────
do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_bugs(text, text, text, int)',
    'admin_bug_context(uuid)',
    'admin_bug_plain_save(uuid, jsonb)'
  ] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

commit;
