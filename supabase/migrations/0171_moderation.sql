-- Forge Legacy — 0171: blocking, reporting, and filtering — the App Store Guideline 1.2 controls
--
-- ══ WHY THIS EXISTS — IT IS A SUBMISSION BLOCKER, NOT A FEATURE ══
--
-- App Store Review Guideline 1.2 requires an app with user-generated content to have ALL FOUR of:
--
--   1. a method for filtering objectionable material
--   2. a mechanism to report offensive content, AND timely responses to concerns
--   3. the ability to BLOCK abusive users
--   4. published contact information
--
-- Forge has UGC — squad posts, comments, reactions, check-in photo and video, display names, handles — and
-- as of 2026-08-19 had exactly ONE report control in the entire binary: `squad-settings.tsx:688`, a toast
-- reading *"Reporting a squad is coming soon"*. No report on a post. **No block.** No table behind either.
-- Only requirement 4 was met, by `forgelegacy.app/support` going live on 08-18.
--
-- ⚠ "IT IS ONLY A PRIVATE SQUAD" DOES NOT EXEMPT IT. Squads have Discover and request-to-join, so a person
--   an athlete has never met can enter a squad and post into a feed they read.
--
-- ⚠ AND THE "COMING SOON" TOAST WAS WORSE THAN NO BUTTON. It demonstrates, inside the shipped binary, that
--   the need was known and unmet. A reviewer who taps it has found the finding.
--
-- ══ ⚠ THE ENFORCEMENT DESIGN — WHY RESTRICTIVE POLICIES AND NOT A FEED REWRITE ══
--
-- A `blocks` table that no read path consults is the "column nothing writes" failure this schema has paid
-- for repeatedly. So the block has to be enforced where the content is actually read, and the two feeds
-- differ in a way that decides the whole approach:
--
--   · `squad_feed()` (0041) is **security invoker** ⇒ RLS applies to it.
--   · `friends_feed()` (0113) is **security definer** ⇒ RLS is bypassed; it needs an explicit predicate
--     in its own body. **That is NOT done in this migration — see the closing note.**
--
-- For everything RLS can reach, this migration adds `AS RESTRICTIVE` policies. That choice matters:
-- a restrictive policy is **ANDed** with whatever permissive policies already exist, so it filters every
-- existing read without reading, editing or replacing a single one of them. Rebuilding a policy from a
-- partial understanding is how this schema lost squad reads for a day (0149/0153), and rebuilding a
-- FUNCTION from a predecessor is how `notification_events_for` silently lost shipped features four times.
-- A restrictive policy is the one tool here that adds a rule without touching the rules already in place.
--
-- ══ ⚠ THE BLOCK IS SYMMETRIC, AND THAT IS THE POINT ══
--
-- `is_blocked(a, b)` is true if EITHER has blocked the other. A one-directional hide — their content
-- disappears for you, yours stays visible to them — is a mute, not a block, and Guideline 1.2 asks for the
-- ability to block abusive users. Leaving a harasser able to read the person who blocked them is the exact
-- failure the requirement names.
--
-- PO decision 2026-08-19 on the one genuinely ambiguous case: **two blocked athletes who share a squad both
-- stay in it and simply cannot see each other.** A squad is a third party's space and one member must not
-- be able to evict another; ejecting the blocker instead would punish the person who was harassed.

-- ── 1. BLOCKS ────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.athlete_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint athlete_blocks_not_self check (blocker_id <> blocked_id)
);

-- The lookup `is_blocked` makes in the reverse direction, on every row of every feed.
create index if not exists athlete_blocks_blocked_idx on public.athlete_blocks (blocked_id, blocker_id);

alter table public.athlete_blocks enable row level security;

-- An athlete reads and manages their OWN block list. Deliberately no policy for the blocked side: being
-- able to query "who has blocked me" turns a safety control into a notification, and the whole value of a
-- block is that the blocked person is not told.
drop policy if exists athlete_blocks_own on public.athlete_blocks;
create policy athlete_blocks_own on public.athlete_blocks
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

/*
 * Symmetric: true if either direction exists.
 *
 * ⚠ SECURITY DEFINER IS LOAD-BEARING. This is called from RLS policies on tables the caller can only read
 * through those same policies, and from within definer functions. If it were invoker it would be subject to
 * `athlete_blocks`'s own RLS — which only exposes the caller's own rows — so it could never see that the
 * OTHER person did the blocking, and the symmetry would silently collapse into a one-way mute.
 *
 * ⚠ STABLE, not VOLATILE: it is called once per row on feed reads and the planner must be free to cache it.
 */
create or replace function public.is_blocked(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.athlete_blocks
     where (blocker_id = p_a and blocked_id = p_b)
        or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

revoke all on function public.is_blocked(uuid, uuid) from public;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;

/*
 * Block an athlete. Idempotent.
 *
 * ⚠ SEVERS THE FRIENDSHIP IN THE SAME TRANSACTION. A block that leaves the friendship standing leaves them
 * on each other's friends list, in each other's friend-only surfaces, and able to reach each other through
 * anything keyed off friendship. Blocking is the stronger statement and it must win.
 *
 * Squad membership is deliberately NOT touched (PO, 2026-08-19) — see the header.
 */
create or replace function public.block_athlete(p_athlete uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'block_athlete: no authenticated athlete' using errcode = '28000';
  end if;
  if p_athlete is null or p_athlete = v_uid then
    raise exception 'block_athlete: cannot block yourself' using errcode = '22023';
  end if;

  insert into public.athlete_blocks (blocker_id, blocked_id)
       values (v_uid, p_athlete)
  on conflict do nothing;

  /*
   * ⚠ `friendships` IS KEYED ON CANONICAL ORDERING, NOT ON WHO ASKED. Its own comment states the rule —
   * *"one row can only ever describe one pair, in one direction"* — so the pair is `(low_id, high_id)` with
   * `requested_by` carrying the direction separately. Matching on requester/addressee raises 42703, and a
   * two-branch OR on the pair is not needed: `least`/`greatest` name the row exactly once.
   */
  delete from public.friendships
   where low_id  = least(v_uid, p_athlete)
     and high_id = greatest(v_uid, p_athlete);
end;
$$;

revoke all on function public.block_athlete(uuid) from public;
grant execute on function public.block_athlete(uuid) to authenticated;

/*
 * Unblock. Does NOT restore the friendship — that was ended, not paused, and re-adding someone silently to
 * a friends list because a block was lifted would be a relationship nobody consented to twice.
 */
create or replace function public.unblock_athlete(p_athlete uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unblock_athlete: no authenticated athlete' using errcode = '28000';
  end if;
  delete from public.athlete_blocks where blocker_id = v_uid and blocked_id = p_athlete;
end;
$$;

revoke all on function public.unblock_athlete(uuid) from public;
grant execute on function public.unblock_athlete(uuid) to authenticated;

/*
 * The caller's own block list, for the Settings screen that lets them undo one.
 *
 * ⚠ THE COLUMNS ARE `name` AND `handle`, NOT `display_name`. `profiles` (0001) carries `name`, `first_name`,
 * `handle`, `initials`, plus `avatar_url` added later — and `handle` is `citext`, so it is cast to `text`
 * to match the declared return type rather than relying on an implicit coercion that OUT-parameter binding
 * will not perform.
 */
create or replace function public.my_blocked_athletes()
returns table (athlete_id uuid, name text, handle text, avatar_url text, created_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.name, p.handle::text, p.avatar_url, b.created_at
    from public.athlete_blocks b
    join public.profiles p on p.id = b.blocked_id
   where b.blocker_id = auth.uid()
   order by b.created_at desc;
$$;

revoke all on function public.my_blocked_athletes() from public;
grant execute on function public.my_blocked_athletes() to authenticated;

-- ── 2. ENFORCEMENT — restrictive policies, ANDed with everything already there ────────────────────────
--
-- ⚠ `AS RESTRICTIVE` IS THE WHOLE TECHNIQUE. It does not replace or weaken any existing policy; it adds a
--   condition every read must ALSO satisfy. Nothing below needs to know what the permissive policies say,
--   which is why this can be added to tables whose access rules were written across a dozen migrations.
--
-- ⚠ `auth.uid()` IS NULL FOR A DEFINER CALLER, and `is_blocked(null, x)` is false — so these policies are
--   inert inside SECURITY DEFINER functions rather than accidentally hiding rows from server-side code.
--   That is correct here and it is also exactly why `friends_feed` is not covered. See the closing note.

drop policy if exists squad_posts_not_blocked on public.squad_posts;
create policy squad_posts_not_blocked on public.squad_posts
  as restrictive for select
  using (not public.is_blocked(auth.uid(), author_id));

drop policy if exists squad_post_comments_not_blocked on public.squad_post_comments;
create policy squad_post_comments_not_blocked on public.squad_post_comments
  as restrictive for select
  using (not public.is_blocked(auth.uid(), author_id));

drop policy if exists squad_post_reactions_not_blocked on public.squad_post_reactions;
create policy squad_post_reactions_not_blocked on public.squad_post_reactions
  as restrictive for select
  using (not public.is_blocked(auth.uid(), user_id));

drop policy if exists squad_checkins_not_blocked on public.squad_checkins;
create policy squad_checkins_not_blocked on public.squad_checkins
  as restrictive for select
  using (not public.is_blocked(auth.uid(), user_id));

-- ── 2b. `friends_feed` — THE ONE PATH RLS CANNOT REACH ───────────────────────────────────────────────
--
-- 0113's body, with four predicates added and NOTHING ELSE CHANGED. Transformed from that file's text
-- rather than retyped: `notification_events_for` silently lost shipped features to a from-memory rebuild
-- four separate times (0088, 0092, 0106, 0122), and this function carries `workout_id` /
-- `workout_summary` — 0113's own comment calls them *"THE TWO KEYS THIS MIGRATION EXISTS FOR"* — plus
-- `reactors`, which SOC-D11 constrains. Losing any of them here would look exactly like a working feed.
--
-- ⚠ WHY FOUR PREDICATES AND NOT ONE. Hiding the post is the obvious half. The other three are what stop
--   the block leaking through the furniture around it:
--
--     · `reactors` — a blocked athlete's NAME would otherwise appear in "Acknowledged by A, B and N others"
--       under a post both can see. The block would be visibly incomplete on its most public surface.
--     · `comment_count` and `reaction_count` — these are read here, but the comments themselves are read
--       through an RLS-covered path where §2's restrictive policies DO hide blocked authors. Filtering the
--       list and not the count yields "3 comments" above two rendered comments — a mismatch an athlete
--       reads as a bug, and which quietly signals that someone they blocked is still there.

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
               -- THE TWO KEYS THIS MIGRATION EXISTS FOR.
               'workout_id', p.workout_id,
               'workout_summary', p.workout_summary,
               'comment_count', (
                 select count(*) from public.squad_post_comments c
                  where c.post_id = p.id
                    and not public.is_blocked(v_uid, c.author_id)   -- 0171
               ),
               'reaction_count', (
                 select count(*) from public.squad_post_reactions r
                  where r.post_id = p.id
                    and not public.is_blocked(v_uid, r.user_id)     -- 0171
               ),
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
                    and not public.is_blocked(v_uid, rp.id)         -- 0171
               ), '[]'::jsonb)
             ) order by p.created_at desc)
      from public.squad_posts p
      join public.profiles pr on pr.id = p.author_id
     where p.audience in ('FRIENDS', 'BOTH')
       and (p.author_id = v_uid or public.are_friends(p.author_id, v_uid))
       and not public.is_blocked(v_uid, p.author_id)                -- 0171
       and (p_before is null or p.created_at < p_before)
     limit greatest(p_limit, 0)
  ), '[]'::jsonb);
end;
$$;

-- ⚠ 0113 issued no grant of its own — `friends_feed` reaches `authenticated` through 0147 §1's blanket
--   grant, and `create or replace` preserves privileges on an existing function. Re-stated rather than
--   assumed, because 0170 §1b is this schema's evidence that grant state is not something to infer.
grant execute on function public.friends_feed(int, timestamptz) to authenticated;

-- ── 3. REPORTS ───────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ THE `status` COLUMN IS THE COMPLIANCE ARTEFACT, NOT THE ROW. Guideline 1.2 asks for a reporting
--   mechanism **and timely responses to concerns**. A table that only collects reports evidences the first
--   half and quietly fails the second. `status` + `resolved_at` are what make a response demonstrable.

create table if not exists public.content_reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles (id) on delete cascade,
  -- What is being reported. `athlete` covers a display name, handle or avatar — the surface a stranger sees
  -- first via Discover, and the one with no row of its own to point at.
  target_kind   text not null check (target_kind in ('post', 'comment', 'checkin', 'athlete', 'squad')),
  -- Deliberately NOT a foreign key: the reported row may be deleted (by its author, or by us acting on the
  -- report) and the report must outlive it. A report that vanishes when the content does destroys the
  -- record of what was done about it.
  target_id     text not null,
  -- Resolved at report time so a report still names a person after the content is gone.
  target_athlete uuid references public.profiles (id) on delete set null,
  reason        text not null check (reason in ('abuse', 'harassment', 'spam', 'nudity', 'violence', 'impersonation', 'other')),
  -- Free text, and free text on purpose — the same reasoning as `feedback.body` in 0167. A report is only
  -- useful in the reporter's own words. ⛔ Never route this through `sanitizeProps`.
  note          text,
  status        text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references public.profiles (id) on delete set null,
  resolution    text
);

create index if not exists content_reports_open_idx on public.content_reports (status, created_at desc);
create index if not exists content_reports_target_idx on public.content_reports (target_athlete, created_at desc);

alter table public.content_reports enable row level security;

-- A reporter may see what they filed — "did that go anywhere" is a fair question. Nobody may see anyone
-- else's reports, and there is deliberately no update policy: only the operator functions resolve a report.
drop policy if exists content_reports_own_select on public.content_reports;
create policy content_reports_own_select on public.content_reports
  for select using (reporter_id = auth.uid());

/*
 * File a report.
 *
 * ⚠ RATE-LIMITED, following 0167's feedback trigger. An unlimited report endpoint is a way to flood the
 * operator queue until real reports are unfindable — which fails Guideline 1.2 by burying the response
 * rather than by lacking the mechanism.
 */
create or replace function public.report_content(
  p_target_kind text,
  p_target_id   text,
  p_reason      text,
  p_note        text default null,
  p_target_athlete uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_recent int;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'report_content: no authenticated athlete' using errcode = '28000';
  end if;

  select count(*) into v_recent
    from public.content_reports
   where reporter_id = v_uid and created_at > now() - interval '1 hour';

  if v_recent >= 20 then
    raise exception 'report_content: too many reports in the last hour' using errcode = 'P0001';
  end if;

  insert into public.content_reports (reporter_id, target_kind, target_id, target_athlete, reason, note)
       values (v_uid, p_target_kind, p_target_id, p_target_athlete, p_reason, nullif(btrim(p_note), ''))
    returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.report_content(text, text, text, text, uuid) from public;
grant execute on function public.report_content(text, text, text, text, uuid) to authenticated;

-- ── 3b. FILTERING AT CREATION — Guideline 1.2 requirement 1 ──────────────────────────────────────────
--
-- *"A method for filtering objectionable material from being posted to the app."* The phrase "from being
-- posted" is why reporting alone does not answer this one: reporting is after the fact.
--
-- ══ ⚠ WHAT IS BUILT HERE, AND WHAT IS HONESTLY NOT ══
--
-- The **mechanism** is complete: a pattern list, a trigger that enforces it on `handle` and `name`, and an
-- operator path to extend it without a migration. Handles and names are the right surface to enforce on —
-- they are searchable by strangers through friend search and Discover, so they are the one piece of UGC a
-- person can be shown without any relationship existing.
--
-- ⛔ **THE LIST SHIPS SHORT, AND DELIBERATELY SO.** It is seeded only with IMPERSONATION patterns, which are
--    unambiguous, testable, and a real harm — a handle like `forge_support` or `admin` asking someone for
--    their password is the attack this actually prevents.
--    **A slur and profanity list is NOT seeded and is owed.** That is a judgement call about language,
--    with real false-positive cost (a naive substring list rejects legitimate names — the Scunthorpe
--    problem), and it should be authored deliberately rather than guessed at inside a migration. Adding
--    rows needs no migration: `insert into public.moderation_blocklist (pattern, kind, note) values (…)`.
--    ⚠ Until that pass happens, requirement 1 rests on the operator takedown path, not on this list.

create table if not exists public.moderation_blocklist (
  pattern    text primary key check (pattern = lower(btrim(pattern)) and char_length(pattern) between 2 and 64),
  kind       text not null default 'both' check (kind in ('handle', 'name', 'both')),
  note       text,
  created_at timestamptz not null default now()
);

alter table public.moderation_blocklist enable row level security;
-- RLS enabled with ZERO policies: deny-by-default, deliberately. The same reasoning 0129 records for
-- `app_admins` (AA-D6) — a readable blocklist is a readable list of exactly what to work around. The
-- trigger below is SECURITY DEFINER and reads it regardless. ⛔ Do not "fix" this by adding a policy.

insert into public.moderation_blocklist (pattern, kind, note) values
  ('forgelegacy',  'both',   'impersonating the app itself'),
  ('forge_admin',  'handle', 'impersonating staff'),
  ('forgesupport', 'handle', 'impersonating support'),
  ('forge_support','handle', 'impersonating support'),
  ('coachholt',    'both',   'impersonating the in-app coach'),
  ('coach_holt',   'both',   'impersonating the in-app coach'),
  ('admin',        'handle', 'implies staff'),
  ('moderator',    'handle', 'implies staff'),
  ('official',     'handle', 'implies staff')
on conflict (pattern) do nothing;

/*
 * Reject a handle or name matching the blocklist.
 *
 * ⚠ MATCHES ON A NORMALISED FORM, because the trivial evasion is punctuation. `f.o.r.g.e_admin` and
 * `forge-admin` are the same claim as `forgeadmin`, so separators are stripped before comparison. This is
 * not a serious adversarial defence — nothing at this layer is — but it stops the version of the attack
 * that costs nothing to attempt.
 *
 * ⚠ SUBSTRING, NOT EQUALITY, and that is why the seeded list contains no short common words. `admin` as a
 * substring is safe; a two-letter pattern would not be, which is what the length check on the table guards.
 */
create or replace function public.moderation_check_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_handle text := lower(regexp_replace(coalesce(new.handle::text, ''), '[^a-z0-9]', '', 'gi'));
  v_name   text := lower(regexp_replace(coalesce(new.name, ''), '[^a-z0-9]', '', 'gi'));
  v_hit    text;
begin
  select b.pattern into v_hit
    from public.moderation_blocklist b
   where (b.kind in ('handle', 'both') and v_handle <> '' and v_handle like '%' || b.pattern || '%')
      or (b.kind in ('name', 'both')   and v_name   <> '' and v_name   like '%' || b.pattern || '%')
   limit 1;

  if v_hit is not null then
    -- ⚠ The message names no pattern. Telling someone exactly which string tripped the filter is a free
    -- lesson in how to get past it, and this error reaches the client verbatim.
    raise exception 'That name or handle is not available.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_moderation_check on public.profiles;
create trigger profiles_moderation_check
  before insert or update of handle, name on public.profiles
  for each row execute function public.moderation_check_profile();

-- ── 4. SQUAD OWNER — REMOVE A MEMBER: ALREADY EXISTS, DELIBERATELY NOT REBUILT ───────────────────────
--
-- This migration originally added `remove_squad_member(uuid, uuid)`. **It was redundant and has been
-- removed.** The capability shipped in `0046` as an RLS DELETE policy letting an owner delete a non-owner
-- `squad_members` row, and it is wired: `data/squad-live.ts:626` → `squad/[id].tsx:275`, behind an owner
-- action sheet offering "Make owner" and "Remove from squad".
--
-- ⚠ RECORDED RATHER THAN SILENTLY DROPPED, because the mistake is instructive: the Guideline 1.2 audit
--   found no report and no block, and assumed the owner-side control was missing too. It was not. A second
--   RPC doing what a working policy already does is the "two answers to one question" failure this codebase
--   names in `lib/billing.ts` — and the redundant one would have been the path nothing called.

-- ── 5. OPERATOR SURFACE ──────────────────────────────────────────────────────────────────────────────
--
-- Rides `/admin`'s existing shape (0129 `admin_guard()`, 0167 `admin_feedback`) rather than inventing a
-- second operator pattern.

create or replace function public.admin_reports(p_limit int default 50, p_status text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows jsonb;
begin
  perform public.admin_guard();

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
    into v_rows
    from (
      select c.id, c.target_kind, c.target_id, c.reason, c.note, c.status,
             c.created_at, c.resolved_at, c.resolution,
             rp.handle::text as reporter_handle,
             tp.handle::text as target_handle
        from public.content_reports c
        left join public.profiles rp on rp.id = c.reporter_id
        left join public.profiles tp on tp.id = c.target_athlete
       where p_status is null or c.status = p_status
       order by c.created_at desc
       limit greatest(1, least(coalesce(p_limit, 50), 200))
    ) r;

  return jsonb_build_object(
    'rows', v_rows,
    'counts', jsonb_build_object(
      'open',      (select count(*) from public.content_reports where status = 'open'),
      'actioned',  (select count(*) from public.content_reports where status = 'actioned'),
      'dismissed', (select count(*) from public.content_reports where status = 'dismissed'),
      -- Null on an empty table rather than 0: "nothing has ever been filed" and "nothing is open" are
      -- different facts and a bare 0 cannot tell them apart. Same reasoning as 0167's `newest_at`.
      'oldest_open_at', (select min(created_at) from public.content_reports where status = 'open')
    )
  );
end;
$$;

revoke all on function public.admin_reports(int, text) from public;
grant execute on function public.admin_reports(int, text) to authenticated;

create or replace function public.admin_resolve_report(p_report uuid, p_status text, p_resolution text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();

  if p_status not in ('actioned', 'dismissed') then
    raise exception 'admin_resolve_report: status must be actioned or dismissed' using errcode = '22023';
  end if;

  update public.content_reports
     set status = p_status,
         resolved_at = now(),
         resolved_by = auth.uid(),
         resolution = nullif(btrim(p_resolution), '')
   where id = p_report;
end;
$$;

revoke all on function public.admin_resolve_report(uuid, text, text) from public;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;

-- ── 6. SELF-CHECK ────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_restrictive  int;
  v_feed_guards  int;
  missing text := '';
begin
  if to_regclass('public.athlete_blocks') is null then missing := missing || ' athlete_blocks'; end if;
  if to_regclass('public.content_reports') is null then missing := missing || ' content_reports'; end if;
  if to_regprocedure('public.is_blocked(uuid, uuid)') is null then missing := missing || ' is_blocked'; end if;
  if to_regprocedure('public.block_athlete(uuid)') is null then missing := missing || ' block_athlete'; end if;
  if to_regprocedure('public.report_content(text, text, text, text, uuid)') is null then missing := missing || ' report_content'; end if;
  if to_regprocedure('public.admin_reports(int, text)') is null then missing := missing || ' admin_reports'; end if;

  if missing <> '' then
    raise exception '0171 DID NOT FULLY APPLY. Missing:%', missing;
  end if;

  -- ⚠ THE ASSERTION THAT MATTERS. Four restrictive policies are the entire enforcement of the block on
  -- every RLS-reachable path. If they are not RESTRICTIVE (`permissive = 'RESTRICTIVE'`) they are ORed
  -- instead of ANDed, which does not merely fail to hide blocked content — it makes ALL of it visible.
  select count(*) into v_restrictive
    from pg_policies
   where schemaname = 'public'
     and policyname in ('squad_posts_not_blocked', 'squad_post_comments_not_blocked',
                        'squad_post_reactions_not_blocked', 'squad_checkins_not_blocked')
     and permissive = 'RESTRICTIVE';

  if v_restrictive <> 4 then
    raise exception '0171 self-check: expected 4 RESTRICTIVE block policies, found % — a PERMISSIVE policy here would widen access, not narrow it', v_restrictive;
  end if;

  /*
   * ⚠ `friends_feed` IS THE ONE PATH NO POLICY CAN PROVE. It is SECURITY DEFINER, so RLS does not apply and
   * the four assertions above say nothing about it. A future `create or replace` rebuilt from 0113 — the
   * exact mistake `notification_events_for` made four times — would silently restore an unfiltered feed
   * while every other check here stayed green.
   *
   * Counting the predicate rather than merely finding it: there are FOUR (post author, comment count,
   * reaction count, reactor names), and a rebuild that keeps only the obvious one would still leave a
   * blocked athlete's name rendered under "Acknowledged by".
   */
  select count(*) into v_feed_guards
    from regexp_matches(pg_get_functiondef('public.friends_feed(int, timestamptz)'::regprocedure),
                        'not public\.is_blocked', 'g');

  if v_feed_guards < 4 then
    raise exception '0171 self-check: friends_feed carries % of the 4 expected is_blocked predicates — a rebuild from 0113 has dropped block filtering from the friends feed', v_feed_guards;
  end if;

  if to_regclass('public.moderation_blocklist') is null
     or not exists (select 1 from pg_trigger where tgname = 'profiles_moderation_check' and not tgisinternal) then
    raise exception '0171 self-check: the profile name/handle filter did not land';
  end if;

  raise notice '0171 OK: blocks, reports, owner removal, the profile filter and the operator surface are present; 4 RESTRICTIVE block policies and % is_blocked predicates in friends_feed.', v_feed_guards;
end;
$$;

-- ══ ⛔ WHAT THIS MIGRATION DOES NOT DO — READ BEFORE CALLING 1.2 CLOSED ══════════════════════════════
--
-- 1. **The slur and profanity list is not seeded** — see §3b. The mechanism is complete and enforced; the
--    list holds impersonation patterns only. Extending it needs no migration, and until it is extended,
--    requirement 1 rests on operator takedown rather than on pre-screening.
--
-- 2. **Nothing here filters challenge standings.** A blocked athlete still appears in a competition
--    leaderboard both are entered in. Judged deliberately: standings are a scoreboard of numbers rather
--    than authored content, and removing a row would misstate the result for everyone else. Recorded as a
--    decision so it is not later found and mistaken for an oversight.
--
-- ══ VERIFY BY HAND ═══════════════════════════════════════════════════════════════════════════════════
--   ⛔ Nothing below can run in the SQL editor as-is — every one needs `auth.uid()`. Use the transaction
--      wrapper: begin; select set_config('request.jwt.claims',
--      json_build_object('sub','<uuid>','role','authenticated')::text, true);
--      set local role authenticated; <call>; rollback;
--
--   Symmetry (the property most worth proving, and it holds in BOTH directions):
--     select public.is_blocked('<a>','<b>');   -- true after EITHER blocks the other
--
--   Enforcement, as the blocked party: select count(*) from public.squad_posts where author_id = '<blocker>';
--     -- must be 0 for a blocked athlete and non-zero for anyone else in the same squad.
