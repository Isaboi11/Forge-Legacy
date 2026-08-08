-- Forge Legacy — 0118: an accomplishment can carry the photo or the video
--
-- ══ WHAT WAS MISSING ═════════════════════════════════════════════════════════════════════════════
--
-- `Forge Accomplishments.dc.html`'s L-14 form has a file-drop slot for an optional photo. 0023 created
-- the column for it and said so in its own header — *"`photo_url` reserved for the design's optional
-- photo; the image-upload flow is a later pass, so it stays null for now"* — and the screen carried the
-- matching `DEFERRED vs the .dc` note. Two years of scaffolding, and nothing between them.
--
-- So the athlete adding "Marathon Finisher" could write why it mattered and could not attach the finish
-- line. Reported by the PO: *"I went to add an accomplishment, I don't see a spot to add the video or
-- the picture."* Note: **video**, which the `.dc` never drew and the column could not have held.
--
-- ══ THE COLUMN IS RENAMED, NOT JOINED BY A SECOND ONE ════════════════════════════════════════════
--
-- The obvious move is `add column video_url` beside `photo_url`. It is the wrong one: two columns
-- meaning "the media on this row" is precisely the drift this codebase keeps having to unpick — every
-- reader then has to know which to prefer, and the first one that gets it backwards shows a photo over
-- a video for a year before anyone notices.
--
-- A rename is safe HERE and would not be elsewhere, because `photo_url` has never been written. It was
-- created in 0023, it is absent from `saveAccomplishment`'s field list, and no other migration touches
-- it — so there is no data to migrate and no writer to break. One reader (`accomplishments-live.ts`'s
-- `toModel`) changes in the same commit.
--
--     media_url   the object's public URL in the `media` bucket, or null
--     media_kind  'image' | 'video', or null
--
-- BOTH OR NEITHER, enforced. A URL with no kind cannot be rendered (an image tag and a video player are
-- different components), and a kind with no URL is a claim about a file that does not exist. The check
-- makes the invalid pair unrepresentable rather than leaving every reader to defend against it.
--
-- ══ THE BUCKET ALREADY EXISTS ════════════════════════════════════════════════════════════════════
--
-- `media` (0006): public-read, writes owner-scoped by first path segment (`<uid>/…`), which is exactly
-- the shape an athlete-owned keepsake wants. No new bucket, no new policy. Objects land at
-- `<uid>/accomplishments/<accomplishment-or-draft-id>.<ext>`.
--
-- ⚠ DELETING AN ACCOMPLISHMENT DOES NOT DELETE ITS OBJECT. The row goes; the file is orphaned in the
-- bucket. Storage has no foreign keys, and a trigger reaching into `storage.objects` from a public
-- table is the kind of cross-schema coupling that fails silently when it fails. Recorded here rather
-- than pretended away — the same standing gap `transformation-media` and `squad-media` have, and the
-- same answer: a sweep job, when one is worth writing.

-- GUARDED so a second run is a no-op rather than `42703: column "photo_url" does not exist`.
-- Every other statement in this file is already `if not exists` / `if exists`; a bare RENAME would have
-- been the one line that turns "paste it again to be sure" — which is what actually happens when a run
-- is interrupted in the SQL editor — into an error that looks like the migration failed.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'accomplishments'
       and column_name  = 'photo_url'
  ) then
    alter table public.accomplishments rename column photo_url to media_url;
  end if;
end $$;

alter table public.accomplishments
  add column if not exists media_kind text;

alter table public.accomplishments
  drop constraint if exists accomplishments_media_kind_check;

alter table public.accomplishments
  add constraint accomplishments_media_kind_check
  check (
    (media_url is null and media_kind is null)
    or (media_url is not null and media_kind in ('image', 'video'))
  );
