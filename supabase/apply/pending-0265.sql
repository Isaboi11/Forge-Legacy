-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0265: tag people in squad posts and comments (@-mentions)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 is `if not exists` / `create or replace` / drop-if-exists + create, §2 only
-- reads, and §3's test is ROLLED BACK — it leaves no tag, no inbox row and no push behind.
--
-- Independent of 0262 and 0264. Either order.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO, 2026-11-13: "I should be able to tag people in a post if I put their @ or name right? Like facebook."
-- The app now has the picker: type "@" (or start a squad-mate's name) in a squad post or comment, tap the
-- person, and they are told. This file is what stores the tag and tells them.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  creates `squad_mentions`, `tag_squad_mentions(...)` (the only writer, which also queues the push) and
--     `mention_notices()` (the inbox rows). It restates NO existing function — nothing can be rolled back.
-- §2  asserts the table, both policies, the unique index and both functions exist, that anon cannot call
--     either function and authenticated can — and RAISES if not.
-- §3  ACTUALLY TAGS SOMEONE, as a real post's author, inside a rolled-back sub-transaction, then reads it
--     back as the person tagged. One row per check.
--
-- ⚠ The app half ships as a phone update + web deploy. Until this is pasted, tagging does nothing and says
--   nothing (the post still goes out). The moment it is pasted, tags start landing — no further step.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE STATEMENTS (verbatim from 0265_squad_mentions.sql)
-- ═════════════════════════════════════════════════════════════════════════════

begin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 · WHO WAS TAGGED, AND WHERE
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.squad_mentions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.squad_posts(id) on delete cascade,
  -- Null = tagged in the post itself. A deleted comment takes its tags (and their inbox rows) with it.
  comment_id  uuid references public.squad_post_comments(id) on delete cascade,
  squad_id    uuid not null references public.squads(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Told once per post/comment, however many times the writer retries or edits.
create unique index if not exists squad_mentions_once_uk on public.squad_mentions (
  post_id,
  (coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid)),
  user_id
);
create index if not exists squad_mentions_user_idx on public.squad_mentions (user_id, created_at desc);
create index if not exists squad_mentions_post_idx on public.squad_mentions (post_id);

comment on table public.squad_mentions is
  'Who was tagged (@-mentioned) in a squad post or comment (0265, SQ-D9 Rule 4 / SQ-D12). Written only by tag_squad_mentions (SECURITY DEFINER) — there is no insert/update/delete policy. Readable by anyone who can read the post, so the thread can draw the tag. Read for the inbox through mention_notices().';

alter table public.squad_mentions enable row level security;
revoke all on table public.squad_mentions from anon;

-- Anyone who can read the post can see who it tagged — the thread draws the name in bronze.
drop policy if exists squad_mentions_select on public.squad_mentions;
create policy squad_mentions_select on public.squad_mentions for select to authenticated
  using (public.can_read_post(post_id, auth.uid()));

-- Same restrictive rule every other post child carries (0171): nothing written by someone you blocked.
drop policy if exists squad_mentions_not_blocked on public.squad_mentions;
create policy squad_mentions_not_blocked on public.squad_mentions
  as restrictive for select to authenticated
  using (not public.is_blocked(auth.uid(), author_id));


-- ══════════════════════════════════════════════════════════════════════════════
-- 2 · THE ONE WRITER — and the push
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.tag_squad_mentions(p_post uuid, p_comment uuid, p_users uuid[])
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid         uuid := auth.uid();
  v_now         timestamptz := clock_timestamp();
  v_squad       uuid;
  v_post_author uuid;
  v_writer      uuid;
  v_name        text;
  v_squad_name  text;
  v_rows        int;
  v_count       int := 0;
  r             record;
begin
  if v_uid is null or p_post is null or p_users is null or cardinality(p_users) = 0 then
    return 0;
  end if;

  select sp.squad_id, sp.author_id into v_squad, v_post_author
    from public.squad_posts sp
   where sp.id = p_post;

  -- A friends-only post has no squad, and so nobody this can tag.
  if v_squad is null then
    return 0;
  end if;

  if p_comment is null then
    v_writer := v_post_author;
  else
    select c.author_id into v_writer
      from public.squad_post_comments c
     where c.id = p_comment and c.post_id = p_post;
  end if;

  -- Only the person who wrote the words can tag people in them, and only while still in the squad.
  if v_writer is distinct from v_uid or not public.is_squad_member(v_squad, v_uid) then
    return 0;
  end if;

  select coalesce(nullif(btrim(pr.name), ''), 'A squad-mate') into v_name
    from public.profiles pr where pr.id = v_uid;
  v_name := coalesce(v_name, 'A squad-mate');
  select s.name into v_squad_name from public.squads s where s.id = v_squad;

  for r in
    select distinct w.u as user_id
      from unnest(p_users) with ordinality as w(u, n)
     where w.n <= 20
       and w.u is not null
       and w.u <> v_uid
       -- A comment on your own post already tells you (0135 "commented on your post").
       and not (p_comment is not null and w.u is not distinct from v_post_author)
       and public.is_squad_member(v_squad, w.u)
       and not public.is_blocked(v_uid, w.u)
  loop
    insert into public.squad_mentions (post_id, comment_id, squad_id, author_id, user_id, created_at)
    values (p_post, p_comment, v_squad, v_uid, r.user_id, v_now)
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      continue; -- already tagged here
    end if;
    v_count := v_count + 1;

    insert into public.push_outbox (user_id, kind, event_at, actor_id, squad_id, post_id, title, body, route)
    select r.user_id,
           'post_mention',
           v_now,
           v_uid,
           v_squad,
           p_post,
           'Tagged in ' || coalesce(nullif(btrim(v_squad_name), ''), 'your squad'),
           v_name || case when p_comment is null then ' tagged you in a post' else ' tagged you in a comment' end,
           '/squad-post/' || p_post::text
      from public.profiles pr
     where pr.id = r.user_id
       and pr.push_baseline_at is not null
       and pr.push_baseline_at < v_now
       -- SQ-D12: mentions ride the reactions switch ("Reactions & Mentions").
       and public.push_prefs_allows(coalesce(pr.notif_prefs, '{}'::jsonb), 'post_reaction')
       and exists (select 1 from public.push_tokens t where t.user_id = r.user_id and t.disabled_at is null)
       -- SQ-D12's cap: one mention push per post per person per 24 hours.
       and not exists (
         select 1 from public.push_outbox o
          where o.user_id = r.user_id
            and o.kind = 'post_mention'
            and o.post_id = p_post
            and o.created_at > v_now - interval '24 hours'
       )
    on conflict do nothing;
  end loop;

  return v_count;
end;
$$;

comment on function public.tag_squad_mentions(uuid, uuid, uuid[]) is
  'Tag squad-mates in a post (p_comment null) or a comment the CALLER wrote (0265). Keeps only current members of the post''s squad, never the caller, never a blocked pair, never the post''s author on a comment (0135 already tells them), at most 20. Each new tag is stored once and pushed under the squad_reactions preference, capped one mention push per post per person per 24 h (SQ-D12). Returns how many were newly tagged.';

revoke all on function public.tag_squad_mentions(uuid, uuid, uuid[]) from public;
revoke all on function public.tag_squad_mentions(uuid, uuid, uuid[]) from anon;
grant execute on function public.tag_squad_mentions(uuid, uuid, uuid[]) to authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 3 · THE INBOX ROWS — a side function, merged by the client
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.mention_notices()
returns table (
  kind             text,
  at               timestamptz,
  unread           boolean,
  squad_id         uuid,
  squad_name       text,
  squad_crest      text,
  squad_photo_url  text,
  post_id          uuid,
  post_audience    text,
  in_comment       boolean,
  actor_id         uuid,
  actor_name       text,
  actor_avatar_url text
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid  uuid := auth.uid();
  v_seen timestamptz;
begin
  if v_uid is null then
    return;
  end if;

  select coalesce(p.notifications_seen_at, '-infinity'::timestamptz) into v_seen
    from public.profiles p where p.id = v_uid;
  v_seen := coalesce(v_seen, '-infinity'::timestamptz);

  return query
    select 'post_mention'::text,
           sm.created_at,
           sm.created_at > v_seen,
           sm.squad_id,
           s.name::text,
           s.crest::text,
           s.photo_url::text,
           sm.post_id,
           sp.audience::text,
           sm.comment_id is not null,
           sm.author_id,
           pr.name::text,
           pr.avatar_url::text
      from public.squad_mentions sm
      join public.squad_posts sp on sp.id = sm.post_id
      join public.squads s on s.id = sm.squad_id
      left join public.profiles pr on pr.id = sm.author_id
     where sm.user_id = v_uid
       and sm.created_at > now() - interval '14 days'
       -- Left the squad since: the post is no longer theirs to open.
       and public.is_squad_member(sm.squad_id, v_uid)
       and not public.is_blocked(v_uid, sm.author_id)
     order by sm.created_at desc
     limit 50;
end;
$$;

comment on function public.mention_notices() is
  'The caller''s "tagged you" inbox rows (0265), kind post_mention, 14-day window, only for squads the caller is still in and never from a blocked athlete. Not a branch of notification_events_for — merged into /inbox by the client, as social_notices (0251) is.';

revoke all on function public.mention_notices() from public;
revoke all on function public.mention_notices() from anon;
grant execute on function public.mention_notices() to authenticated;

commit;


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  missing text := '';
begin
  if to_regclass('public.squad_mentions') is null then
    missing := missing || ' table squad_mentions;';
  end if;
  if to_regclass('public.squad_mentions_once_uk') is null then
    missing := missing || ' unique index squad_mentions_once_uk;';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'squad_mentions' and policyname = 'squad_mentions_select') then
    missing := missing || ' policy squad_mentions_select;';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'squad_mentions' and policyname = 'squad_mentions_not_blocked') then
    missing := missing || ' policy squad_mentions_not_blocked;';
  end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relname = 'squad_mentions' and c.relrowsecurity) then
    missing := missing || ' RLS is OFF on squad_mentions;';
  end if;
  if to_regprocedure('public.tag_squad_mentions(uuid, uuid, uuid[])') is null then
    missing := missing || ' function tag_squad_mentions;';
  elsif not (select p.prosecdef from pg_proc p where p.oid = to_regprocedure('public.tag_squad_mentions(uuid, uuid, uuid[])')) then
    missing := missing || ' tag_squad_mentions is not SECURITY DEFINER;';
  end if;
  if to_regprocedure('public.mention_notices()') is null then
    missing := missing || ' function mention_notices;';
  end if;

  if missing = '' then
    if has_function_privilege('anon', 'public.tag_squad_mentions(uuid, uuid, uuid[])', 'execute') then
      missing := missing || ' anon can call tag_squad_mentions;';
    end if;
    if has_function_privilege('anon', 'public.mention_notices()', 'execute') then
      missing := missing || ' anon can call mention_notices;';
    end if;
    if not has_function_privilege('authenticated', 'public.tag_squad_mentions(uuid, uuid, uuid[])', 'execute') then
      missing := missing || ' authenticated cannot call tag_squad_mentions;';
    end if;
    if not has_function_privilege('authenticated', 'public.mention_notices()', 'execute') then
      missing := missing || ' authenticated cannot call mention_notices;';
    end if;
  end if;

  if missing <> '' then
    raise exception '0265 DID NOT APPLY:%', missing;
  end if;

  raise notice '0265 OK: table, policies, index and both functions are in place; anon is shut out.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — TRY IT. One row per check. Every write is rolled back (no tag, no inbox row, no push survives).
-- ═════════════════════════════════════════════════════════════════════════════
--
-- The test uses the newest squad post whose squad has at least one OTHER current member, and whose author
-- has not blocked that member. A = the post's author, B = the other member.
--
-- PREDICTION, and why:
--   tags already stored             → 0      (nothing could write the table before this file existed)
--   A tags B in A's post            → 1      (B is a current member, not A, not blocked)
--   A tags B again                  → 0      (told once per post — the unique index)
--   B sees it in mention_notices()  → 1 row  (kind post_mention, this post)
--   B can read the tag (RLS)        → >= 1   (B can read the post, so B can read who it tagged)
--   B tags A in A's post            → 0      (only the person who wrote the words can tag in them)
-- Every row's `ok` should be true.

drop table if exists _p0265;
create temp table _p0265 (seq int, check_name text, expected text, actual text, ok boolean);

insert into _p0265
select 0, 'tags already stored', '0', count(*)::text, count(*) = 0 from public.squad_mentions;

do $$
declare
  v_post   uuid;
  v_squad  text;
  v_a      uuid;
  v_b      uuid;
  v_first  int;
  v_again  int;
  v_seen   int;
  v_rls    int;
  v_wrong  int;
  v_parts  text[];
begin
  select sp.id, s.name, sp.author_id, m.user_id
    into v_post, v_squad, v_a, v_b
    from public.squad_posts sp
    join public.squads s on s.id = sp.squad_id
    join public.squad_members m on m.squad_id = sp.squad_id and m.user_id <> sp.author_id
   where sp.author_id is not null
     and public.is_squad_member(sp.squad_id, sp.author_id)
     and not public.is_blocked(sp.author_id, m.user_id)
   order by sp.created_at desc
   limit 1;

  if v_post is null then
    insert into _p0265 values (1, 'a post to test on', 'a squad post with 2+ members', 'none found', false);
    return;
  end if;

  insert into _p0265 values (1, 'post tested', '-', 'newest post in ' || coalesce(v_squad, '?'), true);

  begin
    -- As A (the author), exactly as the app calls it.
    perform set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    v_first := public.tag_squad_mentions(v_post, null, array[v_b]);
    v_again := public.tag_squad_mentions(v_post, null, array[v_b]);

    -- As B (the person tagged).
    perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
    select count(*) into v_seen from public.mention_notices() n where n.post_id = v_post and n.kind = 'post_mention';
    select count(*) into v_rls from public.squad_mentions sm where sm.post_id = v_post;
    v_wrong := public.tag_squad_mentions(v_post, null, array[v_a]);

    raise exception using errcode = 'P0265', message = concat_ws(',', v_first, v_again, v_seen, v_rls, v_wrong);
  exception
    when sqlstate 'P0265' then
      v_parts := string_to_array(sqlerrm, ',');
      insert into _p0265 values
        (2, 'A tags B in A''s post',          '1',     v_parts[1], v_parts[1] = '1'),
        (3, 'A tags B again',                  '0',     v_parts[2], v_parts[2] = '0'),
        (4, 'B sees it in mention_notices()',  '1',     v_parts[3], v_parts[3] = '1'),
        (5, 'B can read the tag (RLS)',        '>= 1',  v_parts[4], v_parts[4]::int >= 1),
        (6, 'B tags A in A''s post',           '0',     v_parts[5], v_parts[5] = '0');
    when others then
      insert into _p0265 values (2, 'tagging ran', 'no error', 'ERROR: ' || sqlerrm, false);
  end;
end $$;

select check_name, expected, actual, ok from _p0265 order by seq;
