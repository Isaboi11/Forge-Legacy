-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0178 · THE FOUR ACKNOWLEDGEMENT KINDS, AND EDITING YOUR OWN COMMENT
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- PO, 2026-08-25: *"the acknowledgment doesn't let me choose what kind of acknowledgment I give and
-- there are multiple. I also want to be able to edit my comment."*
--
-- ══ 1 · THE KINDS WERE LOCKED AND NEVER BUILT ══
--
-- `Social-Architecture-Amendment-004-Acknowledgement-Count.md` **SOC-A4-D3 (LOCKED)**:
--
--     "SOC-D11's acknowledgement kinds — Respect · Honor · Support · Strength — are unchanged and all
--      four remain writable. […] The four kinds moved to a press-and-hold on the same control. This is
--      recorded as a decision rather than an implementation detail because the alternative was to delete
--      three of the four: a row that can only ever write `respect` would strand `honor`, `support` and
--      `strength` as values in `post_reactions` that nothing can produce and nothing can explain."
--
-- ⚠ THE AMENDMENT DESCRIBES A COLUMN THAT HAS NEVER EXISTED. `squad_post_reactions` (0041) is
-- `(post_id, user_id, created_at)` and nothing else — there is no kind to strand. The amendment was
-- written against the intended model and the table was never widened to meet it. This is that column.
--
-- ⚠ `kind` IS NOT PART OF THE PRIMARY KEY, DELIBERATELY. The PK stays `(post_id, user_id)`, so one
-- athlete still leaves exactly ONE acknowledgement on a post — they are choosing WHICH, not collecting
-- a set. Adding `kind` to the key would let one person acknowledge the same post four times, which is
-- the popularity mechanic SOC-D11 exists to forbid.
--
-- ⚠ DEFAULT `'respect'` IS WHAT MAKES THIS SAFE ON EXISTING ROWS. Every acknowledgement written before
-- today was a respect — that is the only thing the client could send — so backfilling to anything else
-- would invent a sentiment nobody expressed.
--
-- ⚠ COUNTS ARE UNAFFECTED AND MUST STAY THAT WAY. `squad_feed` / `squad_post_one` count reactions
-- without regard to kind, and that remains correct: Amendment 004 permits a post's own acknowledgement
-- COUNT. Splitting the count by kind would put four numbers on a post, which is closer to a scoreboard
-- than to encouragement. No function is rebuilt here — which also means no chance of the 0088/0092/0106
-- failure of rebuilding a function body from an older copy.
--
-- ══ 2 · EDITING A COMMENT ══
--
-- `squad_post_comments` has had INSERT and DELETE policies since 0041 and no UPDATE policy at all, so
-- an edit could not have worked whatever the client sent — RLS denies by default. The fix is one policy
-- and one column.
--
-- ⚠ THE AUTHOR ONLY, AND NOT THE SQUAD OWNER. The DELETE policy deliberately lets an owner remove a
-- comment (moderation). Editing is not moderation: an owner rewriting somebody's words and leaving their
-- name on them is the worst thing this table could permit. Removal is the owner's power; the words stay
-- the author's.
--
-- ⚠ `edited_at` EXISTS SO THE UI CANNOT LIE. A comment that changed after people read it says so. Null
-- means never edited, which is every row that already exists.
--
-- ⚠ THE BODY CHECK STILL APPLIES on update — `body text not null check (char_length(btrim(body))
-- between 1 and 1000)` is a table constraint, so an edit cannot blank a comment. Deleting is delete.
--
-- Safe to run twice. Every statement is guarded.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

-- ── 1 · ACKNOWLEDGEMENT KIND ─────────────────────────────────────────────────────────────────────────

alter table public.squad_post_reactions
  add column if not exists kind text not null default 'respect';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'squad_post_reactions_kind_ck') then
    alter table public.squad_post_reactions
      add constraint squad_post_reactions_kind_ck
      check (kind in ('respect', 'honor', 'support', 'strength'));
  end if;
end $$;

comment on column public.squad_post_reactions.kind is
  'WHICH acknowledgement this is — respect | honor | support | strength (SOC-A4-D3, locked). NOT part of the primary key: one athlete leaves one acknowledgement per post and chooses its kind, never a set of four. Defaults to respect, which is what every row written before 0178 was.';

-- ── 2 · COMMENT EDITING ──────────────────────────────────────────────────────────────────────────────

alter table public.squad_post_comments
  add column if not exists edited_at timestamptz;

comment on column public.squad_post_comments.edited_at is
  'When the author last rewrote this comment; null means never. Set by the client on update so a comment that changed after people read it can say so.';

-- ⚠ AUTHOR ONLY. The DELETE policy above it intentionally includes the squad owner (moderation); this
-- one must not. Removing a comment is moderation, rewriting one under somebody else's name is not.
drop policy if exists squad_post_comments_update on public.squad_post_comments;
create policy squad_post_comments_update on public.squad_post_comments for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
