-- 0186 — an athlete can name, and rename, their own post.
--
-- ══ WHY ══
--
-- PO, 2026-08-31: *"Let me be able to name/rename the post for transformation."* A shared comparison went
-- up as an anonymous pair of photos: the card has a title slot, nothing ever filled it, and there was no
-- way to fill it afterwards either.
--
-- ══ ⚠ THE NAME LIVES IN `layout`, NOT IN A NEW COLUMN ══
--
-- A `title` column would have to be threaded through `squad_feed()` and the post-detail read, and BOTH
-- are `returns table (...)` — which `create or replace` cannot widen. Adding one column means dropping
-- and rebuilding two functions that a dozen migrations have touched, to carry a string. 0043 hit this
-- exact wall and wrote it down.
--
-- `squad_posts.layout` is JSONB, is already returned by every read path, and already carries the
-- composition this title belongs to. So the name goes in it — the same trick 0185 used for the route
-- consent, for the same reason. No column, no backfill, no read path changed. A post with no `title` key
-- reads as untitled, which is every post written before today.
--
-- ══ ⚠ AN RPC, NOT AN UPDATE POLICY ══
--
-- `squad_posts` has SELECT, INSERT and DELETE policies (0041) and deliberately no UPDATE. Adding
-- `for update using (author_id = auth.uid())` would let an author rewrite ANY column on a post other
-- people have already seen and acknowledged — `type`, `workout_id`, `audience`, `squad_id`, the workout
-- snapshot, the route consent 0185 just added. Renaming does not need that and must not buy it.
--
-- This function writes ONE key of ONE column, and the table keeps no UPDATE policy at all.
--
-- ⚠ SECURITY DEFINER EXEMPTS THE CALLER, NOT THE CALLEE — the authorship check below is therefore the
--   only thing standing between any signed-in athlete and renaming somebody else's post. It is in the
--   WHERE clause, and the row count is checked, so a miss raises rather than silently succeeding.
--
-- Safe to run twice. `create or replace` only; no table is altered.

create or replace function public.rename_squad_post(p_post_id uuid, p_title text)
returns text
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_clean text;
  v_rows  int;
begin
  if v_uid is null or p_post_id is null then
    raise exception 'Not signed in.';
  end if;

  -- Trimmed, length-capped, and an empty string means CLEAR rather than "a post named nothing".
  v_clean := nullif(btrim(coalesce(p_title, '')), '');
  if v_clean is not null and char_length(v_clean) > 80 then
    v_clean := left(v_clean, 80);
  end if;

  update public.squad_posts p
     set layout = case
                    when v_clean is null then coalesce(p.layout, '{}'::jsonb) - 'title'
                    else jsonb_set(coalesce(p.layout, '{}'::jsonb), '{title}', to_jsonb(v_clean), true)
                  end
   where p.id = p_post_id
     -- ⚠ THE AUTHOR, AND ONLY THE AUTHOR. A squad owner may DELETE a post in their squad (0041) because
     -- moderation is theirs; putting words in somebody else's mouth is not the same power and is not
     -- granted here.
     and p.author_id = v_uid;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    -- Same message for "no such post" and "not yours", deliberately: a distinct one would confirm the
    -- existence of a post to somebody who cannot see it.
    raise exception 'That post could not be renamed.';
  end if;

  return v_clean;
end;
$$;

revoke all on function public.rename_squad_post(uuid, text) from public;
grant execute on function public.rename_squad_post(uuid, text) to authenticated;

comment on function public.rename_squad_post(uuid, text) is
  'Sets or clears squad_posts.layout->>title for a post the CALLER AUTHORED (0186). An empty or blank title removes the key. Exists instead of an UPDATE policy so an author cannot rewrite type, audience, squad_id, workout_id or the workout snapshot on a post others have already seen. Deleting is separate and already covered by the squad_posts_delete policy from 0041 (author OR squad owner).';
