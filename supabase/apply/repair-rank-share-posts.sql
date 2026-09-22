-- Forge Legacy — repair the rank-up posts that shipped as flat text
--
-- Paste into the Supabase SQL editor and run. Sections 1 and 4 are read-only; section 3 is the write.
--
-- ══ WHAT THIS FIXES ══
--
-- Before today, sharing a rank-up posted `shareSnippet(...)` — the plain-text fallback written for the
-- OS share sheet — as the BODY of a `discussion`, with nothing in `layout`. So the post reads:
--
--     Builder I
--     Builder I
--     Sep 7, 2026
--     — Isa Altamirano
--     Forged in Forge Legacy.
--
-- The client now draws a `milestone-card` payload out of `layout`. Posts written before that have no
-- payload, so they keep rendering as the five grey lines no matter how many times the app updates.
-- This writes the payload those posts should always have had, and clears the body so the card is not
-- followed by its own text repeated underneath.
--
-- ══ ⚠ EVERY VALUE COMES OUT OF THE POST ITSELF ══
--
-- Nothing is looked up, assumed or typed in per athlete. The rank label is line 1, the date is line 3,
-- and the identity sentence is keyed off the parsed family and tier. If the parse does not produce a
-- rank, the row is not touched — see the WHERE clause, which is deliberately narrow enough that it
-- cannot match an honor, goal, program or ordinary discussion post.
--
-- ══ ⚠ THE ONE THING THAT CANNOT BE RECOVERED, AND IS THEREFORE LEFT OUT ══
--
-- **`previous` — the rank the athlete came from.** It was never written anywhere. `refreshRank` read the
-- stored rank, decided the promotion against it, and then overwrote it; only posts made from today
-- onward carry it. The card omits the "Foundation IV ↓" transition when it is absent, exactly as it does
-- for a first-ever evaluation — a repaired post shows the badge, the rank, its meaning and the date, and
-- says nothing about where it came from.
--
-- Guessing the previous rung from the current one would be wrong roughly three times in four (a Builder I
-- post could be an ascension from Foundation IV or from Builder I's own sub-tier below it), and it would
-- put a rank the athlete may never have held onto a permanent record. Absent is the honest answer.
--
-- ══ ⚠ IT REPAIRS EVERY ATHLETE'S, NOT ONE ══
--
-- The defect is identical for everyone who shared a rank-up before today, the transform is derived from
-- each post's own text, and scoping it to one person would leave the same broken post in other squads.
-- Section 1 lists exactly what will change before anything is written.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PREVIEW — run this first. Nothing is written.
-- ─────────────────────────────────────────────────────────────────────────────

with parsed as (
  select
    p.id,
    p.squad_id,
    p.audience,
    p.created_at,
    pr.name  as author,
    pr.sex   as author_sex,
    split_part(p.body, E'\n', 1)                          as rank_label,
    lower(split_part(split_part(p.body, E'\n', 1), ' ', 1)) as family,
    case split_part(split_part(p.body, E'\n', 1), ' ', 2)
      when 'I' then 1 when 'II' then 2 when 'III' then 3 when 'IV' then 4
    end                                                    as tier,
    split_part(p.body, E'\n', 3)                           as shown_date
  from public.squad_posts p
  join public.profiles pr on pr.id = p.author_id
  where p.layout is null
    and p.body like '%Forged in Forge Legacy.%'
    -- line 1 is a rank label ...
    and split_part(p.body, E'\n', 1) ~ '^(Foundation|Builder|Craftsman|Architect|Established|Legend|Legacy) (I|II|III|IV)$'
    -- ... and line 3 is the date the card carried. Both must hold: a rank share whose date field was
    -- toggled off has a byline on line 3 and is left alone rather than given a wrong date.
    and split_part(p.body, E'\n', 3) ~ '^[A-Z][a-z]{2} [0-9]{1,2}, [0-9]{4}$'
)
select id, author, rank_label, tier, shown_date, squad_id, audience, created_at
from parsed
order by created_at desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. THE SENTENCE EACH RUNG CARRIES
--
--    `Amendments/Rank-System-Architecture-Amendment-003-Sub-Tier-Statements.md` §4, LOCKED, and it is
--    the same table `src/domain/rank/identity.ts` holds — a repaired post must say what a fresh one says.
--    Tier I of every family IS the §2.2 identity statement, verbatim; that is the amendment's structural
--    guarantee that the four lines are one identity at four depths rather than four identities.
--
--    ⚠ The apostrophes are U+2019, matching the app exactly. A straight quote here would make a repaired
--    post differ from a fresh one by an invisible character.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. THE WRITE — run after section 1 looks right.
-- ─────────────────────────────────────────────────────────────────────────────

with ascent (family, tier, line) as (values
  ('foundation',1,'I’ve started.'),
  ('foundation',2,'I keep coming back.'),
  ('foundation',3,'I’ve stopped waiting to feel ready.'),
  ('foundation',4,'I don’t have to talk myself into it.'),
  ('builder',1,'I’m building habits.'),
  ('builder',2,'I’m becoming consistent.'),
  ('builder',3,'I’m putting in the work.'),
  ('builder',4,'I train whether or not I feel like it.'),
  ('craftsman',1,'I know how to train.'),
  ('craftsman',2,'I know why every session is there.'),
  ('craftsman',3,'I can change the plan without losing it.'),
  ('craftsman',4,'I trust my own judgment under the bar.'),
  ('architect',1,'I’m intentionally shaping my development.'),
  ('architect',2,'I train toward something I chose.'),
  ('architect',3,'I plan in seasons, not sessions.'),
  ('architect',4,'I know what the next year is for.'),
  ('established',1,'I’ve built something real.'),
  ('established',2,'What I’ve built holds under pressure.'),
  ('established',3,'My training has outlasted my excuses.'),
  ('established',4,'This isn’t something I’m trying any more.'),
  ('legend',1,'My journey has become a meaningful story.'),
  ('legend',2,'I’ve kept going long enough for it to mean something.'),
  ('legend',3,'What I’ve done is worth telling.'),
  ('legend',4,'The work speaks before I do.'),
  ('legacy',1,'I repeatedly become the person I intend to become.'),
  ('legacy',2,'I change on purpose, and it holds.'),
  ('legacy',3,'Becoming is a habit I keep.'),
  ('legacy',4,'This is who I am, and I chose it.')
),
parsed as (
  select
    p.id,
    pr.sex::text                                           as author_sex,
    split_part(p.body, E'\n', 1)                           as rank_label,
    lower(split_part(split_part(p.body, E'\n', 1), ' ', 1)) as family,
    case split_part(split_part(p.body, E'\n', 1), ' ', 2)
      when 'I' then 1 when 'II' then 2 when 'III' then 3 when 'IV' then 4
    end                                                    as tier,
    split_part(p.body, E'\n', 3)                           as shown_date
  from public.squad_posts p
  join public.profiles pr on pr.id = p.author_id
  where p.layout is null
    and p.body like '%Forged in Forge Legacy.%'
    and split_part(p.body, E'\n', 1) ~ '^(Foundation|Builder|Craftsman|Architect|Established|Legend|Legacy) (I|II|III|IV)$'
    and split_part(p.body, E'\n', 3) ~ '^[A-Z][a-z]{2} [0-9]{1,2}, [0-9]{4}$'
)
update public.squad_posts sp
   set layout = jsonb_build_object(
         'kind',     'milestone-card',
         'event',    'rank',
         'eyebrow',  'Rank Ascended',
         'headline', x.rank_label,
         'line',     a.line,
         'date',     x.shown_date,
         'rank',     jsonb_build_object(
                       'family', x.family,
                       'level',  x.tier,
                       'label',  x.rank_label,
                       -- Only `established` has -m and -f badges; carrying it for every family is
                       -- harmless and means the card never has to guess who the author was.
                       'sex',    x.author_sex
                     )
         -- `previous` is deliberately ABSENT. See the header: it was never stored, and the card omits
         -- the transition rather than inventing a rung.
       ),
       -- The band says the eyebrow, the rank, its meaning and the date. Leaving the body would print all
       -- four again underneath it in smaller type.
       body = null
  from parsed x
  join ascent a on a.family = x.family and a.tier = x.tier
 where sp.id = x.id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VERIFY — every repaired post, as the app will now read it.
-- ─────────────────────────────────────────────────────────────────────────────

select
  p.id,
  pr.name                          as author,
  p.layout ->> 'headline'          as rank,
  p.layout ->> 'line'              as says,
  p.layout ->> 'date'              as dated,
  p.layout -> 'rank' ->> 'family'  as badge_family,
  p.layout -> 'rank' ->> 'level'   as badge_tier,
  -- ⚠ `jsonb_exists`, not the `?` operator: many SQL clients read a bare `?` as a bind
  --   placeholder and refuse the statement before Postgres ever sees it.
  jsonb_exists(p.layout, 'previous') as has_transition,   -- expected false: it was never recorded
  p.body                           as body_should_be_null,
  p.squad_id,
  p.audience
from public.squad_posts p
join public.profiles pr on pr.id = p.author_id
where p.layout ->> 'kind' = 'milestone-card'
order by p.created_at desc;
