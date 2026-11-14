-- Forge Legacy — 0265: tag people in squad posts and comments (@-mentions)
--
-- PO, 2026-11-13: "I should be able to tag people in a post if I put their @ or name right? Like facebook."
--
-- The LOCKED squad spec has promised this since v1.0 — Squad-System-Architecture SQ-D9 Rule 4 ("An
-- @-mention within a Feed comment notifies the mentioned member") and SQ-D12 (Mentions ride the
-- "Squad Reactions & Mentions" toggle, capped 1 per 24 h per post). The settings row has said "When someone
-- reacts to or mentions you" since 0135. Nothing ever sent a mention: there was no picker, no table and no
-- notice. This file is the server half.
--
-- ══ WHAT IT ADDS ══
--
--   · `squad_mentions` — one row per (post or comment, person tagged). STORED, because "who was tagged" is
--     a choice the writer made in the picker, not something the body text can be trusted to say (two members
--     can share a name; a name can be edited out of a post after the tag went out).
--   · `tag_squad_mentions(post, comment, users[])` — the ONLY writer. The app calls it right after the post
--     or comment is saved. It checks, as the database and not the client:
--       - the caller wrote the post (comment = null) or the comment, and is still in the squad;
--       - each person tagged is a CURRENT member of that post's squad, is not the caller, and neither has
--         blocked the other;
--       - a comment does not tag the post's own author — they are already told "X commented on your post"
--         (0135), and two rows for one comment is noise;
--       - at most 20 people per call.
--     A person already tagged in that same post/comment is skipped (the unique index), so a retry or an
--     edit never tells them twice.
--   · One PUSH per new tag, gated by the SAME preference as reactions (`push_prefs_allows(.., 'post_reaction')`
--     → `squad_reactions`, which is what SQ-D12 locks), and at most one mention push per post per person per
--     24 hours (SQ-D12's cap). Written straight to `push_outbox` — 0251's shape.
--   · `mention_notices()` — the caller's inbox rows, kind `post_mention`. A SIDE FUNCTION merged by the
--     client, exactly like `social_notices()` (0251) and `squad_goal_notifications()` (0200): the union
--     `notification_events_for` is NOT restated, so this paste cannot roll anything back, and builds that
--     do not call it never see a kind they cannot draw.
--
-- ══ NOT RESTATED (so nothing can be rolled back) ══
--   notification_events_for, push_enqueue_for, push_pref_key, push_pref_default, push_prefs_allows,
--   push_drain, can_read_post, is_squad_member, is_blocked. This file only CALLS them.
--
-- ══ CLIENT COMPATIBILITY, BOTH DIRECTIONS ══
--   · The client ships FIRST. Before this is pasted, `tag_squad_mentions` and `mention_notices` answer
--     PGRST202, and the app treats both as "not there yet": the post/comment still goes out, no one is
--     told, and the inbox draws nothing extra.
--   · Builds without the client never call either function. A mention push that reaches one (it can't
--     before this client exists, since nothing else writes the table) opens `/squad-post/<id>` — a route
--     every build has.
--
-- Idempotent: `if not exists`, `create or replace`, drop-if-exists + create. Depends on 0041 (squad posts),
-- 0074 (audience), 0076 (can_read_post), 0120 (push_outbox/push_tokens), 0135 (push_outbox.post_id),
-- 0171 (is_blocked), 0202 (push_prefs_allows defaults) — all applied.

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
