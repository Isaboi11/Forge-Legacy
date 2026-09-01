-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY 0187 — did the duplicate-notification fix land, and which defect were we hitting?
--
-- Read-only. Paste the whole thing, run it, send back the four rows.
--
-- ⚠ ONE QUERY ON PURPOSE. §3 of the bundle is three separate statements and the Supabase SQL editor
-- shows only the LAST one's output, so two of the three answers were invisible. This folds them into a
-- single result: row 1 says whether the migration took, rows 2–4 say what it found.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

with shape as (
  select
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'push_tokens' and column_name = 'device_id')     as col,
    (select count(*) from pg_indexes
      where schemaname = 'public' and indexname = 'push_tokens_device_idx')                           as idx,
    -- ⚠ MUST BE 1. Two means the drop did not take and the old 2-arg push_register_token is still
    --   callable beside the new one, which is the silent half of defect A.
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'push_register_token')                               as sigs,
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'set_training_status' and p.prosrc like '%4 hours%') as hold
),

-- DEFECT A, counted. Each of these athletes receives every notification once per row.
dupe_devices as (
  select t.user_id, count(*) as n
    from public.push_tokens t
   where t.disabled_at is null
   group by t.user_id
  having count(*) > 1
),

-- DEFECT B, counted. Each row is one athlete told about one other athlete's start more than once in a
-- day — different event_at values, so the outbox unique key could not collapse them.
dupe_starts as (
  select o.user_id, o.actor_id, date_trunc('day', o.event_at) as day, count(*) as n
    from public.push_outbox o
   where o.kind = 'squad_training_started'
     and o.created_at > now() - interval '7 days'
   group by 1, 2, 3
  having count(*) > 1
)

select 1 as ord, '0187 applied?' as question,
       case when s.col = 1 and s.idx = 1 and s.sigs = 1 and s.hold = 1
            then 'YES - device_id column, its index, ONE 3-arg push_register_token, and the 4h hold'
            else 'NO - column ' || s.col || ' | index ' || s.idx ||
                 ' | register signatures ' || s.sigs || ' (must be 1) | 4h hold ' || s.hold
       end as answer
  from shape s

union all
select 2, 'DEFECT A - one phone, several live tokens',
       coalesce((select count(*)::text from dupe_devices), '0') || ' athlete(s) affected; worst account holds ' ||
       coalesce((select max(n)::text from dupe_devices), '0') || ' live tokens'

union all
select 3, 'DEFECT B - one start announced more than once (last 7 days)',
       coalesce((select count(*)::text from dupe_starts), '0') || ' occurrence(s), ' ||
       coalesce((select max(n)::text from dupe_starts), '0') || ' at the worst'

union all
select 4, 'DEFECT B - who was told, about whom, how many times',
       coalesce(
         (select string_agg(coalesce(pt.name, '?') || ' told about ' || coalesce(pa.name, '?') ||
                            ' x' || d.n || ' on ' || to_char(d.day, 'Mon DD'),
                            chr(10) order by d.n desc, d.day desc)
            from dupe_starts d
            left join public.profiles pt on pt.id = d.user_id
            left join public.profiles pa on pa.id = d.actor_id),
         '(none)')

order by ord;
