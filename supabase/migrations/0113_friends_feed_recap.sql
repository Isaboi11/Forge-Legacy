-- Forge Legacy — 0113: the Friends Feed carries the recap it was already storing
--
-- One table has served both feeds since 0074: `squad_posts`, with an `audience` column and a
-- `workout_summary` jsonb. The SQUAD side has rendered that column as a Vol / Time / Lifts / PRs strip
-- since it shipped. `friends_feed()` selected `pr_value`, `pr_exercise` and `pr_label` and never
-- selected `workout_summary` or `workout_id` — so a recap posted to FRIENDS arrived with its stats
-- stripped, fell through `shapeOf()` into the generic bronze milestone card, and had nothing to say.
--
-- Same table. Same column. One feed reading it and one not. This is an omission, not a design.
--
-- NOTHING ELSE CHANGES. Audience scoping, the friendship join, ordering, the comment/reaction
-- subqueries and the reactors aggregate are 0074's, verbatim. Signature and return type are unchanged,
-- so `create or replace` is enough and no `drop function` is needed.
--
-- ⚠ PL/pgSQL RESOLVES COLUMN REFERENCES AT RUN TIME. Applying this proves the body parsed, not that it
-- binds `p.workout_summary`. The proof is pressing the button: post a recap to Friends and look at the
-- card. If it renders bare, the function did not rebind — check the live body with \df+ friends_feed.

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
