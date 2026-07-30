-- Forge Legacy — convenience bundle: migrations 0074 → 0075, in order.
--
-- NOT new migrations. Both are already numbered in supabase/migrations/; this file exists so the
-- outstanding pair can be pasted into the Supabase SQL editor in one go.
--
--   0074  posts gain an `audience` (SOC-D8) — the Friends Feed backend. Extends `squad_posts` rather
--         than migrating it: `audience` defaults to 'SQUAD', which is what every existing row already
--         means, so the shipped squad feed is untouched.
--   0075  scopes `squad-media` update/delete to the object owner. UNRELATED to the feed — a
--         pre-existing hole found while reusing the bucket: any authenticated athlete could delete or
--         overwrite any object in it.
--
-- SAFE TO RE-RUN. Column adds are `if not exists`, constraints are dropped before being re-added,
-- policies are dropped before being re-created, and every function is `create or replace`.
--
-- Ends with a PostgREST schema-cache reload so `friends_feed` and `set_post_reaction` are callable at once.

-- ============================================================================
-- 0074_posts_audience.sql
-- ============================================================================

-- Forge Legacy — 0074: posts gain an audience (SOC-D8) — the Friends Feed backend
--
-- SOC-D8 makes a post's audience **Friends · Squad · Both**. There were two ways to get there:
--
--   (a) a parallel `friend_posts` table — cheaper today, but "Both" becomes two rows that can drift, and
--       media, reactions, comments, deletion and moderation all get built and maintained twice;
--   (b) one post table with an audience column.
--
-- (b), and without a migration of live data: `squad_posts` already carries media (0042), layout (0045),
-- comments, reactions and RLS, so it becomes the post table by EXTENSION. `audience` defaults to 'SQUAD',
-- which is precisely what every existing row is, so the shipped squad feed is untouched by construction —
-- nothing is backfilled, nothing is rewritten, and no existing policy changes meaning. The table keeps its
-- name because renaming it would churn every caller for cosmetics; this comment is the signpost.
--
-- A FRIENDS POST HAS NO SQUAD, and the constraint says so both ways: `FRIENDS` requires `squad_id` null,
-- `SQUAD`/`BOTH` require one. That makes an orphan structurally impossible rather than merely unlikely.
--
-- ONE READ RULE, ONE PLACE. `can_read_post()` replaces three separate `is_squad_member` policy predicates
-- with a single definition covering both audiences: the author always, a squad member for SQUAD/BOTH, a
-- friend for FRIENDS/BOTH. Posts, comments and reactions all defer to it, so the three can never disagree
-- about who may see a thread — which is exactly the kind of drift (b) was chosen to avoid.
--
-- THERE IS NO PUBLIC AUDIENCE, and there is no room for one: the check constraint admits three values. The
-- design's composer states this in its own copy under all three options. Public performance data is barred
-- (DNA §10 / CC-D2), so this is the enum enforcing a product rule, not an oversight.
--
-- REACTIONS GAIN A KIND. The design offers four — Respect · Honor · Support · Strength — deliberately an
-- acknowledgement vocabulary rather than a like, and SOC-D11 backs that: reactions are "lightweight
-- acknowledgements", never a popularity count. The existing table had no kind column, so all four collapsed
-- to one. `reaction` defaults to 'respect', which is what every stored row already meant.
--
-- Depends on 0041/0042/0045 (posts, media, layout) and 0073 (are_friends). Idempotent.

-- ── A post may now belong to friends instead of a squad ────────────────────────
alter table public.squad_posts alter column squad_id drop not null;
alter table public.squad_posts add column if not exists audience text not null default 'SQUAD';

alter table public.squad_posts drop constraint if exists squad_posts_audience_check;
alter table public.squad_posts add constraint squad_posts_audience_check
  check (audience in ('SQUAD', 'FRIENDS', 'BOTH'));

-- FRIENDS ⇔ no squad. Stated as an equivalence so neither an orphaned squad post nor a squadless
-- squad-audience post can exist.
alter table public.squad_posts drop constraint if exists squad_posts_audience_squad;
alter table public.squad_posts add constraint squad_posts_audience_squad
  check ((audience = 'FRIENDS') = (squad_id is null));

-- The design's post shapes. `photo`, `video` and `note` are not types — they are what the `media` array
-- contains, so the renderer derives them and no new enum value can fall out of step with a file.
alter table public.squad_posts drop constraint if exists squad_posts_type_check;
alter table public.squad_posts add constraint squad_posts_type_check
  check (type in ('checkin', 'recap', 'pr', 'discussion', 'announcement', 'weekly', 'progress', 'milestone'));

create index if not exists squad_posts_friends on public.squad_posts (audience, created_at desc)
  where audience in ('FRIENDS', 'BOTH');

-- Four acknowledgements, not one like.
alter table public.squad_post_reactions add column if not exists reaction text not null default 'respect';
alter table public.squad_post_reactions drop constraint if exists squad_post_reactions_reaction_check;
alter table public.squad_post_reactions add constraint squad_post_reactions_reaction_check
  check (reaction in ('respect', 'honor', 'support', 'strength'));

-- ── The single read rule ──────────────────────────────────────────────────────
create or replace function public.can_read_post(p_post uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.squad_posts p
     where p.id = p_post
       and (
         p.author_id = p_uid
         or (p.audience in ('SQUAD', 'BOTH') and p.squad_id is not null and public.is_squad_member(p.squad_id, p_uid))
         or (p.audience in ('FRIENDS', 'BOTH') and public.are_friends(p.author_id, p_uid))
       )
  );
$$;

-- ── Policies, all three deferring to it ───────────────────────────────────────
drop policy if exists squad_posts_select on public.squad_posts;
create policy squad_posts_select on public.squad_posts for select
  using (public.can_read_post(id, auth.uid()));

drop policy if exists squad_posts_insert on public.squad_posts;
create policy squad_posts_insert on public.squad_posts for insert with check (
  author_id = auth.uid()
  and (
    -- A squad post still needs membership, and an announcement still needs ownership.
    (audience in ('SQUAD', 'BOTH')
      and public.is_squad_member(squad_id, auth.uid())
      and (type <> 'announcement' or public.is_squad_owner(squad_id, auth.uid())))
    -- A friends post needs nothing but being yourself; who sees it is decided at read time by the graph.
    or (audience = 'FRIENDS' and squad_id is null)
  )
);

drop policy if exists squad_posts_delete on public.squad_posts;
create policy squad_posts_delete on public.squad_posts for delete
  using (author_id = auth.uid() or (squad_id is not null and public.is_squad_owner(squad_id, auth.uid())));

drop policy if exists squad_post_comments_select on public.squad_post_comments;
create policy squad_post_comments_select on public.squad_post_comments for select
  using (public.can_read_post(post_id, auth.uid()));

drop policy if exists squad_post_comments_insert on public.squad_post_comments;
create policy squad_post_comments_insert on public.squad_post_comments for insert with check (
  author_id = auth.uid() and public.can_read_post(post_id, auth.uid())
);

drop policy if exists squad_post_comments_delete on public.squad_post_comments;
create policy squad_post_comments_delete on public.squad_post_comments for delete
  using (
    author_id = auth.uid()
    or public.is_squad_owner(coalesce(public.squad_of_post(post_id), '00000000-0000-0000-0000-000000000000'::uuid), auth.uid())
  );

drop policy if exists squad_post_reactions_select on public.squad_post_reactions;
create policy squad_post_reactions_select on public.squad_post_reactions for select
  using (public.can_read_post(post_id, auth.uid()));

drop policy if exists squad_post_reactions_insert on public.squad_post_reactions;
create policy squad_post_reactions_insert on public.squad_post_reactions for insert with check (
  user_id = auth.uid() and public.can_read_post(post_id, auth.uid())
);

-- Changing which of the four you left is an update, not a delete-and-reinsert.
drop policy if exists squad_post_reactions_update on public.squad_post_reactions;
create policy squad_post_reactions_update on public.squad_post_reactions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── The Friends Feed (SOC-D9 / SOC-D10) ───────────────────────────────────────
-- Reverse-chronological, which is the whole ordering rule: SOC-D10 permits temporary milestone surfacing
-- and nothing else — no ranking, no engagement weighting, no algorithmic distribution.
--
-- Scope is my friends and me. A post I can see through a SQUAD is not pulled in here: SOC-D8 makes audience
-- the author's choice, and quietly widening a squad post into a friend's feed would overrule it.
create or replace function public.friends_feed(p_limit int default 40, p_before timestamptz default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'id', p.id,
               'type', p.type,
               'audience', p.audience,
               'body', p.body,
               'media', p.media,
               'layout', p.layout,
               'created_at', p.created_at,
               'author_id', p.author_id,
               'author_name', coalesce(pr.name, 'Athlete'),
               'author_handle', pr.handle,
               'author_avatar_url', pr.avatar_url,
               'is_mine', p.author_id = v_uid,
               'pr_value', p.pr_value,
               'pr_exercise', p.pr_exercise,
               'pr_label', p.pr_label,
               'comment_count', (select count(*) from public.squad_post_comments c where c.post_id = p.id),
               'reaction_count', (select count(*) from public.squad_post_reactions r where r.post_id = p.id),
               'my_reaction', (
                 select r.reaction from public.squad_post_reactions r
                  where r.post_id = p.id and r.user_id = v_uid
               ),
               -- Who acknowledged it, for the "Acknowledged by A, B and N others" line. Names only; there
               -- is no count rendered as a score anywhere (SOC-D11).
               'reactors', coalesce((
                 select jsonb_agg(jsonb_build_object('id', rp.id, 'name', coalesce(rp.name, 'Athlete'), 'avatar_url', rp.avatar_url, 'is_self', rp.id = v_uid)
                          order by (rp.id = v_uid) desc, rp.name)
                   from public.squad_post_reactions r
                   join public.profiles rp on rp.id = r.user_id
                  where r.post_id = p.id
               ), '[]'::jsonb)
             ) order by p.created_at desc)
      from public.squad_posts p
      join public.profiles pr on pr.id = p.author_id
     where p.audience in ('FRIENDS', 'BOTH')
       and (p.author_id = v_uid or public.are_friends(p.author_id, v_uid))
       and (p_before is null or p.created_at < p_before)
     limit greatest(p_limit, 0)
  ), '[]'::jsonb);
end;
$$;

-- ── Acknowledge, or change which acknowledgement it was ───────────────────────
-- One call for set / change / clear. Passing the reaction you already left removes it, which is the
-- design's toggle; passing a different one changes it in place rather than deleting and reinserting.
create or replace function public.set_post_reaction(p_post uuid, p_reaction text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cur text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_read_post(p_post, v_uid) then
    raise exception 'post not found';
  end if;
  if p_reaction is not null and p_reaction not in ('respect', 'honor', 'support', 'strength') then
    raise exception 'unknown reaction';
  end if;

  select reaction into v_cur from public.squad_post_reactions where post_id = p_post and user_id = v_uid;

  if v_cur is not null and (p_reaction is null or v_cur = p_reaction) then
    delete from public.squad_post_reactions where post_id = p_post and user_id = v_uid;
    return null;
  end if;

  insert into public.squad_post_reactions (post_id, user_id, reaction)
  values (p_post, v_uid, coalesce(p_reaction, 'respect'))
  on conflict (post_id, user_id) do update set reaction = excluded.reaction;

  return coalesce(p_reaction, 'respect');
end;
$$;

-- ============================================================================
-- 0075_media_owner_scope.sql
-- ============================================================================

-- Forge Legacy — 0075: scope squad-media writes to their owner
--
-- NOT part of the Friends Feed work — found while reusing the bucket for it, and worth closing on its own.
--
-- 0042's storage policies check only `bucket_id = 'squad-media'`:
--
--     create policy squad_media_delete on storage.objects for delete to authenticated
--       using (bucket_id = 'squad-media');
--
-- So ANY authenticated athlete could delete or overwrite ANY object in that bucket — every squad's post
-- photos, every form-check video, every check-in recording, including for squads they have never been in.
-- Nothing in the app does that, which is why it has gone unnoticed, but the policy is what actually holds
-- the line and it wasn't holding one.
--
-- `storage.objects.owner` is set to the uploading user automatically, so scoping update and delete to the
-- owner is enough and needs no path convention. INSERT stays open to any authenticated athlete (the bucket
-- is where composed media lands before a post row exists, so there is no post to check against yet) and
-- SELECT stays open because the bucket is deliberately public-read — squad media URLs are handed to
-- `expo-image` directly.
--
-- Idempotent. RUN ANY TIME.

drop policy if exists squad_media_update on storage.objects;
create policy squad_media_update on storage.objects for update to authenticated
  using (bucket_id = 'squad-media' and owner = auth.uid())
  with check (bucket_id = 'squad-media' and owner = auth.uid());

drop policy if exists squad_media_delete on storage.objects;
create policy squad_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'squad-media' and owner = auth.uid());

notify pgrst, 'reload schema';
